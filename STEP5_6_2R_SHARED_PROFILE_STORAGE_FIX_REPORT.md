# STEP5.6.2R 프로필 저장 수정 및 상대 프로필 통합 보고서

## 확인된 저장 실패 원인
기존 GitHub Actions는 Firebase Hosting만 자동 배포했습니다. STEP5.6.2에서 새로 추가된 `storage.rules`는 GitHub Push만으로 배포되지 않았기 때문에, 사진 미리보기는 가능하지만 실제 Storage 업로드가 권한 거부될 수 있었습니다.

## 수정
- main Push 시 Realtime Database Rules와 Storage Rules를 먼저 자동 배포
- Storage 오류 코드별 사용자 안내
- 사진 업로드 후 DB 저장 실패 시 업로드 파일 롤백
- `users/{uid}/profile`과 현재 `roomMembers/{roomCode}/{uid}/profile` 동시 저장
- 우리의 공간에서 두 사람 사진/닉네임/역할/온라인 상태 표시
- 채팅에 프로필 사진과 닉네임 표시
- 이메일은 상대 프로필에 표시하지 않음
- 기존 메시지 내용과 sender 필드는 유지

## QA
- Firebase Rules JSON 파싱
- JavaScript 문법 검사
- ZIP 무결성 검사
- GitHub Actions YAML 구조 확인
