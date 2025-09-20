# Make.com → Notion 자동화 설정 완전 가이드

## 📋 개요
웹 폼에서 고객 정보 입력 → Insuniverse 데이터 수집 → Make.com → Notion 데이터베이스 자동 입력

## 🎯 목표
1. **고객 마스터 DB**에 요약 정보 자동 입력
2. **진료기록 상세 DB**에 개별 진료기록 자동 입력  
3. **양방향 Relation** 자동 연결

---

## 🔧 Make.com 시나리오 설정

### 1단계: 웹훅 트리거 설정

1. **새 시나리오 생성**
2. **Webhooks** 모듈 추가
3. **"Instant trigger"** 선택
4. **웹훅 URL 복사** → `.env` 파일의 `MAKE_WEBHOOK_URL`에 입력

```env
MAKE_WEBHOOK_URL=https://hook.integromat.com/your-webhook-url
```

### 2단계: JSON 파서 설정

1. **Tools** → **JSON** → **Parse JSON** 추가
2. **JSON string**: `{{1.data}}`
3. **Data structure** 입력:

```json
{
  "timestamp": "2025-09-12T02:27:27.995Z",
  "source": "insuniverse-automation",
  "jobId": 12345,
  "notion": {
    "database_id": "8b0f4a5e-29e4-4534-b7e2-68288a64adcd",
    "properties": {
      "고객명": "김지훈",
      "전화번호": "01020221053",
      "분석ID": 10106
    }
  },
  "detailed_analysis": {
    "medical_records": [
      {
        "진료기록 ID": "10106_BAS_HEA_1",
        "질병명": "결장의 폴립",
        "병원명": "한국의학연구소"
      }
    ]
  }
}
```

### 3단계: 고객 마스터 DB 입력

1. **Notion** 모듈 추가 → **Create a Database Item** 선택
2. **설정값**:

| 설정 | 값 |
|------|-----|
| **Database** | `Insuniverse 고객 분석 데이터` |
| **Database ID** | `68206104-bd0e-4d9b-af1c-b705d765ea31` |

3. **Properties 매핑**:

| 노션 필드 | Make.com 매핑 | 타입 | 예시 |
|-----------|---------------|------|------|
| **고객명** | `{{2.notion.properties.고객명}}` | Title | 김지훈 |
| **전화번호** | `{{2.notion.properties.전화번호}}` | Phone | 01020221053 |
| **생년월일** | `{{2.notion.properties.생년월일}}` | Text | 851109 |
| **분석ID** | `{{2.notion.properties.분석ID}}` | Number | 10106 |
| **분석상태** | `{{2.notion.properties.분석상태}}` | Select | 분석완료 |
| **분석완료일** | `{{2.notion.properties.date:분석완료일:start}}` | Date | 2025-09-12 |
| **수집일시** | `{{2.notion.properties.date:수집일시:start}}` | Date | 2025-09-12 |
| **질병미보유자수** | `{{2.notion.properties.질병미보유자수}}` | Number | 2 |
| **질병보유자수** | `{{2.notion.properties.질병보유자수}}` | Number | 1 |
| **건강보험항목수** | `{{2.notion.properties.건강보험항목수}}` | Number | 2 |
| **일반분석항목수** | `{{2.notion.properties.일반분석항목수}}` | Number | 3 |
| **주요질병코드** | `{{2.notion.properties.주요질병코드}}` | Text | K635, S9230 |
| **보험진단가능성** | `{{2.notion.properties.보험진단가능성}}` | Text | 골절 진단비 가능 |
| **PDF보고서** | `{{2.notion.properties.PDF보고서}}` | Checkbox | true |
| **처리상태** | `{{2.notion.properties.처리상태}}` | Select | 처리완료 |
| **Make작업ID** | `{{2.jobId}}` | Number | 12345 |

### 4단계: 진료기록 상세 DB 입력 (Iterator 사용)

1. **Flow Control** → **Iterator** 추가
2. **Array**: `{{2.detailed_analysis.medical_records}}`

3. **Iterator 내부에 Notion 모듈 추가**:
   - **Database**: `Insuniverse 진료기록 상세`
   - **Database ID**: `7a54d3fa-b2fd-4de5-a64d-9d46a6ddd0c4`

4. **진료기록 Properties 매핑**:

| 노션 필드 | Make.com 매핑 | 타입 | 예시 |
|-----------|---------------|------|------|
| **진료기록 ID** | `{{4.진료기록 ID}}` | Title | 10106_BAS_HEA_1 |
| **고객명** | `{{3.id}}` | Relation | (고객 마스터 DB 연결) |
| **분석ID** | `{{4.분석ID}}` | Number | 10106 |
| **진료시작일** | `{{4.date:진료시작일:start}}` | Date | 2022-04-13 |
| **진료종료일** | `{{4.date:진료종료일:start}}` | Date | 2022-04-13 |
| **병원명** | `{{4.병원명}}` | Text | 한국의학연구소 |
| **진료과** | `{{4.진료과}}` | Select | 내과 |
| **진료유형** | `{{4.진료유형}}` | Select | 외래 |
| **질병코드** | `{{4.질병코드}}` | Text | K635 |
| **질병명** | `{{4.질병명}}` | Text | 결장의 폴립 |
| **방문일수** | `{{4.방문일수}}` | Number | 1 |
| **복용일수** | `{{4.복용일수}}` | Number | 0 |
| **수술내역** | `{{4.수술내역}}` | Text | 결장경하 종양 수술 |
| **수술횟수** | `{{4.수술횟수}}` | Number | 1 |
| **검사내역** | `{{4.검사내역}}` | Text | 순환기 기능검사 |
| **검사횟수** | `{{4.검사횟수}}` | Number | 46 |
| **보험진단가능성** | `{{4.보험진단가능성}}` | Text | 의료비 및 수술비 가능 |
| **수술보험가능성** | `{{4.수술보험가능성}}` | Text | 소액암 가능성 |
| **데이터소스** | `{{4.데이터소스}}` | Select | 기본분석_건강보험 |
| **수집일시** | `{{4.date:수집일시:start}}` | Date | 2025-09-12 |

### 5단계: 고객 마스터 DB에 진료기록 연결

1. **Notion** → **Update a Database Item** 추가
2. **Page ID**: `{{3.id}}` (3단계에서 생성된 고객 페이지 ID)
3. **Properties**:
   - **진룼기록목록**: `{{4.id}}` (Iterator에서 생성된 진료기록 ID들)

---

## 🔧 고급 설정

### 오류 처리
1. **Error Handler** 추가
2. **Slack/Email 알림** 설정
3. **재시도 로직** 구성

### 조건부 처리
1. **Router** 모듈로 분기:
   - **성공 시**: 노션 입력 + 성공 알림
   - **실패 시**: 오류 로그 + 실패 알림

### 데이터 검증
1. **Filter** 모듈로 데이터 유효성 검사:
   - **고객명 필수**: `{{2.notion.properties.고객명}} ≠ empty`
   - **분석 ID 필수**: `{{2.notion.properties.분석ID}} > 0`

---

## 📊 데이터베이스 정보

### 고객 마스터 DB
- **Database ID**: `68206104-bd0e-4d9b-af1c-b705d765ea31`
- **URL**: https://www.notion.so/68206104bd0e4d9baf1cb705d765ea31

### 진료기록 상세 DB  
- **Database ID**: `7a54d3fa-b2fd-4de5-a64d-9d46a6ddd0c4`
- **URL**: https://www.notion.so/7a54d3fab2fd4de5a64d9d46a6ddd0c4

---

## 🧪 테스트 절차

### 1. 웹훅 테스트
1. Make.com에서 **"Run once"** 클릭
2. 웹 폼에서 테스트 데이터 입력:
   - **고객명**: 김지훈
   - **전화번호**: 010-2022-1053
3. Make.com에서 데이터 수신 확인

### 2. JSON 파싱 테스트
- **JSON 모듈** 결과에서 `notion.properties` 확인
- **medical_records 배열** 확인

### 3. 노션 입력 테스트
- **고객 마스터 DB**에 새 레코드 생성 확인
- **진료기록 상세 DB**에 개별 레코드들 생성 확인
- **Relation 연결** 확인

### 4. 전체 플로우 테스트
- 다른 고객 정보로 재테스트
- 모든 단계 정상 작동 확인

---

## 🚨 주의사항

### 필수 확인사항
1. ✅ **Notion 통합 연결**: Make.com에서 Notion 앱 연결 완료
2. ✅ **데이터베이스 권한**: 해당 노션 데이터베이스에 대한 쓰기 권한
3. ✅ **웹훅 URL**: `.env` 파일에 올바른 웹훅 URL 설정

### 일반적인 오류들
- **Database not found**: 데이터베이스 ID 확인
- **Invalid properties**: 필드명 정확히 매핑
- **Relation error**: 연결할 페이지가 존재하는지 확인

---

## 📱 완성 후 사용법

1. **http://localhost:3001** 접속
2. **고객명/전화번호** 입력
3. **"데이터 수집 시작"** 클릭
4. **Make.com**에서 자동 처리
5. **노션**에서 결과 확인:
   - 고객 마스터 DB: 요약 정보
   - 진료기록 상세 DB: 개별 진료내역
   - Relation으로 서로 연결됨

**이제 완전 자동화된 Insuniverse → Notion 시스템이 완성됩니다!** 🎉