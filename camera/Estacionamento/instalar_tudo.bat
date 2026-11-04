@echo off
REM ==============================================================
REM  INSTALACAO COMPLETA EM UM COMPUTADOR NOVO (dois cliques)
REM
REM  Instala e configura: Python, bibliotecas do leitor, modelos de IA,
REM  Mosquitto (MQTT), firewall, Arduino IDE (opcional) e os atalhos
REM  na Area de Trabalho. Pede permissao de administrador uma vez.
REM  Pode rodar de novo: o que ja estiver pronto e pulado.
REM
REM  Precisa de internet. O passo a passo fica em logs\instalacao.log.
REM  Teste sem mudar nada:  instalar_tudo.bat -Simular
REM ==============================================================
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0ferramentas\instalar_tudo.ps1" %*
pause
