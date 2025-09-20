const puppeteer = require('puppeteer');
require('dotenv').config();

async function debugSearchAPI() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // 로그인
        console.log('로그인 중...');
        await page.goto('https://www.insuniverse.com/auth/login', { waitUntil: 'networkidle2' });
        await page.waitForTimeout(3000);
        
        await page.type('input[name="id"]', process.env.INSUNIVERSE_EMAIL);
        await page.type('input[name="pw"]', process.env.INSUNIVERSE_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
        
        console.log('\n=== 고객 검색 API 테스트 ===');
        
        // 다양한 검색 API 패턴 테스트
        const searchAPIs = [
            // 빈 검색 (전체 목록)
            'https://api.insuniverse.com/order-detail?memId=808&page=1&searchKey=usrName&searchText=',
            
            // 이름 검색
            'https://api.insuniverse.com/order-detail?memId=808&page=1&searchKey=usrName&searchText=김지훈',
            
            // 전화번호 검색
            'https://api.insuniverse.com/order-detail?memId=808&page=1&searchKey=usrPhone&searchText=010-2022-1053',
            'https://api.insuniverse.com/order-detail?memId=808&page=1&searchKey=usrPhone&searchText=01020221053',
            
            // 다른 검색 키들
            'https://api.insuniverse.com/order-detail?memId=808&page=1&searchKey=&searchText=',
            'https://api.insuniverse.com/order-detail?memId=808&page=1',
        ];
        
        for (const apiUrl of searchAPIs) {
            console.log(`\n🔍 테스트: ${apiUrl}`);
            
            const result = await page.evaluate(async (url) => {
                try {
                    const response = await fetch(url, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json, text/plain, */*'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.text();
                        return {
                            success: true,
                            status: response.status,
                            data: data
                        };
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
                console.log(`✅ 성공: ${result.status} (${result.data.length} bytes)`);
                
                try {
                    const parsed = JSON.parse(result.data);
                    console.log('응답 구조:', Object.keys(parsed));
                    
                    // list 배열 확인 (data가 아닌 list)
                    if (parsed.list && Array.isArray(parsed.list)) {
                        console.log(`리스트 배열 크기: ${parsed.list.length}`);
                        console.log(`count: ${parsed.count}`);
                        
                        if (parsed.list.length > 0) {
                            console.log('첫 번째 항목 구조:', Object.keys(parsed.list[0]));
                            console.log('첫 번째 항목 전체 데이터:', JSON.stringify(parsed.list[0], null, 2));
                            
                            // 고객 관련 필드들만 별도 출력
                            const customer = parsed.list[0];
                            console.log('\n고객 관련 필드들:');
                            Object.entries(customer).forEach(([key, value]) => {
                                if (key.toLowerCase().includes('name') || 
                                    key.toLowerCase().includes('phone') || 
                                    key.toLowerCase().includes('id') ||
                                    key.toLowerCase().includes('usr') ||
                                    key.toLowerCase().includes('mem') ||
                                    key.toLowerCase().includes('ord') ||
                                    key.toLowerCase().includes('asb')) {
                                    console.log(`  🔍 ${key}: ${value}`);
                                }
                            });
                        }
                    } else if (parsed.data && Array.isArray(parsed.data)) {
                        console.log(`데이터 배열 크기: ${parsed.data.length}`);
                        
                        if (parsed.data.length > 0) {
                            console.log('첫 번째 항목 구조:', Object.keys(parsed.data[0]));
                            console.log('첫 번째 항목 데이터:', JSON.stringify(parsed.data[0], null, 2));
                        }
                    }
                    
                    // 페이지네이션 정보 확인
                    if (parsed.pagination || parsed.meta) {
                        console.log('페이지네이션:', parsed.pagination || parsed.meta);
                    }
                    
                } catch (parseError) {
                    console.log('JSON 파싱 실패:', result.data.substring(0, 200));
                }
            } else {
                console.log(`❌ 실패: ${result.status} - ${result.statusText || result.error}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('전체 오류:', error);
    } finally {
        await browser.close();
    }
}

debugSearchAPI();