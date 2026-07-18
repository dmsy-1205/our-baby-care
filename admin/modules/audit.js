import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a12-action-guard-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a12-action-guard-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a12-action-guard-20260718';

const ACTION_LABELS = {
  '요청 검토 중': '요청 검토 중',
  '요청 보류': '요청 보류',
  '요청 승인': '요청 승인',
  '요청 거절': '요청 거절',
  '관리자 메모 저장': '관리자 메모 저장',
  request_memo_saved: '관리자 메모 저장',
  request_status_reviewing: '요청 검토 중',
  request_status_hold: '요청 보류',
  request_status_approved: '요청 승인',
  request_status_rejected: '요청 거절'
};

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (text.length <= 12) return text || '-';
  return `${text.slice(0, 6)}…${text.slice(-5)}`;
}

function actionLabel(row) {
  return row.actionLabel || ACTION_LABELS[row.action] || row.action || '관리자 작업';
}

function actionClass(action) {
  const text = String(action || '');
  if (text.includes('승인') || text.includes('approved')) return 'ok';
  if (text.includes('거절') || text.includes('rejected')) return 'danger';
  if (text.includes('보류') || text.includes('hold')) return 'warn';
  return 'active';
}

async function loadAuditLogs() {
  const database = getAdminDatabase();
  const snap = await database.ref('adminAuditLogs').limitToLast(80).once('value');
  const rows = Object.entries(asObject(snap.val())).map(([id, value]) => ({
    id,
    ...asObject(value)
  }));

  return rows.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

function renderStats(rows) {
  const requestLogs = rows.filter((row) => row.requestId || row.target === 'dataDeleteRequest').length;
  const approvals = rows.filter((row) => String(row.action || '').includes('승인') || row.status === 'approved').length;
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
  const statusText = row.previousStatus && row.status && row.previousStatus !== row.status
    ? `${row.previousStatus} → ${row.status}`
    : row.status || row.statusAfter || row.statusBefore || '-';
  const search = [
    row.action,
    actionLabel(row),
    row.adminEmail,
    row.requesterEmail,
    row.requestedByEmail,
    row.roomCode,
    row.ownerUid,
    row.requestId,
    row.note
  ].join(' ').toLowerCase();

  return `
    <article class="admin-audit-card" data-admin-audit-row data-search="${escapeHtml(search)}">
      <div class="admin-audit-head">
        <div>
          <strong>${escapeHtml(actionLabel(row))}</strong>
          <p>${escapeHtml(row.note || '관리자 작업 기록')}</p>
        </div>
        <span class="admin-request-status ${actionClass(row.action || row.status)}">${escapeHtml(formatDateTime(row.createdAt))}</span>
      </div>
      <div class="admin-meta-row">
        <span>관리자 ${escapeHtml(row.adminEmail || row.adminUid || '-')}</span>
        <span>대상 ${escapeHtml(row.requestType || row.target || '-')}</span>
        <span>상태 ${escapeHtml(statusText)}</span>
        <span>Room ${escapeHtml(row.roomCode || '-')}</span>
        <span>요청 ID ${escapeHtml(shortUid(row.requestId))}</span>
      </div>
    </article>`;
}

export async function render() {
  try {
    const rows = await loadAuditLogs();
    return `
      ${renderStats(rows)}
      <section class="admin-card">
        <div class="admin-section-head">
          <div>
            <h2>최근 관리자 작업</h2>
            <p>요청관리의 답변·메모·상태 변경 기록을 최신순으로 보여줍니다.</p>
          </div>
          <input id="auditSearch" class="admin-input" type="search" placeholder="로그 검색" autocomplete="off">
        </div>
        <div id="auditRows" class="admin-list">
          ${rows.length ? rows.map(renderLogCard).join('') : renderEmptyState('감사 로그가 없습니다.', '아직 기록된 관리자 작업이 없습니다.')}
        </div>
      </section>`;
  } catch (error) {
    console.error('[Admin Audit] load failed', error);
    return `<section class="admin-card">${renderEmptyState('감사 로그를 불러오지 못했습니다.', error.message)}</section>`;
  }
}

export function afterRender() {
  const search = document.getElementById('auditSearch');
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-admin-audit-row]').forEach((row) => {
      row.hidden = query && !row.dataset.search.includes(query);
    });
  });
}
