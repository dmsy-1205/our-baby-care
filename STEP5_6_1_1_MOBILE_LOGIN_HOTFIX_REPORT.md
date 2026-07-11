# STEP5.6.1.1 모바일 로그인 화면 축소 핫픽스

## 기준 버전
HearMe2nite_v1.0_STEP5.6.1_PROFILE_NICKNAME_FULL

## 수정 범위
- 760px 이하 로그인/회원가입 화면만 수정
- 상단 브랜드 영역을 작은 가로형 헤더로 축소
- 큰 배지와 서비스 특징 배지 모바일에서 숨김
- 로그인 입력 영역의 여백과 높이 축소
- 로그인 탭, 이메일, 비밀번호, 로그인 버튼이 첫 화면에 최대한 보이도록 조정
- PC 화면과 앱 로그인 이후 화면은 변경하지 않음

## 변경하지 않은 영역
- Firebase 설정 및 Rules
- Authentication
- 이메일 인증
- 기존 UID 및 Room
- 기록, 채팅, Presence, Invite
- 닉네임 저장 및 채팅 이름 고정
- GitHub Actions
