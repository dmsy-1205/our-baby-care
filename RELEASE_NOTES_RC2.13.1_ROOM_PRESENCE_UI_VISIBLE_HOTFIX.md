# RC2.13.1 Room Presence UI Visible Hotfix

## 목적
수정파일만 덮어써도 우리의 공간 모달에서 상대 상태가 실제로 보이도록 수정.

## 변경
- 우리의 공간 모달에 상대 상태 카드 즉시 표시
- Dom/방주인 기준으로 기록(Sub) 상태 표시
- 기록(Sub) 미연결 시 안내 문구 표시
- 연결된 Sub가 있으면 온라인/오프라인, 사용자, 마지막 접속 표시
- activeRoom 복구 후 presence listener 자동 시작
- Firebase 기존 구조 변경 없음. roomMembers 하위 online/lastSeen/lastActiveAt만 추가

## 덮어쓸 파일
- index.html
- css/style.css
- js/room.js
