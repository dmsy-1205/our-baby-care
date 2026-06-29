HearMe2nite RC2.10 STEP1 - History Anniversary

기준 파일: RC2.9.1 Mission Delete Hotfix

적용 내용:
- 기록실 상단 통계 카드를 하단 리포트 영역으로 이동
- 기록실 제목 아래 안내 문구 추가
- 처음 만난 날 저장 UI 추가
- 처음 만난 날 기준 D+ 자동 계산
- 캘린더 날짜 클릭 시 선택한 날짜 기준으로 D+ 표시
- 100일/200일/300일/365일 등 주요 기념일 캘린더 표시
- 기록 상세 팝업에 해당 날짜의 기념일 정보 표시

DB 추가 경로:
- rooms/{roomCode}/meta/anniversaryStartDate

기존 구조 유지:
- Firebase Auth 변경 없음
- Room / roomMembers 구조 변경 없음
- days 저장 구조 변경 없음
- AutoSave 구조 변경 없음
- Chat 구조 변경 없음
