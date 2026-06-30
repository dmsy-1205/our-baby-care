# Rollback Guide

문제가 생기면 즉시 `HearMe2nite_v0.10.14_Access_Monitor.zip` 또는 안정 버전 `v0.10.13`으로 롤백하세요.

롤백 기준:
- 승인된 기존 사용자가 로그인하지 못함
- MasterOS `userAppAccess` 경로를 읽지 못함
- 자동 로그인 후 빈 화면 발생

데이터 구조 변경은 없으므로 롤백해도 기존 기록 데이터는 유지됩니다.
