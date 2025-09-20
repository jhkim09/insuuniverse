@echo off
echo ========================================
echo   Insuniverse Local + ngrok Tunnel
echo ========================================
echo.

REM Clean up existing processes
echo Cleaning up existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    taskkill //F //PID %%a 2>nul
)

REM Check .env file
if not exist .env (
    echo [WARNING] No .env file found!
    echo Please create .env file from .env.example
    echo.
    pause
    exit /b 1
)

REM Check Puppeteer
if not exist node_modules\puppeteer (
    echo Installing Puppeteer...
    npm install puppeteer
)

echo.
echo Starting local server on port 3002...
start /B node local-scraper-server.js
timeout /t 2 /nobreak >nul

echo.
echo Starting ngrok tunnel (insuniverse)...
cd ..
start /B ngrok start insuniverse --config ngrok.yml
cd insuniverse-automation
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   SYSTEM READY!
echo ========================================
echo.
echo Local Server: http://localhost:3002
echo Ngrok Monitor: http://localhost:4040
echo.
echo To get ngrok URL:
echo 1. Open browser: http://localhost:4040/status
echo 2. Copy the public URL
echo 3. Use it at: https://insuuniverse.onrender.com/
echo.
echo ========================================
echo Press Ctrl+C to stop all services
echo ========================================
echo.
pause