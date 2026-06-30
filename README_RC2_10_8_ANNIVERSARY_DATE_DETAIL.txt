HearMe2nite RC2.10.8 Anniversary Date Detail

목표
- 캘린더 날짜 클릭 시 기존 기록 카드와 해당 날짜의 기념일 정보를 함께 표시한다.

적용 내용
- History Render / displayHistory 원본 파일 직접 수정 없음
- anniversary.js에서 displayHistory/selectHistoryDate/openHistoryPanelModal을 안전 래핑
- 기념일이 있는 날짜는 기록이 없어도 클릭 가능하게 DOM 후처리
- 선택 날짜의 기록 카드 아래에 기념일 상세 카드 append
- 처음 만난 날 기준 D-day도 함께 표시

변경 금지 준수
- Firebase 구조 변경 없음
- Room 구조 변경 없음
- History 저장 구조 변경 없음
- AutoSave 변경 없음
- displayHistory 원본 구현 수정 없음
