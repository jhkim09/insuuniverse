# Insuniverse 수집 가능한 데이터 구조

## 1. 고객 기본 정보 (order-detail API)

```json
{
  "customer": {
    "name": "김지훈",
    "phone": "01020221053", 
    "birth": "851109",
    "state": "분석완료",
    "completedAt": "2025-09-12 09:40:55"
  }
}
```

## 2. 분석 데이터 APIs

### 2.1 집계 데이터 - 질병 미보유자 (ANS006)
**API**: `/analyze/{id}/aggregate?page=1&ansType=ANS006&asbSicked=0`
- **설명**: 질병을 보유하지 않은 사람들의 집계 분석
- **예상 데이터**: 연령별, 성별, 지역별 통계

### 2.2 집계 데이터 - 질병 보유자 (ANS005) 
**API**: `/analyze/{id}/aggregate?page=1&ansType=ANS005&asbSicked=1`
- **설명**: 질병을 보유한 사람들의 집계 분석
- **예상 데이터**: 질병별, 치료비, 입원일수 통계

### 2.3 기본 분석 - 건강보험 (ANS008)
**API**: `/analyze/{id}/basic?page=1&ansType=ANS008&asbDiseaseCode=&searchYear=5`
- **설명**: 5년간 건강보험 기본 분석
- **예상 데이터**: 진료 내역, 의료비, 처방전 정보

### 2.4 기본 분석 - 일반 (ANS004)
**API**: `/analyze/{id}/basic?page=1&ansType=ANS004&asbDiseaseCode=&searchYear=5`
- **설명**: 5년간 일반 기본 분석
- **예상 데이터**: 보험 가입 이력, 보장 분석

### 2.5 PDF 보고서 (hidden-insurance)
**API**: `/analyze/{id}/hidden-insurance`
- **설명**: 종합 분석 보고서 (PDF 또는 구조화된 데이터)
- **예상 데이터**: 요약 정보, 추천 보험상품

## 3. 전체 수집 데이터 JSON 구조

```json
{
  "metadata": {
    "analysisId": "10106",
    "collectionTimestamp": "2025-09-12T11:15:30.000Z",
    "totalAPIs": 5,
    "successCount": 5,
    "failureCount": 0
  },
  "customer": {
    "name": "김지훈",
    "phone": "01020221053",
    "birth": "851109", 
    "state": "분석완료",
    "completedAt": "2025-09-12 09:40:55"
  },
  "apis": {
    "집계_질병미보유자": {
      "description": "질병을 보유하지 않은 사람들의 집계 분석",
      "url": "https://api.insuniverse.com/analyze/10106/aggregate?page=1&ansType=ANS006&asbSicked=0",
      "status": 200,
      "contentType": "application/json",
      "timestamp": "2025-09-12T11:15:31.000Z",
      "summary": {
        "type": "array_data",
        "itemCount": 25,
        "sampleFields": ["age", "gender", "region", "count"]
      },
      "data": { /* 실제 API 응답 데이터 */ }
    },
    "집계_질병보유자": {
      "description": "질병을 보유한 사람들의 집계 분석",
      "url": "https://api.insuniverse.com/analyze/10106/aggregate?page=1&ansType=ANS005&asbSicked=1",
      "status": 200,
      "timestamp": "2025-09-12T11:15:32.000Z",
      "summary": {
        "type": "array_data", 
        "itemCount": 15,
        "sampleFields": ["disease", "cost", "hospitalDays"]
      },
      "data": { /* 실제 API 응답 데이터 */ }
    },
    "기본분석_건강보험": {
      "description": "5년간 건강보험 기본 분석",
      "url": "https://api.insuniverse.com/analyze/10106/basic?page=1&ansType=ANS008&asbDiseaseCode=&searchYear=5",
      "status": 200,
      "timestamp": "2025-09-12T11:15:33.000Z", 
      "summary": {
        "type": "array_data",
        "itemCount": 150,
        "sampleFields": ["date", "hospital", "diagnosis", "cost"]
      },
      "data": { /* 실제 API 응답 데이터 */ }
    },
    "기본분석_일반": {
      "description": "5년간 일반 기본 분석",
      "url": "https://api.insuniverse.com/analyze/10106/basic?page=1&ansType=ANS004&asbDiseaseCode=&searchYear=5",
      "status": 200,
      "timestamp": "2025-09-12T11:15:34.000Z",
      "summary": {
        "type": "array_data",
        "itemCount": 80,
        "sampleFields": ["insuranceType", "coverage", "premium"]
      },
      "data": { /* 실제 API 응답 데이터 */ }
    },
    "PDF보고서": {
      "description": "PDF 형태의 숨겨진 보험 보고서",
      "url": "https://api.insuniverse.com/analyze/10106/hidden-insurance",
      "status": 200,
      "timestamp": "2025-09-12T11:15:35.000Z",
      "summary": {
        "type": "structured_report",
        "itemCount": 1
      },
      "data": { /* 구조화된 보고서 데이터 */ }
    }
  }
}
```

## 4. Make.com 웹훅 전송 데이터

Make.com으로 전송되는 데이터는 위의 전체 JSON 구조가 그대로 전송되며, 
추가로 다음 메타데이터가 포함됩니다:

```json
{
  "timestamp": "2025-09-12T11:15:35.000Z",
  "source": "insuniverse-automation", 
  "version": "1.0.0",
  "metadata": {
    "dataKeys": ["metadata", "customer", "apis"],
    "dataSize": 15420,
    "jobId": 1,
    "customerName": "김지훈",
    "customerPhone": "010-2022-1053",
    "analysisId": "10106"
  },
  "data": { /* 위의 전체 수집 데이터 */ }
}
```

## 5. 데이터 활용 방안

### 5.1 즉시 활용 가능한 정보
- 고객 기본 정보 (이름, 전화번호, 생년월일)
- 분석 완료 상태 및 완료 시간
- 각 API별 데이터 항목 수

### 5.2 상세 분석 필요한 정보  
- 집계 데이터의 구체적인 통계 정보
- 기본 분석의 의료/보험 세부 내역
- PDF 보고서의 구조화된 내용

### 5.3 확장 가능한 기능
- 여러 고객의 데이터 일괄 수집
- 특정 기간별 데이터 필터링  
- 데이터 변화 추적 (정기 수집)
- 맞춤형 보고서 생성