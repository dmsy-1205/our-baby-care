# Firebase 규칙 읽기 전용 차이 검사

## 목적

로컬 `database.rules.json`과 테스트 프로젝트에 실제 배포된 Realtime Database 규칙이 같은지 확인합니다. 이 검사는 규칙과 데이터를 수정하거나 배포하지 않습니다.

## 실행

```powershell
node scripts/audit-deployed-database-rules.js --project test
```

## 결과

- 종료 코드 `0`: 로컬 규칙과 배포 규칙이 같습니다.
- 종료 코드 `2`: 규칙 차이가 있습니다. 화면에는 차이가 난 규칙 경로만 표시합니다.
- 종료 코드 `1`: 로그인, Firebase CLI 또는 JSON 조회 문제로 검사를 완료하지 못했습니다.

차이가 있을 때 로컬 규칙을 바로 배포하지 않습니다. 먼저 배포 규칙을 기준으로 변경 목적과 영향 범위를 검토하고 사용자 승인을 받아야 합니다.
