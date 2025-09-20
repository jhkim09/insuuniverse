const axios = require('axios');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
require('dotenv').config();

class SimpleInsuniverseScraper {
    constructor() {
        this.baseUrl = 'https://www.insuniverse.com';
        this.browser = null;
        this.page = null;
    }

    async init(headless = true) {
        this.browser = await puppeteer.launch({ 
            headless: headless ? "new" : false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    }

    async login(email, password) {
        try {
            console.log('로그인 중...');
            await this.page.goto(`${this.baseUrl}/auth/login`, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(3000);
            
            // 간단한 직접 입력 (셀렉터 탐지 없이)
            await this.page.type('input[name="id"]', email);
            await this.page.type('input[name="pw"]', password);
            await this.page.click('button[type="submit"]');
            
            await this.page.waitForTimeout(5000);
            
            const currentUrl = this.page.url();
            if (currentUrl.includes('/main')) {
                console.log('✅ 로그인 성공');
                return true;
            } else {
                console.log('❌ 로그인 실패 - URL:', currentUrl);
                return false;
            }
            
        } catch (error) {
            console.error('로그인 실패:', error.message);
            return false;
        }
    }

    async searchCustomer(customerName, customerPhone) {
        try {
            console.log(`고객 검색: ${customerName} (${customerPhone})`);
            
            // 하이픈 제거한 전화번호로 검색
            const cleanPhone = customerPhone.replace(/-/g, '');
            
            const searchResult = await this.page.evaluate(async (phone) => {
                try {
                    const searchUrl = `https://api.insuniverse.com/order-detail?memId=808&page=1&searchKey=usrPhone&searchText=${phone}`;
                    
                    const response = await fetch(searchUrl, {
                        method: 'GET',
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });
                    
                    if (response.ok) {
                        const data = await response.text();
                        return { success: true, data: JSON.parse(data) };
                    } else {
                        return { success: false, status: response.status };
                    }
                } catch (error) {
                    return { success: false, error: error.message };
                }
            }, cleanPhone);
            
            if (searchResult.success && searchResult.data.list?.length > 0) {
                const customer = searchResult.data.list[0];
                const analysisId = customer.orderDetail?.oddId;
                
                console.log(`✅ 고객 발견: ${customer.user?.usrName} (분석 ID: ${analysisId})`);
                
                return {
                    analysisId: analysisId,
                    customerInfo: {
                        name: customer.user?.usrName,
                        phone: customer.user?.usrPhone,
                        birth: customer.user?.usrBirth,
                        state: customer.orderDetail?.oddState,
                        completedAt: customer.orderDetail?.oddCompletedAt
                    },
                    rawData: customer
                };
            } else {
                console.log('❌ 고객을 찾을 수 없습니다');
                return null;
            }
            
        } catch (error) {
            console.error('고객 검색 실패:', error.message);
            return null;
        }
    }

    async collectAllAnalysisData(analysisId) {
        console.log(`\n=== 분석 ID ${analysisId} 데이터 수집 ===`);
        
        // 수집할 모든 API 패턴
        const apiPatterns = [
            {
                name: '집계_질병미보유자',
                url: `https://api.insuniverse.com/analyze/${analysisId}/aggregate?page=1&ansType=ANS006&asbSicked=0`,
                description: '질병을 보유하지 않은 사람들의 집계 데이터'
            },
            {
                name: '집계_질병보유자', 
                url: `https://api.insuniverse.com/analyze/${analysisId}/aggregate?page=1&ansType=ANS005&asbSicked=1`,
                description: '질병을 보유한 사람들의 집계 데이터'
            },
            {
                name: '기본분석_건강보험',
                url: `https://api.insuniverse.com/analyze/${analysisId}/basic?page=1&ansType=ANS008&asbDiseaseCode=&searchYear=5`,
                description: '건강보험 기본 분석 데이터 (5년)'
            },
            {
                name: '기본분석_일반',
                url: `https://api.insuniverse.com/analyze/${analysisId}/basic?page=1&ansType=ANS004&asbDiseaseCode=&searchYear=5`,
                description: '일반 기본 분석 데이터 (5년)'
            },
            {
                name: 'PDF보고서',
                url: `https://api.insuniverse.com/analyze/${analysisId}/hidden-insurance`,
                description: 'PDF 형태의 숨겨진 보험 보고서'
            }
        ];
        
        // PDF 다운로드를 위해 다운로드 폴더 설정
        await this.setupPDFDownload();
        
        const collectedData = {
            metadata: {
                analysisId: analysisId,
                collectionTimestamp: new Date().toISOString(),
                totalAPIs: apiPatterns.length
            },
            apis: {}
        };
        
        for (const pattern of apiPatterns) {
            try {
                console.log(`📊 수집 중: ${pattern.name}`);
                
                const result = await this.page.evaluate(async (url) => {
                    try {
                        const response = await fetch(url, {
                            method: 'GET',
                            credentials: 'include',
                            headers: { 'Accept': 'application/json' }
                        });
                        
                        if (response.ok) {
                            const data = await response.text();
                            const contentType = response.headers.get('content-type');
                            
                            return {
                                success: true,
                                status: response.status,
                                contentType: contentType,
                                data: data,
                                size: data.length
                            };
                        } else {
                            return {
                                success: false,
                                status: response.status
                            };
                        }
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                }, pattern.url);
                
                if (result.success) {
                    let processedData;
                    
                    try {
                        // JSON 파싱 시도
                        processedData = JSON.parse(result.data);
                        
                        // 데이터 요약 생성
                        const summary = this.generateDataSummary(processedData);
                        
                        collectedData.apis[pattern.name] = {
                            description: pattern.description,
                            url: pattern.url,
                            status: result.status,
                            contentType: result.contentType,
                            timestamp: new Date().toISOString(),
                            summary: summary,
                            data: processedData
                        };
                        
                        console.log(`  ✅ 성공: ${summary.type} (${summary.itemCount}개 항목, ${result.size} bytes)`);
                        
                    } catch (parseError) {
                        // JSON이 아닌 경우 (PDF 등)
                        collectedData.apis[pattern.name] = {
                            description: pattern.description,
                            url: pattern.url,
                            status: result.status,
                            contentType: result.contentType,
                            timestamp: new Date().toISOString(),
                            summary: { type: 'binary', size: result.size },
                            data: result.data.substring(0, 100) + '...' // 처음 100자만
                        };
                        
                        console.log(`  ✅ 성공: 바이너리 데이터 (${result.size} bytes)`);
                    }
                } else {
                    console.log(`  ❌ 실패: ${result.status} - ${result.error}`);
                    
                    collectedData.apis[pattern.name] = {
                        description: pattern.description,
                        url: pattern.url,
                        error: result.error,
                        status: result.status,
                        timestamp: new Date().toISOString()
                    };
                }
                
                // API 호출 간 딜레이
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`${pattern.name} 수집 실패:`, error.message);
            }
        }
        
        // PDF 다운로드 시도
        const customerName = collectedData.customer?.name || 'unknown';
        const pdfInfo = await this.downloadPDFReport(analysisId, customerName);
        
        if (pdfInfo) {
            collectedData.pdfReport = pdfInfo;
            console.log(`📄 PDF 다운로드 성공: ${pdfInfo.filename} (${pdfInfo.size} bytes)`);
        }
        
        // 수집 결과 요약
        const successCount = Object.values(collectedData.apis).filter(api => api.data).length;
        collectedData.metadata.successCount = successCount;
        collectedData.metadata.failureCount = apiPatterns.length - successCount;
        collectedData.metadata.pdfDownloaded = !!pdfInfo;
        
        console.log(`\n📋 수집 완료: ${successCount}/${apiPatterns.length} API 성공`);
        if (pdfInfo) {
            console.log(`📄 PDF: ${pdfInfo.filename} (${(pdfInfo.size / 1024).toFixed(1)}KB)`);
        }
        
        return collectedData;
    }

    generateDataSummary(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', itemCount: 0 };
        }
        
        const summary = {
            type: 'object',
            keys: Object.keys(data),
            itemCount: 0
        };
        
        // 배열 데이터 확인
        if (data.data && Array.isArray(data.data)) {
            summary.type = 'array_data';
            summary.itemCount = data.data.length;
            summary.sampleFields = data.data.length > 0 ? Object.keys(data.data[0]) : [];
        } else if (data.list && Array.isArray(data.list)) {
            summary.type = 'array_list';
            summary.itemCount = data.list.length;
            summary.sampleFields = data.list.length > 0 ? Object.keys(data.list[0]) : [];
        } else if (Array.isArray(data)) {
            summary.type = 'array';
            summary.itemCount = data.length;
            summary.sampleFields = data.length > 0 ? Object.keys(data[0]) : [];
        }
        
        // 페이지네이션 정보
        if (data.pagination) {
            summary.pagination = data.pagination;
        }
        
        // 총계 정보
        if (data.total || data.count) {
            summary.total = data.total || data.count;
        }
        
        return summary;
    }

    async setupPDFDownload() {
        try {
            // 다운로드 폴더 생성
            await fs.mkdir('./downloads', { recursive: true });
            
            // PDF 다운로드 설정 (Puppeteer 최신 버전용)
            const client = await this.page.target().createCDPSession();
            const downloadPath = process.cwd().replace(/\\/g, '/') + '/downloads';
            await client.send('Page.setDownloadBehavior', {
                behavior: 'allow',
                downloadPath: downloadPath
            });
            
            console.log(`다운로드 경로 설정: ${downloadPath}`);
            
            console.log('PDF 다운로드 설정 완료');
        } catch (error) {
            console.error('PDF 다운로드 설정 실패:', error.message);
            // 설정 실패해도 계속 진행
        }
    }

    async downloadPDFReport(analysisId, customerName) {
        try {
            console.log(`📄 PDF 보고서 다운로드 시도: ${analysisId}`);
            
            // 분석 페이지로 이동
            await this.page.goto(`${this.baseUrl}/analysis/${analysisId}`, { waitUntil: 'networkidle2' });
            await this.page.waitForTimeout(3000);
            
            // 전체출력 버튼 찾기
            const pdfButtons = [
                'button:has-text("전체출력")',
                'button:has-text("PDF")',
                'button:has-text("다운로드")',
                '.pdf-download',
                '.download-btn'
            ];
            
            let downloadStarted = false;
            
            for (const selector of pdfButtons) {
                try {
                    // 버튼이 존재하는지 확인
                    const button = await this.page.$(selector.replace(':has-text', ':contains'));
                    if (button) {
                        console.log(`PDF 다운로드 버튼 발견: ${selector}`);
                        
                        // 다운로드 시작
                        await button.click();
                        downloadStarted = true;
                        
                        // 다운로드 완료 대기
                        await this.page.waitForTimeout(5000);
                        break;
                    }
                } catch (e) {
                    // 버튼을 찾을 수 없으면 계속
                }
            }
            
            if (!downloadStarted) {
                console.log('PDF 다운로드 버튼을 찾을 수 없습니다');
                return null;
            }
            
            // 다운로드 완료까지 좀 더 대기
            await this.page.waitForTimeout(2000);
            
            // 다운로드된 파일 확인 (여러 위치에서)
            const downloadPaths = [
                './downloads',
                '/c/Users/newsh/Downloads',
                process.cwd() + '/downloads'
            ];
            
            let foundPdf = null;
            
            for (const downloadPath of downloadPaths) {
                try {
                    const files = await fs.readdir(downloadPath);
                    console.log(`${downloadPath}에서 파일 확인:`, files.filter(f => f.endsWith('.pdf')));
                    
                    // 고객명이 포함된 PDF 파일 찾기
                    const pdfFiles = files.filter(file => 
                        file.endsWith('.pdf') && 
                        (file.includes(customerName) || file.includes('숨은보험') || file.includes(analysisId))
                    );
                    
                    if (pdfFiles.length > 0) {
                        const pdfFile = pdfFiles[0];
                        const pdfPath = `${downloadPath}/${pdfFile}`;
                        const targetPath = `./downloads/${pdfFile}`;
                        
                        // 프로젝트 downloads 폴더로 복사
                        if (downloadPath !== './downloads') {
                            await fs.copyFile(pdfPath, targetPath);
                            console.log(`PDF 파일 복사: ${pdfPath} → ${targetPath}`);
                        }
                        
                        const stats = await fs.stat(targetPath);
                        
                        foundPdf = {
                            filename: pdfFile,
                            path: targetPath,
                            size: stats.size,
                            downloadedAt: new Date().toISOString()
                        };
                        
                        console.log(`✅ PDF 다운로드 완료: ${pdfFile} (${(stats.size / 1024).toFixed(1)}KB)`);
                        break;
                    }
                } catch (e) {
                    // 폴더가 없으면 넘어감
                }
            }
            
            if (foundPdf) {
                return foundPdf;
            }
            
            console.log('다운로드된 PDF 파일을 찾을 수 없습니다');
            return null;
            
        } catch (error) {
            console.error('PDF 다운로드 실패:', error.message);
            return null;
        }
    }

    async saveCollectedData(collectedData, filename) {
        const filepath = `./data/${filename}_${new Date().toISOString().split('T')[0]}.json`;
        
        try {
            await fs.mkdir('./data', { recursive: true });
            await fs.writeFile(filepath, JSON.stringify(collectedData, null, 2));
            console.log(`💾 데이터 저장됨: ${filepath}`);
            return filepath;
        } catch (error) {
            console.error('데이터 저장 실패:', error.message);
            return null;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// 간단한 테스트 실행
async function testSimpleScraper() {
    const scraper = new SimpleInsuniverseScraper();
    
    try {
        // 헤드리스 모드로 실행 (브라우저 창 숨김)
        await scraper.init(true);
        
        // 로그인
        const loginSuccess = await scraper.login(
            process.env.INSUNIVERSE_EMAIL, 
            process.env.INSUNIVERSE_PASSWORD
        );
        
        if (!loginSuccess) {
            throw new Error('로그인 실패');
        }
        
        // 고객 검색
        const customerResult = await scraper.searchCustomer('김지훈', '010-2022-1053');
        
        if (!customerResult) {
            throw new Error('고객 검색 실패');
        }
        
        console.log('\n고객 정보:', customerResult.customerInfo);
        
        // 분석 데이터 수집
        const collectedData = await scraper.collectAllAnalysisData(customerResult.analysisId);
        
        // 고객 정보를 최종 데이터에 포함
        collectedData.customer = customerResult.customerInfo;
        
        // 데이터 저장
        const filename = `analysis_${customerResult.customerInfo.name}_${customerResult.analysisId}`;
        await scraper.saveCollectedData(collectedData, filename);
        
        // 수집된 데이터 구조 출력
        console.log('\n=== 수집된 데이터 구조 ===');
        console.log('고객 정보:', collectedData.customer);
        console.log('메타데이터:', collectedData.metadata);
        
        Object.entries(collectedData.apis).forEach(([name, api]) => {
            if (api.summary) {
                console.log(`${name}: ${api.summary.type} (${api.summary.itemCount}개 항목)`);
                if (api.summary.sampleFields) {
                    console.log(`  필드: ${api.summary.sampleFields.slice(0, 5).join(', ')}`);
                }
            }
        });
        
        return collectedData;
        
    } catch (error) {
        console.error('스크래핑 오류:', error.message);
        return null;
    } finally {
        await scraper.close();
    }
}

if (require.main === module) {
    testSimpleScraper();
}

module.exports = SimpleInsuniverseScraper;