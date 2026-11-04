/*
 * ====================================================================
 *  ESTACIONAMENTO INTELIGENTE - ESP32 da cancela de ENTRADA
 *  (a outra cancela usa a pasta cancela_saida; os dois códigos só
 *   diferem no bloco IDENTIFICAÇÃO DESTA CANCELA)
 * ====================================================================
 *  Recebe comandos do notebook (leitor de placas):
 *      "abrir_cancela", "fechar_cancela", "led_verde", "led_vermelho", "led_apagar"
 *
 *  Usa DOIS sensores ultrassônicos (HC-SR04):
 *
 *      carro -->   [S1 CHEGADA]   ===CANCELA===   [S2 PASSAGEM]   -->
 *                   antes dela                     logo depois dela
 *
 *    S1 avisa que um veículo chegou ("1") ou foi embora ("0"):
 *       é o sinal para o notebook ler a placa.
 *    S2 avisa que o veículo PASSOU pela cancela ("passou"):
 *       só então a cancela fecha. Assim ela nunca desce em cima do carro.
 *
 *  Regra de fechamento:
 *    - depois que o carro passou pelo S2, espera os DOIS sensores ficarem
 *      livres por 1,5 s e fecha;
 *    - se ninguém passar em 30 s (o motorista desistiu ou deu ré), fecha
 *      também, mas só com os dois sensores livres;
 *    - "fechar_cancela" manual é recusado se algum sensor vê veículo.
 *
 *  Escolha o protocolo abaixo (MQTT ou HTTP) - deve ser o mesmo do
 *  config.yaml do notebook (esp32.protocolo).
 *
 *  Bibliotecas (Arduino IDE -> Ferramentas -> Gerenciar Bibliotecas):
 *      - ESP32Servo     (Kevin Harrington)       -> servo da cancela
 *      - PubSubClient   (Nick O'Leary)           -> só para MQTT
 *  Placa: "ESP32 Dev Module" (pacote esp32 da Espressif)
 *
 *  Ligações:
 *      Servo (sinal) ............ GPIO 13 (servo no 5 V externo, GND comum)
 *      LED verde ................ GPIO 26 (com resistor de 220 ohm)
 *      LED vermelho ............. GPIO 27 (com resistor de 220 ohm)
 *      S1 chegada:  TRIG GPIO 25, ECHO GPIO 33
 *      S2 passagem: TRIG GPIO 18, ECHO GPIO 19
 *      ATENÇÃO: o ECHO do HC-SR04 sai com 5 V. Use um divisor de tensão
 *      (1 kohm + 2,2 kohm) em CADA ECHO, senão o pino do ESP32 pode queimar.
 * ====================================================================
 */

#include <WiFi.h>
#include <ESP32Servo.h>

// ----------------------- ESCOLHA O PROTOCOLO ------------------------
#define USAR_MQTT          // comente esta linha para usar HTTP

// ----------------------- CONFIGURAÇÕES ------------------------------
// Nome e senha do Wi-Fi ficam no arquivo segredos.h (mesma pasta),
// para o código poder ser compartilhado sem expor a senha.
#include "segredos.h"

// IP do notebook NA MESMA REDE do ESP32 (onde rodam o Mosquitto e o leitor).
// Usando o HOTSPOT DO PRÓPRIO NOTEBOOK (Windows), o notebook é sempre
// 192.168.137.1 - esse IP não muda. (Em outra rede, confira com o ipconfig.)
const char* IP_NOTEBOOK = "192.168.137.1";

// ------------------ IDENTIFICAÇÃO DESTA CANCELA --------------------
// É a ÚNICA parte diferente entre cancela_entrada e cancela_saida.
// Tem que ser igual ao nome da câmera no notebook:
//     rodar.bat -> entrada_1          rodar_saida.bat -> saida_1
#define NOME_CANCELA "entrada_1"

#ifdef USAR_MQTT
  const int   MQTT_PORTA       = 1883;
  // config.yaml: "estacionamento/{camera}/comando", ".../sensor" e ".../passagem"
  const char* TOPICO_COMANDOS  = "estacionamento/" NOME_CANCELA "/comando";
  const char* TOPICO_SENSOR    = "estacionamento/" NOME_CANCELA "/sensor";
  const char* TOPICO_PASSAGEM  = "estacionamento/" NOME_CANCELA "/passagem";
#else
  // config.yaml: esp32.http.porta_notebook -> entrada_1: 8090
  const int   PORTA_NOTEBOOK   = 8090;
#endif

const int PINO_SERVO          = 13;
const int PINO_LED_VERDE      = 26;
const int PINO_LED_VERM       = 27;
const int PINO_TRIG_CHEGADA   = 25;
const int PINO_ECHO_CHEGADA   = 33;
const int PINO_TRIG_PASSAGEM  = 18;
const int PINO_ECHO_PASSAGEM  = 19;

const int ANGULO_FECHADA  = 0;      // ajuste conforme a montagem do servo
const int ANGULO_ABERTA   = 90;

const int DISTANCIA_CHEGADA_CM   = 50;   // abaixo disso = veículo na frente do S1
const int DISTANCIA_PASSAGEM_CM  = 50;   // abaixo disso = veículo na frente do S2
const unsigned long TEMPO_FECHAR_DEPOIS_DE_PASSAR_MS = 1500;
const unsigned long TEMPO_MAX_ABERTA_MS  = 30000;  // ninguém passou: fecha (com sensores livres)
const unsigned long TEMPO_LED_MS         = 5000;   // LED apaga sozinho depois disso
const unsigned long INTERVALO_LEITURA_MS = 70;     // um sensor por vez (ver lerSensores)
const unsigned long TEMPO_CONFIRMAR_MS   = 300;    // "debounce" de cada sensor

// ----------------------- SENSORES -----------------------------------
struct Sensor {
  const char* nome;
  int trig;
  int echo;
  int distanciaCm;
  bool presente;               // estado confirmado (depois do debounce)
  bool leituraAnterior;
  unsigned long momentoMudanca;
};

Sensor chegada  = {"S1 chegada",  PINO_TRIG_CHEGADA,  PINO_ECHO_CHEGADA,  DISTANCIA_CHEGADA_CM,  false, false, 0};
Sensor passagem = {"S2 passagem", PINO_TRIG_PASSAGEM, PINO_ECHO_PASSAGEM, DISTANCIA_PASSAGEM_CM, false, false, 0};

// ----------------------- VARIÁVEIS DA CANCELA -----------------------
Servo cancela;
bool cancelaAberta = false;
unsigned long momentoAbriu = 0;
unsigned long momentoPassou = 0;   // 0 = ainda ninguém passou nesta abertura
bool veiculoNaPassagem = false;    // S2 viu o veículo depois que a cancela abriu
int passagensNestaAbertura = 0;
unsigned long momentoLed = 0;

#ifdef USAR_MQTT
  #include <PubSubClient.h>
  WiFiClient wifiCliente;
  PubSubClient mqtt(wifiCliente);
#else
  #include <WebServer.h>
  #include <HTTPClient.h>
  WebServer servidor(80);   // o notebook chama http://IP_DO_ESP32/comando?acao=...
#endif

// ====================================================================
//  AVISOS PARA O NOTEBOOK
// ====================================================================
#ifndef USAR_MQTT
void chamarNotebook(String caminho) {
  HTTPClient http;
  http.begin(String("http://") + IP_NOTEBOOK + ":" + PORTA_NOTEBOOK + caminho);
  http.setTimeout(2000);
  int codigo = http.GET();
  if (codigo != 200) {
    Serial.print("Notebook nao respondeu (codigo ");
    Serial.print(codigo);
    Serial.println(")");
  }
  http.end();
}
#endif

// S1: "1" = veículo chegou, "0" = foi embora (o notebook lê a placa com "1")
void avisarChegada(bool presente) {
  const char* estado = presente ? "1" : "0";
#ifdef USAR_MQTT
  mqtt.publish(TOPICO_SENSOR, estado);
#else
  chamarNotebook(String("/sensor?estado=") + estado);
#endif
  Serial.println(presente ? "S1: veiculo CHEGOU" : "S1: veiculo FOI EMBORA");
}

// S2: "passou" = o veículo liberado atravessou a cancela
//     "passou_extra" = mais um veículo passou na mesma abertura (carro colado)
void avisarPassagem(const char* evento) {
#ifdef USAR_MQTT
  mqtt.publish(TOPICO_PASSAGEM, evento);
#else
  chamarNotebook(String("/passagem?evento=") + evento);
#endif
  Serial.print("S2: ");
  Serial.println(evento);
}

// ====================================================================
//  AÇÕES
// ====================================================================
bool algumSensorOcupado() {
  return chegada.presente || passagem.presente;
}

void abrirCancela() {
  cancela.write(ANGULO_ABERTA);
  cancelaAberta = true;
  momentoAbriu = millis();
  momentoPassou = 0;
  veiculoNaPassagem = false;
  passagensNestaAbertura = 0;   // nova liberação: a próxima passagem é "passou"
  Serial.println("Cancela ABERTA");
}

void fecharCancela() {
  cancela.write(ANGULO_FECHADA);
  cancelaAberta = false;
  Serial.println("Cancela FECHADA");
}

void acenderLed(bool verde, bool vermelho) {
  digitalWrite(PINO_LED_VERDE, verde ? HIGH : LOW);
  digitalWrite(PINO_LED_VERM, vermelho ? HIGH : LOW);
  momentoLed = millis();
}

void executarComando(String comando) {
  comando.trim();
  Serial.print("Comando recebido: ");
  Serial.println(comando);

  if (comando == "abrir_cancela") {
    abrirCancela();
  } else if (comando == "fechar_cancela") {
    if (algumSensorOcupado()) Serial.println("  -> RECUSADO: ha veiculo perto da cancela");
    else fecharCancela();
  }
  else if (comando == "led_verde")      acenderLed(true, false);
  else if (comando == "led_vermelho")   acenderLed(false, true);
  else if (comando == "led_apagar")     acenderLed(false, false);
  else Serial.println("  -> comando desconhecido");
}

// ====================================================================
//  LEITURA DOS SENSORES
// ====================================================================
// Distância em cm, ou -1 se não voltou eco (nada na frente)
float medirDistanciaCm(int trig, int echo) {
  digitalWrite(trig, LOW);  delayMicroseconds(2);
  digitalWrite(trig, HIGH); delayMicroseconds(10);
  digitalWrite(trig, LOW);
  long duracao = pulseIn(echo, HIGH, 30000);   // espera no máximo 30 ms
  if (duracao == 0) return -1;
  return duracao * 0.0343 / 2;                 // velocidade do som, ida e volta
}

// Lê um sensor e aplica o "debounce": a mudança só vale se durar 300 ms.
// Retorna true quando o estado confirmado mudou.
bool atualizarSensor(Sensor &s) {
  float d = medirDistanciaCm(s.trig, s.echo);
  bool leitura = (d > 0 && d < s.distanciaCm);
  if (leitura != s.leituraAnterior) {
    s.leituraAnterior = leitura;
    s.momentoMudanca = millis();
  }
  if (leitura != s.presente && millis() - s.momentoMudanca > TEMPO_CONFIRMAR_MS) {
    s.presente = leitura;
    return true;
  }
  return false;
}

// Os dois HC-SR04 NÃO disparam juntos: o eco de um pode chegar no outro.
// A cada 70 ms lemos só um deles, alternando.
void lerSensores() {
  static unsigned long ultimaLeitura = 0;
  static bool vezDaChegada = true;
  if (millis() - ultimaLeitura < INTERVALO_LEITURA_MS) return;
  ultimaLeitura = millis();

  if (vezDaChegada) {
    if (atualizarSensor(chegada)) avisarChegada(chegada.presente);
  } else {
    if (atualizarSensor(passagem)) {
      Serial.println(passagem.presente ? "S2: veiculo NA PASSAGEM" : "S2: passagem livre");
      // O veículo acabou de SAIR da frente do S2 com a cancela aberta: passou
      if (!passagem.presente && cancelaAberta && veiculoNaPassagem) {
        passagensNestaAbertura++;
        avisarPassagem(passagensNestaAbertura == 1 ? "passou" : "passou_extra");
        momentoPassou = millis();
        veiculoNaPassagem = false;
      }
      if (passagem.presente && cancelaAberta) veiculoNaPassagem = true;
    }
  }
  vezDaChegada = !vezDaChegada;
}

// ====================================================================
//  QUANDO FECHAR A CANCELA
// ====================================================================
void controlarCancela() {
  if (!cancelaAberta || algumSensorOcupado()) return;   // nunca fecha com veículo perto

  // O veículo passou e os dois sensores estão livres há 1,5 s: fecha
  if (momentoPassou && millis() - momentoPassou > TEMPO_FECHAR_DEPOIS_DE_PASSAR_MS) {
    fecharCancela();
    return;
  }
  // Abriu, mas ninguém passou em 30 s (desistiu ou deu ré): fecha
  if (!momentoPassou && millis() - momentoAbriu > TEMPO_MAX_ABERTA_MS) {
    Serial.println("Ninguem passou em 30 s");
    fecharCancela();
  }
}

// ====================================================================
//  REDE
// ====================================================================
void conectarWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Conectando ao Wi-Fi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_NOME, WIFI_SENHA);
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("\nWi-Fi OK. IP do ESP32: ");
    Serial.println(WiFi.localIP());   // use este IP no config.yaml (modo HTTP)
  } else {
    Serial.println("\nFalha no Wi-Fi, tentando de novo depois...");
  }
}

#ifdef USAR_MQTT
void aoReceberMqtt(char* topico, byte* conteudo, unsigned int tamanho) {
  String comando;
  for (unsigned int i = 0; i < tamanho; i++) comando += (char)conteudo[i];
  executarComando(comando);
}

void conectarMqtt() {
  static unsigned long ultimaTentativa = 0;
  if (mqtt.connected() || millis() - ultimaTentativa < 3000) return;
  ultimaTentativa = millis();   // tenta a cada 3 s sem travar o loop
  Serial.print("Conectando ao broker MQTT... ");
  String id = String("esp32-") + NOME_CANCELA + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  if (mqtt.connect(id.c_str())) {
    Serial.println("OK");
    mqtt.subscribe(TOPICO_COMANDOS);
  } else {
    Serial.print("falhou, estado = ");
    Serial.println(mqtt.state());
  }
}
#else
void rotaComando() {
  if (!servidor.hasArg("acao")) {
    servidor.send(400, "text/plain", "faltou ?acao=");
    return;
  }
  executarComando(servidor.arg("acao"));
  servidor.send(200, "text/plain", "ok");
}
#endif

// ====================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("Cancela " NOME_CANCELA);
  pinMode(PINO_LED_VERDE, OUTPUT);
  pinMode(PINO_LED_VERM, OUTPUT);
  pinMode(PINO_TRIG_CHEGADA, OUTPUT);
  pinMode(PINO_ECHO_CHEGADA, INPUT);
  pinMode(PINO_TRIG_PASSAGEM, OUTPUT);
  pinMode(PINO_ECHO_PASSAGEM, INPUT);

  cancela.attach(PINO_SERVO);
  fecharCancela();
  acenderLed(false, false);

  conectarWifi();
#ifdef USAR_MQTT
  mqtt.setServer(IP_NOTEBOOK, MQTT_PORTA);
  mqtt.setCallback(aoReceberMqtt);
#else
  servidor.on("/comando", rotaComando);
  servidor.begin();
#endif
}

void loop() {
  conectarWifi();
#ifdef USAR_MQTT
  conectarMqtt();
  mqtt.loop();
#else
  servidor.handleClient();
#endif

  lerSensores();
  controlarCancela();

  // Apaga os LEDs depois de alguns segundos
  if (momentoLed && millis() - momentoLed > TEMPO_LED_MS) {
    acenderLed(false, false);
    momentoLed = 0;
  }
}
