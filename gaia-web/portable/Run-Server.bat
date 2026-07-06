@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
if not defined PORT set "PORT=3847"
if not defined HOSTNAME set "HOSTNAME=127.0.0.1"

set "APP_DIR=!ROOT!app"
set "NODE_EXE=!ROOT!node\node.exe"

set "PORTA_PORTABLE_ROOT=!ROOT!"
set "PORTA_INBOX_ROOT=!ROOT!inbox"
set "PORTA_OUTBOX_ROOT=!ROOT!outbox"
set "GAIA_PORTABLE_ROOT=!ROOT!"
set "GAIA_INBOX_ROOT=!ROOT!inbox"
set "GAIA_OUTBOX_ROOT=!ROOT!outbox"

if not exist "!NODE_EXE!" (
  echo [ERROR] node\node.exe not found
  pause
  exit /b 1
)

if not exist "!APP_DIR!\server.js" (
  echo [ERROR] server.js not found in app folder
  pause
  exit /b 1
)

cd /d "!APP_DIR!"
if errorlevel 1 (
  echo [ERROR] Cannot open app folder:
  echo !APP_DIR!
  pause
  exit /b 1
)

set "ROOT_TRIM=!ROOT!"
if "!ROOT_TRIM:~-1!"=="\" set "ROOT_TRIM=!ROOT_TRIM:~0,-1!"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Content -LiteralPath '.gaia-data-root' -Value $env:PORTA_PORTABLE_ROOT.TrimEnd('\') -NoNewline -Encoding UTF8"

echo.
echo Porta portable root: !ROOT_TRIM!
echo Porta inbox:         !PORTA_INBOX_ROOT!
echo Porta server:        http://localhost:!PORT!
echo.
echo Starting Node.js...
"!NODE_EXE!" server.js
if errorlevel 1 (
  echo.
  echo [ERROR] server.js exited with an error.
  pause
  exit /b 1
)

echo.
echo Server stopped.
pause
endlocal
