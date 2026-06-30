HearMe2nite RC2.10 Final Candidate

기준
- RC2.10.12 Final Cleanup 기반
- RC2.10 계열 최종 검수용 패키지

검수 전제
- Firebase Auth / Room / RoomMembers / AutoSave / History 저장 구조 변경 없음
- 기존 History Render는 직접 수정하지 않음
- 기념일 기능은 anniversary.js 중심 독립 모듈로 운용

최종 검수 항목
1. 로그인/방 생성/방 참여
2. 기존 기록 불러오기
3. 오늘 기록 저장 및 AutoSave
4. 기록실 캘린더/날짜 클릭
5. 기념일 설정 팝업
6. 처음 만난 날 D+ 자동 계산
7. 직접 기념일 추가/삭제
8. 캘린더 아이콘 표시
9. 날짜 클릭 시 기록 + 기념일 표시
10. Mobile / Fold / Tablet / Desktop QA

배포 판정
- 사용자 QA에서 기존 기록실 로드가 정상이고 콘솔 오류가 없으면 v1.0 Release 후보로 승격 가능
