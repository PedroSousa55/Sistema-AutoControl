"""
integracao_api.py - Conversa com o SISTEMA DE GESTÃO (equipe de sistemas, JavaScript).

Para nós o sistema de gestão é uma "caixa preta" com duas portas:

  1) ENTRADA  -> POST {url_base}{rota_entrada}  com o JSON do evento
                 {"evento": "entrada", "placa": "ABC1D23", ...}

  2) SAÍDA    -> pergunta se a placa já pagou:
                 GET  {url_base}{rota_consulta_pagamento}?placa=ABC1D23
                 (ou POST com {"placa": "ABC1D23"}, conforme o config)
                 Resposta esperada: {"placa": "ABC1D23", "pago": true, "valor": 12.50}

As URLs e rotas ficam no config.yaml, porque a equipe de sistemas ainda vai
definir o servidor.

MODO SIMULADO (api.modo_simulado: true)
    Não precisa de servidor nenhum. As entradas ficam guardadas no arquivo
    logs/patio_simulado.json e a consulta de pagamento responde conforme as
    regras do config (api.simulado). Serve para testar tudo sem a API real.

API FORA DO AR
    - Entrada: o evento vai para logs/pendentes.jsonl e é reenviado
      automaticamente na próxima vez que a API responder. (A cancela abre
      mesmo assim: não faz sentido barrar quem está ENTRANDO.)
    - Saída: devolvemos None, e o main.py NÃO abre a cancela (chame o atendente).
"""

import base64
import json
import math
import threading
from datetime import datetime
from pathlib import Path

import requests


class SistemaGestao:
    def __init__(self, config_api, raiz_projeto):
        self.simulado = bool(config_api.get("modo_simulado", True))
        self.url_base = str(config_api.get("url_base", "http://localhost:3000")).rstrip("/")
        self.rota_entrada = config_api.get("rota_entrada", "/api/entrada")
        self.rota_pagamento = config_api.get("rota_consulta_pagamento", "/api/pagamento")
        self.metodo_consulta = str(config_api.get("metodo_consulta", "GET")).upper()
        self.timeout = float(config_api.get("timeout_s", 3))
        self.enviar_foto = bool(config_api.get("enviar_foto", False))
        self.regras_simulado = config_api.get("simulado", {}) or {}

        self.raiz = Path(raiz_projeto)
        self.arquivo_pendentes = self.raiz / "logs" / "pendentes.jsonl"
        self.arquivo_patio = self.raiz / "logs" / "patio_simulado.json"
        self.arquivo_pendentes.parent.mkdir(parents=True, exist_ok=True)
        self._trava = threading.Lock()  # os envios rodam em threads separadas

    # ==================================================================
    # ENTRADA
    # ==================================================================
    def enviar_entrada(self, evento):
        """Envia o evento de entrada. Retorna True se o sistema recebeu."""
        dados = dict(evento)
        if self.enviar_foto and dados.get("foto"):
            dados["foto"] = self._foto_base64(dados["foto"])

        if self.simulado:
            self._simulado_registrar_entrada(dados)
            print(f"[API SIMULADA] Entrada registrada: {dados['placa']}")
            return True

        ok = self._post_entrada(dados)
        if ok:
            self._reenviar_pendentes()
        else:
            self._guardar_pendente(dados)
        return ok

    def _post_entrada(self, dados):
        url = self.url_base + self.rota_entrada
        try:
            resposta = requests.post(url, json=dados, timeout=self.timeout)
            resposta.raise_for_status()  # erro se o servidor responder 4xx/5xx
            print(f"[API] Entrada enviada: {dados['placa']} (HTTP {resposta.status_code})")
            return True
        except requests.RequestException as erro:
            print(f"[API] FALHA ao enviar entrada de {dados['placa']}: {_resumo(erro)}")
            return False

    def _guardar_pendente(self, dados):
        with self._trava, open(self.arquivo_pendentes, "a", encoding="utf-8") as arquivo:
            arquivo.write(json.dumps(dados, ensure_ascii=False) + "\n")
        print("[API] Evento guardado em logs/pendentes.jsonl para reenviar depois.")

    def _reenviar_pendentes(self):
        """Tenta mandar de novo os eventos que falharam quando a API estava fora."""
        with self._trava:
            if not self.arquivo_pendentes.exists():
                return
            linhas = self.arquivo_pendentes.read_text(encoding="utf-8").splitlines()
            self.arquivo_pendentes.unlink()
        sobraram = [linha for linha in linhas if linha.strip() and not self._post_entrada(json.loads(linha))]
        if sobraram:
            with self._trava, open(self.arquivo_pendentes, "a", encoding="utf-8") as arquivo:
                arquivo.write("\n".join(sobraram) + "\n")

    # ==================================================================
    # SAÍDA - consulta de pagamento
    # ==================================================================
    def consultar_pagamento(self, placa):
        """Pergunta se a placa pagou.

        Retorna {"placa": "...", "pago": True/False, "valor": 12.5}
        ou None se não foi possível consultar (API fora do ar / resposta estranha).
        """
        if self.simulado:
            resultado = self._simulado_consultar(placa)
            print(f"[API SIMULADA] {placa}: pago={resultado['pago']} valor=R$ {resultado['valor']:.2f}")
            return resultado

        url = self.url_base + self.rota_pagamento
        try:
            if self.metodo_consulta == "POST":
                resposta = requests.post(url, json={"placa": placa}, timeout=self.timeout)
            else:
                resposta = requests.get(url, params={"placa": placa}, timeout=self.timeout)
            resposta.raise_for_status()
            dados = resposta.json()
        except (requests.RequestException, ValueError) as erro:
            print(f"[API] FALHA ao consultar pagamento de {placa}: {_resumo(erro)}")
            return None

        if not isinstance(dados, dict) or "pago" not in dados:
            print(f"[API] Resposta sem o campo 'pago': {dados!r}")
            return None
        return {
            "placa": dados.get("placa", placa),
            "pago": dados.get("pago") is True,  # só libera com true de verdade
            "valor": dados.get("valor"),
        }

    # ==================================================================
    # MODO SIMULADO
    # ==================================================================
    def _ler_patio(self):
        if self.arquivo_patio.exists():
            return json.loads(self.arquivo_patio.read_text(encoding="utf-8"))
        return {}

    def _simulado_registrar_entrada(self, dados):
        with self._trava:
            patio = self._ler_patio()
            patio[dados["placa"]] = dados["data_hora"]
            self.arquivo_patio.write_text(json.dumps(patio, indent=2), encoding="utf-8")

    def _simulado_consultar(self, placa):
        """Regras do simulador (config.yaml -> api.simulado):
            todas_pagas      : true = toda placa é considerada paga
            placas_nao_pagas : lista de placas que NUNCA estão pagas (para testar a recusa)
            valor_hora       : preço por hora (cobra no mínimo 1 hora)
        """
        regras = self.regras_simulado
        pago = bool(regras.get("todas_pagas", True)) and placa not in regras.get("placas_nao_pagas", [])

        valor_hora = float(regras.get("valor_hora", 5.0))
        entrada = self._ler_patio().get(placa)
        horas = 1
        if entrada:
            inicio = datetime.fromisoformat(entrada)
            permanencia = datetime.now(inicio.tzinfo) - inicio
            horas = max(1, math.ceil(permanencia.total_seconds() / 3600))
        return {"placa": placa, "pago": pago, "valor": round(horas * valor_hora, 2)}

    # ==================================================================
    def _foto_base64(self, caminho_relativo):
        caminho = self.raiz / caminho_relativo
        if not caminho.exists():
            return None
        return "data:image/jpeg;base64," + base64.b64encode(caminho.read_bytes()).decode("ascii")


def _resumo(erro):
    """Mensagem de erro curta e compreensível."""
    if isinstance(erro, requests.ConnectionError):
        return "servidor fora do ar ou URL errada"
    if isinstance(erro, requests.Timeout):
        return "o servidor demorou demais para responder"
    if isinstance(erro, requests.HTTPError):
        return f"o servidor respondeu com erro HTTP {erro.response.status_code}"
    return str(erro)
