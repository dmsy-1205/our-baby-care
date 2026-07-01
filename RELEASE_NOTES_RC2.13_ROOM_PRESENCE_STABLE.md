# HearMe2nite RC2.13 Room Presence Stable

## 기준
- RC2.12.2 History Popup First Hotfix 기준

## 적용 내용
- 관리(Dom) 화면에서 기록(Sub)의 접속 상태 확인 기능 추가
- 우리의 공간 모달 안에 상대 상태 카드 추가
- 표시 정보
  - 온라인 / 오프라인
  - 상대 계정 요약
  - 마지막 접속 시간
- Firebase 기존 구조 변경 없음
  - roomMembers/{roomCode}/{uid} 하위에 online, lastSeen, lastActiveAt 부가 필드만 추가
- 60초 단위 접속 상태 갱신
- 2분 30초 이상 갱신이 없으면 오프라인으로 표시

## 유지한 규칙
- 중앙 모달 유지
- 카드형 UI 유지
- 홈 화면 복잡도 증가 없음
- 캘린더 상단 고정 규칙 유지
- 기존 History / Room / Custom Routine 데이터 구조 변경 없음

## QA
- JS 문법 검사 통과
- 기존 Firebase 경로 호환 유지
