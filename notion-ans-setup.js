require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function createANSMasterDatabase() {
    try {
        const response = await notion.databases.create({
            parent: {
                type: "page_id",
                page_id: process.env.NOTION_PAGE_ID
            },
            title: [
                {
                    type: "text",
                    text: {
                        content: "ANS 마스터 데이터베이스"
                    }
                }
            ],
            properties: {
                "ANS 번호": {
                    title: {}
                },
                "계약명": {
                    rich_text: {}
                },
                "보험사": {
                    select: {
                        options: [
                            { name: "삼성생명", color: "blue" },
                            { name: "한화생명", color: "orange" },
                            { name: "교보생명", color: "green" },
                            { name: "신한생명", color: "purple" },
                            { name: "메트라이프", color: "red" },
                            { name: "DB손해보험", color: "yellow" },
                            { name: "현대해상", color: "pink" },
                            { name: "KB손해보험", color: "brown" },
                            { name: "삼성화재", color: "gray" }
                        ]
                    }
                },
                "상품유형": {
                    select: {
                        options: [
                            { name: "종신보험", color: "blue" },
                            { name: "정기보험", color: "green" },
                            { name: "암보험", color: "red" },
                            { name: "실손보험", color: "purple" },
                            { name: "연금보험", color: "orange" },
                            { name: "저축보험", color: "yellow" },
                            { name: "어린이보험", color: "pink" },
                            { name: "운전자보험", color: "gray" }
                        ]
                    }
                },
                "월보험료": {
                    number: {
                        format: "won"
                    }
                },
                "보장시작일": {
                    date: {}
                },
                "보장종료일": {
                    date: {}
                },
                "주요보장내용": {
                    rich_text: {}
                },
                "특약사항": {
                    rich_text: {}
                },
                "가입연령": {
                    number: {}
                },
                "납입기간": {
                    rich_text: {}
                },
                "보장기간": {
                    rich_text: {}
                },
                "해약환급금": {
                    number: {
                        format: "won"
                    }
                },
                "연결된 고객": {
                    relation: {
                        database_id: process.env.NOTION_DATABASE_ID,
                        type: "dual_property",
                        dual_property: {
                            synced_property_id: "ans_contracts",
                            synced_property_name: "보험계약 (ANS)"
                        }
                    }
                },
                "상태": {
                    select: {
                        options: [
                            { name: "유지", color: "green" },
                            { name: "실효", color: "red" },
                            { name: "해약", color: "gray" },
                            { name: "만기", color: "blue" }
                        ]
                    }
                },
                "메모": {
                    rich_text: {}
                }
            }
        });

        console.log('✅ ANS 마스터 데이터베이스 생성 완료');
        console.log('Database ID:', response.id);
        console.log('\n⚠️  .env 파일에 다음 항목을 추가하세요:');
        console.log(`NOTION_ANS_DATABASE_ID=${response.id}`);

        return response.id;
    } catch (error) {
        console.error('❌ 데이터베이스 생성 실패:', error);
        throw error;
    }
}

async function addANSRelationToCustomerDB() {
    try {
        await notion.databases.update({
            database_id: process.env.NOTION_DATABASE_ID,
            properties: {
                "보험계약 (ANS)": {
                    relation: {
                        database_id: process.env.NOTION_ANS_DATABASE_ID,
                        type: "dual_property",
                        dual_property: {}
                    }
                }
            }
        });

        console.log('✅ 고객 데이터베이스에 ANS 관계 필드 추가 완료');
    } catch (error) {
        console.error('❌ 관계 필드 추가 실패:', error);
        throw error;
    }
}

async function main() {
    console.log('🚀 ANS 데이터베이스 설정 시작\n');

    if (!process.env.NOTION_API_KEY || !process.env.NOTION_PAGE_ID) {
        console.error('❌ 환경변수를 확인하세요: NOTION_API_KEY, NOTION_PAGE_ID');
        return;
    }

    try {
        console.log('1️⃣ ANS 마스터 데이터베이스 생성 중...');
        const ansDbId = await createANSMasterDatabase();

        console.log('\n2️⃣ 고객 DB와 연결 설정 중...');
        console.log('   먼저 .env 파일에 NOTION_ANS_DATABASE_ID를 추가한 후');
        console.log('   다시 실행하거나 수동으로 Notion에서 관계 필드를 추가하세요.');

    } catch (error) {
        console.error('설정 실패:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = { createANSMasterDatabase, addANSRelationToCustomerDB };