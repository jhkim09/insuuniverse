# Notion 데이터베이스 구조 개선안 v2.0

## 🎯 개선 목표
- ANS 코드별로 데이터 명확히 구분
- 보험금 청구시 필요한 정보 즉시 확인
- 질병별 상세 정보와 ANS 타입 연결

## 📊 데이터베이스 구조 (3단계 계층)

### 1️⃣ Level 1: 고객 마스터 DB
**ID: `68206104bd0e4d9baf1cb705d765ea31`**

```
[고객 마스터]
    ↓ Relation
[분석 요약] (여러 개)
    ↓ Relation
[질병 상세] (여러 개)
```

---

### 2️⃣ Level 2: 분석 요약 DB (개선)
**ID: `7a54d3fab2fd4de5a64d9d46a6ddd0c4`**

#### 기본 정보
| 필드명 | 타입 | 설명 |
|--------|------|------|
| 분석ID | Title | Primary Key |
| 고객참조 | Relation | → 고객 마스터 DB |
| 분석일자 | Date | 분석 완료일 |
| 전체상태 | Status | 정상/주의/위험 |

#### ANS별 요약 (새로 추가) ⭐
| 필드명 | 타입 | 설명 | 용도 |
|--------|------|------|------|
| ANS002_통원_건수 | Number | 통원 총 건수 | 통원치료비 |
| ANS002_통원_일수 | Number | 통원 총 일수 | 일당 계산 |
| ANS002_처방_일수 | Number | 약 처방 일수 | 약제비 |
| ANS003_입원_건수 | Number | 입원 횟수 | 입원비 |
| ANS003_입원_일수 | Number | 총 입원일수 | 입원일당 |
| ANS004_수술_건수 | Number | 수술 횟수 | 수술비 |
| ANS004_수술_목록 | Text | 수술명 리스트 | 수술 종류 |
| ANS005_장기투약_일수 | Number | 30일이상 투약 | 장기치료 |
| ANS007_치과_건수 | Number | 치과 치료 횟수 | 치과치료비 |
| ANS008_시술_건수 | Number | 추가 시술 횟수 | 시술비 |

#### 보험금 청구 요약
| 필드명 | 타입 | 설명 |
|--------|------|------|
| 예상_통원치료비 | Formula | =ANS002_통원_일수 * 3만원 |
| 예상_입원비 | Formula | =ANS003_입원_일수 * 10만원 |
| 예상_수술비 | Checkbox | ANS004_수술_건수 > 0 |
| 총_치료기간 | Formula | 최종일 - 최초일 |

---

### 3️⃣ Level 3: 질병 상세 DB (새로 생성) ⭐
**새 DB ID 필요**

#### 기본 정보
| 필드명 | 타입 | 설명 |
|--------|------|------|
| 질병ID | Title | {분석ID}_{질병코드}_{순번} |
| 분석참조 | Relation | → 분석 요약 DB |
| **ANS타입** | Select | ANS002, ANS003, ANS004... |
| **데이터출처** | Select | aggregate/basic |

#### 질병 정보
| 필드명 | 타입 | 설명 | ANS 관련 |
|--------|------|------|-----------|
| 질병코드 | Text | ICD 코드 | 공통 |
| 질병명 | Text | 질병 이름 | 공통 |
| **질병구분** | Select | 통원/입원/수술/투약/치과 | ANS 타입별 |
| 치료시작일 | Date | 최초 치료일 | 공통 |
| 치료종료일 | Date | 마지막 치료일 | 공통 |

#### ANS별 특화 필드
| 필드명 | 타입 | 설명 | 해당 ANS |
|--------|------|------|----------|
| 통원일수 | Number | 외래 방문일수 | ANS002 |
| 통원횟수 | Number | 실제 방문 횟수 | ANS002 |
| 처방일수 | Number | 약 처방 일수 | ANS002 |
| 입원일수 | Number | 입원 일수 | ANS003 |
| 입원형태 | Select | 일반/중환자/격리 | ANS003 |
| 수술명 | Text | 수술 명칭 | ANS004 |
| 수술코드 | Text | 수술 코드 | ANS004 |
| 마취방법 | Select | 전신/부분/국소 | ANS004 |
| 투약일수 | Number | 장기 투약 일수 | ANS005 |
| 투약약품명 | Text | 약품 이름 | ANS005 |
| 치과치료종류 | Select | 충치/신경/임플란트 | ANS007 |
| 치과치료비 | Number | 치료 비용 | ANS007 |

#### 보험 정보
| 필드명 | 타입 | 설명 |
|--------|------|------|
| 보험적용가능 | Checkbox | 보험 청구 가능 여부 |
| 보험진단내용 | Text | AI 보험 진단 |
| 청구예상금액 | Number | 예상 보험금 |

---

## 🔄 데이터 매핑 전략

### 1. 전처리 단계에서 ANS 타입 분리
```javascript
// integrated-scraper-webhook.js 수정
preprocessData(rawData) {
    // ANS별로 데이터 분류
    const ansCategorized = {
        ANS002: [], // 통원
        ANS003: [], // 입원
        ANS004: [], // 수술
        ANS005: [], // 장기투약
        ANS007: [], // 치과
        ANS008: []  // 시술
    };

    // 각 질병 데이터에 ANS 타입 추가
    diseases.forEach(disease => {
        disease.ansType = this.determineANSType(disease);
        disease.category = this.getCategory(disease.ansType);
    });
}

// ANS 타입 결정 로직
determineANSType(disease) {
    if (disease.operation) return 'ANS004'; // 수술
    if (disease.treatType === '입원') return 'ANS003';
    if (disease.dosingDays > 30) return 'ANS005';
    if (disease.department === '치과') return 'ANS007';
    return 'ANS002'; // 기본 통원
}
```

### 2. Make.com에서 조건부 라우팅
```
[Webhook]
    ↓
[JSON Parse]
    ↓
[Router - ANS 타입별 분기]
    ├─ ANS002 통원 → Notion 질병상세 (통원 필드 매핑)
    ├─ ANS003 입원 → Notion 질병상세 (입원 필드 매핑)
    ├─ ANS004 수술 → Notion 질병상세 (수술 필드 매핑)
    └─ ANS007 치과 → Notion 질병상세 (치과 필드 매핑)
```

### 3. Notion Formula 활용
```
총_통원일수 =
  FILTER(질병상세, ANS타입 = "ANS002").SUM(통원일수)

총_수술건수 =
  COUNT(FILTER(질병상세, ANS타입 = "ANS004"))
```

---

## 📈 개선 효과

### Before (현재)
- 모든 질병 데이터가 섞여 있음
- ANS 타입 구분 불가
- 보험금 청구시 수동 확인 필요

### After (개선)
- ANS 타입별로 명확히 구분
- 통원/입원/수술/치과 즉시 파악
- 보험금 자동 계산 가능
- 필터링과 검색 용이

---

## 🚀 구현 순서

1. **Notion DB 구조 변경**
   - 질병 상세 DB에 ANS타입 필드 추가
   - 질병구분 Select 필드 추가
   - ANS별 특화 필드 추가

2. **전처리 코드 수정**
   ```javascript
   // 각 질병에 ANS 정보 추가
   disease1_ans_type: 'ANS002',
   disease1_category: '통원',
   disease2_ans_type: 'ANS004',
   disease2_category: '수술',
   ```

3. **Make.com 시나리오 수정**
   - ANS 타입 필드 매핑 추가
   - 조건부 필드 매핑 설정

---

## 💡 활용 예시

### 보험금 청구서 자동 생성
```
[통원 치료비]
ANS002 통원: 10일 × 3만원 = 30만원

[입원비]
ANS003 입원: 5일 × 10만원 = 50만원

[수술비]
ANS004 수술: 체내고정술 = 200만원

총 청구액: 280만원
```

### 질병별 상세 조회
```
Filter: ANS타입 = "ANS004" (수술만)
→ 모든 수술 내역 즉시 확인
```

이제 ANS 코드별로 체계적으로 데이터를 관리할 수 있습니다!