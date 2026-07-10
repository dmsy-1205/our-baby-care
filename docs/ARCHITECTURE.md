# HearMe2nite Architecture

## 기준

RC2.18은 `HearMe2nite_RC2.17.3_ExerciseCard_FULL`을 기준으로 합니다.

## 핵심 구조

```text
Authentication
  ↓
HearMe2nite 독립 인증
  ↓
Room
  ↓
Presence
  ↓
Daily Record
  ↓
History
  ↓
Anniversary
  ↓
Exercise
  ↓
Chat
  ↓
UI / Popup / Responsive
```

## Authentication

Firebase Authentication을 통해 HearMe2nite 계정으로 직접 로그인합니다.

## Room

모든 데이터는 Room을 기준으로 연결됩니다. Room 구조는 변경 금지 대상입니다.

## Presence

상대방 Online / Offline, Heartbeat, 마지막 접속 시간을 관리합니다.

## Daily Record

오늘의 컨디션, 하루 기록, 운동, 체중, 수분, 식사, 취침, 외출 등의 입력을 담당합니다.

## History

날짜별 기록을 저장하고 Calendar에서 조회합니다.

## Anniversary

사용자 기념일을 저장하고 캘린더에 아이콘으로 표시합니다.

## Exercise

오늘의 운동 기록을 Daily와 History에 함께 반영합니다.

## Chat

같은 Room 사용자 간 실시간 대화를 담당합니다.

## Popup

Daily, Mission, Room, History, Help Center 등 대부분의 입력은 팝업 중심 UX를 유지합니다.

## Responsive

Mobile, Fold, Tablet, PC 화면에서 깨지지 않는 것을 필수 조건으로 합니다.
