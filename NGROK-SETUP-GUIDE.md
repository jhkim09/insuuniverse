# 📡 Insuniverse Automation ngrok 외부 접속 설정 가이드

## 1. ngrok 설치

### Windows
```bash
# Chocolatey 사용
choco install ngrok

# 또는 수동 설치
# 1. https://ngrok.com/download 접속
# 2. Windows 버전 다운로드
# 3. ngrok.exe를 원하는 폴더에 압축 해제
# 4. 환경변수 PATH에 해당 폴더 추가
```

## 2. ngrok 계정 설정 (무료)

1. https://ngrok.com 가입
2. 대시보드에서 Auth Token 확인
3. 터미널에서 토큰 설정:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## 3. 서비스 실행

### 터미널 1: 웹 서버 실행
```bash
cd insuniverse-automation
node simple-web-server.js
# 포트 3002에서 실행됨
```

### 터미널 2: ngrok 터널 생성
```bash
ngrok http 3002
```

## 4. 외부 접속 URL 확인

ngrok 실행 후 표시되는 정보:
```
Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       32ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3002
```

**외부 접속 URL**: `https://abc123.ngrok-free.app`

## 5. 무료 플랜 제한사항

- **세션 시간**: 8시간 (재시작 필요)
- **동시 터널**: 1개
- **월간 요청**: 40,000 requests
- **랜덤 URL**: 매번 변경됨 (고정 URL은 유료)

## 6. 고정 도메인 설정 (유료)

### Basic 플랜 ($8/월)
```bash
# 고정 도메인으로 실행
ngrok http 3002 --domain=your-domain.ngrok.app
```

## 7. 보안 설정

### Basic Auth 추가
```bash
ngrok http 3002 --basic-auth="username:password"
```

### IP 화이트리스트 (Pro 플랜)
```bash
ngrok http 3002 --cidr-allow="1.2.3.4/32,5.6.7.8/32"
```

## 8. 자동 실행 설정 (Windows)

### batch 파일 생성 (start-insuniverse.bat)
```batch
@echo off
cd C:\Users\newsh\test-project\insuniverse-automation
start "Insuniverse Server" cmd /k "node simple-web-server.js"
timeout /t 5
start "ngrok Tunnel" cmd /k "ngrok http 3002"
```

### Windows 작업 스케줄러 등록
1. 작업 스케줄러 열기 (taskschd.msc)
2. 기본 작업 만들기
3. 트리거: 시스템 시작 시
4. 동작: start-insuniverse.bat 실행

## 9. 환경변수 설정 (.env)

```env
# 기존 설정
INSUNIVERSE_ID=your_id
INSUNIVERSE_PWD=your_password

# ngrok 관련 (선택사항)
NGROK_AUTHTOKEN=your_auth_token
NGROK_DOMAIN=your-custom-domain.ngrok.app  # 유료 플랜
```

## 10. API 엔드포인트

외부에서 사용 가능한 엔드포인트:

### 홈페이지 (웹 폼)
```
GET https://your-url.ngrok-free.app/
```

### 고객 데이터 수집
```
POST https://your-url.ngrok-free.app/api/collect-pdf
Content-Type: application/json

{
    "customerName": "김지훈",
    "webhookUrl": "https://hook.eu1.make.com/..."  // 선택사항
}
```

### 작업 상태 확인
```
GET https://your-url.ngrok-free.app/api/job-status/:jobId
```

### PDF 다운로드
```
GET https://your-url.ngrok-free.app/downloads/filename.pdf
```

## 11. 대안 서비스

### Cloudflare Tunnel (무료, 더 안정적)
```bash
# 설치
winget install --id Cloudflare.cloudflared

# 실행
cloudflared tunnel --url http://localhost:3002
```

### Localtunnel (무료)
```bash
npm install -g localtunnel
lt --port 3002 --subdomain insuniverse
```

### Tailscale Funnel (무료, 팀 내부용)
```bash
tailscale funnel 3002
```

## 12. 모니터링

ngrok 대시보드에서 실시간 모니터링:
- https://dashboard.ngrok.com
- 요청 로그
- 트래픽 분석
- 에러 추적

## 13. 문제 해결

### 포트 충돌
```bash
# 다른 포트로 변경
PORT=3003 node simple-web-server.js
ngrok http 3003
```

### 방화벽 이슈
- Windows Defender 방화벽에서 node.exe 허용
- 안티바이러스에서 ngrok.exe 예외 처리

### ngrok 터널 끊김
- 무료 플랜은 8시간 제한
- 자동 재연결 스크립트 사용 고려

---

작성일: 2025-01-19