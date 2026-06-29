HearMe2nite RC2 v2.9.1 Mission Delete Button Hotfix

수정 내용:
- 오늘의 미션 각 줄 오른쪽에 X 삭제 버튼이 실제로 보이도록 보강
- 체크박스 / 미션 입력칸 / 삭제 버튼 3열 구조 고정
- 기존 index.html에 버튼이 누락되어도 js/mission.js에서 런타임 자동 주입
- 관리(Dom)만 삭제 가능, 기록(Sub)은 삭제 버튼 비활성화
- Firebase / Room / DB Key / AutoSave 구조 변경 없음

검수 포인트:
1. 오늘의 미션 팝업 열기
2. 각 미션 줄 오른쪽 X 버튼 확인
3. X 클릭 시 해당 줄의 글자와 체크만 초기화되는지 확인
4. 기록(Sub) 계정에서는 X 버튼이 비활성화되는지 확인
