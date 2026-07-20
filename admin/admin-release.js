export const ADMIN_RELEASE = Object.freeze({
  step: 'STEP A17.2.1',
  label: 'Duplicate Reply Guard',
  cacheKey: 'admin-2-0-a17-2-1-duplicate-reply-guard-20260721',
  releaseDate: '2026.07.21',
  stage: 'Beta',
  deletionMode: 'GUARDED_BETA',
  changes: Object.freeze([
    '문의 화면 재진입 시 누적되던 저장 이벤트 제거',
    '문의별 중복 저장 잠금 추가',
    '사용자 앱 문의 작성·관리자 공개 답변 경로 재연결',
    '답변 알림·추가 답변·만족도 평가 연결 복원',
    '관리자 권한 데이터 형식 호환성 보강',
    '대시보드·사용자 목록 30초 자동 갱신, 사용자 수동 새로고침 추가',
    'MAIN STEP6.2.13.4 CLEAN BASELINE 호환 재구성',
    '검증 백업과 독립 2차 승인 후 실제 삭제 유지',
    '관리자 A12~A17 운영 기능 유지',
    '메인 앱 후속 기능과 CSP 변경 제외'
  ])
});
