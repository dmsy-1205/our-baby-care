# HearMe2nite

## STEP5.6.4.2 보안 변경

- 신규 채팅 메시지는 로그인 UID와 `senderUid`가 일치해야 저장됩니다.
- 채팅 발신 이메일은 Firebase 인증 이메일과 일치해야 합니다.
- 신규 메시지는 1~2,000자로 제한됩니다.
- `chatReadStatus/{uid}` 쓰기는 해당 사용자 본인 또는 관리자만 가능합니다.
- 기존 채팅 데이터와 기존 Room 경로는 변경하지 않습니다.
- GitHub Actions는 Hosting만 배포하므로 `database.rules.json`은 별도로 적용해야 합니다.


현재 공식 기준: **HearMe2nite v1.0 STEP5.6.4.2**

- Repository: `our-baby-care`
- Branch: `main`
- 개발 원칙: Stability First / Full Source Only
- 배포: GitHub Push → GitHub Actions → Run Workflow → Firebase Hosting

상세 문서는 `docs/` 폴더를 확인합니다.
