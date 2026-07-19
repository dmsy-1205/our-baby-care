import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a14-2-4-recovery-safety-suite-20260719';
import { getState } from '../admin-state.js';
import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a14-2-4-recovery-safety-suite-20260719';
import { ADMIN_RELEASE } from '../admin-release.js';

const ADMIN_STEP = ADMIN_RELEASE.step;
const ADMIN_LABEL = ADMIN_RELEASE.label;
const ADMIN_CACHE_KEY = ADMIN_RELEASE.cacheKey;

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function flattenRequests(requestsRoot) {
  const rows = [];
  Object.entries(asObject(requestsRoot)).forEach(([uid, group]) => {
    Object.entries(asObject(group)).forEach(([id, request]) => rows.push({ uid, id, ...asObject(request) }));
  });
  return rows;
}

async function readPath(database, label, path) {
  try {
    const snapshot = await database.ref(path).once('value');
    const value = asObject(snapshot.val());
    return { label, path, ok: true, value, count: Object.keys(value).length };
  } catch (error) {
    return { label, path, ok: false, value: {}, count: 0, error: error?.message || String(error) };
  }
}

async function loadSystemStatus() {
  const database = getAdminDatabase();
  const reads = await Promise.all([
    readPath(database, '사용자', 'users'), readPath(database, 'Room', 'rooms'),
    readPath(database, 'Room 멤버', 'roomMembers'), readPath(database, '사용자 Room 연결', 'userRooms'),
    readPath(database, '데이터 요청', 'dataDeleteRequests'), readPath(database, '감사 로그', 'adminAuditLogs'),
    readPath(database, '삭제 승인 대기열', 'deletionActionQueue'), readPath(database, '백업 확인', 'dataBackups')
  ]);
  const byPath = Object.fromEntries(reads.map((item) => [item.path, item]));
  const users = byPath.users.value;
  const rooms = byPath.rooms.value;
  const roomMembers = byPath.roomMembers.value;
  const userRooms = byPath.userRooms.value;
  const requests = flattenRequests(byPath.dataDeleteRequests.value);
  const deletionQueue = asObject(byPath.deletionActionQueue.value);
  const backups = asObject(byPath.dataBackups.value);
  const roomCodes = new Set([...Object.keys(rooms), ...Object.keys(roomMembers)]);
  const userRoomMismatch = [];
  const membershipsWithoutUser = [];
  const roomsWithoutMembers = [];

  Object.entries(userRooms).forEach(([uid, linkedRooms]) => {
    Object.keys(asObject(linkedRooms)).forEach((roomCode) => {
      if (!roomMembers[roomCode]?.[uid]) userRoomMismatch.push(`${uid}/${roomCode}`);
    });
  });
  Object.entries(roomMembers).forEach(([roomCode, members]) => {
    const memberIds = Object.keys(asObject(members));
    if (!memberIds.length) roomsWithoutMembers.push(roomCode);
    memberIds.forEach((uid) => { if (!users[uid]) membershipsWithoutUser.push(`${roomCode}/${uid}`); });
  });
  Object.keys(rooms).forEach((roomCode) => { if (!roomMembers[roomCode]) roomsWithoutMembers.push(roomCode); });

  const openRequests = requests.filter((row) => !['completed', 'rejected', 'canceled', 'cancelled'].includes(row.status || 'pending'));
  const requestStatusCounts = {};
  const requestTypeCounts = {};
  requests.forEach((row) => {
    const status = row.status || 'pending';
    const type = row.requestType || row.type || 'unknown';
    requestStatusCounts[status] = (requestStatusCounts[status] || 0) + 1;
    requestTypeCounts[type] = (requestTypeCounts[type] || 0) + 1;
  });
  return {
    reads, usersCount: Object.keys(users).length, roomsCount: roomCodes.size,
    roomMembersCount: Object.values(roomMembers).reduce((sum, members) => sum + Object.keys(asObject(members)).length, 0),
    requestsCount: requests.length, openRequestsCount: openRequests.length,
    risks: { userRoomMismatch, membershipsWithoutUser, roomsWithoutMembers, openRequests },
    requestStatusCounts, requestTypeCounts,
    deletionQueueCount: Object.keys(deletionQueue).length,
    backupVerifiedCount: Object.values(backups).filter((item) => item?.status === 'verified' && Number(item?.verifiedAt || 0) > 0).length,
    deletionExecutionEnabledCount: Object.values(deletionQueue).filter((item) => item?.executionEnabled === true).length
  };
}

function renderCountList(title, items) {
  const entries = Object.entries(items);
  if (!entries.length) return `<div class="admin-list-row"><span>${escapeHtml(title)}</span><strong>0건</strong></div>`;
  return `<div class="admin-mini-list"><h3>${escapeHtml(title)}</h3>${entries.map(([key, count]) => `<div class="admin-list-row"><span>${escapeHtml(key)}</span><strong>${count}건</strong></div>`).join('')}</div>`;
}

export async function render() {
  const state = getState();
  const status = await loadSystemStatus();
  const release = window.HM_RELEASE || {};
  const failed = status.reads.filter((item) => !item.ok).length;
  return `
    <section class="module-view" aria-labelledby="systemHeading">
      <section class="admin-hero-card"><div class="admin-hero-icon">⚙️</div><div><h2 id="systemHeading">시스템 · 운영 상태 점검</h2><p>관리자 앱의 연결, 인증, 주요 데이터 읽기 상태를 확인합니다. 이 화면은 읽기 전용입니다.</p></div></section>
      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>Firebase 앱</span><strong>babyApp</strong><small>연결 확인</small></article>
        <article class="admin-card admin-metric"><span>관리자 인증</span><strong>${escapeHtml(state.user?.email || '-')}</strong><small>현재 로그인 관리자</small></article>
        <article class="admin-card admin-metric"><span>읽기 점검</span><strong>${status.reads.length - failed}/${status.reads.length}</strong><small>주요 경로 읽기 가능</small></article>
        <article class="admin-card admin-metric"><span>관리자 스텝</span><strong>${ADMIN_STEP}</strong><small>${ADMIN_LABEL}</small></article>
      </section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h2>운영 연결 상태</h2><p>관리자 화면이 정상적으로 데이터를 읽을 수 있는지 확인합니다.</p></div><span class="admin-status-pill muted">Read Only</span></div>
        <div class="admin-grid admin-grid-2">
          <article class="admin-soft-card"><h3>앱 기준</h3><div class="admin-key-value"><span>메인 앱 버전</span><strong>${escapeHtml(release.step || 'STEP6.2.13.4')}</strong></div><div class="admin-key-value"><span>관리자 스텝</span><strong>${ADMIN_STEP}</strong></div><div class="admin-key-value"><span>캐시 키</span><strong>${ADMIN_CACHE_KEY}</strong></div></article>
          <article class="admin-soft-card"><h3>안전 기준</h3><ul><li>관리자 인증을 통과한 계정만 접근</li><li>승인 대기열은 서버 함수만 기록</li><li>검증된 백업 전 2차 승인 차단</li><li>영구 삭제 실행 모드 ${ADMIN_RELEASE.deletionMode}</li></ul></article>
        </div>
      </section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h2>승인 엔진 안전 상태</h2><p>서버 사전점검, 백업 확인과 실행 잠금 상태를 확인합니다.</p></div><span class="admin-status-pill ${status.deletionExecutionEnabledCount ? 'danger' : 'ok'}">${status.deletionExecutionEnabledCount ? '실행 활성 감지' : '영구 삭제 잠금'}</span></div>
        <section class="admin-grid admin-grid-3"><article class="admin-card admin-metric"><span>승인 대기열</span><strong>${status.deletionQueueCount}</strong><small>deletionActionQueue</small></article><article class="admin-card admin-metric"><span>검증된 백업</span><strong>${status.backupVerifiedCount}</strong><small>dataBackups</small></article><article class="admin-card admin-metric"><span>실행 활성</span><strong>${status.deletionExecutionEnabledCount}</strong><small>정상 기준 0건</small></article></section>
      </section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h2>데이터 관리 센터 · 읽기 점검</h2><p>실제 데이터를 변경하지 않고 운영자가 먼저 확인해야 할 데이터 구조와 위험 신호를 요약합니다.</p></div><span class="admin-status-pill muted">Read Only</span></div>
        <section class="admin-grid admin-grid-4">
          <article class="admin-card admin-metric"><span>사용자</span><strong>${status.usersCount}</strong><small>users 기준</small></article>
          <article class="admin-card admin-metric"><span>Room</span><strong>${status.roomsCount}</strong><small>rooms/roomMembers 통합</small></article>
          <article class="admin-card admin-metric"><span>Room 멤버</span><strong>${status.roomMembersCount}</strong><small>roomMembers 기준</small></article>
          <article class="admin-card admin-metric"><span>데이터 요청</span><strong>${status.requestsCount}</strong><small>처리 중 ${status.openRequestsCount}건</small></article>
        </section>
        <div class="admin-grid admin-grid-2">
          <article class="admin-soft-card"><h3>위험 신호</h3><ul><li>사용자 Room 연결 불일치: ${status.risks.userRoomMismatch.length}건</li><li>사용자 정보 없는 멤버십: ${status.risks.membershipsWithoutUser.length}건</li><li>멤버 없는 Room 데이터: ${status.risks.roomsWithoutMembers.length}건</li><li>열린 데이터 요청: ${status.risks.openRequests.length}건</li></ul></article>
          <article class="admin-soft-card"><h3>운영 판단</h3><p>${failed ? '읽기 실패 경로가 있습니다. 권한 또는 데이터 경로를 먼저 확인해야 합니다.' : '현재 읽기 점검 기준으로 즉시 확인할 연결 오류는 없습니다.'}</p></article>
        </div>
        <div class="admin-grid admin-grid-2">${renderCountList('요청 상태 분포', status.requestStatusCounts)}${renderCountList('요청 유형 분포', status.requestTypeCounts)}</div>
      </section>
      <section class="admin-card admin-panel"><h2>주요 데이터 경로 점검</h2><div class="admin-path-list">${status.reads.map((item) => `<div class="admin-list-row"><span><strong>${escapeHtml(item.label)}</strong><br><small>${escapeHtml(item.path)}</small></span><strong class="${item.ok ? 'admin-ok' : 'admin-danger'}">${item.ok ? `읽기 가능 · ${item.count}건` : '읽기 실패'}</strong></div>`).join('')}</div></section>
    </section>`;
}
