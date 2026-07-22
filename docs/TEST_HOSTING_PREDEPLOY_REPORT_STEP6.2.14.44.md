# 테스트 Hosting 배포 준비 보고서

작성일: 2026-07-23  
배포 후보: HearMe2nite v1.0 STEP6.2.14.44  
테스트 프로젝트: `hearme2nite1205`  
상태: 2026-07-23 테스트 Hosting 배포 및 기본 회귀 완료

## 결론

테스트 Firebase Hosting 정적 공개 폴더 `public/`의 준비 검사를 통과한 뒤, 사용자 승인에 따라 테스트 Hosting만 배포했다.

`.firebaserc`의 기본 프로젝트는 메인 앱 `our-baby-care`이므로 기본 배포 명령은 금지한다. 실제 승인 후에도 반드시 테스트 별칭을 명시하고 Hosting만 대상으로 해야 한다.

## 배포에 포함되는 파일

배포 소스는 프로젝트 루트가 아니라 빌드된 `public/` 폴더 104개 파일이다.

- 메인 문서: `index.html`, `404.html`, `offline.html`
- PWA: `manifest.webmanifest`, `service-worker.js`
- 메인 앱 코드: `public/js/**/*.js`
- 메인 앱 스타일: `public/css/**/*.css`
- 이미지 및 정적 자산: `public/assets/**`
- 관리자 정적 파일: `public/admin.html`, `public/admin/**`
  - Hosting 구조상 함께 포함되지만 동결 기준 27개 파일과 SHA-256 해시가 모두 동일하다.
  - 관리자 기능 변경은 포함되지 않는다.

## 배포에서 제외되는 파일과 서비스

- Realtime Database 규칙: `database.rules.json`
- Storage 규칙: `storage.rules`
- Cloud Functions: `functions/**`
- 검수 문서: `docs/**`
- 검사·빌드 보조 도구: `scripts/**`
- 백업 파일: `*.bak`, `*.zip`
- 소스맵: `*.map`
- 저장소 메타데이터와 숨김 파일
- 메인 Firebase 프로젝트 `our-baby-care`

검사 결과 `public/`에 Database·Storage·Functions·docs·scripts 경로가 존재하지 않는다.

## 관리자 앱 보호 확인

- `scripts/admin-freeze.json` 기준 27개 파일 검사 통과
- 소스 관리자 파일과 동결 해시 일치
- 빌드된 `public/` 관리자 파일과 동결 해시 일치
- `admin.html`의 Git 변경 표시는 줄바꿈 정규화 경고이며 실제 해시는 동결 기준과 동일

## 복구 가능 상태

- 현재 Git 기준 커밋: `31e052873cad7b88a23bcfca0a874087edfcca63`
- 현재 브랜치: `main`
- 로컬 사용자 변경은 초기화·삭제하지 않았음
- 실제 Hosting 배포가 아직 없으므로 현재 테스트 앱은 그대로 유지됨
- 배포 후 문제가 생기면 Firebase Console의 Hosting 릴리스 기록에서 직전 정상 릴리스를 다시 게시한다.
- 화면 문제를 복구할 때 Database·Storage·Functions 규칙은 함께 되돌리지 않는다.

## 배포 직전 검사 결과

- 공개 폴더 화이트리스트 빌드: 104개 파일 성공
- 핵심 계약 검사: 56개 통과, 0개 실패
- 앱 기준선: STEP6.2.14.44 통과
- JavaScript 문법 검사: 통과
- Git 공백 오류 검사: 통과
- 로컬·배포 Realtime Database 규칙 읽기 전용 비교: 일치
- 관리자 동결 검사: 소스 및 공개 빌드 모두 일치
- 금지된 배포 경로 검사: 없음

## 승인 후 허용되는 배포 범위

오직 다음 범위만 허용한다.

```text
프로젝트: hearme2nite1205
서비스: Firebase Hosting만
소스: public/
```

Database, Storage, Functions 또는 메인 프로젝트가 명령에 포함되면 즉시 중단한다.

## 배포 후 필수 회귀

1. 테스트 앱 버전과 새 PWA 파일 확인
2. Dom과 Sub 각각 로그인 확인
3. 홈·기록·미션·관계·기록실·설정 진입 확인
4. `관리 전용` 중복 문구 제거 확인
5. Sub의 Dom 전용 영역 비노출 확인
6. 라이트·다크 및 모바일·Fold·태블릿·PC 확인
7. 콘솔 오류와 서비스워커 강제 새로고침 여부 확인

## 배포 실행 결과

- 배포 프로젝트: `hearme2nite1205`
- 배포 서비스: Firebase Hosting만
- 배포 파일: `public/` 104개
- Database·Storage·Functions 배포: 없음
- 메인 프로젝트 `our-baby-care` 배포: 없음
- Firebase Hosting 업로드·버전 확정·릴리스 성공

## 배포 후 기본 회귀 결과

- 실제 URL: `https://hearme2nite1205.web.app`
- 앱 제목: `HearMe2nite v1.0 STEP6.2.14.44`
- 새 브라우저 세션 로그인 및 홈 로딩 성공
- `관리 전용` 중복 접근성 문구 0건
- 360px 모바일 설정 화면 가로 넘침 및 화면 밖 요소 0건
- 새 브라우저 세션 warning/error 0건
- 기존 사용자 데이터 작성·삭제 없음

## 배포 후 Dom 실제 계정 회귀

- 현재 역할 `관리(Dom)` 확인
- 관리와 피드백 화면의 피드백·선물·주인 비공개 메모 노출 확인
- 우리의 기록 화면과 홈 복귀 확인
- 커스텀 미션에서 오늘의 약속·나의 루틴 표시 확인
- 오늘의 기록에서 기상·식사·사진·하루 기록 영역 표시 확인
- 접근성 트리의 `관리 전용` 중복 문구 0건
- 모바일 폭 가로 넘침 없음
- 새 warning/error 0건
- 데이터 입력·수정·삭제 없음
- Sub 실제 계정 회귀는 사용자 로그인 전환 후 별도 진행

## 배포 후 Sub 실제 계정 회귀

- 테스트 프로젝트의 Sub Auth UID, 사용자, Room 회원, 사용자 Room 인덱스 존재 확인
- Room 회원 역할 `partner`, 관계 역할 `sub` 확인
- 같은 UID의 `admins` 활성 관리자 권한 확인
- 홈에서 `주인의 메시지` 노출 및 Dom용 `관리와 피드백` 비노출 확인
- 오늘의 기록·식사 영역 정상 진입 확인
- 주인 비공개 메모가 `hidden`, `aria-hidden`, `inert`로 차단되는 것 확인
- 모바일 폭 가로 넘침 없음
- 새 브라우저 세션 및 기록 화면 warning/error 0건
- 첨부 로그의 `cardComments`, `conversationReads` 권한 경고는 현재 재현되지 않음
- 첨부 경고는 관리자 권한 또는 Room 연결 완료 전 발생해 기존 콘솔에 남은 로그로 판단
- 데이터 입력·수정·삭제 없음
