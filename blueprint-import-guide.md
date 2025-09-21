# Make.com Blueprint 가져오기 가이드

## 📥 Blueprint 가져오기 방법

### 1단계: Make.com에 로그인
1. [Make.com](https://www.make.com) 접속
2. 계정 로그인

### 2단계: 새 시나리오 생성
1. **Scenarios** 메뉴 클릭
2. **Create a new scenario** 버튼 클릭

### 3단계: Blueprint 가져오기
1. 시나리오 편집기 우측 상단 **⋯** 메뉴 클릭
2. **Import Blueprint** 선택
3. `make-scenario-blueprint.json` 파일 업로드
4. **Save** 클릭

### 4단계: 필수 설정
Blueprint 가져온 후 아래 항목들을 설정해야 합니다:

#### 1. Webhook 설정
- 모듈 1 (CustomWebHook) 클릭
- **Add** 버튼으로 새 webhook 생성
- Webhook 이름: `InsuniVerse Data Receiver`
- 생성된 URL 복사 → `.env` 파일의 `MAKE_WEBHOOK_URL`에 저장

#### 2. Notion 연결
- 모듈 4, 6, 7, 8 (Notion 모듈들) 각각 클릭
- **Create a connection** 클릭
- Notion 계정 연결 승인
- 연결 이름: `Notion InsuniVerse`

#### 3. 데이터베이스 ID 확인
Blueprint에 이미 설정되어 있지만 확인 필요:
- 고객 마스터 DB: `68206104bd0e4d9baf1cb705d765ea31`
- 분석 상세 DB: `7a54d3fab2fd4de5a64d9d46a6ddd0c4`

### 5단계: 시나리오 테스트

#### 테스트 데이터 전송
```bash
# 1. 간단한 연결 테스트
node test-webhook-sender.js simple

# 2. 전체 데이터 테스트
node test-webhook-sender.js full
```

#### Make.com에서 확인
1. 시나리오 편집기에서 **Run once** 클릭
2. 터미널에서 테스트 데이터 전송
3. 각 모듈의 실행 결과 확인
4. 오류 발생시 빨간색 표시 확인

## 🔧 문제 해결

### "Connection not found" 오류
- 각 Notion 모듈에서 Connection 재설정
- Notion 계정 권한 확인

### "Database not found" 오류
- Notion 데이터베이스 ID 확인
- 데이터베이스 공유 설정 확인
- Integration 권한 확인

### "Invalid JSON" 오류
- Webhook 데이터 구조 확인
- JSON Parse 모듈의 Sample data 재설정

## 📊 시나리오 구조

```
[1] Webhook 수신
    ↓
[2] JSON 파싱
    ↓
[3] 변수 설정
    ↓
[4] 고객 DB 검색
    ↓
[5] Router (분기)
    ├─[6] 신규 고객 생성
    └─[7] 기존 고객 업데이트
         ↓
[8] 분석 상세 DB 생성
```

## ✅ 최종 체크리스트

- [ ] Webhook URL이 `.env`에 저장됨
- [ ] Notion Connection 설정 완료
- [ ] 데이터베이스 ID 확인
- [ ] 테스트 데이터 전송 성공
- [ ] Notion에 데이터 생성 확인
- [ ] 관계(Relation) 필드 연결 확인

## 💡 팁

1. **순차 실행 설정**: Settings → Sequential processing ON
2. **에러 핸들링**: 각 모듈에 Error handler 추가 권장
3. **실행 로그**: History 탭에서 상세 로그 확인
4. **필드 매핑**: 빈 값 처리를 위해 `ifempty()` 함수 활용

## 📝 추가 커스터마이징

필요시 아래 항목들을 추가할 수 있습니다:

1. **중복 체크 강화**
   - 전화번호로 추가 검색
   - 복합 조건 필터링

2. **데이터 변환 추가**
   - 날짜 형식 변환
   - 텍스트 정리 함수

3. **알림 설정**
   - Slack/Email 알림 모듈 추가
   - 오류 발생시 알림

4. **배치 처리**
   - Array aggregator로 여러 건 처리
   - Iterator로 순차 처리