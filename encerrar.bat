@echo off
chcp 65001 > nul
title Monster Lab — Encerrando

echo.
echo  Encerrando servidor e ngrok...

taskkill /f /im node.exe  > nul 2>&1
taskkill /f /im ngrok.exe > nul 2>&1

echo  Tudo encerrado.
echo.
timeout /t 2 /nobreak > nul
