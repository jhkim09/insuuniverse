const fs = require('fs').promises;
require('dotenv').config();

class DetailedRecordsProcessor {
    constructor() {
        this.masterDatabaseId = '8b0f4a5e-29e4-4534-b7e2-68288a64adcd'; // 고객 마스터 DB
        this.detailDatabaseId = '3d674245-c66b-4d86-8aad-459a0bf3c39b'; // 진료기록 상세 DB
    }

    // JSON에서 개별 진료기록 추출
    extractMedicalRecords(jsonData) {
        const records = [];
        const customer = jsonData.customer || {};
        const metadata = jsonData.metadata || {};
        const apis = jsonData.apis || {};

        console.log(`\n=== ${customer.name} 진료기록 추출 중 ===`);

        // 각 API별로 진료기록 추출
        Object.entries(apis).forEach(([apiName, apiData]) => {
            if (apiData.data?.list && Array.isArray(apiData.data.list)) {
                console.log(`${apiName}에서 ${apiData.data.list.length}개 레코드 처리 중...`);
                
                apiData.data.list.forEach((item, index) => {
                    const basic = item.basic || {};
                    const detail = item.detail || {};
                    
                    // 진료기록 ID 생성 (분석ID + 데이터소스 + 인덱스)
                    const recordId = `${metadata.analysisId}_${this.getDataSourceCode(apiName)}_${index + 1}`;
                    
                    const record = {
                        '진료기록 ID': recordId,
                        '분석ID': metadata.analysisId,
                        '고객명': customer.name, // 문자열로 변경
                        
                        // 진료 기본 정보
                        'date:진료시작일:start': basic.asbTreatStartDate || null,
                        'date:진료시작일:is_datetime': 0,
                        'date:진료종료일:start': basic.asbTreatEndDate || null,
                        'date:진료종료일:is_datetime': 0,
                        
                        // 병원 및 진료 정보
                        '병원명': basic.asbHospitalName || '',
                        '진료과': this.mapDepartment(basic.asbDepartment),
                        '진료유형': this.mapTreatType(basic.asbTreatType),
                        
                        // 질병 정보
                        '질병코드': basic.asbDiseaseCode || '',
                        '질병명': basic.asbDiseaseName || '',
                        
                        // 통계 정보
                        '방문일수': basic.asbVisitDays || 0,
                        '복용일수': basic.asbDosingDays || detail.asdDosingDays || 0,
                        
                        // 수술 정보
                        '수술내역': detail.asdOperation || '',
                        '수술횟수': detail.operationCount || 0,
                        '수술보험가능성': detail.asdInOperation || '',
                        
                        // 검사 정보
                        '검사내역': detail.asdExamination || '',
                        '검사횟수': detail.examinationCount || 0,
                        
                        // 보험 정보
                        '보험진단가능성': basic.asbInDisease || '',
                        
                        // 메타 정보
                        '데이터소스': this.mapDataSource(apiName),
                        'date:수집일시:start': metadata.collectionTimestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
                        'date:수집일시:is_datetime': 0
                    };
                    
                    // 빈 레코드는 제외 (질병코드가 있는 것만)
                    if (record['질병코드']) {
                        records.push(record);
                        console.log(`  ✅ ${recordId}: ${record['질병명']} (${record['병원명']})`);
                    }
                });
            }
        });

        console.log(`총 ${records.length}개의 진료기록 추출 완료`);
        return records;
    }

    // 데이터 소스 매핑
    getDataSourceCode(apiName) {
        const mapping = {
            '집계_질병미보유자': 'AGG_NON',
            '집계_질병보유자': 'AGG_SIC',
            '기본분석_건강보험': 'BAS_HEA',
            '기본분석_일반': 'BAS_GEN',
            'PDF보고서': 'PDF_REP'
        };
        return mapping[apiName] || 'UNK';
    }

    mapDataSource(apiName) {
        const mapping = {
            '집계_질병미보유자': '집계_질병미보유',
            '집계_질병보유자': '집계_질병보유', 
            '기본분석_건강보험': '기본분석_건강보험',
            '기본분석_일반': '기본분석_일반'
        };
        return mapping[apiName] || '기타';
    }

    mapDepartment(department) {
        if (!department) return '기타';
        
        const mapping = {
            '내과': '내과',
            '외과': '외과', 
            '정형외과': '정형외과',
            '신경외과': '신경외과',
            '산부인과': '산부인과',
            '소아과': '소아과'
        };
        
        // 부분 매칭
        for (const [key, value] of Object.entries(mapping)) {
            if (department.includes(key)) {
                return value;
            }
        }
        
        return '기타';
    }

    mapTreatType(treatType) {
        if (!treatType) return '외래';
        
        const mapping = {
            '외래': '외래',
            '입원': '입원',
            '응급': '응급'
        };
        
        return mapping[treatType] || '외래';
    }

    // 진료기록을 노션에 일괄 추가
    async addRecordsToNotion(records) {
        try {
            console.log(`\n노션에 ${records.length}개 진료기록 추가 중...`);
            
            // 실제 노션 API를 통한 레코드 생성은 여기서 구현
            // 현재는 구조만 준비
            
            const result = {
                success: true,
                recordCount: records.length,
                records: records,
                notionUrl: `https://www.notion.so/${this.detailDatabaseId.replace(/-/g, '')}`
            };
            
            return result;
            
        } catch (error) {
            console.error('노션 진료기록 추가 실패:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Make.com용 진료기록 페이로드 생성
    generateDetailedPayload(jsonData, jobId) {
        const records = this.extractMedicalRecords(jsonData);
        
        return {
            timestamp: new Date().toISOString(),
            source: 'insuniverse-automation',
            type: 'detailed_medical_records',
            jobId: jobId,
            
            // 마스터 정보
            master: {
                customerName: jsonData.customer?.name,
                analysisId: jsonData.metadata?.analysisId,
                totalRecords: records.length
            },
            
            // 개별 진료기록들
            medical_records: records,
            
            // 노션 데이터베이스 정보
            notion: {
                detail_database_id: this.detailDatabaseId,
                master_database_id: this.masterDatabaseId
            },
            
            // 통계 요약
            summary: {
                departmentCount: this.countByField(records, '진료과'),
                treatTypeCount: this.countByField(records, '진료유형'),
                dataSourceCount: this.countByField(records, '데이터소스'),
                totalVisitDays: records.reduce((sum, r) => sum + (r['방문일수'] || 0), 0),
                totalOperations: records.reduce((sum, r) => sum + (r['수술횟수'] || 0), 0)
            }
        };
    }

    countByField(records, fieldName) {
        const counts = {};
        records.forEach(record => {
            const value = record[fieldName] || '미분류';
            counts[value] = (counts[value] || 0) + 1;
        });
        return counts;
    }
}

// 테스트 실행
async function testDetailedRecordsProcessor() {
    try {
        // 저장된 JSON 데이터 읽기
        const jsonFile = './data/analysis_김지훈_10106_2025-09-12.json';
        const jsonData = JSON.parse(await fs.readFile(jsonFile, 'utf8'));
        
        const processor = new DetailedRecordsProcessor();
        
        // 진료기록 추출
        const records = processor.extractMedicalRecords(jsonData);
        
        // Make.com용 상세 페이로드 생성
        const detailedPayload = processor.generateDetailedPayload(jsonData, 12345);
        
        console.log('\n=== 추출된 진료기록 요약 ===');
        console.log(`총 레코드 수: ${records.length}`);
        console.log('진료과별 분포:', detailedPayload.summary.departmentCount);
        console.log('진료유형별 분포:', detailedPayload.summary.treatTypeCount);
        console.log('데이터소스별 분포:', detailedPayload.summary.dataSourceCount);
        console.log(`총 방문일수: ${detailedPayload.summary.totalVisitDays}일`);
        console.log(`총 수술횟수: ${detailedPayload.summary.totalOperations}회`);
        
        // 상세 페이로드 저장
        await fs.writeFile('./data/detailed-payload-example.json', JSON.stringify(detailedPayload, null, 2));
        console.log('\n💾 상세 페이로드 저장됨: ./data/detailed-payload-example.json');
        
        return detailedPayload;
        
    } catch (error) {
        console.error('테스트 실패:', error.message);
    }
}

if (require.main === module) {
    testDetailedRecordsProcessor();
}

module.exports = DetailedRecordsProcessor;