HearMe2nite RC2.10.5 Anniversary Popup UX

기준 파일:
- RC2.10.4 Anniversary Layer Hotfix

작업 내용:
1. 기념일 설정 팝업 UX 개선
2. 처음 만난 날 영역 카드화
3. 둘만의 기념일 추가 영역 카드화
4. 아이콘 선택 UI 추가
   - ❤️ 🎂 ✈️ 💍 🎉 📷 🌸
5. 등록된 기념일 목록 카드형 개선
6. 모바일/Fold/Tablet/Desktop 대응 CSS 보강

안전 원칙:
- History Render 수정 없음
- displayHistory() 수정 없음
- Firebase Auth 수정 없음
- Room 구조 수정 없음
- rooms/{roomCode}/days 구조 수정 없음
- 기념일 저장 경로 유지: rooms/{roomCode}/meta/firstMetDate, rooms/{roomCode}/meta/anniversaries

확인 필요:
- 기록실 > 우리의 기념일 > 설정 클릭
- 팝업이 기록실 위에 표시되는지 확인
- 아이콘 선택 시 선택 표시 확인
- 날짜/이름 입력 후 추가 확인
- 삭제 확인
