"""
votacao.py - Só confirma uma placa quando ela se repete em vários quadros.

Por que votar?
    Num único quadro o OCR pode errar (reflexo, borrão, placa inclinada).
    Mas é muito difícil ele errar DO MESMO JEITO várias vezes seguidas.
    Então guardamos as últimas leituras e confirmamos a placa que aparecer
    pelo menos "votos_minimos" vezes dentro das últimas "janela_quadros".

    Exemplo com janela = 10 e votos_minimos = 5:
        ABC1D23, ABC1D23, A8C1D23, ABC1D23, ABC1D23, ABC1D23  -> confirma ABC1D23

Depois de confirmar, a mesma placa fica "em descanso" por alguns segundos
para não gerar dez eventos de entrada do mesmo carro parado na cancela.
"""

import time
from collections import Counter, deque


class Votacao:
    def __init__(self, config_votacao):
        self.janela = int(config_votacao.get("janela_quadros", 10))
        self.votos_minimos = int(config_votacao.get("votos_minimos", 5))
        self.intervalo_repeticao = float(config_votacao.get("intervalo_repeticao_s", 20))
        # Se ficar este tempo sem ver placa, esquece os votos antigos
        self.tempo_esquecer = float(config_votacao.get("tempo_esquecer_s", 2))

        self._votos = deque(maxlen=self.janela)  # cada item: (placa, confianca)
        self._ultimo_voto = 0.0
        self._confirmadas = {}  # placa -> horário em que foi confirmada

    def adicionar(self, placa, confianca):
        """Registra uma leitura válida.

        Retorna (placa, confianca_media) quando a placa é CONFIRMADA,
        ou None enquanto ainda não houver votos suficientes.
        """
        agora = time.time()
        if agora - self._ultimo_voto > self.tempo_esquecer:
            self._votos.clear()  # passou muito tempo: é outro veículo
        self._ultimo_voto = agora
        self._votos.append((placa, confianca))

        # Qual placa tem mais votos na janela?
        contagem = Counter(p for p, _ in self._votos)
        vencedora, votos = contagem.most_common(1)[0]
        if votos < self.votos_minimos:
            return None

        # Mesma placa confirmada há pouco tempo? Ignora (carro parado).
        if agora - self._confirmadas.get(vencedora, 0) < self.intervalo_repeticao:
            return None

        confiancas = [c for p, c in self._votos if p == vencedora]
        # Confiança final = média do OCR x proporção de votos na janela
        confianca_final = (sum(confiancas) / len(confiancas)) * (votos / len(self._votos))

        self._confirmadas[vencedora] = agora
        self._votos.clear()
        return vencedora, round(confianca_final, 2)

    def progresso(self):
        """Retorna (placa_lider, votos) para mostrar na tela."""
        if not self._votos:
            return None, 0
        return Counter(p for p, _ in self._votos).most_common(1)[0]

    def limpar(self):
        self._votos.clear()
