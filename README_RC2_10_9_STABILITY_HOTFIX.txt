HearMe2nite RC2.10.9 Stability Hotfix

목표:
- RC2.10.8 날짜 클릭/기념일 상세 기능 안정화
- 기록실 열림 직후 기념일 후처리 보강
- 최종 검수 전 회귀 위험을 줄이기 위한 안정화 단계

수정 내용:
1. 기록실 열림 직후 기념일 상세 카드, 기념일 클릭 가능 날짜, 캘린더 아이콘 후처리 보강
2. 기념일 모듈 주석을 RC2.10.9 기준으로 정리
3. Firebase 구조, Room 구조, History 저장 구조, DB Key 변경 없음
4. history.js / displayHistory() 원본 직접 수정 없음

주의:
- History Render는 계속 보호 영역
- 기념일 기능은 독립 모듈 후처리 방식 유지
