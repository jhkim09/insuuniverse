const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const InsuniverseScraper = require('./scraper');

class DataScheduler {
    constructor() {
        this.scraper = null;
        this.isRunning = false;
        this.lastRun = null;
        this.runHistory = [];
    }

    async initDirectories() {
        const dataDir = process.env.DATA_PATH || './data';
        const logsDir = './logs';
        
        try {
            await fs.mkdir(dataDir, { recursive: true });
            await fs.mkdir(logsDir, { recursive: true });
            console.log('디렉토리 초기화 완료');
        } catch (error) {
            console.error('디렉토리 생성 실패:', error);
        }
    }

    async runScraping() {
        if (this.isRunning) {
            console.log('이미 스크래핑이 실행 중입니다.');
            return;
        }

        this.isRunning = true;
        const startTime = new Date();
        
        try {
            console.log(`[${startTime.toISOString()}] 스크래핑 시작`);
            
            this.scraper = new InsuniverseScraper();
            await this.scraper.init();
            
            // 환경변수에서 로그인 정보 가져오기
            const email = process.env.INSUNIVERSE_EMAIL;
            const password = process.env.INSUNIVERSE_PASSWORD;
            const webhookUrl = process.env.MAKE_WEBHOOK_URL;
            
            if (!email || !password) {
                throw new Error('로그인 정보가 환경변수에 설정되지 않았습니다.');
            }
            
            // 로그인
            const loginSuccess = await this.scraper.login(email, password);
            if (!loginSuccess) {
                throw new Error('로그인 실패');
            }
            
            // API 탐색
            const apiEndpoints = await this.scraper.discoverAPIs();
            console.log(`발견된 API 엔드포인트: ${apiEndpoints.length}개`);
            
            // 데이터 추출
            const extractedData = await this.scraper.extractData(apiEndpoints);
            
            // 메타데이터 추가
            const dataWithMeta = {
                timestamp: startTime.toISOString(),
                apiEndpoints: apiEndpoints.map(ep => ({ url: ep.url, status: ep.status })),
                dataCount: Object.keys(extractedData).length,
                data: extractedData
            };
            
            // 데이터 저장
            const filepath = await this.scraper.saveData(dataWithMeta, 'insuniverse_scheduled');
            
            // Make.com 웹훅으로 전송
            let webhookSuccess = false;
            if (webhookUrl) {
                webhookSuccess = await this.scraper.sendToMakeWebhook(dataWithMeta, webhookUrl);
            }
            
            const endTime = new Date();
            const duration = endTime - startTime;
            
            const runResult = {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: duration,
                success: true,
                dataCount: Object.keys(extractedData).length,
                apiEndpoints: apiEndpoints.length,
                webhookSuccess: webhookSuccess,
                filepath: filepath
            };
            
            await this.logRun(runResult);
            this.runHistory.push(runResult);
            this.lastRun = runResult;
            
            console.log(`[${endTime.toISOString()}] 스크래핑 완료 - 소요시간: ${duration}ms`);
            
        } catch (error) {
            const endTime = new Date();
            const duration = endTime - startTime;
            
            const runResult = {
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration: duration,
                success: false,
                error: error.message,
                stack: error.stack
            };
            
            await this.logRun(runResult);
            this.runHistory.push(runResult);
            this.lastRun = runResult;
            
            console.error(`[${endTime.toISOString()}] 스크래핑 실패:`, error.message);
        } finally {
            if (this.scraper) {
                await this.scraper.close();
                this.scraper = null;
            }
            this.isRunning = false;
        }
    }

    async logRun(runResult) {
        const logFile = `./logs/scheduler_${new Date().toISOString().split('T')[0]}.json`;
        
        try {
            let logs = [];
            try {
                const existingLogs = await fs.readFile(logFile, 'utf8');
                logs = JSON.parse(existingLogs);
            } catch (error) {
                // 파일이 없으면 새로 생성
            }
            
            logs.push(runResult);
            await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
            
        } catch (error) {
            console.error('로그 저장 실패:', error);
        }
    }

    startSchedule(cronExpression = null) {
        const schedule = cronExpression || process.env.SCHEDULE_CRON || '0 9 * * *'; // 기본값: 매일 오전 9시
        
        console.log(`스케줄 시작: ${schedule}`);
        
        cron.schedule(schedule, async () => {
            await this.runScraping();
        });
        
        // 즉시 한 번 실행 (테스트용)
        if (process.env.RUN_IMMEDIATELY === 'true') {
            setTimeout(() => {
                this.runScraping();
            }, 5000);
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            totalRuns: this.runHistory.length,
            successRate: this.runHistory.length > 0 ? 
                (this.runHistory.filter(r => r.success).length / this.runHistory.length * 100).toFixed(2) + '%' : 'N/A'
        };
    }
}

// Express 서버를 통한 상태 모니터링
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

const scheduler = new DataScheduler();

app.get('/status', (req, res) => {
    res.json(scheduler.getStatus());
});

app.get('/run', async (req, res) => {
    if (scheduler.isRunning) {
        res.json({ message: '이미 실행 중입니다.' });
    } else {
        scheduler.runScraping();
        res.json({ message: '스크래핑이 시작되었습니다.' });
    }
});

app.get('/history', (req, res) => {
    res.json(scheduler.runHistory);
});

// 서버 시작
async function startServer() {
    await scheduler.initDirectories();
    
    app.listen(PORT, () => {
        console.log(`모니터링 서버가 포트 ${PORT}에서 실행 중입니다.`);
        console.log(`상태 확인: http://localhost:${PORT}/status`);
        console.log(`수동 실행: http://localhost:${PORT}/run`);
        console.log(`실행 기록: http://localhost:${PORT}/history`);
    });
    
    scheduler.startSchedule();
}

// 직접 실행시
if (require.main === module) {
    startServer();
}

module.exports = DataScheduler;