# STEP5.6.4.6.8 — Invite Claim Recovery Hotfix

- Replaced invite claim transaction callback with an RTDB Rules-guarded update.
- Prevents false "already used or expired" results caused by an empty initial transaction snapshot.
- Allows the same authenticated account to resume Room membership creation after a partial invite claim.
- Keeps one-time invite use, server-time expiry checks, UID binding, and reuse blocking.
- No Firebase Rules change is required from STEP5.6.4.6.5-compatible rules.

---

# STEP5.6.4.6.8 — Invite Server Time Hotfix

- 초대 생성/만료/귀속 판단을 Firebase `.info/serverTimeOffset` 기준으로 통일
- Dom/Sub 기기 시계 차이로 신규 초대가 즉시 만료되는 오판 수정
- 최종 만료 차단은 Realtime Database Rules의 `now` 검증 유지

- Existing Room switching no longer rewrites `roomMembers/{roomCode}/{uid}`.
- Preserves original `joinedAt`, `inviteCode`, role, and membership security fields.
- Only `users/{uid}/activeRoom`, `userRooms`, login timestamp, and local active Room state are updated.
- No Realtime Database Rules change. STEP5.6.4.6.5 Rules remain the security baseline.

# STEP5.6.4.6.5 — Invite Field Rules Hotfix

- Fixed RTDB invite creation denial caused by `$other` matching all undeclared invite fields.
- Declared each supported invite field explicitly.
- Unknown invite fields remain blocked.
- No application data migration.

# STEP5.6.4.6.3 — RTDB Rules Compatibility Hotfix

- Removed unsupported `numChildren()` from Realtime Database Rules.
- Kept exact meta schema enforcement with `hasChildren()` plus `$other.validate = false`.
- Audited Rules for previously identified unsupported `hasOnly()` and `numChildren()` calls.
- No application data structure or feature behavior changed.

# STEP5.6.4.6 — Invite & Room Join Security

- 초대코드 사용을 Firebase transaction으로 원자적 귀속 처리
- 동일 초대코드 동시 사용 시 단일 UID만 성공
- usedByUid / usedByEmail / usedAt 서버 규칙 검증
- 초대코드에 귀속된 UID만 Partner roomMembers 생성 가능
- Room ownerUid와 invite ownerUid 일치 검증
- 이미 Partner가 연결된 Room의 추가 초대 생성 및 추가 Partner 차단
- partnerUid / partnerEmail 위조 및 덮어쓰기 차단
- 기존 Room과 기존 멤버십 구조 유지

---

# STEP5.6.4.6 — Day Role Security

- 일반 날짜 기록과 Dom/Owner 관리 기록 저장 경로 분리
- 신규 관리 기록: rooms/{roomCode}/dayAdmin/{date}
- 기존 days/{date} 관리 필드는 읽기 fallback으로 유지
- Sub 자동저장은 일반 필드만 update하여 관리 필드를 덮어쓰지 않음
- 관리 기록 쓰기는 관리자/Room Owner/Dom만 허용
- 기록 삭제는 관리자/Room Owner/Dom만 허용하며 두 경로를 함께 삭제
- 기록실/복사/결과 생성 시 두 경로를 병합해 기존 화면 호환 유지
## HearMe2nite v1.0 STEP5.6.4.6.8

- 주요 사용자 입력값의 앱/RTDB 이중 검증 추가
- 닉네임, 피드백, 선물 메모, 비공개 메모 길이 제한
- ownerNotes 허용 필드 외 데이터 차단
- 잘못된 비밀번호 등 예상 가능한 인증 실패의 콘솔 스택 축소
- 기존 데이터 구조 및 읽기 호환 유지

## HearMe2nite v1.0 STEP5.6.4.2.1

### 채팅 및 읽음 상태 세부 보안 강화

- 신규 채팅 `senderUid === auth.uid` 검증 추가
- 신규 채팅 `senderEmail === auth.token.email` 검증 추가
- 채팅 본문 1~2,000자, 발신자 이름 최대 80자 제한
- `chatReadStatus/{uid}` 쓰기를 본인 UID 또는 관리자에게만 허용
- 읽음 상태 객체 필드를 `lastReadAt`, `updatedAt`으로 제한
- 기존 채팅 및 Room 데이터는 마이그레이션 없이 유지
- Hosting Workflow가 Realtime Database Rules를 배포하지 않음을 문서화

## v1.0 STEP5.6.4.1.1

- STEP5.6.4.0 보안 Rules 적용 후 기존 사용자 호환성 확인용 읽기 전용 QA 추가
- 콘솔 명령 `await hmRunSecurityCompatibilityQA()` 추가
- 관리자 값 true 판정, 현재 Room 멤버십, 관계 역할, ownerNotes 리스너 연결 상태 진단
- 실제 데이터 쓰기 및 Firebase 구조 변경 없음
- 기존 채팅·기록·루틴 기능과 Rules 범위 유지

## v1.0 STEP5.6.4.0

- 1차 보안 강화 완료(기존 사용자 호환 우선).
- 관리자 판정을 `admins/{uid} === true`로 통일.
- 기존 Room에 제3자가 owner로 자가 등록하는 경로 차단.
- `ownerNotes` 읽기/쓰기를 관리자, Room owner, 관계 역할 Dom으로 제한.
- Sub 계정은 ownerNotes 리스너를 연결하지 않도록 앱 조건 유지·강화.
- 초대코드는 생성 후 임의 재작성할 수 없고 `used: false → true` 사용 처리만 허용.
- 삭제 요청 상태에 `processing` 호환 추가.
- rooms 하위 세부 쓰기 분리, 채팅 senderUid 검증, chatReadStatus 본인 쓰기 제한은 호환성 QA 후 다음 단계에서 진행.

## v1.0 STEP5.6.3.8

- 오늘의 약속 관리 화면에 기존 루틴을 개별 항목으로 표시
- 기존 루틴별 안전 삭제 버튼 추가
- 삭제된 기존 루틴은 홈과 관리 목록에서 제외
- 과거 날짜의 완료 기록은 삭제하지 않고 보존
- 신규 오늘의 미션 및 주간 루틴 관리 기능 유지

# Release Notes

## v1.0 STEP5.6.3.8

- 기존 `약속 체크` 데이터 내부의 루틴 항목을 삭제하지 않고 홈의 `오늘의 약속` 아래 독립 카드로 복구 표시
- 구버전 루틴은 `기존 루틴`으로 호환 렌더링하며 기존 날짜별 입력값 유지
- 새 미션·주간 루틴과 기존 루틴을 함께 표시
- 기존 루틴 컨테이너 제목 `약속 체크`는 홈과 관리 목록에서 노출하지 않음
- 신규 카드 5개 제한 계산에서 숨겨진 구버전 컨테이너 제외
- `saveCustomRoutineCard` 중복 변수 선언 정리

## v1.0 STEP5.6.3.6

- 오늘의 약속에서 생성한 오늘의 미션·주간 루틴을 홈의 메인 카드 바로 아래에 독립 카드로 연속 표시
- 약속 관리 버튼을 생성 카드 목록 아래로 이동
- Room 연결 직후 대표 기념일을 자동 로드하여 기록실을 열지 않아도 오늘의 요약에 `함께한 지 N일` 표시
- 기존 Firebase 데이터 구조와 Rules 변경 없음

## v1.0 STEP5.6.3.6

- 루틴 카드 위치 정정: 생성된 오늘의 미션/주간 루틴 카드는 `관리와 피드백`이 아니라 `오늘의 약속` 메인 카드 바로 아래에 표시
- 과거 자동 생성된 `약속 체크` 카드는 화면에서 제외하되 Firebase 원본은 삭제하지 않아 기존 사용자 호환 유지
- Firebase 구조와 Rules 변경 없음


## v1.0 STEP5.6.3.6
- 관리와 피드백에서 의미가 중복되던 `약속 체크` 템플릿 제거
- 주인의 피드백 모달에 실제 작성 상태를 보여주는 `오늘의 확인` 추가
- 피드백 유형 추가: 칭찬해요, 응원해요, 이야기해요, 함께할게요
- 자유 입력을 `한마디`로 정리
- `오늘의 기록을 확인했어요` 상태 추가
- 홈 피드백 카드에 확인·피드백 상태 요약
- 기존 `replyMessage` 호환 유지
- 프로젝트 MD 문서를 핵심 문서만로 정리

## v1.0 STEP5.6.3.2
- 오늘의 미션과 요일별 주간 루틴 관리
- 우리의 대화를 오늘의 요약 아래로 이동


## HearMe2nite v1.0 STEP5.6.4.1.1

- Room 또는 계정 전환 시 남아 있던 `hmChatReadRef` 리스너를 공통 정리 함수에서 해제합니다.
- 채팅 Presence 리스너 `hmChatPresenceRef`도 함께 해제하고 참조를 초기화합니다.
- 이전 Room의 `chatReadStatus/{uid}` 접근으로 발생하던 `permission_denied` 콘솔 오류를 방지합니다.
- Firebase 데이터 구조와 Rules는 변경하지 않았습니다.


## STEP5.6.4.2.1 — RTDB Rules Syntax Hotfix
- Replaced unsupported `hasOnly()` with Realtime Database-compatible child validation rules.
- Allowed only `lastReadAt` and `updatedAt` under `chatReadStatus/{uid}`; all other fields are rejected through `$other`.


## STEP5.6.4.6 — Room Path Rules Hardening

- Removed the broad `rooms/{roomCode}` member write grant.
- Added explicit write permissions for `days`, `messages`, `chatReadStatus`, `meta`, `customCards`, and `missionLibrary`.
- Protected immutable Room owner metadata.
- Restricted custom card and mission library management to Room Owner/Dom/admin.
- Preserved shared member access for daily records and anniversaries.
- Blocked writes to undefined Room child paths.


## STEP5.6.4.6.5 — Invite Rules Stable
- Rebuilt invite creation/claim rules around authenticated UID.
- Normal Room Owner can create a new invite when no partner is connected.
- Removed email equality from authorization decisions; email remains validated metadata.
- Preserved atomic false-to-true invite claim and reuse protection.
