const express = require('express');
const path = require('path');
const SimpleInsuniverseScraper = require('./simple-scraper');
const MakeWebhookIntegration = require('./make-webhook');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 메모리에 작업 상태 저장
const jobQueue = new Map();
let jobIdCounter = 1;

// 홈페이지 - 고객 정보 입력 폼
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Insuniverse 데이터 수집</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="text"], input[type="tel"], input[type="password"] {
                width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;
                font-size: 16px; box-sizing: border-box;
            }
            button { 
                background: #007bff; color: white; padding: 12px 30px; 
                border: none; border-radius: 4px; font-size: 16px; cursor: pointer; 
            }
            button:hover { background: #0056b3; }
            .status { margin-top: 20px; padding: 10px; border-radius: 4px; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        </style>
    </head>
    <body>
        <h1>🔍 Insuniverse 데이터 수집</h1>
        <p>고객의 보험 분석 데이터를 자동으로 수집합니다.</p>
        
        <form id="customerForm">
            <div class="form-group">
                <label for="insuId">Insuniverse 아이디 *</label>
                <input type="text" id="insuId" name="insuId"
                       placeholder="아이디 입력" required>
            </div>

            <div class="form-group">
                <label for="insuPassword">Insuniverse 비밀번호 *</label>
                <input type="password" id="insuPassword" name="insuPassword"
                       placeholder="비밀번호" required>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

            <div class="form-group">
                <label for="customerName">고객명 *</label>
                <input type="text" id="customerName" name="customerName"
                       placeholder="예: 김지훈" required>
            </div>

            <div class="form-group">
                <label for="customerPhone">전화번호 *</label>
                <input type="tel" id="customerPhone" name="customerPhone"
                       placeholder="예: 010-2022-1053" required>
            </div>

            <div class="form-group">
                <label for="webhookUrl">Make.com 웹훅 URL (선택사항)</label>
                <input type="text" id="webhookUrl" name="webhookUrl"
                       value="${process.env.MAKE_WEBHOOK_URL || ''}"
                       placeholder="https://hook.make.com/your-webhook-url">
            </div>
            
            <button type="submit">🚀 데이터 수집 시작</button>
        </form>
        
        <div id="status"></div>
        
        <script>
            document.getElementById('customerForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                const statusDiv = document.getElementById('status');
                statusDiv.innerHTML = '<div class="info">🔄 데이터 수집을 시작합니다...</div>';
                
                try {
                    const response = await fetch('/collect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        statusDiv.innerHTML = 
                            '<div class="success">✅ 데이터 수집이 시작되었습니다!</div>' +
                            '<div class="info">작업 ID: ' + result.jobId + '</div>' +
                            '<div class="info">상태 확인: <a href="/status/' + result.jobId + '">/status/' + result.jobId + '</a></div>';
                    } else {
                        statusDiv.innerHTML = '<div class="error">❌ 오류: ' + result.error + '</div>';
                    }
                } catch (error) {
                    statusDiv.innerHTML = '<div class="error">❌ 요청 실패: ' + error.message + '</div>';
                }
            });
        </script>
    </body>
    </html>
    `);
});

// 데이터 수집 시작 엔드포인트
app.post('/collect', async (req, res) => {
    const { insuId, insuPassword, customerName, customerPhone, webhookUrl } = req.body;

    if (!insuId || !insuPassword || !customerName || !customerPhone) {
        return res.json({ success: false, error: '모든 필수 정보를 입력해주세요.' });
    }
    
    const jobId = jobIdCounter++;
    
    // 작업 정보 저장
    jobQueue.set(jobId, {
        id: jobId,
        insuId: insuId,
        insuPassword: insuPassword,
        customerName: customerName,
        customerPhone: customerPhone,
        webhookUrl: webhookUrl || process.env.MAKE_WEBHOOK_URL,
        status: 'queued',
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        result: null,
        error: null
    });
    
    // 비동기로 데이터 수집 시작
    collectCustomerData(jobId);
    
    res.json({ 
        success: true, 
        jobId: jobId,
        message: '데이터 수집이 시작되었습니다.',
        statusUrl: `/status/${jobId}`
    });
});

// 작업 상태 확인
app.get('/status/:jobId', (req, res) => {
    const jobId = parseInt(req.params.jobId);
    const job = jobQueue.get(jobId);
    
    if (!job) {
        return res.json({ success: false, error: '작업을 찾을 수 없습니다.' });
    }
    
    res.json({
        success: true,
        job: job
    });
});

// 전체 작업 목록
app.get('/jobs', (req, res) => {
    const jobs = Array.from(jobQueue.values())
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10); // 최근 10개

    res.json({ jobs: jobs });
});

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'insuniverse-automation',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 데이터 수집 실행 함수
async function collectCustomerData(jobId) {
    const job = jobQueue.get(jobId);
    if (!job) return;
    
    try {
        console.log(`\n[작업 ${jobId}] 데이터 수집 시작: ${job.customerName} (${job.customerPhone})`);
        
        // 작업 상태 업데이트
        job.status = 'running';
        job.startedAt = new Date();
        jobQueue.set(jobId, job);
        
        const scraper = new SimpleInsuniverseScraper();
        await scraper.init(true); // 헤드리스 모드

        // 1. 로그인 - 사용자가 입력한 정보 사용
        const loginSuccess = await scraper.login(job.insuId, job.insuPassword);
        
        if (!loginSuccess) {
            throw new Error('Insuniverse 로그인 실패');
        }
        
        // 2. 고객 검색 및 분석 ID 찾기 (SimpleInsuniverseScraper 사용)
        console.log(`[작업 ${jobId}] 고객 검색 중: ${job.customerName}, ${job.customerPhone}`);
        const customerResult = await scraper.searchCustomer(job.customerName, job.customerPhone);
        
        if (!customerResult) {
            throw new Error(`고객을 찾을 수 없습니다: ${job.customerName} (${job.customerPhone})`);
        }
        
        console.log(`[작업 ${jobId}] 분석 ID 발견: ${customerResult.analysisId}`);
        
        // 3. 분석 데이터 수집 (SimpleInsuniverseScraper 사용)
        console.log(`[작업 ${jobId}] 분석 데이터 수집 중...`);
        const analysisData = await scraper.collectAllAnalysisData(customerResult.analysisId);
        
        // 고객 정보를 분석 데이터에 포함
        analysisData.customer = customerResult.customerInfo;
        
        // 4. Make.com 웹훅으로 전송
        if (job.webhookUrl) {
            console.log(`[작업 ${jobId}] Make.com 웹훅 전송 중...`);
            const webhook = new MakeWebhookIntegration(job.webhookUrl);
            await webhook.sendData(analysisData, {
                jobId: jobId,
                customerName: job.customerName,
                customerPhone: job.customerPhone,
                analysisId: customerResult.analysisId
            });
        }
        
        // 작업 완료
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = {
            analysisId: customerResult.analysisId,
            dataCount: Object.keys(analysisData).length,
            webhookSent: !!job.webhookUrl,
            customerInfo: customerResult.customerInfo
        };
        jobQueue.set(jobId, job);
        
        console.log(`[작업 ${jobId}] 데이터 수집 완료!`);
        
        await scraper.close();
        
    } catch (error) {
        console.error(`[작업 ${jobId}] 데이터 수집 실패:`, error.message);
        
        job.status = 'failed';
        job.completedAt = new Date();
        job.error = error.message;
        jobQueue.set(jobId, job);
    }
}

// 기존 함수들 제거 - SimpleInsuniverseScraper가 모든 기능 포함

// 서버 시작
app.listen(PORT, () => {
    console.log(`\n🌐 Insuniverse 데이터 수집 서버가 실행 중입니다.`);
    console.log(`📱 웹 폼: http://localhost:${PORT}`);
    console.log(`📊 작업 상태: http://localhost:${PORT}/jobs`);
    console.log(`\n사용 방법:`);
    console.log(`1. 웹 브라우저에서 http://localhost:${PORT} 접속`);
    console.log(`2. 고객명과 전화번호 입력`);
    console.log(`3. 데이터 수집 시작 버튼 클릭`);
    console.log(`4. 수집된 데이터는 자동으로 Make.com으로 전송됩니다.`);
});

module.exports = app;