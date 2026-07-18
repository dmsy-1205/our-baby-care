import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-1-clean-baseline-20260719';

const ACTION_LABELS = {
  request_note_update: '愿由ъ옄 硫붾え ???,
  request_status_update: '?붿껌 ?곹깭 蹂寃?,
  request_memo_saved: '愿由ъ옄 硫붾え ???,
  request_status_reviewing: '?붿껌 寃??以?,
  request_status_hold: '?붿껌 蹂대쪟',
  request_status_approved: '?붿껌 ?뱀씤',
  request_status_rejected: '?붿껌 嫄곗젅'
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
  return row.actionLabel || ACTION_LABELS[row.action] || row.action || '愿由ъ옄 ?묒뾽';
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
  if (!items.length) return renderEmptyState('媛먯궗 濡쒓렇 ?놁쓬', '寃??議곌굔??留욌뒗 愿由ъ옄 ?묒뾽 湲곕줉???놁뒿?덈떎.');

  return `
    <div class="admin-log-list">
      ${items.map((row) => `
        <article class="admin-card admin-log-card">
          <div class="admin-request-card-head">
            <div>
              <h3>${escapeHtml(actionLabel(row))}</h3>
              <p>${escapeHtml(row.status ? `?곹깭 ${row.status}` : '愿由ъ옄 ?묒뾽 湲곕줉')}</p>
            </div>
            <span class="admin-status-pill muted">${escapeHtml(formatDateTime(row.createdAt || row.updatedAt))}</span>
          </div>
          <div class="admin-meta-row">
            <span>愿由ъ옄 ${escapeHtml(row.adminEmail || '-')}</span>
            <span>?붿껌??${escapeHtml(row.ownerUid || '-')}</span>
            <span>?붿껌 ${escapeHtml(compactId(row.requestId || row.id))}</span>
            <span>?좏삎 ${escapeHtml(row.requestType || '-')}</span>
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
        <div class="admin-hero-icon">??/div>
        <div>
          <h2 id="auditHeading">媛먯궗 濡쒓렇</h2>
          <p>愿由ъ옄 ?붿껌 泥섎━ 怨쇱젙?먯꽌 ?꾧?, ?몄젣, ?대뼡 ?곹깭瑜??④꼈?붿? ?뺤씤?⑸땲?? ?ㅼ젣 ??젣 ?ㅽ뻾 ??湲곗??먯쑝濡??ъ슜?⑸땲??</p>
        </div>
      </section>

      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>理쒓렐 濡쒓렇</span><strong>${logs.length}</strong><small>理쒕? 80媛??쒖떆</small></article>
        <article class="admin-card admin-metric"><span>?곗씠???붿껌</span><strong>${requestCount}</strong><small>?붿껌愿由??묒뾽</small></article>
        <article class="admin-card admin-metric"><span>?뱀씤 湲곕줉</span><strong>${approvalCount}</strong><small>?ㅽ뻾 ??寃??湲곗?</small></article>
        <article class="admin-card admin-metric"><span>理쒓렐 ?묒뾽</span><strong>${escapeHtml(formatDateTime(latest))}</strong><small>留덉?留?濡쒓렇 ?쒓컙</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>理쒓렐 愿由ъ옄 ?묒뾽</h2>
            <p>?붿껌愿由ъ쓽 ?듬?쨌硫붾え쨌?곹깭 蹂寃?湲곕줉??理쒖떊?쒖쑝濡?蹂댁뿬以띾땲??</p>
          </div>
          <input data-audit-search type="search" placeholder="濡쒓렇 寃?? value="${escapeHtml(search)}">
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

