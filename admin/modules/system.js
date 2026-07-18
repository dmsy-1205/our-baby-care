import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a10-system-status-baseline-20260718';
import { getState } from '../admin-state.js?v=admin-2-0-a10-system-status-baseline-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a10-system-status-baseline-20260718';

const ADMIN_SYSTEM_STEP = 'STEP A10';
const ADMIN_SYSTEM_LABEL = 'System Status Baseline';
const ADMIN_CACHE_KEY = 'admin-2-0-a10-system-status-baseline-20260718';

const HEALTH_PATHS = [
  { key: 'users', label: '사용자', path: 'users' },
  { key: 'roomMembers', label: 'Room 멤버십', path: 'roomMembers' },
  { key: 'dataDeleteRequests', label: '데이터 요청', path: 'dataDeleteRequests' },
  { key: 'adminAuditLogs', label: '감사 로그', path: 'adminAuditLogs' }
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
      message: '읽기 가능'
    };
  } catch (error) {
    return {
      ...item,
      ok: false,
      count: '-',
      message: error?.message || '읽기 실패'
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
        <span>${escapeHtml(item.count)}건</span>
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
          <span class="notice-icon" aria-hidden="true">⚙</span>
          <div>
            <h2 id="adminSystemHeading">시스템 · 운영 상태 점검판</h2>
            <p>관리자 앱의 연결, 인증, 주요 데이터 읽기 상태를 확인합니다. 이 화면은 읽기 전용입니다.</p>
          </div>
        </div>

        <div class="metric-grid admin-system-metrics">
          <article class="metric-card">
            <span>Firebase 앱</span>
            <strong>${escapeHtml(status.firebaseAppName)}</strong>
            <small>${status.firebaseReady ? '연결 확인' : '연결 확인 필요'}</small>
          </article>
          <article class="metric-card">
            <span>관리자 인증</span>
            <strong>${escapeHtml(adminEmail)}</strong>
            <small>UID ${escapeHtml(adminUid)}</small>
          </article>
          <article class="metric-card">
            <span>읽기 점검</span>
            <strong>${status.okCount}/${status.totalCount}</strong>
            <small>주요 경로 읽기 가능</small>
          </article>
          <article class="metric-card">
            <span>관리자 스텝</span>
            <strong>${ADMIN_SYSTEM_STEP}</strong>
            <small>${ADMIN_SYSTEM_LABEL}</small>
          </article>
        </div>

        <article class="panel">
          <div class="panel-header admin-system-panel-header">
            <div>
              <h2>운영 연결 상태</h2>
              <p>관리자 화면이 정상적으로 데이터를 읽을 수 있는지 확인합니다.</p>
            </div>
            <span class="phase-badge">Read Only</span>
          </div>
          <div class="admin-system-grid">
            <section class="admin-system-card">
              <h3>앱 기준</h3>
              <dl>
                <div><dt>메인앱 버전</dt><dd>${escapeHtml(status.release.step || '-')}</dd></div>
                <div><dt>관리자 스텝</dt><dd>${ADMIN_SYSTEM_STEP}</dd></div>
                <div><dt>캐시 키</dt><dd>${ADMIN_CACHE_KEY}</dd></div>
                <div><dt>부팅 시간</dt><dd>${escapeHtml(formatDateTime(bootedAt))}</dd></div>
              </dl>
            </section>
            <section class="admin-system-card">
              <h3>안전 기준</h3>
              <ul>
                <li>관리자 인증을 통과한 계정만 접근</li>
                <li>현재 화면에서는 데이터 저장·삭제 기능 없음</li>
                <li>주요 경로는 읽기 점검만 수행</li>
                <li>메인앱 버전은 관리자 스텝과 분리 관리</li>
              </ul>
            </section>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header admin-system-panel-header">
            <div>
              <h2>주요 데이터 경로 점검</h2>
              <p>권한 또는 경로 문제가 생기면 여기서 먼저 확인합니다.</p>
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
          <h2>시스템 상태를 불러오지 못했습니다.</h2>
          <p>${escapeHtml(error.message || error)}</p>
        </article>
      </section>`;
  }
}
