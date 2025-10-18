@echo off
REM ================================================================
REM AINetUI - Rollback to Original Backend
REM ================================================================

echo.
echo ============================================================
echo  AINetUI Rollback to Original Backend
echo ============================================================
echo.

REM Check if we're in the backend directory
if not exist "capture.py" (
    echo ERROR: Please run this script from the backend directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo [1/2] Checking for backups...

set FOUND_BACKUPS=0

if exist ".env.original" (
    echo   Found: .env.original
    set FOUND_BACKUPS=1
)

if exist "main_original.py" (
    echo   Found: main_original.py
    set FOUND_BACKUPS=1
)

if exist "websocket_server_original.py" (
    echo   Found: websocket_server_original.py
    set FOUND_BACKUPS=1
)

if %FOUND_BACKUPS%==0 (
    echo.
    echo ERROR: No backup files found!
    echo Nothing to rollback to.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] Restoring original files...

if exist ".env.original" (
    copy /Y ".env.original" ".env"
    echo   Restored .env
)

if exist "main_original.py" (
    copy /Y "main_original.py" "main.py"
    echo   Restored main.py
)

if exist "websocket_server_original.py" (
    copy /Y "websocket_server_original.py" "websocket_server.py"
    echo   Restored websocket_server.py
)

echo.
echo ============================================================
echo  Rollback Complete!
echo ============================================================
echo.
echo Original backend has been restored.
echo You can now run: python main.py
echo.
echo ============================================================
echo.

pause
