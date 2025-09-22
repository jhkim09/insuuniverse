require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function getNotionInfo() {
    console.log('🔍 Notion 정보 확인 중...\n');

    try {
        // 1. 현재 연결된 데이터베이스 검색 (filter 없이)
        const response = await notion.search({
            page_size: 10
        });

        console.log('📚 접근 가능한 항목들:');

        const databases = response.results.filter(item => item.object === 'database');
        const pages = response.results.filter(item => item.object === 'page');

        if (databases.length > 0) {
            console.log('\n📊 데이터베이스:');
            databases.forEach((db, index) => {
                const title = db.title?.[0]?.text?.content ||
                             db.title?.[0]?.plain_text ||
                             '제목 없음';
                console.log(`\n${index + 1}. ${title}`);
                console.log(`   ID: ${db.id}`);
                console.log(`   URL: ${db.url}`);

                // Parent 정보 확인
                if (db.parent) {
                    if (db.parent.type === 'page_id') {
                        console.log(`   ✅ Parent Page ID: ${db.parent.page_id}`);
                    } else if (db.parent.type === 'workspace') {
                        console.log(`   Parent: Workspace Root`);
                    }
                }
            });
        }

        if (pages.length > 0) {
            console.log('\n📄 페이지:');
            pages.forEach((page, index) => {
                // 페이지 제목 찾기 (다양한 속성명 시도)
                let title = '제목 없음';
                if (page.properties) {
                    for (const prop of Object.values(page.properties)) {
                        if (prop.title && prop.title.length > 0) {
                            title = prop.title[0].text?.content || prop.title[0].plain_text;
                            break;
                        }
                    }
                }

                console.log(`\n${index + 1}. ${title}`);
                console.log(`   Page ID: ${page.id}`);
                console.log(`   URL: ${page.url}`);
            });
        }

        // 2. 프로젝트 DB가 있다면 그 Parent 확인
        if (process.env.NOTION_PROJECT_DB_ID) {
            console.log('\n📍 기존 프로젝트 DB 정보 확인...');
            try {
                const projectDb = await notion.databases.retrieve({
                    database_id: process.env.NOTION_PROJECT_DB_ID
                });

                console.log(`\n프로젝트 DB: ${projectDb.title?.[0]?.text?.content}`);

                if (projectDb.parent.type === 'page_id') {
                    console.log(`✅ Parent Page ID 발견: ${projectDb.parent.page_id}`);
                    console.log('\n💡 이 Page ID를 .env 파일에 추가하세요:');
                    console.log(`NOTION_PAGE_ID=${projectDb.parent.page_id}`);

                    return projectDb.parent.page_id;
                } else if (projectDb.parent.type === 'workspace') {
                    console.log('ℹ️  이 데이터베이스는 워크스페이스 루트에 있습니다.');
                    console.log('💡 워크스페이스 루트에 데이터베이스를 만들려면:');
                    console.log('   parent: { type: "workspace", workspace: true }');
                }
            } catch (error) {
                console.error('프로젝트 DB 조회 실패:', error.message);
            }
        }

        // 3. 추천사항 출력
        if (databases.length > 0 && databases[0].parent?.page_id) {
            console.log('\n💡 추천: 첫 번째 데이터베이스의 Parent Page ID를 사용하세요:');
            console.log(`NOTION_PAGE_ID=${databases[0].parent.page_id}`);
        } else if (pages.length > 0) {
            console.log('\n💡 추천: 첫 번째 페이지 ID를 사용하세요:');
            console.log(`NOTION_PAGE_ID=${pages[0].id}`);
        } else {
            console.log('\n⚠️  워크스페이스 루트에 데이터베이스를 만들려면:');
            console.log('notion-ans-advanced-setup.js 파일을 수정하여');
            console.log('parent: { type: "workspace", workspace: true } 로 변경하세요');
        }

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        console.error('\n디버그 정보:', error);
    }
}

// 실행
getNotionInfo();