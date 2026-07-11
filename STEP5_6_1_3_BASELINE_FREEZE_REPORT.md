# HearMe2nite v1.0 STEP5.6.1.3 안정 기준 정리 보고서

작성일: 2026-07-12

## 기준

- 실제 GitHub 저장소 ZIP: `our-baby-care(1).zip`
- 브랜치: `main`
- 기준 커밋: `c19c825`
- 기준 버전: `HearMe2nite_v1.0_STEP5.6.1.3_COMPACT_ACCOUNT_BAR_FULL`

## 이번 STEP 변경 범위

- HTML 문서 제목을 STEP5.6.1.3으로 통일
- 내부 QA 버전 문자열을 STEP5.6.1.3으로 통일
- 변경된 정적 파일의 캐시 버전 문자열 갱신
- QA 체크리스트 기준 버전과 Compact Account Bar 검수 항목 정리

## 변경하지 않은 영역

- Firebase Authentication
- Realtime Database 구조 및 경로
- Firebase Rules
- Firebase Storage
- Room 생성, 입장, 복구, Membership
- 닉네임 저장 구조
- 채팅, 기록실, 일일 기록
- GitHub Actions 자동배포 Workflow

## 정적 QA 결과

- JavaScript 문법 검사 통과
- JSON 문법 검사 통과
- HTML 중복 ID 검사 통과
- 로컬 CSS/JavaScript 참조 검사 통과
- Firebase 프로젝트 ID 및 Database URL 유지 확인

## 배포 후 수동 QA 필요

실제 Firebase와 로그인 데이터가 필요한 다음 항목은 배포 후 확인한다.

- 기존 사용자 4명 로그인
- 운영 Room 2개 자동 복구
- 프로필, 데이터, 로그아웃 버튼
- 채팅 및 기록실
- 모바일, Fold, 태블릿, PC 화면
- Console `hmPrintQaSummary()` 결과 `errors: 0`

## 주의

`.github/workflows/firebase-hosting-merge.yml`은 업로드 당시 커밋되지 않은 변경 상태였으며, 자동배포 복구 보류 방침에 따라 이번 STEP에서는 수정하지 않았다.
