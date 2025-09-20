# PDF 파일 노션 업로드 가이드

## 📄 PDF 처리 방법

### 옵션 1: Google Drive 경유 (권장)
1. **Google Drive** 모듈 → **Upload a File** 추가
2. **File Data**: `{{pdfReport.path}}` (다운로드된 PDF 경로)
3. **File Name**: `분석보고서_{{master.customerName}}_{{master.analysisId}}.pdf`
4. **Folder**: 지정된 폴더 (예: "Insuniverse Reports")

5. **Notion** 모듈에서:
   - **원본JSON** 필드: `{{Google Drive 모듈.webViewLink}}`

### 옵션 2: Dropbox 경유
1. **Dropbox** 모듈 → **Upload a File** 추가
2. **File Path**: `/Insuniverse/분석보고서_{{master.customerName}}_{{master.analysisId}}.pdf`
3. **File Content**: `{{pdfReport.path}}`

4. **Notion** 모듈에서:
   - **원본JSON** 필드: `{{Dropbox 모듈.url}}`

### 옵션 3: 웹 서버에서 직접 URL 제공
1. **웹 서버에 static 파일 서빙** 추가
2. **PDF URL**: `http://localhost:3004/downloads/파일명.pdf`
3. **Make.com에서**: 이 URL을 노션에 저장

## 🔧 웹 서버 수정 (옵션 3)

현재 웹훅 데이터에 PDF 정보를 추가해야 합니다:

```json
{
  "pdfReport": {
    "filename": "analysis_10106_김지훈_2025-09-12.pdf",
    "downloadUrl": "http://localhost:3004/downloads/analysis_10106_김지훈_2025-09-12.pdf",
    "size": 245760,
    "downloadedAt": "2025-09-12T07:55:00.000Z"
  }
}
```

## 📊 노션 데이터베이스 필드 추가

### 고객 마스터 DB에 추가할 필드:
- **PDF보고서URL** (URL 타입): PDF 파일 링크
- **PDF파일크기** (Number 타입): 파일 크기 (KB)
- **PDF다운로드일** (Date 타입): 다운로드 완료 시간

### Make.com 매핑:
| 노션 필드 | Make.com 매핑 |
|-----------|---------------|
| **PDF보고서URL** | `{{Google Drive.webViewLink}}` 또는 `{{1.data.pdfReport.downloadUrl}}` |
| **PDF파일크기** | `{{1.data.pdfReport.size}}` |
| **PDF다운로드일** | `{{1.data.pdfReport.downloadedAt}}` |

## 🚀 추천 구현 순서

1. **웹 서버에 static 파일 서빙 추가** (가장 간단)
2. **PDF 다운로드 기능 완성**
3. **노션 DB에 PDF URL 필드 추가**
4. **Make.com에서 URL 매핑**

어떤 방법을 선호하시나요?