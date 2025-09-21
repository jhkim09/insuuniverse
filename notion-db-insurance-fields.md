# Notion 데이터베이스 필드 구조 (보험금 청구 버전)

## 📊 Database 1: 고객 마스터 DB
**ID: `68206104bd0e4d9baf1cb705d765ea31`**

### 기존 필드 (변경 없음)
- 고객명 (Title)
- 전화번호 (Phone)
- 생년월일 (Text)
- 분석ID (Number)
- 분석상태 (Select)

---

## 📋 Database 2: 분석 상세 DB (보험금 청구 필드 추가)
**ID: `7a54d3fab2fd4de5a64d9d46a6ddd0c4`**

### Notion에 추가해야 할 새로운 필드들

#### 질병1 상세 정보
| 필드명 | 타입 | 설명 | JSON 매핑 |
|--------|------|------|-----------|
| 질병1_코드 | Text | 질병코드 | disease1_code |
| 질병1_이름 | Text | 질병명 | disease1_name |
| 질병1_최초치료일 | Date | 치료시작일 | disease1_start_date |
| 질병1_마지막치료일 | Date | 치료종료일 | disease1_end_date |
| **질병1_통원일수** | Number | 병원 방문일수 | disease1_visit_days |
| **질병1_투약일수** | Number | 약 처방일수 | disease1_dosing_days |
| **질병1_통원횟수** | Number | 실제 방문횟수 | disease1_visit_count |
| **질병1_진료형태** | Select | 입원/외래 | disease1_treat_type |
| 질병1_병원 | Text | 병원명 | disease1_hospital |
| 질병1_진료과 | Text | 진료과목 | disease1_department |
| 질병1_수술명 | Text | 수술명 | disease1_operation |
| 질병1_보험가능성 | Text | 보험진단 | disease1_insurance |

#### 질병2 상세 정보
| 필드명 | 타입 | 설명 | JSON 매핑 |
|--------|------|------|-----------|
| 질병2_코드 | Text | 질병코드 | disease2_code |
| 질병2_이름 | Text | 질병명 | disease2_name |
| 질병2_최초치료일 | Date | 치료시작일 | disease2_start_date |
| 질병2_마지막치료일 | Date | 치료종료일 | disease2_end_date |
| **질병2_통원일수** | Number | 병원 방문일수 | disease2_visit_days |
| **질병2_투약일수** | Number | 약 처방일수 | disease2_dosing_days |
| **질병2_통원횟수** | Number | 실제 방문횟수 | disease2_visit_count |
| **질병2_진료형태** | Select | 입원/외래 | disease2_treat_type |
| 질병2_병원 | Text | 병원명 | disease2_hospital |
| 질병2_진료과 | Text | 진료과목 | disease2_department |
| 질병2_수술명 | Text | 수술명 | disease2_operation |
| 질병2_보험가능성 | Text | 보험진단 | disease2_insurance |

#### 질병3 상세 정보
| 필드명 | 타입 | 설명 | JSON 매핑 |
|--------|------|------|-----------|
| 질병3_코드 | Text | 질병코드 | disease3_code |
| 질병3_이름 | Text | 질병명 | disease3_name |
| 질병3_최초치료일 | Date | 치료시작일 | disease3_start_date |
| 질병3_마지막치료일 | Date | 치료종료일 | disease3_end_date |
| **질병3_통원일수** | Number | 병원 방문일수 | disease3_visit_days |
| **질병3_투약일수** | Number | 약 처방일수 | disease3_dosing_days |
| **질병3_통원횟수** | Number | 실제 방문횟수 | disease3_visit_count |
| **질병3_진료형태** | Select | 입원/외래 | disease3_treat_type |
| 질병3_병원 | Text | 병원명 | disease3_hospital |
| 질병3_진료과 | Text | 진료과목 | disease3_department |
| 질병3_수술명 | Text | 수술명 | disease3_operation |

### 요약 통계 필드 (새로 추가)
| 필드명 | 타입 | 설명 | JSON 매핑 |
|--------|------|------|-----------|
| 총_질병수 | Number | 전체 질병 개수 | total_disease_count |
| 총_수술횟수 | Number | 수술 횟수 | total_operation_count |
| 총_통원일수 | Formula | =질병1_통원일수+질병2_통원일수+질병3_통원일수 | - |
| 총_투약일수 | Formula | =질병1_투약일수+질병2_투약일수+질병3_투약일수 | - |
| 질병목록_요약 | Text | 질병명 리스트 | disease_list_text |
| 수술목록_요약 | Text | 수술명 리스트 | operation_list_text |

---

## 🔧 Notion에서 필드 추가 방법

### 1. 데이터베이스 열기
1. Notion에서 분석 상세 DB (`7a54d3fab2fd4de5a64d9d46a6ddd0c4`) 열기
2. 우측 상단 `...` → `Properties` 클릭

### 2. 새 필드 추가
각 필드별로:
1. `+ Add a property` 클릭
2. 필드명 입력 (예: `질병1_통원일수`)
3. 타입 선택:
   - Number: 일수, 횟수
   - Date: 치료일
   - Select: 진료형태 (옵션: 입원, 외래)
   - Text: 코드, 이름, 병원명 등

### 3. Select 필드 옵션 설정
`질병N_진료형태` 필드:
- 옵션1: `입원`
- 옵션2: `외래`
- 옵션3: `응급`

---

## 📤 Make.com Blueprint 매핑 예시

```javascript
// Notion Create/Update 모듈에서
{
  // 질병1 보험금 청구 정보
  "질병1_코드": {
    "rich_text": [{
      "text": {
        "content": "{{disease1_code}}"
      }
    }]
  },
  "질병1_통원일수": {
    "number": {{disease1_visit_days}}
  },
  "질병1_투약일수": {
    "number": {{disease1_dosing_days}}
  },
  "질병1_통원횟수": {
    "number": {{disease1_visit_count}}
  },
  "질병1_진료형태": {
    "select": {
      "name": "{{disease1_treat_type}}"
    }
  },
  "질병1_최초치료일": {
    "date": {
      "start": "{{disease1_start_date}}"
    }
  },
  "질병1_마지막치료일": {
    "date": {
      "start": "{{disease1_end_date}}"
    }
  }
}
```

---

## ✅ 체크리스트

Notion 데이터베이스에 추가해야 할 필드:

### 질병1
- [ ] 질병1_통원일수 (Number)
- [ ] 질병1_투약일수 (Number)
- [ ] 질병1_통원횟수 (Number)
- [ ] 질병1_진료형태 (Select)
- [ ] 질병1_최초치료일 (Date)
- [ ] 질병1_마지막치료일 (Date)

### 질병2
- [ ] 질병2_통원일수 (Number)
- [ ] 질병2_투약일수 (Number)
- [ ] 질병2_통원횟수 (Number)
- [ ] 질병2_진료형태 (Select)
- [ ] 질병2_최초치료일 (Date)
- [ ] 질병2_마지막치료일 (Date)

### 질병3
- [ ] 질병3_통원일수 (Number)
- [ ] 질병3_투약일수 (Number)
- [ ] 질병3_통원횟수 (Number)
- [ ] 질병3_진료형태 (Select)
- [ ] 질병3_최초치료일 (Date)
- [ ] 질병3_마지막치료일 (Date)

### 요약
- [ ] 총_통원일수 (Formula)
- [ ] 총_투약일수 (Formula)

---

## 💡 보험금 청구시 활용

1. **통원치료비 계산**
   ```
   통원치료비 = 질병1_통원횟수 × 일당금액
   ```

2. **약제비 계산**
   ```
   약제비 = 질병1_투약일수 × 약제일당
   ```

3. **입원/외래 구분**
   - 입원: 입원일당 지급
   - 외래: 통원일당 지급

4. **치료기간 확인**
   ```
   치료기간 = 마지막치료일 - 최초치료일
   ```

이제 Notion 데이터베이스에 이 필드들을 추가하시면 보험금 청구에 필요한 모든 정보를 관리할 수 있습니다!