# 전처리기 통합 가이드

## 🚀 실행 방법

### 옵션 1: 개별 실행 (테스트용)

```bash
# 1. 스크래핑 및 데이터 저장
node integrated-scraper-webhook.js --save-only

# 2. 전처리 실행
node enhanced-preprocessor.js

# 3. 처리된 데이터를 Make.com으로 전송
node send-preprocessed-to-make.js
```

### 옵션 2: 통합 실행 (권장)

```bash
# 한 번에 모두 실행
node run-with-preprocessing.js
```

## 📁 새로 필요한 파일들

### 1. `send-preprocessed-to-make.js`
전처리된 데이터를 Make.com으로 전송

### 2. `run-with-preprocessing.js`
전체 프로세스를 한 번에 실행

## 🔄 작업 흐름

```
1. InsuniVerse 로그인
   ↓
2. 데이터 스크래핑
   ↓
3. ANS 타입별 전처리 (enhanced-preprocessor.js)
   ↓
4. Make.com 웹훅 전송
   ↓
5. Notion DB 업데이트
```

## 📊 전처리 결과 확인

전처리 후 생성되는 데이터:
- `data/enhanced-preprocessed-data.json`

포함 내용:
- ANS별 요약 (통원, 입원, 수술 등)
- 질병별 ANS 타입 분류
- Make.com용 플랫 데이터

## ✅ 체크리스트

1. [ ] `.env` 파일 설정 확인
2. [ ] `data/test-new-format.json` 존재 확인
3. [ ] 전처리기 테스트 실행
4. [ ] Make.com 웹훅 URL 확인
5. [ ] Notion DB 필드 매핑 확인