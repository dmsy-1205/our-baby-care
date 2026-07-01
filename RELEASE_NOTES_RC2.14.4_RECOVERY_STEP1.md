# RC2.14.4 Recovery Step1

- 오늘의 약속 카드가 제목만 보이는 문제를 방지했습니다.
- 우리의 공간 모달에 상대 접속 상태를 별도 presence.js로 안전하게 연결했습니다.
- Presence는 기존 데이터 구조를 변경하지 않고 roomMembers/{roomCode}/{uid}/presence 하위 노드만 사용합니다.
- Firebase 읽기/쓰기 권한 오류가 있어도 앱 초기 로딩이 멈추지 않도록 분리했습니다.
