# QA 체크리스트

## 필수
- 로그인·로그아웃·이메일 인증
- Room 생성·입장·초대·복구
- 날짜 변경 후 기록 저장·불러오기
- 오늘의 미션·주간 루틴 요일 필터
- 채팅 전송·수신·읽지 않은 배지
- 기록실 캘린더·사진 갤러리
- 관리와 피드백 권한 및 저장
- 오늘의 선물 권한 및 저장
- 모바일·태블릿·PC 레이아웃

## 콘솔
- JavaScript SyntaxError 없음
- Firebase permission_denied 없음
- currentUser null 오류 없음
- 중복 DOM id 없음
- `Unchecked runtime.lastError`는 확장 프로그램 메시지인지 구분


## STEP5.6.4.1.1 보안 호환성 QA

배포 후 브라우저 개발자 도구 Console에서 다음을 실행한다.

```js
await hmRunSecurityCompatibilityQA()
```

### 기존 Owner / Dom 계정

- `membershipExists: true`
- `ownerNoteListenerExpected: true`
- `ownerNoteListenerConnected: true`
- warnings 0 또는 원인이 설명 가능한 상태
- errors 0

### 기존 Partner / Sub 계정

- `membershipExists: true`
- `ownerNoteListenerExpected: false`
- `ownerNoteListenerConnected: false`
- 비공개 메모 관련 `permission_denied` 반복 없음
- errors 0

### 관리자 계정

- `adminValueIsTrue: true`
- 삭제 요청 관리 버튼 표시 및 목록 읽기 정상

### 일반 사용자

- `adminValueIsTrue: false`
- 관리자 버튼 미표시

결과 재확인:

```js
hmGetLastSecurityCompatibilityReport()
```
