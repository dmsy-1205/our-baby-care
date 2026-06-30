HearMe2nite RC2.10.4 HOTFIX

문제:
- 기록실 안에서 기념일 설정 버튼을 누르면 설정 팝업이 열리지만,
  기존 기록실 팝업 레이어 뒤쪽에 표시되는 문제 발생.

원인:
- history-panel-overlay는 기존 공통 모달 보정 CSS에서 z-index: 9999 !important 적용.
- anniversary-settings-overlay는 z-index: 60으로 설정되어 있어 기록실 팝업 뒤에 깔림.

수정:
- css/style.css 하단에 RC2.10.4 HOTFIX CSS 추가.
- body > .anniversary-settings-overlay를 z-index: 10050 !important로 보정.
- anniversary-settings-modal은 z-index: 10051 !important로 보정.
- displayHistory(), History Render, Firebase, 저장 구조는 수정하지 않음.

QA:
- 기록실 열기
- 우리의 기념일 카드 설정 클릭
- 기념일 설정 팝업이 기록실 팝업보다 앞에 표시되는지 확인
- 닫기 버튼 정상 동작 확인
- 바깥 영역 클릭 닫기 확인
- Desktop / Tablet / Fold / Mobile 중앙 표시 확인
