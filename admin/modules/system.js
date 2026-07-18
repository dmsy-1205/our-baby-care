import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-data-center-foundation-20260718';
import { getState } from '../admin-state.js?v=admin-2-0-a11-data-center-foundation-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a11-data-center-foundation-20260718';

const ADMIN_SYSTEM_STEP = 'STEP A11';
const ADMIN_SYSTEM_LABEL = 'Data Center Foundation';
const ADMIN_CACHE_KEY = 'admin-2-0-a11-data-center-foundation-20260718';

const HEALTH_PATHS = [
  { key: 'users', label: '사용자', path: 'users' },
  { key: 'userRooms', label: '사용자 Room 연결', path: 'userRooms' },
  { key: 'roomMembers', label: 'Room 멤버십', path: 'roomMembers' },
  { key: 'rooms', label: 'Room 데이터', path: 'rooms' },
  { key: 'dataDeleteRequests', label: '데이터 요청', path: 'dataDeleteRequests' },
  { key: 'adminAuditLogs', label: '감사 로그', path: 'adminAuditLogs' }
];

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function countChildren(value) {
  return Object.keys(asObject(value)).length;
}

function flattenRequestRows(requestRoot) {
  const rows = [];
  Object.entries(asObject(requestRoot)).forEach(([ownerUid, requests]) => {
    Object.entries(asObject(requests)).forEach(([requestId, request]) => {
      rows.push({
        ownerUid,
        requestId,
        requestType: request?.requestType || request?.type || 'unknown',
        status: request?.status || 'pending',
        createdAt: Number(request?.createdAt || request?.requestedAt || 0),
        updatedAt: Number(request?.updatedAt || request?.reviewedAt || 0)
      });
    });
  });
  return rows;
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
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
      value: snapshot.val(),
      count: countChildren(snapshot.val()),
      message: '읽기 가능'
    };
  } catch (error) {
    return {
      ...item,
      ok: false,
      value: null,
      count: '-',
      message: error?.message || '읽기 실패'
    };
  }
}

function buildDataCenter(statusMap) {
  const users = asObject(statusMap.users?.value);
  const userRooms = asObject(statusMap.userRooms?.value);
  const roomMembers = asObject(statusMap.roomMembers?.value);
  const rooms = asObject(statusMap.rooms?.value);
  const requestRows = flattenRequestRows(statusMap.dataDeleteRequests?.value);
  const auditLogs = asObject(statusMap.adminAuditLogs?.value);

  const roomCodes = new Set([
    ...Object.keys(rooms),
    ...Object.keys(roomMembers)
  ]);

  Object.values(userRooms).forEach((roomsByUser) => {
    Object.keys(asObject(roomsByUser)).forEach((roomCode) => roomCodes.add(roomCode));
  });

  let orphanUserRoomLinks = 0;
  Object.entries(userRooms).forEach(([uid, roomsByUser]) => {
    Object.keys(asObject(roomsByUser)).forEach((roomCode) => {
      const memberExists = Boolean(asObject(roomMembers[roomCode])[uid]);
      const roomExists = Boolean(rooms[roomCode]);
      if (!memberExists && !roomExists) orphanUserRoomLinks += 1;
    });
  });

  let missingUserProfiles = 0;
  Object.values(roomMembers).forEach((members) => {
    Object.keys(asObject(members)).forEach((uid) => {
      if (!users[uid]) missingUserProfiles += 1;
    });
  });

  let roomsWithoutMembers = 0;
  Object.keys(rooms).forEach((roomCode) => {
    if (!countChildren(roomMembers[roomCode])) roomsWithoutMembers += 1;
  });

  const requestStatus = countBy(requestRows, 'status');
  const requestTypes = countBy(requestRows, 'requestType');
  const closedStatuses = ['approved', 'rejected', 'canceled', 'cancelled', 'completed', 'closed'];
  const openRequestCount = requestRows.filter((row) => !closedStatuses.includes(row.status)).length;

  const warnings = [
    orphanUserRoomLinks ? `사용자 Room 연결 불일치 ${orphanUserRoomLinks}건` : '',
    missingUserProfiles ? `멤버십은 있으나 사용자 정보가 없는 항목 ${missingUserProfiles}건` : '',
    roomsWithoutMembers ? `Room 데이터는 있으나 멤버가 없는 Room ${roomsWithoutMembers}건` : '',
    openRequestCount ? `처리 중인 데이터 요청 ${openRequestCount}건` : ''
  ].filter(Boolean);

  return {
    totalUsers: countChildren(users),
    totalUserRooms: Object.values(userRooms).reduce((sum, roomsByUser) => sum + countChildren(roomsByUser), 0),
    totalRooms: roomCodes.size,
    totalRoomMembers: Object.values(roomMembers).reduce((sum, members) => sum + countChildren(members), 0),
    totalRequests: requestRows.length,
    totalAuditLogs: countChildren(auditLogs),
    orphanUserRoomLinks,
    missingUserProfiles,
    roomsWithoutMembers,
    openRequestCount,
    requestStatus,
    requestTypes,
    warnings
  };
}

async function loadSystemStatus() {
  const database = getAdminDatabase();
  const state = getState();
  const release = window.HM_RELEASE || {};
  const pathStatuses = await Promise.all(HEALTH_PATHS.map((item) => readPathStatus(database, item)));
  const statusMap = Object.fromEntries(pathStatuses.map((item) => [item.key, item]));
  const okCount = pathStatuses.filter((item) => item.ok).length;

  return {
    state,
    release,
    firebaseAppName: resolveFirebaseAppName(),
    firebaseReady: Boolean(window.firebase && resolveFirebaseAppName() !== '-'),
    pathStatuses,
    statusMap,
    dataCenter: buildDataCenter(statusMap),
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

function renderMapSummary(map, emptyText = '없음') {
  const entries = Object.entries(asObject(map));
  if (!entries.length) return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  return `
    <div class="admin-system-path-list">
      ${entries.map(([key, count]) => `
        <article class="admin-system-path-card">
          <div><strong>${escapeHtml(key)}</strong></div>
          <div class="admin-system-path-result"><span>${escapeHtml(count)}건</span></div>
        </article>
      `).join('')}
    </div>`;
}

function renderDataCenter(dataCenter) {
  return `
    <article class="panel">
      <div class="panel-header admin-system-panel-header">
        <div>
          <h2>데이터 관리 센터 · 읽기 점검</h2>
          <p>실제 데이터를 변경하지 않고, 운영자가 먼저 확인해야 할 데이터 구조와 위험 신호를 요약합니다.</p>
        </div>
        <span class="phase-badge">Read Only</span>
      </div>

      <div class="metric-grid admin-system-metrics">
        <article class="metric-card"><span>사용자</span><strong>${dataCenter.totalUsers}</strong><small>users 기준</small></article>
        <article class="metric-card"><span>Room</span><strong>${dataCenter.totalRooms}</strong><small>rooms/roomMembers/userRooms 통합</small></article>
        <article class="metric-card"><span>Room 멤버</span><strong>${dataCenter.totalRoomMembers}</strong><small>roomMembers 기준</small></article>
        <article class="metric-card"><span>데이터 요청</span><strong>${dataCenter.totalRequests}</strong><small>처리 중 ${dataCenter.openRequestCount}건</small></article>
      </div>

      <div class="admin-system-grid">
        <section class="admin-system-card">
          <h3>위험 신호</h3>
          <ul>
            <li>사용자 Room 연결 불일치: ${dataCenter.orphanUserRoomLinks}건</li>
            <li>사용자 정보 없는 멤버십: ${dataCenter.missingUserProfiles}건</li>
            <li>멤버 없는 Room 데이터: ${dataCenter.roomsWithoutMembers}건</li>
            <li>열린 데이터 요청: ${dataCenter.openRequestCount}건</li>
          </ul>
        </section>
        <section class="admin-system-card">
          <h3>운영 판단</h3>
          ${dataCenter.warnings.length
            ? `<ul>${dataCenter.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
            : '<p class="muted">현재 읽기 점검 기준으로 큰 위험 신호는 없습니다.</p>'}
        </section>
      </div>

      <div class="admin-system-grid">
        <section class="admin-system-card">
          <h3>요청 상태 분포</h3>
          ${renderMapSummary(dataCenter.requestStatus, '데이터 요청 없음')}
        </section>
        <section class="admin-system-card">
          <h3>요청 유형 분포</h3>
          ${renderMapSummary(dataCenter.requestTypes, '데이터 요청 없음')}
        </section>
      </div>
    </article>`;
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
            <h2 id="adminSystemHeading">시스템 · 데이터 센터 점검판</h2>
            <p>관리자 앱의 연결, 인증, 주요 데이터 읽기 상태를 확인합니다. 현재 화면은 읽기 전용입니다.</p>
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
              <p>관리자 화면에서 정상적으로 데이터를 읽을 수 있는지 확인합니다.</p>
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

        ${renderDataCenter(status.dataCenter)}

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
