# HearMe2nite v0.9.52 Login/Home Visibility Hotfix

## 수정 내용
- 로그인 성공 후 로그인 화면 아래에 홈 화면이 같이 보이는 문제 수정
- `display:grid !important`가 `display:none`을 덮어쓰는 CSS 우선순위 문제 해결
- 로그인 상태에서는 `body.hm-authenticated`로 화면 상태를 명확하게 분리

## 변경하지 않은 영역
- Firebase Auth 구조
- Room 구조
- History 저장/로드
- AutoSave
- DB Key
- 기존 사용자 데이터
