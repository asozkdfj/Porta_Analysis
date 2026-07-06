@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "PORT=3847"
set "PORTA_ROOT=!ROOT!"
set "PORTA_PORT=!PORT!"

set "NODE_EXE=!ROOT!node\node.exe"
set "APP_SERVER=!ROOT!app\server.js"
set "INBOX_DIR=!ROOT!inbox"

if not exist "!NODE_EXE!" (
  echo.
  echo [ERROR] node\node.exe not found.
  echo Run build-portable on a dev PC or extract Node.js ZIP into node\
  echo.
  pause
  exit /b 1
)

if not exist "!APP_SERVER!" (
  echo.
  echo [ERROR] app\server.js not found.
  echo Rebuild the portable package with: npm run build:portable
  echo.
  pause
  exit /b 1
)

if not exist "!ROOT!Run-Server.bat" (
  echo.
  echo [ERROR] Run-Server.bat not found.
  echo Rebuild the portable package with: npm run build:portable
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Porta
echo   http://localhost:!PORT!
echo   Inbox: !INBOX_DIR!
echo ========================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port=$env:PORTA_PORT; $root=$env:PORTA_ROOT.TrimEnd('\'); $expected=(Join-Path $root 'inbox').Replace('\','/').TrimEnd('/').ToLower(); try { $h=Invoke-RestMethod -Uri \"http://127.0.0.1:$port/api/health\" -TimeoutSec 2; if($h.inboxRoot){ $got=$h.inboxRoot.Replace('\','/').TrimEnd('/').ToLower(); if($got -eq $expected){ Write-Host ''; Write-Host '[INFO] Porta is already running for this folder.' -ForegroundColor Yellow; Write-Host '       URL: http://localhost:'$port; Write-Host '       Close the Porta Server window first if you want to restart.'; exit 3 } if($got -ne $expected){ Write-Host ''; Write-Host '[ERROR] Port' $port 'already has another Porta instance.' -ForegroundColor Red; Write-Host '        This release expects inbox:' (Join-Path $root 'inbox'); Write-Host '        Already running inbox:   ' $h.inboxRoot; Write-Host '        Close the other Porta Server window and try again.'; exit 2 } } } catch {}"
if errorlevel 3 (
  start "" "http://localhost:!PORT!/"
  echo.
  pause
  exit /b 0
)
if errorlevel 2 (
  echo.
  pause
  exit /b 1
)

echo Starting server... please wait
echo (Porta Server window will open separately)
echo.

start "Porta Server" /D "!ROOT!" cmd /k "set PORT=!PORT!&& set HOSTNAME=127.0.0.1&& call Run-Server.bat"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port=$env:PORTA_PORT; $root=$env:PORTA_ROOT.TrimEnd('\'); $expected=(Join-Path $root 'inbox').Replace('\','/').TrimEnd('/').ToLower(); $ok=$false; for($i=0; $i -lt 120; $i++) { try { $h=Invoke-RestMethod -Uri \"http://127.0.0.1:$port/api/health\" -TimeoutSec 2; if($h.status -eq 'ok' -and $h.inboxRoot){ $got=$h.inboxRoot.Replace('\','/').TrimEnd('/').ToLower(); if($got -eq $expected){ $ok=$true; break } } } catch {} if($i %% 10 -eq 9){ Write-Host ('  still waiting... ' + ($i+1) + 's') }; Start-Sleep -Seconds 1 }; if(-not $ok){ exit 1 }"

if errorlevel 1 (
  echo.
  echo [ERROR] Server did not become ready.
  echo - Check the "Porta Server" window for error messages.
  echo - Inbox must be at:
  echo   !INBOX_DIR!
  echo - URL should be: http://localhost:!PORT!
  echo.
  pause
  exit /b 1
)

start "" "http://localhost:!PORT!/"
echo.
echo Porta is ready at http://localhost:!PORT!
echo Inbox folder: !INBOX_DIR!
echo Close the "Porta Server" window to stop.
echo.
pause

endlocal
