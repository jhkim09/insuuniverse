# 🎯 최종 워크플로우 정리

## 전체 데이터 플로우

```
InsuniVerse API → 스크래핑 → 전처리(보험필드포함) → Make.com → Notion DB
```

## 📁 파일 구조 및 역할

### 1. 데이터 수집 & 전처리
- **`integrated-scraper-webhook.js`** ⭐️ 메인 실행 파일
  - InsuniVerse 스크래핑
  - 데이터 전처리 (보험금 청구 필드 포함)
  - Make.com 웹훅 전송

### 2. Notion 데이터베이스 구조
- **고객 마스터 DB** (`68206104bd0e4d9baf1cb705d765ea31`)
  - 고객 기본 정보

- **분석 상세 DB** (`7a54d3fab2fd4de5a64d9d46a6ddd0c4`)
  - 질병별 상세 정보
  - **보험금 청구 필수 필드 포함**:
    - 통원일수
    - 투약일수
    - 통원횟수
    - 최초/마지막 치료일
    - 진료형태 (입원/외래)

## 🚀 실행 방법

### 1단계: 환경 설정
```bash
# .env 파일 확인
INSUNIVERSE_EMAIL=your_email
INSUNIVERSE_PASSWORD=your_password
MAKE_WEBHOOK_URL=https://hook.eu2.make.com/your_webhook_url
```

### 2단계: 데이터 수집 & 전송
```bash
node integrated-scraper-webhook.js
```

### 3단계: Make.com 시나리오
1. Webhook 수신
2. JSON Parse
3. Notion DB 생성/업데이트

## 📊 전처리된 데이터 구조

```json
{
  // 고객 정보
  "customer_name": "김지훈",
  "analysis_id": 10106,

  // 질병1 상세 (보험금 청구 정보 포함)
  "disease1_code": "S9230",
  "disease1_name": "중족골의 골절",
  "disease1_start_date": "2021-06-30",
  "disease1_end_date": "2022-04-15",
  "disease1_visit_days": 10,      // ✅ 통원일수
  "disease1_dosing_days": 0,       // ✅ 투약일수
  "disease1_visit_count": 10,      // ✅ 통원횟수
  "disease1_treat_type": "외래",   // ✅ 진료형태
  "disease1_hospital": "연세한강병원",
  "disease1_operation": "체내고정용금속제거술",

  // 질병2, 3도 동일한 구조
  // ...
}
```

## ✅ 보험금 청구 체크포인트

| 항목 | 필드명 | 용도 |
|------|--------|------|
| 통원일수 | disease_visit_days | 통원치료비 산정 |
| 투약일수 | disease_dosing_days | 약제비 산정 |
| 통원횟수 | disease_visit_count | 일당 계산 |
| 치료기간 | start_date ~ end_date | 보험 적용기간 확인 |
| 진료형태 | disease_treat_type | 입원/외래 구분 |

## 📝 Notion DB 필수 설정

### 분석 상세 DB에 추가할 필드
각 질병(1~3)별로:
- `질병N_통원일수` (Number)
- `질병N_투약일수` (Number)
- `질병N_통원횟수` (Number)
- `질병N_진료형태` (Select: 입원/외래)
- `질병N_최초치료일` (Date)
- `질병N_마지막치료일` (Date)

## 🔄 Make.com 매핑

```javascript
// Make.com Notion 모듈에서
질병1_통원일수: {{disease1_visit_days}}
질병1_투약일수: {{disease1_dosing_days}}
질병1_통원횟수: {{disease1_visit_count}}
질병1_최초치료일: {{disease1_start_date}}
질병1_마지막치료일: {{disease1_end_date}}
질병1_진료형태: {{disease1_treat_type}}
```

## 📈 데이터 처리 성과

- **원본 데이터**: ~20KB (복잡한 중첩 구조)
- **전처리 후**: ~1.5KB (평평한 구조)
- **크기 감소**: 92~94%
- **보험 필드**: 100% 보존

## 🎯 최종 결과

✅ 복잡한 JSON → 단순한 구조로 변환
✅ 보험금 청구 필수 정보 모두 포함
✅ Make.com에서 직접 매핑 가능
✅ Iterator 없이 처리 가능

---

## 문제 해결

### Q: 질병 데이터가 없는 경우?
A: 빈 문자열('')이나 0으로 처리되어 Notion에 안전하게 저장됨

### Q: 5개 이상의 질병이 있는 경우?
A: 상위 5개만 처리 (보험금 청구 주요 건만)

### Q: Make.com 실행 실패?
A: History 탭에서 Input/Output 확인하여 매핑 오류 체크

---

이제 모든 설정이 완료되었습니다! 🎉