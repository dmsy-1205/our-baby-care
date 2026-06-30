# v0.10.19 QA Checklist

- 기존 승인 사용자 로그인 가능
- Console에 `[Access Diagnostic / Login]` 출력
- 결과가 PASS / PASS_BY_EMAIL_USER_ACCESS / PASS_BY_EMAIL_REQUEST 중 하나인지 확인
- NO_ACCESS_RECORD이면 Full diagnostic object에서 masterEmail, matchedUserUids, requestsByEmail 확인
- Room / History / AutoSave / Chat 정상 확인
