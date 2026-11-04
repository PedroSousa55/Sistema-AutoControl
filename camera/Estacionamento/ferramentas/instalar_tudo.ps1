<#
  instalar_tudo.ps1 - Prepara um computador NOVO para rodar o estacionamento.

  Quem chama é o instalar_tudo.bat (dois cliques). Ele pede permissão de
  administrador uma vez e faz, em ordem:

    1. Python 3.12 ............ instala se não houver Python 3.10+
    2. Bibliotecas ............ cria o .venv e roda o requirements.txt (instalar.bat)
    3. Modelos de IA .......... baixa agora, para o leitor abrir rápido depois
    4. Mosquitto (MQTT) ....... instala e libera conexões da rede
    5. Firewall ............... libera a porta 1883 para os ESP32
    6. Arduino IDE (opcional) . IDE + placa ESP32 + bibliotecas ESP32Servo e PubSubClient
    7. Atalhos ................ "Estacionamento - ENTRADA" e "- SAIDA" na Área de Trabalho
    8. Verificação ............ confere se cada parte ficou funcionando
    9. Câmeras (opcional) ..... chama o assistente configurar_camera (notebook, USB ou Wi-Fi)

  Pode rodar de novo quantas vezes quiser: o que já estiver pronto é pulado.

  Opções (para quem rodar pelo terminal):
    -Simular      só mostra o que seria feito, sem mudar nada
    -ComArduino   instala a Arduino IDE sem perguntar
    -SemArduino   não instala a Arduino IDE e não pergunta
    -SemCamera    não pergunta sobre as câmeras no final
#>
param(
    [switch]$Simular,
    [switch]$ComArduino,
    [switch]$SemArduino,
    [switch]$SemCamera,
    [switch]$Elevado      # uso interno: já estamos na janela de administrador
)

$ErrorActionPreference = "Stop"
$Raiz = Split-Path -Parent $PSScriptRoot
Set-Location $Raiz
$Problemas = New-Object System.Collections.Generic.List[string]

# ---------------------------------------------------------------------
# Mensagens na tela
# ---------------------------------------------------------------------
function Passo($numero, $texto) { Write-Host ""; Write-Host "[$numero/9] $texto" -ForegroundColor Cyan }
function Feito($texto)  { Write-Host "    OK    $texto" -ForegroundColor Green }
function Pular($texto)  { Write-Host "    --    $texto (ja estava pronto)" -ForegroundColor DarkGray }
function Aviso($texto)  { Write-Host "    !!    $texto" -ForegroundColor Yellow; $Problemas.Add($texto) }

# No modo -Simular, mostra o comando em vez de executar
function Executar($descricao, [scriptblock]$acao) {
    if ($Simular) {
        Write-Host "    (simulacao) $descricao" -ForegroundColor Magenta
        return
    }
    Write-Host "    ...   $descricao"
    & $acao
}

function Atualizar-Path {
    # Programas recém-instalados só aparecem no PATH de janelas novas;
    # isto recarrega o PATH nesta mesma janela.
    $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [Environment]::GetEnvironmentVariable("Path", "User")
}

function Versao-Python {
    # Devolve a versão do Python (ex.: 3.12) ou $null se não houver
    foreach ($cmd in @("py -3", "python")) {
        try {
            $saida = cmd /c "$cmd --version 2>&1"
            if ($saida -match "Python (\d+)\.(\d+)") {
                return [version]"$($Matches[1]).$($Matches[2])"
            }
        } catch { }
    }
    return $null
}

function Tem-Winget {
    return [bool](Get-Command winget -ErrorAction SilentlyContinue)
}

function Instalar-Winget($id, $nome) {
    if (-not (Tem-Winget)) {
        Aviso "winget nao encontrado: instale o '$nome' manualmente."
        return
    }
    Executar "winget install $id" {
        winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements
    }
}

# ---------------------------------------------------------------------
# 0. Permissão de administrador (Mosquitto e firewall precisam)
# ---------------------------------------------------------------------
$EhAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $EhAdmin -and -not $Simular) {
    Write-Host "Pedindo permissao de administrador (clique em SIM na janela do Windows)..."
    $argumentos = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Elevado"
    if ($ComArduino) { $argumentos += " -ComArduino" }
    if ($SemArduino) { $argumentos += " -SemArduino" }
    if ($SemCamera) { $argumentos += " -SemCamera" }
    try {
        Start-Process powershell.exe -Verb RunAs -ArgumentList $argumentos -Wait
    } catch {
        Write-Host "Sem permissao de administrador a instalacao nao pode continuar." -ForegroundColor Red
        exit 1
    }
    exit 0
}

if (-not $Simular) {
    New-Item -ItemType Directory -Force (Join-Path $Raiz "logs") | Out-Null
    Start-Transcript -Path (Join-Path $Raiz "logs\instalacao.log") -Append | Out-Null
}

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Estacionamento Inteligente - instalacao completa"     -ForegroundColor Cyan
Write-Host " Pasta: $Raiz"
if ($Simular) { Write-Host " MODO SIMULACAO: nada sera alterado" -ForegroundColor Magenta }
Write-Host "=====================================================" -ForegroundColor Cyan

if ($Raiz -match "OneDrive|Google Drive|Dropbox") {
    Aviso "A pasta esta dentro de um servico de nuvem. O .venv tem milhares de arquivos; prefira algo como C:\Projetos\Estacionamento."
}

# ---------------------------------------------------------------------
# 1. Python
# ---------------------------------------------------------------------
Passo 1 "Python 3.10 ou mais novo"
$versao = Versao-Python
if ($versao -and $versao -ge [version]"3.10") {
    Pular "Python $versao"
} else {
    Instalar-Winget "Python.Python.3.12" "Python 3.12"
    Atualizar-Path
    if (-not $Simular) {
        $versao = Versao-Python
        if ($versao) { Feito "Python $versao instalado" } else { Aviso "Python nao ficou disponivel. Instale em python.org marcando 'Add python.exe to PATH'." }
    }
}

# ---------------------------------------------------------------------
# 2. Bibliotecas do leitor (.venv + requirements.txt)
# ---------------------------------------------------------------------
Passo 2 "Bibliotecas do leitor de placas (pode levar varios minutos)"
Executar "instalar.bat /auto (cria o .venv e instala o requirements.txt)" {
    cmd /c "`"$Raiz\instalar.bat`" /auto"
    if ($LASTEXITCODE -ne 0) { Aviso "instalar.bat terminou com erro (veja as mensagens acima)." }
    else { Feito "bibliotecas instaladas" }
}

# ---------------------------------------------------------------------
# 3. Modelos de IA (baixa agora, enquanto tem internet)
# ---------------------------------------------------------------------
Passo 3 "Modelos de IA (deteccao de placa e OCR)"
$python = Join-Path $Raiz ".venv\Scripts\python.exe"
Executar "baixar e testar os modelos" {
    $teste = "import yaml; from estacionamento.deteccao_placa import DetectorPlaca; " +
             "from estacionamento.ocr_placa import LeitorOCR; " +
             "c = yaml.safe_load(open('config.yaml', encoding='utf-8')); " +
             "DetectorPlaca(c['deteccao_placa']); LeitorOCR(c['ocr']); print('modelos ok')"

    # O Python escreve avisos/logs no stderr mesmo quando esta tudo certo.
    # Com "Stop", o PowerShell abortaria. Relaxamos so nesta linha.
    $antes = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $saida = & $python -c $teste 2>&1 | Out-String
    } finally {
        $ErrorActionPreference = $antes
    }

    if ($saida -match "modelos ok") { Feito "modelos baixados" } else { Aviso "falha ao carregar os modelos: $($saida.Trim())" }
}
# ---------------------------------------------------------------------
# 4. Mosquitto (broker MQTT entre o notebook e os ESP32)
# ---------------------------------------------------------------------
Passo 4 "Mosquitto (MQTT)"
$pastaMosquitto = "C:\Program Files\mosquitto"
$conf = Join-Path $pastaMosquitto "mosquitto.conf"
if (Test-Path (Join-Path $pastaMosquitto "mosquitto.exe")) {
    Pular "Mosquitto instalado"
} else {
    Instalar-Winget "EclipseFoundation.Mosquitto" "Mosquitto"
}

if ((Test-Path $conf) -and (Select-String -Path $conf -Pattern '^listener 1883' -Quiet)) {
    Pular "Mosquitto aceitando conexoes da rede"
} else {
    Executar "liberar conexoes da rede no mosquitto.conf (copia em mosquitto.conf.original)" {
        if (-not (Test-Path "$conf.original")) { Copy-Item $conf "$conf.original" }
        Add-Content -Path $conf -Encoding ascii -Value @(
            "",
            "# --- Estacionamento inteligente: aceitar os ESP32 pela rede ---",
            "listener 1883",
            "allow_anonymous true"
        )
        Feito "mosquitto.conf atualizado"
    }
}
Executar "deixar o servico iniciando com o Windows e reiniciar" {
    Set-Service mosquitto -StartupType Automatic
    Restart-Service mosquitto
    Feito "servico Mosquitto rodando"
}

# ---------------------------------------------------------------------
# 5. Firewall (sem isso o ESP32 não alcança o Mosquitto)
# ---------------------------------------------------------------------
Passo 5 "Firewall: porta 1883 (MQTT)"
if (Get-NetFirewallRule -DisplayName "Mosquitto MQTT" -ErrorAction SilentlyContinue) {
    Pular "regra 'Mosquitto MQTT'"
} else {
    Executar "criar regra de entrada TCP 1883" {
        New-NetFirewallRule -DisplayName "Mosquitto MQTT" -Direction Inbound -Protocol TCP `
            -LocalPort 1883 -Action Allow -Profile Any | Out-Null
        Feito "porta 1883 liberada"
    }
}

# ---------------------------------------------------------------------
# 6. Arduino IDE (só no computador que vai GRAVAR os ESP32)
# ---------------------------------------------------------------------
Passo 6 "Arduino IDE para programar os ESP32 (opcional)"
$instalarArduino = $ComArduino
if (-not $ComArduino -and -not $SemArduino -and -not $Simular) {
    $resposta = Read-Host "    Este computador vai gravar os ESP32? (S/N)"
    $instalarArduino = $resposta -match '^[sS]'
}
if (-not $instalarArduino) {
    Write-Host "    --    pulado (rode de novo com -ComArduino se precisar)" -ForegroundColor DarkGray
} else {
    $cli = Join-Path $env:LOCALAPPDATA "Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
    if (Test-Path $cli) { Pular "Arduino IDE instalada" } else { Instalar-Winget "ArduinoSA.IDE.stable" "Arduino IDE" }
    Executar "placa ESP32 (Espressif) e bibliotecas ESP32Servo e PubSubClient" {
        if (-not (Test-Path $cli)) { Aviso "arduino-cli nao encontrado; abra a Arduino IDE uma vez e rode de novo."; return }
        $url = "https://espressif.github.io/arduino-esp32/package_esp32_index.json"
        & $cli core update-index --additional-urls $url
        & $cli core install esp32:esp32 --additional-urls $url
        & $cli lib install ESP32Servo PubSubClient
        Feito "Arduino pronto para os ESP32"
    }
}

# ---------------------------------------------------------------------
# 7. Atalhos na Área de Trabalho
# ---------------------------------------------------------------------
Passo 7 "Atalhos na Area de Trabalho"
$desktop = [Environment]::GetFolderPath("Desktop")
foreach ($item in @(@("Estacionamento - ENTRADA", "rodar.bat"), @("Estacionamento - SAIDA", "rodar_saida.bat"))) {
    $atalho = Join-Path $desktop "$($item[0]).lnk"
    if (Test-Path $atalho) { Pular $item[0]; continue }
    Executar "criar atalho '$($item[0])'" {
        $shell = New-Object -ComObject WScript.Shell
        $lnk = $shell.CreateShortcut($atalho)
        $lnk.TargetPath = Join-Path $Raiz $item[1]
        $lnk.WorkingDirectory = $Raiz
        $lnk.Save()
        Feito $item[0]
    }
}

# ---------------------------------------------------------------------
# 8. Verificação final
# ---------------------------------------------------------------------
Passo 8 "Verificacao final"
if (Test-Path $python) {
    $gui = & $python -c "import cv2; print('WIN32UI' in cv2.getBuildInformation())" 2>$null
    if ($gui -eq "True") { Feito "OpenCV com janela de video" } else { Aviso "OpenCV sem janelas: rode o instalar.bat de novo." }
    Write-Host "    Webcams encontradas:"
    & $python (Join-Path $Raiz "ferramentas\testar_camera.py") --listar 2>$null | Select-Object -Skip 1 | ForEach-Object { Write-Host "      $_" }
} else {
    Aviso ".venv nao encontrado: as bibliotecas nao foram instaladas."
}
if (Get-NetTCPConnection -State Listen -LocalPort 1883 -LocalAddress 0.0.0.0 -ErrorAction SilentlyContinue) {
    Feito "Mosquitto escutando a rede na porta 1883"
} else {
    Aviso "Mosquitto nao esta escutando a rede na porta 1883."
}
if (-not (Get-NetFirewallRule -DisplayName "Mosquitto MQTT" -ErrorAction SilentlyContinue)) {
    Aviso "regra de firewall 'Mosquitto MQTT' nao encontrada."
}

# ---------------------------------------------------------------------
# Resumo + o que não dá para automatizar
# ---------------------------------------------------------------------
$rede = "BRUNOPC"
$segredos = Join-Path $Raiz "esp32\cancela_entrada\segredos.h"
if ((Test-Path $segredos) -and ((Get-Content $segredos -Raw -Encoding UTF8) -match 'WIFI_NOME\s*=\s*"([^"]+)"')) { $rede = $Matches[1] }

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
if ($Problemas.Count -eq 0) {
    Write-Host " Tudo pronto!" -ForegroundColor Green
} else {
    Write-Host " Terminou com $($Problemas.Count) aviso(s):" -ForegroundColor Yellow
    foreach ($p in $Problemas) { Write-Host "   - $p" -ForegroundColor Yellow }
}
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Falta so uma coisa, feita a mao (o Windows nao deixa automatizar com seguranca):"
Write-Host "  Ligue o HOTSPOT MOVEL deste computador com o MESMO nome e senha"
Write-Host "  que estao no esp32\cancela_entrada\segredos.h (rede: $rede), banda 2,4 GHz."
Write-Host "  Assim os ESP32 ja gravados conectam sem precisar regravar."
if (-not $Simular) { Start-Process "ms-settings:network-mobilehotspot" }

# ---------------------------------------------------------------------
# 9. Câmeras (depois do hotspot: a câmera Wi-Fi precisa dele ligado)
# ---------------------------------------------------------------------
Passo 9 "Cameras da entrada e da saida (opcional)"
if ($SemCamera) {
    Write-Host "    --    pulado (rode o configurar_camera.bat quando quiser)" -ForegroundColor DarkGray
} elseif ($Simular) {
    Write-Host "    (simulacao) perguntar se quer configurar as cameras agora (configurar_camera.bat)" -ForegroundColor Magenta
} elseif (-not (Test-Path $python)) {
    Aviso "sem o .venv nao da para configurar as cameras."
} else {
    Write-Host "    Camera do notebook, webcam externa (USB) ou camera Wi-Fi (Intelbras)."
    Write-Host "    Para a camera Wi-Fi, ligue antes o hotspot (a tela ja foi aberta)."
    $resposta = Read-Host "    Configurar as cameras agora? (S/N)"
    if ($resposta -match '^[sS]') {
        & $python (Join-Path $Raiz "ferramentas\configurar_camera.py")
    } else {
        Write-Host "    --    pulado (rode o configurar_camera.bat quando quiser)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Para usar: atalhos 'Estacionamento - ENTRADA' e 'Estacionamento - SAIDA' na Area de Trabalho."
Write-Host "Para trocar de camera depois: configurar_camera.bat"

if (-not $Simular) { Stop-Transcript | Out-Null }
if ($Elevado) { Read-Host "ENTER para fechar" | Out-Null }
