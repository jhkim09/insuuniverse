const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// 데이터를 단순화하는 전처리 서버
class DataSimplifier {

    // 복잡한 JSON을 단순한 구조로 변환
    simplifyData(rawData) {
        const data = Array.isArray(rawData) ? rawData[0] : rawData;

        // 1. 고객 기본 정보
        const customerInfo = this.extractCustomerInfo(data);

        // 2. 주요 질병 5개만 추출
        const topDiseases = this.extractTopDiseases(data, 5);

        // 3. 요약 통계
        const summary = this.calculateSummary(data);

        return {
            // 고객 정보 (단순화)
            customer_name: customerInfo.name,
            customer_phone: customerInfo.phone,
            customer_birth: customerInfo.birth,
            analysis_id: customerInfo.analysisId,
            transaction_id: customerInfo.transactionId,
            analysis_state: customerInfo.state,

            // 질병 정보 (최대 5개, 개별 필드로)
            disease1_code: topDiseases[0]?.code || '',
            disease1_name: topDiseases[0]?.name || '',
            disease1_date: topDiseases[0]?.date || '',
            disease1_insurance: topDiseases[0]?.insurance || '',

            disease2_code: topDiseases[1]?.code || '',
            disease2_name: topDiseases[1]?.name || '',
            disease2_date: topDiseases[1]?.date || '',
            disease2_insurance: topDiseases[1]?.insurance || '',

            disease3_code: topDiseases[2]?.code || '',
            disease3_name: topDiseases[2]?.name || '',
            disease3_date: topDiseases[2]?.date || '',
            disease3_insurance: topDiseases[2]?.insurance || '',

            disease4_code: topDiseases[3]?.code || '',
            disease4_name: topDiseases[3]?.name || '',
            disease4_date: topDiseases[3]?.date || '',
            disease4_insurance: topDiseases[3]?.insurance || '',

            disease5_code: topDiseases[4]?.code || '',
            disease5_name: topDiseases[4]?.name || '',
            disease5_date: topDiseases[4]?.date || '',
            disease5_insurance: topDiseases[4]?.insurance || '',

            // 요약 정보
            total_disease_count: summary.totalDiseases,
            total_operation_count: summary.totalOperations,
            has_critical_disease: summary.hasCritical,
            disease_summary_text: summary.summaryText,

            // 타임스탬프
            processed_at: new Date().toISOString()
        };
    }

    extractCustomerInfo(data) {
        const info = {
            name: '',
            phone: '',
            birth: '',
            analysisId: 0,
            transactionId: '',
            state: ''
        };

        if (data['car-basic']?.order) {
            const order = data['car-basic'].order;
            info.name = order.user?.usrName || '';
            info.phone = order.user?.usrPhone || '';
            info.birth = order.user?.usrBirth || '';
            info.analysisId = order.orderDetail?.oddId || 0;
            info.transactionId = order.orderDetail?.oddTransactionId || '';
            info.state = order.orderDetail?.oddState || '';
        }

        return info;
    }

    extractTopDiseases(data, limit = 5) {
        const diseases = [];

        // aggregate 섹션 처리
        if (data.aggregate) {
            Object.values(data.aggregate).forEach(ansData => {
                // sicked_0 처리
                if (ansData.sicked_0?.list) {
                    ansData.sicked_0.list.forEach(item => {
                        if (diseases.length < limit && item.basic?.asbDiseaseCode) {
                            diseases.push({
                                code: item.basic.asbDiseaseCode,
                                name: item.basic.asbDiseaseName,
                                date: item.basic.asbTreatStartDate,
                                insurance: item.basic.asbInDisease || '해당없음',
                                operation: item.detail?.asdOperation || ''
                            });
                        }
                    });
                }

                // sicked_1 처리
                if (ansData.sicked_1?.list) {
                    ansData.sicked_1.list.forEach(item => {
                        if (diseases.length < limit && item.basic?.asbDiseaseCode) {
                            diseases.push({
                                code: item.basic.asbDiseaseCode,
                                name: item.basic.asbDiseaseName,
                                date: item.basic.asbTreatStartDate,
                                insurance: item.basic.asbInDisease || '해당없음',
                                operation: item.detail?.asdOperation || ''
                            });
                        }
                    });
                }
            });
        }

        // basic 섹션 처리
        if (data.basic) {
            Object.values(data.basic).forEach(ansData => {
                if (ansData.list) {
                    ansData.list.forEach(item => {
                        if (diseases.length < limit && item.basic?.asbDiseaseCode) {
                            diseases.push({
                                code: item.basic.asbDiseaseCode,
                                name: item.basic.asbDiseaseName,
                                date: item.basic.asbTreatStartDate || '',
                                insurance: item.basic.asbInDisease || '해당없음',
                                operation: item.detail?.asdOperation || ''
                            });
                        }
                    });
                }
            });
        }

        return diseases;
    }

    calculateSummary(data) {
        let totalDiseases = 0;
        let totalOperations = 0;
        let hasCritical = false;
        const diseaseNames = [];

        // 전체 데이터 순회하여 카운트
        if (data.aggregate) {
            Object.values(data.aggregate).forEach(ansData => {
                if (ansData.sicked_0?.count) totalDiseases += ansData.sicked_0.count;
                if (ansData.sicked_1?.count) totalDiseases += ansData.sicked_1.count;

                // 수술 카운트
                [ansData.sicked_0, ansData.sicked_1].forEach(sicked => {
                    if (sicked?.list) {
                        sicked.list.forEach(item => {
                            if (item.detail?.asdOperation) totalOperations++;
                            if (item.basic?.asbDiseaseName) {
                                diseaseNames.push(item.basic.asbDiseaseName);
                            }
                            // 중요 질병 체크 (암, 심장, 뇌 관련)
                            if (item.basic?.asbDiseaseName &&
                                (item.basic.asbDiseaseName.includes('암') ||
                                 item.basic.asbDiseaseName.includes('심') ||
                                 item.basic.asbDiseaseName.includes('뇌'))) {
                                hasCritical = true;
                            }
                        });
                    }
                });
            });
        }

        const summaryText = diseaseNames.slice(0, 3).join(', ') || '질병 없음';

        return {
            totalDiseases,
            totalOperations,
            hasCritical,
            summaryText
        };
    }
}

// API 엔드포인트
app.post('/simplify', async (req, res) => {
    try {
        console.log('📥 원본 데이터 수신');

        const simplifier = new DataSimplifier();
        const simplifiedData = simplifier.simplifyData(req.body);

        console.log('✅ 데이터 단순화 완료');
        console.log('- 고객명:', simplifiedData.customer_name);
        console.log('- 분석ID:', simplifiedData.analysis_id);
        console.log('- 질병 수:', simplifiedData.total_disease_count);

        // Make.com 웹훅으로 전송 (옵션)
        if (process.env.MAKE_WEBHOOK_URL) {
            try {
                await axios.post(process.env.MAKE_WEBHOOK_URL, simplifiedData);
                console.log('✅ Make.com으로 전송 완료');
            } catch (webhookError) {
                console.error('⚠️ Make.com 전송 실패:', webhookError.message);
            }
        }

        // 단순화된 데이터 반환
        res.json({
            success: true,
            data: simplifiedData
        });

    } catch (error) {
        console.error('❌ 처리 실패:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 테스트 엔드포인트
app.get('/test', (req, res) => {
    res.json({
        status: 'running',
        message: '전처리 서버가 실행 중입니다',
        endpoints: {
            simplify: 'POST /simplify - 복잡한 JSON을 단순화'
        }
    });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`🚀 단순화 전처리 서버 실행 중: http://localhost:${PORT}`);
    console.log('📌 엔드포인트:');
    console.log(`   POST http://localhost:${PORT}/simplify`);
    console.log(`   GET  http://localhost:${PORT}/test`);
});

module.exports = app;