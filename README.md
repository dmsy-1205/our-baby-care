# HearMe2nite v1.0 STEP5.8.5

초대코드와 Room 가입 보안을 강화한 Full Source입니다.

- 초대코드 transaction 선점
- 재사용 및 동시 사용 차단
- usedByUid / 이메일 검증
- 귀속된 사용자만 Partner 멤버십 생성
- partnerUid 위조 및 추가 Partner 차단

GitHub Actions는 Hosting만 배포합니다. `database.rules.json`은 Firebase Realtime Database Rules에 별도로 게시해야 합니다.


## STEP5.6.4.6.3 RTDB Rules Boolean Hotfix
- Replaced unsupported boolean negation on `newData.child('used').val()` with explicit `=== false` / `=== true` comparisons.
- No application behavior or Firebase path changes.

## STEP5.6.4.6.9

이전 공간 전환 시 기존 멤버십을 다시 저장하지 않도록 수정했습니다. 가입 당시 `joinedAt`과 `inviteCode`를 보존하며 활성 공간 정보만 변경합니다.

## STEP5.6.4.6.5
Realtime Database invite child fields are explicitly declared so normal invite creation is allowed while unknown fields remain blocked.


## STEP5.6.4.6.9

초대 코드 수락 시 RTDB transaction 초기 null 스냅샷으로 인해 정상 코드가 사용 불가로 오판되던 문제를 수정했습니다. 서버 Rules가 보장하는 false→true update 방식으로 귀속하고, 같은 계정의 부분 완료 재시도를 복구합니다.


## STEP5.7.1 — 오늘의 약속 관리 목록형 UI

- 오늘의 약속 팝업에서 홈과 중복되던 대형 입력 카드를 제거
- 관리(Dom)에게만 간결한 한 줄 관리 목록 표시
- 기록(Sub)은 홈 화면의 약속 카드에서 바로 입력하도록 안내
- Firebase 데이터 구조와 권한 로직은 변경하지 않음

## STEP5.6.4.7 — Invite 24H + Version Sync

- 초대코드 유효기간을 Firebase 서버 시간 기준 정확히 24시간으로 고정
- 초대 결과에 유효기간과 만료 예정 시각 표시
- 복사되는 초대문구에도 24시간 및 만료 예정 시각 포함
- 만료 안내 문구를 24시간 기준으로 명확화
- 화면 상단 버전 배지를 `HM_APP_VERSION`과 자동 동기화
- HTML title, QA BOOT, 캐시 버전을 STEP5.6.4.7으로 통일

## STEP5.6.4.7 — Final Security Stable

- Final server-side permission audit completed.
- Firebase Hosting no longer deploys internal Rules, Functions, documentation, backup, archive, or source-map files.
- Removed `js/room.js.bak`.
- No feature or Firebase data-path migration was added in this release.


## STEP5.8.5

- 여섯 가지 테마의 배경·카드·버튼·입력·아이콘·그림자를 서로 다른 분위기로 완성했습니다.
- 모바일 화면에서도 테마 차이를 즉시 확인할 수 있도록 색상 면적과 대비를 강화했습니다.
앱 전체 구성요소를 의미 기반 테마 토큰으로 연결한 테마 엔진 기반 버전입니다.


STEP5.8.5: 개인/공용 테마 동기화와 전환 UX 최종 마무리.
