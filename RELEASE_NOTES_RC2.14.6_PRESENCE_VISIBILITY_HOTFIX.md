# RC2.14.6 Presence Visibility Hotfix

## 목적

같은 PC에서 일반 창과 시크릿 창으로 두 계정을 동시에 접속할 때, 창 전환만으로 상대가 오프라인으로 표시되는 문제를 수정했습니다.

## 수정 내용

- `visibilitychange`에서 `online:false`를 쓰지 않도록 변경
- 탭/창이 다시 visible이 될 때만 Presence refresh 수행
- 오프라인 처리는 기존처럼 `logout`, `beforeunload`, Firebase `onDisconnect()` 기준으로 유지

## 수정 파일

- `js/presence.js`
- `presence.js`
