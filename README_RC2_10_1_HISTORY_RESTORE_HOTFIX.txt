HearMe2nite RC2.10.1 History Restore Hotfix

수정 목적:
- RC2.10 타임라인 기능 추가 후 기록실에서 기존 저장 기록이 정상 표시되지 않는 문제 복구

수정 내용:
- history.js displayHistory() 내부의 customEvents 참조 누락 보완
- 기존 rooms/{roomCode}/days/{date} 저장 경로 변경 없음
- 기존 AutoSave / Room / Role / Firebase Rules 변경 없음
- 기념일/타임라인 기능 유지

검수 포인트:
1. 기존 계정으로 로그인
2. 기존 방 입장
3. 기록실 열기
4. 저장된 날짜가 캘린더에 표시되는지 확인
5. 날짜 클릭 시 기록 상세 카드가 뜨는지 확인
6. 기념일 표시가 같이 나오는지 확인
