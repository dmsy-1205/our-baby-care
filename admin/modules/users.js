import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a12-action-guard-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a12-action-guard-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a12-action-guard-20260718';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (text.length <= 12) return text || '-';
  return `${text.slice(0, 6)}…${text.slice(-5)}`;
}

function latestNumber(...values) {
  return values.map(Number).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => b - a)[0] || 0;
}

function roleLabel(role, relationshipRole) {
  if (relationshipRole === 'dom') return '관리(Dom)';
  if (relationshipRole === 'sub') return '기록(Sub)';
  if (role === 'owner') return 'Owner';
  if (role === 'partner') return 'Partner';
  return role || '-';
}

function roomLabel(activeRoom, roomCodes) {
  const codes = [...new Set([activeRoom, ...roomCodes].filter(Boolean))];
  if (!codes.length) return '미연결';
  if (codes.length === 1) return codes[0];
  return `${codes[0]} 외 ${codes.length - 1}`;
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
  const userIds = new Set([...Object.keys(users), ...Object.keys(userRooms)]);
  const memberIndex = {};

  Object.entries(roomMembers).forEach(([roomCode, members]) => {
    Object.entries(asObject(members)).forEach(([uid, member]) => {
      userIds.add(uid);
      if (!memberIndex[uid]) memberIndex[uid] = [];
      memberIndex[uid].push({ roomCode, ...asObject(member) });
    });
  });

  return [...userIds].map((uid) => {
    const user = asObject(users[uid]);
    const profile = asObject(user.profile);
    const memberships = memberIndex[uid] || [];
    const roomCodes = [
      ...Object.keys(asObject(userRooms[uid])),
      ...memberships.map((item) => item.roomCode)
    ].filter(Boolean);
    const primaryMember = memberships.find((item) => item.roomCode === user.activeRoom) || memberships[0] || {};
    const nickname = profile.nickname || user.nickname || user.displayName || '';
    const email = user.email || primaryMember.email || '';
    const lastSeen = latestNumber(user.lastLogin, user.lastSeenAt, user.updatedAt, profile.updatedAt, primaryMember.joinedAt);

    return {
      uid,
      nickname,
      email,
      activeRoom: user.activeRoom || '',
      roomCodes: [...new Set(roomCodes)],
      role: roleLabel(primaryMember.role, primaryMember.relationshipRole || user.relationshipRole),
      lastSeen
    };
  }).sort((a, b) => b.lastSeen - a.lastSeen || (a.email || a.nickname).localeCompare(b.email || b.nickname));
}

function renderStats(rows) {
  const connected = rows.filter((row) => row.roomCodes.length).length;
  const disconnected = rows.length - connected;
  return `
    <div class="metric-grid admin-user-metrics">
      <article class="metric-card"><span>전체 사용자</span><strong>${rows.length}</strong><small>users/roomMembers 통합</small></article>
      <article class="metric-card"><span>Room 연결</span><strong>${connected}</strong><small>연결 확인</small></article>
      <article class="metric-card"><span>미연결</span><strong>${disconnected}</strong><small>Room 없음</small></article>
      <article class="metric-card"><span>운영 모드</span><strong>읽기 전용</strong><small>사용자 데이터 변경 없음</small></article>
    </div>`;
}

function renderUserCard(row) {
  const title = row.nickname || row.email || '이름 없음';
  const search = [row.uid, row.nickname, row.email, row.role, ...row.roomCodes].join(' ').toLowerCase();
  return `
    <article class="admin-list-card" data-admin-user-row data-search="${escapeHtml(search)}">
      <div class="admin-list-card-head">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(row.email || '이메일 정보 없음')}</p>
        </div>
        <span class="admin-status ${row.roomCodes.length ? 'is-open' : 'is-closed'}">${row.roomCodes.length ? '정상' : '미연결'}</span>
      </div>
      <div class="admin-meta-row">
        <span>UID ${escapeHtml(shortUid(row.uid))}</span>
        <span>Room ${escapeHtml(roomLabel(row.activeRoom, row.roomCodes))}</span>
        <span>역할 ${escapeHtml(row.role)}</span>
        <span>최근 ${escapeHtml(formatDateTime(row.lastSeen))}</span>
      </div>
    </article>`;
}

export async function render() {
  try {
    const rows = await loadUsers();
    return `
      ${renderStats(rows)}
      <section class="admin-card">
        <div class="admin-section-head">
          <div>
            <h2>사용자 목록</h2>
            <p>가입자, Room 연결, 역할 정보를 읽기 전용으로 확인합니다.</p>
          </div>
          <input id="userSearch" class="admin-input" type="search" placeholder="사용자 검색" autocomplete="off">
        </div>
        <div id="userRows" class="admin-list">
          ${rows.length ? rows.map(renderUserCard).join('') : renderEmptyState('표시할 사용자가 없습니다.', '사용자 데이터가 아직 없습니다.')}
        </div>
      </section>`;
  } catch (error) {
    console.error('[Admin Users] load failed', error);
    return `<section class="admin-card">${renderEmptyState('사용자 목록을 불러오지 못했습니다.', error.message)}</section>`;
  }
}

export function afterRender() {
  const search = document.getElementById('userSearch');
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-admin-user-row]').forEach((row) => {
      row.hidden = query && !row.dataset.search.includes(query);
    });
  });
}
