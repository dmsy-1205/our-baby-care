import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a2-data-request-actions-20260718';
import { getState } from '../admin-state.js?v=admin-2-0-a2-data-request-actions-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a2-data-request-actions-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a2-data-request-actions-20260718';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (text.length <= 12) return text || '-';
  return `${text.slice(0, 6)}…${text.slice(-5)}`;
}

function roleLabel(role, relationshipRole) {
  if (relationshipRole === 'dom') return '관리(Dom)';
  if (relationshipRole === 'sub') return '기록(Sub)';
  if (role === 'owner') return 'Owner';
  if (role === 'partner') return 'Partner';
  return '-';
}

function roomLabel(activeRoom, roomCodes) {
  const codes = [...new Set([activeRoom, ...roomCodes].filter(Boolean))];
  if (!codes.length) return '미연결';
  if (codes.length === 1) return codes[0];
  return `${codes[0]} 외 ${codes.length - 1}`;
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

async function loadUserDirectory() {
  const database = getAdminDatabase();
  const state = getState();
  const currentAdminUid = state.user?.uid || '';
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

  const rows = [...userIds].map((uid) => {
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
      relationshipRole: primaryMember.relationshipRole || user.relationshipRole || '',
      isAdmin: uid === currentAdminUid,
      requiresEmailVerification: user.emailVerificationRequired === true,
      lastSeen
    };
  }).sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    return b.lastSeen - a.lastSeen;
  });

  return rows;
}

function renderStats(rows) {
  const linked = rows.filter((row) => row.roomCodes.length || row.activeRoom).length;
  const admins = rows.filter((row) => row.isAdmin).length;
  const needsCheck = rows.filter((row) => !row.email || (!row.roomCodes.length && !row.activeRoom)).length;
  const verificationFlags = rows.filter((row) => row.requiresEmailVerification).length;
  return `
    <div class="metric-grid admin-user-metrics">
      <article class="metric-card"><span>전체 회원</span><strong>${rows.length}</strong><small>users/userRooms 기준</small></article>
      <article class="metric-card"><span>Room 연결</span><strong>${linked}</strong><small>activeRoom 또는 membership</small></article>
      <article class="metric-card"><span>현재 관리자</span><strong>${admins}</strong><small>로그인한 관리자 기준</small></article>
      <article class="metric-card"><span>확인 참고</span><strong>${needsCheck}</strong><small>이메일 없음 또는 Room 미연결</small></article>
      <article class="metric-card"><span>인증 플래그</span><strong>${verificationFlags}</strong><small>DB에 남은 보조 표시</small></article>
    </div>`;
}

function renderUserCard(row) {
  const name = row.nickname || row.email || '이름 없음';
  const initial = String(name).trim().slice(0, 1).toUpperCase() || '♡';
  const room = roomLabel(row.activeRoom, row.roomCodes);
  const connected = Boolean(row.activeRoom || row.roomCodes.length);
  const statusClass = !row.email || !connected ? 'needs-check' : 'ok';
  const statusText = !row.email ? '이메일 정보 없음' : (!connected ? 'Room 미연결' : '정상');
  const verificationFlag = row.requiresEmailVerification ? '<span>인증 플래그 남음</span>' : '';
  return `
    <article class="admin-user-card" data-admin-user-row data-search="${escapeHtml(`${name} ${row.email} ${row.uid} ${room} ${row.role}`.toLowerCase())}">
      <div class="admin-user-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
      <div class="admin-user-main">
        <div class="admin-user-title">
          <strong>${escapeHtml(name)}</strong>
          ${row.isAdmin ? '<span class="status-pill">Admin</span>' : ''}
          <span class="admin-user-status ${statusClass}">${statusText}</span>
        </div>
        <div class="admin-user-sub">${escapeHtml(row.email || '이메일 없음')}</div>
        <div class="admin-user-meta">
          <span>UID ${escapeHtml(shortUid(row.uid))}</span>
          <span>Room ${escapeHtml(room)}</span>
          <span>역할 ${escapeHtml(row.role)}</span>
          <span>최근 ${escapeHtml(formatDateTime(row.lastSeen))}</span>
          ${verificationFlag}
        </div>
      </div>
    </article>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return renderEmptyState('표시할 회원이 없습니다', '아직 users 또는 userRooms 데이터가 없습니다.');
  }
  return `<div class="admin-user-list">${rows.map(renderUserCard).join('')}</div>`;
}

export async function render() {
  try {
    const rows = await loadUserDirectory();
    return `
      <section class="module-view" aria-labelledby="adminUsersHeading">
        <div class="foundation-notice">
          <div><span class="notice-icon" aria-hidden="true">👥</span></div>
          <div>
            <h2 id="adminUsersHeading">사용자 목록 읽기 전용</h2>
            <p>가입 회원, Room 연결 상태, Dom/Sub 역할을 조회합니다. 이메일 인증 플래그는 실제 미인증 판정이 아니라 DB에 남은 참고 표시로만 다룹니다.</p>
          </div>
        </div>
        ${renderStats(rows)}
        <article class="panel">
          <div class="panel-header admin-user-panel-header">
            <div>
              <h2>회원 목록</h2>
              <p>이메일, 닉네임, UID, Room 코드로 빠르게 찾을 수 있습니다.</p>
            </div>
            <input id="adminUserSearch" class="admin-user-search" type="search" placeholder="회원 검색">
          </div>
          ${renderRows(rows)}
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin Users] load failed', error);
    return `
      <section class="module-view">
        <div class="error-card">
          <strong>사용자 목록을 불러오지 못했습니다.</strong>
          <p>${escapeHtml(error.message || error)}</p>
        </div>
      </section>`;
  }
}

export function afterRender() {
  const search = document.getElementById('adminUserSearch');
  if (!search) return;
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-admin-user-row]').forEach((row) => {
      row.hidden = Boolean(query) && !String(row.dataset.search || '').includes(query);
    });
  });
}
