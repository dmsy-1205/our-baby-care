HearMe2nite RC2.10.6 Anniversary Auto D-Day

목표:
- 처음 만난 날 저장 시 D+100 / D+200 / D+300 / D+365 / D+500 자동 계산 표시

안전 원칙:
- History Render 수정 없음
- displayHistory() 수정 없음
- History Load 수정 없음
- Firebase rooms/{roomCode}/days 구조 수정 없음
- 자동 D+ 기념일은 DB에 추가 저장하지 않음
- rooms/{roomCode}/meta/firstMetDate 기준으로 화면에서 계산만 수행

변경 파일:
- js/anniversary.js
- css/style.css

QA:
1. 기록실 열기
2. 우리의 기념일 설정 클릭
3. 처음 만난 날 저장
4. 자동 계산 기념일 카드에 D+100 / D+200 / D+300 / D+365 / D+500 표시 확인
5. 기록실 기념일 카드 하단에 자동 D+ 미리보기 표시 확인
6. 기존 기록 불러오기 정상 확인
7. 직접 등록 기념일 추가/삭제 정상 확인
