# HearMe2nite v1.0 STEP5.6.1.9
## Approved Room Disconnect Engine

- 승인된 `leave_room` 요청에만 최종 실행 버튼 표시
- 관리자에게 `DISCONNECT` 직접 입력 요구
- Callable Function 1개만 최종 실행 시 호출
- 삭제: `userRooms/{uid}/{roomCode}`, `roomMembers/{roomCode}/{uid}`, 일치하는 `users/{uid}/activeRoom`, presence 연결
- 보존: Room 기록, 채팅, 사진, 기념일, 상대방 데이터
- 완료 시 요청을 `completed`로 변경하고 `dataDeletionLogs/{requestId}` 기록
- 계정 삭제와 Room 전체 삭제는 이번 버전에 포함하지 않음
