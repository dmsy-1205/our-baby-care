# v0.10.15 QA Checklist

1. 승인된 기존 사용자 5명이 정상 로그인되는지 확인
2. `userAppAccess/{UID}/baby-care-secure/status`가 `approved`인지 확인
3. `userAppAccess/{UID}/baby-care-secure/active`가 `true`인지 확인
4. 미승인 계정 로그인 시 앱 화면 대신 권한 없음 화면이 표시되는지 확인
5. 새로고침 후에도 승인 사용자는 앱 유지, 미승인 사용자는 차단되는지 확인
6. 방 생성/초대코드/기록실/채팅/자동저장이 기존처럼 동작하는지 확인
