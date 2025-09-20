const InsuniverseScraper = require('./scraper');
const MakeWebhookIntegration = require('./make-webhook');
require('dotenv').config();

async function runLocalScraper() {
    const scraper = new InsuniverseScraper();

    try {
        console.log('🚀 로컬 스크래퍼 시작...');

        // Puppeteer 초기화 (헤드리스 모드)
        await scraper.init(false); // false = 브라우저 표시

        // 로그인
        const email = process.env.INSUNIVERSE_EMAIL || 'your-email@example.com';
        const password = process.env.INSUNIVERSE_PASSWORD || 'your-password';

        console.log(`로그인 시도: ${email}`);
        const loginSuccess = await scraper.login(email, password);

        if (!loginSuccess) {
            throw new Error('로그인 실패');
        }

        console.log('✅ 로그인 성공');

        // 고객 검색
        const customerName = process.argv[2] || '김지훈';
        const customerPhone = process.argv[3] || '010-2022-1053';

        console.log(`\n고객 검색: ${customerName} (${customerPhone})`);
        const searchResult = await scraper.searchCustomer(customerName, customerPhone);

        if (!searchResult || !searchResult.analysisId) {
            throw new Error('고객을 찾을 수 없거나 분석 ID가 없습니다');
        }

        console.log(`✅ 분석 ID 발견: ${searchResult.analysisId}`);
        console.log('고객 정보:', searchResult.customerInfo);

        // 분석 데이터 수집
        console.log('\n📊 분석 데이터 수집 시작...');
        const analysisData = await scraper.collectAllAnalysisData(searchResult.analysisId);

        // 고객 정보 포함
        analysisData.customer = searchResult.customerInfo;

        // 데이터 구조 확인
        console.log('\n=== 수집된 데이터 요약 ===');
        console.log('메타데이터:', analysisData.metadata);
        console.log('API 개수:', Object.keys(analysisData.apis).length);

        Object.entries(analysisData.apis).forEach(([name, api]) => {
            console.log(`- ${name}: ${api.summary?.type || 'unknown'} (${api.summary?.itemCount || 0}개 항목)`);
        });

        // Make.com 웹훅으로 전송
        const webhookUrl = process.env.MAKE_WEBHOOK_URL;
        if (webhookUrl) {
            console.log('\n📤 Make.com 웹훅으로 전송 중...');
            const webhook = new MakeWebhookIntegration(webhookUrl);

            const result = await webhook.sendData(analysisData, {
                source: 'local-scraper',
                customerName: customerName,
                customerPhone: customerPhone,
                analysisId: searchResult.analysisId,
                timestamp: new Date().toISOString()
            });

            if (result.success) {
                console.log('✅ 웹훅 전송 성공!');
            } else {
                console.log('❌ 웹훅 전송 실패:', result.error);
            }
        } else {
            console.log('\n⚠️ MAKE_WEBHOOK_URL이 설정되지 않았습니다');
        }

        // 로컬에 저장
        const fs = require('fs').promises;
        const filename = `data/real_data_${customerName}_${Date.now()}.json`;
        await fs.mkdir('data', { recursive: true });
        await fs.writeFile(filename, JSON.stringify(analysisData, null, 2));
        console.log(`\n💾 데이터 저장: ${filename}`);

        return analysisData;

    } catch (error) {
        console.error('❌ 에러 발생:', error.message);
        return null;
    } finally {
        await scraper.close();
        console.log('\n🔚 스크래퍼 종료');
    }
}

// 실행
if (require.main === module) {
    runLocalScraper().then(data => {
        if (data) {
            console.log('\n✨ 실행 완료!');
            console.log('수집된 데이터 타입:', data.metadata?.successCount > 0 ? 'REAL' : 'MOCK');
        }
        process.exit(0);
    });
}

module.exports = runLocalScraper;