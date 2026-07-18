import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-route-render-fix-20260719';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a11-route-render-fix-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-route-render-fix-20260719';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function latestNumber(...values) {
  return values.map(Number).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => b - a)[0] || 0;
}

function profileName(user, uid) {
  const profile = asObject(user.profile);
  return profile.nickname || user.nickname || user.displayName || user.email || uid || '이름 없음';
}

function roleLabel(member) {
  if (member.relationshipRole === 'dom') return '관리(Dom)';
  if (member.relationshipRole === 'sub') return '기록(Sub)';
  if (member.role === 'owner') return 'Owner';
  if (member.role === 'partner') return 'Partner';
  return member.role || '-';
}

async function loadUsers() {
  const database = getAdminDatabase();
  const [usersSnap, userRoomsSnap, roomMembersSnap] = await Promise.all([
    database.ref('users').once('value'),
    database.ref('userRooms').once('value'),
    database.ref('roomMembers').once('value')
  ]);

  const users = asObject(usersSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const ids = new Set([...Object.keys(users), ...Object.keys(userRooms)]);
  const membership = {};

  Object.entries(roomMembers).forEach(([roomCode, members]) => {
    Object.entries(asObject(members)).forEach(([uid, member]) => {
      ids.add(uid);
      if (!membership[uid]) membership[uid] = [];
      membership[uid].push({ roomCode, ...asObject(member) });
    });
  });

  return [...ids].map((uid) => {
    const user = asObject(users[uid]);
    const roomsFromUser = Object.keys(asObject(userRooms[uid]));
    const roomsFromMembers = (membership[uid] || []).map((item) => item.roomCode);
    const roomCodes = [...new Set([...roomsFromUser, ...roomsFromMembers].filter(Boolean))];
    const latest = latestNumber(user.updatedAt, user.lastSeenAt, user.createdAt, ...(membership[uid] || []).map((item) => item.updatedAt));
    const primaryMember = membership[uid]?.[0] || {};
    return {
      uid,
      name: profileName(user, uid),
      email: user.email || primaryMember.email || '',
      roomCodes,
      role: roleLabel(primaryMember),
      latest,
      connected: roomCodes.length > 0
    };
  }).sort((a, b) => b.latest - a.latest || a.name.localeCompare(b.name, 'ko'));
}

function renderUserCard(row) {
  const search = [row.name, row.email, row.uid, row.roomCodes.join(' '), row.role].join(' ').toLowerCase();
  return `
    <article class="admin-user-card" data-admin-user-row data-search="${escapeHtml(search)}">
      <div class="admin-user-avatar" aria-hidden="true">${escapeHtml((row.name || row.email || '?').slice(0, 1).toUpperCase())}</div>
      <div class="admin-user-main">
        <div class="admin-user-title">
          <strong>${escapeHtml(row.name)}</strong>
          <span class="admin-user-status ${row.connected ? 'ok' : 'needs-check'}">${row.connected ? '정상' : 'Room 미연결'}</span>
        </div>
        <div class="admin-user-sub">${escapeHtml(row.email || '이메일 없음')}</div>
        <div class="admin-user-meta">
          <span>UID ${escapeHtml(compactId(row.uid))}</span>
          <span>Room ${escapeHtml(row.roomCodes[0] || '미연결')}${row.roomCodes.length > 1 ? ` 외 ${row.roomCodes.length - 1}` : ''}</span>
          <span>역할 ${escapeHtml(row.role)}</span>
          <span>최근 ${escapeHtml(formatDateTime(row.latest))}</span>
        </div>
      </div>
    </article>`;
}

export async function render() {
  const rows = await loadUsers();
  const connected = rows.filter((row) => row.connected).length;
  const unlinked = rows.length - connected;
  const body = rows.length
    ? `<div class="admin-user-list">${rows.map(renderUserCard).join('')}</div>`
    : renderEmptyState('사용자 없음', '읽어온 사용자 데이터가 없습니다.', '♙');

  return `
    <section class="module-view" aria-labelledby="usersHeading">
      <div class="metric-grid">
        <article class="metric-card"><span>전체 사용자</span><strong>${rows.length}</strong><small>users · roomMembers 통합</small></article>
        <article class="metric-card"><span>Room 연결</span><strong>${connected}</strong><small>연결 확인</small></article>
        <article class="metric-card"><span>미연결</span><strong>${unlinked}</strong><small>Room 없음</small></article>
        <article class="metric-card"><span>운영 모드</span><strong>읽기 전용</strong><small>사용자 데이터 변경 없음</small></article>
      </div>

      <article class="panel">
        <div class="panel-header admin-user-panel-header">
          <div>
            <h2 id="usersHeading">사용자 목록</h2>
            <p>가입자, Room 연결, 역할 정보를 읽기 전용으로 확인합니다.</p>
          </div>
          <input class="admin-user-search" type="search" placeholder="사용자 검색" data-admin-filter="admin-user-row">
        </div>
        ${body}
      </article>
    </section>`;
}
