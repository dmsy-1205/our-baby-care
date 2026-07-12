# HearMe2nite v1.0 STEP5.6.1.8.1 안정성 복구 보고서

## 기준
- STEP5.6.1.7.1 안정 버전에서 재시작
- STEP5.6.1.8 삭제 미리보기 Cloud Functions 및 관련 클라이언트 코드는 포함하지 않음

## 수정 내용
1. `loadMyRoomList()`가 비동기 처리 중 로그아웃·계정 전환될 때 `currentUser.uid`를 다시 읽지 않도록 UID를 고정 캡처함.
2. Room 목록 조회의 각 비동기 단계 후 현재 로그인 UID가 동일한지 재확인함.
3. `canCurrentUserAccessRoom()`과 `hmRequireRoomAccess()`에 로그인 세션 변경 방지 가드를 추가함.
4. `connectAndListenFirebase()`가 권한 확인·역할 조회 중 계정이 바뀌면 리스너 연결을 중단하고 기존 리스너를 정리함.
5. Firebase Database 구조, Rules, Auth, Room 저장 경로는 변경하지 않음.
6. 화면 및 캐시 버전을 STEP5.6.1.8.1로 통일함.

## 해결 대상
- `Cannot read properties of null (reading 'uid')`
- 로그아웃 또는 계정 전환 직후 이전 Room 리스너가 연결되며 발생할 수 있는 `permission_denied`

## 제외 사항
- 브라우저 확장 프로그램의 message port 오류
- 실제 데이터 불일치로 인한 권한 문제
- 모든 모달의 전역 접근성 리팩터링
- 실제 데이터 삭제 실행 기능
