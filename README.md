# Insuniverse 데이터 수집 자동화

Insuniverse.com에서 데이터를 자동으로 수집하고 Make.com을 통해 백업하는 자동화 시스템입니다.

## 주요 기능

- **자동 로그인**: Puppeteer를 사용한 브라우저 자동화로 insuniverse.com 로그인
- **API 탐색**: 로그인 후 사용 가능한 API 엔드포인트 자동 탐지
- **데이터 수집**: 발견된 API로부터 데이터 추출
- **Make.com 연동**: 수집된 데이터를 Make.com 웹훅으로 전송
- **스케줄링**: Cron을 이용한 자동 실행 스케줄링
- **모니터링**: 웹 대시보드를 통한 실행 상태 모니터링

## 파일 구조

```
insuniverse-automation/
├── scraper.js          # 메인 스크래핑 클래스
├── scheduler.js        # 스케줄링 및 모니터링 서버
├── make-webhook.js     # Make.com 웹훅 연동
├── package.json        # 의존성 관리
├── .env.example        # 환경변수 예시
└── README.md          # 이 파일
```

## 설치 및 설정

### 1. 의존성 설치
```bash
cd insuniverse-automation
npm install
```

### 2. 환경변수 설정
`.env.example`을 `.env`로 복사하고 실제 값으로 수정:

```bash
cp .env.example .env
```

`.env` 파일 내용:
```env
# Insuniverse 로그인 정보
INSUNIVERSE_EMAIL=your-email@example.com
INSUNIVERSE_PASSWORD=your-password

# Make.com 웹훅 URL
MAKE_WEBHOOK_URL=https://hook.make.com/your-webhook-url

# 스케줄링 설정 (cron format)
SCHEDULE_CRON=0 9 * * *

# 데이터 저장 경로
DATA_PATH=./data

# 즉시 실행 (테스트용)
RUN_IMMEDIATELY=false

# 모니터링 서버 포트
PORT=3001
```

### 3. Make.com 웹훅 설정

1. Make.com에서 새 시나리오 생성
2. **Webhook** 모듈을 추가하여 "Incoming webhook" 선택
3. 생성된 웹훅 URL을 `.env` 파일의 `MAKE_WEBHOOK_URL`에 설정
4. 받은 데이터를 처리할 후속 모듈들 연결 (Google Sheets, Database, Email 등)

## 사용법

### 단일 실행
```bash
npm start
```

### 스케줄링 서버 시작
```bash
npm run schedule
```

### Make.com 연동 테스트
```bash
node make-webhook.js
```

## 모니터링

스케줄링 서버가 실행 중일 때 다음 엔드포인트를 통해 모니터링 가능:

- **상태 확인**: http://localhost:3001/status
- **수동 실행**: http://localhost:3001/run  
- **실행 기록**: http://localhost:3001/history

## 스케줄 설정

`SCHEDULE_CRON` 환경변수로 실행 주기를 설정할 수 있습니다:

- `0 9 * * *` - 매일 오전 9시
- `0 */6 * * *` - 6시간마다
- `0 0 * * 1` - 매주 월요일 자정
- `0 0 1 * *` - 매월 1일 자정

## 데이터 구조

수집된 데이터는 다음 형태로 저장됩니다:

```json
{
  "timestamp": "2025-01-15T09:00:00.000Z",
  "apiEndpoints": [
    {
      "url": "https://www.insuniverse.com/api/user/profile",
      "status": 200
    }
  ],
  "dataCount": 5,
  "data": {
    "https://api-endpoint-1": {
      "data": { ... },
      "timestamp": "2025-01-15T09:00:01.000Z"
    }
  }
}
```

## 주의사항

1. **로그인 정보 보안**: `.env` 파일을 절대 공개 저장소에 업로드하지 마세요
2. **사이트 정책 준수**: insuniverse.com의 이용약관과 robots.txt를 확인하세요
3. **적절한 딜레이**: 서버에 과부하를 주지 않도록 적절한 요청 간격을 유지합니다
4. **오류 처리**: 네트워크 오류나 사이트 변경에 대비해 정기적으로 로그를 확인하세요

## 로그 및 디버깅

- 실행 로그: `./logs/scheduler_YYYY-MM-DD.json`
- 수집 데이터: `./data/insuniverse_data_YYYY-MM-DD.json`
- 브라우저 헤드리스 모드: `scraper.js`의 `headless: false`를 `true`로 변경

## 문제 해결

### 로그인 실패
- 브라우저를 표시모드로 실행하여 로그인 프로세스 확인
- 로그인 폼 셀렉터가 변경되었는지 확인
- 2FA가 활성화되어 있는지 확인

### API 탐지 실패
- 네트워크 탭에서 실제 API 요청 확인
- 로그인 후 주요 페이지들을 수동으로 탐색해보기
- API 경로 패턴이 변경되었는지 확인

### Make.com 전송 실패
- 웹훅 URL이 올바른지 확인
- Make.com 시나리오가 활성화되어 있는지 확인
- 페이로드 크기 제한 확인