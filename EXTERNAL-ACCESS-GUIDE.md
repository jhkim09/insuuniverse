# 🌐 외부 접근 가능한 로컬 서버 설정 가이드

## 보안을 고려한 외부 접근 방법들

### 방법 1: ngrok (추천 - 간단하고 안전)

#### 설치 및 설정
```bash
# ngrok 다운로드: https://ngrok.com/download
# 계정 생성 후 authtoken 설정
ngrok config add-authtoken YOUR_AUTH_TOKEN

# 터널 생성
ngrok http 3004
```

#### 사용법
1. `ngrok http 3004` 실행
2. **Public URL** 복사 (예: `https://abc123.ngrok.io`)
3. 이 URL로 외부에서 접근 가능
4. **자동 HTTPS** 적용됨

#### 장점
- ✅ **무료**: 기본 플랜 무료
- ✅ **보안**: HTTPS 자동 적용, 방화벽 설정 불필요
- ✅ **임시**: 필요할 때만 터널 열기
- ✅ **로그**: 모든 요청 로그 확인 가능

### 방법 2: 공유기 포트포워딩

#### 설정 방법
1. **내부 IP 확인**:
```bash
ipconfig | findstr IPv4
# 결과: 192.168.1.100
```

2. **공유기 관리페이지** 접속 (192.168.1.1)
3. **포트포워딩 설정**:
   - 외부 포트: 8080
   - 내부 IP: 192.168.1.100  
   - 내부 포트: 3004

4. **외부 IP 확인**: https://whatismyipaddress.com
5. **접근 URL**: `http://YOUR_EXTERNAL_IP:8080`

#### 주의사항
- ⚠️ **보안 위험**: 외부에 직접 노출
- ⚠️ **방화벽**: Windows 방화벽 설정 필요
- ⚠️ **동적 IP**: 외부 IP가 변경될 수 있음

### 방법 3: 로컬 네트워크 접근

#### 현재 설정으로 같은 네트워크에서 접근
```javascript
// simple-web-server.js 수정
app.listen(PORT, '0.0.0.0', () => {
    console.log(`서버 실행: http://0.0.0.0:${PORT}`);
});
```

#### 접근 방법
- **내부 IP 확인**: `ipconfig`
- **접근 URL**: `http://192.168.1.100:3004` (같은 WiFi/LAN)

### 방법 4: Tailscale (VPN 방식)

#### 설정
1. **Tailscale 설치**: https://tailscale.com/download
2. **계정 연결**: 각 기기에서 로그인
3. **접근**: Tailscale IP로 직접 접근

#### 장점
- ✅ **보안**: VPN 수준 보안
- ✅ **간편**: 별도 설정 불필요
- ✅ **안정**: 고정 IP 제공

---

## 🔒 보안 강화 옵션

### 인증 추가
```javascript
// simple-web-server.js에 추가
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-secure-password';

app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});
```

### IP 화이트리스트
```javascript
const allowedIPs = ['127.0.0.1', '192.168.1.0/24'];

app.use((req, res, next) => {
    const clientIP = req.ip;
    if (!allowedIPs.some(ip => clientIP.includes(ip))) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
});
```

---

## 💡 추천 구성

### 개발/테스트용: ngrok
```bash
# 터미널 1: 서버 실행
cd insuniverse-automation
npm run server

# 터미널 2: ngrok 터널
ngrok http 3004
```

### 사무실 내부용: 로컬 네트워크
```javascript
// 0.0.0.0으로 바인딩
app.listen(PORT, '0.0.0.0');
```

### 집에서 외부 접근용: Tailscale
- VPN으로 안전하게 접근
- 고정 IP로 편리함

**어떤 방법을 선호하시나요?**