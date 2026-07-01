# RC2.14.7 Presence Heartbeat Hotfix

## 목적

일반창/시크릿창 동시 접속 또는 계정 전환 후 한쪽 사용자가 오프라인으로 남는 Presence 비대칭 문제를 보완한다.

## 수정 내용

- `presence.js`에 15초 heartbeat 추가
- 접속 중인 사용자는 주기적으로 `online:true`, `lastSeen`, `updatedAt` 갱신
- 로그아웃 / beforeunload / Firebase onDisconnect에서만 `online:false` 처리
- visibility hidden 상태에서는 오프라인 처리하지 않음

## 수정 파일

- `js/presence.js`
- `presence.js`

## QA

- 크롬 일반창 Dom + 시크릿창 Sub 동시 접속
- 양쪽 우리의 공간에서 상대 온라인 표시 확인
- 로그아웃 시 상대 화면에서 오프라인 전환 확인
- 마지막 접속 시간 갱신 확인
