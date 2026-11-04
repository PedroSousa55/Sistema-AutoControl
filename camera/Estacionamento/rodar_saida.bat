@echo off
REM ==============================================================
REM  Roda o leitor de placas como camera de SAIDA
REM  (consulta se a placa pagou antes de abrir a cancela)
REM  Se existir o config_saida.yaml (criado pelo configurar_camera.bat),
REM  usa ele: assim a saida pode ter uma camera diferente da entrada.
REM  Senao, usa o config.yaml. Em qualquer caso a funcao vira "saida"
REM  e o nome da camera "saida_1" (vai no JSON e na tarja do video).
REM ==============================================================
cd /d "%~dp0"

if not exist .venv\Scripts\python.exe (
    echo [ERRO] Ambiente nao instalado. Rode primeiro o instalar.bat
    pause
    exit /b 1
)

set CONFIG=config.yaml
if exist config_saida.yaml set CONFIG=config_saida.yaml

.venv\Scripts\python.exe main.py --config %CONFIG% --funcao saida --nome saida_1 %*
if errorlevel 1 pause
