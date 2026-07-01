# HearMe2nite

> 우리의 하루를, 함께 기록합니다.

HearMe2nite는 승인된 사용자만 사용할 수 있는 Room 기반 커플 라이프 기록 앱입니다. 오늘의 컨디션, 하루 기록, 운동, 기념일, 기록실, 채팅을 하나의 공간에서 함께 관리합니다.

## Version

RC2.18 Documentation & Help Center

## 기준 Source

HearMe2nite_RC2.17.3_ExerciseCard_FULL

## 주요 기능

- MasterOS Access Gate
- 승인 사용자 로그인
- Room 생성
- 초대코드 생성 및 입장
- 기존 Room 복구
- 상대 Online / Offline 표시
- Heartbeat / 마지막 접속
- 오늘의 약속
- 오늘의 컨디션
- 오늘의 운동
- 오늘의 기록
- 관리 및 피드백
- 채팅
- 기록실 Calendar
- 하루 기록 팝업
- 사진 모아보기
- 사용자 기념일
- 앱 내부 Help Center

## 프로젝트 구조

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── auth.js
│   ├── room.js
│   ├── presence.js
│   ├── daily.js
│   ├── history.js
│   ├── anniversary.js
│   ├── chat.js
│   ├── help-center.js
│   └── app.js
├── docs/
│   ├── USER_GUIDE.md
│   ├── FAQ.md
│   ├── CHANGELOG.md
│   ├── RELEASE_NOTES.md
│   ├── ARCHITECTURE.md
│   ├── PROJECT_RULES.md
│   ├── UI_GUIDELINE.md
│   ├── DEPLOY_CHECKLIST.md
│   └── ROADMAP.md
└── RELEASE_NOTES.md
```

## 개발 원칙

- Full Source 기준 개발
- modified_files_only 누적 개발 금지
- Firebase 구조 변경 금지
- Room / Presence / History 구조 변경 금지
- Popup / Responsive 구조 유지
- QA 후 GitHub Commit 및 Netlify Deploy

## 문서

자세한 문서는 `/docs` 폴더를 확인하세요.

- 사용자 설명서: `docs/USER_GUIDE.md`
- FAQ: `docs/FAQ.md`
- 변경 이력: `docs/CHANGELOG.md`
- 배포 노트: `docs/RELEASE_NOTES.md`
- 개발 규칙: `docs/PROJECT_RULES.md`
- 배포 체크리스트: `docs/DEPLOY_CHECKLIST.md`

## v1.0 Stable Release 조건

로그인, 승인, Room, Invite, Restore, Presence, Calendar, Anniversary, Exercise, History, Chat, Mobile QA, Tablet QA, PC QA, Help Center, README, FAQ, Release Notes, GitHub, Netlify 검수가 완료되어야 합니다.

## 개발 철학

HearMe2nite는 기능이 많은 앱이 아니라 **매일 열고 싶은 앱**을 목표로 합니다. 기능 추가보다 안정성과 사용자 경험을 우선합니다.
