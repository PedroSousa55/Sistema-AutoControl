"""
main.py - Programa principal do leitor de placas.

Fluxo de cada quadro da câmera:

    câmera -> detecta placa -> recorta -> OCR -> valida/corrige -> votação
                                                                     |
                                       placa confirmada <------------+
                                              |
                              JSON no terminal + log + foto
                                              |
              ENTRADA: envia ao sistema de gestão -> abre a cancela
              SAÍDA  : pergunta se pagou -> pago? abre a cancela : LED vermelho

Como rodar:
    rodar.bat                          (usa a câmera do config.yaml)
    rodar_saida.bat                    (câmera de saída: --funcao saida --nome saida_1)
    rodar.bat --imagem placa.jpg       (testa com uma foto, sem webcam)
    rodar.bat --config saida.yaml      (outro arquivo de configuração)

Na janela: Q ou ESC para sair.
"""

import argparse
import sys
import threading
import time
from pathlib import Path

import yaml

from estacionamento.captura import Camera, FonteImagem  # importa antes do cv2 (silencia avisos)

import cv2  # noqa: E402

from estacionamento import validacao_placa  # noqa: E402
from estacionamento.deteccao_placa import DetectorPlaca, recortar  # noqa: E402
from estacionamento.integracao_api import SistemaGestao  # noqa: E402
from estacionamento.integracao_esp32 import ESP32  # noqa: E402
from estacionamento.ocr_placa import LeitorOCR  # noqa: E402
from estacionamento.registro import Registro  # noqa: E402
from estacionamento.votacao import Votacao  # noqa: E402

RAIZ = Path(__file__).resolve().parent

# Cores no OpenCV são (Azul, Verde, Vermelho)
VERDE = (0, 200, 0)
AMARELO = (0, 220, 255)
VERMELHO = (0, 0, 255)
BRANCO = (255, 255, 255)
PRETO = (0, 0, 0)
CINZA = (90, 90, 90)
AZUL = (180, 90, 0)
LARANJA = (0, 120, 230)


def carregar_config(caminho):
    caminho = Path(caminho)
    if not caminho.is_absolute():
        caminho = RAIZ / caminho
    with open(caminho, encoding="utf-8") as arquivo:
        return yaml.safe_load(arquivo)


# ----------------------------------------------------------------------
# Situação mostrada na tela ("CANCELA LIBERADA", "PAGAMENTO PENDENTE"...)
# É alterada pela thread que conversa com a API, por isso tem uma trava.
# ----------------------------------------------------------------------
class Situacao:
    def __init__(self):
        self._trava = threading.Lock()
        self._dados = None

    def definir(self, texto, cor):
        with self._trava:
            self._dados = (texto, cor, time.time())

    def atual(self, duracao=6):
        with self._trava:
            if self._dados and time.time() - self._dados[2] < duracao:
                return self._dados[:2]
        return None


# ----------------------------------------------------------------------
# Desenho na tela (o OpenCV não escreve acentos, por isso o texto é sem acento)
# ----------------------------------------------------------------------
def escrever(imagem, texto, posicao, cor=BRANCO, escala=0.8, fundo=PRETO):
    """Escreve um texto com uma tarja de fundo para ficar legível."""
    fonte = cv2.FONT_HERSHEY_SIMPLEX
    (largura, altura), base = cv2.getTextSize(texto, fonte, escala, 2)
    x, y = posicao
    cv2.rectangle(imagem, (x - 4, y - altura - 6), (x + largura + 4, y + base + 2), fundo, -1)
    cv2.putText(imagem, texto, (x, y), fonte, escala, cor, 2, cv2.LINE_AA)


def desenhar_leitura(imagem, leitura):
    """Retângulo em volta da placa + texto lido.

    Verde   = formato válido (conta voto)
    Amarelo = leu algo, mas formato inválido ou confiança baixa (não conta)
    """
    x1, y1, x2, y2 = leitura["caixa"]
    cor = VERDE if leitura["conta_voto"] else AMARELO
    cv2.rectangle(imagem, (x1, y1), (x2, y2), cor, 3)
    rotulo = f"{leitura['exibir'] or '???'}  {leitura['confianca_ocr']:.0%}"
    escrever(imagem, rotulo, (x1, max(30, y1 - 10)), cor=PRETO, fundo=cor)


def desenhar_modo(imagem, funcao, nome_camera):
    """Tarja fixa no canto superior direito: ENTRADA (azul) ou SAIDA (laranja).

    Assim ninguém confunde a câmera da entrada com a da saída.
    """
    texto = f"{funcao.upper()} - {nome_camera}"
    cor = AZUL if funcao == "entrada" else LARANJA
    (largura_texto, _), _ = cv2.getTextSize(texto, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 2)
    escrever(imagem, texto, (imagem.shape[1] - largura_texto - 14, 35), escala=0.9, fundo=cor)


def desenhar_painel(imagem, fps, votacao, ultima_confirmada, situacao, camera_ok, aguardando_sensor):
    altura, largura = imagem.shape[:2]
    escrever(imagem, f"{fps:.0f} FPS", (10, altura - 15), escala=0.6)

    if aguardando_sensor:
        escrever(imagem, "Aguardando veiculo (sensor de presenca)", (10, 35), fundo=CINZA)
    else:
        lider, votos = votacao.progresso()
        if lider:
            escrever(imagem, f"Lendo: {lider}  votos {votos}/{votacao.votos_minimos}", (10, 35))

    if ultima_confirmada and time.time() - ultima_confirmada["quando"] < 6:
        texto = f"CONFIRMADA: {ultima_confirmada['exibir']}  ({ultima_confirmada['confianca']:.0%})"
        escrever(imagem, texto, (10, 90), cor=BRANCO, escala=1.1, fundo=VERDE)

    atual = situacao.atual()
    if atual:
        escrever(imagem, atual[0], (10, 145), cor=BRANCO, escala=1.0, fundo=atual[1])

    if not camera_ok:
        escrever(imagem, "CAMERA DESCONECTADA - tentando reconectar...",
                 (10, altura // 2), escala=1.0, fundo=VERMELHO)


# ----------------------------------------------------------------------
# Processamento de um quadro
# ----------------------------------------------------------------------
def ler_placa(quadro, detector, leitor):
    """Detecta a placa mais confiável do quadro e lê o texto.

    Retorna um dicionário com tudo sobre a leitura, ou None se não achou placa.
    """
    placas = detector.detectar(quadro)
    if not placas:
        return None

    melhor = placas[0]  # numa cancela passa um carro por vez: usamos a mais confiável
    recorte = recortar(quadro, melhor["caixa"])
    ocr = leitor.ler(recorte)
    resultado = validacao_placa.validar(ocr["texto"])

    confianca_ok = ocr["confianca"] >= leitor.confianca_minima
    return {
        "caixa": melhor["caixa"],
        "confianca_deteccao": melhor["confianca"],
        "texto_ocr": ocr["texto"],
        "confianca_ocr": ocr["confianca"],
        "placa": resultado["placa"],
        "formato": resultado["formato"],
        "exibir": validacao_placa.formatar_para_exibir(resultado["placa"], resultado["formato"]),
        "conta_voto": resultado["valida"] and confianca_ok,
        "recorte": recorte,
    }


# ----------------------------------------------------------------------
# O que fazer quando uma placa é confirmada (roda numa thread separada,
# assim o vídeo não congela se a API demorar para responder)
# ----------------------------------------------------------------------
def liberar(placa, liberada, esp32):
    """Abre a cancela e lembra qual placa foi liberada (para o aviso de passagem)."""
    liberada.update(placa=placa, quando=time.time())
    esp32.enviar("led_verde")
    esp32.enviar("abrir_cancela")


def tratar_entrada(evento, api, esp32, registro, situacao, liberada):
    registro.gravar(evento)
    enviado = api.enviar_entrada(evento)
    # Na ENTRADA a cancela abre mesmo com a API fora do ar: o evento fica
    # guardado em logs/pendentes.jsonl e é reenviado depois.
    liberar(evento["placa"], liberada, esp32)
    if enviado:
        situacao.definir("ENTRADA LIBERADA", VERDE)
    else:
        situacao.definir("ENTRADA LIBERADA (sistema fora do ar - pendente)", AMARELO)



def tratar_saida(evento, api, esp32, registro, situacao, liberada):

    # Envia a saída para o AutoControl.
    resposta = api.registrar_saida(evento)

    if resposta is None:

        # A API não confirmou a saída.
        # A cancela permanece fechada.
        esp32.enviar("led_vermelho")

        situacao.definir(
            "SAIDA NAO CONFIRMADA - chame o atendente",
            VERMELHO
        )

    else:

        # A API confirmou HTTP 200 e encerrou a movimentação.
        liberar(evento["placa"], liberada, esp32)

        situacao.definir(
            "SAIDA REGISTRADA - CANCELA LIBERADA",
            VERDE
        )

    registro.gravar(evento)



def main():
    parser = argparse.ArgumentParser(description="Leitor de placas - estacionamento inteligente")
    parser.add_argument("--config", default="config.yaml", help="arquivo de configuração")
    parser.add_argument("--funcao", choices=["entrada", "saida"], help="substitui camera.funcao do config")
    parser.add_argument("--nome", help="substitui camera.nome do config (ex.: saida_1)")
    parser.add_argument("--imagem", help="usa uma foto no lugar da câmera (teste)")
    parser.add_argument("--sem-janela", action="store_true", help="não abre a janela de vídeo")
    parser.add_argument("--max-segundos", type=float, default=0, help="encerra depois de X segundos (teste)")
    args = parser.parse_args()

    config = carregar_config(args.config)
    cfg_camera = config["camera"]
    funcao = args.funcao or cfg_camera.get("funcao", "entrada")
    nome_camera = args.nome or cfg_camera.get("nome", "camera_1")
    mostrar_janela = config.get("tela", {}).get("mostrar_janela", True) and not args.sem_janela
    largura_janela = int(config.get("tela", {}).get("largura_janela", 1280))
    tempo_max_leitura = float(config.get("esp32", {}).get("tempo_max_leitura_s", 10))

    print("Carregando modelos de IA (na primeira vez eles são baixados da internet)...")
    detector = DetectorPlaca(config["deteccao_placa"])
    leitor = LeitorOCR(config["ocr"])
    votacao = Votacao(config["votacao"])
    registro = Registro(config["registro"], RAIZ)
    api = SistemaGestao(config.get("api", {}), RAIZ)
    esp32 = ESP32(config.get("esp32", {}), nome_camera).iniciar()   # o ESP32 DESTA cancela
    situacao = Situacao()
    liberada = {"placa": None, "quando": 0.0}   # última placa que abriu a cancela

    def ao_passar(evento):
        """S2 (sensor depois da cancela) avisou que um veículo passou."""
        if evento == "passou":
            recente = time.time() - liberada["quando"] < 120
            registro.gravar(registro.criar_evento(
                evento="passagem", placa=liberada["placa"] if recente else None,
                confianca=None, camera=nome_camera))
        else:
            # Mais um veículo passou na mesma abertura (colado no da frente)
            registro.gravar(registro.criar_evento(
                evento="passagem_sem_liberacao", placa=None, confianca=None, camera=nome_camera))
            esp32.enviar("led_vermelho")
            situacao.definir("PASSOU UM VEICULO SEM LIBERACAO", VERMELHO)

    esp32.ao_passar = ao_passar
    modo_api = "SIMULADO" if api.simulado else api.url_base
    print(f"Câmera '{nome_camera}' em modo {funcao.upper()} | sistema de gestão: {modo_api} "
          f"| configuração: {Path(args.config).name}")

    camera = FonteImagem(args.imagem) if args.imagem else Camera(cfg_camera)
    try:
        camera.iniciar()
    except ConnectionError as erro:
        print(f"[ERRO] {erro}")
        esp32.parar()
        return 1
    print(f"Pronto! Lendo placas da fonte {camera.fonte!r}. Q ou ESC na janela para sair.\n")

    # O título da janela mostra se esta é a câmera de ENTRADA ou de SAÍDA
    # (sem acento: o título da janela do OpenCV não exibe acentos direito)
    janela = f"Leitor de placas - {funcao.upper()} ({nome_camera}) - Q para sair"
    ultimo_numero = 0
    ultima_confirmada = None
    chegada_tratada = 0.0      # momento_chegada do sensor que já foi atendido
    tela = None
    fps, contador, inicio_fps = 0.0, 0, time.time()
    inicio = time.time()

    try:
        while True:
            if args.max_segundos and time.time() - inicio > args.max_segundos:
                break

            numero, quadro = camera.ler()
            if quadro is None or numero == ultimo_numero:
                # Nenhum quadro novo: mantém a janela respondendo e mostra o aviso
                if mostrar_janela and tela is not None and not camera.conectada:
                    aviso = tela.copy()
                    desenhar_painel(aviso, 0, votacao, None, situacao, False, False)
                    desenhar_modo(aviso, funcao, nome_camera)
                    cv2.imshow(janela, aviso)
                if mostrar_janela and cv2.waitKey(10) & 0xFF in (ord("q"), 27):
                    break
                time.sleep(0.005)
                continue
            ultimo_numero = numero

            # Com sensor de presença: só lê placa quando há veículo na cancela
            aguardando_sensor = not esp32.veiculo_presente()
            leitura = None
            if aguardando_sensor:
                votacao.limpar()
            else:
                leitura = ler_placa(quadro, detector, leitor)

            if leitura and leitura["conta_voto"]:
                confirmada = votacao.adicionar(leitura["placa"], leitura["confianca_ocr"])
                if confirmada:
                    placa, confianca = confirmada
                    momento = registro.agora()
                    evento = registro.criar_evento(
                        evento=funcao,
                        placa=placa,
                        confianca=confianca,
                        camera=nome_camera,
                        foto=registro.salvar_foto(leitura["recorte"], placa, momento),
                        momento=momento,
                    )
                    # (Versão 2: aqui entram o tipo e a cor do veículo.)
                    tratar = tratar_entrada if funcao == "entrada" else tratar_saida
                    threading.Thread(target=tratar, args=(evento, api, esp32, registro, situacao, liberada),
                                     daemon=True).start()
                    ultima_confirmada = {
                        "exibir": validacao_placa.formatar_para_exibir(placa, leitura["formato"]),
                        "confianca": confianca,
                        "quando": time.time(),
                    }
                    chegada_tratada = esp32.momento_chegada

            # LEITURA INCERTA: o sensor diz que há veículo, mas a placa não foi
            # confirmada a tempo (placa suja, amassada, sem placa...).
            if (esp32.usar_sensor and esp32.presente
                    and esp32.momento_chegada != chegada_tratada
                    and time.time() - esp32.momento_chegada > tempo_max_leitura):
                chegada_tratada = esp32.momento_chegada
                lider, votos = votacao.progresso()
                print(f"[AVISO] Placa não confirmada em {tempo_max_leitura:.0f} s "
                      f"(melhor palpite: {lider or 'nenhum'}, {votos} votos).")
                registro.gravar(registro.criar_evento(
                    evento="leitura_incerta", placa=lider, confianca=0.0, camera=nome_camera))
                esp32.enviar("led_vermelho")
                situacao.definir("PLACA NAO LIDA - chame o atendente", VERMELHO)

            # FPS = quantos quadros processamos por segundo
            contador += 1
            if time.time() - inicio_fps >= 1:
                fps = contador / (time.time() - inicio_fps)
                contador, inicio_fps = 0, time.time()

            if mostrar_janela:
                tela = quadro
                if leitura:
                    desenhar_leitura(tela, leitura)
                desenhar_painel(tela, fps, votacao, ultima_confirmada, situacao,
                                camera.conectada, aguardando_sensor)
                desenhar_modo(tela, funcao, nome_camera)
                if tela.shape[1] > largura_janela:
                    escala = largura_janela / tela.shape[1]
                    tela = cv2.resize(tela, None, fx=escala, fy=escala)
                cv2.imshow(janela, tela)
                if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                    break
                # Fechou no "X" da janela
                if cv2.getWindowProperty(janela, cv2.WND_PROP_VISIBLE) < 1:
                    break
    except KeyboardInterrupt:
        pass  # Ctrl+C no terminal
    finally:
        camera.parar()
        esp32.parar()
        cv2.destroyAllWindows()
        print("Encerrado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
