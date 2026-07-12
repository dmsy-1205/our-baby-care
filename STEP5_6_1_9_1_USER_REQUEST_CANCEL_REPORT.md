# HearMe2nite v1.0 STEP5.6.1.9.1 사용자 삭제 요청 취소 개선

## 목표
사용자가 데이터 삭제 요청을 관리자 최종 승인 전에 안전하게 취소할 수 있도록 취소 흐름을 명확히 한다.

## 취소 가능 상태
- pending: 접수됨
- reviewing: 검토 중
- hold: 보류

## 취소 불가 상태
- approved: 승인
- processing: 처리 중
- completed: 처리 완료
- rejected: 거절
- failed: 처리 실패
- canceled: 사용자 취소

## 구현 내용
- 사용자 요청 카드에 `삭제 요청 취소` 버튼 표시
- 취소 전 확인 대화상자 표시
- Firebase transaction을 사용하여 관리자 상태 변경과 사용자 취소가 동시에 일어나는 경쟁 상태 방지
- 취소 성공 시 `canceled` 상태와 취소 시각 저장
- 취소된 요청 기록은 삭제하지 않고 운영 이력으로 보존
- 관리자 화면 전체 목록에서 `사용자 취소` 상태 확인 가능

## 변경하지 않은 영역
- Room 연결 해제 서버 엔진
- Firebase Rules
- Authentication
- Room 데이터 구조
- 공동 Room 기록
