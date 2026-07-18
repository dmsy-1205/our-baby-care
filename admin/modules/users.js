import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { asObject, compactId, escapeHtml, formatDateTime, latestNumber } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-1-clean-baseline-20260719';

let users = [];
let query = '';

async function loadUsers() {
  const database = getAdminDatabase();
  const [usersSnap, userRoomsSnap, roomMembersSnap] = await Promise.all([
    database.ref('users').once('value'),
    database.ref('userRooms').once('value'),
    database.ref('roomMembers').once('value')
  ]);

  const usersValue = asObject(usersSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const memberUids = new Set();
  Object.values(roomMembers).forEach((members) => Object.keys(asObject(members)).forEach((uid) => memberUids.add(uid)));

  const uidSet = new Set([...Object.keys(usersValue), ...Object.keys(userRooms), ...memberUids]);
  users = [...uidSet].map((uid) => {
    const profile = asObject(usersValue[uid]);
    const rooms = Object.keys(asObject(userRooms[uid]));
    const memberRooms = Object.entries(roomMembers)
      .filter(([, members]) => Boolean(asObject(members)[uid]))
      .map(([roomCode]) => roomCode);
    const allRooms = [...new Set([...rooms, ...memberRooms])];
    const role = allRooms.map((roomCode) => asObject(roomMembers[roomCode]?.[uid]).role).find(Boolean) || profile.role || '-';

    return {
      uid,
      email: profile.email || profile.userEmail || '',
      nickname: profile.nickname || profile.displayName || profile.name || profile.email || uid,
      rooms: allRooms,
      role,
      lastSeen: latestNumber(profile.lastSeen, profile.updatedAt, profile.createdAt)
    };
  }).sort((a, b) => b.lastSeen - a.lastSeen);
}

function filteredUsers() {
  const keyword = query.toLowerCase();
  if (!keyword) return users;
  return users.filter((user) => [
    user.uid,
    user.email,
    user.nickname,
    user.role,
    ...user.rooms
  ].join(' ').toLowerCase().includes(keyword));
}

function renderUserCard(user) {
  const initial = (user.nickname || user.email || '?').slice(0, 1).toUpperCase();
  const roomText = user.rooms.length ? `Room ${user.rooms[0]}${user.rooms.length > 1 ? ` 외 ${user.rooms.length - 1}` : ''}` : 'Room 미연결';
  return `
    <article class="admin-card admin-list-card">
      <div class="admin-avatar">${escapeHtml(initial)}</div>
      <div>
        <h3>${escapeHtml(user.nickname || user.email || user.uid)}</h3>
        <p>${escapeHtml(user.email || '이메일 없음')}</p>
        <div class="admin-meta-row">
          <span>UID ${escapeHtml(compactId(user.uid))}</span>
          <span>${escapeHtml(roomText)}</span>
          <span>역할 ${escapeHtml(user.role || '-')}</span>
          <span>최근 ${escapeHtml(formatDateTime(user.lastSeen))}</span>
        </div>
      </div>
    </article>
  `;
}

function renderShell() {
  const connected = users.filter((user) => user.rooms.length > 0).length;
  const filtered = filteredUsers();

  return `
    <section class="module-view" aria-labelledby="usersHeading">
      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>전체 사용자</span><strong>${users.length}</strong><small>users/roomMembers 통합</small></article>
        <article class="admin-card admin-metric"><span>Room 연결</span><strong>${connected}</strong><small>연결 확인</small></article>
        <article class="admin-card admin-metric"><span>미연결</span><strong>${users.length - connected}</strong><small>Room 없음</small></article>
        <article class="admin-card admin-metric"><span>운영 모드</span><strong>읽기 전용</strong><small>사용자 데이터 변경 없음</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2 id="usersHeading">사용자 목록</h2>
            <p>가입자, Room 연결, 역할 정보를 읽기 전용으로 확인합니다.</p>
          </div>
          <input data-user-search type="search" placeholder="사용자 검색" value="${escapeHtml(query)}">
        </div>
        <div class="admin-list">
          ${filtered.length ? filtered.map(renderUserCard).join('') : renderEmptyState('사용자 없음', '검색 조건에 맞는 사용자가 없습니다.')}
        </div>
      </section>
    </section>
  `;
}

export async function render() {
  await loadUsers();
  return renderShell();
}

export function afterRender(root) {
  root.addEventListener('input', (event) => {
    if (!event.target.matches('[data-user-search]')) return;
    query = event.target.value.trim();
    root.innerHTML = renderShell();
    root.querySelector('[data-user-search]')?.focus();
  });
}
