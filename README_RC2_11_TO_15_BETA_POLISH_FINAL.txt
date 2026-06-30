HearMe2nite RC2.11~RC2.15 Beta Polish Final Candidate

기준: RC2.10.13 Auto Card Layout Hotfix
목표: 베타 5인 링크 배포 후 오류를 최대한 줄이는 안정화/폴리시 라인

적용 내용
1. RC2.11 Beta Polish
- 홈 화면 오늘 요약 대시보드 추가
- 기록/미션/다음 기념일 상태를 읽기 전용으로 표시

2. RC2.12 History Search & Stats
- 기록실 월간 통계 추가
- 기록실 검색 추가
- 기존 displayHistory 원본 직접 수정 없음

3. RC2.13 Timeline
- 기념일 기반 타임라인 표시
- 날짜 클릭 시 기존 selectHistoryDate 후처리 사용

4. RC2.14 Export Ready
- 기록실 텍스트 내보내기/복사 기능 추가
- Firebase 저장 구조 변경 없음

5. RC2.15 Beta QA Center
- 베타 검수 센터 추가
- 로그인/방/기념일/Hook 상태 점검

절대 변경하지 않은 것
- Firebase 구조
- Room 구조
- RoomMembers
- History 저장 구조
- AutoSave 저장 Key
- displayHistory 원본 코드 직접 수정
- 기존 사용자 데이터

베타 테스트 우선순위
1. 기존 사용자 로그인
2. 기존 방 불러오기
3. 오늘 기록 저장/로드
4. 기록실 열기
5. 기념일 설정/자동계산/캘린더 아이콘
6. 기록실 검색/내보내기
7. 모바일/태블릿/Fold/PC 팝업 확인
