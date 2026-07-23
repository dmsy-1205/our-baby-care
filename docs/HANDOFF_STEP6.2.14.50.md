# HearMe2nite STEP6.2.14.50 베타 완료 인수인계

작성일: 2026-07-23

## 기준 상태

- 앱 버전: `v1.0 STEP6.2.14.50`
- 베타 체크포인트: `3687219 HearMe2nite_STEP6.2.14.49_beta_checkpoint`
- 테스트 Hosting: `https://hearme2nite1205.web.app`
- 공개 빌드: 104개 파일
- 카드 배치와 기존 2열 구조 유지
- 관리자 앱, 메인 Hosting, Database, Storage, Functions 및 규칙 미변경·미배포

## STEP6.2.14.50 완료 내용

- 신규 회원가입 비밀번호를 8자리 이상으로 강화했다.
- 기존 계정 로그인에는 새 길이 제한을 적용하지 않아 호환성을 유지했다.
- 로그인 화면에 신규 가입 비밀번호 정책을 명시했다.
- `js/qa.js`의 `eval()` 기반 함수 확인을 안전한 전역 참조로 교체했다.
- 테스트 Hosting에 `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`를 적용했다.
- CSP는 현재 인라인 부트 스크립트와 Firebase SDK 호환성 검토 전까지 강제 적용하지 않았다.

## 최종 검증

- 핵심 계약: 84개 통과, 실패 0개
- Dom/Sub 세션 회귀: 통과
- CSS: 604,447 / 604,447 bytes, 34개 레이어
- `index.html`: 1,366 / 1,366줄
- 인라인 이벤트: 0개
- 공개 빌드: 104개
- JavaScript 및 서비스워커 문법: 통과
- Git 공백 오류 검사: 통과
- 테스트 Hosting 응답: HTTP 200
- 실제 응답 헤더: `nosniff`, `DENY`, `strict-origin-when-cross-origin`
- 배포 HTML에서 STEP6.2.14.50 및 8자리 정책 확인
- PC 및 Fold 실제 배포 렌더링 확인

## 실제 기기 최종 확인 항목

- iPhone 홈 화면 PWA를 삭제하지 않은 상태에서 반복 실행
- 회원가입 탭에서 7자리 거부, 8자리 허용 확인
- 기존 Dom/Sub 계정 로그인 확인
- 비밀번호 보기·숨김 및 재설정 메일 확인
- Dom/Sub 닉네임, 저장, 코멘트와 알림 확인

## 동결 및 후속 작업

- 푸시 알림, CSP 강제 적용, Functions Node 통일, 관리자 스키마 마이그레이션은 별도 단계다.
- 메인 Firebase 프로젝트 배포는 사용자 승인 전까지 금지한다.
- iPhone PWA 문제는 실제 기기 재현 없이 추측 수정하지 않는다.
