# HearMe2nite v1.0 STEP5.6.1.8
## 안전한 삭제 엔진 기반 / 삭제 대상 미리보기

- Cloud Functions 2세대 callable 함수 `previewDataDeletion` 추가
- Node.js 22 런타임 사용
- 관리자 UID를 서버에서 재검증
- 요청 UID, 요청 유형, 상태를 서버에서 재검증
- 승인된 요청에서만 실제 실행 가능 상태로 표시
- Realtime Database / Authentication / Storage 삭제 후보를 미리보기로 계산
- `dataDeletionPreviews/{requestId}`에 미리보기 감사 기록 저장
- 이번 STEP은 dry-run 전용이며 실제 데이터는 절대 삭제하지 않음

## 배포

최초 한 번 프로젝트 루트 터미널에서:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Hosting은 기존 GitHub Actions Run workflow 방식으로 배포합니다.

## 다음 단계

미리보기 결과가 실제 Firebase 구조와 일치하는지 검증한 후 `leave_room` 유형부터 실제 처리 엔진을 별도 STEP으로 구현합니다.
