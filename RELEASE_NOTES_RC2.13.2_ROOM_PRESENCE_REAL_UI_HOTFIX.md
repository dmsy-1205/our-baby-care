# RC2.13.2 Room Presence Real UI Hotfix

## 기준
- RC2.12.2 History Popup First Hotfix FULL 기준 실제 프로젝트 파일 수정

## 수정 내용
- 우리의 공간 모달에 `상대 접속 상태` 카드 실제 추가
- 상대가 없을 때 `아직 연결된 상대가 없습니다` 안내 표시
- 상대가 연결되어 있으면 온라인/오프라인, 마지막 접속 표시
- roomMembers/{roomCode}/{uid}/presence 하위 노드에만 presence 정보 저장
- 로그아웃/방 전환 시 presence listener 정리
- 중앙 모달 / 카드형 UI / Firebase 기존 구조 유지

## 덮어쓸 파일
- index.html
- css/style.css
- js/config.js
- js/room.js
- js/autosave.js
