# HearMe2nite STEP5.5.1 Firebase Rules 전환 보고서

## 목표
HearU2nite 관리자 중심 Rules를 독립형 HearMe2nite의 Room 멤버 기반 Rules로 전환한다.

## 핵심 정책
- 기본값은 전체 읽기/쓰기 거부다.
- 사용자는 자신의 `users/{uid}`, `userRooms/{uid}`만 접근한다.
- `rooms/{roomCode}`는 `roomMembers/{roomCode}/{auth.uid}`가 존재하는 사용자만 접근한다.
- `roomMembers` 전체 루트 조회는 허용하지 않는다.
- Room 멤버는 같은 Room의 멤버 목록만 읽을 수 있다.
- 자신의 멤버 레코드만 생성/갱신할 수 있으며 role, email, joinedAt 등 핵심 값은 생성 후 임의 변경할 수 없다.
- partner 등록은 유효하고 미사용이며 만료되지 않은 Invite가 있을 때만 가능하다.
- Invite 생성은 Room owner만 가능하다.
- Invite 사용 처리는 초대받은 사용자가 Room 멤버로 등록된 뒤에만 가능하다.
- `ownerNotes` 쓰기는 Room owner 또는 relationshipRole이 dom인 사용자만 가능하다.
- STEP5.2 이후 신규 사용자는 Firebase Auth의 `email_verified`가 true여야 Room 데이터에 접근한다.
- 기존 사용자는 `emailVerificationRequired` 필드가 없으므로 종전대로 보호·허용한다.

## 코드 보완
보안을 위해 `roomMembers` 전체를 읽어 UID를 역검색하던 Legacy fallback을 제거했다.
기존 Room 복구는 다음 안전한 사용자 전용 경로만 사용한다.
1. `users/{uid}/activeRoom`
2. `userRooms/{uid}`

## 배포
`firebase.json`에 다음 설정을 추가했다.

```json
"database": {
  "rules": "database.rules.json"
}
```

Firebase CLI를 사용하는 경우 Hosting과 Rules를 함께 배포할 수 있다.

```bash
firebase deploy --only database,hosting
```

Rules만 먼저 적용하려면:

```bash
firebase deploy --only database
```

## 필수 검수 순서
1. Firebase Realtime Database Export 백업
2. Rules만 먼저 배포
3. 기존 사용자 2개 Room 각각 로그인 및 기록 불러오기
4. 다른 Room 코드 직접 접근 차단 확인
5. 신규 인증 계정 Room 생성 확인
6. Invite 생성 및 partner 참여 확인
7. 오늘의 약속, 기록, 채팅, Presence 확인
8. `hmPrintQaSummary()` 확인

## 롤백
문제가 발생하면 Firebase Console의 Rules History 또는 기존
`MASTEROS_REALTIME_DATABASE_RULES_v0.10.17.json`을 사용해 즉시 복구한다.
