const axios = require('axios');

async function testLocalScraper() {
    console.log('로컬 스크래퍼 테스트 시작...\n');

    try {
        // 1. 헬스체크
        console.log('1. 헬스체크...');
        const health = await axios.get('http://localhost:3002/health');
        console.log('✅ 서버 상태:', health.data.status);
        console.log('   Puppeteer:', health.data.puppeteer);

        // 2. 스크래핑 요청 (테스트 데이터)
        console.log('\n2. 스크래핑 요청 전송...');
        const scrapeResponse = await axios.post('http://localhost:3002/scrape', {
            customerName: '김지훈',
            customerPhone: '010-2022-1053',
            insuId: 'test@example.com',  // 실제 계정으로 변경 필요
            insuPassword: 'password123'    // 실제 비밀번호로 변경 필요
        });

        console.log('✅ 작업 시작됨:', scrapeResponse.data);
        const jobId = scrapeResponse.data.jobId;

        // 3. 상태 확인 (10초 간격)
        console.log('\n3. 작업 상태 확인 중...');
        let attempts = 0;
        const maxAttempts = 30; // 최대 5분

        const checkStatus = async () => {
            attempts++;
            const statusResponse = await axios.get(`http://localhost:3002/status/${jobId}`);
            const job = statusResponse.data.job;

            console.log(`   [${attempts}/${maxAttempts}] 상태: ${job.status}`);

            if (job.status === 'completed') {
                console.log('\n🎉 스크래핑 완료!');
                console.log('결과:', JSON.stringify(job.result, null, 2));
                return true;
            } else if (job.status === 'failed') {
                console.log('\n❌ 스크래핑 실패!');
                console.log('에러:', job.error);
                return true;
            }
            return false;
        };

        // 주기적으로 상태 확인
        while (attempts < maxAttempts) {
            const done = await checkStatus();
            if (done) break;
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10초 대기
        }

        if (attempts >= maxAttempts) {
            console.log('\n⏱️ 시간 초과 (5분)');
        }

    } catch (error) {
        console.error('\n❌ 테스트 실패:', error.message);
        if (error.response) {
            console.error('응답 데이터:', error.response.data);
        }
    }
}

// 실행
testLocalScraper();