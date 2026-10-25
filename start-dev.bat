@echo off
title Tourbillon dev server
cd /d "C:\Users\noura\Downloads\test\Tourbillon\frontend"
echo Starting Tourbillon dev server (output also written to Tourbillon\dev.log)...
if exist "C:\Users\noura\Downloads\test\Tourbillon\dev.log" del "C:\Users\noura\Downloads\test\Tourbillon\dev.log"
npm run dev 2>&1 | powershell -NoProfile -Command "$input | ForEach-Object { Write-Host $_; Add-Content -Path 'C:\Users\noura\Downloads\test\Tourbillon\dev.log' -Value $_ }"
