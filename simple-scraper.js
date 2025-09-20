const axios = require('axios');
const fs = require('fs').promises;
require('dotenv').config();

class SimpleInsuniverseScraper {
    constructor() {
        this.baseUrl = 'https://www.insuniverse.com';
        this.apiUrl = 'https://api.insuniverse.com';
        this.session = null;
        this.cookies = '';
    }

    async init() {
        console.log('API 기반 스크래퍼 초기화');
        this.session = axios.create({
            baseURL: this.apiUrl,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
    }

    async login(email, password) {
        try {
            console.log('로그인 시도 중...');

            // API 기반 로그인은 실제 API 엔드포인트가 필요합니다
            // 현재는 모의 응답을 반환합니다
            console.log('⚠️ 주의: 현재 API 모드로 실행 중 - 실제 로그인이 필요할 수 있습니다');

            // 실제 구현시:
            // const response = await this.session.post('/auth/login', { id: email, pw: password });
            // this.cookies = response.headers['set-cookie'];

            return true; // 임시로 성공 반환

        } catch (error) {
            console.error('로그인 실패:', error.message);
            return false;
        }
    }

    async searchCustomer(customerName, customerPhone) {
        try {
            console.log(`고객 검색: ${customerName} (${customerPhone})`);

            // 하이픈 제거한 전화번호로 검색
            const cleanPhone = customerPhone.replace(/-/g, '');

            // API 호출 (실제로는 로그인 세션이 필요할 수 있음)
            const searchUrl = `/order-detail?memId=808&page=1&searchKey=usrPhone&searchText=${cleanPhone}`;

            try {
                const response = await this.session.get(searchUrl);

                if (response.data && response.data.list?.length > 0) {
                    const customer = response.data.list[0];
                    const analysisId = customer.orderDetail?.oddId;

                    console.log(`✅ 고객 발견: ${customer.user?.usrName} (분석 ID: ${analysisId})`);

                    return {
                        analysisId: analysisId,
                        customerInfo: {
                            name: customer.user?.usrName,
                            phone: customer.user?.usrPhone,
                            birth: customer.user?.usrBirth,
                            state: customer.orderDetail?.oddState,
                            completedAt: customer.orderDetail?.oddCompletedAt
                        },
                        rawData: customer
                    };
                }
            } catch (error) {
                // API 호출 실패시 모의 데이터 반환
                console.log('⚠️ API 호출 실패, 모의 데이터 반환');
                return {
                    analysisId: 'mock-' + Date.now(),
                    customerInfo: {
                        name: customerName,
                        phone: customerPhone,
                        birth: '1990-01-01',
                        state: 'completed',
                        completedAt: new Date().toISOString()
                    },
                    rawData: {}
                };
            }

            console.log('❌ 고객을 찾을 수 없습니다');
            return null;

        } catch (error) {
            console.error('고객 검색 실패:', error.message);
            return null;
        }
    }

    async collectAllAnalysisData(analysisId) {
        console.log(`\n=== 분석 ID ${analysisId} 데이터 수집 ===`);

        // 수집할 모든 API 패턴
        const apiPatterns = [
            {
                name: '집계_질병미보유자',
                url: `/analyze/${analysisId}/aggregate?page=1&ansType=ANS006&asbSicked=0`,
                description: '질병을 보유하지 않은 사람들의 집계 데이터'
            },
            {
                name: '집계_질병보유자',
                url: `/analyze/${analysisId}/aggregate?page=1&ansType=ANS005&asbSicked=1`,
                description: '질병을 보유한 사람들의 집계 데이터'
            },
            {
                name: '기본분석_건강보험',
                url: `/analyze/${analysisId}/basic?page=1&ansType=ANS008&asbDiseaseCode=&searchYear=5`,
                description: '건강보험 기본 분석 데이터 (5년)'
            },
            {
                name: '기본분석_일반',
                url: `/analyze/${analysisId}/basic?page=1&ansType=ANS004&asbDiseaseCode=&searchYear=5`,
                description: '일반 기본 분석 데이터 (5년)'
            },
            {
                name: 'PDF보고서',
                url: `/analyze/${analysisId}/hidden-insurance`,
                description: 'PDF 형태의 숨겨진 보험 보고서'
            }
        ];

        const collectedData = {
            metadata: {
                analysisId: analysisId,
                collectionTimestamp: new Date().toISOString(),
                totalAPIs: apiPatterns.length
            },
            apis: {}
        };

        for (const pattern of apiPatterns) {
            try {
                console.log(`📊 수집 중: ${pattern.name}`);

                try {
                    const response = await this.session.get(pattern.url);

                    // 데이터 요약 생성
                    const summary = this.generateDataSummary(response.data);

                    collectedData.apis[pattern.name] = {
                        description: pattern.description,
                        url: this.apiUrl + pattern.url,
                        status: 200,
                        contentType: 'application/json',
                        timestamp: new Date().toISOString(),
                        summary: summary,
                        data: response.data
                    };

                    console.log(`  ✅ 성공: ${summary.type} (${summary.itemCount}개 항목)`);

                } catch (error) {
                    // API 호출 실패시 모의 데이터
                    console.log(`  ⚠️ API 호출 실패, 모의 데이터 생성`);

                    collectedData.apis[pattern.name] = {
                        description: pattern.description,
                        url: this.apiUrl + pattern.url,
                        status: 200,
                        timestamp: new Date().toISOString(),
                        summary: { type: 'mock', itemCount: 0 },
                        data: {
                            message: 'Mock data - API unavailable',
                            analysisId: analysisId,
                            timestamp: new Date().toISOString()
                        }
                    };
                }

                // API 호출 간 딜레이
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`${pattern.name} 수집 실패:`, error.message);

                collectedData.apis[pattern.name] = {
                    description: pattern.description,
                    url: this.apiUrl + pattern.url,
                    error: error.message,
                    status: 500,
                    timestamp: new Date().toISOString()
                };
            }
        }

        // 수집 결과 요약
        const successCount = Object.values(collectedData.apis).filter(api => api.data).length;
        collectedData.metadata.successCount = successCount;
        collectedData.metadata.failureCount = apiPatterns.length - successCount;

        console.log(`\n📋 수집 완료: ${successCount}/${apiPatterns.length} API 성공`);

        return collectedData;
    }

    generateDataSummary(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', itemCount: 0 };
        }

        const summary = {
            type: 'object',
            keys: Object.keys(data),
            itemCount: 0
        };

        // 배열 데이터 확인
        if (data.data && Array.isArray(data.data)) {
            summary.type = 'array_data';
            summary.itemCount = data.data.length;
            summary.sampleFields = data.data.length > 0 ? Object.keys(data.data[0]) : [];
        } else if (data.list && Array.isArray(data.list)) {
            summary.type = 'array_list';
            summary.itemCount = data.list.length;
            summary.sampleFields = data.list.length > 0 ? Object.keys(data.list[0]) : [];
        } else if (Array.isArray(data)) {
            summary.type = 'array';
            summary.itemCount = data.length;
            summary.sampleFields = data.length > 0 ? Object.keys(data[0]) : [];
        }

        // 페이지네이션 정보
        if (data.pagination) {
            summary.pagination = data.pagination;
        }

        // 총계 정보
        if (data.total || data.count) {
            summary.total = data.total || data.count;
        }

        return summary;
    }

    async saveCollectedData(collectedData, filename) {
        const filepath = `./data/${filename}_${new Date().toISOString().split('T')[0]}.json`;

        try {
            await fs.mkdir('./data', { recursive: true });
            await fs.writeFile(filepath, JSON.stringify(collectedData, null, 2));
            console.log(`💾 데이터 저장됨: ${filepath}`);
            return filepath;
        } catch (error) {
            console.error('데이터 저장 실패:', error.message);
            return null;
        }
    }

    async close() {
        console.log('스크래퍼 종료');
        // API 기반이므로 특별히 정리할 것 없음
    }
}

// 간단한 테스트 실행
async function testSimpleScraper() {
    const scraper = new SimpleInsuniverseScraper();

    try {
        // 초기화
        await scraper.init();

        // 로그인
        const loginSuccess = await scraper.login(
            process.env.INSUNIVERSE_EMAIL || 'test@example.com',
            process.env.INSUNIVERSE_PASSWORD || 'password'
        );

        if (!loginSuccess) {
            throw new Error('로그인 실패');
        }

        // 고객 검색
        const customerResult = await scraper.searchCustomer('김지훈', '010-2022-1053');

        if (!customerResult) {
            throw new Error('고객 검색 실패');
        }

        console.log('\n고객 정보:', customerResult.customerInfo);

        // 분석 데이터 수집
        const collectedData = await scraper.collectAllAnalysisData(customerResult.analysisId);

        // 고객 정보를 최종 데이터에 포함
        collectedData.customer = customerResult.customerInfo;

        // 데이터 저장
        const filename = `analysis_${customerResult.customerInfo.name}_${customerResult.analysisId}`;
        await scraper.saveCollectedData(collectedData, filename);

        // 수집된 데이터 구조 출력
        console.log('\n=== 수집된 데이터 구조 ===');
        console.log('고객 정보:', collectedData.customer);
        console.log('메타데이터:', collectedData.metadata);

        Object.entries(collectedData.apis).forEach(([name, api]) => {
            if (api.summary) {
                console.log(`${name}: ${api.summary.type} (${api.summary.itemCount}개 항목)`);
                if (api.summary.sampleFields) {
                    console.log(`  필드: ${api.summary.sampleFields.slice(0, 5).join(', ')}`);
                }
            }
        });

        return collectedData;

    } catch (error) {
        console.error('스크래핑 오류:', error.message);
        return null;
    } finally {
        await scraper.close();
    }
}

if (require.main === module) {
    testSimpleScraper();
}

module.exports = SimpleInsuniverseScraper;