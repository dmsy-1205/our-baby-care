# HearMe2nite 프로젝트 인수인계

## 현재 기준
- 버전: HearMe2nite v1.0 STEP5.6.4.1.1
- 단일 앱 구조: 사용자 앱 + 관리자 모드 + 데이터 관리
- HearU2nite 의존성 없음
- GitHub Full Source만 공식 기준으로 사용

## 필수 원칙
1. 기존 프로젝트를 다시 만들지 않는다.
2. 기존 기능을 깨뜨리지 않는다.
3. 모든 배포본은 Full Source로 제공한다.
4. 앱 내부 버전을 매 릴리스마다 갱신한다.
5. 성능, 안정성, 유지보수성을 기능 추가보다 우선한다.

## 현재 주요 기능
- 이메일 인증, 프로필, 닉네임
- Room 생성·입장·초대·복구
- 일일 기록, 캘린더, 기록실, 사진 모아보기
- 카드형 실시간 채팅과 읽지 않은 메시지 표시
- 오늘의 미션 및 요일별 주간 루틴
- 관리와 피드백, 오늘의 선물, 비공개 메모
- 삭제 요청과 관리자 검토 기능

## 보류 기능
- 실제 데이터 삭제 엔진
- 계정·Room·Storage 실제 삭제
- 푸시 알림


# STEP5.6.4.2 추가 사항

- 채팅 신규 저장 데이터에 senderUid/auth.uid 일치 검증 적용
- 채팅 발신 이메일/auth.token.email 일치 검증 적용
- chatReadStatus는 본인 UID 또는 관리자만 갱신 가능
- 기존 rooms 상위 쓰기 구조는 호환성을 위해 유지하고 하위 `.validate`로 보강
- GitHub Actions는 Hosting 전용이며 database.rules.json은 자동 배포되지 않음


# STEP5.6.4.6
주요 입력값 앱/Realtime Database 이중 검증 완료. Rules는 별도 게시 필요.


## STEP5.6.4.6 Security Note
The broad parent write permission under `rooms/{roomCode}` was removed. Rules now grant writes per known child path. Daily record field-level role separation remains deferred because the app saves the whole day with `.set()`.

## STEP5.6.4.7 final security baseline

STEP5.6.4.7 is the security-stable baseline after Room path hardening, day-role separation, invite/Room join protection, 24-hour invite expiry, previous-Room switching compatibility, and Hosting exposure hardening. UI work should start from this Full Source baseline.


## STEP5.10.9 릴리스 관리 원칙

버전·배포일·업데이트 목록은 `js/release-info.js`를 단일 기준으로 사용합니다. 새 기능의 상세 사용 설명은 자동 생성하지 않고 개발 시 사용자 설명서 본문과 함께 검토합니다.


## STEP6.2.0 결정 사항

- 사용자 가이드를 아이콘 메뉴 그리드로 변경했습니다.
- 관리자 콘솔 개발은 STEP6.1.8에서 일시 동결합니다.
- 관리자 콘솔은 다음 세션에서 기존 앱 수정과 분리된 새 계획을 만든 뒤 진행합니다.
- 단계별 QA/핫픽스 Markdown 파일을 더 이상 생성하지 않습니다.


## STEP6.2.0 결정 사항

- Firebase Database Cleanup은 사용자가 수동으로 완료했습니다.
- 사용자 가이드 메뉴 크기와 여백을 축소했습니다.
- 앱 안의 업데이트 내용은 현재 버전에서 사용자에게 필요한 핵심 항목만 최대 8개로 표시하며 과거 목록을 누적하지 않습니다.
- 관리자 콘솔과 Firebase 구조는 변경하지 않았습니다.

## Admin Console 2.0 Phase 1

Secure Foundation completed. The previous `js/admin-console.js` is retained only as legacy reference and is no longer loaded by `admin.html`. The new entry point is `admin/admin-bootstrap.js`, with authorization enforced before rendering the admin shell. Phase 2 should connect read-only Users, Rooms, Requests, Recovery, Audit, Releases, and System modules without adding write actions.
