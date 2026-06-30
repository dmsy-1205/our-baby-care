# HearMe2nite v0.10.15 Access Gate Enforced

- MasterOS Realtime Database `userAppAccess/{uid}/baby-care-secure` 승인 확인을 실제 차단으로 전환했습니다.
- `status: approved` 그리고 `active: true`인 사용자만 HearMe2nite 앱이 실행됩니다.
- 승인되지 않은 사용자는 안내 화면과 MasterOS 이동 버튼을 표시합니다.
- 로그인 성공 직후뿐 아니라 새로고침/자동 로그인 상태에서도 승인 여부를 재확인합니다.
- Firebase/Auth/Room/History/AutoSave/DB key 구조는 변경하지 않았습니다.
