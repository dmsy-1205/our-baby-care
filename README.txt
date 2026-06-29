HearMe2nite RC2 v2.8.0 STEP7 - release-candidate-qa

기준: RC2.7 최종 안정화 QA 흐름 유지
변경: popup.js, auth.js, room.js, daily.js, mission.js, history.js, chat.js, autosave.js, qa.js, motion.js 분리
보호: Firebase 구조 / Room 구조 / DB Key / AutoSave 저장 구조 변경 없음
검수: 각 STEP ZIP 별도 보관 후 문제 발생 시 이전 ZIP으로 복구 가능


RC2 v2.8.1 Mission UX Patch
- 오늘 미션 각 행 오른쪽 삭제 버튼 추가
- 관리(Dom)만 삭제 가능, 기록(Sub)은 체크만 가능
- 삭제 시 해당 미션 텍스트와 체크 상태를 함께 초기화
