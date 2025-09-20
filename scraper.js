const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config();

class InsuniverseScraper {
    constructor() {
        this.baseUrl = 'https://www.insuniverse.com';
        this.browser = null;
        this.page = null;
        this.authToken = null;
        this.cookies = null;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: false, // 디버깅을 위해 브라우저 표시
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // User-Agent 설정
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // 네트워크 요청 모니터링
        await this.page.setRequestInterception(true);
        this.page.on('request', (request) => {
            console.log('Request:', request.method(), request.url());
            request.continue();
        });
        
        this.page.on('response', (response) => {
            if (response.url().includes('api') || response.url().includes('auth')) {
                console.log('API Response:', response.status(), response.url());
            }
        });
    }

    async login(email, password) {
        try {
            console.log('로그인 페이지 접속 중...');
            await this.page.goto(`${this.baseUrl}/auth/login`, { waitUntil: 'networkidle2' });
            
            // React 앱이 완전히 로드될 때까지 대기
            console.log('React 앱 로딩 대기 중...');
            await this.page.waitForTimeout(5000);
            
            // 페이지의 모든 input 요소들 확인
            console.log('페이지의 폼 요소들 확인 중...');
            const allInputs = await this.page.evaluate(() => {
                const inputs = document.querySelectorAll('input');
                return Array.from(inputs).map(input => ({
                    type: input.type,
                    name: input.name,
                    id: input.id,
                    placeholder: input.placeholder,
                    className: input.className
                }));
            });
            console.log('발견된 input 요소들:', allInputs);
            
            // 모든 button 요소들도 확인
            const allButtons = await this.page.evaluate(() => {
                const buttons = document.querySelectorAll('button, input[type="submit"]');
                return Array.from(buttons).map(btn => ({
                    type: btn.type,
                    textContent: btn.textContent?.trim(),
                    className: btn.className,
                    id: btn.id
                }));
            });
            console.log('발견된 button 요소들:', allButtons);
            
            // 이메일 입력 필드 찾기 (여러 셀렉터 시도)
            let emailInput = null;
            const emailSelectors = [
                'input[type="email"]',
                'input[name="email"]',
                'input[name="userId"]',
                'input[name="username"]',
                'input[placeholder*="이메일"]',
                'input[placeholder*="아이디"]',
                'input:first-of-type'
            ];
            
            for (const selector of emailSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 2000 });
                    emailInput = selector;
                    console.log(`이메일 입력 필드 발견: ${selector}`);
                    break;
                } catch (e) {
                    console.log(`셀렉터 ${selector} 찾기 실패`);
                }
            }
            
            if (!emailInput) {
                throw new Error('이메일 입력 필드를 찾을 수 없습니다');
            }
            
            // 비밀번호 입력 필드 찾기
            let passwordInput = null;
            const passwordSelectors = [
                'input[type="password"]',
                'input[name="password"]',
                'input[placeholder*="비밀번호"]',
                'input[placeholder*="패스워드"]'
            ];
            
            for (const selector of passwordSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 2000 });
                    passwordInput = selector;
                    console.log(`비밀번호 입력 필드 발견: ${selector}`);
                    break;
                } catch (e) {
                    console.log(`셀렉터 ${selector} 찾기 실패`);
                }
            }
            
            if (!passwordInput) {
                throw new Error('비밀번호 입력 필드를 찾을 수 없습니다');
            }
            
            // 로그인 정보 입력
            console.log('로그인 정보 입력 중...');
            await this.page.click(emailInput);
            await this.page.type(emailInput, email);
            await this.page.click(passwordInput);
            await this.page.type(passwordInput, password);
            
            // 잠시 대기
            await this.page.waitForTimeout(1000);
            
            // 로그인 버튼 찾기 및 클릭
            const loginSelectors = [
                'button[type="submit"]',
                'button:contains("로그인")',
                'button:contains("Login")',
                'input[type="submit"]',
                '.login-btn',
                'button:last-of-type'
            ];
            
            let loginClicked = false;
            for (const selector of loginSelectors) {
                try {
                    const button = await this.page.$(selector);
                    if (button) {
                        console.log(`로그인 버튼 클릭: ${selector}`);
                        await button.click();
                        loginClicked = true;
                        break;
                    }
                } catch (e) {
                    console.log(`로그인 버튼 ${selector} 클릭 실패`);
                }
            }
            
            if (!loginClicked) {
                // 엔터키로 시도
                console.log('엔터키로 로그인 시도...');
                await this.page.keyboard.press('Enter');
            }
            
            // 로그인 완료 대기 (페이지 변경 또는 특정 요소 나타남)
            console.log('로그인 처리 대기 중...');
            try {
                await Promise.race([
                    this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
                    this.page.waitForSelector('[data-testid="dashboard"], .dashboard, .main-content', { timeout: 10000 })
                ]);
            } catch (e) {
                console.log('네비게이션 대기 실패, 현재 URL 확인...');
            }
            
            await this.page.waitForTimeout(3000);
            
            // 현재 URL 확인
            const currentUrl = this.page.url();
            console.log('현재 URL:', currentUrl);
            
            if (currentUrl.includes('/auth/login')) {
                console.log('아직 로그인 페이지에 있습니다. 로그인 실패 가능성.');
            }
            
            // 쿠키 및 토큰 저장
            this.cookies = await this.page.cookies();
            console.log('쿠키 개수:', this.cookies.length);
            
            // 로컬 스토리지에서 토큰 추출 시도
            const localStorage = await this.page.evaluate(() => {
                const storage = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    storage[key] = localStorage.getItem(key);
                }
                return storage;
            });
            
            console.log('LocalStorage:', localStorage);
            
            // 세션 스토리지도 확인
            const sessionStorage = await this.page.evaluate(() => {
                const storage = {};
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    storage[key] = sessionStorage.getItem(key);
                }
                return storage;
            });
            
            console.log('SessionStorage:', sessionStorage);
            
            return true;
        } catch (error) {
            console.error('로그인 실패:', error.message);
            
            // 현재 페이지 스크린샷 저장
            try {
                await this.page.screenshot({ path: './debug_screenshot.png' });
                console.log('디버그 스크린샷 저장됨: debug_screenshot.png');
            } catch (e) {
                console.log('스크린샷 저장 실패');
            }
            
            return false;
        }
    }

    async discoverAPIs() {
        console.log('API 엔드포인트 탐색 중...');
        
        // 네트워크 요청 로그 수집
        const apiRequests = [];
        
        this.page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/') || url.includes('/v1/') || url.includes('/graphql')) {
                const request = response.request();
                const headers = response.headers();
                
                try {
                    const responseData = await response.text();
                    apiRequests.push({
                        url: url,
                        method: request.method(),
                        status: response.status(),
                        headers: headers,
                        requestHeaders: request.headers(),
                        response: responseData.substring(0, 1000) // 처음 1000자만
                    });
                } catch (err) {
                    console.log('응답 데이터 읽기 실패:', url);
                }
            }
        });
        
        // 주요 페이지들 방문하여 API 호출 유도
        const pagesToVisit = [
            '/',
            '/dashboard',
            '/profile',
            '/data',
            '/reports',
            '/analytics',
            '/analysis/list'
        ];
        
        for (const path of pagesToVisit) {
            try {
                console.log(`페이지 방문: ${this.baseUrl}${path}`);
                await this.page.goto(`${this.baseUrl}${path}`, { waitUntil: 'networkidle2' });
                await this.page.waitForTimeout(3000);
                
                // analysis/list 페이지에서 특별한 처리
                if (path === '/analysis/list') {
                    await this.analyzeAnalysisListPage();
                }
            } catch (error) {
                console.log(`페이지 접근 실패: ${path}`);
            }
        }
        
        return apiRequests;
    }

    async analyzeAnalysisListPage() {
        console.log('=== 분석결과조회 페이지 상세 분석 ===');
        
        try {
            // 페이지가 완전히 로드될 때까지 추가 대기
            await this.page.waitForTimeout(5000);
            
            // 현재 URL 확인
            const currentUrl = this.page.url();
            console.log('현재 URL:', currentUrl);
            
            // 분석 리스트 아이템들을 찾아서 개별 링크 추출
            const analysisLinks = await this.page.evaluate(() => {
                const links = [];
                
                // 다양한 방법으로 분석 결과 링크 찾기
                const selectors = [
                    'a[href*="/analysis/"]',
                    '[onclick*="analysis"]',
                    '.analysis-item a',
                    '.list-item a',
                    'tr[onclick]',
                    '[data-id]'
                ];
                
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    Array.from(elements).forEach(el => {
                        let href = '';
                        let id = '';
                        
                        if (el.href && el.href.includes('/analysis/')) {
                            href = el.href;
                            id = href.split('/analysis/')[1]?.split('?')[0];
                        } else if (el.onclick) {
                            const onclickStr = el.onclick.toString();
                            const match = onclickStr.match(/analysis\/(\d+)/);
                            if (match) {
                                id = match[1];
                                href = `/analysis/${id}`;
                            }
                        } else if (el.dataset.id) {
                            id = el.dataset.id;
                            href = `/analysis/${id}`;
                        }
                        
                        if (id && href) {
                            links.push({
                                id: id,
                                href: href,
                                text: el.textContent?.trim().substring(0, 100) || '',
                                className: el.className || ''
                            });
                        }
                    });
                    
                    if (links.length > 0) break;
                }
                
                // 중복 제거
                const uniqueLinks = links.filter((link, index, arr) => 
                    arr.findIndex(l => l.id === link.id) === index
                );
                
                return uniqueLinks.slice(0, 10); // 최대 10개
            });
            
            console.log(`발견된 분석 결과 링크들 (${analysisLinks.length}개):`, JSON.stringify(analysisLinks, null, 2));
            
            // 각 분석 결과를 개별적으로 방문
            for (const link of analysisLinks.slice(0, 3)) { // 처음 3개만 테스트
                try {
                    console.log(`\n--- 분석 ID ${link.id} 방문 중 ---`);
                    await this.visitAnalysisDetail(link.id);
                } catch (error) {
                    console.error(`분석 ID ${link.id} 방문 실패:`, error.message);
                }
            }
            
            return analysisLinks;
            
        } catch (error) {
            console.error('분석결과조회 페이지 분석 실패:', error.message);
            return [];
        }
    }

    async visitAnalysisDetail(analysisId) {
        const analysisUrl = `${this.baseUrl}/analysis/${analysisId}`;
        
        try {
            console.log(`분석 상세 페이지 방문: ${analysisUrl}`);
            await this.page.goto(analysisUrl, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(3000);
            
            // 페이지 로드 확인
            const currentUrl = this.page.url();
            console.log('현재 URL:', currentUrl);
            
            // 페이지 내용 추출
            const analysisData = await this.page.evaluate(() => {
                const data = {
                    title: document.title || '',
                    headers: [],
                    content: [],
                    tables: [],
                    buttons: []
                };
                
                // 제목들 추출
                document.querySelectorAll('h1, h2, h3, h4, .title, .header').forEach(el => {
                    if (el.textContent?.trim()) {
                        data.headers.push(el.textContent.trim());
                    }
                });
                
                // 테이블 데이터 추출
                document.querySelectorAll('table').forEach((table, index) => {
                    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
                    const rows = Array.from(table.querySelectorAll('tbody tr')).map(row =>
                        Array.from(row.querySelectorAll('td')).map(td => td.textContent?.trim())
                    );
                    
                    if (headers.length > 0 || rows.length > 0) {
                        data.tables.push({
                            index: index,
                            headers: headers,
                            rows: rows.slice(0, 5) // 처음 5개 행만
                        });
                    }
                });
                
                // 버튼들 확인 (PDF 다운로드 버튼 찾기)
                document.querySelectorAll('button').forEach(btn => {
                    const text = btn.textContent?.trim();
                    if (text && (text.includes('전체출력') || text.includes('다운로드') || text.includes('PDF'))) {
                        data.buttons.push({
                            text: text,
                            className: btn.className,
                            onclick: btn.onclick?.toString() || '',
                            disabled: btn.disabled
                        });
                    }
                });
                
                return data;
            });
            
            console.log(`분석 ${analysisId} 데이터:`, JSON.stringify(analysisData, null, 2));
            
            // PDF 다운로드 버튼이 있으면 클릭 시도
            await this.tryDownloadPDF(analysisId);
            
            return analysisData;
            
        } catch (error) {
            console.error(`분석 ${analysisId} 상세 페이지 처리 실패:`, error.message);
            return null;
        }
    }

    async getAnalysisAPIs() {
        console.log('\n=== 분석 데이터 API 탐지 중 ===');
        
        try {
            // 발견된 분석 ID (10106)와 다양한 API 패턴 조합
            const analysisIds = ['10106']; // 나중에 동적으로 가져올 수 있음
            const analysisAPIs = [];
            
            for (const analysisId of analysisIds) {
                // 발견된 API 패턴들
                const apiPatterns = [
                    // aggregate APIs
                    {
                        endpoint: 'aggregate',
                        params: [
                            { ansType: 'ANS006', asbSicked: 0 },
                            { ansType: 'ANS005', asbSicked: 1 }
                        ]
                    },
                    // basic APIs  
                    {
                        endpoint: 'basic',
                        params: [
                            { ansType: 'ANS008', asbDiseaseCode: '', searchYear: 5 },
                            { ansType: 'ANS004', asbDiseaseCode: '', searchYear: 5 }
                        ]
                    },
                    // PDF 다운로드 API (파라미터 없음)
                    {
                        endpoint: 'hidden-insurance',
                        params: [{}] // 빈 파라미터
                    }
                ];
                
                for (const pattern of apiPatterns) {
                    for (const param of pattern.params) {
                        // PDF 다운로드 API는 특별 처리
                        if (pattern.endpoint === 'hidden-insurance') {
                            const apiUrl = `https://api.insuniverse.com/analyze/${analysisId}/${pattern.endpoint}`;
                            analysisAPIs.push(apiUrl);
                        } else {
                            // 파라미터를 URL 쿼리 스트링으로 변환
                            const queryString = Object.entries(param)
                                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                                .join('&');
                            
                            const apiUrl = `https://api.insuniverse.com/analyze/${analysisId}/${pattern.endpoint}?page=1&${queryString}`;
                            analysisAPIs.push(apiUrl);
                            
                            // 추가 페이지들도 미리 준비 (page=2, page=3)
                            for (let page = 2; page <= 3; page++) {
                                const pageUrl = `https://api.insuniverse.com/analyze/${analysisId}/${pattern.endpoint}?page=${page}&${queryString}`;
                                analysisAPIs.push(pageUrl);
                            }
                        }
                    }
                }
            }
            
            // subscribe API에서 실제 분석 ID 목록 가져오기 시도
            const subscribeData = await this.page.evaluate(async () => {
                try {
                    const response = await fetch('https://api.insuniverse.com/subscribe/808', {
                        method: 'GET',
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        const data = await response.text();
                        return JSON.parse(data);
                    }
                } catch (error) {
                    return null;
                }
                return null;
            });
            
            if (subscribeData) {
                console.log('Subscribe 데이터 구조:', Object.keys(subscribeData));
                
                // 분석 ID 패턴을 찾아서 API 목록에 추가
                const dataStr = JSON.stringify(subscribeData);
                const analysisIdMatches = dataStr.match(/\b\d{4,6}\b/g);
                
                if (analysisIdMatches) {
                    const uniqueIds = [...new Set(analysisIdMatches)].filter(id => id !== '808').slice(0, 3); // memId 제외, 최대 3개
                    console.log('Subscribe에서 발견된 추가 분석 ID들:', uniqueIds);
                    
                    for (const id of uniqueIds) {
                        // car-basic만 테스트로 추가
                        analysisAPIs.push(`https://api.insuniverse.com/analyze/${id}/basic?page=1&ansType=ANS008&asbDiseaseCode=&searchYear=5`);
                    }
                }
            }
            
            console.log(`생성된 분석 API 목록 (${analysisAPIs.length}개):`, analysisAPIs.slice(0, 10)); // 처음 10개만 로그
            return analysisAPIs;
            
        } catch (error) {
            console.error('분석 API 탐지 실패:', error.message);
            return [];
        }
    }

    async tryDownloadPDF(analysisId) {
        try {
            console.log(`PDF 다운로드 시도 - 분석 ID: ${analysisId}`);
            
            // 다운로드 경로 설정
            const downloadPath = './downloads';
            await this.page._client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });
            
            // PDF 다운로드 버튼 찾기 및 클릭
            const pdfButtonSelectors = [
                'button:contains("전체출력")',
                'button:contains("PDF")',
                'button:contains("다운로드")',
                '.download-btn',
                '.pdf-btn',
                '[onclick*="pdf"]',
                '[onclick*="download"]'
            ];
            
            let pdfDownloaded = false;
            for (const selector of pdfButtonSelectors) {
                try {
                    const button = await this.page.$(selector);
                    if (button) {
                        console.log(`PDF 버튼 발견: ${selector}`);
                        await button.click();
                        pdfDownloaded = true;
                        
                        // 다운로드 완료 대기
                        await this.page.waitForTimeout(3000);
                        break;
                    }
                } catch (e) {
                    // 버튼을 찾을 수 없으면 계속
                }
            }
            
            if (pdfDownloaded) {
                console.log(`PDF 다운로드 완료: 분석 ID ${analysisId}`);
            } else {
                console.log(`PDF 다운로드 버튼을 찾을 수 없음: 분석 ID ${analysisId}`);
            }
            
        } catch (error) {
            console.error(`PDF 다운로드 실패 (분석 ID: ${analysisId}):`, error.message);
        }
    }

    async extractData(apiEndpoints) {
        console.log('데이터 추출 시작...');
        const extractedData = {};
        
        // 먼저 중요한 API들을 직접 호출
        const importantAPIs = [
            'https://api.insuniverse.com/subscribe/808',
            'https://api.insuniverse.com/fc/808',
            'https://api.insuniverse.com/alarm?page=1&memId=808'
        ];
        
        // 분석 데이터 API 호출 (발견된 패턴 활용)
        const analysisAPIs = await this.getAnalysisAPIs();
        
        // 브라우저 세션 쿠키 가져오기
        const cookies = await this.page.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        
        // 세션 스토리지에서 토큰 가져오기
        const sessionData = await this.page.evaluate(() => {
            const sessionStorage = {};
            for (let i = 0; i < window.sessionStorage.length; i++) {
                const key = window.sessionStorage.key(i);
                sessionStorage[key] = window.sessionStorage.getItem(key);
            }
            return sessionStorage;
        });
        
        console.log('세션 데이터:', JSON.stringify(sessionData, null, 2));
        
        // 모든 API 목록 병합
        const allAPIs = [...importantAPIs, ...analysisAPIs];
        
        console.log('\n=== 전체 호출할 API 목록 ===');
        allAPIs.forEach((api, index) => {
            console.log(`${index + 1}. ${api}`);
        });
        
        for (const apiUrl of allAPIs) {
            try {
                console.log(`\n=== API 호출: ${apiUrl} ===`);
                
                // 브라우저에서 직접 fetch 실행 (세션 유지)
                const result = await this.page.evaluate(async (url) => {
                    try {
                        const response = await fetch(url, {
                            method: 'GET',
                            credentials: 'include',
                            headers: {
                                'Accept': 'application/json, text/plain, */*',
                                'Content-Type': 'application/json',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });
                        
                        if (response.ok) {
                            const data = await response.text();
                            return {
                                success: true,
                                status: response.status,
                                data: data,
                                headers: Object.fromEntries(response.headers.entries())
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
                    console.log(`✅ API 호출 성공: ${apiUrl}`);
                    console.log(`상태: ${result.status}`);
                    console.log(`응답 크기: ${result.data.length} bytes`);
                    
                    // JSON 파싱 시도
                    let parsedData;
                    try {
                        parsedData = JSON.parse(result.data);
                        console.log('응답 데이터 구조:', Object.keys(parsedData));
                        
                        // 분석 관련 데이터가 있는지 확인
                        if (typeof parsedData === 'object') {
                            // analyze API의 경우 더 자세한 분석
                            if (apiUrl.includes('/analyze/')) {
                                console.log('🔍 분석 데이터 상세 정보:');
                                
                                // 데이터 배열이 있는지 확인
                                if (parsedData.data && Array.isArray(parsedData.data)) {
                                    console.log(`- 데이터 항목 수: ${parsedData.data.length}`);
                                    if (parsedData.data.length > 0) {
                                        console.log(`- 첫 번째 항목 구조:`, Object.keys(parsedData.data[0]));
                                        console.log(`- 샘플 데이터:`, JSON.stringify(parsedData.data[0], null, 2).substring(0, 300));
                                    }
                                }
                                
                                // 페이지네이션 정보 확인
                                if (parsedData.pagination || parsedData.meta || parsedData.total) {
                                    console.log('- 페이지네이션 정보:', {
                                        pagination: parsedData.pagination,
                                        meta: parsedData.meta,
                                        total: parsedData.total
                                    });
                                }
                            }
                            
                            const analysisKeys = Object.keys(parsedData).filter(key => 
                                key.toLowerCase().includes('analysis') || 
                                key.toLowerCase().includes('result') ||
                                key.toLowerCase().includes('data') ||
                                key.toLowerCase().includes('list')
                            );
                            
                            if (analysisKeys.length > 0) {
                                console.log(`🔍 분석 관련 키 발견: ${analysisKeys.join(', ')}`);
                            }
                        }
                        
                    } catch (parseError) {
                        console.log('JSON 파싱 실패, 원본 데이터:', result.data.substring(0, 200));
                        parsedData = result.data;
                    }
                    
                    extractedData[apiUrl] = {
                        data: parsedData,
                        timestamp: new Date().toISOString(),
                        status: result.status,
                        headers: result.headers
                    };
                } else {
                    console.log(`❌ API 호출 실패: ${apiUrl}`);
                    console.log(`상태: ${result.status} - ${result.statusText}`);
                    if (result.error) console.log(`에러: ${result.error}`);
                }
                
                // API 호출 간 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`API 호출 예외: ${apiUrl} - ${error.message}`);
            }
        }
        
        // 발견된 다른 API들도 처리
        for (const endpoint of apiEndpoints) {
            if (!importantAPIs.includes(endpoint.url) && endpoint.url.includes('/api/')) {
                try {
                    const result = await this.page.evaluate(async (url) => {
                        try {
                            const response = await fetch(url, {
                                method: 'GET',
                                credentials: 'include'
                            });
                            
                            if (response.ok) {
                                const data = await response.text();
                                return {
                                    success: true,
                                    status: response.status,
                                    data: data
                                };
                            }
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                        return { success: false };
                    }, endpoint.url);
                    
                    if (result.success) {
                        try {
                            const parsedData = JSON.parse(result.data);
                            extractedData[endpoint.url] = {
                                data: parsedData,
                                timestamp: new Date().toISOString()
                            };
                            console.log(`추가 API 데이터 추출 성공: ${endpoint.url}`);
                        } catch (e) {
                            // JSON 파싱 실패시 원본 저장
                            extractedData[endpoint.url] = {
                                data: result.data,
                                timestamp: new Date().toISOString()
                            };
                        }
                    }
                } catch (error) {
                    console.log(`추가 API 호출 실패: ${endpoint.url}`);
                }
            }
        }
        
        console.log(`\n총 ${Object.keys(extractedData).length}개의 API에서 데이터 추출 완료`);
        return extractedData;
    }

    async saveData(data, filename) {
        const filepath = `./data/${filename}_${new Date().toISOString().split('T')[0]}.json`;
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
        console.log(`데이터 저장됨: ${filepath}`);
        return filepath;
    }

    async sendToMakeWebhook(data, webhookUrl) {
        try {
            const response = await axios.post(webhookUrl, {
                timestamp: new Date().toISOString(),
                source: 'insuniverse-scraper',
                data: data
            });
            
            console.log('Make.com 웹훅 전송 성공:', response.status);
            return true;
        } catch (error) {
            console.error('Make.com 웹훅 전송 실패:', error.message);
            return false;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// 사용 예시
async function main() {
    const scraper = new InsuniverseScraper();
    
    try {
        await scraper.init();
        
        // 환경변수에서 로그인 정보 가져오기
        const email = process.env.INSUNIVERSE_EMAIL || 'your-email@example.com';
        const password = process.env.INSUNIVERSE_PASSWORD || 'your-password';
        const webhookUrl = process.env.MAKE_WEBHOOK_URL;
        
        // 로그인
        const loginSuccess = await scraper.login(email, password);
        if (!loginSuccess) {
            throw new Error('로그인 실패');
        }
        
        // API 탐색
        const apiEndpoints = await scraper.discoverAPIs();
        console.log(`발견된 API 엔드포인트: ${apiEndpoints.length}개`);
        
        // 데이터 추출
        const extractedData = await scraper.extractData(apiEndpoints);
        
        // 데이터 저장
        await scraper.saveData(extractedData, 'insuniverse_data');
        
        // Make.com 웹훅으로 전송
        if (webhookUrl) {
            await scraper.sendToMakeWebhook(extractedData, webhookUrl);
        }
        
    } catch (error) {
        console.error('스크래핑 오류:', error);
    } finally {
        await scraper.close();
    }
}

// 모듈로 내보내기
module.exports = InsuniverseScraper;

// 직접 실행시
if (require.main === module) {
    main();
}