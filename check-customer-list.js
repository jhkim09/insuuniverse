const puppeteer = require('puppeteer');
require('dotenv').config();

async function checkCustomerList() {
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
        
        console.log('subscribe API 호출하여 고객 데이터 확인...');
        
        // subscribe API 호출해서 전체 응답 데이터 확인
        const subscribeResult = await page.evaluate(async () => {
            try {
                const response = await fetch('https://api.insuniverse.com/subscribe/808', {
                    method: 'GET',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.text();
                    return {
                        success: true,
                        data: JSON.parse(data)
                    };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
            return { success: false };
        });
        
        if (subscribeResult.success) {
            console.log('\n=== Subscribe API 전체 응답 분석 ===');
            const data = subscribeResult.data;
            
            console.log('최상위 키들:', Object.keys(data));
            
            // 각 섹션을 자세히 분석
            Object.entries(data).forEach(([key, value]) => {
                console.log(`\n--- ${key} 섹션 ---`);
                
                if (Array.isArray(value)) {
                    console.log(`배열 크기: ${value.length}`);
                    if (value.length > 0) {
                        console.log('첫 번째 항목 구조:', Object.keys(value[0]));
                        console.log('첫 번째 항목 데이터:', JSON.stringify(value[0], null, 2));
                        
                        // 고객 ID가 될 수 있는 필드들 찾기
                        const firstItem = value[0];
                        Object.entries(firstItem).forEach(([subKey, subValue]) => {
                            if (subKey.toLowerCase().includes('id') || 
                                subKey.toLowerCase().includes('customer') ||
                                subKey.toLowerCase().includes('client') ||
                                subKey.toLowerCase().includes('mem')) {
                                console.log(`  🔍 잠재적 고객 ID 필드: ${subKey} = ${subValue}`);
                            }
                        });
                    }
                } else if (typeof value === 'object' && value !== null) {
                    console.log('객체 구조:', Object.keys(value));
                    console.log('객체 데이터:', JSON.stringify(value, null, 2));
                } else {
                    console.log('값:', value);
                }
            });
            
            // 분석 ID로 보이는 숫자들 모두 추출
            const dataStr = JSON.stringify(data);
            const potentialIds = dataStr.match(/\b\d{4,6}\b/g);
            if (potentialIds) {
                const uniqueIds = [...new Set(potentialIds)].filter(id => id !== '808');
                console.log('\n🔍 발견된 잠재적 분석 ID들:', uniqueIds);
            }
        }
        
        // 실제 분석결과조회 페이지로 이동해서 DOM 확인
        console.log('\n=== 분석결과조회 페이지 DOM 확인 ===');
        try {
            await page.goto('https://www.insuniverse.com/analysis/list', { waitUntil: 'networkidle2' });
            await page.waitForTimeout(5000);
            
            const currentUrl = page.url();
            console.log('현재 URL:', currentUrl);
            
            // 페이지에서 고객 선택 UI 확인
            const customerSelectionUI = await page.evaluate(() => {
                const result = {
                    dropdowns: [],
                    buttons: [],
                    links: [],
                    tables: [],
                    lists: []
                };
                
                // 드롭다운/셀렉트 박스 확인
                document.querySelectorAll('select').forEach(select => {
                    const options = Array.from(select.options).map(opt => ({
                        value: opt.value,
                        text: opt.textContent?.trim()
                    }));
                    result.dropdowns.push({
                        name: select.name,
                        id: select.id,
                        className: select.className,
                        options: options.slice(0, 5) // 처음 5개만
                    });
                });
                
                // 클릭 가능한 요소들 확인
                document.querySelectorAll('[onclick], [data-id], .clickable').forEach(el => {
                    const onclick = el.onclick?.toString() || '';
                    const dataId = el.dataset?.id || '';
                    
                    if (onclick.includes('customer') || onclick.includes('client') || 
                        onclick.includes('select') || dataId) {
                        result.buttons.push({
                            textContent: el.textContent?.trim().substring(0, 50),
                            onclick: onclick.substring(0, 100),
                            dataId: dataId,
                            className: el.className
                        });
                    }
                });
                
                // 테이블에서 고객 정보 확인
                document.querySelectorAll('table').forEach((table, index) => {
                    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
                    const firstRow = table.querySelector('tbody tr');
                    
                    if (firstRow) {
                        const cells = Array.from(firstRow.querySelectorAll('td')).map(td => td.textContent?.trim());
                        result.tables.push({
                            index: index,
                            headers: headers,
                            sampleRow: cells,
                            totalRows: table.querySelectorAll('tbody tr').length
                        });
                    }
                });
                
                return result;
            });
            
            console.log('\n고객 선택 UI 확인:');
            console.log('드롭다운들:', JSON.stringify(customerSelectionUI.dropdowns, null, 2));
            console.log('클릭 가능한 요소들:', JSON.stringify(customerSelectionUI.buttons, null, 2));
            console.log('테이블들:', JSON.stringify(customerSelectionUI.tables, null, 2));
            
            // 검색 기능을 통해 고객 목록 가져오기 시도
            console.log('\n=== 고객 검색 기능 테스트 ===');
            
            // 빈 검색으로 전체 목록 가져오기 시도
            const searchInput = await page.$('input[type="text"], input[name="search"], input[placeholder*="검색"]');
            if (searchInput) {
                console.log('검색 입력 필드 발견');
                
                // 네트워크 요청 모니터링 시작
                const apiCalls = [];
                page.on('response', response => {
                    const url = response.url();
                    if (url.includes('/api/') && !url.includes('fonts') && !url.includes('banner')) {
                        apiCalls.push({
                            url: url,
                            status: response.status(),
                            method: response.request().method()
                        });
                        console.log(`API 호출: ${response.request().method()} ${url} (${response.status()})`);
                    }
                });
                
                // 검색 실행 (빈 문자열 또는 *로 전체 검색)
                await searchInput.click();
                await searchInput.type(' '); // 공백으로 검색
                
                // 검색 버튼 찾아서 클릭
                const searchButton = await page.$('button:contains("검색"), button[type="submit"], .search-btn');
                if (searchButton) {
                    console.log('검색 버튼 클릭');
                    await searchButton.click();
                } else {
                    // 엔터키로 검색
                    console.log('엔터키로 검색');
                    await page.keyboard.press('Enter');
                }
                
                await page.waitForTimeout(3000);
                
                console.log('검색 후 발견된 API 호출들:', apiCalls);
                
                // 검색 결과 확인
                const searchResults = await page.evaluate(() => {
                    const tables = [];
                    document.querySelectorAll('table').forEach((table, index) => {
                        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
                        const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 5).map(row => 
                            Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim())
                        );
                        
                        if (headers.length > 0 || rows.length > 0) {
                            tables.push({
                                index: index,
                                headers: headers,
                                rows: rows,
                                totalRows: table.querySelectorAll('tbody tr').length
                            });
                        }
                    });
                    
                    return { tables };
                });
                
                console.log('검색 결과 테이블:', JSON.stringify(searchResults, null, 2));
            }
            
        } catch (error) {
            console.log('분석결과조회 페이지 접근 실패:', error.message);
        }
        
    } catch (error) {
        console.error('전체 오류:', error);
    } finally {
        await browser.close();
    }
}

checkCustomerList();