# 📋 Render 환경변수 설정 완벽 가이드

## 🎯 필요한 환경변수 목록

### 1. **필수 환경변수** (이미 있을 것)
```
NOTION_API_KEY = secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID = 12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2. **새로 추가할 환경변수**

#### NOTION_PAGE_ID 구하는 방법:
1. Notion 워크스페이스에서 데이터베이스를 만들 페이지 열기
2. URL 확인: `https://notion.so/페이지이름-여기가PageID입니다`
3. 또는 기존 고객 데이터베이스가 있는 페이지의 ID 사용

예시:
```
NOTION_PAGE_ID = 98765432-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

## 🔧 설정 단계

### Step 1: 로컬에서 ANS 데이터베이스 생성

1. `.env` 파일에 NOTION_PAGE_ID 추가:
```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTION_PAGE_ID=98765432-yyyy-yyyy-yyyy-yyyyyyyyyyyy
```

2. 데이터베이스 생성 스크립트 실행:
```bash
node notion-ans-advanced-setup.js
```

3. 콘솔에 출력되는 Database ID들 복사:
```
✅ ANS 통합 마스터 데이터베이스 생성 완료
Database ID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

✅ ANS002_의료이용 DB 생성 완료
Database ID: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

✅ ANS003_질병분석 DB 생성 완료
Database ID: cccccccc-cccc-cccc-cccc-cccccccccccc

✅ ANS004_수술입원 DB 생성 완료
Database ID: dddddddd-dddd-dddd-dddd-dddddddddddd

✅ ANS007_치과 DB 생성 완료
Database ID: eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
```

### Step 2: .env 파일 완성
```env
# 기존 설정
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTION_PAGE_ID=98765432-yyyy-yyyy-yyyy-yyyyyyyyyyyy

# 새로 생성된 ANS 데이터베이스 ID들
NOTION_ANS_MASTER_DB=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
NOTION_ANS_ANS002_DB=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
NOTION_ANS_ANS003_DB=cccccccc-cccc-cccc-cccc-cccccccccccc
NOTION_ANS_ANS004_DB=dddddddd-dddd-dddd-dddd-dddddddddddd
NOTION_ANS_ANS007_DB=eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
```

### Step 3: Render 대시보드에서 환경변수 설정

1. [Render 대시보드](https://dashboard.render.com) 로그인
2. 해당 서비스 선택
3. **Environment** 탭 클릭
4. **Add Environment Variable** 클릭
5. 다음 변수들 추가:

| Key | Value |
|-----|-------|
| NOTION_API_KEY | secret_xxxxxxxxxxxxxxxxxxxxx |
| NOTION_DATABASE_ID | 12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| NOTION_PAGE_ID | 98765432-yyyy-yyyy-yyyy-yyyyyyyyyyyy |
| NOTION_ANS_MASTER_DB | aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa |
| NOTION_ANS_ANS002_DB | bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb |
| NOTION_ANS_ANS003_DB | cccccccc-cccc-cccc-cccc-cccccccccccc |
| NOTION_ANS_ANS004_DB | dddddddd-dddd-dddd-dddd-dddddddddddd |
| NOTION_ANS_ANS007_DB | eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee |

6. **Save Changes** 클릭
7. 서비스가 자동으로 재배포됨

## ✅ 확인 방법

1. Render 로그 확인:
```
🚀 Insuniverse API 서버가 실행 중입니다
📍 주소: https://your-app.onrender.com

환경 설정:
- MAKE_WEBHOOK_URL: ✅ 설정됨
- NOTION_API_KEY: ✅ 설정됨
- NOTION_DATABASE_ID: ✅ 설정됨
- NOTION_ANS_MASTER_DB: ✅ 설정됨
```

2. 웹폼 테스트:
- https://your-app.onrender.com 접속
- 테스트 데이터 입력
- Notion에서 데이터 확인

## 🔍 Notion에서 ID 찾는 방법

### Database ID:
1. 데이터베이스 페이지 열기
2. 우측 상단 `...` → `Copy link`
3. URL 형식: `https://notion.so/database-name-여기가DatabaseID?v=xxx`

### Page ID:
1. 페이지 열기
2. 우측 상단 `...` → `Copy link`
3. URL 형식: `https://notion.so/page-name-여기가PageID`

## ❓ 문제 해결

### "NOTION_PAGE_ID should be defined" 오류:
→ NOTION_PAGE_ID를 .env에 추가하고 다시 실행

### "Database not found" 오류:
→ 데이터베이스 ID가 올바른지 확인

### "Unauthorized" 오류:
→ NOTION_API_KEY 확인 및 Integration 권한 확인

## 💡 팁

- 모든 ID는 UUID 형식 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- Notion Integration이 모든 페이지에 접근 권한 있는지 확인
- 환경변수 변경 후 Render는 자동 재배포됨