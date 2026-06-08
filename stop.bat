@echo off
title Smarthome Platform - Stopping
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File scripts\stop.ps1
echo All services stopped.
pause
