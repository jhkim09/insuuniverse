class DiseaseDetailConverter {
    constructor() {
        this.diseaseDbId = '7a54d3fab2fd4de5a64d9d46a6ddd0c4'; // 질병 상세 DB ID
    }

    // 질병 데이터를 개별 레코드 배열로 변환
    extractIndividualDiseases(jsonData) {
        const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;
        const diseases = [];
        const customerInfo = this.getBasicInfo(data);

        // aggregate 섹션에서 질병 데이터 추출
        if (data.aggregate) {
            Object.entries(data.aggregate).forEach(([ansCode, ansData]) => {
                // sicked_0 (질병 미보유자) 처리
                if (ansData.sicked_0?.list) {
                    ansData.sicked_0.list.forEach(item => {
                        if (item.basic?.asbDiseaseCode) {
                            diseases.push(this.createDiseaseRecord(
                                item,
                                customerInfo,
                                ansCode,
                                'sicked_0',
                                '질병미보유'
                            ));
                        }
                    });
                }

                // sicked_1 (질병 보유자) 처리
                if (ansData.sicked_1?.list) {
                    ansData.sicked_1.list.forEach(item => {
                        if (item.basic?.asbDiseaseCode) {
                            diseases.push(this.createDiseaseRecord(
                                item,
                                customerInfo,
                                ansCode,
                                'sicked_1',
                                '질병보유'
                            ));
                        }
                    });
                }
            });
        }

        // basic 섹션에서 질병 데이터 추출
        if (data.basic) {
            Object.entries(data.basic).forEach(([ansCode, ansData]) => {
                if (ansData.list) {
                    ansData.list.forEach(item => {
                        if (item.basic?.asbDiseaseCode) {
                            const sickedStatus = item.basic.asbSicked === 1 ? '질병보유' : '질병미보유';
                            diseases.push(this.createDiseaseRecord(
                                item,
                                customerInfo,
                                ansCode,
                                `sicked_${item.basic.asbSicked || 0}`,
                                sickedStatus
                            ));
                        }
                    });
                }
            });
        }

        return diseases;
    }

    // 개별 질병 레코드 생성
    createDiseaseRecord(diseaseItem, customerInfo, ansCode, sickedType, sickedStatus) {
        const basic = diseaseItem.basic || {};
        const detail = diseaseItem.detail || {};

        return {
            // 기본 식별 정보
            "질병ID": `${customerInfo.analysisId}_${basic.asbDiseaseCode}_${Date.now()}`,
            "분석ID_참조": String(customerInfo.analysisId),
            "고객명": customerInfo.name,
            "고객전화": customerInfo.phone,

            // 질병 정보
            "질병코드": basic.asbDiseaseCode || '',
            "질병명": basic.asbDiseaseName || '',
            "질병상태": sickedStatus,
            "ANS코드": ansCode,

            // 진료 정보
            "진료시작일": basic.asbTreatStartDate || null,
            "진료종료일": basic.asbTreatEndDate || null,
            "방문일수": basic.asbVisitDays || 0,
            "투약일수": basic.asbDosingDays || 0,

            // 병원 정보
            "병원명": basic.asbHospitalName || '',
            "진료과": basic.asbDepartment || '',
            "진료형태": basic.asbTreatType || '',

            // 보험 관련
            "보험진단가능성": basic.asbInDisease || '',
            "주의사항": basic.asbNotice || '',

            // 수술 정보
            "수술명": detail.asdOperation || '',
            "수술보험가능성": detail.asdInOperation || '',

            // 검사 정보
            "검사종류": detail.asdExamination || '',

            // 카운트 정보
            "질병카운트": basic.inDiseaseCount || 0,
            "주의카운트": basic.noticeCount || 0,
            "방문카운트": basic.visitDaysCount || 0,

            // 메타 정보
            "데이터소스": ansCode.startsWith('ANS') ? '기본분석' : '집계분석',
            "수집일시": new Date().toISOString(),
            "중복여부": basic.asbDuplicated === 1
        };
    }

    // 고객 기본 정보 추출
    getBasicInfo(data) {
        let info = {
            name: '',
            phone: '',
            analysisId: 0
        };

        if (data['car-basic']?.order) {
            const order = data['car-basic'].order;
            info.name = order.user?.usrName || '';
            info.phone = order.user?.usrPhone || '';
            info.analysisId = order.orderDetail?.oddId || 0;
        }

        return info;
    }

    // Make.com Iterator를 위한 배열 생성
    generateMakeIteratorPayload(jsonData) {
        const diseases = this.extractIndividualDiseases(jsonData);

        return {
            timestamp: new Date().toISOString(),
            source: 'disease-detail-converter',
            totalRecords: diseases.length,
            diseases: diseases  // Iterator가 처리할 배열
        };
    }
}

// 테스트 함수
async function testDiseaseExtraction() {
    const fs = require('fs').promises;

    try {
        const testData = JSON.parse(
            await fs.readFile('./data/test-new-format.json', 'utf8')
        );

        const converter = new DiseaseDetailConverter();
        const diseases = converter.extractIndividualDiseases(testData);

        console.log('📊 질병 데이터 추출 결과:');
        console.log('- 총 질병 레코드 수:', diseases.length);
        console.log('\n개별 질병 레코드:');

        diseases.forEach((disease, index) => {
            console.log(`\n[${index + 1}] ${disease.질병명}`);
            console.log(`  - 질병코드: ${disease.질병코드}`);
            console.log(`  - 진료기간: ${disease.진료시작일} ~ ${disease.진료종료일}`);
            console.log(`  - 병원: ${disease.병원명} (${disease.진료과})`);
            console.log(`  - 보험가능성: ${disease.보험진단가능성}`);
            console.log(`  - 수술: ${disease.수술명}`);
        });

        // Iterator용 페이로드 생성
        const iteratorPayload = converter.generateMakeIteratorPayload(testData);

        await fs.writeFile(
            './data/disease-iterator-payload.json',
            JSON.stringify(iteratorPayload, null, 2)
        );

        console.log('\n💾 Iterator 페이로드 저장: ./data/disease-iterator-payload.json');

        return diseases;

    } catch (error) {
        console.error('변환 실패:', error);
    }
}

// 모듈 내보내기
module.exports = DiseaseDetailConverter;

// 직접 실행시
if (require.main === module) {
    testDiseaseExtraction();
}