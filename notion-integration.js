const fs = require('fs').promises;
require('dotenv').config();

class NotionIntegration {
    constructor() {
        this.databaseId = '8b0f4a5e-29e4-4534-b7e2-68288a64adcd'; // 생성된 데이터베이스 ID
    }

    // JSON 데이터를 노션 형식으로 변환
    parseInsuniverseData(jsonData) {
        const customer = jsonData.customer || {};
        const metadata = jsonData.metadata || {};
        const apis = jsonData.apis || {};

        // 각 API별 데이터 개수 계산
        const counts = {
            질병미보유자: apis['집계_질병미보유자']?.summary?.itemCount || 0,
            질병보유자: apis['집계_질병보유자']?.summary?.itemCount || 0,
            건강보험항목: apis['기본분석_건강보험']?.summary?.itemCount || 0,
            일반분석항목: apis['기본분석_일반']?.summary?.itemCount || 0
        };

        // 주요 질병 코드 추출
        const diseases = [];
        if (apis['기본분석_건강보험']?.data?.list) {
            apis['기본분석_건강보험'].data.list.forEach(item => {
                if (item.basic?.asbDiseaseCode) {
                    diseases.push(`${item.basic.asbDiseaseCode}(${item.basic.asbDiseaseName})`);
                }
            });
        }

        // 보험 진단 가능성 요약
        const insuranceInsights = [];
        Object.values(apis).forEach(api => {
            if (api.data?.list) {
                api.data.list.forEach(item => {
                    if (item.basic?.asbInDisease) {
                        insuranceInsights.push(item.basic.asbInDisease);
                    }
                    if (item.detail?.asdInOperation) {
                        insuranceInsights.push(item.detail.asdInOperation);
                    }
                });
            }
        });

        // 분석 완료일 파싱
        let analysisCompletedDate = null;
        if (customer.completedAt) {
            const dateMatch = customer.completedAt.match(/(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                analysisCompletedDate = dateMatch[1];
            }
        }

        return {
            고객명: customer.name || '',
            전화번호: customer.phone || '',
            생년월일: customer.birth || '',
            분석ID: metadata.analysisId || 0,
            분석상태: customer.state === '분석완료' ? '분석완료' : customer.state || '분석중',
            'date:분석완료일:start': analysisCompletedDate,
            'date:분석완료일:is_datetime': 0,
            'date:수집일시:start': metadata.collectionTimestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
            'date:수집일시:is_datetime': 0,
            질병미보유자수: counts.질병미보유자,
            질병보유자수: counts.질병보유자,
            건강보험항목수: counts.건강보험항목,
            일반분석항목수: counts.일반분석항목,
            주요질병코드: diseases.slice(0, 3).join(', '), // 처음 3개만
            보험진단가능성: insuranceInsights.slice(0, 2).join(' / '), // 처음 2개만
            'PDF보고서': apis['PDF보고서']?.data ? '__YES__' : '__NO__',
            처리상태: metadata.successCount === metadata.totalAPIs ? '처리완료' : '오류'
        };
    }

    // 노션에 데이터 추가
    async addToNotion(jsonData, makeJobId = null) {
        try {
            const notionData = this.parseInsuniverseData(jsonData);
            
            // Make 작업 ID 추가
            if (makeJobId) {
                notionData['Make작업ID'] = makeJobId;
            }

            console.log('노션에 추가할 데이터:', notionData);

            // 실제 노션 API 호출은 여기서 구현
            // MCP 도구를 사용해서 페이지 생성
            
            return {
                success: true,
                notionData: notionData,
                message: '노션 데이터 변환 완료'
            };

        } catch (error) {
            console.error('노션 데이터 변환 실패:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Make.com에서 사용할 데이터 구조 생성
    generateMakeComPayload(jsonData, jobId) {
        const notionData = this.parseInsuniverseData(jsonData);
        
        return {
            // 기본 정보
            timestamp: new Date().toISOString(),
            source: 'insuniverse-automation',
            jobId: jobId,
            
            // 노션 입력용 데이터
            notion: {
                database_id: this.databaseId,
                properties: notionData
            },
            
            // 원본 데이터 (필요시 추가 처리용)
            raw_data: {
                customer: jsonData.customer,
                metadata: jsonData.metadata,
                api_summary: Object.fromEntries(
                    Object.entries(jsonData.apis).map(([key, api]) => [
                        key, 
                        {
                            status: api.status,
                            itemCount: api.summary?.itemCount || 0,
                            description: api.description
                        }
                    ])
                )
            },
            
            // 세부 분석 데이터 (선택사항)
            detailed_analysis: {
                diseases: this.extractDiseases(jsonData),
                operations: this.extractOperations(jsonData),
                insurance_insights: this.extractInsuranceInsights(jsonData)
            }
        };
    }

    extractDiseases(jsonData) {
        const diseases = [];
        Object.values(jsonData.apis || {}).forEach(api => {
            if (api.data?.list) {
                api.data.list.forEach(item => {
                    if (item.basic?.asbDiseaseCode && item.basic?.asbDiseaseName) {
                        diseases.push({
                            code: item.basic.asbDiseaseCode,
                            name: item.basic.asbDiseaseName,
                            treatStart: item.basic.asbTreatStartDate,
                            treatEnd: item.basic.asbTreatEndDate,
                            hospital: item.basic.asbHospitalName,
                            department: item.basic.asbDepartment
                        });
                    }
                });
            }
        });
        return diseases;
    }

    extractOperations(jsonData) {
        const operations = [];
        Object.values(jsonData.apis || {}).forEach(api => {
            if (api.data?.list) {
                api.data.list.forEach(item => {
                    if (item.detail?.asdOperation) {
                        operations.push({
                            operation: item.detail.asdOperation,
                            diseaseCode: item.basic?.asbDiseaseCode,
                            diseaseName: item.basic?.asbDiseaseName,
                            date: item.basic?.asbTreatStartDate
                        });
                    }
                });
            }
        });
        return operations;
    }

    extractInsuranceInsights(jsonData) {
        const insights = [];
        Object.values(jsonData.apis || {}).forEach(api => {
            if (api.data?.list) {
                api.data.list.forEach(item => {
                    if (item.basic?.asbInDisease) {
                        insights.push({
                            type: 'diagnosis',
                            insight: item.basic.asbInDisease,
                            diseaseCode: item.basic.asbDiseaseCode
                        });
                    }
                    if (item.detail?.asdInOperation) {
                        insights.push({
                            type: 'operation',
                            insight: item.detail.asdInOperation,
                            operation: item.detail.asdOperation
                        });
                    }
                });
            }
        });
        return insights;
    }
}

// 테스트 실행
async function testNotionIntegration() {
    try {
        // 저장된 JSON 데이터 읽기
        const jsonFile = './data/analysis_김지훈_10106_2025-09-12.json';
        const jsonData = JSON.parse(await fs.readFile(jsonFile, 'utf8'));
        
        const notion = new NotionIntegration();
        
        // 노션 형식으로 변환
        const result = notion.addToNotion(jsonData, 12345);
        console.log('노션 변환 결과:', result);
        
        // Make.com용 페이로드 생성
        const makePayload = notion.generateMakeComPayload(jsonData, 12345);
        console.log('\nMake.com 페이로드 구조:');
        console.log('- 기본 정보:', Object.keys(makePayload));
        console.log('- 노션 속성:', Object.keys(makePayload.notion.properties));
        console.log('- 세부 분석:', Object.keys(makePayload.detailed_analysis));
        
        // Make.com 페이로드 파일로 저장
        await fs.writeFile('./data/make-payload-example.json', JSON.stringify(makePayload, null, 2));
        console.log('\n💾 Make.com 페이로드 예시 저장됨: ./data/make-payload-example.json');
        
        return makePayload;
        
    } catch (error) {
        console.error('테스트 실패:', error.message);
    }
}

if (require.main === module) {
    testNotionIntegration();
}

module.exports = NotionIntegration;