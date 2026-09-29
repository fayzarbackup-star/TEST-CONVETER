@echo off
title Fayzar Converter Offline Server
cd /d "%~dp0"
echo ========================================================
echo   Fayzar Universal Bangla & Math Converter (Offline)
echo ========================================================
echo Starting local offline server...
node serve.js
pause
