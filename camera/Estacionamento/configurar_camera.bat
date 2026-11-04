@echo off
REM ==============================================================
REM  Assistente de camera (dois cliques)
REM  Escolhe a camera da ENTRADA e/ou da SAIDA:
REM    1 = camera do proprio notebook
REM    2 = webcam externa (USB)
REM    3 = camera Wi-Fi (Intelbras ou outra com RTSP)
REM  Mostra a imagem para confirmar e grava no config.yaml
REM  (entrada) ou no config_saida.yaml (saida).
REM ==============================================================
cd /d "%~dp0"

if not exist .venv\Scripts\python.exe (
    echo [ERRO] Ambiente nao instalado. Rode primeiro o instalar_tudo.bat
    pause
    exit /b 1
)

.venv\Scripts\python.exe ferramentas\configurar_camera.py %*
pause
