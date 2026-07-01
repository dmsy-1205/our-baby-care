# HearMe2nite RC2.12 History 2.0 Stable

기준 원본: RC2.11.4 Stable Source Integrated FULL

## 핵심 변경
- 지난 기록실 상단 버전 표기를 RC2.12로 갱신
- 날짜별 통합 타임라인 추가
- 검색 기능 추가: 미션, 메모, 루틴, 식사 등 저장된 텍스트 검색
- 기록 유형 필터 추가: 전체 / 맞춤 루틴 / 미션 / 사진 / 기분
- 캘린더가 검색/필터 조건에 맞는 날짜만 활성화되도록 개선
- 맞춤 루틴 기록 여부가 History 타임라인과 캘린더 아이콘에 표시됨

## 안정성 원칙
- Firebase 저장 구조 변경 없음
- rooms/{roomCode}/days/{date} 기존 기록 구조 유지
- 기존 Custom Routine / Mission / Calendar / AutoSave 코드 흐름 유지
- UI 렌더링 오버라이드 방식으로 적용

## QA
- JS 문법 검사 통과: js/*.js 전체 node --check
