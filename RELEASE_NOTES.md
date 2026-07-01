# Latest: RC2.16 Branding STEP1

- Quiet Love v1.0 branding polish applied.
- Header, cards, buttons, presence dots visual style refined.
- No Firebase/Room/History data path changes.

---

# HearMe2nite v0.10.22 Room Boot Recovery Hotfix

## 목적
- 기존 방에서 사용자가 튕겨나가거나 새 방 생성 화면으로 떨어지는 문제를 안정화합니다.
- 로그인/승인/방 복구 순서를 안전하게 정리합니다.

## 수정
- room.js 내부 일부 함수에서 정의되지 않은 uid 참조를 currentUser.uid로 수정했습니다.
- users/{uid}/activeRoom이 비어 있거나 접근 실패해도 userRooms와 roomMembers 기준으로 기존 방을 자동 복구합니다.
- 복구 성공 시 users/{uid}/activeRoom, userRooms/{uid}/{roomCode}, users/{uid}/relationshipRole을 다시 보정합니다.
- Access Gate, History Render, AutoSave 저장 구조는 변경하지 않았습니다.

## 테스트 순서
1. 승인된 owner 계정 로그인
2. 새로고침 후 dmsy 방 유지 확인
3. 승인된 partner 계정 로그인
4. 새로고침 후 dmsy 방 유지 확인
5. 로그아웃 후 재로그인 확인
6. 미승인 계정 차단 확인


## RC2.14.3 SAFE Integrated

- RC2.12.2 정상본 기준 안전 통합
- RC2.14 홈 UX/오늘의 약속/오늘의 요약 모달 반영
- RC2.13 Room Presence 계열 제외
- 변경 파일: index.html, css/style.css, js/custom-routine.js, js/product.js


## RC2.15.1 History UX STEP2
- 사진 모아보기 카드형 갤러리 정리
- 하루 기록 날짜별 카드 리스트 정리
- 기록실 여백/카드 간격 정리
- Firebase/Room/History 데이터 구조 변경 없음

## RC2.16.1 PC Layout Optimization
- PC 전용 CSS 레이아웃 최적화 추가
- 기능 JS 변경 없음
- 모바일 기존 구조 유지


## RC2.17 Desktop Dashboard STEP1
- PC 전용 3열 대시보드 레이아웃 적용
- 기록실 모달 PC 2열 구조 적용
- CSS-only 변경으로 기능 로직은 변경하지 않음
