# v0.10.18 QA Checklist

- [ ] 기존 승인 사용자 로그인 가능
- [ ] 로그인 후 홈 화면 정상 표시
- [ ] Console에 `[Access Diagnostic / Login]` 로그 표시
- [ ] Console에 Master UID 표시
- [ ] Primary Path가 `userAppAccess/{masterUid}/baby-care-secure`로 표시
- [ ] Primary Exists / Primary Data 확인
- [ ] Request Path가 `appAccessRequests/baby-care-secure/{masterUid}`로 표시
- [ ] Final Result가 PASS 또는 NO_ACCESS_RECORD로 표시
- [ ] 권한 없음 화면이 절대 표시되지 않음
