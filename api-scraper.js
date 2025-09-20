const axios = require('axios');
require('dotenv').config();

class ApiScraper {
    constructor() {
        this.baseUrl = 'https://www.insuniverse.com';
        this.session = null;
        this.cookies = '';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Content-Type': 'application/json',
            'Origin': 'https://www.insuniverse.com',
            'Referer': 'https://www.insuniverse.com/'
        };
    }

    async login(loginId, password) {
        try {
            console.log('로그인 시도 중...');

            const response = await axios.post(
                'https://api.insuniverse.com/auth/signin',
                {
                    loginId: loginId,
                    password: password
                },
                {
                    headers: {
                        ...this.headers,
                        'Origin': 'https://www.insuniverse.com',
                        'Referer': 'https://www.insuniverse.com/'
                    },
                    withCredentials: true,
                    validateStatus: false
                }
            );

            console.log('로그인 응답 상태:', response.status);

            if (response.status === 201) {
                // JWT 토큰 저장 (_aT 쿠키에서)
                if (response.headers['set-cookie']) {
                    const cookies = response.headers['set-cookie'];
                    const atCookie = cookies.find(c => c.startsWith('_aT='));
                    if (atCookie) {
                        const token = atCookie.split('=')[1].split(';')[0];
                        this.headers['Cookie'] = `_aT=${token}`;
                        console.log('✅ 토큰 저장 완료');
                    }
                }

                // 응답 데이터 저장 (memId 포함)
                this.session = response.data;
                console.log('로그인 응답:', response.data);
                this.memId = response.data.memId || response.data.data?.memId || 808; // 808은 하드코딩된 값

                console.log('✅ 로그인 성공! memId:', this.memId);
                return true;
            } else {
                console.error('❌ 로그인 실패:', response.data);
                return false;
            }
        } catch (error) {
            console.error('로그인 중 오류:', error.message);
            if (error.response) {
                console.error('응답 데이터:', error.response.data);
            }
            return false;
        }
    }

    async getOrderList(page = 1, searchText = '') {
        try {
            console.log('주문 리스트 조회 중...');

            if (!this.memId) {
                throw new Error('memId가 없습니다. 로그인이 필요합니다.');
            }

            const response = await axios.get(
                `https://api.insuniverse.com/order-detail?memId=${this.memId}&page=${page}&searchKey=usrName&searchText=${searchText}`,
                {
                    headers: this.headers
                }
            );

            console.log('주문 리스트 조회 성공');
            return response.data;
        } catch (error) {
            console.error('주문 리스트 조회 실패:', error.message);
            return null;
        }
    }

    async getSubscriptionInfo() {
        try {
            console.log('구독 정보 조회 중...');
            const response = await axios.get(
                `https://api.insuniverse.com/subscribe/${this.memId}`,
                {
                    headers: this.headers
                }
            );
            console.log('구독 정보 조회 성공');
            return response.data;
        } catch (error) {
            console.error('구독 정보 조회 실패:', error.message);
            return null;
        }
    }

    async getAlarmInfo() {
        try {
            console.log('알람 정보 조회 중...');
            const response = await axios.get(
                `https://api.insuniverse.com/alarm?page=1&memId=${this.memId}`,
                {
                    headers: this.headers
                }
            );
            console.log('알람 정보 조회 성공');
            return response.data;
        } catch (error) {
            console.error('알람 정보 조회 실패:', error.message);
            return null;
        }
    }

    async getAnalysisDetail(oddId) {
        try {
            console.log(`분석 상세 정보 조회 중... (oddId: ${oddId})`);

            const apis = [
                'car-basic',
                'car-damage',
                'car-insurance',
                'medical',
                'life-insurance',
                'general-insurance',
                'compensation'  // 보상 찾아줘 데이터
            ];

            // aggregate API 타입들
            const aggregateTypes = [
                'ANS001', 'ANS002', 'ANS003', 'ANS004', 'ANS005', 'ANS006',
                'ANS011', 'ANS012', 'ANS013', 'ANS014', 'ANS015'
            ];

            // basic API 타입들 (더 많은 ANS 타입 지원)
            const basicTypes = [
                'ANS001', 'ANS002', 'ANS003', 'ANS004', 'ANS005', 'ANS006',
                'ANS007', 'ANS008', 'ANS009', 'ANS010', 'ANS011', 'ANS012',
                'ANS013', 'ANS014', 'ANS015'
            ];

            const results = {};

            for (const api of apis) {
                try {
                    console.log(`  - ${api} 데이터 조회 중...`);
                    const response = await axios.get(
                        `https://api.insuniverse.com/analyze/${oddId}/${api}?page=1`,
                        {
                            headers: this.headers
                        }
                    );
                    results[api] = response.data;
                    console.log(`    ✓ ${api} 조회 성공`);
                } catch (error) {
                    console.log(`    × ${api} 조회 실패: ${error.response?.status || error.message}`);
                    results[api] = null;
                }
            }

            // aggregate API 호출
            console.log(`  - aggregate 데이터 조회 중...`);
            results.aggregate = {};

            for (const ansType of aggregateTypes) {
                // asbSicked 0과 1 모두 시도
                for (const sicked of [0, 1]) {
                    try {
                        const response = await axios.get(
                            `https://api.insuniverse.com/analyze/${oddId}/aggregate?page=1&ansType=${ansType}&asbSicked=${sicked}`,
                            {
                                headers: this.headers
                            }
                        );
                        if (!results.aggregate[ansType]) {
                            results.aggregate[ansType] = {};
                        }
                        results.aggregate[ansType][`sicked_${sicked}`] = response.data;
                        console.log(`    ✓ aggregate ${ansType} (sicked=${sicked}) 조회 성공`);
                    } catch (error) {
                        // 실패는 조용히 처리 (일부 조합은 데이터가 없을 수 있음)
                    }
                }
            }

            // basic API 호출
            console.log(`  - basic 데이터 조회 중...`);
            results.basic = {};

            for (const ansType of basicTypes) {
                try {
                    const response = await axios.get(
                        `https://api.insuniverse.com/analyze/${oddId}/basic?page=1&ansType=${ansType}&asbDiseaseCode=&searchYear=5`,
                        {
                            headers: this.headers
                        }
                    );
                    results.basic[ansType] = response.data;
                    console.log(`    ✓ basic ${ansType} 조회 성공`);
                } catch (error) {
                    console.log(`    × basic ${ansType} 조회 실패: ${error.response?.status || error.message}`);
                }
            }

            return results;
        } catch (error) {
            console.error('분석 상세 정보 조회 실패:', error.message);
            return null;
        }
    }

    async extractAllData() {
        try {
            // 1. 주문 리스트 가져오기
            const orderData = await this.getOrderList();
            if (!orderData) {
                throw new Error('주문 리스트를 가져올 수 없습니다');
            }

            console.log(`총 ${orderData.totalCnt}개의 주문 발견`);

            // 2. 최신 주문에서 oddId 찾기
            if (orderData.list && orderData.list.length > 0) {
                const latestOrder = orderData.list[0];
                const oddId = latestOrder.orderDetail?.oddId;

                console.log(`최신 주문 oddId: ${oddId}`);

                // 3. 상세 정보 가져오기 (필요시)
                let detail = null;
                if (oddId) {
                    detail = await this.getAnalysisDetail(oddId);
                }

                // 4. 추가 정보 가져오기
                const subscription = await this.getSubscriptionInfo();
                const alarm = await this.getAlarmInfo();

                // 5. 데이터 정리 및 반환
                return {
                    memId: this.memId,
                    totalOrders: orderData.totalCnt,
                    orders: orderData.list,
                    latestOrder: latestOrder,
                    oddId: oddId,
                    analysisDetail: detail,
                    subscription: subscription,
                    alarm: alarm,
                    extractedAt: new Date().toISOString()
                };
            } else {
                throw new Error('주문 데이터가 없습니다');
            }
        } catch (error) {
            console.error('데이터 추출 실패:', error.message);
            return null;
        }
    }
}

// 테스트 실행
async function test() {
    const scraper = new ApiScraper();

    // 환경변수에서 로그인 정보 가져오기
    const loginId = process.env.INSUNIVERSE_EMAIL;  // newsh11
    const password = process.env.INSUNIVERSE_PASSWORD;

    if (!loginId || !password) {
        console.error('❌ 환경변수에 INSUNIVERSE_EMAIL과 INSUNIVERSE_PASSWORD를 설정해주세요');
        return;
    }

    // 로그인
    const loginSuccess = await scraper.login(loginId, password);
    if (!loginSuccess) {
        console.error('로그인에 실패했습니다');
        return;
    }

    // 데이터 추출
    const data = await scraper.extractAllData();
    if (data) {
        console.log('✅ 데이터 추출 성공!');
        console.log(JSON.stringify(data, null, 2));
    }
}

// 직접 실행 시 테스트
if (require.main === module) {
    test();
}

module.exports = ApiScraper;