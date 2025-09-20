const express = require('express');
const cors = require('cors');
const InsuniverseScraper = require('./scraper');
const MakeWebhookIntegration = require('./make-webhook');
require('dotenv').config();

const app = express();
const PORT = process.env.LOCAL_PORT || 3002;

// CORS 설정 - Render 서버에서 접근 허용
app.use(cors({
    origin: [
        'https://insuuniverse.onrender.com',
        'http://localhost:3001',
        'http://localhost:3002'
    ],
    credentials: true
}));

app.use(express.json());

// 작업 큐
const jobQueue = new Map();
let jobIdCounter = 1;

// 헬스체크
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'local-scraper-server',
        timestamp: new Date().toISOString(),
        puppeteer: 'available',
        jobs: jobQueue.size
    });
});

// 스크래핑 요청 처리
app.post('/scrape', async (req, res) => {
    const { customerName, customerPhone, insuId, insuPassword } = req.body;

    if (!customerName || !customerPhone || !insuId || !insuPassword) {
        return res.status(400).json({
            success: false,
            error: '필수 정보가 누락되었습니다'
        });
    }

    const jobId = `local-${jobIdCounter++}`;

    // 작업 등록
    jobQueue.set(jobId, {
        id: jobId,
        customerName,
        customerPhone,
        status: 'processing',
        createdAt: new Date().toISOString()
    });

    // 비동기 스크래핑 시작
    performScraping(jobId, {
        customerName,
        customerPhone,
        insuId,
        insuPassword
    });

    res.json({
        success: true,
        jobId: jobId,
        message: '스크래핑이 시작되었습니다'
    });
});

// 작업 상태 조회
app.get('/status/:jobId', (req, res) => {
    const job = jobQueue.get(req.params.jobId);

    if (!job) {
        return res.status(404).json({
            success: false,
            error: '작업을 찾을 수 없습니다'
        });
    }

    res.json({
        success: true,
        job: job
    });
});

// 실제 스크래핑 수행
async function performScraping(jobId, params) {
    const job = jobQueue.get(jobId);
    const scraper = new InsuniverseScraper();

    try {
        console.log(`\n[${jobId}] 스크래핑 시작: ${params.customerName}`);

        // Puppeteer 초기화
        await scraper.init(true); // true = 헤드리스 모드

        // 로그인
        console.log(`[${jobId}] 로그인 중...`);
        const loginSuccess = await scraper.login(params.insuId, params.insuPassword);

        if (!loginSuccess) {
            throw new Error('Insuniverse 로그인 실패');
        }

        // 고객 검색
        console.log(`[${jobId}] 고객 검색: ${params.customerName} (${params.customerPhone})`);
        const searchResult = await scraper.searchCustomer(params.customerName, params.customerPhone);

        if (!searchResult || !searchResult.analysisId) {
            throw new Error('고객을 찾을 수 없거나 분석 ID가 없습니다');
        }

        console.log(`[${jobId}] 분석 ID: ${searchResult.analysisId}`);

        // 분석 데이터 수집
        console.log(`[${jobId}] 데이터 수집 중...`);
        const analysisData = await scraper.collectAllAnalysisData(searchResult.analysisId);

        // 고객 정보 추가
        analysisData.customer = searchResult.customerInfo;

        // Make.com 웹훅으로 전송
        const webhookUrl = process.env.MAKE_WEBHOOK_URL;
        if (webhookUrl) {
            console.log(`[${jobId}] 웹훅 전송 중...`);
            const webhook = new MakeWebhookIntegration(webhookUrl);

            const webhookResult = await webhook.sendData(analysisData, {
                jobId: jobId,
                source: 'local-scraper',
                customerName: params.customerName,
                customerPhone: params.customerPhone,
                analysisId: searchResult.analysisId
            });

            console.log(`[${jobId}] 웹훅 전송 ${webhookResult.success ? '성공' : '실패'}`);
        }

        // 작업 완료 업데이트
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.result = {
            analysisId: searchResult.analysisId,
            dataType: 'real',
            customerInfo: searchResult.customerInfo,
            apiCount: Object.keys(analysisData.apis).length,
            successCount: analysisData.metadata.successCount
        };

        console.log(`[${jobId}] ✅ 스크래핑 완료!`);

    } catch (error) {
        console.error(`[${jobId}] ❌ 에러:`, error.message);

        job.status = 'failed';
        job.completedAt = new Date().toISOString();
        job.error = error.message;
    } finally {
        await scraper.close();
        jobQueue.set(jobId, job);

        // 30분 후 작업 정보 삭제
        setTimeout(() => {
            jobQueue.delete(jobId);
        }, 30 * 60 * 1000);
    }
}

// 서버 시작
app.listen(PORT, () => {
    console.log(`\n🖥️  로컬 스크래핑 서버가 실행 중입니다`);
    console.log(`📍 주소: http://localhost:${PORT}`);
    console.log(`🔌 Puppeteer: 사용 가능`);
    console.log(`🌐 CORS: Render 서버 허용\n`);
    console.log(`환경 설정:`);
    console.log(`- MAKE_WEBHOOK_URL: ${process.env.MAKE_WEBHOOK_URL ? '설정됨' : '❌ 미설정'}`);
    console.log(`- 로컬 포트: ${PORT}`);
});