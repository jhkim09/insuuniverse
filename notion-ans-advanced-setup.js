require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const ANS_TYPES = {
    'ANS001': '기본정보',
    'ANS002': '의료이용내역',
    'ANS003': '질병분석_aggregate',
    'ANS004': '수술/입원내역',
    'ANS005': '질병분석_aggregate',
    'ANS006': '질병분석_aggregate',
    'ANS007': '치과치료',
    'ANS008': '수술내역',
    'ANS009': '기타정보',
    'ANS010': '기타정보',
    'ANS011': '기타정보',
    'ANS012': '치과상세',
    'ANS013': '질병분석_aggregate'
};

async function createANSMasterDatabase() {
    try {
        const response = await notion.databases.create({
            parent: {
                type: "page_id",
                page_id: process.env.NOTION_PAGE_ID
            },
            title: [{
                type: "text",
                text: { content: "📊 ANS 통합 마스터 DB" }
            }],
            properties: {
                "고객명": {
                    title: {}
                },
                "전화번호": {
                    phone_number: {}
                },
                "생년월일": {
                    rich_text: {}
                },
                "분석일시": {
                    date: {}
                },
                "분석상태": {
                    select: {
                        options: [
                            { name: "분석완료", color: "green" },
                            { name: "분석중", color: "yellow" },
                            { name: "분석실패", color: "red" }
                        ]
                    }
                },
                "구독상품": {
                    rich_text: {}
                },
                "소속": {
                    rich_text: {}
                },
                "ANS001_기본": {
                    checkbox: {}
                },
                "ANS002_의료이용": {
                    number: {}
                },
                "ANS003_질병": {
                    number: {}
                },
                "ANS004_수술입원": {
                    number: {}
                },
                "ANS005_질병": {
                    number: {}
                },
                "ANS006_질병": {
                    number: {}
                },
                "ANS007_치과": {
                    number: {}
                },
                "ANS008_수술": {
                    number: {}
                },
                "ANS009_기타": {
                    checkbox: {}
                },
                "ANS010_기타": {
                    checkbox: {}
                },
                "ANS011_기타": {
                    checkbox: {}
                },
                "ANS012_치과상세": {
                    number: {}
                },
                "ANS013_질병": {
                    number: {}
                },
                "총_질병건수": {
                    formula: {
                        expression: "prop(\"ANS002_의료이용\") + prop(\"ANS004_수술입원\") + prop(\"ANS007_치과\") + prop(\"ANS008_수술\") + prop(\"ANS012_치과상세\")"
                    }
                },
                "주요진단": {
                    multi_select: {
                        options: []
                    }
                },
                "메모": {
                    rich_text: {}
                },
                "원본데이터": {
                    rich_text: {}
                },
                "고객DB연결": {
                    relation: {
                        database_id: process.env.NOTION_DATABASE_ID,
                        type: "dual_property",
                        dual_property: {}
                    }
                }
            }
        });

        console.log('✅ ANS 통합 마스터 데이터베이스 생성 완료');
        console.log('Database ID:', response.id);
        return response.id;
    } catch (error) {
        console.error('❌ 마스터 DB 생성 실패:', error);
        throw error;
    }
}

async function createANSDetailDatabase(ansType, parentDbId) {
    const detailProperties = {
        'ANS002': {
            "환자명": { title: {} },
            "진료시작일": { date: {} },
            "병원명": { rich_text: {} },
            "진료과": { select: { options: [
                { name: "내과", color: "blue" },
                { name: "외과", color: "red" },
                { name: "정형외과", color: "orange" },
                { name: "이비인후과", color: "green" },
                { name: "치과", color: "purple" },
                { name: "치주과", color: "pink" }
            ]}},
            "진료유형": { select: { options: [
                { name: "외래", color: "blue" },
                { name: "입원", color: "red" }
            ]}},
            "질병코드": { rich_text: {} },
            "질병명": { rich_text: {} },
            "방문일수": { number: {} },
            "수술명": { rich_text: {} },
            "검사유형": { multi_select: { options: [
                { name: "혈액검사", color: "red" },
                { name: "영상검사", color: "blue" },
                { name: "내시경", color: "green" },
                { name: "순환기검사", color: "purple" }
            ]}},
            "투약일수": { number: {} },
            "보험급여정보": { rich_text: {} },
            "주의사항": { rich_text: {} },
            "마스터연결": { relation: { database_id: parentDbId, type: "dual_property", dual_property: {} }}
        },
        'ANS003': {
            "환자명": { title: {} },
            "질병분류": { select: { options: [
                { name: "sicked_0", color: "red" },
                { name: "sicked_1", color: "orange" }
            ]}},
            "진료시작일": { date: {} },
            "진료종료일": { date: {} },
            "질병코드": { rich_text: {} },
            "질병명": { rich_text: {} },
            "방문일수": { number: {} },
            "투약일수": { number: {} },
            "보험급여정보": { rich_text: {} },
            "수술정보": { rich_text: {} },
            "중복여부": { checkbox: {} },
            "마스터연결": { relation: { database_id: parentDbId, type: "dual_property", dual_property: {} }}
        },
        'ANS004': {
            "환자명": { title: {} },
            "입원일": { date: {} },
            "병원명": { rich_text: {} },
            "진료과": { rich_text: {} },
            "질병코드": { rich_text: {} },
            "질병명": { rich_text: {} },
            "입원일수": { number: {} },
            "수술명": { rich_text: {} },
            "수술코드": { rich_text: {} },
            "검사항목": { rich_text: {} },
            "검사건수": { number: {} },
            "보험급여정보": { rich_text: {} },
            "장해가능성": { rich_text: {} },
            "마스터연결": { relation: { database_id: parentDbId, type: "dual_property", dual_property: {} }}
        },
        'ANS007': {
            "환자명": { title: {} },
            "진료일": { date: {} },
            "치과병원명": { rich_text: {} },
            "진료유형": { select: { options: [
                { name: "치주질환", color: "red" },
                { name: "충치", color: "blue" },
                { name: "보철", color: "green" },
                { name: "교정", color: "purple" }
            ]}},
            "질병명": { rich_text: {} },
            "치료내용": { rich_text: {} },
            "치아번호": { rich_text: {} },
            "치료비용": { number: {} },
            "보험적용여부": { checkbox: {} },
            "마스터연결": { relation: { database_id: parentDbId, type: "dual_property", dual_property: {} }}
        }
    };

    const typeKey = ansType.split('_')[0];
    const properties = detailProperties[typeKey] || detailProperties['ANS002'];

    try {
        const response = await notion.databases.create({
            parent: {
                type: "page_id",
                page_id: process.env.NOTION_PAGE_ID
            },
            title: [{
                type: "text",
                text: { content: `📋 ${ansType} 상세 데이터` }
            }],
            properties: properties
        });

        console.log(`✅ ${ansType} 상세 데이터베이스 생성 완료`);
        return response.id;
    } catch (error) {
        console.error(`❌ ${ansType} DB 생성 실패:`, error);
        return null;
    }
}

async function setupAllDatabases() {
    console.log('🚀 ANS 데이터베이스 전체 설정 시작\n');

    try {
        console.log('1️⃣ 마스터 데이터베이스 생성 중...');
        const masterDbId = await createANSMasterDatabase();

        console.log('\n2️⃣ 세부 데이터베이스 생성 중...');
        const detailDbs = {};

        const mainAnsTypes = ['ANS002_의료이용', 'ANS003_질병분석', 'ANS004_수술입원', 'ANS007_치과'];

        for (const ansType of mainAnsTypes) {
            console.log(`   - ${ansType} DB 생성 중...`);
            const dbId = await createANSDetailDatabase(ansType, masterDbId);
            if (dbId) {
                detailDbs[ansType] = dbId;
            }
        }

        console.log('\n✅ 모든 데이터베이스 생성 완료!');
        console.log('\n📝 .env 파일에 추가할 내용:');
        console.log(`NOTION_ANS_MASTER_DB=${masterDbId}`);

        for (const [type, id] of Object.entries(detailDbs)) {
            console.log(`NOTION_ANS_${type.split('_')[0]}_DB=${id}`);
        }

        return { masterDbId, detailDbs };
    } catch (error) {
        console.error('설정 실패:', error);
    }
}

if (require.main === module) {
    setupAllDatabases();
}

module.exports = { createANSMasterDatabase, createANSDetailDatabase, setupAllDatabases };