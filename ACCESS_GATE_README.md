# HearMe2nite v0.10.14 App Access Gate

## 어디에 넣어야 하나?

### 1) index.html / JS 수정 위치
이 패키지는 HearMe2nite 앱 쪽에 적용합니다.

- 적용 사이트: https://hearme2nite.netlify.app/
- 목적: MasterOS Platform에서 HearMe2nite 앱 승인을 받은 사용자만 앱 화면 진입

### 2) Firestore Rules 위치
`FIRESTORE_RULES_MASTEROS.rules`는 MasterOS Platform Firebase 프로젝트에 넣습니다.

- 프로젝트: master-app-platform
- 위치: Firestore Database → Rules
- 사용하는 승인 문서: `appAccess/{masterUid}_hearme2nite`
- 승인 필드: `status: "approved"`

### 3) Realtime Database Rules 위치
`REALTIME_DATABASE_RULES_HEARME2NITE_STRICT.json`는 HearMe2nite 데이터가 저장되는 Firebase Realtime Database에 넣습니다.

- 현재 앱 데이터 프로젝트: our-baby-care
- 위치: Realtime Database → Rules

## 매우 중요한 주의점
현재 앱은 Firebase 프로젝트를 2개 사용합니다.

- MasterOS Platform Auth/Firestore: `master-app-platform`
- HearMe2nite 실제 데이터 RTDB: `our-baby-care`

Firebase Rules는 다른 프로젝트의 Firestore 문서를 직접 읽을 수 없습니다.
따라서 완전한 DB 차단까지 하려면 `our-baby-care` RTDB에도 아래 승인 미러가 필요합니다.

```text
appAccess/{babyAuthUid}_hearme2nite/status = "approved"
```

이 미러가 없으면 Strict RTDB Rules 적용 시 승인된 사용자도 데이터 접근이 막힐 수 있습니다.
우선 이번 index.html 패키지는 MasterOS Firestore 승인 체크로 화면 진입을 차단합니다.
DB Rules까지 엄격하게 적용하려면 승인 미러 자동 생성/관리 단계를 추가해야 합니다.

## 이번 패키지 적용 내용

- Firebase Firestore compat SDK 추가
- master-app-platform Firestore appAccess 승인 확인 추가
- 승인 전에는 babyApp 로그인/홈 진입 차단
- 새로고침으로 babyAuth 세션이 살아있어도 MasterOS 승인 재확인
- 미승인 시 안내 화면 표시 + 플랫폼 이동 버튼 제공
- Firebase/Auth/Room/History 저장 구조는 변경하지 않음
