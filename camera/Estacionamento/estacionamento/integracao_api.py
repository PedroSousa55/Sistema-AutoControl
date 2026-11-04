
"""
integracao_api.py - Integração da câmera com a API do AutoControl.

ENTRADA:
POST /movimentacao/camera/entrada
HTTP esperado: 201

SAÍDA:
POST /movimentacao/camera/saida
HTTP esperado: 200

Se a API estiver indisponível:
- Entrada: salva o evento em logs/pendentes.jsonl.
- Saída: retorna None e não libera a cancela.
"""

import json
import threading
from pathlib import Path

import requests


class SistemaGestao:

    def __init__(self, config_api, raiz_projeto):

        self.simulado = bool(config_api.get("modo_simulado", False))

        self.url_base = str(
            config_api.get("url_base", "http://localhost:3333")
        ).rstrip("/")

        self.rota_entrada = config_api.get(
            "rota_entrada",
            "/movimentacao/camera/entrada"
        )

        self.rota_saida = config_api.get(
            "rota_saida",
            "/movimentacao/camera/saida"
        )

        self.api_key = str(config_api.get("api_key", ""))

        self.timeout = float(config_api.get("timeout_s", 5))

        self.raiz = Path(raiz_projeto)

        self.arquivo_pendentes = (
            self.raiz / "logs" / "pendentes.jsonl"
        )

        self.arquivo_pendentes.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        self._trava = threading.Lock()

        self.headers = {
            "Content-Type": "application/json",
            "x-camera-key": self.api_key
        }

    # ==============================================================
    # PREPARAÇÃO DOS DADOS
    # ==============================================================

    def _preparar_evento(self, evento):

        return {
            "placa": evento["placa"],
            "data_hora": evento["data_hora"]
        }

    # ==============================================================
    # ENTRADA
    # ==============================================================

    def enviar_entrada(self, evento):
        """
        Envia a entrada para o AutoControl.

        Retorna:
        True  = API confirmou HTTP 201.
        False = falha no envio.

        Se falhar, guarda o evento para tentar enviar novamente.
        """

        dados = self._preparar_evento(evento)

        if self.simulado:
            print(
                "[API] Modo simulado ainda está ativado. "
                "Altere para false no config.yaml."
            )
            self._guardar_pendente(dados)
            return False

        ok = self._post_entrada(dados)

        if ok:
            self._reenviar_pendentes()
        else:
            self._guardar_pendente(dados)

        return ok

    def _post_entrada(self, dados):

        url = self.url_base + self.rota_entrada

        try:

            resposta = requests.post(
                url,
                json=dados,
                headers=self.headers,
                timeout=self.timeout
            )

            if resposta.status_code != 201:

                print(
                    f"[API] Entrada não confirmada. "
                    f"HTTP {resposta.status_code}: {resposta.text}"
                )

                return False

            print(
                f"[API] Entrada registrada: "
                f"{dados['placa']} (HTTP 201)"
            )

            return True

        except requests.RequestException as erro:

            print(
                f"[API] Falha ao enviar entrada de "
                f"{dados['placa']}: {_resumo(erro)}"
            )

            return False

    def _guardar_pendente(self, dados):
        """
        Salva uma entrada que não conseguiu chegar à API.
        """

        with self._trava:

            with open(
                self.arquivo_pendentes,
                "a",
                encoding="utf-8"
            ) as arquivo:

                arquivo.write(
                    json.dumps(dados, ensure_ascii=False) + "\n"
                )

        print(
            "[API] Entrada salva em logs/pendentes.jsonl."
        )

    def _reenviar_pendentes(self):
        """
        Tenta reenviar as entradas pendentes depois
        de uma nova entrada confirmada pela API.
        """

        with self._trava:

            if not self.arquivo_pendentes.exists():
                return

            linhas = self.arquivo_pendentes.read_text(
                encoding="utf-8"
            ).splitlines()

            self.arquivo_pendentes.unlink()

        sobraram = []

        for linha in linhas:

            if not linha.strip():
                continue

            try:

                dados = json.loads(linha)

                if not self._post_entrada(dados):
                    sobraram.append(linha)

            except (json.JSONDecodeError, KeyError) as erro:

                print(
                    f"[API] Evento pendente inválido: {erro}"
                )

        if sobraram:

            with self._trava:

                with open(
                    self.arquivo_pendentes,
                    "a",
                    encoding="utf-8"
                ) as arquivo:

                    arquivo.write(
                        "\n".join(sobraram) + "\n"
                    )

    # ==============================================================
    # SAÍDA
    # ==============================================================

    def registrar_saida(self, evento):
        """
        Envia a saída para o AutoControl.

        Retorna:
        Dicionário = API confirmou HTTP 200.
        None       = falha ou saída não confirmada.

        A cancela só poderá abrir quando retornar um dicionário.
        """

        if self.simulado:

            print(
                "[API] Modo simulado ainda está ativado. "
                "Altere para false no config_saida.yaml."
            )

            return None

        dados = self._preparar_evento(evento)

        url = self.url_base + self.rota_saida

        try:

            resposta = requests.post(
                url,
                json=dados,
                headers=self.headers,
                timeout=self.timeout
            )

            if resposta.status_code != 200:

                print(
                    f"[API] Saída não confirmada. "
                    f"HTTP {resposta.status_code}: {resposta.text}"
                )

                return None

            resultado = resposta.json()

            print(
                f"[API] Saída registrada: "
                f"{dados['placa']} (HTTP 200)"
            )

            return resultado

        except (requests.RequestException, ValueError) as erro:

            print(
                f"[API] Falha ao registrar saída de "
                f"{dados['placa']}: {_resumo(erro)}"
            )

            return None


# ==============================================================
# TRATAMENTO DAS MENSAGENS DE ERRO
# ==============================================================

def _resumo(erro):

    if isinstance(erro, requests.ConnectionError):
        return "servidor fora do ar ou URL incorreta"

    if isinstance(erro, requests.Timeout):
        return "o servidor demorou demais para responder"

    if isinstance(erro, requests.HTTPError):

        if erro.response is not None:
            return (
                f"servidor respondeu HTTP "
                f"{erro.response.status_code}"
            )

    return str(erro)
