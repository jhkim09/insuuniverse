# Insuniverse → Notion 데이터베이스 상세 매핑

## 📊 Database 1: 고객 마스터 정보
**ID: `68206104bd0e4d9baf1cb705d765ea31`**

### 기본 고객 정보
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 고객명 | Title | `latestOrder.user.usrName` | 메인 식별자 |
| 전화번호 | Phone | `latestOrder.user.usrPhone` | |
| 생년월일 | Text | `latestOrder.user.usrBirth` | YYMMDD 형식 |
| 나이 | Formula | `YEAR(TODAY()) - (1900 + NUMBER(LEFT(생년월일, 2)))` | 자동 계산 |

### 회원 정보
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 회원ID | Text | `latestOrder.member.memLoginId` | |
| 회원타입 | Select | `latestOrder.member.memType` | 일반/특별/VIP |
| 소속대리점 | Text | `latestOrder.member.memAgency` | |
| 대리점코드 | Text | `latestOrder.agency` | null 가능 |

### 주문 정보
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 주문번호 | Text | `latestOrder.order.ordOid` | Unique |
| 구독번호 | Text | `latestOrder.subscribe.subNumber` | |
| 상품코드 | Text | `latestOrder.order.ordProductCode` | |
| 상품명 | Select | `latestOrder.order.ordProductName` | Insight Plan 종류 |

### 분석 상태
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 분석ID | Number | `oddId` | 고유 식별자 |
| 거래ID | Text | `latestOrder.orderDetail.oddTransactionId` | MongoDB ID |
| 분석상태 | Status | `latestOrder.orderDetail.oddState` | 분석완료/진행중/실패 |
| 노출상태 | Select | `latestOrder.orderDetail.oddShow` | 노출/비노출 |
| 분석시작 | Date | `latestOrder.orderDetail.oddCreatedAt` | |
| 분석완료 | Date | `latestOrder.orderDetail.oddCompletedAt` | |
| 최종수정 | Date | `latestOrder.orderDetail.oddUpdatedAt` | |
| 실패시간 | Date | `latestOrder.orderDetail.oddFailedAt` | null 가능 |

### 구독 정보 (Subscription)
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 구독상태 | Select | `subscription.status` | 활성/비활성 |
| 구독시작일 | Date | `subscription.startDate` | |
| 구독만료일 | Date | `subscription.endDate` | |
| 구독플랜 | Select | `subscription.planName` | |
| 구독금액 | Number | `subscription.amount` | |
| 자동갱신 | Checkbox | `subscription.autoRenew` | |

### 알람 정보 (Alarm)
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 알람총개수 | Number | `alarm.totalCnt` | |
| 미확인알람 | Number | `alarm.unreadCount` | |
| 최근알람일시 | Date | `alarm.list[0].createdAt` | |
| 최근알람내용 | Text | `alarm.list[0].message` | |
| 알람리스트 | Text | `JSON.stringify(alarm.list)` | 전체 알람 |

### 시스템 정보
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 수집시간 | Date | `extractedAt` | ISO 8601 |
| 총주문수 | Number | `totalOrders` | |
| 회원번호 | Number | `memId` | 808 |
| 데이터소스 | Select | 고정값: "API" | |
| 수집서버 | Text | 고정값: "Render" | |

---

## 📊 Database 2: 분석 상세 데이터
**ID: `7a54d3fab2fd4de5a64d9d46a6ddd0c4`**

### 기본 정보
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 분석ID | Title | `oddId` | Primary Key |
| 고객참조 | Relation | DB1 연결 | 고객명으로 매칭 |
| 거래ID | Text | `latestOrder.orderDetail.oddTransactionId` | |
| 수집일시 | Date | `extractedAt` | |

### 차량 보험 데이터
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 차량기본_수 | Number | `analysisDetail.car-basic.count` | |
| 차량기본_리스트 | Text | `JSON.stringify(analysisDetail.car-basic.list)` | |
| 차량손해_존재 | Checkbox | `analysisDetail.car-damage !== null` | |
| 차량보험_존재 | Checkbox | `analysisDetail.car-insurance !== null` | |

### 의료 데이터 (Basic ANS001-006)
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 진료내역_수 | Number | `analysisDetail.basic.ANS001.count` | |
| 진료내역_데이터 | Text | `JSON.stringify(analysisDetail.basic.ANS001.list)` | |
| 처방내역_수 | Number | `analysisDetail.basic.ANS002.count` | |
| 처방내역_데이터 | Text | `JSON.stringify(analysisDetail.basic.ANS002.list)` | |
| 입원내역_수 | Number | `analysisDetail.basic.ANS003.count` | |
| 입원내역_데이터 | Text | `JSON.stringify(analysisDetail.basic.ANS003.list)` | |
| 수술내역_수 | Number | `analysisDetail.basic.ANS004.count` | |
| 수술내역_데이터 | Text | `JSON.stringify(analysisDetail.basic.ANS004.list)` | |
| 특정질병_수 | Number | `analysisDetail.basic.ANS005.count` | |
| 특정질병_데이터 | Text | `JSON.stringify(analysisDetail.basic.ANS005.list)` | |
| 건강검진_수 | Number | `analysisDetail.basic.ANS006.count` | |
| 건강검진_데이터 | Text | `JSON.stringify(analysisDetail.basic.ANS006.list)` | |

### 보험 데이터 (Basic ANS007-010)
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 건강보험_수 | Number | `analysisDetail.basic.ANS007.count` | |
| 건강보험_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS007.list)` | |
| 일반보험_수 | Number | `analysisDetail.basic.ANS008.count` | |
| 일반보험_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS008.list)` | |
| 의료기록_수 | Number | `analysisDetail.basic.ANS009.count` | |
| 의료기록_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS009.list)` | |
| 생명보험_수 | Number | `analysisDetail.basic.ANS010.count` | |
| 생명보험_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS010.list)` | |

### 추가 분석 데이터 (Basic ANS011-015)
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 실손보험_수 | Number | `analysisDetail.basic.ANS011.count` | |
| 실손보험_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS011.list)` | |
| 암보험_수 | Number | `analysisDetail.basic.ANS012.count` | |
| 암보험_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS012.list)` | |
| 연금보험_수 | Number | `analysisDetail.basic.ANS013.count` | |
| 연금보험_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS013.list)` | |
| 치과보험_수 | Number | `analysisDetail.basic.ANS014.count` | |
| 치과보험_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS014.list)` | |
| 운전자보험_수 | Number | `analysisDetail.basic.ANS015.count` | |
| 운전자보험_상세 | Text | `JSON.stringify(analysisDetail.basic.ANS015.list)` | |

### 집계 데이터 - 질병 미보유자 (sicked_0)
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 집계_ANS003_미보유_수 | Number | `analysisDetail.aggregate.ANS003.sicked_0.count` | |
| 집계_ANS003_미보유_데이터 | Text | `JSON.stringify(analysisDetail.aggregate.ANS003.sicked_0.list)` | |
| 집계_ANS005_미보유_수 | Number | `analysisDetail.aggregate.ANS005.sicked_0.count` | |
| 집계_ANS005_미보유_데이터 | Text | `JSON.stringify(analysisDetail.aggregate.ANS005.sicked_0.list)` | |
| 집계_ANS006_미보유_수 | Number | `analysisDetail.aggregate.ANS006.sicked_0.count` | |
| 집계_ANS006_미보유_데이터 | Text | `JSON.stringify(analysisDetail.aggregate.ANS006.sicked_0.list)` | |

### 집계 데이터 - 질병 보유자 (sicked_1)
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 집계_ANS003_보유_수 | Number | `analysisDetail.aggregate.ANS003.sicked_1.count` | |
| 집계_ANS003_보유_데이터 | Text | `JSON.stringify(analysisDetail.aggregate.ANS003.sicked_1.list)` | |
| 집계_ANS005_보유_수 | Number | `analysisDetail.aggregate.ANS005.sicked_1.count` | |
| 집계_ANS005_보유_데이터 | Text | `JSON.stringify(analysisDetail.aggregate.ANS005.sicked_1.list)` | |
| 집계_ANS006_보유_수 | Number | `analysisDetail.aggregate.ANS006.sicked_1.count` | |
| 집계_ANS006_보유_데이터 | Text | `JSON.stringify(analysisDetail.aggregate.ANS006.sicked_1.list)` | |
| 집계_ANS013_보유_수 | Number | `analysisDetail.aggregate.ANS013.sicked_1.count` | |
| 집계_ANS013_보유_데이터 | Text | `JSON.stringify(analysisDetail.aggregate.ANS013.sicked_1.list)` | |

### 보상 찾아줘 데이터 (Compensation)
| Notion 필드명 | 속성 타입 | JSON 경로 | 설명 |
|-------------|----------|-----------|------|
| 보상_진단코드 | Text | `analysisDetail.compensation.list[0].진단코드` | S9230 등 |
| 보상_진료시작일 | Date | `analysisDetail.compensation.list[0].진료시작일` | |
| 보상_진료종료일 | Date | `analysisDetail.compensation.list[0].진료종료일` | |
| 보상_진단건수 | Number | `analysisDetail.compensation.list[0].진단건수` | 12건 등 |
| 보상_숨은보험내용 | Text | `analysisDetail.compensation.list[0].숨은보험내용` | 상세 설명 |
| 보상_총건수 | Number | `analysisDetail.compensation.count` | |
| 보상_전체리스트 | Text | `JSON.stringify(analysisDetail.compensation.list)` | |

### 통계 및 요약
| Notion 필드명 | 속성 타입 | 계산식 | 설명 |
|-------------|----------|--------|------|
| 총_의료기록_수 | Formula | `진료내역_수 + 처방내역_수 + 입원내역_수 + 수술내역_수` | |
| 총_보험가입_수 | Formula | `건강보험_수 + 일반보험_수 + 생명보험_수` | |
| 질병보유여부 | Checkbox | `집계_ANS003_보유_수 > 0 OR 집계_ANS005_보유_수 > 0` | |
| 데이터완성도 | Formula | `(COUNT(NOT_EMPTY_FIELDS) / TOTAL_FIELDS) * 100` | % |
| 원본JSON백업 | File | 전체 JSON 파일 첨부 | |

---

## 🔧 Make.com 모듈 설정

### 1. Webhook 모듈
```
Webhook URL: https://hook.eu2.make.com/xxxxx
```

### 2. JSON Parse 모듈
```
JSON String: {{1.value}}
```

### 3. Router (분기 처리)
- **Route 1**: Database 1 생성
- **Route 2**: Database 2 생성 (1번 완료 후)

### 4. Notion Create Database Item (DB1)
각 필드에 위 표의 JSON 경로 매핑

### 5. Notion Create Database Item (DB2)
- Relation 필드: DB1의 생성된 ID 참조
- 각 필드에 위 표의 JSON 경로 매핑

### 6. Error Handler
실패 시 Slack/Email 알림

### 7. 데이터 변환 함수들
```javascript
// 날짜 변환
{{parseDate(oddCompletedAt; "YYYY-MM-DD HH:mm:ss")}}

// null 체크
{{if(analysisDetail.basic.ANS011; analysisDetail.basic.ANS011.count; 0)}}

// JSON 문자열화
{{JSON.stringify(analysisDetail.basic.ANS007.list)}}

// 배열 길이
{{length(orders)}}
```

이 상세 매핑을 Make.com에서 사용하시면 모든 데이터를 빠짐없이 Notion에 저장할 수 있습니다!