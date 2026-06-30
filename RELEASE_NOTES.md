# HearMe2nite v0.10.17 Master UID Access Gate

## 목적
MasterOS Platform(hearu2nite)의 승인 사용자만 HearMe2nite 앱에 진입하도록 연결한다.

## 핵심 수정
- 승인 확인 기준을 babyAuth UID가 아니라 masterAuth.currentUser.uid로 변경.
- MasterOS Realtime Database 경로 `userAppAccess/{masterUid}/baby-care-secure` 확인.
- 보조 경로 `appAccessRequests/baby-care-secure/{masterUid}`도 확인.
- 승인 확인 완료 전에는 Home/Room/History 로딩을 시작하지 않음.
- 승인 실패 시 babyAuth/masterAuth 모두 로그아웃 후 권한 없음 화면 표시.

## 통과 조건
- userAppAccess: `status === approved` 그리고 `active === true`
- appAccessRequests fallback: `status === approved`

## 변경하지 않은 것
- Room 구조
- History 저장 구조
- AutoSave
- Chat
- Firebase 데이터 key
