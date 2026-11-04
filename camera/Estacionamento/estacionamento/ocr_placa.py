"""
ocr_placa.py - Lê os caracteres da placa (OCR = Reconhecimento Óptico de Caracteres).

Usamos o "fast-plate-ocr": uma rede neural pequena treinada SÓ com placas
de vários países (inclusive Brasil, antigas e Mercosul). Por ser
especializada, ela acerta mais e é mais rápida que um OCR genérico.

Entrada: o recorte da placa (vindo de deteccao_placa.py).
Saída  : o texto lido e a confiança média dos caracteres (0 a 1).
"""

import cv2
import numpy as np

from estacionamento.deteccao_placa import opcoes_onnx


class LeitorOCR:
    def __init__(self, config_ocr):
        from fast_plate_ocr import LicensePlateRecognizer

        self.confianca_minima = float(config_ocr.get("confianca_minima", 0.5))
        modelo = config_ocr.get("modelo", "cct-s-v2-global-model")
        # device="cpu": funciona em qualquer notebook, sem placa de vídeo
        self._modelo = LicensePlateRecognizer(modelo, device="cpu", sess_options=opcoes_onnx())

    def ler(self, recorte_bgr):
        """Lê o texto do recorte. Retorna {"texto": "ABC1D23", "confianca": 0.91}."""
        if recorte_bgr is None or recorte_bgr.size == 0:
            return {"texto": "", "confianca": 0.0}

        # O OpenCV trabalha em BGR, mas este modelo foi treinado em RGB.
        recorte_rgb = cv2.cvtColor(recorte_bgr, cv2.COLOR_BGR2RGB)
        previsao = self._modelo.run(recorte_rgb, return_confidence=True)[0]

        texto = previsao.plate
        # char_probs tem uma confiança por "casa" (10 casas). Usamos só as
        # casas que viraram caractere de verdade.
        if previsao.char_probs is not None and len(texto) > 0:
            confianca = float(np.mean(previsao.char_probs[: len(texto)]))
        else:
            confianca = 0.0
        return {"texto": texto, "confianca": round(confianca, 3)}
