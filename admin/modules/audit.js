import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-data-center-foundation-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a11-data-center-foundation-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-data-center-foundation-20260718';

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

function shortUid(uid) {
  const text = String(uid || '');
  if (text.length <= 12) return text || '-';
  return `${text.slice(0, 6)}…${text.slice(-5)}`;
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

  return `
    <article class="admin-audit-card" data-admin-audit-row data-search="${escapeHtml([
      row.action,
      actionLabel(row),
      row.adminEmail,
      row.requestedByEmail,
      row.roomCode,
      row.ownerUid,
      row.requestId,
      row.note
    ].join(' ').toLowerCase())}">
      <div class="admin-audit-head">
        <div>
          <strong>${escapeHtml(actionLabel(row))}</strong>
          <p>${escapeHtml(row.note || '관리자 작업 기록')}</p>
        </div>
        <span class="admin-request-status ${actionClass(row.action)}">${escapeHtml(formatDateTime(row.createdAt))}</span>
      </div>
      <div class="admin-request-meta">
        <span>관리자 ${escapeHtml(row.adminEmail || shortUid(row.adminUid))}</span>
        <span>대상 ${escapeHtml(row.targetLabel || row.target || '-')}</span>
        <span>상태 ${escapeHtml(statusText)}</span>
        <span>Room ${escapeHtml(row.roomCode || '-')}</span>
        <span>요청자 ${escapeHtml(row.requestedByEmail || shortUid(row.requestedByUid))}</span>
        <span>요청 ID ${escapeHtml(shortUid(row.requestId))}</span>
      </div>
    </article>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return renderEmptyState('감사 로그가 아직 없습니다', '요청관리에서 메모를 저장하거나 상태를 변경하면 이곳에 기록됩니다.');
  }

  return `<div class="admin-audit-list">${rows.map(renderLogCard).join('')}</div>`;
}

export async function render() {
  try {
    const rows = await loadAuditLogs();
    return `
      <section class="module-view" aria-labelledby="adminAuditHeading">
        <div class="foundation-notice">
          <div><span class="notice-icon" aria-hidden="true">☰</span></div>
          <div>
            <h2 id="adminAuditHeading">감사 로그</h2>
            <p>관리자 요청 처리 과정에서 누가, 언제, 어떤 상태를 남겼는지 확인합니다. 실제 삭제 실행 전 기준점으로 사용합니다.</p>
          </div>
        </div>
        ${renderStats(rows)}
        <article class="panel">
          <div class="panel-header admin-audit-panel-header">
            <div>
              <h2>최근 관리자 작업</h2>
              <p>요청관리의 답변·메모·상태 변경 기록을 최신순으로 보여줍니다.</p>
            </div>
            <input id="adminAuditSearch" class="admin-user-search" type="search" placeholder="로그 검색">
          </div>
          ${renderRows(rows)}
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin Audit] load failed', error);
    return `
      <section class="module-view">
        <div class="error-card">
          <strong>감사 로그를 불러오지 못했습니다.</strong>
          <p>${escapeHtml(error.message || error)}</p>
        </div>
      </section>`;
  }
}

export function afterRender() {
  const search = document.getElementById('adminAuditSearch');
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-admin-audit-row]').forEach((row) => {
      row.hidden = Boolean(query) && !String(row.dataset.search || '').includes(query);
    });
  });
}
