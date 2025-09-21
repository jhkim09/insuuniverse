# 보험금 청구 필수 필드 매핑 가이드

## ✅ 추가된 보험금 청구 필수 필드

### 각 질병별로 제공되는 정보 (disease1~5)

| 필드명 | 설명 | 데이터 타입 | 보험금 청구시 용도 |
|--------|------|------------|-------------------|
| **disease1_visit_days** | 병원 통원일수 | Number | 통원치료비 계산 |
| **disease1_dosing_days** | 투약일수 | Number | 약제비 계산 |
| **disease1_visit_count** | 통원횟수 | Number | 통원 급여 산정 |
| **disease1_treat_type** | 진료형태 | Text | 입원/외래 구분 |
| **disease1_start_date** | 최초 치료일 | Date | 보험 개시일 확인 |
| **disease1_end_date** | 마지막 치료일 | Date | 치료 기간 산정 |

## 📊 실제 데이터 예시

```json
{
  "disease1_code": "S9230",
  "disease1_name": "중족골의 골절",
  "disease1_start_date": "2021-06-30",  // 최초 치료일
  "disease1_end_date": "2022-04-15",    // 마지막 치료일
  "disease1_visit_days": 10,            // 통원일수
  "disease1_dosing_days": 0,            // 투약일수
  "disease1_visit_count": 10,           // 통원횟수
  "disease1_treat_type": "외래",        // 진료형태
  "disease1_hospital": "연세한강병원",
  "disease1_department": "정형외과",
  "disease1_operation": "체내고정용금속제거술"
}
```

## 🔄 Make.com에서 Notion 매핑

### Notion 데이터베이스 필드 설정

```
질병1_코드 (Text)
질병1_이름 (Text)
질병1_최초치료일 (Date)
질병1_마지막치료일 (Date)
질병1_통원일수 (Number)
질병1_투약일수 (Number)
질병1_통원횟수 (Number)
질병1_진료형태 (Select: 입원/외래)
질병1_병원 (Text)
질병1_수술명 (Text)
```

### Make.com 매핑 예시

```javascript
// 보험금 청구 핵심 정보
질병1_통원일수: {{disease1_visit_days}}
질병1_투약일수: {{disease1_dosing_days}}
질병1_통원횟수: {{disease1_visit_count}}
질병1_치료기간: {{disease1_start_date}} ~ {{disease1_end_date}}
```

## 📋 보험금 청구 체크리스트

### 필수 확인 사항
- [x] **통원일수**: 통원치료비 청구 기준
- [x] **투약일수**: 약제비 청구 기준
- [x] **통원횟수**: 일당 지급 계산
- [x] **최초/마지막 치료일**: 보험 적용 기간 확인
- [x] **진료형태**: 입원/외래 구분으로 급여 차등
- [x] **수술명**: 수술비 청구시 필요
- [x] **병원/진료과**: 청구서 작성시 필수

## 💡 활용 팁

1. **치료 기간 계산**
   ```
   치료기간 = disease1_end_date - disease1_start_date
   ```

2. **총 의료비 예상**
   ```
   통원비 = disease1_visit_count * 일당
   약제비 = disease1_dosing_days * 약제일당
   ```

3. **보험 적용 확인**
   - 최초 치료일이 보험 가입일 이후인지 확인
   - 면책기간/감액기간 체크

## 🚀 실행 방법

```bash
# 스크래핑 → 전처리(보험 필드 포함) → Make.com 전송
node integrated-scraper-webhook.js
```

이제 모든 보험금 청구 필수 정보가 포함되어 있습니다!