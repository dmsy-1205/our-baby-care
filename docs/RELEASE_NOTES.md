# HearMe2nite v1.0 STEP6.2.1 릴리스 노트

## 사용자 화면 개선

- 기록(Sub)은 `주인의 피드백`과 `오늘의 선물` 작성 화면을 볼 수 없습니다.
- 관리(Dom)가 저장한 피드백은 읽기 전용 카드로 확인할 수 있습니다.
- 관리(Dom)가 저장한 보상·휴식 선택과 메시지도 읽기 전용으로 확인할 수 있습니다.
- 작성된 내용이 없을 때는 빈 상태 안내를 표시합니다.

## 권한 유지

- 작성·수정·삭제 권한은 관리(Dom)에게만 유지됩니다.
- 기록(Sub)은 저장 동작을 실행하지 않으며 읽기만 가능합니다.
- 기존 Firebase 데이터 구조와 기록실 표시 구조는 변경하지 않았습니다.

## Admin Console 2.0 Phase 1 — Secure Foundation

- Replaced the old admin page entry flow with a secure authentication gate.
- The admin shell is created only after `/admins/{uid}` authorization succeeds.
- Added an independent module router, shared sidebar, top bar, loading state, error state, responsive layout, and dark-mode foundation.
- All Phase 1 screens remain read-only; no Firebase data mutation was added.
