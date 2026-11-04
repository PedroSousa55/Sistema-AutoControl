"""
deteccao_placa.py - Encontra ONDE está a placa na imagem.

A detecção responde só "onde": devolve um retângulo (caixa) em volta de
cada placa encontrada e uma confiança de 0 a 1. Quem lê as letras é o OCR
(ocr_placa.py), que recebe apenas o recorte da placa.

Dois motores possíveis (escolhidos no config.yaml):
    open_image_models -> YOLO v9 já treinado com milhares de placas do mundo
                         todo. Baixa sozinho na primeira vez (~10 MB) e roda
                         em CPU com ONNX Runtime. É o padrão.
    yolo              -> um modelo seu, treinado com Ultralytics (arquivo .pt).
                         Veja no README como treinar com fotos de placas.
"""


def opcoes_onnx():
    """Configuração do ONNX Runtime (o "motor" que roda os modelos .onnx).

    Por padrão, depois de cada execução as threads do ONNX ficam um tempo
    "girando" (spinning) à espera de mais trabalho, ocupando a CPU. Como
    usamos DOIS modelos em sequência (detector e OCR), um atrapalhava o
    outro: desligar isso derrubou o tempo de ~120 ms para ~30 ms por quadro.
    """
    import onnxruntime as ort

    opcoes = ort.SessionOptions()
    opcoes.add_session_config_entry("session.intra_op.allow_spinning", "0")
    return opcoes


class DetectorPlaca:
    def __init__(self, config_deteccao):
        self.motor = config_deteccao.get("motor", "open_image_models")
        self.confianca_minima = float(config_deteccao.get("confianca_minima", 0.4))

        if self.motor == "open_image_models":
            from open_image_models import create_detector

            nome = config_deteccao.get("modelo", "yolo-v9-t-384-license-plate-end2end")
            self._modelo = create_detector(nome, conf_thresh=self.confianca_minima,
                                           sess_options=opcoes_onnx())
        elif self.motor == "yolo":
            from ultralytics import YOLO

            self._modelo = YOLO(config_deteccao.get("modelo_yolo", "modelos/placa.pt"))
        else:
            raise ValueError(f"Motor de detecção desconhecido: {self.motor!r}")

    def detectar(self, imagem_bgr):
        """Procura placas na imagem (formato BGR do OpenCV).

        Retorna uma lista, da MAIOR confiança para a menor:
            [{"caixa": (x1, y1, x2, y2), "confianca": 0.87}, ...]
        """
        placas = []
        if self.motor == "open_image_models":
            for resultado in self._modelo.predict(imagem_bgr):
                c = resultado.bounding_box
                placas.append({"caixa": (c.x1, c.y1, c.x2, c.y2),
                               "confianca": float(resultado.confidence)})
        else:
            resultado = self._modelo(imagem_bgr, conf=self.confianca_minima, verbose=False)[0]
            for caixa, conf in zip(resultado.boxes.xyxy.tolist(), resultado.boxes.conf.tolist()):
                placas.append({"caixa": tuple(int(v) for v in caixa), "confianca": float(conf)})

        placas = [p for p in placas if p["confianca"] >= self.confianca_minima]
        placas.sort(key=lambda p: p["confianca"], reverse=True)
        return placas


def recortar(imagem, caixa, margem=0.08):
    """Recorta a placa com uma pequena margem (a caixa às vezes corta a borda)."""
    altura, largura = imagem.shape[:2]
    x1, y1, x2, y2 = caixa
    mx = int((x2 - x1) * margem)
    my = int((y2 - y1) * margem)
    x1, y1 = max(0, x1 - mx), max(0, y1 - my)
    x2, y2 = min(largura, x2 + mx), min(altura, y2 + my)
    return imagem[y1:y2, x1:x2]
