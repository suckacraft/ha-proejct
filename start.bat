@echo off
title Smarthome Platform
cd /d "%~dp0"
if not exist .env.local (
    echo.
    echo  Setup required:
    echo  Copy .env.local.example to .env.local
    echo  Add your HA token to .env.local
    echo  Then double-click start.bat again
    echo.
    pause
    exit
)
powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
pause
