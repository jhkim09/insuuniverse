require('dotenv').config();
const fs = require('fs').promises;
const IntegratedScraperWebhook = require('./integrated-scraper-webhook');
const EnhancedPreprocessor = require('./enhanced-preprocessor');

async function runWithPreprocessing() {
    console.log('🚀 통합 실행 시작...\n');

    try {
        // 1. 스크래핑 실행 (웹훅 전송 없이)
        console.log('📊 Step 1: InsuniVerse 데이터 스크래핑 중...');
        const scraper = new IntegratedScraperWebhook();

        // 데이터만 가져오기 (웹훅 전송 안함)
        const rawData = await scraper.fetchData();

        if (!rawData) {
            throw new Error('스크래핑 실패');
        }

        // 임시 저장
        await fs.writeFile(
            './data/raw-scraped-data.json',
            JSON.stringify(rawData, null, 2)
        );
        console.log('✅ 스크래핑 완료\n');

        // 2. 전처리 실행
        console.log('🔄 Step 2: ANS 타입별 데이터 전처리 중...');
        const preprocessor = new EnhancedPreprocessor();
        const processedData = preprocessor.preprocessWithANS(rawData);

        // 전처리 결과 저장
        await fs.writeFile(
            './data/enhanced-preprocessed-data.json',
            JSON.stringify(processedData, null, 2)
        );

        console.log('📊 ANS별 요약:');
        console.log(JSON.stringify(processedData.ans_summary, null, 2));
        console.log('\n✅ 전처리 완료\n');

        // 3. Make.com 웹훅 전송
        console.log('📤 Step 3: Make.com 웹훅 전송 중...');

        if (!process.env.MAKE_WEBHOOK_URL) {
            throw new Error('MAKE_WEBHOOK_URL이 설정되지 않았습니다.');
        }

        const response = await fetch(process.env.MAKE_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(processedData.flat_data) // 플랫 데이터만 전송
        });

        if (!response.ok) {
            throw new Error(`웹훅 전송 실패: ${response.status}`);
        }

        const result = await response.text();
        console.log('✅ 웹훅 전송 완료:', result);

        // 4. 결과 요약
        console.log('\n' + '='.repeat(50));
        console.log('📊 최종 결과 요약:');
        console.log('='.repeat(50));
        console.log(`- 총 질병 수: ${processedData.diseases_with_ans.length}개`);
        console.log(`- 통원(ANS002): ${processedData.ans_summary.ANS002_outpatient_count}건`);
        console.log(`- 입원(ANS003): ${processedData.ans_summary.ANS003_inpatient_count}건 (${processedData.ans_summary.ANS003_inpatient_days}일)`);
        console.log(`- 수술(ANS004): ${processedData.ans_summary.ANS004_surgery_count}건`);
        console.log(`- 치과(ANS007): ${processedData.ans_summary.ANS007_dental_count}건`);
        console.log('='.repeat(50));

        console.log('\n✨ 모든 작업이 완료되었습니다!');
        console.log('📁 결과 파일:');
        console.log('  - ./data/raw-scraped-data.json (원본)');
        console.log('  - ./data/enhanced-preprocessed-data.json (전처리)');

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        console.error('상세:', error);
        process.exit(1);
    }
}

// 직접 실행시
if (require.main === module) {
    runWithPreprocessing();
}

module.exports = runWithPreprocessing;