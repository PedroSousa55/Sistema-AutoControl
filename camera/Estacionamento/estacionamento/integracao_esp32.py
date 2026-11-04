"""
integracao_esp32.py - Conversa com o ESP32 (equipe de hardware).

Sentido NOTEBOOK -> ESP32 (comandos):
    "abrir_cancela", "fechar_cancela", "led_verde", "led_vermelho", "led_apagar"

Sentido ESP32 -> NOTEBOOK (dois sensores ultrassônicos por cancela):
    S1 CHEGADA (antes da cancela): "1" quando um veículo chega, "0" quando vai embora.
        Com esp32.usar_sensor_presenca: true, o notebook só lê placas enquanto
        o S1 indicar veículo presente (economiza CPU e evita leituras falsas).
    S2 PASSAGEM (depois da cancela): "passou" quando o veículo liberado
        atravessou a cancela; "passou_extra" quando MAIS UM veículo passou
        na mesma abertura (carro colado no da frente). Vira um evento no log.

Dois protocolos (esp32.protocolo no config.yaml):

  MQTT (recomendado) - um "correio" (broker Mosquitto) no notebook.
      Notebook publica comandos em ......  estacionamento/entrada_1/comando
      ESP32 publica o S1 em .............  estacionamento/entrada_1/sensor
      ESP32 publica o S2 em .............  estacionamento/entrada_1/passagem
      Vantagem: o ESP32 não precisa saber o IP do notebook, só o do broker,
      e vários programas podem "assinar" o mesmo tópico.

  HTTP - chamadas web simples, sem broker.
      Notebook chama ...  http://IP_DO_ESP32/comando?acao=abrir_cancela
      ESP32 chama .....   http://IP_DO_NOTEBOOK:8090/sensor?estado=1
                          http://IP_DO_NOTEBOOK:8090/passagem?evento=passou

UMA CANCELA = UM ESP32
    A entrada e a saída têm cada uma o seu ESP32. O nome da câmera
    (entrada_1 ou saida_1) escolhe com qual deles este programa conversa:
    nos tópicos MQTT, "{camera}" vira o nome; no HTTP, o IP do ESP32 e a
    porta do sensor podem ser dados por câmera (veja o config.yaml).

Com esp32.ativar: false os comandos só aparecem no terminal
(bom para testar o fluxo sem o hardware).
"""

import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import requests

COMANDOS_VALIDOS = {"abrir_cancela", "fechar_cancela", "led_verde", "led_vermelho", "led_apagar"}
VALORES_PRESENTE = {"1", "presente", "on", "true"}


def da_camera(valor, nome_camera, padrao=None):
    """Um item do config pode valer para todas as câmeras ou ser por câmera:
        url_esp32: "http://192.168.137.80"            -> o mesmo para todas
        url_esp32: {entrada_1: "...", saida_1: "..."} -> um por câmera
    """
    if isinstance(valor, dict):
        return valor.get(nome_camera, padrao)
    return padrao if valor is None else valor


class ESP32:
    def __init__(self, config_esp32, nome_camera="entrada_1"):
        self.ativo = bool(config_esp32.get("ativar", False))
        self.protocolo = str(config_esp32.get("protocolo", "mqtt")).lower()
        self.usar_sensor = self.ativo and bool(config_esp32.get("usar_sensor_presenca", False))
        self.nome_camera = nome_camera
        self.cfg_mqtt = config_esp32.get("mqtt", {}) or {}
        cfg_http = config_esp32.get("http", {}) or {}

        # Tópicos e endereços DESTA cancela ("{camera}" vira entrada_1 ou saida_1)
        self.topico_comandos = str(self.cfg_mqtt.get(
            "topico_comandos", "estacionamento/{camera}/comando")).format(camera=nome_camera)
        self.topico_sensor = str(self.cfg_mqtt.get(
            "topico_sensor", "estacionamento/{camera}/sensor")).format(camera=nome_camera)
        self.topico_passagem = str(self.cfg_mqtt.get(
            "topico_passagem", "estacionamento/{camera}/passagem")).format(camera=nome_camera)
        self.url_esp32 = str(da_camera(cfg_http.get("url_esp32"), nome_camera, "http://192.168.137.80"))
        self.porta_notebook = int(da_camera(cfg_http.get("porta_notebook"), nome_camera, 8090))

        self.presente = False          # último estado do S1 (chegada)
        self.momento_chegada = 0.0     # quando o S1 passou de 0 para 1
        # Função chamada quando o S2 avisa uma passagem: ao_passar("passou")
        # O main.py usa para gravar o evento no log.
        self.ao_passar = None
        self._cliente_mqtt = None
        self._servidor_http = None
        self._encerrando = False
        self._avisou_falha_mqtt = False

    # ==================================================================
    def iniciar(self):
        if not self.ativo:
            print("[ESP32] Desativado no config (os comandos só serão mostrados no terminal).")
            return self
        if self.protocolo == "mqtt":
            self._iniciar_mqtt()
        elif self.protocolo == "http":
            self._iniciar_http()
        else:
            raise ValueError(f"Protocolo do ESP32 desconhecido: {self.protocolo!r}")
        return self

    def enviar(self, comando):
        """Manda um comando ao ESP32. Nunca trava o programa se o ESP32 sumir."""
        if comando not in COMANDOS_VALIDOS:
            print(f"[ESP32] Comando desconhecido ignorado: {comando!r}")
            return False
        if not self.ativo:
            print(f"[ESP32 desativado] comando: {comando}")
            return True
        if self.protocolo == "mqtt":
            return self._enviar_mqtt(comando)
        return self._enviar_http(comando)

    def veiculo_presente(self):
        """Sem sensor configurado, consideramos que sempre pode haver veículo."""
        return self.presente if self.usar_sensor else True

    def _atualizar_sensor(self, valor):
        presente = str(valor).strip().lower() in VALORES_PRESENTE
        if presente and not self.presente:
            self.momento_chegada = time.time()
            print("[ESP32] Sensor: veículo CHEGOU")
        elif not presente and self.presente:
            print("[ESP32] Sensor: veículo SAIU")
        self.presente = presente

    def _registrar_passagem(self, evento):
        evento = str(evento).strip().lower()
        if evento not in ("passou", "passou_extra"):
            print(f"[ESP32] Aviso de passagem desconhecido ignorado: {evento!r}")
            return
        print("[ESP32] S2: veículo PASSOU pela cancela" if evento == "passou"
              else "[ESP32] S2: ATENÇÃO, passou mais um veículo na mesma abertura")
        if self.ao_passar is not None:
            self.ao_passar(evento)

    def parar(self):
        self._encerrando = True
        if self._cliente_mqtt is not None:
            self._cliente_mqtt.disconnect()
            self._cliente_mqtt.loop_stop()
        if self._servidor_http is not None:
            self._servidor_http.shutdown()

    # ==================================================================
    # MQTT
    # ==================================================================
    def _iniciar_mqtt(self):
        import paho.mqtt.client as mqtt

        broker = self.cfg_mqtt.get("broker", "localhost")
        porta = int(self.cfg_mqtt.get("porta", 1883))
        topico_sensor = self.topico_sensor
        topico_passagem = self.topico_passagem

        cliente = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

        def ao_conectar(client, _userdata, _flags, codigo, _props):
            if codigo.is_failure:
                print(f"[ESP32] Broker MQTT recusou a conexão: {codigo}")
                return
            print(f"[ESP32] Conectado ao broker MQTT {broker}:{porta} "
                  f"(cancela {self.nome_camera}: {self.topico_comandos})")
            client.subscribe([(topico_sensor, 1), (topico_passagem, 1)])

        def ao_desconectar(_client, _userdata, _flags, codigo, _props):
            if not self._encerrando:
                print(f"[ESP32] Broker MQTT desconectado ({codigo}). Tentando reconectar...")

        def ao_falhar(_client, _userdata):
            # Avisa só na primeira falha, para não encher o terminal
            if not self._avisou_falha_mqtt:
                self._avisou_falha_mqtt = True
                print(f"[ESP32] Broker MQTT não encontrado em {broker}:{porta}. "
                      "O Mosquitto está rodando? Continuo tentando em segundo plano...")

        def ao_receber(_client, _userdata, mensagem):
            conteudo = mensagem.payload.decode(errors="ignore")
            if mensagem.topic == topico_sensor:
                self._atualizar_sensor(conteudo)
            elif mensagem.topic == topico_passagem:
                self._registrar_passagem(conteudo)

        cliente.on_connect = ao_conectar
        cliente.on_disconnect = ao_desconectar
        cliente.on_connect_fail = ao_falhar
        cliente.on_message = ao_receber
        cliente.reconnect_delay_set(min_delay=1, max_delay=10)
        # connect_async + loop_start: conecta em segundo plano e reconecta
        # sozinho se o broker cair. O programa não trava se o broker estiver fora.
        cliente.connect_async(broker, porta, keepalive=30)
        cliente.loop_start()
        self._cliente_mqtt = cliente

    def _enviar_mqtt(self, comando):
        if not self._cliente_mqtt.is_connected():
            print(f"[ESP32] Sem conexão com o broker MQTT: comando {comando!r} NÃO enviado.")
            return False
        self._cliente_mqtt.publish(self.topico_comandos, comando, qos=1)
        print(f"[ESP32] MQTT -> {comando}  ({self.topico_comandos})")
        return True

    # ==================================================================
    # HTTP
    # ==================================================================
    def _enviar_http(self, comando):
        url = self.url_esp32.rstrip("/") + "/comando"
        try:
            requests.get(url, params={"acao": comando}, timeout=2).raise_for_status()
            print(f"[ESP32] HTTP -> {comando}")
            return True
        except requests.RequestException:
            print(f"[ESP32] ESP32 não respondeu em {url}: comando {comando!r} NÃO enviado.")
            return False

    def _iniciar_http(self):
        porta = self.porta_notebook   # entrada e saída usam portas diferentes
        esp32 = self

        class RecebeSensor(BaseHTTPRequestHandler):
            """Atende /sensor?estado=1 (S1) e /passagem?evento=passou (S2)"""

            def do_GET(self):
                url = urlparse(self.path)
                parametros = parse_qs(url.query)
                if url.path == "/sensor":
                    esp32._atualizar_sensor(parametros.get("estado", [""])[0])
                elif url.path == "/passagem":
                    esp32._registrar_passagem(parametros.get("evento", [""])[0])
                else:
                    self.send_error(404)
                    return
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"ok")

            do_POST = do_GET

            def log_message(self, *_):
                pass  # não poluir o terminal a cada chamada

        try:
            self._servidor_http = ThreadingHTTPServer(("0.0.0.0", porta), RecebeSensor)
        except OSError as erro:
            print(f"[ESP32] Não consegui abrir a porta {porta} para o sensor: {erro}")
            return
        threading.Thread(target=self._servidor_http.serve_forever, daemon=True).start()
        print(f"[ESP32] Aguardando os sensores em http://<IP deste notebook>:{porta} "
              "(/sensor e /passagem)")
