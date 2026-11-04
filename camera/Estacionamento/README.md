# Leitor de Placas com IA — Estacionamento Inteligente

Módulo de **visão computacional** do projeto de estacionamento inteligente.
A câmera identifica o veículo pela placa e o ticket de papel deixa de existir.

```
 câmera ──► detecta a placa ──► lê os caracteres ──► valida/corrige ──► votação
 (webcam      (YOLO)              (OCR)               (regex)           (vários quadros)
  ou RTSP)                                                                 │
                                                       placa confirmada ◄──┘
                                                              │
                                          JSON no terminal + log + foto
                                                              │
                 ENTRADA: avisa o sistema de gestão ──► abre a cancela (ESP32)
                 SAÍDA:   pergunta se pagou ──► pago? abre a cancela : LED vermelho
```

| Situação | O que está pronto |
|---|---|
| **Versão 1** | Webcam, detecção da placa, leitura (Mercosul e antiga), correção de O/0, I/1, B/8..., votação, JSON no log |
| **Integrações** | Sistema de gestão (HTTP, com modo simulado e fila quando a API cai), ESP32 (MQTT ou HTTP), dois sensores ultrassônicos por cancela, código Arduino |
| Versão 2 | Estrutura pronta: tipo do veículo (carro/moto), cor e câmera Intelbras RTSP |

---

## 1. Instalação no Windows (uma vez só)

### Computador novo: instalação completa com dois cliques
1. Copie a pasta do projeto para o computador, **sem** a pasta `.venv`. Prefira
   `C:\Projetos\Estacionamento`, fora do OneDrive.
2. Dê **dois cliques em `instalar_tudo.bat`** e clique em **Sim** quando o Windows pedir
   permissão de administrador. É preciso internet.
3. Ele pergunta se este computador vai gravar os ESP32. Responda **S** só se for usar a
   Arduino IDE nele.

| Passo | O que ele faz |
|---|---|
| 1 | Instala o Python 3.12 (se não houver 3.10 ou mais novo) |
| 2 | Cria o `.venv` e instala as bibliotecas (chama o `instalar.bat`) |
| 3 | Baixa os modelos de IA, para o leitor abrir rápido |
| 4 | Instala o Mosquitto e libera conexões da rede |
| 5 | Libera a porta 1883 no firewall |
| 6 | (opcional) Arduino IDE, placa ESP32 e bibliotecas ESP32Servo e PubSubClient |
| 7 | Cria os atalhos **Estacionamento - ENTRADA** e **- SAIDA** na Área de Trabalho |
| 8 | Confere se tudo ficou funcionando e lista as webcams |
| 9 | (opcional) Abre o assistente de câmera para a entrada e a saída |

Pode rodar de novo quantas vezes quiser: o que já estiver pronto é pulado. O registro fica
em `logs\instalacao.log`. Para ver o que ele faria sem mudar nada:
`instalar_tudo.bat -Simular`.

**A única parte manual é o hotspot.** No fim, o instalador abre a tela do Hotspot móvel do
Windows. Use o **mesmo nome e senha** do `esp32\cancela_entrada\segredos.h`, na banda
**2,4 GHz**, e os ESP32 já gravados conectam sem precisar regravar.

Os passos abaixo (1.1 e 1.2) são a instalação só do leitor, sem administrador. Servem para
quem não vai usar o Mosquitto nem os ESP32.

### 1.1 Instale o Python
1. Baixe o **Python 3.10 ou mais novo** em <https://www.python.org/downloads/>.
2. Na primeira tela do instalador, **marque “Add python.exe to PATH”**.
3. Clique em *Install Now*.

### 1.2 Instale o leitor de placas
1. Copie a pasta do projeto para o computador.
2. Dê **dois cliques em `instalar.bat`**.
3. Espere terminar. Na primeira vez ele baixa cerca de 1 GB (principalmente o PyTorch, usado na versão 2).
   Quando aparecer **“Instalacao concluida!”**, está pronto.

> **Dica:** evite deixar o projeto dentro do OneDrive/Google Drive. A pasta `.venv`
> tem milhares de arquivos e o OneDrive vai tentar sincronizar todos.
> Prefira, por exemplo, `C:\Projetos\Estacionamento`.

<details>
<summary>Instalação manual (sem o .bat), para quem quiser entender os passos</summary>

```bat
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m pip uninstall -y opencv-python-headless
.venv\Scripts\python -m pip install --force-reinstall --no-deps opencv-python==5.0.0.93
```

As duas últimas linhas existem porque as bibliotecas de placa instalam o
`opencv-python-headless` (OpenCV **sem janelas**), que impede a janela de vídeo de abrir.
</details>

---

## 2. Testando passo a passo

### Passo 0 — Escolher a câmera: `configurar_camera.bat`

Dois cliques em **`configurar_camera.bat`**. Ele pergunta qual lado configurar (entrada,
saída ou os dois) e qual câmera usar em cada um:

| Opção | O que o assistente faz |
|---|---|
| **1 – Câmera do notebook** | Procura as câmeras, ignora a infravermelha, mostra a imagem para você confirmar e grava |
| **2 – Webcam externa (USB)** | Igual, mas testa primeiro as câmeras que não são a do notebook |
| **3 – Câmera Wi-Fi (Intelbras/RTSP)** | Pede para você pôr a câmera no hotspot do notebook. Depois procura a câmera na rede, pede usuário e senha, testa os endereços RTSP mais comuns, mostra a imagem e grava |

A **entrada** fica no `config.yaml` e a **saída** no `config_saida.yaml`, criado na primeira
vez. Assim cada atalho tem a sua câmera. Para a câmera Wi-Fi, a busca automática é feita
**só no hotspot do notebook** (`192.168.137.x`). Varrer a rede da escola pode ser bloqueado ou
parecer um ataque, então só acontece se você confirmar. O arquivo de config passa a guardar a
senha da câmera: não o compartilhe.

### Passo 1 — A câmera funciona?

```bat
.venv\Scripts\python ferramentas\testar_camera.py
```

Abre uma janela com o vídeo da webcam, a resolução e os FPS. **Q** ou **ESC** fecha.

Se a imagem não aparecer ou for a câmera errada:

```bat
.venv\Scripts\python ferramentas\testar_camera.py --listar
```

Isso mostra as webcams encontradas. Notebooks com Windows Hello têm uma câmera
**infravermelha** (imagem cinza) que não serve. O `configurar_camera.bat` já escolhe a
**COLORIDA**. Para testar a câmera da saída, use `testar_camera.py --config config_saida.yaml`.

### Passo 2 — Gere uma placa para imprimir

```bat
.venv\Scripts\python ferramentas\gerar_placa_teste.py
```

São criadas na pasta `placas_teste/` três placas **fictícias**:
`BRA2E19` e `RIO1A23` (Mercosul) e `ABC-1234` (antiga). Para gerar outras:

```bat
.venv\Scripts\python ferramentas\gerar_placa_teste.py ABC1D23 XYZ9876
```

Imprima o arquivo `placa_XXXXXXX.png` em escala 100%. Ela sai com 20 cm de largura,
metade do tamanho real, para caber numa folha A4.

### Passo 3 — Teste sem webcam (opcional)

Confere se a IA está funcionando usando uma foto em vez da câmera:

```bat
rodar.bat --imagem placas_teste\cena_BRA2E19.jpg
```

### Passo 4 — Rode com a webcam

Dê **dois cliques em `rodar.bat`** (ou digite `rodar.bat` no terminal).
Segure a placa impressa (ou uma real) de frente para a câmera, a uns 30–60 cm.

O que aparece na janela:

| Na tela | Significado |
|---|---|
| Retângulo **verde** + texto | Placa encontrada e com formato válido: a leitura conta como voto |
| Retângulo **amarelo** | Leu algo, mas o formato é inválido ou a confiança está baixa: não conta |
| `Lendo: BRA2E19 votos 3/5` | A votação em andamento |
| Tarja verde **CONFIRMADA** | A placa apareceu 5 vezes: o evento foi gerado |
| Tarja vermelha | A câmera desconectou e o programa está tentando reconectar |

Quando a placa é confirmada, o terminal mostra o JSON:

```json
{
  "evento": "entrada",
  "placa": "BRA2E19",
  "tipo": null,
  "cor": null,
  "confianca": 0.97,
  "data_hora": "2026-10-28T14:35:00-03:00",
  "camera": "entrada_1",
  "foto": "fotos/20261028_143500_BRA2E19.jpg"
}
```

* O mesmo JSON é acrescentado em **`logs/leituras.jsonl`** (uma linha por leitura).
* O recorte da placa é salvo em **`fotos/`**.
* `tipo` e `cor` ficam `null` na versão 1 e serão preenchidos na versão 2.
* A mesma placa não é registrada de novo durante 20 s (`intervalo_repeticao_s`),
  para o carro parado na cancela não gerar vários eventos.

**Q** ou **ESC** fecham a janela.

---

## 3. Entrada, saída e integrações

### 3.1 Entrada e saída
A mesma câmera e o mesmo programa servem para os dois lados. Cada lado tem o
seu atalho; os dois abrem com dois cliques:

| Atalho | Modo | Nome da câmera (vai no JSON) |
|---|---|---|
| `rodar.bat` | **ENTRADA** (vem de `camera.funcao` no `config.yaml`) | `entrada_1` |
| `rodar_saida.bat` | **SAÍDA** | `saida_1` |

O modo aparece em três lugares, para ninguém confundir as câmeras:
- na **tarja do canto superior direito** do vídeo: azul para ENTRADA e laranja para SAÍDA;
- no **título da janela**, por exemplo `Leitor de placas - SAIDA (saida_1)`;
- na primeira linha do terminal, por exemplo `Câmera 'saida_1' em modo SAIDA`.

| Lado | Quando a placa é confirmada | Se o sistema de gestão estiver fora do ar |
|---|---|---|
| **Entrada** | Envia o JSON ao sistema → `led_verde` + `abrir_cancela` | A cancela **abre** e o evento vai para `logs/pendentes.jsonl`, sendo **reenviado sozinho** quando a API voltar |
| **Saída** | Pergunta se pagou → pago: `led_verde` + `abrir_cancela`; não pago: `led_vermelho` | **Não abre** (`led_vermelho`) e a tela pede para chamar o atendente |

Na saída, o JSON do log ganha os campos `"pago"` e `"valor"`.

### 3.2 Modo simulado (sem a API real)
Com `api.modo_simulado: true` (padrão), nada é enviado pela rede:
* As entradas ficam guardadas em `logs/patio_simulado.json`.
* Na saída, toda placa é considerada **paga**, menos as da lista `placas_nao_pagas`
  (por padrão `RIO1A23`, para você testar a recusa). O valor é `valor_hora` × horas.

### 3.3 Testando com HTTP de verdade (servidor de teste)
O `ferramentas/servidor_teste_api.py` imita o sistema de gestão com as mesmas rotas
do contrato:

1. Em um terminal: `.venv\Scripts\python ferramentas\servidor_teste_api.py`
2. No `config.yaml`: `modo_simulado: false` (a `url_base` já é `http://localhost:3000`).
3. Em outro terminal: `rodar.bat`.
4. Abra <http://localhost:3000> no navegador para ver o pátio e clique em **pagar**
   para liberar a saída (`rodar_saida.bat`).

### 3.4 Contrato com a equipe de sistemas (JavaScript)

| Rota (configurável) | Envio | Resposta esperada |
|---|---|---|
| `POST /api/entrada` | JSON do evento (`evento`, `placa`, `tipo`, `cor`, `confianca`, `data_hora`, `camera`, `foto`) | Qualquer código 2xx |
| `GET /api/pagamento?placa=ABC1D23` (ou `POST` com `{"placa": "ABC1D23"}`, escolha em `metodo_consulta`) | — | `{"placa": "ABC1D23", "pago": true, "valor": 12.50}` |

A cancela só abre se `pago` for exatamente `true`. Exemplo mínimo em Node/Express:

```js
const express = require("express");
const app = express();
app.use(express.json({ limit: "5mb" }));          // 5 MB se a foto vier em base64

app.post("/api/entrada", (req, res) => {
  console.log("Entrada:", req.body.placa);        // gravar no banco aqui
  res.status(201).json({ ok: true });
});

app.get("/api/pagamento", (req, res) => {
  const placa = req.query.placa;
  res.json({ placa, pago: false, valor: 12.5 });  // consultar o banco aqui
});

app.listen(3000);
```

### 3.5 ESP32 (cancela, LEDs e dois sensores ultrassônicos)

**Comandos** que o notebook envia: `abrir_cancela`, `fechar_cancela`, `led_verde`,
`led_vermelho` e `led_apagar`.

**Dois sensores ultrassônicos (HC-SR04) por cancela:**

```
carro -->   [S1 CHEGADA]   ===CANCELA===   [S2 PASSAGEM]   -->
             antes dela                     logo depois dela
```

| Sensor | O ESP32 envia | Tópico MQTT | O notebook faz |
|---|---|---|---|
| **S1 – chegada** | `1` (chegou) / `0` (foi embora) | `.../sensor` | Com `usar_sensor_presenca: true`, só lê placas enquanto o S1 vê veículo. Placa não confirmada em `tempo_max_leitura_s` segundos: evento `"leitura_incerta"`, LED vermelho, tela pede o atendente |
| **S2 – passagem** | `passou` / `passou_extra` | `.../passagem` | Grava o evento `"passagem"` com a placa liberada. `passou_extra` (mais um carro na mesma abertura) vira `"passagem_sem_liberacao"`, com LED vermelho e aviso na tela |

**Quando a cancela fecha:** depois que o carro passou pelo S2 e os **dois** sensores ficaram
livres por 1,5 s. Se ninguém passar em 30 s (o motorista desistiu ou deu ré), ela fecha
também, mas só com os dois sensores livres. Um `fechar_cancela` manual é recusado se algum
sensor vê veículo. Assim a cancela **nunca desce em cima do carro**.

Com `esp32.ativar: false` (padrão), os comandos só aparecem no terminal.

#### Opção A — MQTT (recomendada)
1. Instale o **Mosquitto**: <https://mosquitto.org/download/> (instalador Windows 64 bits).
2. Para o ESP32 conseguir se conectar pela rede, edite
   `C:\Program Files\mosquitto\mosquitto.conf` como administrador e acrescente:
   ```
   listener 1883 0.0.0.0
   allow_anonymous true
   ```
3. No terminal **como administrador**, reinicie o serviço e libere a porta no firewall:
   ```bat
   net stop mosquitto
   net start mosquitto
   netsh advfirewall firewall add rule name="Mosquitto MQTT" dir=in action=allow protocol=TCP localport=1883
   ```
4. No `config.yaml`: `esp32.ativar: true` e `protocolo: mqtt`.

#### Opção B — HTTP (sem broker)
No `config.yaml`, use `esp32.ativar: true` e `protocolo: http`. Em `esp32.http.url_esp32`,
coloque o IP de cada ESP32 (`entrada_1` e `saida_1`); cada um mostra o próprio IP no Monitor
Serial. O sensor da entrada chama o notebook na porta 8090 e o da saída na 8091.
Na primeira execução, o Windows pergunta se o Python pode usar a rede: clique em **Permitir**.

#### Código do ESP32 (um para cada cancela)
Cada cancela tem o **seu ESP32**, com o seu código:

| Pasta | Grave no ESP32 da | Nome | Tópicos MQTT | Porta do sensor (HTTP) |
|---|---|---|---|---|
| `esp32/cancela_entrada/` | **Entrada** | `entrada_1` | `estacionamento/entrada_1/...` | 8090 |
| `esp32/cancela_saida/` | **Saída** | `saida_1` | `estacionamento/saida_1/...` | 8091 |

Os dois códigos são iguais, a não ser pelo bloco **IDENTIFICAÇÃO DESTA CANCELA** no começo.
O nome precisa bater com o do notebook: `rodar.bat` conversa com `entrada_1` e
`rodar_saida.bat` com `saida_1`. Ao ligar, o Monitor Serial mostra `Cancela entrada_1` ou
`Cancela saida_1`.

1. Na Arduino IDE, instale a placa **esp32** (Espressif) e as bibliotecas **ESP32Servo**
   e **PubSubClient**.
2. Coloque o nome e a senha do Wi-Fi no arquivo **`segredos.h`**, na mesma pasta.
   Ele fica separado para o `.ino` poder ser compartilhado sem expor a senha.
   No começo do `.ino`, confira o `IP_NOTEBOOK` e o protocolo (`#define USAR_MQTT`).
   O ESP32 só conecta em redes **2,4 GHz WPA2-Personal**. Redes corporativas
   "Enterprise", com login de usuário, não funcionam.
3. As ligações dos pinos estão no comentário do início do arquivo:
   S1 em TRIG 25 / ECHO 33 e S2 em TRIG 18 / ECHO 19, cada ECHO com divisor de tensão.
   Os dois sensores são lidos **um de cada vez** (a cada 70 ms), para o eco de um não
   confundir o outro. A distância de detecção de cada um é `DISTANCIA_CHEGADA_CM` e
   `DISTANCIA_PASSAGEM_CM` (padrão 50 cm).

#### Sem o hardware: ESP32 simulado
```bat
.venv\Scripts\python ferramentas\simulador_esp32.py
.venv\Scripts\python ferramentas\simulador_esp32.py --camera saida_1
```
A primeira linha simula a cancela da entrada; a segunda, a da saída. O simulador mostra os
comandos recebidos. **ENTER** liga ou desliga o S1, **p + ENTER** simula o carro passando
pelo S2 e **x + ENTER** simula mais um carro passando colado.
No modo HTTP, use `url_esp32` com `"http://localhost:8081"` para a câmera simulada.

---

## 4. Como funciona (para a aula)

### 4.1 Detecção — *onde* está a placa?
Um modelo **YOLO v9** já treinado com placas de vários países (`open-image-models`)
devolve um retângulo em volta de cada placa. Ele roda em formato ONNX, rápido em CPU.
→ `estacionamento/deteccao_placa.py`

### 4.2 OCR — *o que* está escrito?
O recorte da placa vai para o **fast-plate-ocr**, uma rede neural treinada **só com placas**
(inclui Brasil, Mercosul e antiga). Por ser especializada, acerta mais que um OCR genérico
como EasyOCR ou Tesseract.
→ `estacionamento/ocr_placa.py`

### 4.3 Validação e correção por posição
Placa brasileira tem 7 caracteres e o que vai em cada posição é fixo:

```
Mercosul:  L L L N L N N   ABC1D23
Antiga:    L L L N N N N   ABC1234    (L = letra, N = número)
posição:   1 2 3 4 5 6 7
```

Se o OCR lê `A8C1D23`, o `8` está na posição 2, que **só pode ter letra**.
Então ele vira `B`, que é parecido. O mesmo vale para O↔0, I↔1, S↔5, Z↔2, G↔6.
A posição 5 não é corrigida, porque é ali que os dois formatos se diferenciam.
Depois disso, uma **expressão regular (regex)** confirma se é Mercosul ou antiga.
→ `estacionamento/validacao_placa.py` (teste: `.venv\Scripts\python -m estacionamento.validacao_placa`)

### 4.4 Votação
Um quadro isolado pode sair errado (reflexo, borrão). A placa só é confirmada quando a
**mesma leitura** aparece pelo menos **5 vezes nas últimas 10** leituras válidas.
→ `estacionamento/votacao.py`

### 4.5 Desempenho
Cerca de **30 ms por quadro** só com CPU (≈ 30 FPS), medido num Intel Core Ultra 7 258V.
Uma curiosidade técnica está explicada em `deteccao_placa.py → opcoes_onnx()`:
desligar o *spinning* das threads do ONNX Runtime reduziu o tempo de 120 ms para 30 ms.

---

## 5. Configuração (`config.yaml`)

Tudo o que muda entre instalações fica no `config.yaml`, sem mexer no código.
Os principais itens:

| Item | Para que serve |
|---|---|
| `camera.fonte` | `0` = webcam. Para a Intelbras: `"rtsp://admin:SENHA@192.168.1.50:554/cam/realmonitor?channel=1&subtype=0"` |
| `camera.nome` / `camera.funcao` | Nome enviado no JSON e se a câmera é de `entrada` ou `saida` |
| `camera.backend_windows` | `dshow` (padrão) ou `msmf`, se a imagem ficar preta |
| `deteccao_placa.confianca_minima` | Diminua (ex.: 0.30) se a placa não estiver sendo encontrada |
| `ocr.confianca_minima` | Leituras abaixo disso não viram voto |
| `votacao.votos_minimos` | Mais votos = mais seguro, porém mais lento para confirmar |
| `api.*` | Endereço do sistema de gestão (modo simulado por padrão) |
| `esp32.*` | Comunicação com o ESP32 (MQTT ou HTTP) |

**Entrada e saída com câmeras diferentes:** a saída usa o `config_saida.yaml` quando ele
existe. O `configurar_camera.bat` cria esse arquivo. Sem ele, a saída usa o `config.yaml`. O
`rodar_saida.bat` escolhe sozinho, e a primeira linha do terminal mostra qual arquivo está em uso.

---

## 6. Problemas comuns

| Problema | Solução |
|---|---|
| `Não foi possível abrir a câmera` | Feche Teams, Zoom ou o navegador, que podem estar usando a webcam. Confira o índice com `testar_camera.py --listar` |
| A janela não abre, erro com `imshow` | Rode o `instalar.bat` de novo (ele corrige o OpenCV sem janelas) |
| Imagem preta | Troque `backend_windows: dshow` por `msmf` |
| Retângulo não aparece | Aproxime a placa, melhore a iluminação e evite reflexo. Teste `confianca_minima: 0.30` |
| Retângulo amarelo e leitura errada | Placa inclinada ou desfocada. Segure-a parada e de frente por 1 segundo |
| Primeira execução demorada | Os modelos (~20 MB) são baixados uma única vez da internet |
| `[API] FALHA ... servidor fora do ar` | Confira `api.url_base` e se o servidor está rodando. As entradas ficam em `logs/pendentes.jsonl` e são reenviadas sozinhas |
| `Broker MQTT não encontrado` | O Mosquitto não está rodando. Abra `services.msc` e inicie o serviço “Mosquitto Broker” |
| ESP32 não conecta no Mosquitto | Faltou `listener 1883 0.0.0.0` / `allow_anonymous true` no `mosquitto.conf`, ou a regra do firewall |
| Nunca lê placa com sensor ligado | Confira se os tópicos (MQTT) ou o IP e a porta (HTTP) são iguais no `config.yaml` e no `.ino` |

---

## 7. Estrutura do projeto

```
Estacionamento/
├── main.py                    programa principal
├── config.yaml                todas as configurações
├── requirements.txt           bibliotecas (versões testadas)
├── instalar_tudo.bat          computador novo: instala TUDO (Python, Mosquitto, firewall, atalhos)
├── instalar.bat               instala só as bibliotecas do leitor (.venv)
├── configurar_camera.bat      assistente: câmera do notebook, USB ou Wi-Fi (entrada e saída)
├── rodar.bat / rodar_saida.bat   câmera de ENTRADA / de SAÍDA (dois cliques)
├── config_saida.yaml          (criado pelo assistente) configuração só da SAÍDA
├── estacionamento/
│   ├── captura.py             webcam/RTSP com reconexão automática
│   ├── deteccao_placa.py      YOLO: onde está a placa
│   ├── ocr_placa.py           leitura dos caracteres
│   ├── validacao_placa.py     regex + correção por posição
│   ├── votacao.py             confirmação em vários quadros
│   ├── registro.py            JSON, log e fotos
│   ├── deteccao_veiculo.py    (V2) carro/moto
│   ├── cor_veiculo.py         (V2) cor predominante
│   ├── integracao_api.py      sistema de gestão + modo simulado
│   └── integracao_esp32.py    cancela, LEDs e sensor de presença
├── ferramentas/
│   ├── testar_camera.py       teste e listagem de webcams
│   ├── gerar_placa_teste.py   gera placas fictícias para imprimir
│   ├── instalar_tudo.ps1      o passo a passo do instalar_tudo.bat
│   ├── configurar_camera.py   o assistente do configurar_camera.bat
│   ├── servidor_teste_api.py  sistema de gestão falso (referência do contrato)
│   └── simulador_esp32.py     ESP32 falso (comandos + sensores S1 e S2 pelo teclado)
├── esp32/
│   ├── cancela_entrada/       ESP32 da ENTRADA (.ino + segredos.h)
│   └── cancela_saida/         ESP32 da SAÍDA   (.ino + segredos.h)
├── logs/                      leituras.jsonl, pendentes.jsonl, patio_simulado.json
├── fotos/   modelos/  placas_teste/
```

---

## 8. Treinar um detector de placas próprio (opcional)

O detector pronto funciona bem. Para um projeto de turma, porém, dá para treinar um YOLO
com fotos do próprio estacionamento:

1. Tire de 200 a 500 fotos de carros na entrada, com variação de luz, horário e ângulo.
2. Marque as placas com o **Roboflow** (<https://roboflow.com>) ou o **Label Studio**,
   exportando no formato **YOLO**. Também há bases públicas de placas brasileiras no
   Roboflow Universe.
3. Treine (de preferência no Google Colab, com GPU grátis):
   ```bash
   yolo detect train data=dados.yaml model=yolo11n.pt epochs=100 imgsz=640
   ```
4. Copie o `best.pt` gerado para `modelos/placa.pt` e, no `config.yaml`, use:
   ```yaml
   deteccao_placa:
     motor: yolo
     modelo_yolo: modelos/placa.pt
   ```
