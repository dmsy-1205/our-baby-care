# HearMe2nite v0.10.19 Email Fallback Diagnostic

## 목적
기존 사용자를 절대 차단하지 않고 MasterOS 승인 연결 문제를 진단한다.

## 변경
- 현재 MasterOS UID 직접 확인
- `userAppAccess/{masterUid}/baby-care-secure` 확인
- `appAccessRequests/baby-care-secure/{masterUid}` 확인
- 현재 로그인 email로 `users` 검색 후 다른 UID의 승인 기록 확인
- 현재 로그인 email로 `appAccessRequests` 검색 후 승인 요청 확인
- PASS_BY_EMAIL_USER_ACCESS / PASS_BY_EMAIL_REQUEST 결과 출력

## 중요
이 버전은 차단하지 않는다. 기존 사용자는 로그인 가능해야 한다.
