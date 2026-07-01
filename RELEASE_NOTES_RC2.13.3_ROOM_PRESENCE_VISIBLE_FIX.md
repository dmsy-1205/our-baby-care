# RC2.13.3 Room Presence Visible Fix

## 목적
RC2.13.2에서 우리의 공간 모달에 상대 접속 상태 UI가 숨겨진 채 표시되지 않던 문제를 수정합니다.

## 수정
- `hmPresenceRoomMembersRef`, `hmPresenceSelfRef` 전역 상태 선언 추가
- 선언 누락으로 발생하던 ReferenceError 차단
- Presence listener 연결 실패 시에도 빈 상태 카드가 보이도록 보완
- 같은 방에서 listener 중복 연결 방지

## 기대 화면
우리의 공간 모달 안에 `👀 상대 접속 상태` 영역이 표시됩니다.
- 상대 없음: `아직 연결된 상대가 없습니다.`
- 상대 있음: 온라인/오프라인 및 마지막 접속 표시
