# HearMe2nite v1.0 STEP5.1 검토 보고서

## 기준 버전
- HearMe2nite_v1.0_STEP4_STABLE_BASE_FULL.zip

## 검토 결과
- Firebase 프로젝트: `our-baby-care` 유지
- Firebase Authentication 직접 로그인/회원가입 코드 확인
- 기존 UID를 재생성하거나 변환하는 코드 없음
- 기존 `users/{uid}/activeRoom` 기반 Room 복구 흐름 유지
- Room 생성, Invite 생성/참여, Owner/Partner, relationshipRole, Presence 코드 확인
- 전체 JavaScript 문법 검사 통과
- Git 작업 트리 기준 원본 ZIP은 변경 사항 없는 안정 상태였음

## 발견된 문제
1. 초대문구에 과거 HearU2nite 로그인 안내가 남아 있었음
2. 비로그인 상태의 초대 참여 안내에도 HearU2nite 계정 문구가 남아 있었음
3. README와 QA 문서에 승인 사용자/Access Gate 관련 과거 설명이 남아 있었음
4. favicon 파일이 없어 브라우저에서 404가 발생할 수 있었음

## STEP5.1 수정 내용
- 사용자 초대문구를 HearMe2nite 독립 로그인 기준으로 수정
- 초대 링크 비로그인 안내에 로그인 또는 회원가입 안내 추가
- README, QA 체크리스트, 핵심 구조 문서의 오래된 인증 설명 정리
- 인라인 favicon 추가로 `favicon.ico 404` 요청 방지

## 변경하지 않은 영역
- Firebase 설정값
- Firebase Authentication 계정/UID
- Realtime Database 경로 및 데이터 구조
- Room 코드와 Room 데이터
- Invite 데이터 구조
- Presence 데이터 구조
- Firebase Rules
- 자동 저장 및 기록실 데이터 구조

## 판정
이번 변경은 데이터 구조를 건드리지 않는 저위험 UX/문서 정리 단계이다.
기존 사용자 4명과 운영 Room 2개에 대한 마이그레이션은 필요하지 않다.
