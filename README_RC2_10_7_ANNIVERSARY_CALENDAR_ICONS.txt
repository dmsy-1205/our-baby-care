HearMe2nite RC2.10.7 Anniversary Calendar Icons

목표
- 기념일이 있는 날짜에 캘린더 아이콘 표시
- History Render / displayHistory() / History Load 수정 금지 원칙 유지

적용 내용
1. anniversary.js 독립 후처리 함수 추가
   - hmRenderAnniversaryCalendarMarkers()
   - 캘린더 렌더링 완료 후 DOM에 작은 기념일 아이콘만 추가

2. 표시 대상
   - 처음 만난 날: ❤️
   - 직접 등록한 기념일: 선택한 아이콘
   - 자동 D+100 / D+200 / D+300 / D+365 / D+500: ❤️ 또는 💍

3. 저장 구조 변경 없음
   - rooms/{roomCode}/meta/firstMetDate
   - rooms/{roomCode}/meta/anniversaries
   - days/history 데이터 변경 없음

4. 안전장치
   - 기존 기록 아이콘(📷 🎯 ☁️)과 분리 표시
   - 기념일만 있는 날짜도 작은 아이콘 표시
   - 날짜 클릭 기능은 이번 버전에서 확장하지 않음

변경 금지 준수
- Firebase 구조 변경 없음
- History 저장 구조 변경 없음
- AutoSave 변경 없음
- displayHistory() 직접 수정 없음
- renderCalendar() 직접 수정 없음
