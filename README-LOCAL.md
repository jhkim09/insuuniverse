# Insuniverse 로컬 스크래퍼 설정 가이드

## 🚀 빠른 시작

로컬에서 실제 데이터를 수집하려면:

### 1. 처음 실행 시 (한 번만)
```batch
install-local.bat
```
Puppeteer와 필요한 패키지를 설치합니다.

### 2. .env 파일 설정
`.env.example`을 복사하여 `.env` 파일을 만들고 실제 정보를 입력:
```
INSUNIVERSE_EMAIL=실제이메일
INSUNIVERSE_PASSWORD=실제비밀번호
MAKE_WEBHOOK_URL=https://hook.eu2.make.com/8uhhwoto8v26pqqciyjoc9qybtxkhiih
```

### 3. 로컬 서버 실행
```batch
start-local.bat
```

## 📋 시스템 구조

1. **Render 서버** (https://insuuniverse.onrender.com/)
   - 웹 폼 인터페이스 제공
   - Puppeteer 없음 (빠른 배포)

2. **로컬 서버** (http://localhost:3002)
   - Puppeteer로 실제 스크래핑
   - 실제 Insuniverse 로그인 처리

3. **데이터 흐름**
   - 웹 폼 → 로컬 서버 → Insuniverse 스크래핑 → Make.com 웹훅

## 🔧 문제 해결

### 화면이 바로 꺼질 때
1. `install-local.bat` 실행하여 Puppeteer 설치
2. .env 파일 확인
3. start-local.bat 재실행

### 로컬 서버가 없다고 나올 때
- 로컬 서버 실행 중인지 확인 (포트 3002)
- 방화벽 설정 확인

### Mock 데이터만 나올 때
- 로컬 서버가 실행 중이 아님
- Render 웹 폼에서 로컬 서버 URL 입력 필요

## 📌 주의사항
- 로컬 서버는 실제 브라우저를 실행하므로 메모리 사용량이 높음
- 실제 Insuniverse 계정 정보가 필요함
- 로컬 서버는 Git에 포함되지 않음 (.gitignore)