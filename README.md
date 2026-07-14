# HearMe2nite v1.0 STEP5.6.4.6.6

초대코드와 Room 가입 보안을 강화한 Full Source입니다.

- 초대코드 transaction 선점
- 재사용 및 동시 사용 차단
- usedByUid / 이메일 검증
- 귀속된 사용자만 Partner 멤버십 생성
- partnerUid 위조 및 추가 Partner 차단

GitHub Actions는 Hosting만 배포합니다. `database.rules.json`은 Firebase Realtime Database Rules에 별도로 게시해야 합니다.


## STEP5.6.4.6.3 RTDB Rules Boolean Hotfix
- Replaced unsupported boolean negation on `newData.child('used').val()` with explicit `=== false` / `=== true` comparisons.
- No application behavior or Firebase path changes.

## STEP5.6.4.6.6

이전 공간 전환 시 기존 멤버십을 다시 저장하지 않도록 수정했습니다. 가입 당시 `joinedAt`과 `inviteCode`를 보존하며 활성 공간 정보만 변경합니다.

## STEP5.6.4.6.5
Realtime Database invite child fields are explicitly declared so normal invite creation is allowed while unknown fields remain blocked.
