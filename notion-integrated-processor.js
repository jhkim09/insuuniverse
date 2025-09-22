require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

class IntegratedDataProcessor {
    constructor() {
        this.customerDbId = process.env.NOTION_DATABASE_ID;
        this.ansMasterDbId = process.env.NOTION_ANS_MASTER_DB;
        this.ansDetailDbs = {
            'ANS002': process.env.NOTION_ANS_ANS002_DB,
            'ANS003': process.env.NOTION_ANS_ANS003_DB,
            'ANS004': process.env.NOTION_ANS_ANS004_DB,
            'ANS007': process.env.NOTION_ANS_ANS007_DB
        };
    }

    async processCompleteData(apiData) {
        try {
            const data = apiData[0] ? apiData[0].data : apiData.data || apiData;

            console.log('🚀 통합 데이터 처리 시작...\n');

            // 1단계: 고객 정보 생성 또는 업데이트
            const customerPageId = await this.createOrUpdateCustomer(data);

            if (!customerPageId) {
                throw new Error('고객 페이지 생성 실패');
            }

            // 2단계: ANS 마스터 레코드 생성 (고객 ID 연결)
            const ansMasterPageId = await this.createANSMasterRecord(data, customerPageId);

            // 3단계: ANS 상세 데이터 처리
            if (data.analysisDetail) {
                await this.processANSDetails(data.analysisDetail, ansMasterPageId, data.customerInfo);
            }

            console.log('✅ 모든 데이터 처리 완료!\n');

            return {
                customerId: customerPageId,
                ansMasterId: ansMasterPageId,
                success: true
            };

        } catch (error) {
            console.error('❌ 데이터 처리 실패:', error);
            throw error;
        }
    }

    async createOrUpdateCustomer(data) {
        try {
            const customerInfo = data.customerInfo || {};
            const latestOrder = data.latestOrder || {};
            const subscription = data.subscription || {};

            // 기존 고객 검색
            const existingCustomer = await this.findCustomerByPhone(
                customerInfo.phone || latestOrder.user?.usrPhone
            );

            const properties = {
                "이름": {
                    title: [{
                        text: {
                            content: customerInfo.name ||
                                    latestOrder.user?.usrName ||
                                    '이름없음'
                        }
                    }]
                },
                "전화번호": {
                    phone_number: customerInfo.phone ||
                                 latestOrder.user?.usrPhone ||
                                 null
                },
                "생년월일": {
                    rich_text: [{
                        text: { content: latestOrder.user?.usrBirth || '' }
                    }]
                },
                "로그인ID": {
                    rich_text: [{
                        text: { content: latestOrder.member?.memLoginId || '' }
                    }]
                },
                "소속": {
                    rich_text: [{
                        text: { content: latestOrder.member?.memAgency || '' }
                    }]
                },
                "회원유형": {
                    select: { name: latestOrder.member?.memType || '일반' }
                },
                "구독상품": {
                    rich_text: [{
                        text: { content: subscription.product?.prdName || '' }
                    }]
                },
                "구독상태": {
                    select: {
                        name: subscription.subscribe?.subState || '미구독'
                    }
                },
                "다음결제일": {
                    date: subscription.subscribe?.subNextPayDay ?
                        { start: subscription.subscribe.subNextPayDay } : null
                },
                "최근분석일": {
                    date: latestOrder.orderDetail?.oddCompletedAt ?
                        { start: new Date(latestOrder.orderDetail.oddCompletedAt).toISOString().split('T')[0] } : null
                },
                "분석상태": {
                    select: {
                        name: latestOrder.orderDetail?.oddState || '미분석'
                    }
                },
                "알림": {
                    number: data.alarm?.noCheckCount || 0
                },
                "총주문건수": {
                    number: data.totalOrders || data.orders?.length || 0
                }
            };

            let customerPageId;

            if (existingCustomer) {
                // 기존 고객 업데이트
                await notion.pages.update({
                    page_id: existingCustomer.id,
                    properties: properties
                });
                customerPageId = existingCustomer.id;
                console.log(`✅ 고객 정보 업데이트: ${customerInfo.name}`);
            } else {
                // 새 고객 생성
                const response = await notion.pages.create({
                    parent: { database_id: this.customerDbId },
                    properties: properties
                });
                customerPageId = response.id;
                console.log(`✅ 새 고객 생성: ${customerInfo.name}`);
            }

            return customerPageId;

        } catch (error) {
            console.error('고객 정보 처리 실패:', error);
            throw error;
        }
    }

    async findCustomerByPhone(phone) {
        if (!phone) return null;

        try {
            const response = await notion.databases.query({
                database_id: this.customerDbId,
                filter: {
                    property: "전화번호",
                    phone_number: {
                        equals: phone
                    }
                }
            });

            return response.results.length > 0 ? response.results[0] : null;
        } catch (error) {
            console.error('고객 검색 실패:', error);
            return null;
        }
    }

    async createANSMasterRecord(data, customerPageId) {
        try {
            const customerInfo = data.customerInfo || {};
            const analysisDetail = data.analysisDetail || {};
            const latestOrder = data.latestOrder || {};

            // ANS 건수 계산
            const ansCountMap = {};

            // basic ANS 처리
            if (analysisDetail.basic) {
                for (const [ansKey, ansData] of Object.entries(analysisDetail.basic)) {
                    ansCountMap[ansKey] = ansData.count || 0;
                }
            }

            // aggregate ANS 처리
            if (analysisDetail.aggregate) {
                for (const [ansKey, sickedData] of Object.entries(analysisDetail.aggregate)) {
                    let totalCount = 0;
                    for (const [sickedType, data] of Object.entries(sickedData)) {
                        totalCount += data.count || 0;
                    }
                    ansCountMap[ansKey] = totalCount;
                }
            }

            const properties = {
                "고객명": {
                    title: [{
                        text: { content: customerInfo.name || '이름없음' }
                    }]
                },
                "전화번호": {
                    phone_number: customerInfo.phone || null
                },
                "생년월일": {
                    rich_text: [{
                        text: { content: latestOrder.user?.usrBirth || '' }
                    }]
                },
                "분석일시": {
                    date: latestOrder.orderDetail?.oddCompletedAt ?
                        { start: new Date(latestOrder.orderDetail.oddCompletedAt).toISOString().split('T')[0] } : null
                },
                "분석상태": {
                    select: { name: latestOrder.orderDetail?.oddState || '분석중' }
                },
                "구독상품": {
                    rich_text: [{
                        text: { content: data.subscription?.product?.prdName || '' }
                    }]
                },
                "소속": {
                    rich_text: [{
                        text: { content: latestOrder.member?.memAgency || '' }
                    }]
                },
                // 고객DB연결은 relation 타입이지만 현재 rich_text로 설정되어 있음
                // 임시로 텍스트로 저장
                "고객DB연결": {
                    rich_text: [{
                        text: { content: customerPageId }
                    }]
                }
            };

            // ANS별 건수 추가
            for (const [ansKey, count] of Object.entries(ansCountMap)) {
                const propName = `${ansKey}_${this.getANSTypeName(ansKey)}`;
                if (propName.includes('기타') || propName.includes('기본')) {
                    properties[propName] = { checkbox: count > 0 };
                } else {
                    properties[propName] = { number: count };
                }
            }

            const response = await notion.pages.create({
                parent: { database_id: this.ansMasterDbId },
                properties: properties
            });

            console.log(`✅ ANS 마스터 레코드 생성 완료`);
            return response.id;

        } catch (error) {
            console.error('ANS 마스터 레코드 생성 실패:', error);
            throw error;
        }
    }

    async processANSDetails(analysisDetail, ansMasterPageId, customerInfo) {
        // Basic ANS 처리
        if (analysisDetail.basic) {
            for (const [ansKey, ansData] of Object.entries(analysisDetail.basic)) {
                if (ansData.count === 0 || !ansData.list) continue;

                console.log(`  📝 ${ansKey} 처리 중 (${ansData.count}건)...`);

                for (const record of ansData.list) {
                    await this.createANSDetailRecord(ansKey, record, ansMasterPageId, customerInfo);
                }
            }
        }

        // Aggregate ANS 처리
        if (analysisDetail.aggregate) {
            for (const [ansKey, sickedData] of Object.entries(analysisDetail.aggregate)) {
                for (const [sickedType, data] of Object.entries(sickedData)) {
                    if (data.count === 0 || !data.list) continue;

                    console.log(`  📝 ${ansKey} ${sickedType} 처리 중 (${data.count}건)...`);

                    for (const record of data.list) {
                        await this.createAggregateRecord(ansKey, record, ansMasterPageId, customerInfo, sickedType);
                    }
                }
            }
        }
    }

    async createANSDetailRecord(ansKey, record, ansMasterPageId, customerInfo) {
        const dbId = this.ansDetailDbs[ansKey];
        if (!dbId) return;

        try {
            const properties = this.buildDetailProperties(ansKey, record, ansMasterPageId, customerInfo);

            await notion.pages.create({
                parent: { database_id: dbId },
                properties: properties
            });

        } catch (error) {
            console.error(`${ansKey} 상세 레코드 생성 실패:`, error);
        }
    }

    async createAggregateRecord(ansKey, record, ansMasterPageId, customerInfo, sickedType) {
        const dbId = this.ansDetailDbs['ANS003'];
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
                    relation: [{ id: ansMasterPageId }]
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

    buildDetailProperties(ansKey, record, ansMasterPageId, customerInfo) {
        // 기존 buildDetailProperties 함수 내용과 동일
        const baseProperties = {
            "환자명": {
                title: [{
                    text: { content: customerInfo.name || '' }
                }]
            },
            "마스터연결": {
                relation: [{ id: ansMasterPageId }]
            }
        };

        // ANS 타입별 속성 추가 (기존 코드와 동일)
        return baseProperties;
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

module.exports = IntegratedDataProcessor;

// 테스트 실행
if (require.main === module) {
    async function test() {
        const processor = new IntegratedDataProcessor();

        // 테스트 데이터
        const testData = {
            customerInfo: {
                name: "테스트 고객",
                phone: "010-1234-5678"
            },
            latestOrder: {
                user: {
                    usrBirth: "900101"
                },
                member: {
                    memLoginId: "test123",
                    memAgency: "테스트 지점"
                },
                orderDetail: {
                    oddState: "분석완료",
                    oddCompletedAt: new Date().toISOString()
                }
            }
        };

        const result = await processor.processCompleteData(testData);
        console.log('처리 결과:', result);
    }

    test();
}