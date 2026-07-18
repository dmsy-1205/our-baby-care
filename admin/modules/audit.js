import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-data-center-readonly-20260719';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a11-data-center-readonly-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-data-center-readonly-20260719';

const ACTION_LABELS = {
  request_note_update: '관리자 메모 저장',
  request_status_update: '요청 상태 변경',
  request_memo_saved: '관리자 메모 저장',
  request_status_reviewing: '요청 검토 중',
  request_status_hold: '요청 보류',
  request_status_approved: '요청 승인',
  request_status_rejected: '요청 거절'
};

let logs = [];
let search = '';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

async function loadAuditLogs() {
  const database = getAdminDatabase();
  const snapshot = await database.ref('adminAuditLogs').limitToLast(80).once('value');
  logs = Object.entries(asObject(snapshot.val()))
    .map(([id, value]) => ({ id, ...asObject(value) }))
    .sort((a, b) => Number(b.createdAt || b.updatedAt || 0) - Number(a.createdAt || a.updatedAt || 0));
}

function actionLabel(row) {
  return row.actionLabel || ACTION_LABELS[row.action] || row.action || '관리자 작업';
}

function visibleLogs() {
  if (!search) return logs;
  const needle = search.toLowerCase();
  return logs.filter((row) => [
    actionLabel(row),
    row.adminEmail,
    row.ownerUid,
    row.requestId,
    row.requestType,
    row.status,
    row.id
  ].join(' ').toLowerCase().includes(needle));
}

function renderList() {
  const items = visibleLogs();
  if (!items.length) return renderEmptyState('감사 로그 없음', '검색 조건에 맞는 관리자 작업 기록이 없습니다.');

  return `
    <div class="admin-log-list">
      ${items.map((row) => `
        <article class="admin-card admin-log-card">
          <div class="admin-request-card-head">
            <div>
              <h3>${escapeHtml(actionLabel(row))}</h3>
              <p>${escapeHtml(row.status ? `상태 ${row.status}` : '관리자 작업 기록')}</p>
            </div>
            <span class="admin-status-pill muted">${escapeHtml(formatDateTime(row.createdAt || row.updatedAt))}</span>
          </div>
          <div class="admin-meta-row">
            <span>관리자 ${escapeHtml(row.adminEmail || '-')}</span>
            <span>요청자 ${escapeHtml(row.ownerUid || '-')}</span>
            <span>요청 ${escapeHtml(compactId(row.requestId || row.id))}</span>
            <span>유형 ${escapeHtml(row.requestType || '-')}</span>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderShell() {
  const approvalCount = logs.filter((row) => String(row.action || '').includes('approved')).length;
  const requestCount = logs.filter((row) => row.requestId).length;
  const latest = logs[0]?.createdAt || logs[0]?.updatedAt;

  return `
    <section class="module-view" aria-labelledby="auditHeading">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">☰</div>
        <div>
          <h2 id="auditHeading">감사 로그</h2>
          <p>관리자 요청 처리 과정에서 누가, 언제, 어떤 상태를 남겼는지 확인합니다. 실제 삭제 실행 전 기준점으로 사용합니다.</p>
        </div>
      </section>

      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>최근 로그</span><strong>${logs.length}</strong><small>최대 80개 표시</small></article>
        <article class="admin-card admin-metric"><span>데이터 요청</span><strong>${requestCount}</strong><small>요청관리 작업</small></article>
        <article class="admin-card admin-metric"><span>승인 기록</span><strong>${approvalCount}</strong><small>실행 전 검토 기준</small></article>
        <article class="admin-card admin-metric"><span>최근 작업</span><strong>${escapeHtml(formatDateTime(latest))}</strong><small>마지막 로그 시간</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>최근 관리자 작업</h2>
            <p>요청관리의 답변·메모·상태 변경 기록을 최신순으로 보여줍니다.</p>
          </div>
          <input data-audit-search type="search" placeholder="로그 검색" value="${escapeHtml(search)}">
        </div>
        <div data-audit-list>${renderList()}</div>
      </section>
    </section>
  `;
}

function bindEvents(root) {
  if (root.dataset.auditBound === '1') return;
  root.dataset.auditBound = '1';
  root.addEventListener('input', (event) => {
    if (!event.target.matches('[data-audit-search]')) return;
    search = event.target.value.trim();
    root.querySelector('[data-audit-list]').innerHTML = renderList();
  });
}

export async function render() {
  await loadAuditLogs();
  return renderShell();
}

export function afterRender(root) {
  bindEvents(root);
}
