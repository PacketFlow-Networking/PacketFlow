@echo off
REM ================================================================
REM AINetUI - Deploy Enhanced Backend (Sprint 1)
REM ================================================================

echo.
echo ============================================================
echo  AINetUI Enhanced Backend Deployment
echo ============================================================
echo.

REM Check if we're in the backend directory
if not exist "capture.py" (
    echo ERROR: Please run this script from the backend directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo [1/5] Backing up original files...
if exist ".env" (
    if not exist ".env.original" (
        copy /Y ".env" ".env.original"
        echo   Backed up .env
    ) else (
        echo   .env already backed up
    )
)

if exist "main.py" (
    if not exist "main_original.py" (
        copy /Y "main.py" "main_original.py"
        echo   Backed up main.py
    ) else (
        echo   main.py already backed up
    )
)

if exist "websocket_server.py" (
    if not exist "websocket_server_original.py" (
        copy /Y "websocket_server.py" "websocket_server_original.py"
        echo   Backed up websocket_server.py
    ) else (
        echo   websocket_server.py already backed up
    )
)

echo.
echo [2/5] Deploying enhanced versions...

REM Deploy enhanced versions
if exist ".env.enhanced" (
    copy /Y ".env.enhanced" ".env"
    echo   Deployed .env
) else (
    echo   WARNING: .env.enhanced not found, skipping
)

if exist "main_enhanced.py" (
    copy /Y "main_enhanced.py" "main.py"
    echo   Deployed main.py
) else (
    echo   ERROR: main_enhanced.py not found!
    pause
    exit /b 1
)

if exist "websocket_server_enhanced.py" (
    copy /Y "websocket_server_enhanced.py" "websocket_server.py"
    echo   Deployed websocket_server.py
) else (
    echo   ERROR: websocket_server_enhanced.py not found!
    pause
    exit /b 1
)

echo.
echo [3/5] Checking dependencies...
python -c "import orjson" 2>nul
if errorlevel 1 (
    echo   Installing orjson...
    pip install orjson
)

python -c "import prometheus_client" 2>nul
if errorlevel 1 (
    echo   Installing prometheus-client...
    pip install prometheus-client
)

python -c "import pydantic" 2>nul
if errorlevel 1 (
    echo   Installing pydantic...
    pip install pydantic
)

python -c "import slowapi" 2>nul
if errorlevel 1 (
    echo   Installing slowapi...
    pip install slowapi
)

python -c "import cachetools" 2>nul
if errorlevel 1 (
    echo   Installing cachetools...
    pip install cachetools
)

echo.
echo [4/5] Checking configuration...

findstr /C:"API_KEY=change-me-in-production" ".env" >nul 2>&1
if not errorlevel 1 (
    echo.
    echo   ================================================================
    echo   WARNING: Default API key detected!
    echo   ================================================================
    echo   Please update your API key in .env before running in production
    echo.
    echo   Generate a secure key with:
    echo   python -c "import secrets; print(secrets.token_urlsafe(32))"
    echo.
    echo   Then update .env:
    echo   API_KEY=your-generated-key
    echo   ================================================================
    echo.
)

echo [5/5] Deployment complete!
echo.
echo ============================================================
echo  Next Steps:
echo ============================================================
echo.
echo 1. Update API key in .env (if not already done)
echo 2. Run: python main.py
echo 3. Test endpoints:
echo    - Metrics: http://localhost:8000/metrics
echo    - Status: curl -H "X-API-Key: your-key" http://localhost:8000/status
echo    - Health: http://localhost:8000/health/live
echo.
echo 4. Read IMPLEMENTATION_GUIDE.md for full documentation
echo.
echo ============================================================
echo.

pause
