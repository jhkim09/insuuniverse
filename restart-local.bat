@echo off
echo ========================================
echo   Restarting Local Scraper Server
echo ========================================
echo.

echo Checking for existing process on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo Killing process %%a
    taskkill //F //PID %%a 2>nul
)

echo.
echo Port 3002 cleared.
echo.

call run-local.bat