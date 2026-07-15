# HearMe2nite v1.0 STEP5.10.10

## STEP5.10.10 — 사용자 설명서 2.0 / 릴리스 정보 자동 동기화

- 최신 기능 기준의 앱 내 사용자 설명서 전면 개편
- 나의 루틴, 테마, 기록실, 데이터 관리 안내 추가
- `js/release-info.js` 단일 소스로 홈 버전, 브라우저 제목, 설명서 업데이트, QA 버전 동기화
- QA `RELEASE_SYNC` 검사 추가

상세 사용법은 `docs/USER_GUIDE.md`를 확인하세요.

## 배포

이번 버전은 데이터베이스 경로와 Rules를 변경하지 않았습니다. Hosting 또는 Netlify 전체 소스를 배포하면 됩니다.


## STEP5.10.10 Record deletion safety
- Deleted day records are archived under `rooms/{roomCode}/deletedRecords/{date}` before removal.
- Both Room members can see deletion history; Sub receives an unread notice.
- Dom/Owner can restore the archived record within 30 days.
- Deploy `database.rules.json` together with the web build.
