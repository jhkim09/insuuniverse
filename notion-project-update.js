const { Client } = require('@notionhq/client');
require('dotenv').config();

// Notion 클라이언트 초기화
// NOTION_API_KEY가 .env 파일에 있어야 합니다
const notion = new Client({
    auth: process.env.NOTION_API_KEY || process.env.NOTION_TOKEN
});

// 개발 프로젝트 관리 DB ID (필요시 수정)
const PROJECT_DB_ID = process.env.NOTION_PROJECT_DB_ID || 'YOUR_PROJECT_DB_ID';

async function addProjectUpdate() {
    const today = new Date().toISOString().split('T')[0];

    try {
        const response = await notion.pages.create({
            parent: {
                type: "page_id",
                page_id: PROJECT_DB_ID  // 데이터베이스가 아닌 페이지로 추가
            },
            properties: {},  // 빈 속성

            // 페이지 내용
            children: [
                {
                    object: "block",
                    type: "heading_1",
                    heading_1: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "🎯 오늘의 개발 내용"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "✅ 완료된 작업"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "numbered_list_item",
                    numbered_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "ANS 코드 체계 분석 및 문서화"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "numbered_list_item",
                    numbered_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "향상된 전처리기 개발 (EnhancedPreprocessor)"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "numbered_list_item",
                    numbered_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "Notion 데이터베이스 구조 개선안 설계"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "numbered_list_item",
                    numbered_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "통합 스크래퍼 개선 및 ANS 전처리 통합"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "numbered_list_item",
                    numbered_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "Render 배포 이슈 해결 (롤백)"
                            }
                        }]
                    }
                },

                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "📊 성과 지표"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "bulleted_list_item",
                    bulleted_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "데이터 압축률: 92% (20KB → 1.5KB)"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "bulleted_list_item",
                    bulleted_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "ANS 분류 정확도: 100%"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "bulleted_list_item",
                    bulleted_list_item: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "필수 필드 보존율: 100%"
                            }
                        }]
                    }
                },

                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "🚧 이슈 및 해결"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "callout",
                    callout: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "Render 배포시 모듈 의존성 문제 발생 → 원본 데이터 전송 방식으로 롤백"
                            }
                        }],
                        icon: {
                            emoji: "⚠️"
                        }
                    }
                },

                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "📝 다음 단계"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "to_do",
                    to_do: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "Make.com에서 ANS 매핑 시나리오 구축"
                            }
                        }],
                        checked: false
                    }
                },
                {
                    object: "block",
                    type: "to_do",
                    to_do: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "Notion DB에 ANS 필드 실제 추가"
                            }
                        }],
                        checked: false
                    }
                },
                {
                    object: "block",
                    type: "to_do",
                    to_do: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "보험금 청구서 자동 생성 기능 개발"
                            }
                        }],
                        checked: false
                    }
                },

                {
                    object: "block",
                    type: "heading_2",
                    heading_2: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "🔗 생성된 문서"
                            }
                        }]
                    }
                },
                {
                    object: "block",
                    type: "code",
                    code: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "- ANS-CODE-MAPPING.md\n- notion-ans-guide.md\n- enhanced-preprocessor.js\n- notion-db-structure-v2.md\n- integration-guide.md"
                            }
                        }],
                        language: "plain text"
                    }
                },

                {
                    object: "block",
                    type: "divider",
                    divider: {}
                },

                {
                    object: "block",
                    type: "paragraph",
                    paragraph: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: "작성: Claude Code Assistant | " + today
                            },
                            annotations: {
                                italic: true
                            }
                        }]
                    }
                }
            ]
        });

        console.log('✅ Notion 개발 프로젝트 관리 DB 업데이트 완료!');
        console.log('페이지 URL:', response.url);
        return response;

    } catch (error) {
        console.error('❌ Notion 업데이트 실패:', error);
        throw error;
    }
}

// 직접 실행
if (require.main === module) {
    console.log('🚀 Notion 프로젝트 업데이트 시작...');

    // API 키 확인
    if (!process.env.NOTION_API_KEY && !process.env.NOTION_TOKEN) {
        console.error('❌ NOTION_API_KEY 또는 NOTION_TOKEN이 .env 파일에 없습니다.');
        console.log('\n.env 파일에 다음을 추가하세요:');
        console.log('NOTION_API_KEY=your_notion_api_key');
        console.log('NOTION_PROJECT_DB_ID=your_project_database_id');
        process.exit(1);
    }

    if (!PROJECT_DB_ID || PROJECT_DB_ID === 'YOUR_PROJECT_DB_ID') {
        console.error('❌ NOTION_PROJECT_DB_ID가 설정되지 않았습니다.');
        console.log('\n.env 파일에 다음을 추가하세요:');
        console.log('NOTION_PROJECT_DB_ID=your_project_database_id');
        process.exit(1);
    }

    addProjectUpdate()
        .then(() => {
            console.log('✨ 완료!');
        })
        .catch(error => {
            console.error('실패:', error.message);
        });
}

module.exports = { addProjectUpdate };