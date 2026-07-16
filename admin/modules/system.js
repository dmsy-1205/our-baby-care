import { renderEmptyState } from '../components/empty-state.js';
export function render() {
  return `<section class="module-view"><article class="panel"><div class="panel-header"><div><h2>시스템 모듈</h2><p>독립 모듈이 정상적으로 로드되었습니다.</p></div><span class="status-pill">준비됨</span></div>${renderEmptyState('Phase 2에서 데이터 연결', 'Phase 2에서 Firebase 연결과 운영 상태를 연결합니다.')}</article></section>`;
}
