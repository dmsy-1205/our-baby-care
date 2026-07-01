# HearMe2nite v0.10.20 Safe Enforced Access Gate

- MasterOS 승인 판정 PASS 계정만 앱 실행 허용
- NO_ACCESS_RECORD / BLOCKED 계정은 권한 없음 화면 표시
- READ_ERROR / MASTER_AUTH_NOT_READY는 기존 사용자 보호를 위해 임시 통과
- 승인 확인 기준: MasterOS Realtime DB `userAppAccess` + `appAccessRequests` + email fallback
- Room / History / AutoSave / Chat 저장 구조 변경 없음
