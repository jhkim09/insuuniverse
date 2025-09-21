class NotionDualDatabaseConverter {
    constructor() {
        // 두 개의 데이터베이스 ID
        this.customerDbId = '68206104bd0e4d9baf1cb705d765ea31'; // 고객 마스터 DB
        this.analysisDbId = '7a54d3fab2fd4de5a64d9d46a6ddd0c4'; // 분석 상세 DB
    }

    // 메인 변환 함수
    convertToNotionFormat(jsonData) {
        const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;

        // 고객 마스터 DB 데이터
        const customerData = this.extractCustomerData(data);

        // 분석 상세 DB 데이터
        const analysisData = this.extractAnalysisData(data);

        return {
            customerDatabase: customerData,
            analysisDatabase: analysisData
        };
    }

    // 고객 마스터 데이터베이스용 데이터 추출
    extractCustomerData(data) {
        const customerInfo = this.getBasicCustomerInfo(data);

        return {
            // 기본 고객 정보
            "고객명": customerInfo.name,
            "전화번호": customerInfo.phone,
            "생년월일": customerInfo.birth,

            // 회원 정보
            "회원ID": customerInfo.loginId,
            "회원타입": "일반", // 기본값

            // 주문 정보
            "주문번호": `ORD-${customerInfo.analysisId}`,
            "상품명": "Insight Plan Basic",

            // 분석 상태
            "분석ID": customerInfo.analysisId,
            "거래ID": customerInfo.transactionId,
            "분석상태": customerInfo.state,
            "분석완료": customerInfo.state === "분석완료" ? new Date().toISOString() : null,

            // 시스템 정보
            "수집시간": new Date().toISOString(),
            "데이터소스": "API",
            "수집서버": "Render"
        };
    }

    // 분석 상세 데이터베이스용 데이터 추출
    extractAnalysisData(data) {
        const customerInfo = this.getBasicCustomerInfo(data);
        const aggregateStats = this.calculateAggregateStats(data);
        const basicStats = this.calculateBasicStats(data);
        const diseaseInfo = this.extractDiseaseDetails(data);

        return {
            // 기본 정보
            "분석ID": String(customerInfo.analysisId), // Title 필드이므로 문자열로
            "고객참조": customerInfo.name, // Relation 필드 - 고객 마스터 DB와 연결
            "거래ID": customerInfo.transactionId,
            "수집일시": new Date().toISOString(),

            // 차량 보험 데이터
            "차량기본_수": data['car-basic']?.count || 0,
            "차량기본_리스트": JSON.stringify(data['car-basic']?.list || []),
            "차량손해_존재": !!data['car-damage'],
            "차량보험_존재": !!data['car-insurance'],

            // 의료 데이터 (ANS001-006)
            "진료내역_수": basicStats.ANS001 || 0,
            "처방내역_수": basicStats.ANS002 || 0,
            "입원내역_수": basicStats.ANS003 || 0,
            "수술내역_수": basicStats.ANS004 || 0,
            "특정질병_수": basicStats.ANS005 || 0,
            "건강검진_수": basicStats.ANS006 || 0,

            // 보험 데이터 (ANS007-015)
            "건강보험_수": basicStats.ANS007 || 0,
            "일반보험_수": basicStats.ANS008 || 0,
            "의료기록_수": basicStats.ANS009 || 0,
            "생명보험_수": basicStats.ANS010 || 0,
            "실손보험_수": basicStats.ANS011 || 0,
            "암보험_수": basicStats.ANS012 || 0,
            "연금보험_수": basicStats.ANS013 || 0,

            // 집계 데이터 - 질병 미보유자
            "집계_ANS003_미보유_수": aggregateStats.ANS003?.sicked_0 || 0,
            "집계_ANS003_미보유_데이터": JSON.stringify(aggregateStats.ANS003?.sicked_0_data || []),
            "집계_ANS005_미보유_수": aggregateStats.ANS005?.sicked_0 || 0,
            "집계_ANS006_미보유_수": aggregateStats.ANS006?.sicked_0 || 0,

            // 집계 데이터 - 질병 보유자
            "집계_ANS003_보유_수": aggregateStats.ANS003?.sicked_1 || 0,
            "집계_ANS003_보유_데이터": JSON.stringify(aggregateStats.ANS003?.sicked_1_data || []),
            "집계_ANS005_보유_수": aggregateStats.ANS005?.sicked_1 || 0,
            "집계_ANS006_보유_수": aggregateStats.ANS006?.sicked_1 || 0,
            "집계_ANS013_보유_수": aggregateStats.ANS013?.sicked_1 || 0,

            // 보상 찾아줘 데이터
            "보상_진단코드": diseaseInfo.primaryDiseaseCode,
            "보상_진료시작일": diseaseInfo.treatmentStartDate,
            "보상_진료종료일": diseaseInfo.treatmentEndDate,
            "보상_숨은보험내용": diseaseInfo.insurancePossibilities,
            "보상_총건수": diseaseInfo.totalCompensationCount,
            "보상_전체리스트": JSON.stringify(diseaseInfo.compensationList),

            // 통계
            "질병보유여부": diseaseInfo.hasDiseases,
            "원본JSON백업": JSON.stringify(data) // 전체 원본 데이터 백업
        };
    }

    // 기본 고객 정보 추출
    getBasicCustomerInfo(data) {
        let info = {
            name: '',
            phone: '',
            birth: '',
            loginId: '',
            analysisId: 0,
            transactionId: '',
            state: ''
        };

        // car-basic에서 정보 추출
        if (data['car-basic']?.order) {
            const order = data['car-basic'].order;
            info.name = order.user?.usrName || '';
            info.phone = order.user?.usrPhone || '';
            info.birth = order.user?.usrBirth || '';
            info.loginId = order.member?.memLoginId || '';
            info.analysisId = order.orderDetail?.oddId || 0;
            info.transactionId = order.orderDetail?.oddTransactionId || '';
            info.state = order.orderDetail?.oddState || '';
        }

        // aggregate에서 백업 정보 추출
        if (!info.name && data.aggregate) {
            const firstAggregate = Object.values(data.aggregate)[0];
            if (firstAggregate?.sicked_0?.order) {
                const order = firstAggregate.sicked_0.order;
                info.name = info.name || order.user?.usrName || '';
                info.phone = info.phone || order.user?.usrPhone || '';
                info.birth = info.birth || order.user?.usrBirth || '';
                info.loginId = info.loginId || order.member?.memLoginId || '';
                info.analysisId = info.analysisId || order.orderDetail?.oddId || 0;
                info.transactionId = info.transactionId || order.orderDetail?.oddTransactionId || '';
                info.state = info.state || order.orderDetail?.oddState || '';
            }
        }

        return info;
    }

    // 집계 데이터 계산
    calculateAggregateStats(data) {
        const stats = {};

        if (data.aggregate) {
            Object.entries(data.aggregate).forEach(([key, value]) => {
                stats[key] = {
                    sicked_0: value.sicked_0?.count || 0,
                    sicked_0_data: value.sicked_0?.list || [],
                    sicked_1: value.sicked_1?.count || 0,
                    sicked_1_data: value.sicked_1?.list || []
                };
            });
        }

        return stats;
    }

    // 기본 분석 데이터 계산
    calculateBasicStats(data) {
        const stats = {};

        if (data.basic) {
            Object.entries(data.basic).forEach(([key, value]) => {
                stats[key] = value.count || 0;
            });
        }

        return stats;
    }

    // 질병 상세 정보 추출
    extractDiseaseDetails(data) {
        const diseases = [];
        const operations = [];
        const insurancePossibilities = [];
        let treatmentStartDate = null;
        let treatmentEndDate = null;
        let hasDiseases = false;

        // aggregate에서 질병 정보 추출
        if (data.aggregate) {
            Object.values(data.aggregate).forEach(item => {
                ['sicked_0', 'sicked_1'].forEach(sickedKey => {
                    if (item[sickedKey]?.list) {
                        item[sickedKey].list.forEach(listItem => {
                            if (listItem.basic) {
                                // 질병 코드 수집
                                if (listItem.basic.asbDiseaseCode) {
                                    diseases.push({
                                        code: listItem.basic.asbDiseaseCode,
                                        name: listItem.basic.asbDiseaseName,
                                        startDate: listItem.basic.asbTreatStartDate,
                                        endDate: listItem.basic.asbTreatEndDate
                                    });
                                    hasDiseases = true;
                                }

                                // 날짜 정보 수집
                                if (listItem.basic.asbTreatStartDate && (!treatmentStartDate || listItem.basic.asbTreatStartDate < treatmentStartDate)) {
                                    treatmentStartDate = listItem.basic.asbTreatStartDate;
                                }
                                if (listItem.basic.asbTreatEndDate && (!treatmentEndDate || listItem.basic.asbTreatEndDate > treatmentEndDate)) {
                                    treatmentEndDate = listItem.basic.asbTreatEndDate;
                                }

                                // 보험 가능성 수집
                                if (listItem.basic.asbInDisease) {
                                    insurancePossibilities.push(listItem.basic.asbInDisease);
                                }
                            }

                            // 수술 정보 수집
                            if (listItem.detail?.asdOperation) {
                                operations.push(listItem.detail.asdOperation);
                            }
                        });
                    }
                });
            });
        }

        // basic에서 추가 정보 추출
        if (data.basic) {
            Object.values(data.basic).forEach(item => {
                if (item.list) {
                    item.list.forEach(listItem => {
                        if (listItem.detail?.asdOperation) {
                            operations.push(listItem.detail.asdOperation);
                        }
                        if (listItem.basic?.asbInDisease) {
                            insurancePossibilities.push(listItem.basic.asbInDisease);
                        }
                    });
                }
            });
        }

        return {
            primaryDiseaseCode: diseases[0]?.code || '',
            treatmentStartDate: treatmentStartDate,
            treatmentEndDate: treatmentEndDate,
            insurancePossibilities: insurancePossibilities.slice(0, 3).join(' / '),
            totalCompensationCount: diseases.length,
            compensationList: diseases,
            hasDiseases: hasDiseases
        };
    }

    // Make.com 웹훅용 페이로드 생성
    generateMakePayload(jsonData) {
        const notionData = this.convertToNotionFormat(jsonData);

        return {
            timestamp: new Date().toISOString(),
            source: 'insuniverse-api',

            // 고객 마스터 DB 데이터
            customerDatabase: {
                database_id: this.customerDbId,
                properties: notionData.customerDatabase
            },

            // 분석 상세 DB 데이터
            analysisDatabase: {
                database_id: this.analysisDbId,
                properties: notionData.analysisDatabase
            },

            // 원본 데이터
            raw_data: jsonData
        };
    }
}

// 테스트 함수
async function testDualDatabaseConversion() {
    const fs = require('fs').promises;

    try {
        // 테스트 데이터 로드
        const testDataPath = './data/test-new-format.json';
        const jsonData = JSON.parse(await fs.readFile(testDataPath, 'utf8'));

        console.log('📄 데이터 로드 완료');

        const converter = new NotionDualDatabaseConverter();
        const result = converter.convertToNotionFormat(jsonData);

        console.log('\n✅ 고객 마스터 DB 데이터:');
        console.log(JSON.stringify(result.customerDatabase, null, 2));

        console.log('\n✅ 분석 상세 DB 데이터:');
        console.log('- 분석ID:', result.analysisDatabase['분석ID']);
        console.log('- 고객참조:', result.analysisDatabase['고객참조']);
        console.log('- 집계 데이터 포함:', !!result.analysisDatabase['집계_ANS003_미보유_수']);

        // Make.com 페이로드 생성
        const makePayload = converter.generateMakePayload(jsonData);

        // 결과 저장
        await fs.writeFile(
            './data/notion-dual-db-payload.json',
            JSON.stringify(makePayload, null, 2)
        );

        console.log('\n💾 변환된 데이터 저장: ./data/notion-dual-db-payload.json');
        console.log('\n📊 데이터베이스 연결:');
        console.log('- 고객 DB ID:', converter.customerDbId);
        console.log('- 분석 DB ID:', converter.analysisDbId);
        console.log('- 관계 필드: 고객참조 → 고객명');

        return result;

    } catch (error) {
        console.error('변환 실패:', error);
    }
}

// 모듈 내보내기
module.exports = NotionDualDatabaseConverter;

// 직접 실행시 테스트
if (require.main === module) {
    testDualDatabaseConversion();
}