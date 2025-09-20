const puppeteer = require('puppeteer');
require('dotenv').config();

class QuickAPITest {
    constructor() {
        this.baseUrl = 'https://www.insuniverse.com';
        this.browser = null;
        this.page = null;
    }

    async init() {
        this.browser = await puppeteer.launch({ headless: false });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    }

    async quickLogin() {
        const email = process.env.INSUNIVERSE_EMAIL;
        const password = process.env.INSUNIVERSE_PASSWORD;

        try {
            console.log('빠른 로그인 중...');
            await this.page.goto(`${this.baseUrl}/auth/login`, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(3000);

            await this.page.type('input[name="id"]', email);
            await this.page.type('input[name="pw"]', password);
            await this.page.click('button[type="submit"]');
            
            await this.page.waitForTimeout(5000);
            console.log('로그인 완료, 현재 URL:', this.page.url());
            
            return true;
        } catch (error) {
            console.error('로그인 실패:', error.message);
            return false;
        }
    }

    async testAPIs() {
        console.log('\n=== 발견된 API 패턴 테스트 ===');
        
        const testAPIs = [
            // 기본 사용자 정보
            'https://api.insuniverse.com/subscribe/808',
            'https://api.insuniverse.com/fc/808',
            
            // 분석 데이터 (10106 기준)
            'https://api.insuniverse.com/analyze/10106/aggregate?page=1&ansType=ANS006&asbSicked=0',
            'https://api.insuniverse.com/analyze/10106/aggregate?page=1&ansType=ANS005&asbSicked=1',
            'https://api.insuniverse.com/analyze/10106/basic?page=1&ansType=ANS008&asbDiseaseCode=&searchYear=5',
            'https://api.insuniverse.com/analyze/10106/basic?page=1&ansType=ANS004&asbDiseaseCode=&searchYear=5',
            
            // PDF 다운로드
            'https://api.insuniverse.com/analyze/10106/hidden-insurance'
        ];

        const results = {};

        for (const apiUrl of testAPIs) {
            try {
                console.log(`\n🔍 테스트 중: ${apiUrl}`);
                
                const result = await this.page.evaluate(async (url) => {
                    try {
                        const response = await fetch(url, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (response.ok) {
                            const contentType = response.headers.get('content-type');
                            let data;
                            
                            if (contentType?.includes('application/pdf')) {
                                // PDF 응답
                                const arrayBuffer = await response.arrayBuffer();
                                return {
                                    success: true,
                                    status: response.status,
                                    contentType: contentType,
                                    dataType: 'pdf',
                                    size: arrayBuffer.byteLength
                                };
                            } else {
                                // JSON 또는 텍스트 응답
                                data = await response.text();
                                return {
                                    success: true,
                                    status: response.status,
                                    contentType: contentType,
                                    dataType: 'json',
                                    data: data,
                                    size: data.length
                                };
                            }
                        } else {
                            return {
                                success: false,
                                status: response.status,
                                statusText: response.statusText
                            };
                        }
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message
                        };
                    }
                }, apiUrl);
                
                if (result.success) {
                    console.log(`✅ 성공: ${result.status} | ${result.contentType} | ${result.size} bytes`);
                    
                    if (result.dataType === 'json' && result.data) {
                        try {
                            const parsed = JSON.parse(result.data);
                            if (parsed.data && Array.isArray(parsed.data)) {
                                console.log(`  📊 데이터 항목: ${parsed.data.length}개`);
                            }
                            if (parsed.pagination) {
                                console.log(`  📄 페이지: ${parsed.pagination.page}/${parsed.pagination.totalPages || '?'}`);
                            }
                            results[apiUrl] = { ...result, parsedData: parsed };
                        } catch (e) {
                            console.log(`  📝 텍스트 응답: ${result.data.substring(0, 100)}...`);
                            results[apiUrl] = result;
                        }
                    } else if (result.dataType === 'pdf') {
                        console.log(`  📄 PDF 파일 크기: ${result.size} bytes`);
                        results[apiUrl] = result;
                    }
                } else {
                    console.log(`❌ 실패: ${result.status} - ${result.statusText || result.error}`);
                    results[apiUrl] = result;
                }
                
                // API 호출 간 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`API 테스트 예외: ${apiUrl} - ${error.message}`);
            }
        }

        return results;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const tester = new QuickAPITest();
    
    try {
        await tester.init();
        
        const loginSuccess = await tester.quickLogin();
        if (!loginSuccess) {
            throw new Error('로그인 실패');
        }
        
        const results = await tester.testAPIs();
        
        console.log('\n=== 테스트 결과 요약 ===');
        Object.entries(results).forEach(([url, result]) => {
            const shortUrl = url.split('/').slice(-2).join('/');
            if (result.success) {
                console.log(`✅ ${shortUrl}: ${result.status} (${result.size} bytes)`);
            } else {
                console.log(`❌ ${shortUrl}: ${result.status || 'ERROR'}`);
            }
        });
        
    } catch (error) {
        console.error('테스트 오류:', error);
    } finally {
        await tester.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = QuickAPITest;