# HearMe2nite RC2.17.3 Exercise Card

## 변경 사항
- 오늘의 컨디션 영역에 `🏃 오늘의 운동` 카드 추가
- 운동 입력 모달 추가
- Firebase 일일 기록에 `exercise` 필드 저장/복구
- 오늘 하루 최종 복사 내용에 운동 기록 포함
- 기록실 상세 보기 기본 기록 영역에 운동 기록 표시

## 유지
- Firebase Room / Invite / Presence 구조 변경 없음
- 기존 History 데이터 호환 유지
- 우리의 공간 / 기념일 / 캘린더 구조 변경 없음

---


## RC2.17.2 Anniversary Upcoming Day
- Anniversary preview limited to upcoming 3 items.
- Full anniversary list moved to management modal.
- Representative date can be used for together-day badge in calendar header.

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

## RC2.17 Pixel Polish

- CSS-only polish based on RC2.16 Branding STEP1.
- Reduced chat height and tightened header/login spacing.
- Kept room, Firebase, Presence, History, Invite logic unchanged.


## RC2.17.1 Anniversary Panel List
- 우리의 기념일 카드 안에 등록된 기념일 목록을 직접 표시합니다.
- 설명 박스를 제거하고 제목 아래 회색 설명 한 줄만 유지합니다.
- 생일/여행/기념일 등 모든 타입의 기념일이 동일 목록에 표시되도록 정리했습니다.
