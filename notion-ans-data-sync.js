require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

class ANSDataProcessor {
    constructor() {
        this.masterDbId = process.env.NOTION_ANS_MASTER_DB;
        this.detailDbs = {
            'ANS002': process.env.NOTION_ANS_ANS002_DB,
            'ANS003': process.env.NOTION_ANS_ANS003_DB,
            'ANS004': process.env.NOTION_ANS_ANS004_DB,
            'ANS007': process.env.NOTION_ANS_ANS007_DB
        };
    }

    async processAPIData(apiData) {
        try {
            const data = apiData[0].data;
            const customerInfo = data.customerInfo;
            const analysisDetail = data.analysisDetail;

            console.log(`\n🔄 ${customerInfo.name}님 데이터 처리 시작...`);

            const masterPageId = await this.createMasterRecord(data);

            if (analysisDetail.basic) {
                await this.processBasicANS(analysisDetail.basic, masterPageId, customerInfo);
            }

            if (analysisDetail.aggregate) {
                await this.processAggregateANS(analysisDetail.aggregate, masterPageId, customerInfo);
            }

            console.log('✅ 데이터 처리 완료!\n');
            return masterPageId;

        } catch (error) {
            console.error('❌ 데이터 처리 실패:', error);
            throw error;
        }
    }

    async createMasterRecord(data) {
        try {
            const customerInfo = data.customerInfo;
            const analysisDetail = data.analysisDetail;
            const latestOrder = data.latestOrder;

            const ansCountMap = {};

            if (analysisDetail.basic) {
                for (const [ansKey, ansData] of Object.entries(analysisDetail.basic)) {
                    ansCountMap[ansKey] = ansData.count || 0;
                }
            }

            const properties = {
                "고객명": {
                    title: [{
                        text: { content: customerInfo.name || '' }
                    }]
                },
                "전화번호": {
                    phone_number: customerInfo.phone || null
                },
                "생년월일": {
                    rich_text: [{
                        text: { content: latestOrder?.user?.usrBirth || '' }
                    }]
                },
                "분석일시": {
                    date: {
                        start: latestOrder?.orderDetail?.oddCompletedAt ?
                            new Date(latestOrder.orderDetail.oddCompletedAt).toISOString() : null
                    }
                },
                "분석상태": {
                    select: { name: latestOrder?.orderDetail?.oddState || '분석중' }
                },
                "구독상품": {
                    rich_text: [{
                        text: { content: data.subscription?.product?.prdName || '' }
                    }]
                },
                "소속": {
                    rich_text: [{
                        text: { content: latestOrder?.member?.memAgency || '' }
                    }]
                }
            };

            for (const [ansKey, count] of Object.entries(ansCountMap)) {
                const propName = `${ansKey}_${this.getANSTypeName(ansKey)}`;
                if (propName.includes('기타') || propName.includes('기본')) {
                    properties[propName] = { checkbox: count > 0 };
                } else {
                    properties[propName] = { number: count };
                }
            }

            const response = await notion.pages.create({
                parent: { database_id: this.masterDbId },
                properties: properties
            });

            console.log(`✅ 마스터 레코드 생성: ${customerInfo.name}`);
            return response.id;

        } catch (error) {
            console.error('마스터 레코드 생성 실패:', error);
            throw error;
        }
    }

    async processBasicANS(basicData, masterPageId, customerInfo) {
        for (const [ansKey, ansData] of Object.entries(basicData)) {
            if (ansData.count === 0 || !ansData.list) continue;

            console.log(`  📝 ${ansKey} 처리 중 (${ansData.count}건)...`);

            for (const record of ansData.list) {
                await this.createDetailRecord(ansKey, record, masterPageId, customerInfo);
            }
        }
    }

    async processAggregateANS(aggregateData, masterPageId, customerInfo) {
        for (const [ansKey, sickedData] of Object.entries(aggregateData)) {
            for (const [sickedType, data] of Object.entries(sickedData)) {
                if (data.count === 0 || !data.list) continue;

                console.log(`  📝 ${ansKey} ${sickedType} 처리 중 (${data.count}건)...`);

                for (const record of data.list) {
                    await this.createAggregateRecord(ansKey, record, masterPageId, customerInfo, sickedType);
                }
            }
        }
    }

    async createDetailRecord(ansKey, record, masterPageId, customerInfo) {
        const dbId = this.detailDbs[ansKey];
        if (!dbId) return;

        try {
            const properties = this.buildDetailProperties(ansKey, record, masterPageId, customerInfo);

            await notion.pages.create({
                parent: { database_id: dbId },
                properties: properties
            });

        } catch (error) {
            console.error(`${ansKey} 상세 레코드 생성 실패:`, error);
        }
    }

    async createAggregateRecord(ansKey, record, masterPageId, customerInfo, sickedType) {
        const dbId = this.detailDbs['ANS003'];
        if (!dbId) return;

        try {
            const properties = {
                "환자명": {
                    title: [{
                        text: { content: `${customerInfo.name} - ${ansKey}` }
                    }]
                },
                "질병분류": {
                    select: { name: sickedType }
                },
                "진료시작일": {
                    date: record.basic?.asbTreatStartDate ?
                        { start: record.basic.asbTreatStartDate } : null
                },
                "진료종료일": {
                    date: record.basic?.asbTreatEndDate ?
                        { start: record.basic.asbTreatEndDate } : null
                },
                "질병코드": {
                    rich_text: [{
                        text: { content: record.basic?.asbDiseaseCode || '' }
                    }]
                },
                "질병명": {
                    rich_text: [{
                        text: { content: record.basic?.asbDiseaseName || '' }
                    }]
                },
                "방문일수": {
                    number: record.basic?.asbVisitDays || 0
                },
                "투약일수": {
                    number: record.basic?.asbDosingDays || 0
                },
                "보험급여정보": {
                    rich_text: [{
                        text: { content: record.basic?.asbInDisease || '' }
                    }]
                },
                "수술정보": {
                    rich_text: [{
                        text: { content: record.detail?.asdOperation || '' }
                    }]
                },
                "마스터연결": {
                    relation: [{ id: masterPageId }]
                }
            };

            await notion.pages.create({
                parent: { database_id: dbId },
                properties: properties
            });

        } catch (error) {
            console.error(`${ansKey} aggregate 레코드 생성 실패:`, error);
        }
    }

    buildDetailProperties(ansKey, record, masterPageId, customerInfo) {
        const baseProperties = {
            "환자명": {
                title: [{
                    text: { content: customerInfo.name || '' }
                }]
            },
            "마스터연결": {
                relation: [{ id: masterPageId }]
            }
        };

        switch (ansKey) {
            case 'ANS002':
                return {
                    ...baseProperties,
                    "진료시작일": {
                        date: record.basic?.asbTreatStartDate ?
                            { start: record.basic.asbTreatStartDate } : null
                    },
                    "병원명": {
                        rich_text: [{
                            text: { content: record.basic?.asbHospitalName || '' }
                        }]
                    },
                    "진료과": {
                        select: { name: record.basic?.asbDepartment || '기타' }
                    },
                    "진료유형": {
                        select: { name: record.basic?.asbTreatType || '외래' }
                    },
                    "질병코드": {
                        rich_text: [{
                            text: { content: record.basic?.asbDiseaseCode || '' }
                        }]
                    },
                    "질병명": {
                        rich_text: [{
                            text: { content: record.basic?.asbDiseaseName || '' }
                        }]
                    },
                    "방문일수": {
                        number: record.basic?.asbVisitDays || 0
                    },
                    "수술명": {
                        rich_text: [{
                            text: { content: record.detail?.asdOperation || '' }
                        }]
                    },
                    "투약일수": {
                        number: record.basic?.asbDosingDays || 0
                    }
                };

            case 'ANS004':
                return {
                    ...baseProperties,
                    "입원일": {
                        date: record.basic?.asbTreatStartDate ?
                            { start: record.basic.asbTreatStartDate } : null
                    },
                    "병원명": {
                        rich_text: [{
                            text: { content: record.basic?.asbHospitalName || '' }
                        }]
                    },
                    "진료과": {
                        rich_text: [{
                            text: { content: record.basic?.asbDepartment || '' }
                        }]
                    },
                    "질병코드": {
                        rich_text: [{
                            text: { content: record.basic?.asbDiseaseCode || '' }
                        }]
                    },
                    "질병명": {
                        rich_text: [{
                            text: { content: record.basic?.asbDiseaseName || '' }
                        }]
                    },
                    "입원일수": {
                        number: record.basic?.asbVisitDays || 0
                    },
                    "수술명": {
                        rich_text: [{
                            text: { content: record.detail?.asdOperation || '' }
                        }]
                    },
                    "보험급여정보": {
                        rich_text: [{
                            text: { content: record.basic?.asbInDisease || '' }
                        }]
                    }
                };

            case 'ANS007':
                return {
                    ...baseProperties,
                    "진료일": {
                        date: record.basic?.asbTreatStartDate ?
                            { start: record.basic.asbTreatStartDate } : null
                    },
                    "치과병원명": {
                        rich_text: [{
                            text: { content: record.basic?.asbHospitalName || '' }
                        }]
                    },
                    "질병명": {
                        rich_text: [{
                            text: { content: record.basic?.asbDiseaseName || '' }
                        }]
                    },
                    "치료내용": {
                        rich_text: [{
                            text: { content: record.basic?.asbToothFive || '' }
                        }]
                    }
                };

            default:
                return baseProperties;
        }
    }

    getANSTypeName(ansKey) {
        const typeMap = {
            'ANS001': '기본',
            'ANS002': '의료이용',
            'ANS003': '질병',
            'ANS004': '수술입원',
            'ANS005': '질병',
            'ANS006': '질병',
            'ANS007': '치과',
            'ANS008': '수술',
            'ANS009': '기타',
            'ANS010': '기타',
            'ANS011': '기타',
            'ANS012': '치과상세',
            'ANS013': '질병'
        };
        return typeMap[ansKey] || '기타';
    }
}

async function testWithSampleData() {
    const processor = new ANSDataProcessor();

    const fs = require('fs');
    const sampleDataPath = './sample-ans-data.json';

    if (fs.existsSync(sampleDataPath)) {
        const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
        await processor.processAPIData(sampleData);
    } else {
        console.log('⚠️  sample-ans-data.json 파일을 만들어 테스트 데이터를 넣어주세요.');
    }
}

module.exports = ANSDataProcessor;

if (require.main === module) {
    console.log('📊 ANS 데이터 처리 시스템 시작...\n');
    testWithSampleData();
}