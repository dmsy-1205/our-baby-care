# STEP5.6.2 프로필 사진 및 계정 카드 개선 보고서

## 적용
- Firebase Storage 기반 사용자 프로필 사진 업로드
- 중앙 정사각형 크롭 및 512×512 WEBP 자동 압축
- 사진 미리보기, 변경, 기본 이미지 복원
- Realtime Database에는 `users/{uid}/profile/photoURL`만 저장
- PC 상단 사용자 영역을 `닉네임 / 계정` 형식으로 압축
- 프로필 화면 시각적 개선

## 보호
- 기존 UID, Room, Invite, Presence, 기록 및 기존 채팅 데이터 변경 없음
- 사진 미설정 사용자는 기존 이니셜 아바타 사용
- 닉네임 미설정 사용자는 이메일 앞부분 사용

## 배포
Storage Rules가 추가되었으므로 최초 적용 시 `firebase deploy --only database,storage,hosting`을 사용한다.
