@echo off
title Smarthome Platform - Status
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File scripts\status.ps1
pause
