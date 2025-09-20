@echo off
echo ========================================
echo   Auto-configured ngrok + Local Server
echo ========================================
echo.

REM Kill existing processes
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    taskkill //F //PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4040') do (
    taskkill //F //PID %%a 2>nul
)

if not exist .env (
    echo [WARNING] No .env file found!
    echo Please create .env file from .env.example
    echo.
    pause
    exit /b 1
)

if not exist node_modules\puppeteer (
    echo Installing Puppeteer...
    npm install puppeteer
)

echo.
echo Starting local server...
start /B node local-scraper-server.js
timeout /t 2 /nobreak >nul

echo Starting ngrok tunnel...
start /B ngrok http 3002 --log-level=error
timeout /t 3 /nobreak >nul

echo.
echo Getting ngrok URL...
echo.

REM Get ngrok URL using curl
for /f "tokens=*" %%i in ('curl -s http://localhost:4040/api/tunnels 2^>nul ^| findstr "public_url"') do (
    set NGROK_LINE=%%i
)

echo ========================================
echo   SETUP COMPLETE!
echo ========================================
echo.
echo Local Server: http://localhost:3002
echo Ngrok Status: http://localhost:4040
echo.
echo NGROK URL (copy this to Render form):
echo %NGROK_LINE%
echo.
echo ========================================
echo Go to: https://insuuniverse.onrender.com/
echo Paste the ngrok URL in the form
echo ========================================
echo.
echo Press any key to stop services...
pause >nul

REM Cleanup
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    taskkill //F //PID %%a 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4040') do (
    taskkill //F //PID %%a 2>nul
)