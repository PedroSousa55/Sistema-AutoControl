"""
servidor_teste_api.py - Um sistema de gestão FALSO, para testar a comunicação HTTP.

Faz o papel do servidor da equipe de sistemas (que será em JavaScript),
seguindo exatamente o contrato combinado. Serve também de REFERÊNCIA para
eles: é só implementar as mesmas rotas no Node/Express.

Uso:
    .venv\\Scripts\\python ferramentas\\servidor_teste_api.py
    (e no config.yaml:  api.modo_simulado: false  e  api.url_base: "http://localhost:3000")

Rotas:
    POST /api/entrada                 recebe o JSON do evento de entrada
    GET  /api/pagamento?placa=XXX     responde {"placa", "pago", "valor"}
    POST /api/pagamento {"placa"}     idem, para quem preferir POST
    GET  /api/pagar?placa=XXX         marca a placa como paga (simula o caixa)
    GET  /                            página com os veículos no pátio

Começa com TODAS as placas NÃO pagas. Abra http://localhost:3000 no
navegador e clique em "pagar" para liberar a saída.
"""

import argparse
import json
import math
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

VALOR_HORA = 5.00
patio = {}      # placa -> evento de entrada
pagas = set()   # placas que já pagaram


def calcular_valor(placa):
    entrada = patio.get(placa)
    if not entrada:
        return VALOR_HORA
    inicio = datetime.fromisoformat(entrada["data_hora"])
    horas = (datetime.now(inicio.tzinfo) - inicio).total_seconds() / 3600
    return round(max(1, math.ceil(horas)) * VALOR_HORA, 2)


class Rotas(BaseHTTPRequestHandler):
    def _responder(self, codigo, dados, tipo="application/json"):
        corpo = dados if isinstance(dados, bytes) else json.dumps(dados, ensure_ascii=False).encode()
        self.send_response(codigo)
        self.send_header("Content-Type", f"{tipo}; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def _ler_json(self):
        tamanho = int(self.headers.get("Content-Length", 0))
        try:
            return json.loads(self.rfile.read(tamanho) or b"{}")
        except json.JSONDecodeError:
            return None

    def _pagamento(self, placa):
        if not placa:
            self._responder(400, {"erro": "informe a placa"})
            return
        resposta = {"placa": placa, "pago": placa in pagas, "valor": calcular_valor(placa)}
        print(f"[SERVIDOR] Consulta {placa}: {resposta}")
        self._responder(200, resposta)

    def do_GET(self):
        url = urlparse(self.path)
        parametros = parse_qs(url.query)
        placa = parametros.get("placa", [""])[0].upper()

        if url.path == "/api/pagamento":
            self._pagamento(placa)
        elif url.path == "/api/pagar":
            pagas.add(placa)
            print(f"[SERVIDOR] {placa} PAGOU R$ {calcular_valor(placa):.2f}")
            self.send_response(303)
            self.send_header("Location", "/")
            self.end_headers()
        elif url.path == "/":
            linhas = "".join(
                f"<tr><td>{p}</td><td>{e['data_hora']}</td><td>R$ {calcular_valor(p):.2f}</td>"
                f"<td>{'PAGO' if p in pagas else f'<a href=/api/pagar?placa={p}>pagar</a>'}</td></tr>"
                for p, e in patio.items()
            ) or "<tr><td colspan=4>Nenhum veículo no pátio</td></tr>"
            html = (
                "<html><head><meta charset=utf-8><meta http-equiv=refresh content=3>"
                "<title>Sistema de gestão (teste)</title></head><body style='font-family:sans-serif'>"
                "<h2>Pátio - servidor de teste</h2><table border=1 cellpadding=6>"
                "<tr><th>Placa</th><th>Entrada</th><th>Valor</th><th>Pagamento</th></tr>"
                f"{linhas}</table></body></html>"
            )
            self._responder(200, html.encode(), "text/html")
        else:
            self._responder(404, {"erro": "rota não encontrada"})

    def do_POST(self):
        url = urlparse(self.path)
        dados = self._ler_json()
        if dados is None:
            self._responder(400, {"erro": "JSON inválido"})
            return

        if url.path == "/api/entrada":
            if "placa" not in dados:
                self._responder(400, {"erro": "campo 'placa' obrigatório"})
                return
            patio[dados["placa"]] = dados
            pagas.discard(dados["placa"])  # nova entrada = novo pagamento
            print(f"[SERVIDOR] ENTRADA recebida: {json.dumps(dados, ensure_ascii=False)}")
            self._responder(201, {"ok": True})
        elif url.path == "/api/pagamento":
            self._pagamento(str(dados.get("placa", "")).upper())
        else:
            self._responder(404, {"erro": "rota não encontrada"})

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--porta", type=int, default=3000)
    args = parser.parse_args()
    servidor = ThreadingHTTPServer(("0.0.0.0", args.porta), Rotas)
    print(f"Servidor de teste em http://localhost:{args.porta}  (Ctrl+C para parar)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("Parado.")
