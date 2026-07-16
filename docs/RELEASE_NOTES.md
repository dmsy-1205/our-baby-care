# HearMe2nite v1.0 STEP6.1.9 릴리스 노트

배포일: 2026.07.16  
단계: Beta Stabilization

## 주요 변경

- 사용자 가이드의 가로 스크롤 탭을 아이콘 메뉴 그리드로 교체
- 모바일 3열, 태블릿 4열, PC 6열로 모든 메뉴를 한 화면에 표시
- 실제 설명 화면과 연결되지 않던 메뉴를 제거하고 나의 루틴·테마·데이터 안내를 연결
- 검색, Q&A, 업데이트 안내와 기존 가이드 본문은 그대로 유지
- 관리자 콘솔은 STEP6.1.8 상태로 동결하고 이번 릴리스에서 수정하지 않음
- 프로젝트 루트의 중복 STEP/핫픽스 Markdown 문서를 삭제

## 문서 유지 정책

프로젝트에는 아래 핵심 문서만 유지합니다.

- `README.md`
- `docs/USER_GUIDE.md`
- `docs/RELEASE_NOTES.md`
- `docs/PROJECT_HANDOVER.md`

새 단계마다 별도 QA Markdown 파일을 만들지 않고, 필요한 검증 내용은 최신 릴리스 노트 또는 프로젝트 인수인계 문서에 통합합니다.

## 배포 안내

Firebase Database Rules 변경은 없습니다. 전체 Hosting 소스만 배포합니다.
