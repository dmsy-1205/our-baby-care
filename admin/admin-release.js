export const ADMIN_RELEASE = Object.freeze({
  step: 'STEP A17.1',
  label: 'Guarded Deletion Execution',
  cacheKey: 'admin-2-0-a17-1-guarded-deletion-execution-20260720',
  releaseDate: '2026.07.20',
  stage: 'Beta',
  deletionMode: 'GUARDED_BETA',
  changes: Object.freeze([
    '검증 백업과 독립 2차 승인 후 실제 삭제',
    'Room 전체 데이터와 연결 경로 일괄 삭제',
    '계정 개인 데이터와 Firebase Auth 계정 삭제',
    '실행 직전 체크섬 검증과 삭제 감사 로그'
  ])
});
