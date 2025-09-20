# ngrok 초기 설정 가이드

## 문제: ngrok이 바로 꺼지는 현상

### 원인
- ngrok 설정 파일이 없음
- Auth token이 설정되지 않음

## 해결 방법

### 1. ngrok 계정 생성 (무료)
1. https://ngrok.com/signup 에서 회원가입
2. 이메일 인증

### 2. Auth Token 받기
1. 로그인 후 대시보드: https://dashboard.ngrok.com/get-started/your-authtoken
2. Auth Token 복사

### 3. Token 설정
```bash
# PowerShell 또는 CMD에서 실행
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

예시:
```bash
ngrok config add-authtoken 2abcDEF123456789_YourActualTokenHere
```

### 4. 테스트
```bash
# 간단한 HTTP 서버 테스트
ngrok http 80
```

### 5. Insuniverse 서버와 연결

#### Terminal 1: Node 서버 실행
```bash
cd C:\Users\newsh\test-project\insuniverse-automation
node simple-web-server.js
```

#### Terminal 2: ngrok 터널 생성
```bash
ngrok http 3002
```

## 성공 시 출력 예시
```
ngrok                                                           (Ctrl+C to quit)

Session Status                online
Account                       your-email@example.com (Plan: Free)
Update                        0.0.0 -> 3.24.0 (update available)
Version                       3.24.0
Region                        Asia Pacific (ap)
Latency                       32ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123def456.ngrok-free.app -> http://localhost:3002

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0       0
```

## 대안: 임시로 로컬에서만 테스트
Auth token 없이 임시 테스트만 하려면:
```bash
# 로컬 네트워크에서만 접속 가능
node simple-web-server.js
# http://localhost:3002 또는 http://YOUR_LOCAL_IP:3002
```

## 자주 발생하는 문제

### 1. "command not found" 에러
- ngrok.exe 경로를 PATH에 추가
- 또는 전체 경로로 실행: `C:\path\to\ngrok.exe http 3002`

### 2. 방화벽 차단
- Windows Defender 방화벽에서 ngrok.exe 허용

### 3. 포트 사용 중
```bash
# 포트 확인
netstat -ano | findstr :3002

# 다른 포트 사용
PORT=3003 node simple-web-server.js
ngrok http 3003
```

---
작성일: 2025-01-19