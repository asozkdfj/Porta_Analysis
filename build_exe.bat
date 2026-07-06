@echo off
echo ========================================
echo  Extract GRR Columns - EXE Build
echo ========================================
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Add Python to PATH and try again.
    pause
    exit /b 1
)

echo [1/2] Installing PyInstaller...
python -m pip install pyinstaller -q
if errorlevel 1 (
    echo [ERROR] pip install failed
    pause
    exit /b 1
)

echo [2/2] Building EXE...
python -m PyInstaller --onefile --console --name ExtractGRRColumns --clean extract_grr_columns.py
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo Done. EXE location: dist\ExtractGRRColumns.exe
echo Copy ExtractGRRColumns.exe from dist folder to use.
pause
