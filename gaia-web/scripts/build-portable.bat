@echo off
chcp 65001 >nul
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-portable.ps1" %*
if errorlevel 1 (
  echo.
  echo [오류] 포터블 패키지 생성 실패
  pause
  exit /b 1
)
pause
