# HearMe2nite v1.0 STEP5.2 이메일 인증 적용 보고서

## 기준 버전
- HearMe2nite_v1.0_STEP5.1_UX_TEXT_CLEANUP_FULL.zip
- 공식 Rollback Base: HearMe2nite_v1.0_STEP4_STABLE_BASE_FULL.zip

## 구현 목적
신규 가입자에게만 이메일 소유권 인증을 요구하고, STEP5.2 이전에 가입한 기존 사용자의 로그인·UID·Room·데이터는 그대로 보호한다.

## 신규 회원 처리
1. Firebase Authentication 계정 생성
2. `users/{uid}`에 신규 가입 표시 저장
   - `emailVerificationRequired: true`
   - `emailVerified: false`
   - `registrationVersion: STEP5.2`
3. Firebase 이메일 인증 메일 발송
4. 인증 전에는 앱 본문, Room 생성, 초대 참여 차단
5. 인증 완료 확인 후 앱 진입 허용
6. 인증 완료 정보를 사용자 노드에 기록
   - `emailVerified: true`
   - `emailVerifiedAt: ServerValue.TIMESTAMP`

## 기존 사용자 보호 방식
- 기존 사용자의 가입 시점이나 Firebase metadata를 추정하여 차단하지 않는다.
- `emailVerificationRequired === true`가 명시된 신규 계정만 인증 대상으로 처리한다.
- 기존 사용자 데이터에는 일괄 업데이트를 하지 않는다.
- 기존 UID, activeRoom, roomMembers, rooms, invites, presence 구조를 변경하지 않는다.

## 추가 UI
- 이메일 인증 대기 화면
- 인증 완료 확인 버튼
- 인증 메일 재발송 버튼
- 다른 계정으로 로그인 버튼

## 변경 파일
- `index.html`
- `css/style.css`
- `js/auth.js`
- `js/app.js`

## 변경하지 않은 항목
- Firebase 프로젝트 설정
- Firebase Realtime Database 기존 경로
- Firebase Security Rules
- 기존 사용자 UID
- 기존 Room 및 기록 데이터
- Invite 및 Presence 데이터 구조

## 정적 검수
- 전체 `js/*.js` Node 문법 검사 통과
- 인증 UI 요소 ID 및 함수 연결 확인
- 기존 사용자 예외 분기 확인
- 신규 사용자 인증 전 앱 차단 분기 확인

## 배포 후 필수 실사용 QA
### 기존 사용자
- 기존 사용자 2명 이상 로그인
- 기존 activeRoom 자동 복구
- 기존 기록 조회 및 저장
- Presence 확인

### 신규 사용자
- 실제 수신 가능한 새 이메일로 가입
- 인증 전 앱 진입 차단 확인
- 인증 메일 수신 확인
- 인증 메일 재발송 확인
- 인증 링크 클릭
- `인증 완료 확인` 버튼으로 앱 진입
- Room 생성 및 Invite 참여 확인

## Rollback
문제가 발생하면 STEP5.1 또는 공식 STEP4 Stable Base로 즉시 롤백한다. 데이터 마이그레이션은 없으므로 코드 롤백만으로 복구할 수 있다.
