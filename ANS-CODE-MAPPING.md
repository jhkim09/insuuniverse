# ANS 코드 매핑 가이드

## 📋 ANS 코드별 의미 분석

InsuniVerse API에서 사용하는 ANS 코드별 의미를 분석한 결과입니다.

### 🏥 건강보험 관련 (ANS001-006)

| ANS 코드 | 의미 | 설명 | API 타입 |
|----------|------|------|----------|
| **ANS001** | 진료내역 | 병원 진료 기록 | basic |
| **ANS002** | **통원/처방내역** ✅ | 외래 통원 및 약 처방 | basic |
| **ANS003** | **입원내역** | 입원 치료 기록 | aggregate/basic |
| **ANS004** | **수술내역** ✅ | 수술 기록 및 수술명 | basic |
| **ANS005** | **30일이상 투약** ✅ | 장기 투약 내역 | aggregate/basic |
| **ANS006** | 건강검진 | 건강검진 결과 | aggregate/basic |

### 🦷 치과/보험 관련 (ANS007-015)

| ANS 코드 | 의미 | 설명 | API 타입 |
|----------|------|------|----------|
| **ANS007** | **치과치료** ✅ | 치과 진료 내역 | basic |
| **ANS008** | **수술/시술** ✅ | 추가 수술 및 시술 | basic |
| **ANS009** | 의료기록 | 기타 의료 기록 | basic |
| **ANS010** | 생명보험 | 생명보험 관련 | basic |
| **ANS011** | 실손보험 | 실손보험 청구 가능 | aggregate/basic |
| **ANS012** | **치과보험** ✅ | 치과 보험 관련 | aggregate/basic |
| **ANS013** | 연금보험 | 연금보험 관련 | aggregate/basic |
| **ANS014** | 암보험 | 암 관련 보험 | aggregate/basic |
| **ANS015** | 운전자보험 | 운전자 보험 | aggregate/basic |

## 🔍 사용자 질문에 대한 답변

사용자가 언급한 내용과 매칭:
- ✅ **ANS002**: 통원 (처방내역 포함)
- ✅ **ANS003**: 입원내역 (30일 이상 입원 포함 가능)
- ✅ **ANS004**: 수술
- ✅ **ANS005**: 30일 이상 투약
- ✅ **ANS007**: 치과
- ✅ **ANS008**: 수술/시술 (추가)
- ✅ **ANS012**: 치과보험

## 📊 API 호출 구조

### Aggregate API (집계 데이터)
```javascript
// 질병 미보유자 (sicked=0)
/analyze/{id}/aggregate?page=1&ansType=ANS003&asbSicked=0

// 질병 보유자 (sicked=1)
/analyze/{id}/aggregate?page=1&ansType=ANS003&asbSicked=1
```

### Basic API (기본 분석)
```javascript
// 5년간 데이터
/analyze/{id}/basic?page=1&ansType=ANS004&searchYear=5
```

## 💡 데이터 그룹핑 로직

현재 코드에서 ANS 데이터를 다음과 같이 그룹핑:

1. **Aggregate (집계)**
   - ANS003, ANS005, ANS006, ANS013 등
   - 질병 보유/미보유자 구분 (sicked_0, sicked_1)

2. **Basic (기본 분석)**
   - ANS001~ANS015 전체
   - 5년간 상세 데이터

## 🎯 보험금 청구 핵심 ANS

보험금 청구시 가장 중요한 ANS 코드:

1. **ANS002** - 통원횟수, 통원일수
2. **ANS003** - 입원일수
3. **ANS004** - 수술명, 수술일
4. **ANS005** - 장기 투약일수 (30일 이상)
5. **ANS007** - 치과 치료비
6. **ANS008** - 추가 수술/시술

## 📝 참고사항

- 각 ANS 타입별로 반환되는 데이터 구조가 다름
- aggregate는 집계된 요약 정보
- basic은 개별 상세 정보
- 일부 ANS는 aggregate와 basic 모두에서 조회 가능

---

이 정보는 실제 API 응답과 코드 분석을 통해 추론한 내용입니다.
정확한 의미는 InsuniVerse API 문서를 참고하시기 바랍니다.