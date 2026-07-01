
## RC2.14.3 Home Summary Fixed Modal
- 오늘의 요약 아이템 폭 고정
- 단위 제거 및 짧은 표시로 모바일 잘림 방지
- 오늘의 요약 클릭 시 읽기 전용 중앙 모달 추가

# HearMe2nite v0.10.22 Room Boot Recovery Hotfix

## 목적
- 기존 방에서 사용자가 튕겨나가거나 새 방 생성 화면으로 떨어지는 문제를 안정화합니다.
- 로그인/승인/방 복구 순서를 안전하게 정리합니다.

## 수정
- room.js 내부 일부 함수에서 정의되지 않은 uid 참조를 currentUser.uid로 수정했습니다.
- users/{uid}/activeRoom이 비어 있거나 접근 실패해도 userRooms와 roomMembers 기준으로 기존 방을 자동 복구합니다.
- 복구 성공 시 users/{uid}/activeRoom, userRooms/{uid}/{roomCode}, users/{uid}/relationshipRole을 다시 보정합니다.
- Access Gate, History Render, AutoSave 저장 구조는 변경하지 않았습니다.

## 테스트 순서
1. 승인된 owner 계정 로그인
2. 새로고침 후 dmsy 방 유지 확인
3. 승인된 partner 계정 로그인
4. 새로고침 후 dmsy 방 유지 확인
5. 로그아웃 후 재로그인 확인
6. 미승인 계정 차단 확인


## RC2.14.2
- 오늘의 요약을 얇은 아이콘 상태바로 축소.
- 오늘의 약속 카드 크기 유지 및 홈 높이 절감.


## RC2.15.1 History Cleanup Step 1
- 기록실 중복/저가치 정보 제거.


## RC2.15.2 Anniversary Upcoming Step 2
- 기념일 패널을 다가오는 일정 중심으로 재구성.


## RC2.15.3 Calendar Anniversary Markers Step 3
- 캘린더 헤더 D+ 표시 및 일정 아이콘 보강.


## RC2.15.4 History UX Final
- 기록실 UX 최종 안내 문구 및 누적 안정화.
