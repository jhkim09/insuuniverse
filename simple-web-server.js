const express = require('express');
const SimpleInsuniverseScraper = require('./simple-scraper');
const MakeWebhookIntegration = require('./make-webhook');
const DetailedRecordsProcessor = require('./detailed-records-processor');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/downloads', express.static('downloads')); // PDF 파일 서빙

const jobQueue = new Map();
let jobIdCounter = 1;

// 홈페이지
app.get('/', (req, res) => {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL || '';
    
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
            input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 16px; box-sizing: border-box; }
            button { background: #007bff; color: white; padding: 12px 30px; border: none; border-radius: 4px; font-size: 16px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .status { margin-top: 20px; padding: 10px; border-radius: 4px; }
            .success { background: #d4edda; color: #155724; }
            .error { background: #f8d7da; color: #721c24; }
            .info { background: #d1ecf1; color: #0c5460; }
        </style>
    </head>
    <body>
        <h1>🔍 Insuniverse 데이터 수집 (v2)</h1>
        
        <form id="customerForm">
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
                <label for="webhookUrl">Make.com 웹훅 URL</label>
                <input type="text" id="webhookUrl" name="webhookUrl" 
                       value="${webhookUrl}">
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

// 데이터 수집 엔드포인트
app.post('/collect', async (req, res) => {
    const { customerName, customerPhone, webhookUrl } = req.body;
    
    if (!customerName || !customerPhone) {
        return res.json({ success: false, error: '고객명과 전화번호를 모두 입력해주세요.' });
    }
    
    const jobId = jobIdCounter++;
    const finalWebhookUrl = webhookUrl || process.env.MAKE_WEBHOOK_URL;
    
    jobQueue.set(jobId, {
        id: jobId,
        customerName: customerName,
        customerPhone: customerPhone,
        webhookUrl: finalWebhookUrl,
        status: 'queued',
        createdAt: new Date()
    });
    
    // 비동기로 데이터 수집 시작
    collectData(jobId);
    
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
    
    res.json({ success: true, job: job });
});

// 전체 작업 목록
app.get('/jobs', (req, res) => {
    const jobs = Array.from(jobQueue.values()).slice(-5); // 최근 5개
    res.json({ jobs: jobs });
});

// 데이터 수집 실행
async function collectData(jobId) {
    const job = jobQueue.get(jobId);
    
    try {
        console.log(`\n[작업 ${jobId}] 시작: ${job.customerName} (${job.customerPhone})`);
        
        job.status = 'running';
        job.startedAt = new Date();
        
        const scraper = new SimpleInsuniverseScraper();
        await scraper.init(true); // 헤드리스 모드
        
        // 로그인
        const loginSuccess = await scraper.login(
            process.env.INSUNIVERSE_EMAIL, 
            process.env.INSUNIVERSE_PASSWORD
        );
        
        if (!loginSuccess) {
            throw new Error('로그인 실패');
        }
        
        // 고객 검색
        const customerResult = await scraper.searchCustomer(job.customerName, job.customerPhone);
        
        if (!customerResult) {
            throw new Error('고객을 찾을 수 없습니다');
        }
        
        console.log(`[작업 ${jobId}] 고객 발견: ${customerResult.customerInfo.name}`);
        
        // 분석 데이터 수집 (PDF 다운로드 포함)
        const analysisData = await scraper.collectAllAnalysisData(customerResult.analysisId);
        analysisData.customer = customerResult.customerInfo;
        
        // PDF 다운로드 정보를 웹훅 데이터에 추가
        if (analysisData.pdfReport) {
            const pdfUrl = `http://localhost:${PORT}/downloads/${analysisData.pdfReport.filename}`;
            analysisData.pdfReport.downloadUrl = pdfUrl;
            console.log(`📄 PDF 접근 URL: ${pdfUrl}`);
        }
        
        // 진료기록 상세 처리
        const processor = new DetailedRecordsProcessor();
        const detailedPayload = processor.generateDetailedPayload(analysisData, jobId);
        
        // PDF 정보도 페이로드에 포함
        if (analysisData.pdfReport) {
            detailedPayload.pdfReport = analysisData.pdfReport;
        }
        
        // Make.com 웹훅 전송
        if (job.webhookUrl) {
            console.log(`[작업 ${jobId}] Make.com 웹훅 전송 중...`);
            const webhook = new MakeWebhookIntegration(job.webhookUrl);
            const webhookResult = await webhook.sendData(detailedPayload);
            
            job.webhookResult = webhookResult;
        }
        
        // 작업 완료
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = {
            analysisId: customerResult.analysisId,
            customerInfo: customerResult.customerInfo,
            totalRecords: detailedPayload.medical_records.length,
            webhookSent: !!job.webhookUrl
        };
        
        console.log(`[작업 ${jobId}] 완료!`);
        
        await scraper.close();
        
    } catch (error) {
        console.error(`[작업 ${jobId}] 실패:`, error.message);
        
        job.status = 'failed';
        job.completedAt = new Date();
        job.error = error.message;
    }
    
    jobQueue.set(jobId, job);
}

app.listen(PORT, () => {
    console.log(`\n🌐 Insuniverse 데이터 수집 서버 v2`);
    console.log(`📱 웹 폼: http://localhost:${PORT}`);
    console.log(`📊 작업 상태: http://localhost:${PORT}/jobs`);
    console.log(`🔗 웹훅 URL: ${process.env.MAKE_WEBHOOK_URL}`);
});

module.exports = app;