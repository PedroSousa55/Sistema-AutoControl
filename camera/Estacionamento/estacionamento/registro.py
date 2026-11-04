"""
registro.py - Monta o JSON do evento, imprime no terminal e salva no log.

O formato do JSON é o "contrato" combinado com a equipe de sistemas:
{
  "evento": "entrada",
  "placa": "ABC1D23",
  "tipo": "carro",
  "cor": "prata",
  "confianca": 0.93,
  "data_hora": "2026-10-28T14:35:00-03:00",
  "camera": "entrada_1",
  "foto": "fotos/20261028_143500_ABC1D23.jpg"
}

O log é um arquivo ".jsonl" (JSON Lines): uma linha = um JSON completo.
É fácil de abrir no Bloco de Notas, no Excel ou ler com qualquer linguagem.
"""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import cv2


def _fuso(texto):
    """Converte "-03:00" em um objeto de fuso horário."""
    sinal = -1 if texto.startswith("-") else 1
    horas, minutos = texto.lstrip("+-").split(":")
    return timezone(sinal * timedelta(hours=int(horas), minutes=int(minutos)))


class Registro:
    def __init__(self, config_registro, raiz_projeto):
        self.arquivo_log = Path(raiz_projeto) / config_registro.get("arquivo_log", "logs/leituras.jsonl")
        self.pasta_fotos = Path(raiz_projeto) / config_registro.get("pasta_fotos", "fotos")
        self.fuso = _fuso(config_registro.get("fuso_horario", "-03:00"))
        self.raiz = Path(raiz_projeto)
        self.arquivo_log.parent.mkdir(parents=True, exist_ok=True)
        self.pasta_fotos.mkdir(parents=True, exist_ok=True)

    def agora(self):
        return datetime.now(self.fuso)

    def salvar_foto(self, imagem, placa, momento):
        """Salva o recorte da placa e devolve o caminho relativo."""
        if imagem is None or imagem.size == 0:
            return None
        nome = f"{momento:%Y%m%d_%H%M%S}_{placa}.jpg"
        caminho = self.pasta_fotos / nome
        cv2.imwrite(str(caminho), imagem)
        return caminho.relative_to(self.raiz).as_posix()

    def criar_evento(self, evento, placa, confianca, camera, tipo=None, cor=None, foto=None, momento=None):
        momento = momento or self.agora()
        return {
            "evento": evento,
            "placa": placa,
            "tipo": tipo,
            "cor": cor,
            "confianca": confianca,
            "data_hora": momento.isoformat(timespec="seconds"),
            "camera": camera,
            "foto": foto,
        }

    def gravar(self, dados):
        """Imprime o JSON no terminal e acrescenta uma linha no log."""
        print(json.dumps(dados, ensure_ascii=False, indent=2))
        with open(self.arquivo_log, "a", encoding="utf-8") as arquivo:
            arquivo.write(json.dumps(dados, ensure_ascii=False) + "\n")
