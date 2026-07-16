# STEP6.1.2 Admin Session Hotfix QA

- 관리자 홈의 운영 콘솔 버튼으로 admin.html 이동
- 로그인 관리자 계정의 currentUser 즉시 감지
- admins/{uid} === true 권한 확인
- 권한 조회 10초 초과 시 화면 오류 표시
- 권한 없음 및 permission_denied 화면 표시
- 관리자 확인 성공 시 Dashboard 표시
- 일반 사용자는 관리자 콘솔 접근 차단
- 기존 사용자 앱, Room, History, Delete/Restore 데이터 경로 변경 없음
