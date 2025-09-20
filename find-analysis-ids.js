const puppeteer = require('puppeteer');
require('dotenv').config();

class AnalysisIDFinder {
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

    async findAnalysisListAPIs() {
        console.log('\n=== 분석 ID 목록 API 탐색 ===');
        
        // 가능한 분석 목록 API 패턴들
        const possibleListAPIs = [
            // 일반적인 패턴들
            'https://api.insuniverse.com/analyze',
            'https://api.insuniverse.com/analyze/list',
            'https://api.insuniverse.com/analysis',
            'https://api.insuniverse.com/analysis/list', 
            'https://api.insuniverse.com/customer/analysis',
            'https://api.insuniverse.com/member/analysis',
            
            // 사용자별 패턴 (memId=808 활용)
            'https://api.insuniverse.com/analyze?memId=808',
            'https://api.insuniverse.com/analyze/list?memId=808',
            'https://api.insuniverse.com/analysis?memId=808',
            'https://api.insuniverse.com/analysis/list?memId=808',
            'https://api.insuniverse.com/member/808/analysis',
            'https://api.insuniverse.com/customer/808/analysis',
            
            // 페이지네이션 포함
            'https://api.insuniverse.com/analyze?page=1&limit=10',
            'https://api.insuniverse.com/analyze/list?page=1&limit=10',
            'https://api.insuniverse.com/analysis?page=1&limit=10',
            'https://api.insuniverse.com/analysis/list?page=1&limit=10',
            
            // 날짜 기반
            'https://api.insuniverse.com/analyze?from=2024-01-01&to=2024-12-31',
            'https://api.insuniverse.com/analysis?from=2024-01-01&to=2024-12-31'
        ];

        const results = {};

        for (const apiUrl of possibleListAPIs) {
            try {
                console.log(`🔍 테스트: ${apiUrl}`);
                
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
                            const data = await response.text();
                            return {
                                success: true,
                                status: response.status,
                                data: data,
                                size: data.length
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
                    console.log(`✅ 성공: ${result.status} (${result.size} bytes)`);
                    
                    try {
                        const parsed = JSON.parse(result.data);
                        
                        // 분석 ID들을 찾아보기
                        const analysisIds = this.extractAnalysisIds(parsed);
                        
                        if (analysisIds.length > 0) {
                            console.log(`🎯 분석 ID 발견! (${analysisIds.length}개):`, analysisIds.slice(0, 5));
                            results[apiUrl] = {
                                ...result,
                                analysisIds: analysisIds,
                                parsedData: parsed
                            };
                        } else {
                            console.log(`📝 응답 구조:`, Object.keys(parsed));
                            results[apiUrl] = { ...result, parsedData: parsed };
                        }
                        
                    } catch (e) {
                        console.log(`📝 JSON 파싱 실패: ${result.data.substring(0, 100)}`);
                        results[apiUrl] = result;
                    }
                } else {
                    console.log(`❌ 실패: ${result.status} - ${result.statusText || result.error}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`API 테스트 예외: ${apiUrl} - ${error.message}`);
            }
        }

        return results;
    }

    extractAnalysisIds(data) {
        const ids = new Set();
        
        // 재귀적으로 객체를 탐색해서 분석 ID 패턴 찾기
        const findIds = (obj, path = '') => {
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    obj.forEach((item, index) => findIds(item, `${path}[${index}]`));
                } else {
                    Object.entries(obj).forEach(([key, value]) => {
                        const currentPath = path ? `${path}.${key}` : key;
                        
                        // ID를 나타내는 키들 확인
                        if (['id', 'analysisId', 'analysis_id', 'asbId', 'customerId', 'clientId'].includes(key.toLowerCase())) {
                            if (typeof value === 'string' || typeof value === 'number') {
                                const strValue = String(value);
                                // 4-6자리 숫자 패턴 (10106 같은)
                                if (/^\d{4,6}$/.test(strValue)) {
                                    ids.add(strValue);
                                    console.log(`  🔍 ID 발견: ${key} = ${strValue} (경로: ${currentPath})`);
                                }
                            }
                        }
                        
                        findIds(value, currentPath);
                    });
                }
            } else if (typeof obj === 'string') {
                // 문자열에서 ID 패턴 찾기
                const matches = obj.match(/\b\d{4,6}\b/g);
                if (matches) {
                    matches.forEach(match => {
                        if (match !== '808') { // memId 제외
                            ids.add(match);
                        }
                    });
                }
            }
        };
        
        findIds(data);
        return Array.from(ids);
    }

    async checkCurrentUserData() {
        console.log('\n=== 현재 사용자 데이터에서 분석 ID 찾기 ===');
        
        // 이미 성공한 API들에서 분석 ID 추출
        const userAPIs = [
            'https://api.insuniverse.com/subscribe/808',
            'https://api.insuniverse.com/fc/808'
        ];

        const foundIds = [];

        for (const apiUrl of userAPIs) {
            try {
                const result = await this.page.evaluate(async (url) => {
                    try {
                        const response = await fetch(url, {
                            method: 'GET',
                            credentials: 'include'
                        });
                        
                        if (response.ok) {
                            const data = await response.text();
                            return { success: true, data: data };
                        }
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                    return { success: false };
                }, apiUrl);
                
                if (result.success) {
                    const parsed = JSON.parse(result.data);
                    const ids = this.extractAnalysisIds(parsed);
                    
                    console.log(`${apiUrl}: 발견된 ID들:`, ids);
                    foundIds.push(...ids);
                    
                    // 전체 응답 구조도 출력
                    console.log(`${apiUrl} 응답 구조:`, Object.keys(parsed));
                    console.log('샘플 데이터:', JSON.stringify(parsed, null, 2).substring(0, 500));
                }
                
            } catch (error) {
                console.error(`${apiUrl} 확인 실패:`, error.message);
            }
        }

        const uniqueIds = [...new Set(foundIds)];
        console.log(`\n총 발견된 고유 분석 ID들 (${uniqueIds.length}개):`, uniqueIds);
        
        return uniqueIds;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const finder = new AnalysisIDFinder();
    
    try {
        await finder.init();
        
        const loginSuccess = await finder.quickLogin();
        if (!loginSuccess) {
            throw new Error('로그인 실패');
        }
        
        // 현재 사용자 데이터에서 분석 ID 찾기
        const userAnalysisIds = await finder.checkCurrentUserData();
        
        // 가능한 분석 목록 API들 테스트
        const listAPIResults = await finder.findAnalysisListAPIs();
        
        console.log('\n=== 최종 결과 ===');
        console.log('사용자 데이터에서 발견된 분석 ID들:', userAnalysisIds);
        
        const successfulAPIs = Object.entries(listAPIResults)
            .filter(([url, result]) => result.success && result.analysisIds?.length > 0);
            
        if (successfulAPIs.length > 0) {
            console.log('\n🎯 분석 ID 목록을 반환하는 API들:');
            successfulAPIs.forEach(([url, result]) => {
                console.log(`  ${url}: ${result.analysisIds.length}개 ID`);
                console.log(`    IDs: ${result.analysisIds.slice(0, 10).join(', ')}`);
            });
        } else {
            console.log('\n⚠️  분석 ID 목록 API를 찾지 못했습니다.');
            console.log('사용자 데이터에서 발견된 ID들을 사용하세요:', userAnalysisIds);
        }
        
    } catch (error) {
        console.error('오류:', error);
    } finally {
        await finder.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = AnalysisIDFinder;