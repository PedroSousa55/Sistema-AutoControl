"""
simulador_esp32.py - Finge ser o ESP32, para testar sem o hardware.

Mostra no terminal os comandos que o notebook manda (abrir_cancela, LEDs)
e deixa você simular os dois sensores ultrassônicos pelo teclado:
ENTER = S1 (chegada), p = S2 (o veículo passou), x = passou mais um veículo.

Uso (com o mesmo config.yaml do leitor):
    .venv\\Scripts\\python ferramentas\\simulador_esp32.py                      (cancela da entrada)
    .venv\\Scripts\\python ferramentas\\simulador_esp32.py --camera saida_1     (cancela da saída)

  MQTT: precisa do Mosquitto rodando (veja o README).
  HTTP: o simulador atende em http://localhost:8081/comando?acao=...
        então use no config.yaml:  esp32.http.url_esp32: "http://localhost:8081"
"""

import argparse
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import requests
import yaml

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from estacionamento.integracao_esp32 import da_camera  # noqa: E402

DESCRICAO = {
    "abrir_cancela": ">>> CANCELA ABERTA <<<",
    "fechar_cancela": "cancela fechada",
    "led_verde": "LED VERDE aceso",
    "led_vermelho": "LED VERMELHO aceso",
    "led_apagar": "LEDs apagados",
}


def mostrar(comando):
    print(f"  [ESP32 SIMULADO] recebeu '{comando}': {DESCRICAO.get(comando, 'comando desconhecido')}")


def modo_mqtt(cfg, camera="entrada_1"):
    import paho.mqtt.client as mqtt

    m = cfg["mqtt"]
    topico_comandos = m["topico_comandos"].format(camera=camera)
    topico_sensor = m["topico_sensor"].format(camera=camera)
    topico_passagem = m.get("topico_passagem", "estacionamento/{camera}/passagem").format(camera=camera)
    cliente = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    cliente.on_connect = lambda c, *_: (c.subscribe(topico_comandos),
                                         print(f"Conectado ao broker {m['broker']}:{m['porta']} "
                                               f"(ouvindo {topico_comandos})"))
    cliente.on_message = lambda _c, _u, msg: mostrar(msg.payload.decode())
    try:
        cliente.connect(m["broker"], int(m["porta"]))
    except OSError:
        print(f"[ERRO] Broker MQTT em {m['broker']}:{m['porta']} não encontrado. O Mosquitto está rodando?")
        sys.exit(1)
    cliente.loop_start()
    # Duas funções: S1 (chegada, "1"/"0") e S2 (passagem, "passou")
    return (lambda estado: cliente.publish(topico_sensor, estado, qos=1),
            lambda evento: cliente.publish(topico_passagem, evento, qos=1))


def modo_http(cfg, porta_simulador, camera="entrada_1"):
    class Comandos(BaseHTTPRequestHandler):
        def do_GET(self):
            url = urlparse(self.path)
            if url.path == "/comando":
                mostrar(parse_qs(url.query).get("acao", [""])[0])
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"ok")
            else:
                self.send_error(404)

        def log_message(self, *_):
            pass

    servidor = ThreadingHTTPServer(("0.0.0.0", porta_simulador), Comandos)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    print(f"Recebendo comandos em http://localhost:{porta_simulador}/comando?acao=...")
    porta_notebook = da_camera(cfg["http"].get("porta_notebook"), camera, 8090)
    url_notebook = f"http://localhost:{porta_notebook}"

    def chamar(caminho, parametros):
        try:
            requests.get(url_notebook + caminho, params=parametros, timeout=2)
        except requests.RequestException:
            print(f"  (o leitor não respondeu em {url_notebook} - ele está rodando?)")

    return (lambda estado: chamar("/sensor", {"estado": estado}),
            lambda evento: chamar("/passagem", {"evento": evento}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--porta", type=int, default=8081, help="porta HTTP do ESP32 simulado")
    parser.add_argument("--camera", default="entrada_1", help="qual cancela simular: entrada_1 ou saida_1")
    args = parser.parse_args()

    with open(RAIZ / args.config, encoding="utf-8") as arquivo:
        cfg_esp32 = yaml.safe_load(arquivo)["esp32"]

    protocolo = cfg_esp32.get("protocolo", "mqtt")
    if protocolo == "mqtt":
        enviar_sensor, enviar_passagem = modo_mqtt(cfg_esp32, args.camera)
    else:
        enviar_sensor, enviar_passagem = modo_http(cfg_esp32, args.porta, args.camera)

    print(f"ESP32 simulado da cancela {args.camera} ({protocolo.upper()}).")
    print("  ENTER     = liga/desliga o S1 (veículo chegou / foi embora)")
    print("  p + ENTER = S2: o veículo PASSOU pela cancela")
    print("  x + ENTER = S2: passou MAIS UM veículo (colado no da frente)")
    print("  Ctrl+C    = sair")
    presente = False
    try:
        while True:
            tecla = input().strip().lower()
            if tecla == "p":
                enviar_passagem("passou")
                print("  [S2] veículo PASSOU")
            elif tecla == "x":
                enviar_passagem("passou_extra")
                print("  [S2] passou MAIS UM veículo")
            else:
                presente = not presente
                enviar_sensor("1" if presente else "0")
                print(f"  [S1] {'VEÍCULO CHEGOU (1)' if presente else 'livre (0)'}")
    except (KeyboardInterrupt, EOFError):
        print("Simulador encerrado.")
