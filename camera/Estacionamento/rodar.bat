@echo off
REM ==============================================================
REM  Roda o leitor de placas usando as configuracoes do config.yaml
REM  O modo (entrada ou saida) vem de camera.funcao no config.yaml,
REM  que vem como "entrada". Para a SAIDA, use o rodar_saida.bat.
REM  Exemplos:  rodar.bat
REM             rodar.bat --config outra_camera.yaml
REM ==============================================================
cd /d "%~dp0"

if not exist .venv\Scripts\python.exe (
    echo [ERRO] Ambiente nao instalado. Rode primeiro o instalar.bat
    pause
    exit /b 1
)

.venv\Scripts\python.exe main.py %*
if errorlevel 1 pause
