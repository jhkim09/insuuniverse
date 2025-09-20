const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로컬 서버 URL 설정
const LOCAL_SCRAPER_URL = process.env.LOCAL_SCRAPER_URL || 'http://localhost:3002';

// 홈페이지 - 고객 정보 입력 폼
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Insuniverse 데이터 수집 (하이브리드)</title>
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
            .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
            .server-status {
                position: absolute; top: 20px; right: 20px;
                padding: 10px; border-radius: 5px;
                background: #f8f9fa; border: 1px solid #dee2e6;
            }
            .status-dot {
                display: inline-block; width: 10px; height: 10px;
                border-radius: 50%; margin-right: 5px;
            }
            .online { background: #28a745; }
            .offline { background: #dc3545; }
        </style>
    </head>
    <body>
        <div id="serverStatus" class="server-status">
            <span class="status-dot offline"></span>
            <span id="statusText">로컬 서버 확인 중...</span>
        </div>

        <h1>🔍 Insuniverse 데이터 수집 (실제 데이터)</h1>
        <p>고객의 보험 분석 데이터를 자동으로 수집합니다.</p>

        <div class="warning">
            ⚠️ <strong>중요:</strong> 실제 데이터 수집을 위해 로컬 스크래핑 서버가 실행 중이어야 합니다.
            <br>로컬에서: <code>npm run local</code>
        </div>

        <form id="customerForm">
            <div class="form-group">
                <label for="insuId">Insuniverse 아이디 *</label>
                <input type="text" id="insuId" name="insuId"
                       placeholder="실제 아이디 입력" required>
            </div>

            <div class="form-group">
                <label for="insuPassword">Insuniverse 비밀번호 *</label>
                <input type="password" id="insuPassword" name="insuPassword"
                       placeholder="실제 비밀번호" required>
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

            <button type="submit" id="submitBtn">🚀 실제 데이터 수집 시작</button>
        </form>

        <div id="status"></div>

        <script>
            // 로컬 서버 상태 확인
            async function checkLocalServer() {
                try {
                    const response = await fetch('/check-local');
                    const data = await response.json();

                    const statusDot = document.querySelector('.status-dot');
                    const statusText = document.getElementById('statusText');
                    const submitBtn = document.getElementById('submitBtn');

                    if (data.online) {
                        statusDot.classList.remove('offline');
                        statusDot.classList.add('online');
                        statusText.textContent = '로컬 서버 연결됨';
                        submitBtn.disabled = false;
                    } else {
                        statusDot.classList.remove('online');
                        statusDot.classList.add('offline');
                        statusText.textContent = '로컬 서버 오프라인';
                        submitBtn.disabled = true;
                    }
                } catch (error) {
                    console.error('서버 상태 확인 실패:', error);
                }
            }

            // 페이지 로드 시 및 주기적으로 서버 상태 확인
            checkLocalServer();
            setInterval(checkLocalServer, 5000);

            // 폼 제출 처리
            document.getElementById('customerForm').addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());

                const statusDiv = document.getElementById('status');
                statusDiv.innerHTML = '<div class="info">🔄 로컬 서버에 스크래핑 요청 중...</div>';

                try {
                    const response = await fetch('/collect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (result.success) {
                        statusDiv.innerHTML =
                            '<div class="success">✅ 실제 데이터 수집이 시작되었습니다!</div>' +
                            '<div class="info">작업 ID: ' + result.jobId + '</div>' +
                            '<div class="info">처리 방식: ' + result.method + '</div>' +
                            '<div class="info">상태: ' + result.status + '</div>';

                        if (result.jobId) {
                            // 작업 상태 주기적 확인
                            checkJobStatus(result.jobId);
                        }
                    } else {
                        statusDiv.innerHTML = '<div class="error">❌ 오류: ' + result.error + '</div>';
                    }
                } catch (error) {
                    statusDiv.innerHTML = '<div class="error">❌ 요청 실패: ' + error.message + '</div>';
                }
            });

            // 작업 상태 확인
            async function checkJobStatus(jobId) {
                const statusDiv = document.getElementById('status');

                const interval = setInterval(async () => {
                    try {
                        const response = await fetch('/status/' + jobId);
                        const result = await response.json();

                        if (result.job && result.job.status === 'completed') {
                            clearInterval(interval);
                            statusDiv.innerHTML +=
                                '<div class="success">🎉 데이터 수집 완료!</div>' +
                                '<div class="info">분석 ID: ' + result.job.result.analysisId + '</div>' +
                                '<div class="info">데이터 타입: ' + result.job.result.dataType + ' (실제 데이터)</div>';
                        } else if (result.job && result.job.status === 'failed') {
                            clearInterval(interval);
                            statusDiv.innerHTML +=
                                '<div class="error">❌ 수집 실패: ' + result.job.error + '</div>';
                        }
                    } catch (error) {
                        console.error('상태 확인 실패:', error);
                    }
                }, 3000);

                // 5분 후 자동 중지
                setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
            }
        </script>
    </body>
    </html>
    `);
});

// 로컬 서버 상태 확인
app.get('/check-local', async (req, res) => {
    try {
        const response = await axios.get(`${LOCAL_SCRAPER_URL}/health`, {
            timeout: 2000
        });

        res.json({
            online: true,
            server: LOCAL_SCRAPER_URL,
            status: response.data
        });
    } catch (error) {
        res.json({
            online: false,
            server: LOCAL_SCRAPER_URL,
            error: error.message
        });
    }
});

// 데이터 수집 요청 - 로컬 서버로 전달
app.post('/collect', async (req, res) => {
    const { insuId, insuPassword, customerName, customerPhone } = req.body;

    if (!insuId || !insuPassword || !customerName || !customerPhone) {
        return res.json({
            success: false,
            error: '모든 필수 정보를 입력해주세요.'
        });
    }

    try {
        // 로컬 스크래핑 서버에 요청
        const response = await axios.post(`${LOCAL_SCRAPER_URL}/scrape`, {
            customerName,
            customerPhone,
            insuId,
            insuPassword
        }, {
            timeout: 10000
        });

        res.json({
            success: true,
            jobId: response.data.jobId,
            method: 'local-puppeteer',
            status: 'processing',
            message: '로컬 서버에서 실제 데이터를 수집 중입니다'
        });

    } catch (error) {
        console.error('로컬 서버 요청 실패:', error.message);

        res.json({
            success: false,
            error: '로컬 스크래핑 서버에 연결할 수 없습니다. 로컬에서 npm run local을 실행해주세요.',
            details: error.message
        });
    }
});

// 작업 상태 조회 - 로컬 서버에서 가져오기
app.get('/status/:jobId', async (req, res) => {
    try {
        const response = await axios.get(`${LOCAL_SCRAPER_URL}/status/${req.params.jobId}`, {
            timeout: 5000
        });

        res.json(response.data);
    } catch (error) {
        res.json({
            success: false,
            error: '작업 상태를 확인할 수 없습니다',
            details: error.message
        });
    }
});

// 헬스체크
app.get('/health', async (req, res) => {
    let localServerStatus = 'offline';

    try {
        await axios.get(`${LOCAL_SCRAPER_URL}/health`, { timeout: 2000 });
        localServerStatus = 'online';
    } catch (error) {
        // 로컬 서버 오프라인
    }

    res.json({
        status: 'healthy',
        service: 'insuniverse-web-form-hybrid',
        timestamp: new Date().toISOString(),
        localServer: localServerStatus,
        mode: 'hybrid'
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`\n🌐 Insuniverse 하이브리드 웹 서버가 실행 중입니다.`);
    console.log(`📱 웹 폼: http://localhost:${PORT}`);
    console.log(`🔗 로컬 스크래퍼: ${LOCAL_SCRAPER_URL}`);
    console.log(`\n구조:`);
    console.log(`1. Render 서버: 웹 인터페이스 제공`);
    console.log(`2. 로컬 서버: Puppeteer로 실제 데이터 수집`);
    console.log(`3. Make.com: 수집된 데이터 처리`);
});