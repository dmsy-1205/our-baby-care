# RC2.14.8 Home Presence Indicator

## 변경 목적
홈 화면 상단 버전 표시 줄 오른쪽에 접속 상태 점 2개를 추가했습니다.

## 표시 규칙
- 첫 번째 점: 나
- 두 번째 점: 상대
- 초록색: 온라인
- 회색: 오프라인 / 미연결

## 수정 파일
- index.html
- css/style.css
- js/presence.js
- presence.js

## 주의
Firebase Room / Invite / History / Presence 데이터 구조는 변경하지 않았습니다.
기존 우리의 공간 모달의 상세 Presence 표시는 유지됩니다.
