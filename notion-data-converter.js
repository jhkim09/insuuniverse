class NotionDataConverter {
    constructor() {
        this.databaseId = '7a54d3fab2fd4de5a64d9d46a6ddd0c4';
    }

    convertToNotionFormat(jsonData) {
        // 첫 번째 객체에서 데이터 추출 (배열이라고 가정)
        const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;

        // 기본 고객 정보 추출
        const customerInfo = this.extractCustomerInfo(data);

        // 집계 데이터 추출
        const aggregateData = this.extractAggregateData(data);

        // 기본 분석 데이터 추출
        const basicAnalysisData = this.extractBasicAnalysisData(data);

        // 주요 질병 정보 추출
        const diseaseInfo = this.extractDiseaseInfo(data);

        // 수술 정보 추출
        const operationInfo = this.extractOperationInfo(data);

        // Notion 데이터베이스 형식으로 변환
        return {
            // 기본 정보
            "고객명": customerInfo.name,
            "전화번호": customerInfo.phone,
            "생년월일": customerInfo.birth,
            "분석ID": customerInfo.analysisId,
            "거래ID": customerInfo.transactionId,
            "분석상태": customerInfo.state,

            // 날짜 정보
            "분석완료일": new Date().toISOString().split('T')[0],
            "수집일시": new Date().toISOString(),

            // 집계 정보
            "질병미보유자수": aggregateData.sickedZeroCount,
            "질병보유자수": aggregateData.sickedOneCount,
            "건강보험항목수": basicAnalysisData.healthInsuranceCount,
            "일반분석항목수": basicAnalysisData.generalCount,

            // 질병 및 진단 정보
            "주요질병코드": diseaseInfo.codes.slice(0, 3).join(', '),
            "주요질병명": diseaseInfo.names.slice(0, 3).join(', '),
            "보험진단가능성": diseaseInfo.insurancePossibilities.slice(0, 2).join(' / '),

            // 수술 정보
            "수술이력": operationInfo.operations.slice(0, 3).join(', '),
            "수술가능성": operationInfo.operationInsights.join(' / '),

            // 상태 정보
            "처리상태": "처리완료",
            "데이터소스": "API"
        };
    }

    extractCustomerInfo(data) {
        // 여러 위치에서 고객 정보를 찾음
        let customerInfo = {
            name: '',
            phone: '',
            birth: '',
            analysisId: 0,
            transactionId: '',
            state: ''
        };

        // car-basic에서 정보 추출
        if (data['car-basic']?.order) {
            const order = data['car-basic'].order;
            customerInfo.name = order.user?.usrName || '';
            customerInfo.phone = order.user?.usrPhone || '';
            customerInfo.birth = order.user?.usrBirth || '';
            customerInfo.analysisId = order.orderDetail?.oddId || 0;
            customerInfo.transactionId = order.orderDetail?.oddTransactionId || '';
            customerInfo.state = order.orderDetail?.oddState || '';
        }

        // aggregate에서 백업 정보 추출
        if (!customerInfo.name && data.aggregate) {
            const firstAggregate = Object.values(data.aggregate)[0];
            if (firstAggregate?.sicked_0?.order) {
                const order = firstAggregate.sicked_0.order;
                customerInfo.name = customerInfo.name || order.user?.usrName || '';
                customerInfo.phone = customerInfo.phone || order.user?.usrPhone || '';
                customerInfo.birth = customerInfo.birth || order.user?.usrBirth || '';
                customerInfo.analysisId = customerInfo.analysisId || order.orderDetail?.oddId || 0;
                customerInfo.state = customerInfo.state || order.orderDetail?.oddState || '';
            }
        }

        return customerInfo;
    }

    extractAggregateData(data) {
        let sickedZeroCount = 0;
        let sickedOneCount = 0;

        if (data.aggregate) {
            Object.values(data.aggregate).forEach(item => {
                if (item.sicked_0) {
                    sickedZeroCount += item.sicked_0.count || 0;
                }
                if (item.sicked_1) {
                    sickedOneCount += item.sicked_1.count || 0;
                }
            });
        }

        return {
            sickedZeroCount,
            sickedOneCount
        };
    }

    extractBasicAnalysisData(data) {
        let healthInsuranceCount = 0;
        let generalCount = 0;

        if (data.basic) {
            Object.entries(data.basic).forEach(([key, value]) => {
                if (value?.count) {
                    // ANS001-ANS006은 건강보험
                    if (['ANS001', 'ANS002', 'ANS003', 'ANS004', 'ANS005', 'ANS006'].includes(key)) {
                        healthInsuranceCount += value.count;
                    }
                    // ANS007-ANS013은 일반
                    else if (['ANS007', 'ANS008', 'ANS009', 'ANS010', 'ANS011', 'ANS012', 'ANS013'].includes(key)) {
                        generalCount += value.count;
                    }
                }
            });
        }

        return {
            healthInsuranceCount,
            generalCount
        };
    }

    extractDiseaseInfo(data) {
        const diseases = {
            codes: [],
            names: [],
            insurancePossibilities: []
        };

        // aggregate에서 질병 정보 추출
        if (data.aggregate) {
            Object.values(data.aggregate).forEach(item => {
                ['sicked_0', 'sicked_1'].forEach(sickedKey => {
                    if (item[sickedKey]?.list) {
                        item[sickedKey].list.forEach(listItem => {
                            if (listItem.basic) {
                                // 질병 코드와 이름 추가
                                if (listItem.basic.asbDiseaseCode && !diseases.codes.includes(listItem.basic.asbDiseaseCode)) {
                                    diseases.codes.push(listItem.basic.asbDiseaseCode);
                                    diseases.names.push(listItem.basic.asbDiseaseName || '');
                                }

                                // 보험 진단 가능성 추가
                                if (listItem.basic.asbInDisease && !diseases.insurancePossibilities.includes(listItem.basic.asbInDisease)) {
                                    diseases.insurancePossibilities.push(listItem.basic.asbInDisease);
                                }
                            }
                        });
                    }
                });
            });
        }

        // basic에서 추가 질병 정보 추출
        if (data.basic) {
            Object.values(data.basic).forEach(item => {
                if (item.list) {
                    item.list.forEach(listItem => {
                        if (listItem.basic) {
                            // 질병 코드와 이름 추가
                            if (listItem.basic.asbDiseaseCode && !diseases.codes.includes(listItem.basic.asbDiseaseCode)) {
                                diseases.codes.push(listItem.basic.asbDiseaseCode);
                                diseases.names.push(listItem.basic.asbDiseaseName || '');
                            }

                            // 보험 진단 가능성 추가
                            if (listItem.basic.asbInDisease && !diseases.insurancePossibilities.includes(listItem.basic.asbInDisease)) {
                                diseases.insurancePossibilities.push(listItem.basic.asbInDisease);
                            }
                        }
                    });
                }
            });
        }

        return diseases;
    }

    extractOperationInfo(data) {
        const operations = [];
        const operationInsights = [];

        // aggregate에서 수술 정보 추출
        if (data.aggregate) {
            Object.values(data.aggregate).forEach(item => {
                ['sicked_0', 'sicked_1'].forEach(sickedKey => {
                    if (item[sickedKey]?.list) {
                        item[sickedKey].list.forEach(listItem => {
                            if (listItem.detail?.asdOperation) {
                                if (!operations.includes(listItem.detail.asdOperation)) {
                                    operations.push(listItem.detail.asdOperation);
                                }
                            }
                            if (listItem.detail?.asdInOperation) {
                                if (!operationInsights.includes(listItem.detail.asdInOperation)) {
                                    operationInsights.push(listItem.detail.asdInOperation);
                                }
                            }
                        });
                    }
                });
            });
        }

        // basic에서 수술 정보 추출
        if (data.basic) {
            Object.values(data.basic).forEach(item => {
                if (item.list) {
                    item.list.forEach(listItem => {
                        if (listItem.detail?.asdOperation) {
                            if (!operations.includes(listItem.detail.asdOperation)) {
                                operations.push(listItem.detail.asdOperation);
                            }
                        }
                        if (listItem.detail?.asdInOperation) {
                            if (!operationInsights.includes(listItem.detail.asdInOperation)) {
                                operationInsights.push(listItem.detail.asdInOperation);
                            }
                        }
                    });
                }
            });
        }

        return {
            operations,
            operationInsights
        };
    }

    // Make.com 웹훅용 페이로드 생성
    generateMakePayload(jsonData) {
        const notionData = this.convertToNotionFormat(jsonData);

        return {
            timestamp: new Date().toISOString(),
            source: 'insuniverse-api',
            notion: {
                database_id: this.databaseId,
                properties: notionData
            },
            raw_data: jsonData
        };
    }
}

// 테스트 함수
async function testConversion() {
    const fs = require('fs').promises;

    try {
        // 테스트 데이터 파일 읽기
        const testDataPath = './data/test-new-format.json';
        const sampleData = JSON.parse(await fs.readFile(testDataPath, 'utf8'));

        console.log('📄 테스트 데이터 로드 완료');
        console.log('- car-basic 존재:', !!sampleData[0]['car-basic']);
        console.log('- aggregate 존재:', !!sampleData[0].aggregate);
        console.log('- basic 존재:', !!sampleData[0].basic);

        const converter = new NotionDataConverter();
        const notionFormat = converter.convertToNotionFormat(sampleData);

        console.log('\n✅ Notion 데이터베이스 형식으로 변환 완료:');
        console.log(JSON.stringify(notionFormat, null, 2));

        // Make.com 페이로드 생성
        const makePayload = converter.generateMakePayload(sampleData);

        // 결과 저장
        await fs.writeFile(
            './data/notion-converted-data.json',
            JSON.stringify(makePayload, null, 2)
        );

        console.log('\n💾 변환된 데이터 저장: ./data/notion-converted-data.json');
        console.log('\n📊 데이터 요약:');
        console.log('- 고객명:', notionFormat['고객명']);
        console.log('- 분석ID:', notionFormat['분석ID']);
        console.log('- 질병 코드:', notionFormat['주요질병코드']);
        console.log('- 수술 이력:', notionFormat['수술이력']);

        return notionFormat;

    } catch (error) {
        console.error('변환 실패:', error);
    }
}

// 모듈로 내보내기
module.exports = NotionDataConverter;

// 직접 실행시 테스트
if (require.main === module) {
    testConversion();
}