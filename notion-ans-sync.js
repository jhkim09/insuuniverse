require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

class ANSDataSync {
    constructor() {
        this.ansDatabase = process.env.NOTION_ANS_DATABASE_ID;
        this.customerDatabase = process.env.NOTION_DATABASE_ID;
    }

    async createOrUpdateANS(ansData) {
        try {
            const existingANS = await this.findANSByNumber(ansData.ansNumber);

            if (existingANS) {
                return await this.updateANS(existingANS.id, ansData);
            } else {
                return await this.createANS(ansData);
            }
        } catch (error) {
            console.error('ANS 생성/업데이트 실패:', error);
            throw error;
        }
    }

    async findANSByNumber(ansNumber) {
        try {
            const response = await notion.databases.query({
                database_id: this.ansDatabase,
                filter: {
                    property: "ANS 번호",
                    title: {
                        equals: ansNumber
                    }
                }
            });

            return response.results.length > 0 ? response.results[0] : null;
        } catch (error) {
            console.error('ANS 검색 실패:', error);
            return null;
        }
    }

    async createANS(ansData) {
        try {
            const properties = this.buildANSProperties(ansData);

            const response = await notion.pages.create({
                parent: { database_id: this.ansDatabase },
                properties: properties
            });

            console.log(`✅ ANS ${ansData.ansNumber} 생성 완료`);
            return response;
        } catch (error) {
            console.error('ANS 생성 실패:', error);
            throw error;
        }
    }

    async updateANS(pageId, ansData) {
        try {
            const properties = this.buildANSProperties(ansData);

            const response = await notion.pages.update({
                page_id: pageId,
                properties: properties
            });

            console.log(`✅ ANS ${ansData.ansNumber} 업데이트 완료`);
            return response;
        } catch (error) {
            console.error('ANS 업데이트 실패:', error);
            throw error;
        }
    }

    buildANSProperties(ansData) {
        const properties = {
            "ANS 번호": {
                title: [{
                    text: { content: ansData.ansNumber || '' }
                }]
            }
        };

        if (ansData.contractName) {
            properties["계약명"] = {
                rich_text: [{
                    text: { content: ansData.contractName }
                }]
            };
        }

        if (ansData.insurer) {
            properties["보험사"] = {
                select: { name: ansData.insurer }
            };
        }

        if (ansData.productType) {
            properties["상품유형"] = {
                select: { name: ansData.productType }
            };
        }

        if (ansData.monthlyPremium) {
            properties["월보험료"] = {
                number: parseInt(ansData.monthlyPremium)
            };
        }

        if (ansData.startDate) {
            properties["보장시작일"] = {
                date: { start: ansData.startDate }
            };
        }

        if (ansData.endDate) {
            properties["보장종료일"] = {
                date: { start: ansData.endDate }
            };
        }

        if (ansData.coverage) {
            properties["주요보장내용"] = {
                rich_text: [{
                    text: { content: ansData.coverage }
                }]
            };
        }

        if (ansData.specialTerms) {
            properties["특약사항"] = {
                rich_text: [{
                    text: { content: ansData.specialTerms }
                }]
            };
        }

        if (ansData.status) {
            properties["상태"] = {
                select: { name: ansData.status }
            };
        }

        if (ansData.customerIds && ansData.customerIds.length > 0) {
            properties["연결된 고객"] = {
                relation: ansData.customerIds.map(id => ({ id }))
            };
        }

        return properties;
    }

    async linkANSToCustomer(ansPageId, customerPageId) {
        try {
            await notion.pages.update({
                page_id: ansPageId,
                properties: {
                    "연결된 고객": {
                        relation: [{ id: customerPageId }]
                    }
                }
            });

            console.log(`✅ ANS와 고객 연결 완료`);
        } catch (error) {
            console.error('ANS-고객 연결 실패:', error);
            throw error;
        }
    }

    async getCustomerANSList(customerPageId) {
        try {
            const response = await notion.databases.query({
                database_id: this.ansDatabase,
                filter: {
                    property: "연결된 고객",
                    relation: {
                        contains: customerPageId
                    }
                }
            });

            return response.results;
        } catch (error) {
            console.error('고객 ANS 목록 조회 실패:', error);
            return [];
        }
    }

    parseANSFromText(text) {
        const ansPattern = /ANS\d{8}/g;
        const matches = text.match(ansPattern);

        if (!matches) return [];

        const insurerMap = {
            '삼성': '삼성생명',
            '한화': '한화생명',
            '교보': '교보생명',
            '신한': '신한생명',
            'DB': 'DB손해보험',
            '현대': '현대해상',
            'KB': 'KB손해보험',
            '삼성화재': '삼성화재',
            '메트': '메트라이프'
        };

        const productTypeMap = {
            '종신': '종신보험',
            '정기': '정기보험',
            '암': '암보험',
            '실손': '실손보험',
            '연금': '연금보험',
            '저축': '저축보험',
            '어린이': '어린이보험',
            '운전자': '운전자보험'
        };

        return matches.map(ansNumber => {
            let insurer = null;
            let productType = null;

            for (const [key, value] of Object.entries(insurerMap)) {
                if (text.includes(key)) {
                    insurer = value;
                    break;
                }
            }

            for (const [key, value] of Object.entries(productTypeMap)) {
                if (text.includes(key)) {
                    productType = value;
                    break;
                }
            }

            const premiumMatch = text.match(/(\d{1,3}(,\d{3})*|\d+)원/);
            const monthlyPremium = premiumMatch ?
                premiumMatch[1].replace(/,/g, '') : null;

            return {
                ansNumber,
                insurer,
                productType,
                monthlyPremium,
                status: '유지'
            };
        });
    }

    async syncFromCustomerData(customerPageId, customerData) {
        try {
            const ansDataList = this.parseANSFromText(
                JSON.stringify(customerData)
            );

            for (const ansData of ansDataList) {
                const ansPage = await this.createOrUpdateANS(ansData);

                if (ansPage && customerPageId) {
                    await this.linkANSToCustomer(ansPage.id, customerPageId);
                }
            }

            console.log(`✅ 고객 데이터에서 ${ansDataList.length}개 ANS 동기화 완료`);
        } catch (error) {
            console.error('고객 데이터 동기화 실패:', error);
        }
    }
}

async function testANSSync() {
    const sync = new ANSDataSync();

    const testData = {
        ansNumber: 'ANS12345678',
        contractName: '무배당 삼성생명 종신보험',
        insurer: '삼성생명',
        productType: '종신보험',
        monthlyPremium: '250000',
        startDate: '2024-01-01',
        endDate: '2099-12-31',
        coverage: '사망보험금 1억원, 암진단금 3천만원',
        specialTerms: '3대질병 특약',
        status: '유지'
    };

    const result = await sync.createOrUpdateANS(testData);
    console.log('테스트 결과:', result ? '성공' : '실패');
}

module.exports = ANSDataSync;

if (require.main === module) {
    testANSSync();
}