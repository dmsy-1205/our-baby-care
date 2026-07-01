# HearMe2nite RC2.14.5 Recovery STEP2

## 목적
Presence 기능 자체를 수정하지 않고, 로그인/방 복구/방 변경 생명주기에 Presence Refresh를 연결한다.

## 수정 파일
- js/auth.js
- js/room.js

## 변경 요약
- 로그인 완료 후 Presence 재시작 요청
- 자동 방 복구 완료 후 Presence 재시작 요청
- 새 방 저장/생성 후 Presence 재시작 요청
- 초대코드 참여 후 Presence 재시작 요청
- 기존 방 열기/기존 방 코드 연결 후 Presence 재시작 요청
- Presence Bridge를 0ms/300ms/1000ms 재시도로 보강해 currentUser/activeRoomCode 확정 타이밍 문제를 줄임

## 변경하지 않음
- Firebase 구조
- roomMembers 구조
- Invite 구조
- History 데이터
- Popup/Card UI
- presence.js
