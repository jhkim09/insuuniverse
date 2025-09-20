@echo off
echo ========================================
echo   Insuniverse 로컬 스크래핑 서버 시작
echo ========================================
echo.

REM 환경변수 확인
if not exist .env (
    echo [경고] .env 파일이 없습니다!
    echo .env.example을 복사하여 .env 파일을 생성하고 설정해주세요.
    echo.
    echo INSUNIVERSE_EMAIL=실제이메일
    echo INSUNIVERSE_PASSWORD=실제비밀번호
    echo MAKE_WEBHOOK_URL=https://hook.eu2.make.com/...
    echo.
    pause
    exit /b 1
)

REM 종속성 설치 확인
if not exist node_modules\puppeteer (
    echo Puppeteer 설치 중...
    npm install puppeteer
)

if not exist node_modules\cors (
    echo CORS 설치 중...
    npm install cors
)

echo.
echo 서버를 시작합니다...
echo 중지하려면 Ctrl+C를 누르세요.
echo.
echo ----------------------------------------
echo 로컬 서버: http://localhost:3002
echo Render 웹: https://insuuniverse.onrender.com
echo ----------------------------------------
echo.

REM 로컬 서버 실행
npm run local