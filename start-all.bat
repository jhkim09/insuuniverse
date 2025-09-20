@echo off
echo ========================================
echo   Insuniverse Complete System Startup
echo ========================================
echo.

REM Clean up existing processes
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo Killing process on port 3002...
    taskkill //F //PID %%a 2>nul
)

REM Check requirements
if not exist .env (
    echo [ERROR] .env file not found!
    echo Please copy .env.example to .env and configure
    pause
    exit /b 1
)

if not exist node_modules\puppeteer (
    echo Installing Puppeteer...
    npm install puppeteer
    echo.
)

echo ========================================
echo Step 1: Starting Local Scraper Server
echo ========================================
start /B node local-scraper-server.js
echo Waiting for server startup...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo Step 2: Starting ngrok Tunnel
echo ========================================
start ngrok http 3002
echo Waiting for ngrok startup...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo    SYSTEM READY!
echo ========================================
echo.
echo [LOCAL SERVICES]
echo - Scraper Server: http://localhost:3002
echo - ngrok Monitor:  http://localhost:4040
echo.
echo [NEXT STEPS]
echo 1. Check ngrok window for your URL
echo    (looks like: https://xxxx.ngrok-free.app)
echo.
echo 2. Go to: https://insuuniverse.onrender.com/
echo.
echo 3. Enter your ngrok URL in the form
echo.
echo 4. Input Insuniverse credentials and customer info
echo.
echo ========================================
echo Press any key to STOP all services...
echo ========================================
pause >nul

echo.
echo Stopping services...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    taskkill //F //PID %%a 2>nul
)
taskkill //F //IM ngrok.exe 2>nul
echo Done!