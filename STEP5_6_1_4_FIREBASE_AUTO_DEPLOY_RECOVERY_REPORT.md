# HearMe2nite v1.0 STEP5.6.1.4 Firebase 자동배포 복구 보고서

작성일: 2026-07-12

## 기준
- 실제 GitHub 프로젝트: our-baby-care
- Firebase 프로젝트 ID: our-baby-care
- 배포 브랜치: main
- 배포 채널: live

## 변경 파일
- `.github/workflows/firebase-hosting-merge.yml`

## 변경 내용
- main Push 자동 실행 유지
- GitHub Actions 화면에서 수동 실행할 수 있도록 `workflow_dispatch` 추가
- 최소 권한 `contents: read` 명시
- 중복 배포 방지를 위한 concurrency 설정 추가
- Firebase 공식 Hosting Deploy Action 사용
- 서비스 계정 Secret 이름을 `FIREBASE_SERVICE_ACCOUNT_OUR_BABY_CARE`로 고정

## 변경하지 않은 항목
- Firebase Auth
- Realtime Database
- Database Rules
- Storage 및 Storage Rules
- Room / Room Recovery
- Profile / Nickname
- Chat / History / Daily Record
- `firebase.json`
- `.firebaserc`
- PR Preview Workflow

## 자동배포 성공 필수 조건
GitHub 저장소의 다음 위치에 Secret이 있어야 한다.

Settings → Secrets and variables → Actions → Repository secrets

필수 Secret 이름:

`FIREBASE_SERVICE_ACCOUNT_OUR_BABY_CARE`

Secret이 없으면 프로젝트 루트에서 다음 명령으로 Firebase GitHub 연동을 다시 설정한다.

`firebase init hosting:github`

질문에 대한 기준 답변:
- GitHub repository: 실제 `사용자명/our-baby-care` 저장소
- Set up automatic builds and deploys with GitHub: Yes
- Deploy to live channel when PR is merged: Yes
- Live channel branch: main

CLI가 Workflow를 다시 생성하더라도 Secret 생성이 완료된 뒤, 이 Full Source의 안정화된 merge Workflow를 최종 사용한다.

## 배포 확인
1. 이 Full Source를 GitHub 프로젝트 폴더에 덮어쓴다.
2. GitHub Desktop에서 변경 파일을 확인한다.
3. 커밋 후 main에 Push한다.
4. GitHub 저장소의 Actions 탭을 연다.
5. `Deploy HearMe2nite to Firebase Hosting` 실행을 확인한다.
6. 초록색 체크가 뜨면 `https://our-baby-care.web.app`에서 확인한다.

## 실패 시 우선 확인
- `Input required and not supplied: firebaseServiceAccount`
  - GitHub Secret이 없거나 이름이 다름.
- `Permission denied` 또는 `403`
  - 서비스 계정 권한 또는 오래된 Secret 문제.
- Workflow가 아예 실행되지 않음
  - Workflow가 main에 커밋되지 않았거나 Actions가 비활성화됨.
- 배포는 성공했지만 화면이 이전 상태
  - 브라우저 강력 새로고침 및 캐시 버전 확인.
