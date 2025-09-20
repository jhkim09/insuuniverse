@echo off
echo ========================================
echo   로컬 스크래퍼 종속성 설치
echo ========================================
echo.

REM Puppeteer 및 필요한 패키지 설치
echo Puppeteer 설치 중...
npm install puppeteer@^21.11.0

echo.
echo CORS 설치 중...
npm install cors@^2.8.5

echo.
echo ========================================
echo   설치 완료!
echo ========================================
echo.
echo 이제 start-local.bat을 실행하세요.
pause