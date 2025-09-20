const axios = require('axios');
require('dotenv').config();

class MakeWebhookIntegration {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl || process.env.MAKE_WEBHOOK_URL;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1초
    }

    async sendData(data, metadata = {}) {
        const payload = {
            timestamp: new Date().toISOString(),
            source: 'insuniverse-automation',
            version: '1.0.0',
            metadata: {
                dataKeys: Object.keys(data),
                dataSize: JSON.stringify(data).length,
                ...metadata
            },
            data: data
        };

        return await this.sendWithRetry(payload);
    }

    async sendWithRetry(payload, attempt = 1) {
        try {
            console.log(`Make.com 웹훅 전송 시도 (${attempt}/${this.retryAttempts})`);
            
            const response = await axios.post(this.webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Insuniverse-Automation/1.0.0'
                },
                timeout: 30000 // 30초 타임아웃
            });

            console.log(`Make.com 웹훅 전송 성공: ${response.status} ${response.statusText}`);
            
            return {
                success: true,
                status: response.status,
                statusText: response.statusText,
                responseData: response.data,
                attempt: attempt
            };

        } catch (error) {
            console.error(`Make.com 웹훅 전송 실패 (시도 ${attempt}):`, error.message);
            
            if (attempt < this.retryAttempts) {
                console.log(`${this.retryDelay}ms 후 재시도...`);
                await this.delay(this.retryDelay);
                return await this.sendWithRetry(payload, attempt + 1);
            } else {
                return {
                    success: false,
                    error: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    attempts: attempt
                };
            }
        }
    }

    async testConnection() {
        const testPayload = {
            timestamp: new Date().toISOString(),
            source: 'insuniverse-automation',
            type: 'connection_test',
            message: '연결 테스트입니다.'
        };

        console.log('Make.com 웹훅 연결 테스트 중...');
        const result = await this.sendWithRetry(testPayload);
        
        if (result.success) {
            console.log('✅ Make.com 웹훅 연결 테스트 성공!');
        } else {
            console.log('❌ Make.com 웹훅 연결 테스트 실패!');
        }

        return result;
    }

    async sendBatch(dataArray, batchSize = 10) {
        console.log(`배치 전송 시작: ${dataArray.length}개 항목, 배치 크기: ${batchSize}`);
        
        const results = [];
        
        for (let i = 0; i < dataArray.length; i += batchSize) {
            const batch = dataArray.slice(i, i + batchSize);
            console.log(`배치 ${Math.floor(i / batchSize) + 1} 전송 중... (${batch.length}개 항목)`);
            
            const batchPayload = {
                timestamp: new Date().toISOString(),
                source: 'insuniverse-automation',
                type: 'batch_data',
                batch: {
                    number: Math.floor(i / batchSize) + 1,
                    size: batch.length,
                    total: dataArray.length
                },
                data: batch
            };

            const result = await this.sendWithRetry(batchPayload);
            results.push(result);

            // 배치 간 잠시 대기 (API 레이트 리밋 방지)
            if (i + batchSize < dataArray.length) {
                await this.delay(2000);
            }
        }

        const successCount = results.filter(r => r.success).length;
        console.log(`배치 전송 완료: ${successCount}/${results.length} 성공`);

        return results;
    }

    async sendHealthCheck() {
        const healthPayload = {
            timestamp: new Date().toISOString(),
            source: 'insuniverse-automation',
            type: 'health_check',
            status: 'running',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: '1.0.0'
        };

        return await this.sendWithRetry(healthPayload);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 사용 예시 및 테스트
async function testMakeIntegration() {
    const webhookUrl = process.env.MAKE_WEBHOOK_URL;
    
    if (!webhookUrl) {
        console.error('MAKE_WEBHOOK_URL이 환경변수에 설정되지 않았습니다.');
        return;
    }

    const makeIntegration = new MakeWebhookIntegration(webhookUrl);
    
    // 연결 테스트
    await makeIntegration.testConnection();
    
    // 샘플 데이터 전송
    const sampleData = {
        userCount: 150,
        policies: [
            { id: 1, name: '생명보험', amount: 1000000 },
            { id: 2, name: '건강보험', amount: 500000 }
        ],
        timestamp: new Date().toISOString()
    };
    
    const result = await makeIntegration.sendData(sampleData, { 
        source: 'test',
        category: 'sample' 
    });
    
    console.log('샘플 데이터 전송 결과:', result);
}

// 직접 실행시 테스트
if (require.main === module) {
    testMakeIntegration();
}

module.exports = MakeWebhookIntegration;