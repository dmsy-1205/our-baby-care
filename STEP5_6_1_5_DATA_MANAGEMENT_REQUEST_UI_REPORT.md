# HearMe2nite v1.0 STEP5.6.1.5
## Data Management Request UI Report

작성일: 2026-07-12

### 작업 목적
HearU2nite 동결 이후 HearMe2nite 단일 앱에서 사용자 데이터 처리 요청을 안전하게 접수하고 상태를 확인할 수 있도록 사용자 화면과 요청 데이터 항목을 개선했다.

### 추가된 요청 종류
- `account`: 내 계정 및 개인 정보 삭제
- `leave_room`: 현재 Room 연결 해제
- `delete_room`: Room 전체 데이터 삭제

### 추가 저장 항목
- `requestType`
- `requestTypeLabel`
- `partnerConsentRequired`
- 버전 `v1.0-step5.6.1.5-data-management`

### 화면 개선
- 진행 중인 최신 요청 요약
- 요청 종류 선택 카드
- Room 전체 삭제 별도 경고
- 요청 내역에 요청 종류 및 운영자 답변 표시
- 상태 라벨 정리
- 모바일에서 탭 3개 가로 유지

### 변경하지 않은 영역
- Firebase Authentication
- Room 생성 및 복구
- Realtime Database 경로
- Firebase Rules
- Firebase Storage
- 실제 데이터 삭제
- 관리자 승인 화면
- GitHub Actions 자동배포

### 중요 보안 메모
현재 `rooms/{roomCode}` 쓰기 권한은 Room 구성원에게 넓게 허용되는 기존 Rules 구조다. 이번 STEP은 Rules를 변경하지 않았다. 관리자 화면을 개발하기 전에 삭제 요청 상태와 관리자 메모를 일반 사용자가 임의 변경할 수 없도록 별도 운영 요청 경로 또는 Rules 분리를 설계해야 한다.

### 다음 STEP 제안
STEP5.6.1.6에서 HearMe2nite 운영자 전용 요청 관리 화면과 관리자 전용 Firebase 경로/Rules를 설계한다. 실제 삭제 엔진은 그 이후 단계로 분리한다.
