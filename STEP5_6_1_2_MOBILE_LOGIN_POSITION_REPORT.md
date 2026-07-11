# STEP5.6.1.2 모바일 로그인 세로 정렬 보정

## 기준 버전
HearMe2nite_v1.0_STEP5.6.1.1_MOBILE_LOGIN_HOTFIX_FULL

## 수정 내용
- 휴대폰 세로 화면에서 로그인 전체 영역 위쪽에 자연스러운 여백 추가
- 브랜드 헤더가 상태바 바로 아래에 붙어 보이는 현상 완화
- 로그인 버튼은 첫 화면 안에 유지
- 화면 높이가 짧은 기기에서는 여백을 자동 축소
- 태블릿, 가로 화면, PC는 변경하지 않음

## 변경하지 않은 영역
- Firebase 설정 및 Rules
- Authentication 및 이메일 인증
- 기존 UID, Room, 기록, 채팅, Presence, Invite
- 닉네임 저장 및 채팅 이름 고정
- GitHub Actions
