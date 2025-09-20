@echo off
echo ========================================
echo   Starting Local Scraper with ngrok
echo ========================================
echo.

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
echo Step 1: Starting local server on port 3002...
start /B cmd /c "node local-scraper-server.js"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo.
echo Step 2: Starting ngrok tunnel...
start cmd /c "ngrok http 3002"

echo Waiting for ngrok to start...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   IMPORTANT: Copy ngrok URL
echo ========================================
echo.
echo 1. Look for the ngrok window that opened
echo 2. Copy the HTTPS URL (like https://xxxxx.ngrok-free.app)
echo 3. Go to https://insuuniverse.onrender.com/
echo 4. Enter the ngrok URL in "Local Server URL" field
echo.
echo Or check: http://localhost:4040/status
echo.
echo ========================================
echo Press Ctrl+C to stop all services
echo ========================================
echo.
pause