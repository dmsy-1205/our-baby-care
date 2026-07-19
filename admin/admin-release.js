export const ADMIN_RELEASE = Object.freeze({
  step: 'STEP A14.1',
  label: 'Backup Registry & Integrity',
  cacheKey: 'admin-2-0-a14-1-backup-registry-20260719',
  releaseDate: '2026.07.19',
  stage: 'Beta',
  deletionMode: 'LOCKED',
  changes: Object.freeze([
    '삭제 요청별 서버 운영 스냅샷 생성',
    'SHA-256 체크섬 무결성 검증',
    '백업 등록부와 승인 엔진 연결',
    '영구 삭제 실행 스위치 OFF 유지'
  ])
});
