# 배포 가이드

1. 최신 Full Source를 GitHub `main`에 Push한다.
2. GitHub Actions에서 Firebase Hosting workflow를 연다.
3. `Run workflow`를 수동 실행한다.
4. 완료 후 앱 내부 버전과 QA BOOT 버전을 확인한다.
5. 브라우저 캐시가 남으면 강력 새로고침한다.

자동 배포 복구는 현재 우선순위가 아니다.

## Realtime Database Rules 적용

현재 GitHub Actions Workflow는 Firebase Hosting만 배포합니다.
따라서 GitHub에 `database.rules.json`을 Push해도 Realtime Database Rules는 자동 적용되지 않습니다.

STEP5.6.4.2 배포 순서:

1. Full Source를 GitHub `main`에 Push하고 Hosting Workflow를 실행합니다.
2. Firebase Console → Realtime Database → Rules에서 `database.rules.json` 내용을 붙여넣습니다.
3. 게시 전에 현재 Rules를 별도 파일로 백업합니다.
4. 게시 후 Owner와 Partner/Sub 양쪽에서 채팅 송수신 및 읽음 상태를 확인합니다.
5. `permission_denied` 발생 시 Rules를 약화시키지 말고 오류 경로를 먼저 확인합니다.

CLI를 사용할 경우 프로젝트 루트에서 다음 명령만 별도로 실행합니다.

```bash
firebase deploy --only database
```

`firebase deploy` 전체 명령은 Functions 등 다른 리소스까지 배포할 수 있으므로 사용하지 않습니다.
