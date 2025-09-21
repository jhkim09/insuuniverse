# Make.com 실전 가이드 - 단순하고 확실한 방법

## 🎯 목표 재정의
복잡한 Iterator 대신, **핵심 정보만 추출**하여 하나의 레코드로 만들기

## 방법 1: 모든 데이터를 하나의 텍스트 필드로 저장

### Step 1: Webhook → JSON Parse
기본 설정 그대로 사용

### Step 2: Tools > Set Variable로 주요 정보만 추출

**변수 설정 예시:**
```
변수명: diseaseList
값: 아래 Make.com 표현식 사용
```

**Make.com 표현식 (실제로 작동하는 코드):**

```javascript
// 첫 번째 질병 정보 (있으면)
{{if(2.`0`.aggregate.ANS003.sicked_0.list[1].basic.asbDiseaseCode;
"질병1: " + 2.`0`.aggregate.ANS003.sicked_0.list[1].basic.asbDiseaseName +
" (" + 2.`0`.aggregate.ANS003.sicked_0.list[1].basic.asbDiseaseCode + ") - " +
2.`0`.aggregate.ANS003.sicked_0.list[1].basic.asbTreatStartDate + "
"; "")}}

// 두 번째 질병 정보 (있으면)
{{if(2.`0`.aggregate.ANS003.sicked_0.list[2].basic.asbDiseaseCode;
"질병2: " + 2.`0`.aggregate.ANS003.sicked_0.list[2].basic.asbDiseaseName +
" (" + 2.`0`.aggregate.ANS003.sicked_0.list[2].basic.asbDiseaseCode + ")
"; "")}}

// 이렇게 연결해서 하나의 텍스트로 만들기
```

### Step 3: Notion에 한 번에 저장

**Notion 필드 매핑:**

| Notion 필드 | Make.com 매핑 |
|------------|--------------|
| 제목 | {{3.customerName}}_{{3.analysisId}} |
| 고객정보 | 이름: {{3.customerName}}<br>전화: {{3.customerPhone}} |
| 질병요약 | {{3.diseaseList}} |
| 원본데이터 | {{1.value}} |

---

## 방법 2: 주요 질병 3개만 개별 필드로 저장

### Notion DB 구조 변경
```
- 질병1_코드 (Text)
- 질병1_이름 (Text)
- 질병1_시작일 (Date)
- 질병2_코드 (Text)
- 질병2_이름 (Text)
- 질병2_시작일 (Date)
- 질병3_코드 (Text)
- 질병3_이름 (Text)
- 질병3_시작일 (Date)
```

### Make.com 매핑
```javascript
// 질병1
질병1_코드: {{2.`0`.aggregate.ANS003.sicked_0.list[1].basic.asbDiseaseCode}}
질병1_이름: {{2.`0`.aggregate.ANS003.sicked_0.list[1].basic.asbDiseaseName}}
질병1_시작일: {{2.`0`.aggregate.ANS003.sicked_0.list[1].basic.asbTreatStartDate}}

// 질병2
질병2_코드: {{2.`0`.aggregate.ANS003.sicked_0.list[2].basic.asbDiseaseCode}}
질병2_이름: {{2.`0`.aggregate.ANS003.sicked_0.list[2].basic.asbDiseaseName}}
질병2_시작일: {{2.`0`.aggregate.ANS003.sicked_0.list[2].basic.asbTreatStartDate}}
```

---

## 방법 3: HTTP 모듈로 직접 Notion API 호출

### Step 1: HTTP > Make a Request 모듈 사용

**설정:**
- URL: `https://api.notion.com/v1/pages`
- Method: POST
- Headers:
  - Authorization: `Bearer {{YOUR_NOTION_API_KEY}}`
  - Content-Type: `application/json`
  - Notion-Version: `2022-06-28`

### Step 2: Body에 직접 JSON 작성

```json
{
  "parent": {
    "database_id": "7a54d3fab2fd4de5a64d9d46a6ddd0c4"
  },
  "properties": {
    "Name": {
      "title": [
        {
          "text": {
            "content": "{{2.`0`.`car-basic`.order.user.usrName}}"
          }
        }
      ]
    },
    "질병데이터": {
      "rich_text": [
        {
          "text": {
            "content": "{{toString(2.`0`.aggregate)}}"
          }
        }
      ]
    }
  }
}
```

---

## 방법 4: 웹훅 데이터를 서버에서 전처리

### 새로운 처리 흐름
```
원본 데이터 → Node.js 서버에서 전처리 → 단순화된 JSON → Make.com → Notion
```

### Node.js 전처리 서버 코드
```javascript
// preprocessor-server.js
app.post('/preprocess', async (req, res) => {
  const rawData = req.body;

  // 질병 데이터를 단순한 구조로 변환
  const simplified = {
    customer: {
      name: rawData[0]['car-basic'].order.user.usrName,
      phone: rawData[0]['car-basic'].order.user.usrPhone,
      analysisId: rawData[0]['car-basic'].order.orderDetail.oddId
    },
    diseases: [], // 최대 5개만
    summary: {
      totalDiseases: 0,
      hasOperation: false
    }
  };

  // 질병 데이터 수집 (ANS 종류와 무관하게)
  if (rawData[0].aggregate) {
    Object.values(rawData[0].aggregate).forEach(ansData => {
      if (ansData.sicked_0?.list) {
        ansData.sicked_0.list.forEach(item => {
          if (simplified.diseases.length < 5 && item.basic?.asbDiseaseCode) {
            simplified.diseases.push({
              code: item.basic.asbDiseaseCode,
              name: item.basic.asbDiseaseName,
              date: item.basic.asbTreatStartDate
            });
          }
        });
      }
    });
  }

  simplified.summary.totalDiseases = simplified.diseases.length;

  // Make.com 웹훅으로 전송
  await axios.post(process.env.MAKE_WEBHOOK_URL, simplified);

  res.json({ success: true });
});
```

---

## 🎯 권장 방법: 방법 2 (주요 정보만 개별 필드로)

**장점:**
- Iterator 불필요
- 단순하고 직관적
- 데이터 손실 없음 (원본은 따로 저장)
- Make.com 기본 모듈만 사용

**실제 Make.com 시나리오:**
1. Webhook
2. JSON Parse
3. Notion Create (직접 매핑)

**핵심 매핑 코드 (그대로 복사해서 사용):**
```
고객명: {{2.[0].car-basic.order.user.usrName}}
분석ID: {{2.[0].car-basic.order.orderDetail.oddId}}

질병1코드: {{if(2.[0].aggregate.ANS003.sicked_0.list[0].basic.asbDiseaseCode; 2.[0].aggregate.ANS003.sicked_0.list[0].basic.asbDiseaseCode; "없음")}}

질병1이름: {{if(2.[0].aggregate.ANS003.sicked_0.list[0].basic.asbDiseaseName; 2.[0].aggregate.ANS003.sicked_0.list[0].basic.asbDiseaseName; "없음")}}
```

## ⚠️ 주의사항

1. **대괄호 vs 백틱**: Make.com 버전에 따라 `{{2.[0]}}` 또는 `{{2.`0`}}` 사용
2. **빈 값 처리**: `{{if()}}` 함수로 빈 값 체크 필수
3. **텍스트 길이**: Notion 텍스트 필드는 2000자 제한

이 방법이 훨씬 간단하고 실용적입니다!