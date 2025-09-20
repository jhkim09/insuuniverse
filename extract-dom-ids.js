const puppeteer = require('puppeteer');
require('dotenv').config();

class DOMAnalysisIDExtractor {
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
            console.log('로그인 중...');
            await this.page.goto(`${this.baseUrl}/auth/login`, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(3000);

            await this.page.type('input[name="id"]', email);
            await this.page.type('input[name="pw"]', password);
            await this.page.click('button[type="submit"]');
            
            await this.page.waitForTimeout(5000);
            return true;
        } catch (error) {
            console.error('로그인 실패:', error.message);
            return false;
        }
    }

    async extractAnalysisIDs() {
        console.log('\n=== DOM에서 분석 ID 추출 ===');
        
        try {
            // 분석결과조회 페이지로 이동
            await this.page.goto('https://www.insuniverse.com/analysis/list', { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(5000);
            
            console.log('현재 URL:', this.page.url());
            
            // 제공받은 셀렉터로 데이터 추출
            const specificSelector = '#root > div.wrap > main > div > section:nth-child(3) > div > div.analysis-list > ul > li > a > div.state > span:nth-child(2)';
            
            const analysisData = await this.page.evaluate((selector) => {
                const elements = document.querySelectorAll(selector);
                console.log(`셀렉터로 발견된 요소 수: ${elements.length}`);
                
                return Array.from(elements).map((el, index) => ({
                    index: index,
                    textContent: el.textContent?.trim(),
                    innerHTML: el.innerHTML?.trim(),
                    parentHref: el.closest('a')?.href || '',
                    parentOnclick: el.closest('a')?.onclick?.toString() || ''
                }));
            }, specificSelector);
            
            console.log('특정 셀렉터로 추출된 데이터:', JSON.stringify(analysisData, null, 2));
            
            // 더 넓은 범위로 분석 리스트 전체 확인
            const listData = await this.page.evaluate(() => {
                const result = {
                    analysisListItems: [],
                    allLinks: [],
                    allListItems: []
                };
                
                // analysis-list 클래스 확인
                const analysisList = document.querySelector('.analysis-list');
                if (analysisList) {
                    console.log('analysis-list 요소 발견');
                    
                    // 리스트 아이템들 확인
                    const listItems = analysisList.querySelectorAll('li');
                    Array.from(listItems).forEach((li, index) => {
                        const link = li.querySelector('a');
                        const spans = li.querySelectorAll('span');
                        
                        result.analysisListItems.push({
                            index: index,
                            textContent: li.textContent?.trim(),
                            href: link?.href || '',
                            onclick: link?.onclick?.toString() || '',
                            spans: Array.from(spans).map(span => span.textContent?.trim())
                        });
                    });
                }
                
                // 모든 링크에서 analysis 패턴 찾기
                document.querySelectorAll('a').forEach(link => {
                    const href = link.href || '';
                    const onclick = link.onclick?.toString() || '';
                    
                    if (href.includes('/analysis/') || onclick.includes('analysis')) {
                        result.allLinks.push({
                            href: href,
                            onclick: onclick,
                            textContent: link.textContent?.trim()
                        });
                    }
                });
                
                // ul li 구조 전체 확인
                document.querySelectorAll('ul li').forEach((li, index) => {
                    const link = li.querySelector('a');
                    if (link && (link.href.includes('analysis') || link.onclick?.toString().includes('analysis'))) {
                        result.allListItems.push({
                            index: index,
                            href: link.href,
                            onclick: link.onclick?.toString() || '',
                            textContent: li.textContent?.trim().substring(0, 100)
                        });
                    }
                });
                
                return result;
            });
            
            console.log('\n=== 분석 리스트 전체 구조 ===');
            console.log('analysis-list 아이템들:', JSON.stringify(listData.analysisListItems, null, 2));
            console.log('분석 관련 링크들:', JSON.stringify(listData.allLinks, null, 2));
            console.log('분석 관련 리스트 아이템들:', JSON.stringify(listData.allListItems, null, 2));
            
            // 발견된 분석 ID들 추출
            const foundIDs = new Set();
            
            // 링크 href에서 ID 추출
            listData.allLinks.forEach(link => {
                const match = link.href.match(/\/analysis\/(\d+)/);
                if (match) {
                    foundIDs.add(match[1]);
                    console.log(`📍 링크에서 ID 발견: ${match[1]} (${link.textContent?.substring(0, 30)}...)`);
                }
            });
            
            // onclick에서 ID 추출
            [...listData.allLinks, ...listData.allListItems].forEach(item => {
                const onclickMatches = item.onclick.match(/\d{4,6}/g);
                if (onclickMatches) {
                    onclickMatches.forEach(id => {
                        if (id !== '808') { // memId 제외
                            foundIDs.add(id);
                            console.log(`📍 onclick에서 ID 발견: ${id}`);
                        }
                    });
                }
            });
            
            const uniqueAnalysisIDs = Array.from(foundIDs);
            console.log(`\n🎯 총 발견된 분석 ID들 (${uniqueAnalysisIDs.length}개):`, uniqueAnalysisIDs);
            
            // 분석 결과 조회 버튼 클릭해서 실제 동작 확인
            if (listData.analysisListItems.length > 0) {
                console.log('\n=== 분석 결과 조회 버튼 클릭 테스트 ===');
                
                // 네트워크 요청 모니터링
                const apiCalls = [];
                this.page.on('response', response => {
                    const url = response.url();
                    if (url.includes('/api/') && !url.includes('fonts') && !url.includes('banner')) {
                        apiCalls.push({
                            url: url,
                            status: response.status(),
                            method: response.request().method()
                        });
                        console.log(`API 호출 감지: ${response.request().method()} ${url} (${response.status()})`);
                    }
                });
                
                // URL 변경 모니터링
                let urlChanged = false;
                this.page.on('framenavigated', frame => {
                    if (frame === this.page.mainFrame()) {
                        console.log(`URL 변경됨: ${frame.url()}`);
                        urlChanged = true;
                    }
                });
                
                try {
                    // 분석 결과 조회 버튼 클릭
                    const analyzeButton = await this.page.$('.analysis-list ul li a');
                    if (analyzeButton) {
                        console.log('분석 결과 조회 버튼 클릭...');
                        await analyzeButton.click();
                        
                        // 페이지 변경 또는 API 호출 대기
                        await this.page.waitForTimeout(3000);
                        
                        const newUrl = this.page.url();
                        console.log('클릭 후 URL:', newUrl);
                        
                        // URL에서 분석 ID 추출
                        const urlMatch = newUrl.match(/\/analysis\/(\d+)/);
                        if (urlMatch) {
                            const extractedID = urlMatch[1];
                            console.log(`🎯 URL에서 분석 ID 발견: ${extractedID}`);
                            uniqueAnalysisIDs.push(extractedID);
                        }
                        
                        console.log('클릭 후 감지된 API 호출들:', apiCalls);
                        
                        // API 호출에서도 ID 패턴 찾기
                        apiCalls.forEach(call => {
                            const idMatch = call.url.match(/\/analyze\/(\d+)/);
                            if (idMatch) {
                                const apiID = idMatch[1];
                                if (!uniqueAnalysisIDs.includes(apiID)) {
                                    uniqueAnalysisIDs.push(apiID);
                                    console.log(`🎯 API 호출에서 분석 ID 발견: ${apiID}`);
                                }
                            }
                        });
                    }
                } catch (clickError) {
                    console.log('버튼 클릭 실패:', clickError.message);
                }
            }
            
            // 중복 제거
            const finalUniqueIDs = [...new Set(uniqueAnalysisIDs)];
            console.log(`\n🎯 최종 발견된 분석 ID들 (${finalUniqueIDs.length}개):`, finalUniqueIDs);
            
            return finalUniqueIDs;
            
        } catch (error) {
            console.error('DOM 분석 ID 추출 실패:', error.message);
            return [];
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const extractor = new DOMAnalysisIDExtractor();
    
    try {
        await extractor.init();
        
        const loginSuccess = await extractor.quickLogin();
        if (!loginSuccess) {
            throw new Error('로그인 실패');
        }
        
        const analysisIDs = await extractor.extractAnalysisIDs();
        
        console.log('\n=== 최종 결과 ===');
        if (analysisIDs.length > 0) {
            console.log(`✅ 총 ${analysisIDs.length}개의 분석 ID 발견:`, analysisIDs);
            
            // 각 ID로 API 테스트
            console.log('\n=== 발견된 ID들로 API 테스트 ===');
            for (const id of analysisIDs.slice(0, 2)) { // 처음 2개만 테스트
                const testUrl = `https://api.insuniverse.com/analyze/${id}/basic?page=1&ansType=ANS008&asbDiseaseCode=&searchYear=5`;
                console.log(`🔍 테스트: ${testUrl}`);
                
                const result = await extractor.page.evaluate(async (url) => {
                    try {
                        const response = await fetch(url, {
                            method: 'GET',
                            credentials: 'include'
                        });
                        
                        return {
                            success: response.ok,
                            status: response.status,
                            size: response.ok ? (await response.text()).length : 0
                        };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }, testUrl);
                
                console.log(`  결과: ${result.success ? '✅' : '❌'} ${result.status} (${result.size} bytes)`);
            }
        } else {
            console.log('❌ 분석 ID를 찾을 수 없습니다.');
        }
        
    } catch (error) {
        console.error('오류:', error);
    } finally {
        await extractor.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = DOMAnalysisIDExtractor;