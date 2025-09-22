require('dotenv').config();

console.log('🚀 ANS 데이터베이스 설정 가이드\n');
console.log('='.repeat(50));

console.log('\n📋 필요한 환경변수 (.env 파일):');
console.log('```');
console.log('# 기본 Notion 설정');
console.log('NOTION_API_KEY=your_notion_api_key');
console.log('NOTION_DATABASE_ID=your_customer_database_id');
console.log('NOTION_PAGE_ID=your_workspace_page_id');
console.log('');
console.log('# ANS 데이터베이스 (자동 생성 후 추가)');
console.log('NOTION_ANS_MASTER_DB=');
console.log('NOTION_ANS_ANS002_DB=');
console.log('NOTION_ANS_ANS003_DB=');
console.log('NOTION_ANS_ANS004_DB=');
console.log('NOTION_ANS_ANS007_DB=');
console.log('```');

console.log('\n🔧 설정 단계:');
console.log('');
console.log('1️⃣ ANS 데이터베이스 생성:');
console.log('   node notion-ans-advanced-setup.js');
console.log('   → 생성된 Database ID들을 .env 파일에 추가');
console.log('');
console.log('2️⃣ 로컬 테스트:');
console.log('   node render-server.js');
console.log('   → http://localhost:3001 접속');
console.log('   → 웹폼에서 테스트');
console.log('');
console.log('3️⃣ Render 배포:');
console.log('   git add .');
console.log('   git commit -m "ANS 통합 처리 기능 추가"');
console.log('   git push');
console.log('');
console.log('4️⃣ Render 환경변수 설정:');
console.log('   Render 대시보드 → Environment → 다음 변수 추가:');
console.log('   - NOTION_API_KEY');
console.log('   - NOTION_DATABASE_ID');
console.log('   - NOTION_ANS_MASTER_DB');
console.log('   - NOTION_ANS_ANS002_DB');
console.log('   - NOTION_ANS_ANS003_DB');
console.log('   - NOTION_ANS_ANS004_DB');
console.log('   - NOTION_ANS_ANS007_DB');

console.log('\n✅ 현재 환경변수 상태:');
console.log(`- NOTION_API_KEY: ${process.env.NOTION_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
console.log(`- NOTION_DATABASE_ID: ${process.env.NOTION_DATABASE_ID ? '✅ 설정됨' : '❌ 미설정'}`);
console.log(`- NOTION_ANS_MASTER_DB: ${process.env.NOTION_ANS_MASTER_DB ? '✅ 설정됨' : '❌ 미설정'}`);

console.log('\n='.repeat(50));