# HearMe2nite v1.0 STEP5.6.1.7.1 접근성·버전 표시 핫픽스

## 변경 사항
- 화면 제목과 버전 배지를 STEP5.6.1.7.1로 통일
- 모든 로컬 CSS/JavaScript 캐시 쿼리를 동일한 STEP5.6.1.7.1 키로 통일
- 관리자 삭제 요청 모달 닫기 시 내부 포커스를 먼저 해제한 뒤 `aria-hidden=true` 적용
- 닫힌 관리자 모달에 `inert` 적용, 열 때 제거
- 관리자 모달을 닫은 뒤 상단 `관리` 버튼으로 포커스 복귀

## 변경하지 않은 영역
- Firebase Authentication
- Realtime Database 구조 및 Rules
- Room 및 Membership
- 삭제 요청 처리 로직
- 관리자 메모 저장 로직
- 실제 데이터 삭제 기능
