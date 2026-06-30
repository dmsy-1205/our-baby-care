# HearMe2nite v0.10.18 Access Diagnostic Only

## 목적
기존 사용자가 절대 차단되지 않도록 하면서 MasterOS 승인 데이터 연결 상태를 진단합니다.

## 변경 사항
- MasterOS Realtime Database `userAppAccess/{masterUid}/baby-care-secure` 상세 진단 로그 출력
- 보조 경로 `appAccessRequests/baby-care-secure/{masterUid}` 상세 진단 로그 출력
- 로그인/자동 로그인 흐름에서 승인 상태를 확인하지만 차단하지 않음
- 기존 Room / History / AutoSave / Chat 데이터 구조 변경 없음

## 확인 방법
브라우저 개발자도구 Console에서 `[Access Diagnostic / Login]` 또는 `[Access Diagnostic / Session]` 로그를 확인합니다.
