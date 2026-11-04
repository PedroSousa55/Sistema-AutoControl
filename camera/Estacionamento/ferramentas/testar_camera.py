"""
testar_camera.py - Confere se a câmera do config.yaml funciona.

Uso:
    .venv\\Scripts\\python ferramentas\\testar_camera.py          (abre a janela)
    .venv\\Scripts\\python ferramentas\\testar_camera.py --listar (procura webcams)
    .venv\\Scripts\\python ferramentas\\testar_camera.py --config config_saida.yaml

Na janela: tecla Q ou ESC para sair.
Para escolher e gravar a câmera automaticamente, use o configurar_camera.bat.
"""

import argparse
import sys
import time
from pathlib import Path

# Permite importar o pacote "estacionamento" rodando a partir desta pasta.
RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from estacionamento.captura import Camera  # noqa: E402  (importa antes do cv2: silencia avisos)

import cv2  # noqa: E402
import yaml  # noqa: E402


def procurar_webcams(maximo=6):
    """Testa os índices 0..maximo e devolve as webcams que mandam imagem.

    Cada item: {"indice": 0, "largura": 640, "altura": 480, "colorida": True}

    Notebooks com Windows Hello têm DUAS câmeras: a normal (colorida) e a
    infravermelha (IR, imagem cinza). A IR não serve para ler placas.
    """
    webcams = []
    for indice in range(maximo):
        cap = cv2.VideoCapture(indice, cv2.CAP_DSHOW)
        if not cap.isOpened():
            continue
        ok, quadro = False, None
        for _ in range(10):  # os primeiros quadros às vezes vêm vazios
            ok, quadro = cap.read()
            if ok:
                break
            time.sleep(0.05)
        cap.release()
        if not ok:
            webcams.append({"indice": indice, "largura": 0, "altura": 0, "colorida": False, "sem_imagem": True})
            continue
        altura, largura = quadro.shape[:2]
        b, g, r = cv2.split(quadro.astype("int16"))
        diferenca_cor = float(abs(b - g).mean() + abs(g - r).mean())
        webcams.append({"indice": indice, "largura": largura, "altura": altura,
                        "colorida": diferenca_cor > 2, "sem_imagem": False})
    return webcams


def listar_webcams(maximo=6):
    print("Procurando webcams...")
    for w in procurar_webcams(maximo):
        if w["sem_imagem"]:
            print(f"  índice {w['indice']}: abre, mas não manda imagem")
            continue
        tipo = "COLORIDA (use esta)" if w["colorida"] else "cinza (provável câmera IR)"
        print(f"  índice {w['indice']}: {w['largura']}x{w['altura']} - {tipo}")


def mostrar(config):
    camera = Camera(config["camera"]).iniciar()
    print(f"Câmera aberta (fonte = {camera.fonte!r}). Q ou ESC para sair.")
    ultimo, contador, inicio, fps = 0, 0, time.time(), 0.0
    try:
        while True:
            numero, quadro = camera.ler()
            if quadro is None:
                time.sleep(0.01)
                continue
            if numero != ultimo:
                ultimo = numero
                contador += 1
            if time.time() - inicio >= 1:
                fps, contador, inicio = contador / (time.time() - inicio), 0, time.time()

            altura, largura = quadro.shape[:2]
            texto = f"{largura}x{altura}  {fps:.0f} FPS"
            cv2.putText(quadro, texto, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.imshow("Teste da camera - Q para sair", quadro)
            if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                break
    finally:
        camera.parar()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Teste da câmera")
    parser.add_argument("--listar", action="store_true", help="procura webcams disponíveis")
    parser.add_argument("--config", default="config.yaml", help="arquivo de configuração (ex.: config_saida.yaml)")
    args = parser.parse_args()

    if args.listar:
        listar_webcams()
    else:
        with open(RAIZ / args.config, encoding="utf-8") as arquivo:
            mostrar(yaml.safe_load(arquivo))
