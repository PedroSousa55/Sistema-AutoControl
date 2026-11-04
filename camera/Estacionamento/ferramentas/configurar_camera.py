"""
configurar_camera.py - Assistente que liga uma câmera ao leitor de placas.

Uso: configurar_camera.bat (dois cliques). O instalar_tudo.bat também chama
este assistente no final. Ele pergunta:

  1. Qual lado configurar: ENTRADA (config.yaml), SAÍDA (config_saida.yaml) ou os dois
  2. Qual câmera usar em cada lado:
       1 = a câmera do próprio notebook
       2 = uma webcam externa (USB)
       3 = uma câmera Wi-Fi (Intelbras ou outra com RTSP)
  3. Mostra a imagem para você confirmar e grava no arquivo de configuração.

Câmera Wi-Fi: o assistente pede para você colocar a câmera no hotspot do
notebook e então, sozinho, procura a câmera na rede, descobre o endereço
RTSP que funciona e grava no config.

Por segurança, a busca automática é feita só no hotspot do notebook
(192.168.137.x). Procurar aparelhos na rede da escola ou de uma empresa pode
ser bloqueado ou parecer um ataque, então isso só acontece se você confirmar.

Opções (para testes, sem perguntas): --lado entrada|saida, --tipo nativa|usb|wifi,
--indice N, --ip IP, --url URL, --usuario U, --senha S, --sim, --sem-janela, --arquivo
"""

import argparse
import getpass
import ipaddress
import re
import socket
import subprocess
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from estacionamento.captura import Camera  # noqa: E402  (silencia avisos e põe o RTSP em TCP)

import cv2  # noqa: E402
import yaml  # noqa: E402

from ferramentas.testar_camera import procurar_webcams  # noqa: E402

ARQUIVOS = {"entrada": RAIZ / "config.yaml", "saida": RAIZ / "config_saida.yaml"}
NOME_LADO = {"entrada": "ENTRADA", "saida": "SAÍDA"}
REDE_HOTSPOT = ipaddress.ip_network("192.168.137.0/24")   # hotspot móvel do Windows
PORTA_RTSP = 554

# Endereços RTSP mais comuns, na ordem em que são testados.
# Intelbras usa o mesmo padrão da Dahua (subtype=0: imagem principal).
CAMINHOS_RTSP = [
    ("Intelbras/Dahua, imagem principal", "/cam/realmonitor?channel=1&subtype=0"),
    ("Intelbras/Dahua, imagem leve", "/cam/realmonitor?channel=1&subtype=1"),
    ("ONVIF genérico", "/onvif1"),
    ("genérico", "/live"),
    ("genérico", "/stream1"),
    ("genérico", "/h264"),
]

CONFIRMAR_TUDO = False   # --sim: responde "sim" sozinho (testes)


# ======================================================================
# Perguntas no terminal
# ======================================================================
def perguntar(texto, padrao=""):
    if CONFIRMAR_TUDO:
        print(f"{texto} {padrao}")
        return padrao
    resposta = input(f"{texto} ").strip()
    return resposta or padrao


def sim_ou_nao(texto, padrao=True):
    sufixo = "[S/n]" if padrao else "[s/N]"
    if CONFIRMAR_TUDO:
        print(f"{texto} {sufixo} {'S' if padrao else 'N'}")
        return padrao
    resposta = input(f"{texto} {sufixo} ").strip().lower()
    return padrao if not resposta else resposta.startswith("s")


def escolher(texto, opcoes):
    """opcoes = [(valor, descricao), ...]. Devolve o valor escolhido."""
    print(texto)
    for numero, (_, descricao) in enumerate(opcoes, 1):
        print(f"  {numero} - {descricao}")
    while True:
        resposta = input("Digite o número e aperte ENTER: ").strip()
        if resposta.isdigit() and 1 <= int(resposta) <= len(opcoes):
            return opcoes[int(resposta) - 1][0]
        print("  Opção inválida, tente de novo.")


def titulo(texto):
    print()
    print("=" * 60)
    print(f" {texto}")
    print("=" * 60)


# ======================================================================
# Arquivo de configuração (troca só a linha "fonte:", mantendo os comentários)
# ======================================================================
def preparar_arquivo(lado):
    """Devolve o arquivo do lado. A saída ganha um config_saida.yaml próprio."""
    arquivo = ARQUIVOS[lado]
    if lado == "saida" and not arquivo.exists():
        texto = ARQUIVOS["entrada"].read_text(encoding="utf-8")
        texto = re.sub(r"(?m)^(  nome:\s*)\S+", r"\g<1>saida_1", texto, count=1)
        texto = re.sub(r"(?m)^(  funcao:\s*)\S+", r"\g<1>saida", texto, count=1)
        arquivo.write_text(texto, encoding="utf-8")
        print(f"Criei o {arquivo.name}: uma cópia do config.yaml só para a SAÍDA.")
    return arquivo


def gravar_fonte(arquivo, fonte):
    texto = arquivo.read_text(encoding="utf-8")
    if isinstance(fonte, int):
        valor = str(fonte)
    else:
        valor = '"' + fonte.replace("\\", "\\\\").replace('"', '\\"') + '"'
    linha = f"  fonte: {valor}   # gravado pelo configurar_camera em {datetime.now():%d/%m/%Y %H:%M}"
    novo, trocas = re.subn(r"(?m)^  fonte:.*$", lambda _: linha, texto, count=1)
    if trocas == 0:
        raise RuntimeError(f"Não achei a linha 'fonte:' dentro de 'camera:' em {arquivo.name}.")
    if yaml.safe_load(novo)["camera"]["fonte"] != fonte:   # confere antes de salvar
        raise RuntimeError("A fonte gravada não confere; nada foi alterado.")
    arquivo.write_text(novo, encoding="utf-8")


def fonte_atual(arquivo):
    try:
        return yaml.safe_load(arquivo.read_text(encoding="utf-8"))["camera"]["fonte"]
    except (OSError, KeyError, TypeError):
        return None


def mascarar(texto):
    """Esconde a senha de um endereço rtsp://usuario:SENHA@ip para mostrar na tela."""
    return re.sub(r"(rtsp://[^:/@]+:)[^@]*@", r"\1****@", str(texto))


# ======================================================================
# Mostrar a imagem e perguntar se é a câmera certa
# ======================================================================
def confirmar_imagem(fonte, descricao, sem_janela):
    camera = Camera({"fonte": fonte, "largura": 1280, "altura": 720, "backend_windows": "dshow"})
    try:
        camera.iniciar()
    except ConnectionError as erro:
        print(f"  Não abriu: {erro}")
        return False
    try:
        quadro, limite = None, time.time() + 8
        while quadro is None and time.time() < limite:
            _, quadro = camera.ler()
            time.sleep(0.05)
        if quadro is None:
            print("  A câmera abriu, mas não mandou imagem em 8 segundos.")
            return False
        altura, largura = quadro.shape[:2]
        print(f"  Imagem recebida: {largura}x{altura}.")

        if not sem_janela:
            janela = f"{descricao} - Q para fechar"
            print("  Olhe a janela de vídeo e feche com Q (ou espere 20 segundos).")
            limite = time.time() + 20
            while time.time() < limite:
                _, quadro = camera.ler()
                if quadro is not None:
                    cv2.putText(quadro, "E esta a camera certa? Responda no terminal (Q fecha)",
                                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                    cv2.imshow(janela, quadro)
                if cv2.waitKey(30) & 0xFF in (ord("q"), 27):
                    break
                if cv2.getWindowProperty(janela, cv2.WND_PROP_VISIBLE) < 1:
                    break
            cv2.destroyAllWindows()
        return sim_ou_nao("  Esta é a câmera certa?")
    finally:
        camera.parar()
        cv2.destroyAllWindows()


# ======================================================================
# 1 e 2: câmera do notebook ou webcam externa (USB)
# ======================================================================
def configurar_webcam(tipo, args):
    print("Procurando câmeras (a do notebook e as USB)...")
    webcams = [w for w in procurar_webcams() if not w["sem_imagem"]]
    for w in webcams:
        cor = "colorida" if w["colorida"] else "cinza (infravermelha: não serve para placas)"
        print(f"  índice {w['indice']}: {w['largura']}x{w['altura']} - {cor}")
    coloridas = [w for w in webcams if w["colorida"]]
    if not coloridas:
        print("Nenhuma câmera colorida encontrada. Confira o cabo USB e feche Teams, Zoom e o navegador.")
        return None

    if args.indice is not None:
        candidatas = [w for w in coloridas if w["indice"] == args.indice]
    elif tipo == "nativa":
        # A câmera do notebook costuma ser a de menor índice
        candidatas = sorted(coloridas, key=lambda w: w["indice"])
    else:
        # A webcam externa costuma vir depois da do notebook
        candidatas = sorted(coloridas, key=lambda w: (w["indice"] == 0, w["indice"]))
        if len(coloridas) == 1:
            print("Só achei UMA câmera colorida. Se a webcam externa está conectada, talvez ela "
                  "seja esta (alguns notebooks desligam a câmera interna quando há uma externa).")

    for w in candidatas:
        print(f"Testando a câmera do índice {w['indice']}...")
        if confirmar_imagem(w["indice"], f"Camera indice {w['indice']}", args.sem_janela):
            return w["indice"]
    print("Nenhuma câmera foi confirmada.")
    return None


# ======================================================================
# 3: câmera Wi-Fi (RTSP)
# ======================================================================
def redes_locais():
    """IPs deste notebook em cada rede (cada uma limitada a no máximo 256 endereços)."""
    import psutil

    redes = []
    for interface, enderecos in psutil.net_if_addrs().items():
        for e in enderecos:
            if e.family != socket.AF_INET or not e.netmask or e.address.startswith(("127.", "169.254.")):
                continue
            rede = ipaddress.ip_network(f"{e.address}/{e.netmask}", strict=False)
            if rede.prefixlen < 24:
                rede = ipaddress.ip_network(f"{e.address}/24", strict=False)
            redes.append({"interface": interface, "ip": e.address, "rede": rede})
    return redes


def ips_na_tabela_arp(rede, ip_local):
    """Aparelhos que já conversaram com o notebook nesta rede (comando 'arp -a')."""
    try:
        saida = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=5).stdout
    except (OSError, subprocess.SubprocessError):
        return []
    ips = set()
    for achado in re.finditer(r"(\d+\.\d+\.\d+\.\d+)\s+[0-9a-f]{2}(?:-[0-9a-f]{2}){5}", saida, re.I):
        ip = ipaddress.ip_address(achado.group(1))
        if ip in rede and ip not in (rede.network_address, rede.broadcast_address) and str(ip) != ip_local:
            ips.add(str(ip))
    return sorted(ips, key=ipaddress.ip_address)


def procurar_onvif(ip_local, espera=3.0):
    """Pergunta 'tem câmera aí?' para a rede (WS-Discovery do padrão ONVIF)."""
    sonda = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope" '
        'xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing" '
        'xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" '
        'xmlns:dn="http://www.onvif.org/ver10/network/wsdl">'
        f'<e:Header><w:MessageID>uuid:{uuid.uuid4()}</w:MessageID>'
        '<w:To e:mustUnderstand="true">urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>'
        '<w:Action e:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>'
        '</e:Header><e:Body><d:Probe><d:Types>dn:NetworkVideoTransmitter</d:Types></d:Probe></e:Body></e:Envelope>'
    )
    encontrados, sock = set(), None
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(ip_local))
        sock.bind((ip_local, 0))
        sock.settimeout(0.3)
        sock.sendto(sonda.encode(), ("239.255.255.250", 3702))
        limite = time.time() + espera
        while time.time() < limite:
            try:
                _, (ip, _) = sock.recvfrom(65535)
                encontrados.add(ip)
            except socket.timeout:
                continue
    except OSError:
        pass
    finally:
        if sock is not None:
            sock.close()
    return sorted(encontrados, key=ipaddress.ip_address)


def porta_aberta(ip, porta=PORTA_RTSP, espera=0.6):
    try:
        with socket.create_connection((ip, porta), timeout=espera):
            return True
    except OSError:
        return False


def procurar_cameras(rede, ip_local):
    """IPs da rede com a porta RTSP (554) aberta: primeiro os conhecidos, depois a rede toda."""
    conhecidos = ips_na_tabela_arp(rede, ip_local) + procurar_onvif(ip_local)
    conhecidos = list(dict.fromkeys(conhecidos))
    if conhecidos:
        print(f"  Aparelhos vistos nesta rede: {', '.join(conhecidos)}")
    com_rtsp = [ip for ip in conhecidos if porta_aberta(ip)]
    if com_rtsp:
        return com_rtsp

    print(f"  Procurando a porta RTSP ({PORTA_RTSP}) em todos os endereços de {rede}...")
    todos = [str(ip) for ip in rede.hosts() if str(ip) != ip_local]
    with ThreadPoolExecutor(max_workers=64) as executor:
        resultado = list(executor.map(porta_aberta, todos))
    return [ip for ip, aberta in zip(todos, resultado) if aberta]


def rtsp_status(ip, caminho, porta=PORTA_RTSP, espera=3):
    """Pergunta à câmera se o endereço existe (pedido DESCRIBE, sem senha).

    200 = abre sem senha · 401 = existe e pede senha · 404 = endereço não existe
    """
    pedido = (f"DESCRIBE rtsp://{ip}:{porta}{caminho} RTSP/1.0\r\nCSeq: 1\r\n"
              "Accept: application/sdp\r\nUser-Agent: estacionamento\r\n\r\n")
    try:
        with socket.create_connection((ip, porta), timeout=espera) as conexao:
            conexao.settimeout(espera)
            conexao.sendall(pedido.encode())
            resposta = conexao.recv(1024).decode(errors="ignore")
    except OSError:
        return None
    achado = re.match(r"RTSP/1\.\d (\d{3})", resposta)
    return int(achado.group(1)) if achado else None


def montar_url(ip, usuario, senha, caminho, porta=PORTA_RTSP):
    # quote() troca @ # : etc. por %40 %23 %3A, senão o endereço quebra
    credenciais = f"{quote(usuario, safe='')}:{quote(senha, safe='')}@" if usuario else ""
    return f"rtsp://{credenciais}{ip}:{porta}{caminho}"


def testar_rtsp(url, espera_ms=7000):
    """Tenta abrir o vídeo. Devolve (largura, altura) ou None."""
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG,
                           [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, espera_ms, cv2.CAP_PROP_READ_TIMEOUT_MSEC, espera_ms])
    try:
        if not cap.isOpened():
            return None
        for _ in range(20):
            ok, quadro = cap.read()
            if ok and quadro is not None:
                return quadro.shape[1], quadro.shape[0]
        return None
    finally:
        cap.release()


def escolher_rede(args):
    """A rede onde procurar: o hotspot do notebook, ou outra só se você confirmar."""
    redes = redes_locais()
    for r in redes:
        if ipaddress.ip_address(r["ip"]) in REDE_HOTSPOT:
            print(f"Hotspot do notebook ligado: {r['rede']} (notebook = {r['ip']}).")
            return r
    print("O hotspot do notebook NÃO está ligado.")
    print("  O jeito recomendado é ligar o hotspot (2,4 GHz) e colocar a câmera nele.")
    privadas = [r for r in redes if ipaddress.ip_address(r["ip"]).is_private]
    if not privadas:
        return None
    print("  Também dá para procurar na rede em que o notebook está agora, mas só faça isso numa")
    print("  rede SUA: na rede da escola ou de uma empresa, procurar aparelhos pode ser bloqueado")
    print("  ou parecer um ataque.")
    if not sim_ou_nao("  Procurar na rede atual mesmo assim?", padrao=False):
        return None
    if len(privadas) == 1:
        return privadas[0]
    return escolher("Em qual rede?", [(r, f"{r['interface']}: {r['rede']}") for r in privadas])


def configurar_wifi(args):
    print("Para a câmera Wi-Fi funcionar, ela precisa estar na MESMA REDE do notebook:")
    print("  1. Ligue o hotspot do notebook (Configurações > Rede e Internet > Hotspot móvel),")
    print("     na banda 2,4 GHz.")
    print("  2. No app da câmera (Intelbras, Mibo...), conecte a câmera nessa rede.")
    print("  3. Deixe a câmera ligada e espere a luz indicar que conectou.")
    perguntar("Quando a câmera estiver conectada, aperte ENTER...")

    usuario = args.usuario if args.usuario is not None else perguntar("Usuário da câmera [admin]:", "admin")
    if args.senha is not None:
        senha = args.senha
    else:
        senha = getpass.getpass("Senha da câmera (não aparece enquanto você digita): ")

    if args.url:
        print(f"Testando o endereço informado: {mascarar(args.url)}")
        return args.url if testar_rtsp(args.url) and confirmar_imagem(args.url, "Camera Wi-Fi", args.sem_janela) else None

    if args.ip:
        ips = [args.ip]
    else:
        rede = escolher_rede(args)
        if rede is None:
            ips = []
        else:
            print("Procurando a câmera na rede (leva alguns segundos)...")
            ips = procurar_cameras(rede["rede"], rede["ip"])
        if ips:
            print(f"Encontrei câmera(s) em: {', '.join(ips)}")
        else:
            print("Não encontrei nenhuma câmera com RTSP na rede.")
            ip_digitado = perguntar("Se você souber o IP da câmera (aparece no app), digite aqui, "
                                    "ou aperte ENTER para desistir:")
            ips = [ip_digitado] if ip_digitado else []

    for ip in ips:
        print(f"Testando a câmera {ip}:")
        pediu_senha = False
        for descricao, caminho in CAMINHOS_RTSP:
            status = rtsp_status(ip, caminho)
            if status is None:
                print(f"  {ip} não respondeu como câmera RTSP na porta {PORTA_RTSP}.")
                break
            if status == 404:
                continue                         # esse endereço não existe nesta câmera
            pediu_senha = pediu_senha or status == 401
            url = montar_url(ip, usuario, senha, caminho)
            print(f"  {descricao}: ", end="", flush=True)
            tamanho = testar_rtsp(url)
            if not tamanho:
                print("não abriu")
                continue
            print(f"abriu ({tamanho[0]}x{tamanho[1]})")
            if confirmar_imagem(url, f"Camera {ip}", args.sem_janela):
                return url
        if pediu_senha:
            print("  A câmera pediu senha e nenhum endereço abriu: confira o usuário e a senha.")

    print("Não consegui abrir a câmera sozinho. Dicas:")
    print("  - Confira usuário e senha no app da câmera e se o RTSP/ONVIF está habilitado.")
    print("  - Alguns modelos só funcionam pelo app e não têm RTSP.")
    url = perguntar("Se o manual da câmera tiver o endereço RTSP completo, cole aqui (ou ENTER para sair):")
    if url and testar_rtsp(url) and confirmar_imagem(url, "Camera Wi-Fi", args.sem_janela):
        return url
    return None


# ======================================================================
def configurar_lado(lado, args):
    titulo(f"CÂMERA DA {NOME_LADO[lado]}")
    arquivo = Path(args.arquivo) if args.arquivo else ARQUIVOS[lado]
    atual = fonte_atual(arquivo) if arquivo.exists() else None
    if atual is not None:
        print(f"Hoje a {NOME_LADO[lado]} usa: fonte = {mascarar(atual)}")

    tipo = args.tipo or escolher(f"Qual câmera vai usar na {NOME_LADO[lado]}?", [
        ("nativa", "A câmera do próprio notebook"),
        ("usb", "Uma webcam externa (USB)"),
        ("wifi", "Uma câmera Wi-Fi (Intelbras ou outra com RTSP)"),
    ])
    fonte = configurar_wifi(args) if tipo == "wifi" else configurar_webcam(tipo, args)
    if fonte is None:
        print(f"Nada foi alterado na {NOME_LADO[lado]}.")
        return None

    if not args.arquivo:
        arquivo = preparar_arquivo(lado)
    gravar_fonte(arquivo, fonte)
    print(f"Pronto! {arquivo.name} agora usa: fonte = {mascarar(fonte)}")
    if isinstance(fonte, str):
        print(f"  Atenção: o {arquivo.name} guarda a senha da câmera. Não compartilhe esse arquivo.")
    return fonte


def main():
    global CONFIRMAR_TUDO
    parser = argparse.ArgumentParser(description="Assistente de configuração da câmera")
    parser.add_argument("--lado", choices=["entrada", "saida", "as_duas"])
    parser.add_argument("--tipo", choices=["nativa", "usb", "wifi"])
    parser.add_argument("--indice", type=int, help="webcam: índice a usar")
    parser.add_argument("--ip", help="câmera Wi-Fi: IP (pula a busca)")
    parser.add_argument("--url", help="câmera Wi-Fi: endereço RTSP completo (pula a busca)")
    parser.add_argument("--usuario")
    parser.add_argument("--senha")
    parser.add_argument("--sim", action="store_true", help="responde 'sim' a todas as confirmações")
    parser.add_argument("--sem-janela", action="store_true", help="não abre a janela de vídeo")
    parser.add_argument("--arquivo", help="grava neste arquivo em vez do config.yaml/config_saida.yaml")
    args = parser.parse_args()
    CONFIRMAR_TUDO = args.sim

    titulo("ASSISTENTE DE CÂMERA - ESTACIONAMENTO INTELIGENTE")
    lado = args.lado or escolher("Qual câmera você quer configurar?", [
        ("entrada", "A da ENTRADA (atalho Estacionamento - ENTRADA)"),
        ("saida", "A da SAÍDA (atalho Estacionamento - SAIDA)"),
        ("as_duas", "As duas"),
    ])
    lados = ["entrada", "saida"] if lado == "as_duas" else [lado]
    escolhidas = {l: configurar_lado(l, args) for l in lados}

    if len(lados) == 2 and escolhidas["entrada"] is not None and escolhidas["entrada"] == escolhidas["saida"]:
        print("\nObservação: entrada e saída usam a MESMA câmera. Funciona, mas não dá para")
        print("abrir os dois atalhos ao mesmo tempo.")
    print("\nPara conferir: .venv\\Scripts\\python ferramentas\\testar_camera.py "
          "(entrada) ou com --config config_saida.yaml (saída).")
    return 0 if all(v is not None for v in escolhidas.values()) else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nCancelado. Nada mais foi alterado.")
        sys.exit(1)
