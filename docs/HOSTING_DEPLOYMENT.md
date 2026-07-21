# HearMe2nite Hosting 배포

현재 메인 앱 빌드: `v1.0 STEP6.2.13.7 · Daily Moments Gallery`

## 연결 환경

| 구분 | Firebase 별칭 | 프로젝트 ID | Hosting 주소 |
|---|---|---|---|
| 테스트 | `test` | `hearme2nite1205` | `https://hearme2nite1205.web.app` |
| 메인 | `prod` | `our-baby-care` | `https://our-baby-care.web.app` |

각 Hosting은 `/__/firebase/init.js`에서 자신이 배포된 Firebase 프로젝트 설정을 자동으로 가져옵니다. 따라서 같은 소스 파일을 배포해도 테스트와 메인의 인증 및 데이터베이스는 서로 섞이지 않습니다.

## 배포 명령

테스트와 메인에 함께 배포합니다. 안전을 위해 테스트를 먼저 배포하고, 성공한 경우에만 메인 배포를 진행합니다.

```powershell
.\scripts\deploy-hosting.ps1
```

테스트에만 배포:

```powershell
.\scripts\deploy-hosting.ps1 -Target Test
```

메인에만 배포:

```powershell
.\scripts\deploy-hosting.ps1 -Target Production
```

이 스크립트는 Hosting만 배포합니다. Functions, Realtime Database 규칙, Storage 규칙은 변경하지 않습니다.

다중 사진 기능을 처음 배포할 때는 보안 규칙을 먼저 반영합니다. 테스트 프로젝트에는 Database와 Storage 규칙을, 현재 메인에는 Database 규칙만 반영합니다.

```powershell
.\scripts\deploy-moments-rules.ps1
```

그 다음 테스트 Hosting을 배포해 검수하고, 이상이 없을 때 메인 Hosting을 배포합니다.

## GitHub 배포 이름

- 브랜치: `codex/main-6-2-13-7-daily-moments-gallery`
- 커밋: `feat(moments): add dual-storage daily photo gallery`
- 태그: `hearme2nite-main-v1.0-step6.2.13.7`
- 릴리스 제목: `HearMe2nite MAIN v1.0 STEP6.2.13.7 — Daily Moments Gallery`
