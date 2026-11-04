"""
captura.py - Leitura de vídeo da WEBCAM ou de uma câmera IP (RTSP).

A mesma classe serve para os dois casos. O que muda é só a "fonte"
no config.yaml:
    fonte: 0                      -> webcam do notebook (índice 0, 1, 2...)
    fonte: "rtsp://usuario:senha@192.168.1.50:554/cam/realmonitor?channel=1&subtype=0"
                                  -> câmera Wi-Fi Intelbras

Por que usar uma THREAD (linha de execução separada)?
    Câmeras RTSP enviam quadros sem parar. Se o programa demora para
    processar um quadro (a IA leva alguns milissegundos), os quadros vão
    se acumulando num "buffer" e o vídeo fica atrasado em relação à
    realidade. A thread fica lendo a câmera o tempo todo e guarda apenas
    o quadro MAIS RECENTE. O programa principal sempre pega o último.

Tratamento de erros:
    Se a câmera desconectar (cabo USB solto, Wi-Fi caiu), a thread tenta
    reconectar sozinha a cada "espera_reconexao_s" segundos.
"""

import os
import threading
import time

# Esconde avisos internos do OpenCV que só confundem (ex.: ao procurar webcams).
os.environ.setdefault("OPENCV_LOG_LEVEL", "ERROR")
# Câmera RTSP pelo Wi-Fi: TCP perde menos pedaços da imagem que o UDP (padrão).
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")
# Esconde as mensagens técnicas do FFmpeg (o programa mostra as suas próprias).
os.environ.setdefault("OPENCV_FFMPEG_LOGLEVEL", "-8")

import cv2  # noqa: E402


def _interpretar_fonte(fonte):
    """Converte a fonte do config para o formato que o OpenCV espera.

    O YAML pode entregar 0 (número) ou "0" (texto). Se for um número,
    é webcam; se for texto com "://", é uma URL de câmera IP.
    """
    if isinstance(fonte, int):
        return fonte
    texto = str(fonte).strip()
    if texto.isdigit():
        return int(texto)
    return texto


class Camera:
    """Abre a câmera e entrega sempre o quadro mais recente."""

    def __init__(self, config_camera):
        self.fonte = _interpretar_fonte(config_camera.get("fonte", 0))
        self.largura = config_camera.get("largura")
        self.altura = config_camera.get("altura")
        self.backend = str(config_camera.get("backend_windows", "dshow")).lower()
        self.espera_reconexao = float(config_camera.get("espera_reconexao_s", 3))

        self._cap = None
        self._quadro = None           # último quadro lido
        self._numero_quadro = 0       # aumenta a cada quadro novo
        self._trava = threading.Lock()
        self._rodando = False
        self._thread = None
        self.conectada = False

    # ------------------------------------------------------------------
    # Abertura da câmera
    # ------------------------------------------------------------------
    def _abrir(self):
        """Tenta abrir a fonte de vídeo. Retorna True se conseguiu."""
        if isinstance(self.fonte, int):
            # No Windows, o DirectShow (CAP_DSHOW) abre a webcam bem mais
            # rápido que o padrão (MSMF). Dá para trocar no config.
            backends = {"dshow": cv2.CAP_DSHOW, "msmf": cv2.CAP_MSMF}
            api = backends.get(self.backend, cv2.CAP_ANY)
            cap = cv2.VideoCapture(self.fonte, api)
        else:
            # Câmera IP: o FFmpeg (embutido no OpenCV) entende RTSP.
            # Tempo-limite de 8 s para abrir e para cada leitura: se a câmera
            # sumir da rede, o programa não fica travado esperando.
            cap = cv2.VideoCapture(self.fonte, cv2.CAP_FFMPEG,
                                   [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8000, cv2.CAP_PROP_READ_TIMEOUT_MSEC, 8000])

        if not cap.isOpened():
            cap.release()
            return False

        if isinstance(self.fonte, int):
            if self.largura and self.altura:
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, int(self.largura))
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(self.altura))
        # Buffer pequeno = menos atraso (nem todo backend respeita isso).
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        self._cap = cap
        return True

    def iniciar(self):
        """Abre a câmera e começa a ler quadros em segundo plano."""
        if not self._abrir():
            raise ConnectionError(
                f"Não foi possível abrir a câmera (fonte = {self.fonte!r}). "
                "Verifique se ela está conectada e se outro programa "
                "(Teams, Zoom, navegador) não está usando a webcam."
            )
        self.conectada = True
        self._rodando = True
        self._thread = threading.Thread(target=self._laco_leitura, daemon=True)
        self._thread.start()
        return self

    # ------------------------------------------------------------------
    # Thread de leitura
    # ------------------------------------------------------------------
    def _laco_leitura(self):
        falhas_seguidas = 0
        while self._rodando:
            ok, quadro = self._cap.read() if self._cap is not None else (False, None)

            if ok and quadro is not None:
                falhas_seguidas = 0
                with self._trava:
                    self._quadro = quadro
                    self._numero_quadro += 1
                self.conectada = True
                continue

            # Algumas falhas isoladas são normais; muitas seguidas = câmera caiu.
            falhas_seguidas += 1
            if falhas_seguidas < 30:
                time.sleep(0.01)
                continue

            self.conectada = False
            print(f"[CAMERA] Sem imagem da fonte {self.fonte!r}. "
                  f"Tentando reconectar em {self.espera_reconexao:.0f} s...")
            if self._cap is not None:
                self._cap.release()
                self._cap = None
            time.sleep(self.espera_reconexao)
            if self._rodando and self._abrir():
                print("[CAMERA] Reconectada!")
                falhas_seguidas = 0

    # ------------------------------------------------------------------
    # Uso pelo programa principal
    # ------------------------------------------------------------------
    def ler(self):
        """Retorna (numero_do_quadro, copia_do_quadro).

        Se ainda não chegou nenhum quadro, retorna (0, None).
        O número serve para saber se o quadro é novo ou repetido.
        """
        with self._trava:
            if self._quadro is None:
                return 0, None
            return self._numero_quadro, self._quadro.copy()

    def parar(self):
        """Encerra a thread e libera a câmera."""
        self._rodando = False
        if self._thread is not None:
            self._thread.join(timeout=2)
        if self._cap is not None:
            self._cap.release()
            self._cap = None
        self.conectada = False

    # Permite usar "with Camera(cfg) as cam:"
    def __enter__(self):
        return self.iniciar()

    def __exit__(self, *_):
        self.parar()


class FonteImagem:
    """Finge ser uma câmera usando uma foto fixa (teste sem webcam).

    Uso: rodar.bat --imagem fotos_teste\\placa.jpg
    Tem os mesmos métodos da classe Camera, então o main.py não percebe
    a diferença.
    """

    def __init__(self, caminho):
        self.fonte = str(caminho)
        self._imagem = None
        self._numero_quadro = 0
        self.conectada = False

    def iniciar(self):
        self._imagem = cv2.imread(self.fonte)
        if self._imagem is None:
            raise ConnectionError(f"Não foi possível abrir a imagem {self.fonte!r}.")
        self.conectada = True
        return self

    def ler(self):
        time.sleep(0.03)  # simula ~30 quadros por segundo
        self._numero_quadro += 1
        return self._numero_quadro, self._imagem.copy()

    def parar(self):
        self.conectada = False
