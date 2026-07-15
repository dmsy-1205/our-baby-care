# HearMe2nite v1.0 STEP5.10.7

## 나의 루틴 3단계 — 기록실 및 최종 복사 연동

- `오늘 하루 기록 최종 완성 및 복사` 결과에 나의 루틴을 추가했습니다.
- 기록 순서는 `오늘의 약속 → 나의 루틴 → 오늘의 컨디션 → 오늘의 기록 → 관리와 피드백`입니다.
- 기록실 날짜 상세 팝업에도 나의 루틴 완료·미완료 상태가 표시됩니다.
- 날짜별 루틴 제목, 설명, 반복 방식, 순서와 완료 상태를 스냅샷으로 보존합니다.
- 루틴을 나중에 수정하거나 삭제해도 과거 날짜의 저장 기록은 당시 내용이 우선 표시됩니다.
- 관리(Dom)는 기록실과 복사 결과에서 읽기 전용으로 확인합니다.
- 나의 루틴만 수행한 날짜도 날짜 기록과 연결될 수 있도록 보강했습니다.

---

# HearMe2nite v1.0 STEP5.10.7

## 나의 루틴 2단계

- 기록(Sub)이 루틴을 매일, 선택 요일, 오늘만으로 설정할 수 있습니다.
- 선택 요일 루틴은 지정한 요일에만 홈 카드로 표시됩니다.
- 오늘만 루틴은 생성 당시 선택한 기록 날짜에만 표시됩니다.
- 루틴을 삭제하지 않고 일시 중지할 수 있습니다.
- 일시 중지된 루틴은 관리 팝업에는 남고 홈 실행 카드에서는 숨겨집니다.
- 관리(Dom)은 기존처럼 읽기 전용으로 일정과 상태를 확인합니다.
- 기존 STEP5.10.4 루틴은 자동으로 매일 루틴으로 호환됩니다.
- 개인/공용 테마, 다크모드, 중앙 모달, Room/초대/기록 기능을 그대로 유지합니다.

# HearMe2nite v1.0 STEP5.10.7

## 나의 루틴 진입 구조 단일화

- 홈 화면의 중복 `나의 루틴 관리` 버튼을 제거했습니다.
- 상단 `나의 루틴` 대표 카드가 생성·수정·삭제 관리 화면의 유일한 진입점이 됩니다.
- 생성된 개별 루틴 카드는 홈 화면에서 완료 또는 완료 취소에만 사용됩니다.
- 기존 루틴 데이터, Dom 읽기 전용 권한, Sub 관리 권한, 테마와 다크모드 구조는 변경하지 않았습니다.

---

# HearMe2nite v1.0 STEP5.10.7

## 나의 루틴 관리 영역 레이아웃 수정

- 홈의 안내 문구가 한 글자씩 세로로 표시되며 큰 빈 공간이 생기던 문제 수정
- 불필요한 안내 문구 제거
- 나의 루틴 관리 버튼을 카드 바로 아래 전체 너비로 배치
- 루틴 카드와 다음 섹션 사이의 과도한 높이 제거
- 기능, Firebase 경로, Rules 및 권한 구조는 변경하지 않음

# STEP5.10.7 — 나의 루틴 홈 카드 구조 수정

- 나의 루틴 관리 팝업과 실제 수행 카드를 분리했습니다.
- Sub가 만든 루틴은 홈 화면의 나의 루틴 바로 아래에 각각 카드로 표시됩니다.
- Sub는 홈 카드에서 완료/취소를 체크합니다.
- 관리 팝업에서는 생성·수정·삭제만 진행합니다.
- Dom은 홈 카드에서 완료 상태를 읽기 전용으로 확인합니다.
- 기존 테마, 다크모드, Room 권한 및 Firebase 저장 구조를 유지합니다.

# HearMe2nite v1.0 STEP5.10.7 릴리스 노트

## 나의 루틴 카드 열기 긴급 수정
- Dom과 Sub 모두 홈의 `나의 루틴` 카드를 눌러 중앙 모달을 열 수 있도록 수정
- 기존 공통 중앙 모달 시스템(`openModalOverlayById`)과 연결
- 인라인 클릭 함수의 전역 연결을 명시하여 모바일 브라우저에서도 안정적으로 호출
- Sub는 생성·수정·삭제·완료 체크 가능, Dom은 읽기 전용 구조 유지
- Firebase 경로와 Rules는 STEP5.10.0 그대로 유지

# HearMe2nite v1.0 STEP5.10.7

## 기록(Sub) 자기주도 「나의 루틴」 1단계
- 오늘의 약속 바로 아래에 나의 루틴 홈 카드 추가
- 기록(Sub) 전용 루틴 생성, 수정, 삭제, 완료 체크
- 관리(Dom)는 목록과 완료 상태를 읽기 전용으로 확인
- 기존 개인/공용 테마, 다크모드, 중앙 모달 디자인 전부 적용
- Room, 초대, 오늘의 약속, 기록 데이터 구조는 유지
- 신규 RTDB 경로: rooms/{roomCode}/subRoutines, subRoutineDays

# STEP5.10.7

- 다크모드 중앙 모달의 흰색 제목 영역을 다크 표면으로 통일했습니다.
- 채팅, 오늘의 약속, 일일 입력 및 관리 팝업 제목과 상태 문구의 대비를 강화했습니다.
- 기능, Firebase 경로와 Rules는 변경하지 않았습니다.

# HearMe2nite v1.0 STEP5.10.7

## 계정 카드 높이 및 정렬 보정

- 홈의 계정 카드를 아래 `우리의 공간` 카드와 동일한 높이·여백·가로 정렬로 통일했습니다.
- 과거 `.user-bar` 스타일과 충돌해 계정 정보가 세로로 쌓이던 문제를 제거했습니다.
- 계정 설정 중앙 팝업의 구성과 기능은 그대로 유지했습니다.
- Firebase 데이터 구조, Rules, Room, 초대코드, 테마 동기화 기능은 변경하지 않았습니다.

---

# HearMe2nite v1.0 STEP5.9.0

## STEP5.9.0 — 다크 화면 및 테마 적용 UX 보정
- 다크 화면의 흰 카드 잔존과 저대비 글자 문제 수정
- 다크 화면에서도 선택한 라벤더·블라썸·오션·포레스트·크림 포인트가 즉시 반영되도록 보정
- 테마/표시 방식 저장 완료 후 설정 팝업 자동 닫힘
- 기존 개인/공용 테마 및 Room 동기화 구조 유지

## STEP5.9.0 — 화면 표시 방식 분리

- 미드나이트를 색상 테마에서 제거했습니다.
- 라이트, 다크, 시스템 설정 따라가기를 별도 표시 방식으로 추가했습니다.
- 라벤더·블라썸·오션·포레스트·크림의 색감은 라이트와 다크 화면에서 모두 유지됩니다.
- 다크 화면의 카드, 입력창, 팝업, 제목, 보조 문구 대비를 전면 보정했습니다.
- 표시 방식은 개인 계정에만 저장되며 커플 공용 테마와 동기화되지 않습니다.
- 과거 미드나이트 사용자 설정은 라벤더 + 다크로 자동 전환됩니다.

## STEP5.8.3 — 테마 분위기 완성

- 라벤더·블라썸·오션·포레스트·크림·미드나이트 팔레트 차이를 강화
- 배경뿐 아니라 카드, 계정 버튼, 입력창, 주요 버튼, 아이콘 배경, 그림자와 로고 Glow까지 테마에 연결
- 각 테마의 핵심 카드 표면을 서로 다르게 구성해 모바일에서도 즉시 구분되도록 개선
- 미드나이트의 흰 카드 잔존과 낮은 대비를 보정
- 기능, Firebase 경로, Room/초대/권한 구조는 변경하지 않음

## 테마 엔진 기반 재설계

- 배경, 앱 셸, 카드, 팝업, 입력창, 버튼, 제목, 보조 문구, 테두리, 그림자, 포커스 효과를 하나의 의미 기반 디자인 토큰으로 통합했습니다.
- 기존 기능과 Firebase 데이터 구조는 변경하지 않았습니다.
- 기존 6개 테마 선택 및 개인/공용 테마 동기화 기능을 유지했습니다.
- STEP5.8.3에서 각 테마를 서로 확실히 구분되는 분위기로 조정할 수 있는 기반을 마련했습니다.
- 다크 표시 방식 분리는 STEP5.9.0에서 진행합니다.

---

## STEP5.8.3 — 우리의 테마 실시간 동기화

- 개인 테마와 Room 공용 테마 선택 구조 추가
- 관리(Dom)만 공용 테마 활성화 및 변경 가능
- 기록(Sub)은 적용 중인 공용 테마를 실시간으로 수신
- 공용 테마 해제 시 각 사용자의 기존 개인 테마로 자동 복귀
- Room 전환 시 해당 Room의 공용 테마 자동 적용
- `rooms/{roomCode}/themeSettings` Rules 추가

## STEP5.8.3 — 개인 테마 1단계

- 라벤더, 블라썸, 오션, 포레스트, 크림, 미드나이트 6개 개인 테마 추가
- 상단 계정 메뉴에 `테마` 버튼 추가
- 선택 즉시 미리보기, 저장하지 않고 닫으면 이전 테마로 복귀
- 개인 테마를 `users/{uid}/preferences/theme`에 저장
- 브라우저 로컬 저장소를 보조 사용하여 로그인 전 테마 깜빡임 완화
- Room 및 커플 공용 테마 구조는 변경하지 않음
- 개인 테마 저장을 위한 Realtime Database Rules 최소 항목 추가

## STEP5.7.2 — 기록 구역 순서 바로잡기

- 최종 기록 및 복사 결과를 홈 구역 순서에 맞게 수정
- 오늘의 약속 → 오늘의 컨디션 → 오늘의 기록 → 관리와 피드백 순서 적용
- 기록실 날짜 상세 화면에도 같은 순서 적용
- Firebase 저장 경로와 권한 구조는 변경하지 않음


## STEP5.7.1 — 기록·복사 순서 통일
- 최종 복사 결과를 홈 카드 표시 순서에 맞춰 정렬
- 기록실 상세 저장 기록도 같은 순서로 정렬
- 숨겨진 구형 오늘의 미션 블록을 상세 기록에서 제거
- 오늘의 약속은 관리와 피드백 다음에 표시
- Firebase 저장 경로와 권한 구조는 변경하지 않음
# STEP5.7.1 — 오늘의 약속 관리 목록형 UI

- 오늘의 약속 팝업에 반복 표시되던 대형 카드 목록을 제거했습니다.
- 관리(Dom)는 등록된 약속을 간결한 한 줄 목록으로 확인하고 바로 수정할 수 있습니다.
- 기록(Sub)은 중복 목록 대신 홈 화면의 약속 카드를 사용하도록 안내됩니다.
- Room, 초대, Firebase 데이터 구조, 권한 및 저장 로직은 변경하지 않았습니다.

# STEP5.6.4.7 — Final Security Stable

- Completed final security audit without adding new app features.
- Confirmed room isolation, role-specific writes, private owner notes, chat sender validation, read-status ownership, dayAdmin separation, and invite claim protection.
- Removed the deployable `js/room.js.bak` backup file.
- Hardened Firebase Hosting ignore rules so database rules, storage rules, Functions source, internal docs, backups, ZIPs, and source maps are not published.
- Confirmed Realtime Database Rules do not use unsupported `hasOnly()` or `numChildren()` syntax.
- Synchronized internal, visible, QA, title, and cache versions to STEP5.6.4.7.

---

# STEP5.6.4.7 — Invite 24H + Version Sync

- Invite TTL fixed to exactly 24 hours using Firebase server-adjusted time.
- Invite UI and copied text show expiry information.
- Visible version badge now auto-syncs from HM_APP_VERSION.
- Cache keys and title updated consistently.

# STEP5.6.4.6.9 — Partner Meta Child Write Hotfix

- 초대 참여 시 `rooms/{roomCode}/meta` 부모 update 제거
- `partnerUid` 저장 → 서버 확인 → `partnerEmail` 저장 순서로 변경
- 기존 Room meta 잠금 및 초대 보안 Rules 유지

# STEP5.6.4.6.9 — Invite Claim Recovery Hotfix

- Replaced invite claim transaction callback with an RTDB Rules-guarded update.
- Prevents false "already used or expired" results caused by an empty initial transaction snapshot.
- Allows the same authenticated account to resume Room membership creation after a partial invite claim.
- Keeps one-time invite use, server-time expiry checks, UID binding, and reuse blocking.
- No Firebase Rules change is required from STEP5.6.4.6.5-compatible rules.

---

# STEP5.6.4.6.9 — Invite Server Time Hotfix

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
## HearMe2nite v1.0 STEP5.6.4.7

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

## STEP5.9.0 — 테마 동기화 최종 마무리
- 개인/공용 테마의 현재 적용 상태 표시 추가
- 상대 사용자의 공용 테마 변경을 실시간으로 반영하고 안내 표시
- 동일 계정의 다른 브라우저 탭에서 개인 테마·표시 방식 변경 동기화
- 테마 변경 시 짧은 전환 효과 추가, 기기의 동작 줄이기 설정 지원
- Room 전환 및 공용 테마 해제 시 개인 테마 복귀 안정화


## HearMe2nite v1.0 STEP5.9.0

- 홈 상단의 넓은 계정/설정 영역을 컴팩트 계정 카드로 변경했습니다.
- 계정 카드를 누르면 프로필, 테마, 데이터, 관리자 메뉴와 로그아웃을 중앙 팝업에서 사용할 수 있습니다.
- 관리자 메뉴는 기존 권한 확인 결과에 따라 관리자에게만 표시됩니다.
- 다크모드에서 오늘의 약속 하위 미션·주간 운동 카드와 글자 대비가 어긋나는 문제를 수정했습니다.
- Firebase 데이터 구조와 Rules는 변경하지 않았습니다.

## HearMe2nite v1.0 STEP5.10.7
- 다크모드 미적용 영역 통합 보정
- 기록실 캘린더, 기념일 카드, 기록 상세 카드의 어두운 표면과 글자 대비 적용
- 외출 기록, 오늘의 기분 등 일일 입력 팝업 내부 흰색 영역 제거
- 나의 루틴 홈/관리 카드의 실제 다크모드 속성 선택자 보정
- 우리의 공간 내부 패널, 역할 선택, 초대/이전 공간 영역의 다크모드 적용
- 데이터 구조와 Firebase Rules 변경 없음
