import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { asObject, compactId, escapeHtml, formatDateTime, latestNumber } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';

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
    const userData = asObject(usersValue[uid]);
    const profile = { ...userData, ...asObject(userData.profile) };
    const rooms = Object.keys(asObject(userRooms[uid]));
    const memberRooms = Object.entries(roomMembers)
      .filter(([, members]) => Boolean(asObject(members)[uid]))
      .map(([roomCode]) => roomCode);
    const allRooms = [...new Set([...rooms, ...memberRooms])];
    const role = allRooms.map((roomCode) => asObject(roomMembers[roomCode]?.[uid]).role).find(Boolean) || profile.role || '-';

    return {
      uid,
      email: userData.email || profile.email || profile.userEmail || '',
      nickname: profile.nickname || profile.displayName || profile.name || profile.email || uid,
      rooms: allRooms,
      role,
      lastSeen: latestNumber(profile.lastSeen, profile.updatedAt, userData.updatedAt, userData.createdAt)
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

function renderUserRow(user) {
  const roomText = user.rooms.length ? `Room ${user.rooms[0]}${user.rooms.length > 1 ? ` 외 ${user.rooms.length - 1}` : ''}` : 'Room 미연결';
  return `
    <tr>
      <td><strong>${escapeHtml(user.nickname || '-')}</strong><br><small>${escapeHtml(user.email || '이메일 없음')}</small></td>
      <td><span class="admin-status-pill ${user.email ? 'ok' : 'warn'}">${user.email ? '확인' : '정보 없음'}</span></td>
      <td>${escapeHtml(roomText)}</td>
      <td>${escapeHtml(user.role || '-')}</td>
      <td>${escapeHtml(formatDateTime(user.lastSeen))}</td>
      <td><code title="${escapeHtml(user.uid)}">${escapeHtml(compactId(user.uid))}</code></td>
    </tr>
  `;
}

function renderShell() {
  const filtered = filteredUsers();

  return `
    <section class="module-view" aria-labelledby="usersHeading">
      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2 id="usersHeading">사용자 관리</h2>
            <p>기존 관리자 콘솔 형식으로 사용자, 인증, Room 연결 정보를 확인합니다. 전체 ${users.length}명</p>
          </div>
          <input class="admin-table-search" data-user-search type="search" placeholder="이메일, 닉네임, UID 검색" value="${escapeHtml(query)}">
        </div>
        <div class="admin-table-wrap">
          <table class="admin-data-table">
            <thead><tr><th>사용자</th><th>인증</th><th>Room</th><th>역할</th><th>가입/갱신</th><th>UID</th></tr></thead>
            <tbody>${filtered.length ? filtered.map(renderUserRow).join('') : '<tr><td colspan="6">검색 조건에 맞는 사용자가 없습니다.</td></tr>'}</tbody>
          </table>
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
