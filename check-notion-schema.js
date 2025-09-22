const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({
    auth: process.env.NOTION_API_KEY
});

async function checkDatabaseSchema() {
    try {
        const databaseId = process.env.NOTION_PROJECT_DB_ID;

        const response = await notion.databases.retrieve({
            database_id: databaseId
        });

        console.log('데이터베이스 정보:');
        console.log('- 제목:', response.title[0]?.plain_text);
        console.log('\n속성 목록:');

        if (response.properties) {
            Object.entries(response.properties).forEach(([key, value]) => {
                console.log(`- "${key}": ${value.type}`);
                if (value.type === 'select' && value.select?.options) {
                    console.log(`  옵션: ${value.select.options.map(o => o.name).join(', ')}`);
                }
                if (value.type === 'multi_select' && value.multi_select?.options) {
                    console.log(`  옵션: ${value.multi_select.options.map(o => o.name).join(', ')}`);
                }
            });
        } else {
            console.log('속성이 없거나 접근 권한이 없습니다.');
            console.log('전체 응답:', JSON.stringify(response, null, 2));
        }

    } catch (error) {
        console.error('오류:', error.message);
    }
}

checkDatabaseSchema();