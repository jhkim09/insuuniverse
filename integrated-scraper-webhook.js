const axios = require('axios');
const ApiScraper = require('./api-scraper');
const EnhancedPreprocessor = require('./enhanced-preprocessor');
require('dotenv').config();

class IntegratedScraperWebhook {
    constructor() {
        this.scraper = new ApiScraper();
        this.webhookUrl = process.env.MAKE_WEBHOOK_URL;
    }

    // 메인 프로세스: 스크래핑 → 전처리 → 웹훅 전송
    async processAndSend(loginId, password) {
        try {
            console.log('🚀 통합 프로세스 시작');
            console.log('=' .repeat(50));

            // 1단계: 스크래핑
            console.log('\n📊 1단계: 데이터 스크래핑');
            const rawData = await this.scrapeData(loginId, password);

            if (!rawData) {
                throw new Error('스크래핑 실패');
            }

            // 2단계: 기존 데이터 전처리 (단순화)
            console.log('\n🔄 2단계: 데이터 전처리');
            const simplifiedData = this.preprocessData(rawData);

            // 2-2단계: ANS 기반 전처리 추가
            console.log('\n🔄 2-2단계: ANS 타입별 전처리');
            const enhancedPreprocessor = new EnhancedPreprocessor();
            const ansProcessedData = enhancedPreprocessor.preprocessWithANS(rawData);

            // 두 전처리 결과 병합
            const combinedData = {
                ...simplifiedData,

                // ANS 요약 정보 추가
                ...ansProcessedData.ans_summary,

                // ANS별 질병 상세 정보 추가
                ans_diseases: ansProcessedData.diseases_with_ans,

                // ANS 메타 정보
                total_disease_count: ansProcessedData.diseases_with_ans.length,
                has_surgery: ansProcessedData.ans_summary.ANS004_surgery_count > 0,
                has_inpatient: ansProcessedData.ans_summary.ANS003_inpatient_count > 0,
                has_dental: ansProcessedData.ans_summary.ANS007_dental_count > 0
            };

            console.log('\n📊 ANS 요약:');
            console.log(`- 통원(ANS002): ${ansProcessedData.ans_summary.ANS002_outpatient_count}건`);
            console.log(`- 입원(ANS003): ${ansProcessedData.ans_summary.ANS003_inpatient_count}건 (${ansProcessedData.ans_summary.ANS003_inpatient_days}일)`);
            console.log(`- 수술(ANS004): ${ansProcessedData.ans_summary.ANS004_surgery_count}건`);
            console.log(`- 치과(ANS007): ${ansProcessedData.ans_summary.ANS007_dental_count}건`);

            // 3단계: Make.com 웹훅으로 전송 (병합된 데이터)
            console.log('\n📤 3단계: Make.com 웹훅 전송');
            const result = await this.sendToMake(combinedData);

            console.log('\n✅ 전체 프로세스 완료!');
            console.log('=' .repeat(50));

            return {
                success: true,
                originalDataSize: JSON.stringify(rawData).length,
                combinedDataSize: JSON.stringify(combinedData).length,
                reductionRate: Math.round((1 - JSON.stringify(combinedData).length / JSON.stringify(rawData).length) * 100) + '%',
                webhookResponse: result
            };

        } catch (error) {
            console.error('❌ 프로세스 실패:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 스크래핑 함수
    async scrapeData(loginId, password) {
        try {
            // 로그인
            const loginSuccess = await this.scraper.login(loginId, password);
            if (!loginSuccess) {
                throw new Error('로그인 실패');
            }

            // 데이터 추출
            const data = await this.scraper.extractAllData();
            console.log('✅ 스크래핑 완료');
            console.log('- 고객명:', data.customer?.name);
            console.log('- 분석ID:', data.customer?.analysisId);

            return data;

        } catch (error) {
            console.error('스크래핑 오류:', error.message);
            return null;
        }
    }

    // 데이터만 가져오기 (웹훅 전송 없이)
    async fetchData() {
        const loginId = process.env.INSUNIVERSE_EMAIL;
        const password = process.env.INSUNIVERSE_PASSWORD;

        if (!loginId || !password) {
            console.error('❌ 로그인 정보가 .env 파일에 없습니다');
            return null;
        }

        return await this.scrapeData(loginId, password);
    }

    // 데이터 전처리 (복잡한 구조 → 단순한 구조)
    preprocessData(rawData) {
        const data = Array.isArray(rawData) ? rawData[0] : rawData;

        // 고객 정보 추출
        const customerInfo = this.extractCustomerInfo(data);

        // 주요 질병 5개만 추출
        const diseases = this.extractTopDiseases(data, 5);

        // 요약 정보 생성
        const summary = this.generateSummary(data, diseases);

        // Make.com에서 쉽게 매핑할 수 있는 평평한(flat) 구조
        const simplified = {
            // === 고객 기본 정보 ===
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone,
            customer_birth: customerInfo.birth,
            analysis_id: customerInfo.analysisId,
            transaction_id: customerInfo.transactionId,
            analysis_state: customerInfo.state,
            login_id: customerInfo.loginId,

            // === 질병 1 ===
            disease1_code: diseases[0]?.code || '',
            disease1_name: diseases[0]?.name || '',
            disease1_start_date: diseases[0]?.startDate || '',
            disease1_end_date: diseases[0]?.endDate || '',
            disease1_hospital: diseases[0]?.hospital || '',
            disease1_department: diseases[0]?.department || '',
            disease1_visit_days: diseases[0]?.visitDays || 0,        // 통원일수
            disease1_dosing_days: diseases[0]?.dosingDays || 0,      // 투약일수
            disease1_visit_count: diseases[0]?.visitCount || 0,      // 통원횟수
            disease1_treat_type: diseases[0]?.treatType || '',       // 입원/외래
            disease1_operation: diseases[0]?.operation || '',
            disease1_insurance: diseases[0]?.insurance || '',

            // === 질병 2 ===
            disease2_code: diseases[1]?.code || '',
            disease2_name: diseases[1]?.name || '',
            disease2_start_date: diseases[1]?.startDate || '',
            disease2_end_date: diseases[1]?.endDate || '',
            disease2_hospital: diseases[1]?.hospital || '',
            disease2_department: diseases[1]?.department || '',
            disease2_visit_days: diseases[1]?.visitDays || 0,
            disease2_dosing_days: diseases[1]?.dosingDays || 0,
            disease2_visit_count: diseases[1]?.visitCount || 0,
            disease2_treat_type: diseases[1]?.treatType || '',
            disease2_operation: diseases[1]?.operation || '',
            disease2_insurance: diseases[1]?.insurance || '',

            // === 질병 3 ===
            disease3_code: diseases[2]?.code || '',
            disease3_name: diseases[2]?.name || '',
            disease3_start_date: diseases[2]?.startDate || '',
            disease3_end_date: diseases[2]?.endDate || '',
            disease3_hospital: diseases[2]?.hospital || '',
            disease3_department: diseases[2]?.department || '',
            disease3_visit_days: diseases[2]?.visitDays || 0,
            disease3_dosing_days: diseases[2]?.dosingDays || 0,
            disease3_visit_count: diseases[2]?.visitCount || 0,
            disease3_treat_type: diseases[2]?.treatType || '',
            disease3_operation: diseases[2]?.operation || '',
            disease3_insurance: diseases[2]?.insurance || '',

            // === 질병 4 ===
            disease4_code: diseases[3]?.code || '',
            disease4_name: diseases[3]?.name || '',
            disease4_start_date: diseases[3]?.startDate || '',
            disease4_hospital: diseases[3]?.hospital || '',
            disease4_operation: diseases[3]?.operation || '',

            // === 질병 5 ===
            disease5_code: diseases[4]?.code || '',
            disease5_name: diseases[4]?.name || '',
            disease5_start_date: diseases[4]?.startDate || '',
            disease5_hospital: diseases[4]?.hospital || '',
            disease5_operation: diseases[4]?.operation || '',

            // === 요약 정보 ===
            total_disease_count: summary.totalDiseases,
            total_operation_count: summary.totalOperations,
            total_sicked_0_count: summary.sicked0Count,
            total_sicked_1_count: summary.sicked1Count,
            has_critical_disease: summary.hasCritical,
            disease_list_text: summary.diseaseListText,
            operation_list_text: summary.operationListText,
            insurance_summary_text: summary.insuranceSummary,

            // === 메타 정보 ===
            processed_at: new Date().toISOString(),
            data_source: 'api-scraper',
            webhook_version: '2.0'
        };

        console.log('✅ 전처리 완료');
        console.log('- 원본 크기:', JSON.stringify(data).length, 'bytes');
        console.log('- 단순화 크기:', JSON.stringify(simplified).length, 'bytes');
        console.log('- 질병 수:', diseases.length);

        return simplified;
    }

    // 고객 정보 추출
    extractCustomerInfo(data) {
        const info = {
            name: '',
            phone: '',
            birth: '',
            loginId: '',
            analysisId: 0,
            transactionId: '',
            state: ''
        };

        // 여러 위치에서 정보 찾기
        if (data.customer) {
            info.name = data.customer.name || '';
            info.phone = data.customer.phone || '';
            info.birth = data.customer.birth || '';
            info.state = data.customer.state || '';
        }

        if (data.metadata) {
            info.analysisId = data.metadata.analysisId || 0;
            info.loginId = data.metadata.loginId || '';
        }

        // car-basic에서 백업 정보
        if (data['car-basic']?.order) {
            const order = data['car-basic'].order;
            info.name = info.name || order.user?.usrName || '';
            info.phone = info.phone || order.user?.usrPhone || '';
            info.birth = info.birth || order.user?.usrBirth || '';
            info.loginId = info.loginId || order.member?.memLoginId || '';
            info.analysisId = info.analysisId || order.orderDetail?.oddId || 0;
            info.transactionId = order.orderDetail?.oddTransactionId || '';
            info.state = info.state || order.orderDetail?.oddState || '';
        }

        return info;
    }

    // 주요 질병 추출 (최대 N개)
    extractTopDiseases(data, limit = 5) {
        const diseases = [];
        const addedCodes = new Set(); // 중복 방지

        // aggregate 섹션 처리
        if (data.aggregate) {
            Object.values(data.aggregate).forEach(ansData => {
                // sicked_0과 sicked_1 모두 처리
                ['sicked_0', 'sicked_1'].forEach(sickedType => {
                    if (ansData[sickedType]?.list) {
                        ansData[sickedType].list.forEach(item => {
                            if (diseases.length < limit && item.basic?.asbDiseaseCode) {
                                const code = item.basic.asbDiseaseCode;

                                // 중복 체크
                                if (!addedCodes.has(code)) {
                                    addedCodes.add(code);
                                    diseases.push({
                                        code: code,
                                        name: item.basic.asbDiseaseName || '',
                                        startDate: item.basic.asbTreatStartDate || '',
                                        endDate: item.basic.asbTreatEndDate || '',
                                        hospital: item.basic.asbHospitalName || '',
                                        department: item.basic.asbDepartment || '',
                                        // === 보험금 청구 필수 정보 ===
                                        visitDays: item.basic.asbVisitDays || 0,  // 병원 통원일수
                                        dosingDays: item.basic.asbDosingDays || 0, // 투약일수
                                        visitCount: item.basic.visitDaysCount || item.basic.asbVisitDays || 0, // 통원횟수
                                        duplicated: item.basic.asbDuplicated || 0, // 중복 여부
                                        treatType: item.basic.asbTreatType || '', // 진료 형태 (입원/외래)
                                        operation: item.detail?.asdOperation || '',
                                        insurance: item.basic.asbInDisease || ''
                                    });
                                }
                            }
                        });
                    }
                });
            });
        }

        // basic 섹션 처리
        if (data.basic) {
            Object.values(data.basic).forEach(ansData => {
                if (ansData.list) {
                    ansData.list.forEach(item => {
                        if (diseases.length < limit && item.basic?.asbDiseaseCode) {
                            const code = item.basic.asbDiseaseCode;

                            if (!addedCodes.has(code)) {
                                addedCodes.add(code);
                                diseases.push({
                                    code: code,
                                    name: item.basic.asbDiseaseName || '',
                                    startDate: item.basic.asbTreatStartDate || '',
                                    endDate: item.basic.asbTreatEndDate || '',
                                    hospital: item.basic.asbHospitalName || '',
                                    department: item.basic.asbDepartment || '',
                                    // === 보험금 청구 필수 정보 ===
                                    visitDays: item.basic.asbVisitDays || 0,  // 병원 통원일수
                                    dosingDays: item.basic.asbDosingDays || 0, // 투약일수
                                    visitCount: item.basic.visitDaysCount || item.basic.asbVisitDays || 0, // 통원횟수
                                    duplicated: item.basic.asbDuplicated || 0, // 중복 여부
                                    treatType: item.basic.asbTreatType || '', // 진료 형태 (입원/외래)
                                    operation: item.detail?.asdOperation || '',
                                    insurance: item.basic.asbInDisease || ''
                                });
                            }
                        }
                    });
                }
            });
        }

        return diseases;
    }

    // 요약 정보 생성
    generateSummary(data, diseases) {
        let totalDiseases = 0;
        let totalOperations = 0;
        let sicked0Count = 0;
        let sicked1Count = 0;
        let hasCritical = false;
        const operationList = [];
        const insuranceList = [];

        // aggregate 카운트
        if (data.aggregate) {
            Object.values(data.aggregate).forEach(ansData => {
                if (ansData.sicked_0?.count) {
                    sicked0Count += ansData.sicked_0.count;
                    totalDiseases += ansData.sicked_0.count;
                }
                if (ansData.sicked_1?.count) {
                    sicked1Count += ansData.sicked_1.count;
                    totalDiseases += ansData.sicked_1.count;
                }
            });
        }

        // 질병 정보에서 추가 데이터 수집
        diseases.forEach(disease => {
            if (disease.operation) {
                operationList.push(disease.operation);
                totalOperations++;
            }
            if (disease.insurance) {
                insuranceList.push(disease.insurance);
            }
            // 중요 질병 체크
            if (disease.name &&
                (disease.name.includes('암') ||
                 disease.name.includes('심장') ||
                 disease.name.includes('뇌'))) {
                hasCritical = true;
            }
        });

        return {
            totalDiseases,
            totalOperations,
            sicked0Count,
            sicked1Count,
            hasCritical,
            diseaseListText: diseases.map(d => d.name).filter(n => n).join(', ') || '없음',
            operationListText: operationList.join(', ') || '없음',
            insuranceSummary: insuranceList.slice(0, 2).join(' / ') || '없음'
        };
    }

    // Make.com 웹훅으로 전송
    async sendToMake(data) {
        try {
            if (!this.webhookUrl) {
                throw new Error('MAKE_WEBHOOK_URL이 설정되지 않음');
            }

            const response = await axios.post(this.webhookUrl, data, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            console.log('✅ 웹훅 전송 성공');
            console.log('- 상태 코드:', response.status);
            console.log('- 응답:', response.data);

            return response.data;

        } catch (error) {
            console.error('❌ 웹훅 전송 실패:', error.message);
            throw error;
        }
    }
}

// 직접 실행 시
async function main() {
    const processor = new IntegratedScraperWebhook();

    // 환경 변수에서 로그인 정보 가져오기
    const loginId = process.env.INSUNIVERSE_EMAIL;
    const password = process.env.INSUNIVERSE_PASSWORD;

    if (!loginId || !password) {
        console.error('❌ 로그인 정보가 .env 파일에 없습니다');
        return;
    }

    // 통합 프로세스 실행
    const result = await processor.processAndSend(loginId, password);

    if (result.success) {
        console.log('\n📊 최종 결과:');
        console.log('- 원본 데이터 크기:', result.originalDataSize, 'bytes');
        console.log('- 병합 데이터 크기:', result.combinedDataSize, 'bytes');
        console.log('- 크기 감소율:', result.reductionRate);
    }
}

// 모듈 내보내기
module.exports = IntegratedScraperWebhook;

// 직접 실행
if (require.main === module) {
    main();
}