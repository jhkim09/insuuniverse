const express = require('express');
const cors = require('cors');
const ApiScraper = require('./api-scraper');
const MakeWebhookIntegration = require('./make-webhook');
const IntegratedDataProcessor = require('./notion-integrated-processor');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 설정
app.use(cors());
app.use(express.json());

// 헬스체크
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'insuniverse-api-server',
        timestamp: new Date().toISOString()
    });
});

// 스크래핑 엔드포인트
app.post('/api/scrape', async (req, res) => {
    const { loginId, password, customerName, customerPhone } = req.body;

    if (!loginId || !password) {
        return res.status(400).json({
            success: false,
            error: '로그인 정보가 필요합니다'
        });
    }

    try {
        const scraper = new ApiScraper();

        // 로그인
        console.log(`스크래핑 시작: ${customerName || loginId}`);
        const loginSuccess = await scraper.login(loginId, password);

        if (!loginSuccess) {
            return res.status(401).json({
                success: false,
                error: '로그인에 실패했습니다'
            });
        }

        // 데이터 추출
        const data = await scraper.extractAllData();

        if (!data) {
            return res.status(500).json({
                success: false,
                error: '데이터 추출에 실패했습니다'
            });
        }

        // 고객 정보 추가
        if (customerName || customerPhone) {
            data.customerInfo = {
                name: customerName,
                phone: customerPhone
            };
        }

        // Notion 데이터베이스에 저장 (설정되어 있는 경우)
        let notionResult = null;
        if (process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID) {
            try {
                const processor = new IntegratedDataProcessor();
                notionResult = await processor.processCompleteData({ data });
                console.log('✅ Notion 저장 성공:', notionResult);
            } catch (notionError) {
                console.error('❌ Notion 저장 실패:', notionError.message);
            }
        }

        // Make.com 웹훅으로 전송 (설정되어 있는 경우)
        if (process.env.MAKE_WEBHOOK_URL) {
            try {
                const webhook = new MakeWebhookIntegration(process.env.MAKE_WEBHOOK_URL);
                await webhook.sendData(data, {
                    source: 'api-scraper',
                    timestamp: new Date().toISOString(),
                    notionResult: notionResult
                });
                console.log('웹훅 전송 성공');
            } catch (webhookError) {
                console.error('웹훅 전송 실패:', webhookError.message);
            }
        }

        res.json({
            success: true,
            data: data,
            notionResult: notionResult
        });

    } catch (error) {
        console.error('스크래핑 오류:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 웹 폼 페이지
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Insuniverse 데이터 수집</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .container {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    width: 100%;
                    max-width: 400px;
                }
                h1 {
                    color: #333;
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 24px;
                }
                .form-group {
                    margin-bottom: 20px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    color: #666;
                    font-weight: 500;
                }
                input {
                    width: 100%;
                    padding: 10px;
                    border: 2px solid #e0e0e0;
                    border-radius: 5px;
                    box-sizing: border-box;
                    font-size: 14px;
                    transition: border-color 0.3s;
                }
                input:focus {
                    outline: none;
                    border-color: #667eea;
                }
                button {
                    width: 100%;
                    padding: 12px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                button:hover {
                    transform: translateY(-2px);
                }
                button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                #result {
                    margin-top: 20px;
                    padding: 15px;
                    border-radius: 5px;
                    display: none;
                }
                .success {
                    background: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                .error {
                    background: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
                .loading {
                    background: #d1ecf1;
                    color: #0c5460;
                    border: 1px solid #bee5eb;
                }
                pre {
                    background: #f4f4f4;
                    padding: 10px;
                    border-radius: 5px;
                    overflow-x: auto;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔍 Insuniverse 데이터 수집</h1>
                <form id="scrapeForm">
                    <div class="form-group">
                        <label for="loginId">로그인 ID *</label>
                        <input type="text" id="loginId" name="loginId" required>
                    </div>
                    <div class="form-group">
                        <label for="password">비밀번호 *</label>
                        <input type="password" id="password" name="password" required>
                    </div>
                    <div class="form-group">
                        <label for="customerName">고객명 (선택)</label>
                        <input type="text" id="customerName" name="customerName">
                    </div>
                    <div class="form-group">
                        <label for="customerPhone">고객 전화번호 (선택)</label>
                        <input type="tel" id="customerPhone" name="customerPhone">
                    </div>
                    <button type="submit">데이터 수집 시작</button>
                </form>
                <div id="result"></div>
            </div>

            <script>
                document.getElementById('scrapeForm').addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData.entries());

                    const button = e.target.querySelector('button');
                    const resultDiv = document.getElementById('result');

                    button.disabled = true;
                    button.textContent = '처리 중...';
                    resultDiv.style.display = 'block';
                    resultDiv.className = 'loading';
                    resultDiv.innerHTML = '데이터를 수집하고 있습니다. 잠시만 기다려주세요...';

                    try {
                        const response = await fetch('/api/scrape', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(data)
                        });

                        const result = await response.json();

                        if (result.success) {
                            resultDiv.className = 'success';
                            resultDiv.innerHTML = \`
                                <strong>✅ 데이터 수집 완료!</strong>
                                <pre>\${JSON.stringify(result.data, null, 2)}</pre>
                            \`;
                        } else {
                            resultDiv.className = 'error';
                            resultDiv.innerHTML = \`<strong>❌ 오류:</strong> \${result.error}\`;
                        }
                    } catch (error) {
                        resultDiv.className = 'error';
                        resultDiv.innerHTML = \`<strong>❌ 오류:</strong> \${error.message}\`;
                    } finally {
                        button.disabled = false;
                        button.textContent = '데이터 수집 시작';
                    }
                });
            </script>
        </body>
        </html>
    `);
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`\n🚀 Insuniverse API 서버가 실행 중입니다`);
    console.log(`📍 주소: http://localhost:${PORT}`);
    console.log(`\n환경 설정:`);
    console.log(`- MAKE_WEBHOOK_URL: ${process.env.MAKE_WEBHOOK_URL ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`- NOTION_API_KEY: ${process.env.NOTION_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`- NOTION_DATABASE_ID: ${process.env.NOTION_DATABASE_ID ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`- NOTION_ANS_MASTER_DB: ${process.env.NOTION_ANS_MASTER_DB ? '✅ 설정됨' : '❌ 미설정'}`);
    console.log(`- PORT: ${PORT}\n`);
});

module.exports = app;