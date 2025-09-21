// ANS 타입별 데이터 분리를 위한 개선된 전처리기

class EnhancedPreprocessor {
    constructor() {
        // ANS 코드 매핑 정의
        this.ANS_MAPPING = {
            ANS001: { name: '진료내역', category: '진료' },
            ANS002: { name: '통원/처방', category: '통원' },
            ANS003: { name: '입원', category: '입원' },
            ANS004: { name: '수술', category: '수술' },
            ANS005: { name: '장기투약', category: '투약' },
            ANS006: { name: '건강검진', category: '검진' },
            ANS007: { name: '치과치료', category: '치과' },
            ANS008: { name: '시술', category: '시술' },
            ANS009: { name: '의료기록', category: '기타' },
            ANS010: { name: '생명보험', category: '보험' },
            ANS011: { name: '실손보험', category: '보험' },
            ANS012: { name: '치과보험', category: '치과' },
            ANS013: { name: '연금보험', category: '보험' }
        };
    }

    // 메인 전처리 함수
    preprocessWithANS(rawData) {
        const data = Array.isArray(rawData) ? rawData[0] : rawData;

        // 1. 고객 정보 추출
        const customerInfo = this.extractCustomerInfo(data);

        // 2. ANS별로 데이터 분류
        const ansGroupedData = this.groupByANSType(data);

        // 3. 질병별 상세 데이터 (ANS 타입 포함)
        const diseases = this.extractDiseasesWithANS(data);

        // 4. ANS별 요약 통계
        const ansSummary = this.generateANSSummary(ansGroupedData);

        return {
            // === 고객 기본 정보 ===
            customer_info: customerInfo,

            // === ANS별 요약 ===
            ans_summary: ansSummary,

            // === 질병 상세 (ANS 타입 포함) ===
            diseases_with_ans: diseases,

            // === 플랫 구조 (Make.com용) ===
            flat_data: this.flattenForMake(customerInfo, ansSummary, diseases)
        };
    }

    // ANS 타입별로 데이터 그룹화
    groupByANSType(data) {
        const grouped = {
            ANS002: { items: [], count: 0, total_days: 0 }, // 통원
            ANS003: { items: [], count: 0, total_days: 0 }, // 입원
            ANS004: { items: [], count: 0, operations: [] }, // 수술
            ANS005: { items: [], count: 0, total_days: 0 }, // 장기투약
            ANS007: { items: [], count: 0, treatments: [] }, // 치과
            ANS008: { items: [], count: 0, procedures: [] }  // 시술
        };

        // aggregate 데이터 처리
        if (data.aggregate) {
            Object.entries(data.aggregate).forEach(([ansCode, ansData]) => {
                if (!grouped[ansCode]) grouped[ansCode] = { items: [], count: 0 };

                ['sicked_0', 'sicked_1'].forEach(sickedType => {
                    if (ansData[sickedType]?.list) {
                        ansData[sickedType].list.forEach(item => {
                            const processedItem = this.processANSItem(item, ansCode);
                            grouped[ansCode].items.push(processedItem);
                            grouped[ansCode].count++;

                            // ANS별 특수 처리
                            this.updateANSSpecificData(grouped[ansCode], processedItem, ansCode);
                        });
                    }
                });
            });
        }

        // basic 데이터 처리
        if (data.basic) {
            Object.entries(data.basic).forEach(([ansCode, ansData]) => {
                if (!grouped[ansCode]) grouped[ansCode] = { items: [], count: 0 };

                if (ansData.list) {
                    ansData.list.forEach(item => {
                        const processedItem = this.processANSItem(item, ansCode);
                        grouped[ansCode].items.push(processedItem);
                        grouped[ansCode].count++;

                        this.updateANSSpecificData(grouped[ansCode], processedItem, ansCode);
                    });
                }
            });
        }

        return grouped;
    }

    // ANS별 특수 데이터 업데이트
    updateANSSpecificData(groupData, item, ansCode) {
        switch(ansCode) {
            case 'ANS002': // 통원
                groupData.total_days += item.visitDays || 0;
                break;
            case 'ANS003': // 입원
                groupData.total_days += item.visitDays || 0;
                break;
            case 'ANS004': // 수술
                if (item.operation) {
                    groupData.operations.push(item.operation);
                }
                break;
            case 'ANS005': // 장기투약
                groupData.total_days += item.dosingDays || 0;
                break;
            case 'ANS007': // 치과
                if (item.treatment) {
                    groupData.treatments.push(item.treatment);
                }
                break;
            case 'ANS008': // 시술
                if (item.procedure) {
                    groupData.procedures.push(item.procedure);
                }
                break;
        }
    }

    // 개별 ANS 항목 처리
    processANSItem(item, ansCode) {
        const basic = item.basic || {};
        const detail = item.detail || {};

        return {
            ansType: ansCode,
            ansCategory: this.ANS_MAPPING[ansCode]?.category || '기타',

            // 공통 필드
            diseaseCode: basic.asbDiseaseCode || '',
            diseaseName: basic.asbDiseaseName || '',
            startDate: basic.asbTreatStartDate || '',
            endDate: basic.asbTreatEndDate || '',
            hospital: basic.asbHospitalName || '',
            department: basic.asbDepartment || '',

            // 수량 정보
            visitDays: basic.asbVisitDays || 0,
            dosingDays: basic.asbDosingDays || 0,
            visitCount: basic.visitDaysCount || basic.asbVisitDays || 0,

            // 치료 정보
            treatType: basic.asbTreatType || '',
            operation: detail.asdOperation || '',
            procedure: detail.asdOperation || '',
            treatment: basic.asbDisease || '',

            // 보험 정보
            insurancePossibility: basic.asbInDisease || '',
            notice: basic.asbNotice || ''
        };
    }

    // 질병 데이터 추출 (ANS 타입 포함)
    extractDiseasesWithANS(data) {
        const diseases = [];
        const addedKeys = new Set();

        // ANS 타입 결정 로직
        const determineANSType = (item) => {
            if (item.detail?.asdOperation) return 'ANS004'; // 수술
            if (item.basic?.asbTreatType === '입원') return 'ANS003'; // 입원
            if (item.basic?.asbDosingDays > 30) return 'ANS005'; // 장기투약
            if (item.basic?.asbDepartment?.includes('치과')) return 'ANS007'; // 치과
            if (item.basic?.asbVisitDays > 0) return 'ANS002'; // 통원
            return 'ANS009'; // 기타
        };

        // aggregate 데이터에서 추출
        if (data.aggregate) {
            Object.entries(data.aggregate).forEach(([ansCode, ansData]) => {
                ['sicked_0', 'sicked_1'].forEach(sickedType => {
                    if (ansData[sickedType]?.list) {
                        ansData[sickedType].list.forEach(item => {
                            const uniqueKey = `${item.basic?.asbDiseaseCode}_${item.basic?.asbTreatStartDate}`;

                            if (!addedKeys.has(uniqueKey) && item.basic?.asbDiseaseCode) {
                                addedKeys.add(uniqueKey);

                                diseases.push({
                                    // ANS 정보
                                    ansType: ansCode,
                                    ansCategory: this.ANS_MAPPING[ansCode]?.category || '기타',
                                    dataSource: 'aggregate',
                                    sickedType: sickedType,

                                    // 질병 정보
                                    code: item.basic.asbDiseaseCode,
                                    name: item.basic.asbDiseaseName || '',
                                    startDate: item.basic.asbTreatStartDate || '',
                                    endDate: item.basic.asbTreatEndDate || '',

                                    // 치료 정보
                                    hospital: item.basic.asbHospitalName || '',
                                    department: item.basic.asbDepartment || '',
                                    treatType: item.basic.asbTreatType || '',

                                    // 수량 정보
                                    visitDays: item.basic.asbVisitDays || 0,
                                    dosingDays: item.basic.asbDosingDays || 0,
                                    visitCount: item.basic.visitDaysCount || 0,

                                    // 수술/시술 정보
                                    operation: item.detail?.asdOperation || '',

                                    // 보험 정보
                                    insurance: item.basic.asbInDisease || '',
                                    notice: item.basic.asbNotice || ''
                                });
                            }
                        });
                    }
                });
            });
        }

        // basic 데이터에서 추가
        if (data.basic) {
            Object.entries(data.basic).forEach(([ansCode, ansData]) => {
                if (ansData.list) {
                    ansData.list.forEach(item => {
                        const uniqueKey = `${item.basic?.asbDiseaseCode}_${item.basic?.asbTreatStartDate}`;

                        if (!addedKeys.has(uniqueKey) && item.basic?.asbDiseaseCode) {
                            addedKeys.add(uniqueKey);

                            diseases.push({
                                // ANS 정보
                                ansType: ansCode,
                                ansCategory: this.ANS_MAPPING[ansCode]?.category || '기타',
                                dataSource: 'basic',
                                sickedType: item.basic.asbSicked ? 'sicked_1' : 'sicked_0',

                                // 나머지 필드는 동일
                                code: item.basic.asbDiseaseCode,
                                name: item.basic.asbDiseaseName || '',
                                // ... (위와 동일)
                            });
                        }
                    });
                }
            });
        }

        return diseases;
    }

    // ANS별 요약 생성
    generateANSSummary(groupedData) {
        return {
            // 통원 (ANS002)
            ANS002_outpatient_count: groupedData.ANS002?.count || 0,
            ANS002_outpatient_days: groupedData.ANS002?.total_days || 0,

            // 입원 (ANS003)
            ANS003_inpatient_count: groupedData.ANS003?.count || 0,
            ANS003_inpatient_days: groupedData.ANS003?.total_days || 0,

            // 수술 (ANS004)
            ANS004_surgery_count: groupedData.ANS004?.count || 0,
            ANS004_surgery_list: groupedData.ANS004?.operations?.join(', ') || '',

            // 장기투약 (ANS005)
            ANS005_longterm_medication_days: groupedData.ANS005?.total_days || 0,

            // 치과 (ANS007)
            ANS007_dental_count: groupedData.ANS007?.count || 0,
            ANS007_dental_treatments: groupedData.ANS007?.treatments?.join(', ') || '',

            // 시술 (ANS008)
            ANS008_procedure_count: groupedData.ANS008?.count || 0,
            ANS008_procedure_list: groupedData.ANS008?.procedures?.join(', ') || ''
        };
    }

    // Make.com용 플랫 구조 생성
    flattenForMake(customerInfo, ansSummary, diseases) {
        const flat = {
            // 고객 정보
            ...customerInfo,

            // ANS 요약
            ...ansSummary,

            // 메타 정보
            total_disease_count: diseases.length,
            has_surgery: ansSummary.ANS004_surgery_count > 0,
            has_inpatient: ansSummary.ANS003_inpatient_count > 0,
            has_dental: ansSummary.ANS007_dental_count > 0
        };

        // 상위 5개 질병 정보 추가
        diseases.slice(0, 5).forEach((disease, index) => {
            const num = index + 1;
            flat[`disease${num}_ans_type`] = disease.ansType;
            flat[`disease${num}_ans_category`] = disease.ansCategory;
            flat[`disease${num}_code`] = disease.code;
            flat[`disease${num}_name`] = disease.name;
            flat[`disease${num}_start_date`] = disease.startDate;
            flat[`disease${num}_end_date`] = disease.endDate;
            flat[`disease${num}_hospital`] = disease.hospital;
            flat[`disease${num}_visit_days`] = disease.visitDays;
            flat[`disease${num}_dosing_days`] = disease.dosingDays;
            flat[`disease${num}_operation`] = disease.operation;
        });

        return flat;
    }

    // 고객 정보 추출 (기존과 동일)
    extractCustomerInfo(data) {
        // ... 기존 코드와 동일
        return {
            customer_name: '',
            customer_phone: '',
            customer_birth: '',
            analysis_id: 0,
            transaction_id: ''
        };
    }
}

// 테스트 함수
async function testEnhancedPreprocessor() {
    const fs = require('fs').promises;

    try {
        const testData = JSON.parse(
            await fs.readFile('./data/test-new-format.json', 'utf8')
        );

        const processor = new EnhancedPreprocessor();
        const result = processor.preprocessWithANS(testData);

        console.log('📊 ANS별 요약:');
        console.log(JSON.stringify(result.ans_summary, null, 2));

        console.log('\n🏥 질병별 ANS 타입:');
        result.diseases_with_ans.forEach(disease => {
            console.log(`- ${disease.name} (${disease.code})`);
            console.log(`  ANS: ${disease.ansType} - ${disease.ansCategory}`);
            console.log(`  기간: ${disease.startDate} ~ ${disease.endDate}`);
        });

        // 결과 저장
        await fs.writeFile(
            './data/enhanced-preprocessed-data.json',
            JSON.stringify(result, null, 2)
        );

        console.log('\n💾 저장 완료: ./data/enhanced-preprocessed-data.json');

    } catch (error) {
        console.error('처리 실패:', error);
    }
}

module.exports = EnhancedPreprocessor;

if (require.main === module) {
    testEnhancedPreprocessor();
}