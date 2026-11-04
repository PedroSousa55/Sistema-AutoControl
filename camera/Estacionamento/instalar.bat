@echo off
REM ==============================================================
REM  Instala o leitor de placas (rodar UMA vez, com internet)
REM  Cria o ambiente virtual .venv e instala as bibliotecas.
REM
REM  Computador NOVO? Use o instalar_tudo.bat: ele tambem instala o
REM  Python, o Mosquitto, o firewall e os atalhos, e chama este aqui.
REM  ("instalar.bat /auto" = sem pausas, usado pelo instalar_tudo)
REM ==============================================================
cd /d "%~dp0"

REM No modo /auto a "pausa" vira um echo vazio (nao usar rem aqui: dentro
REM de parenteses ele apagaria o ")" que fecha o bloco).
set PAUSA=pause
if /i "%~1"=="/auto" set PAUSA=echo.

where py >nul 2>nul
if %errorlevel%==0 (set PYTHON=py -3) else (set PYTHON=python)

%PYTHON% --version >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale o Python 3.10 ou mais novo em
    echo        https://www.python.org/downloads/  e marque "Add python.exe to PATH".
    %PAUSA%
    exit /b 1
)

if not exist .venv (
    echo Criando ambiente virtual .venv ...
    %PYTHON% -m venv .venv || (echo [ERRO] Falha ao criar o .venv & %PAUSA% & exit /b 1)
)

echo Instalando bibliotecas (pode levar alguns minutos na primeira vez) ...
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt || (echo [ERRO] Falha na instalacao & %PAUSA% & exit /b 1)

REM Algumas bibliotecas de placa instalam o "opencv-python-headless" (OpenCV
REM SEM janelas). Ele briga com o opencv-python e a janela de video nao abre.
REM Por isso removemos o headless e reinstalamos o OpenCV completo.
.venv\Scripts\python.exe -m pip uninstall -y opencv-python-headless
.venv\Scripts\python.exe -m pip install --force-reinstall --no-deps opencv-python==5.0.0.93

echo.
echo Instalacao concluida! Para rodar, de dois cliques em rodar.bat
%PAUSA%
exit /b 0
