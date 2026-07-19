export const ADMIN_RELEASE = Object.freeze({
  step: 'STEP A13.2',
  label: 'Approval Queue Visibility',
  cacheKey: 'admin-2-0-a13-2-approval-queue-visibility-20260719',
  releaseDate: '2026.07.19',
  stage: 'Beta',
  deletionMode: 'LOCKED',
  changes: Object.freeze([
    '관리자 버전 단일 기준 통합',
    '감사 로그에 삭제 승인 대기열 상태 연결',
    '시스템 화면에 백업·2차 승인 준비 상태 표시',
    '영구 삭제 실행 스위치 OFF 유지'
  ])
});
