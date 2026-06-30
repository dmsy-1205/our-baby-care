HearMe2nite RC2.10.2 Safe Anniversary Step1

기준:
- RC2.9.1 미션 삭제 버튼 핫픽스 정상본에서 다시 시작

수정:
- 기록실 기존 저장 데이터 로딩 구조 보존
- 캘린더를 기록실 상단 주 기능으로 유지
- 통계 카드 하단 이동
- 처음 만난 날 저장 기능 추가
- 날짜 선택 시 D+ 자동 계산 표시
- 기념일 영역은 캘린더 아래/통계 위 독립 패널로 분리

중요:
- rooms/{roomCode}/days 저장 구조 변경 없음
- displayHistory 원본 렌더링은 보존하고 후처리 hook만 추가
- 기념일 저장 위치: rooms/{roomCode}/meta/firstMetDate
