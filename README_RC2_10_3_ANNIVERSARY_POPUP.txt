HearMe2nite RC2.10.3 Anniversary Settings Popup

기준:
- RC2.10.2 Safe Anniversary STEP1
- RC2.9.1 정상 History 로딩 구조 유지

수정:
- 기록실 안의 '우리의 기념일' 설정 버튼을 실제 팝업으로 연결
- 처음 만난 날은 팝업 안에서 설정/수정
- 둘만의 기념일 날짜/이름/종류 추가
- 등록된 기념일 삭제 기능 추가
- 기록실 메인 화면은 작은 요약 카드만 유지

저장 경로:
- rooms/{roomCode}/meta/firstMetDate
- rooms/{roomCode}/meta/anniversaries/{anniversaryId}

보호 원칙:
- rooms/{roomCode}/days 기록 구조 변경 없음
- 기존 displayHistory/selectHistoryDate 흐름 변경 없음
- 캘린더/기록/사진 로딩 구조 변경 없음
