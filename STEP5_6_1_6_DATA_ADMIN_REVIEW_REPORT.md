# HearMe2nite v1.0 STEP5.6.1.6
## 운영자 전용 데이터 삭제 요청 관리

### 적용 내용
- `admins/{uid}`에 등록된 계정만 상단에 `관리` 버튼 표시
- 운영자 전용 삭제 요청 목록 및 상태 필터
- 검토 중 / 보류 / 승인 / 거절 처리
- 사용자에게 전달할 답변 저장
- 관리자 내부 메모 별도 경로 저장
- 실제 Auth/Database/Storage 삭제는 실행하지 않음
- 사용자 요청 경로를 권한 분리가 가능한 전용 경로로 변경

### 새 Firebase 경로
- `dataDeleteRequests/{requesterUid}/{requestId}`
- `dataDeleteRequestAdminNotes/{requesterUid}/{requestId}`

### 중요
이번 STEP의 새 요청 기능을 사용하려면 `database.rules.json`을 Realtime Database Rules에 배포해야 합니다.
Hosting 자동배포만으로 Database Rules는 배포되지 않습니다.

```bash
firebase deploy --only database
```

### 관리자 등록
Firebase Realtime Database에 다음 구조가 있어야 합니다.

```json
{
  "admins": {
    "관리자_UID": true
  }
}
```

### 안전 범위
- Room/Auth/Storage 구조 변경 없음
- 실제 삭제 없음
- 일반 사용자는 자신의 요청만 읽기 가능
- 일반 사용자는 요청 생성 및 제한된 취소만 가능
- 상태 승인/거절 및 내부 메모는 관리자만 가능
