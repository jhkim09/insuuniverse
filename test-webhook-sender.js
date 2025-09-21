const axios = require('axios');
const fs = require('fs').promises;

class WebhookTester {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl || process.env.MAKE_WEBHOOK_URL;
    }

    // 테스트 데이터 전송
    async sendTestData() {
        try {
            // 테스트 데이터 파일 읽기
            const testData = JSON.parse(
                await fs.readFile('./data/test-new-format.json', 'utf8')
            );

            console.log('📤 웹훅으로 데이터 전송 중...');
            console.log('- URL:', this.webhookUrl);
            console.log('- 데이터 크기:', JSON.stringify(testData).length, 'bytes');

            // Make.com 웹훅으로 전송
            const response = await axios.post(this.webhookUrl, testData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ 전송 성공!');
            console.log('- 상태 코드:', response.status);
            console.log('- 응답:', response.data);

            return {
                success: true,
                status: response.status,
                data: response.data
            };

        } catch (error) {
            console.error('❌ 전송 실패:', error.message);
            if (error.response) {
                console.error('- 상태 코드:', error.response.status);
                console.error('- 응답:', error.response.data);
            }
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 간단한 테스트 데이터 전송
    async sendSimpleTest() {
        const simpleData = {
            test: true,
            timestamp: new Date().toISOString(),
            message: "Make.com 웹훅 연결 테스트"
        };

        console.log('📤 간단한 테스트 데이터 전송...');

        try {
            const response = await axios.post(this.webhookUrl, simpleData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ 테스트 성공!');
            console.log('- 응답:', response.data);
            return response.data;

        } catch (error) {
            console.error('❌ 테스트 실패:', error.message);
            return null;
        }
    }

    // 실제 형식의 데이터 전송 (변환된 형식)
    async sendConvertedData() {
        try {
            // 변환된 데이터 파일 읽기
            const convertedData = JSON.parse(
                await fs.readFile('./data/notion-dual-db-payload.json', 'utf8')
            );

            console.log('📤 변환된 Notion 형식 데이터 전송 중...');
            console.log('- 고객 DB 필드 수:', Object.keys(convertedData.customerDatabase.properties).length);
            console.log('- 분석 DB 필드 수:', Object.keys(convertedData.analysisDatabase.properties).length);

            const response = await axios.post(this.webhookUrl, convertedData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ 전송 성공!');
            return response.data;

        } catch (error) {
            console.error('❌ 전송 실패:', error.message);
            return null;
        }
    }
}

// 메인 실행 함수
async function main() {
    require('dotenv').config();

    const webhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!webhookUrl) {
        console.error('❌ MAKE_WEBHOOK_URL이 .env 파일에 설정되어 있지 않습니다.');
        return;
    }

    const tester = new WebhookTester(webhookUrl);

    console.log('🚀 Make.com 웹훅 테스트 시작');
    console.log('=' .repeat(50));

    // 테스트 옵션 선택
    const args = process.argv.slice(2);
    const testType = args[0] || 'simple';

    switch(testType) {
        case 'simple':
            console.log('\n1. 간단한 연결 테스트');
            await tester.sendSimpleTest();
            break;

        case 'full':
            console.log('\n2. 전체 데이터 테스트');
            await tester.sendTestData();
            break;

        case 'converted':
            console.log('\n3. 변환된 Notion 형식 테스트');
            await tester.sendConvertedData();
            break;

        case 'all':
            console.log('\n1. 간단한 연결 테스트');
            await tester.sendSimpleTest();

            console.log('\n2. 전체 데이터 테스트');
            await tester.sendTestData();

            console.log('\n3. 변환된 Notion 형식 테스트');
            await tester.sendConvertedData();
            break;

        default:
            console.log(`
사용법:
  node test-webhook-sender.js [옵션]

옵션:
  simple    - 간단한 연결 테스트 (기본값)
  full      - 전체 원본 데이터 테스트
  converted - 변환된 Notion 형식 테스트
  all       - 모든 테스트 순차 실행
            `);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('✅ 테스트 완료!');
    console.log('\nMake.com에서 실행 결과를 확인하세요:');
    console.log('1. Make.com 대시보드 → 시나리오 열기');
    console.log('2. History 탭 확인');
    console.log('3. 각 모듈의 Input/Output 검토');
}

// 모듈 내보내기
module.exports = WebhookTester;

// 직접 실행시
if (require.main === module) {
    main();
}