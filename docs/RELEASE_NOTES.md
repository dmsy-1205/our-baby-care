# HearMe2nite v1.0 STEP5.10.9 릴리스 노트

배포일: 2026.07.15  
단계: Beta

## 주요 변경

- 사용자 설명서를 최신 화면과 기능에 맞게 전면 개편
- 나의 루틴 반복·입력·기록실 연동 안내 추가
- 개인/공용 테마와 라이트/다크/시스템 모드 안내 추가
- 계정 설정, 오늘의 약속, 기록실, 삭제 요청 안내 최신화
- 홈 버전, 브라우저 제목, 사용자 설명서 업데이트, QA 버전을 `js/release-info.js`에서 자동 동기화
- QA에 릴리스 정보, 홈 배지, 사용자 설명서 버전 일치 검사 추가

## 배포 안내

Firebase Realtime Database Rules 변경은 없습니다. Hosting 또는 Netlify 전체 소스만 배포합니다.


## STEP5.10.11.1 Firebase App Hotfix

- Fixed deletion code calling the missing Firebase `[DEFAULT]` app.
- Uses the existing named `babyApp` Auth/Database references.
- Shows the unseen deletion notice directly below the account card on Home.
- Verify Dom delete, Sub notice, acknowledgement, and Dom restore with two real accounts.
