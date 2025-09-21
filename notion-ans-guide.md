# Notion 데이터베이스 ANS 코드 가이드

## 📋 ANS 코드별 의미 및 매핑 가이드

Notion 데이터베이스에서 InsuniVerse 데이터를 처리할 때 참고할 ANS 코드 가이드입니다.

---

## 🏥 주요 ANS 코드 (보험금 청구용)

### ANS002 - 통원/외래
- **위치**: `data.analysisDetail.basic.ANS002`
- **의미**: 병원 외래 방문 및 약 처방
- **주요 필드**:
  - `asbVisitDays`: 통원일수
  - `asbDosingDays`: 투약일수
  - `asbHospitalName`: 병원명
  - `asbDepartment`: 진료과
- **보험금**: 통원치료비 (일당 3만원 기준)

### ANS003 - 입원
- **위치**: `data.analysisDetail.aggregate.ANS003` 또는 `basic.ANS003`
- **의미**: 입원 치료
- **주요 필드**:
  - `asbVisitDays`: 입원일수
  - `asbTreatType`: "입원"
- **보험금**: 입원비 (일당 10만원 기준)

### ANS004 - 수술
- **위치**: `data.analysisDetail.basic.ANS004`
- **의미**: 수술 내역
- **주요 필드**:
  - `asdOperation`: 수술명
  - `asbTreatStartDate`: 수술일
- **보험금**: 수술비 (수술 종류별 차등)

### ANS005 - 장기투약
- **위치**: `data.analysisDetail.aggregate.ANS005`
- **의미**: 30일 이상 장기 투약
- **주요 필드**:
  - `asbDosingDays`: 투약일수 (30일 이상)
- **보험금**: 장기치료 관련 특약

### ANS007 - 치과
- **위치**: `data.analysisDetail.basic.ANS007`
- **의미**: 치과 치료
- **주요 필드**:
  - `asbDepartment`: "치주과" 등
  - `asbToothFive`: 치료 내용
- **보험금**: 치과치료비

---

## 🔄 Make.com에서 매핑 방법

### 1. ANS 타입 확인
```javascript
// 통원 건수
{{data.analysisDetail.basic.ANS002.count}}

// 입원 건수
{{data.analysisDetail.basic.ANS003.count}}

// 수술 건수
{{data.analysisDetail.basic.ANS004.count}}
```

### 2. 질병별 ANS 타입 판별
```javascript
// 수술이 있는 경우
if ({{data.analysisDetail.basic.ANS004.list[0].detail.asdOperation}}) {
  ansType = "ANS004-수술"
}

// 입원인 경우
if ({{data.analysisDetail.basic.ANS003.list[0].basic.asbTreatType}} == "입원") {
  ansType = "ANS003-입원"
}

// 통원인 경우
if ({{data.analysisDetail.basic.ANS002.list[0].basic.asbVisitDays}} > 0) {
  ansType = "ANS002-통원"
}
```

---

## 📊 Notion DB 필드 매핑

### 분석 상세 DB (7a54d3fab2fd4de5a64d9d46a6ddd0c4)

| Notion 필드 | ANS 데이터 경로 | 설명 |
|------------|----------------|------|
| ANS타입 | 조건문으로 판별 | ANS002/003/004 등 |
| 통원건수 | `basic.ANS002.count` | 통원 횟수 |
| 입원건수 | `basic.ANS003.count` | 입원 횟수 |
| 수술건수 | `basic.ANS004.count` | 수술 횟수 |
| 통원일수 | `basic.ANS002.list[].basic.asbVisitDays` 합계 | 총 통원일수 |
| 입원일수 | `basic.ANS003.list[].basic.asbVisitDays` 합계 | 총 입원일수 |
| 투약일수 | `basic.ANS002.list[].basic.asbDosingDays` 합계 | 총 투약일수 |
| 수술목록 | `basic.ANS004.list[].detail.asdOperation` | 수술명 리스트 |

---

## 💡 활용 팁

### 보험금 자동 계산 Formula
```
통원치료비 = ANS002_통원일수 × 30,000원
입원비 = ANS003_입원일수 × 100,000원
```

### ANS 우선순위 (중복시)
1. ANS004 (수술) - 가장 중요
2. ANS003 (입원)
3. ANS005 (장기투약)
4. ANS002 (통원)
5. ANS007 (치과)

### 질병 분류 Select 옵션
- 통원 (ANS002)
- 입원 (ANS003)
- 수술 (ANS004)
- 장기투약 (ANS005)
- 검진 (ANS006)
- 치과 (ANS007)
- 시술 (ANS008)

---

## 🔍 데이터 구조 예시

```json
{
  "analysisDetail": {
    "basic": {
      "ANS002": {
        "count": 3,
        "list": [
          {
            "basic": {
              "asbDiseaseCode": "K7469",
              "asbDiseaseName": "간경변증",
              "asbVisitDays": 1,
              "asbDosingDays": 0,
              "asbHospitalName": "세브란스병원"
            }
          }
        ]
      },
      "ANS004": {
        "count": 1,
        "list": [
          {
            "detail": {
              "asdOperation": "결장경하 종양 수술"
            }
          }
        ]
      }
    }
  }
}
```

---

## ⚠️ 주의사항

1. **aggregate vs basic 구분**
   - aggregate: 집계된 요약 데이터 (ANS003, ANS005 등)
   - basic: 상세 개별 데이터 (모든 ANS)

2. **sicked_0 vs sicked_1**
   - sicked_0: 질병 미보유자
   - sicked_1: 질병 보유자

3. **null 값 처리**
   - 모든 필드는 null 가능
   - Make.com에서 `{{data.field || 0}}` 형식으로 기본값 설정

4. **중복 데이터**
   - 같은 질병이 여러 ANS에 나타날 수 있음
   - 우선순위에 따라 처리

---

이 가이드를 Notion 데이터베이스 설정이나 Make.com 시나리오 작성시 참고하세요!