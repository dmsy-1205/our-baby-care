import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-data-impact-preview-20260718';
import { getState } from '../admin-state.js?v=admin-2-0-a11-data-impact-preview-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a11-data-impact-preview-20260718';

const ADMIN_SYSTEM_STEP = 'STEP A11';
const ADMIN_SYSTEM_LABEL = 'Data Impact Preview';
const ADMIN_CACHE_KEY = 'admin-2-0-a11-data-impact-preview-20260718';

const HEALTH_PATHS = [
  { key: 'users', label: '?ъ슜??, path: 'users' },
  { key: 'roomMembers', label: 'Room 硫ㅻ쾭??, path: 'roomMembers' },
  { key: 'dataDeleteRequests', label: '?곗씠???붿껌', path: 'dataDeleteRequests' },
  { key: 'adminAuditLogs', label: '媛먯궗 濡쒓렇', path: 'adminAuditLogs' }
];

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function countChildren(value) {
  return Object.keys(asObject(value)).length;
}

function resolveFirebaseAppName() {
  const apps = window.firebase?.apps || [];
  const babyApp = apps.find((app) => app && app.name === 'babyApp');
  return babyApp?.name || '-';
}

async function readPathStatus(database, item) {
  try {
    const snapshot = await database.ref(item.path).once('value');
    return {
      ...item,
      ok: true,
      count: countChildren(snapshot.val()),
      message: '?쎄린 媛??
    };
  } catch (error) {
    return {
      ...item,
      ok: false,
      count: '-',
      message: error?.message || '?쎄린 ?ㅽ뙣'
    };
  }
}

async function loadSystemStatus() {
  const database = getAdminDatabase();
  const state = getState();
  const release = window.HM_RELEASE || {};
  const pathStatuses = await Promise.all(HEALTH_PATHS.map((item) => readPathStatus(database, item)));
  const okCount = pathStatuses.filter((item) => item.ok).length;

  return {
    state,
    release,
    firebaseAppName: resolveFirebaseAppName(),
    firebaseReady: Boolean(window.firebase && resolveFirebaseAppName() !== '-'),
    pathStatuses,
    okCount,
    totalCount: pathStatuses.length
  };
}

function renderStatusPill(ok, label) {
  return `<span class="admin-request-status ${ok ? 'ok' : 'danger'}">${escapeHtml(label)}</span>`;
}

function renderPathRows(pathStatuses) {
  return pathStatuses.map((item) => `
    <article class="admin-system-path-card">
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <p>${escapeHtml(item.path)}</p>
      </div>
      <div class="admin-system-path-result">
        ${renderStatusPill(item.ok, item.message)}
        <span>${escapeHtml(item.count)}嫄?/span>
      </div>
    </article>
  `).join('');
}

export async function render() {
  try {
    const status = await loadSystemStatus();
    const adminEmail = status.state.user?.email || '-';
    const adminUid = status.state.user?.uid || '-';
    const bootedAt = status.state.bootedAt || 0;

    return `
      <section class="module-view" aria-labelledby="adminSystemHeading">
        <div class="foundation-notice">
          <span class="notice-icon" aria-hidden="true">??/span>
          <div>
            <h2 id="adminSystemHeading">?쒖뒪??쨌 ?댁쁺 ?곹깭 ?먭???/h2>
            <p>愿由ъ옄 ?깆쓽 ?곌껐, ?몄쬆, 二쇱슂 ?곗씠???쎄린 ?곹깭瑜??뺤씤?⑸땲?? ???붾㈃? ?쎄린 ?꾩슜?낅땲??</p>
          </div>
        </div>

        <div class="metric-grid admin-system-metrics">
          <article class="metric-card">
            <span>Firebase ??/span>
            <strong>${escapeHtml(status.firebaseAppName)}</strong>
            <small>${status.firebaseReady ? '?곌껐 ?뺤씤' : '?곌껐 ?뺤씤 ?꾩슂'}</small>
          </article>
          <article class="metric-card">
            <span>愿由ъ옄 ?몄쬆</span>
            <strong>${escapeHtml(adminEmail)}</strong>
            <small>UID ${escapeHtml(adminUid)}</small>
          </article>
          <article class="metric-card">
            <span>?쎄린 ?먭?</span>
            <strong>${status.okCount}/${status.totalCount}</strong>
            <small>二쇱슂 寃쎈줈 ?쎄린 媛??/small>
          </article>
          <article class="metric-card">
            <span>愿由ъ옄 ?ㅽ뀦</span>
            <strong>${ADMIN_SYSTEM_STEP}</strong>
            <small>${ADMIN_SYSTEM_LABEL}</small>
          </article>
        </div>

        <article class="panel">
          <div class="panel-header admin-system-panel-header">
            <div>
              <h2>?댁쁺 ?곌껐 ?곹깭</h2>
              <p>愿由ъ옄 ?붾㈃???뺤긽?곸쑝濡??곗씠?곕? ?쎌쓣 ???덈뒗吏 ?뺤씤?⑸땲??</p>
            </div>
            <span class="phase-badge">Read Only</span>
          </div>
          <div class="admin-system-grid">
            <section class="admin-system-card">
              <h3>??湲곗?</h3>
              <dl>
                <div><dt>硫붿씤??踰꾩쟾</dt><dd>${escapeHtml(status.release.step || '-')}</dd></div>
                <div><dt>愿由ъ옄 ?ㅽ뀦</dt><dd>${ADMIN_SYSTEM_STEP}</dd></div>
                <div><dt>罹먯떆 ??/dt><dd>${ADMIN_CACHE_KEY}</dd></div>
                <div><dt>遺???쒓컙</dt><dd>${escapeHtml(formatDateTime(bootedAt))}</dd></div>
              </dl>
            </section>
            <section class="admin-system-card">
              <h3>?덉쟾 湲곗?</h3>
              <ul>
                <li>愿由ъ옄 ?몄쬆???듦낵??怨꾩젙留??묎렐</li>
                <li>?꾩옱 ?붾㈃?먯꽌???곗씠????Β룹궘??湲곕뒫 ?놁쓬</li>
                <li>二쇱슂 寃쎈줈???쎄린 ?먭?留??섑뻾</li>
                <li>硫붿씤??踰꾩쟾? 愿由ъ옄 ?ㅽ뀦怨?遺꾨━ 愿由?/li>
              </ul>
            </section>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header admin-system-panel-header">
            <div>
              <h2>二쇱슂 ?곗씠??寃쎈줈 ?먭?</h2>
              <p>沅뚰븳 ?먮뒗 寃쎈줈 臾몄젣媛 ?앷린硫??ш린??癒쇱? ?뺤씤?⑸땲??</p>
            </div>
          </div>
          <div class="admin-system-path-list">
            ${renderPathRows(status.pathStatuses)}
          </div>
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin System] load failed', error);
    return `
      <section class="module-view">
        <article class="error-card">
          <h2>?쒖뒪???곹깭瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??</h2>
          <p>${escapeHtml(error.message || error)}</p>
        </article>
      </section>`;
  }
}

