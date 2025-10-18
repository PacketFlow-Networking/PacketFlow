@echo off
REM AINetUI Stop Script

echo Stopping AINetUI services...

REM Kill Python processes (backend)
taskkill /FI "WINDOWTITLE eq AINetUI Backend*" /T /F 2>nul
taskkill /IM python.exe /FI "MEMUSAGE gt 50000" /F 2>nul

REM Kill Node processes (frontend)
taskkill /FI "WINDOWTITLE eq AINetUI Frontend*" /T /F 2>nul
taskkill /IM node.exe /F 2>nul

echo.
echo All AINetUI services stopped.
pause
