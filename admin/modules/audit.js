import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a10-recovery-clean-20260719';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a10-recovery-clean-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a10-recovery-clean-20260719';

const ACTION_LABELS = {
  request_memo_saved: '관리자 메모 저장',
  request_status_reviewing: '요청 검토 중',
  request_status_hold: '요청 보류',
  request_status_approved: '요청 승인',
  request_status_rejected: '요청 거절'
};

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

async function loadAuditLogs() {
  const database = getAdminDatabase();
  const snap = await database.ref('adminAuditLogs').limitToLast(80).once('value');
  return Object.entries(asObject(snap.val()))
    .map(([id, value]) => ({ id, ...asObject(value) }))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

function actionLabel(row) {
  return row.actionLabel || ACTION_LABELS[row.action] || row.action || '관리자 작업';
}

function actionClass(action) {
  if (String(action || '').includes('approved')) return 'ok';
  if (String(action || '').includes('rejected')) return 'danger';
  if (String(action || '').includes('hold')) return 'warn';
  return 'active';
}

function renderStats(rows) {
  const requestLogs = rows.filter((row) => row.target === 'dataDeleteRequest').length;
  const approvals = rows.filter((row) => row.action === 'request_status_approved').length;
  const memos = rows.filter((row) => row.action === 'request_memo_saved').length;
  const latest = rows[0]?.createdAt || 0;
  return `
    <div class="metric-grid admin-audit-metrics">
      <article class="metric-card"><span>최근 로그</span><strong>${rows.length}</strong><small>최대 80개 표시</small></article>
      <article class="metric-card"><span>데이터 요청</span><strong>${requestLogs}</strong><small>요청관리 작업</small></article>
      <article class="metric-card"><span>승인 기록</span><strong>${approvals}</strong><small>실행 전 검토 기준</small></article>
      <article class="metric-card"><span>최근 작업</span><strong>${escapeHtml(formatDateTime(latest))}</strong><small>마지막 로그 시간</small></article>
    </div>`;
}

function renderLogCard(row) {
  const statusText = row.statusBefore && row.statusAfter && row.statusBefore !== row.statusAfter
    ? `${row.statusBefore} → ${row.statusAfter}`
    : row.statusAfter || row.statusBefore || '-';
  const search = [row.action, actionLabel(row), row.adminEmail, row.requestedByEmail, row.roomCode, row.ownerUid, row.requestId].join(' ').toLowerCase();

  return `
    <article class="admin-audit-card" data-admin-audit-row data-search="${escapeHtml(search)}">
      <div class="admin-audit-head">
        <div>
          <strong>${escapeHtml(actionLabel(row))}</strong>
          <p>${escapeHtml(row.note || '관리자 작업 기록')}</p>
        </div>
        <span class="admin-request-status ${actionClass(row.action)}">${escapeHtml(formatDateTime(row.createdAt))}</span>
      </div>
      <div class="admin-request-meta">
        <span>관리자 ${escapeHtml(row.adminEmail || '-')}</span>
        <span>대상 ${escapeHtml(row.targetLabel || row.targetType || '-')}</span>
        <span>상태 ${escapeHtml(statusText)}</span>
        <span>Room ${escapeHtml(row.roomCode || '-')}</span>
        <span>요청 ID ${escapeHtml(compactId(row.requestId))}</span>
      </div>
    </article>`;
}

export async function render() {
  const rows = await loadAuditLogs();
  const list = rows.length
    ? `<div class="admin-audit-list">${rows.map(renderLogCard).join('')}</div>`
    : renderEmptyState('감사 로그 없음', '아직 기록된 관리자 작업이 없습니다.', '☰');

  return `
    <section class="module-view" aria-labelledby="auditHeading">
      <div class="foundation-notice">
        <div><span class="notice-icon" aria-hidden="true">☰</span></div>
        <div>
          <h2 id="auditHeading">감사 로그</h2>
          <p>관리자 요청 처리 과정에서 누가, 언제, 어떤 상태를 남겼는지 확인합니다. 실제 삭제 실행 전 기준점으로 사용합니다.</p>
        </div>
      </div>
      ${renderStats(rows)}
      <article class="panel">
        <div class="panel-header admin-audit-panel-header">
          <div>
            <h2>최근 관리자 작업</h2>
            <p>요청관리의 답변 · 메모 · 상태 변경 기록을 최신순으로 보여줍니다.</p>
          </div>
          <input class="admin-user-search" type="search" placeholder="로그 검색" data-admin-filter="admin-audit-row">
        </div>
        ${list}
      </article>
    </section>`;
}
