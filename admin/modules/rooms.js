import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { asObject, escapeHtml, formatDateTime, latestNumber } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';

let rooms = [];
let query = '';

async function loadRooms() {
  const database = getAdminDatabase();
  const [roomsSnap, roomMembersSnap, usersSnap] = await Promise.all([
    database.ref('rooms').once('value'),
    database.ref('roomMembers').once('value'),
    database.ref('users').once('value')
  ]);

  const roomsValue = asObject(roomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const users = asObject(usersSnap.val());
  const roomCodes = new Set([...Object.keys(roomsValue), ...Object.keys(roomMembers)]);

  rooms = [...roomCodes].map((roomCode) => {
    const room = asObject(roomsValue[roomCode]);
    const members = asObject(roomMembers[roomCode]);
    const memberRows = Object.entries(members).map(([uid, member]) => {
      const info = asObject(member);
      return {
        uid,
        role: info.relationshipRole || info.role || '-',
        email: users[uid]?.email || info.email || uid
      };
    });

    return {
      roomCode,
      hasData: Boolean(roomsValue[roomCode]),
      members: memberRows,
      updatedAt: latestNumber(room.updatedAt, room.createdAt)
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

function filteredRooms() {
  const keyword = query.toLowerCase();
  if (!keyword) return rooms;
  return rooms.filter((room) => [
    room.roomCode,
    ...room.members.map((member) => `${member.email} ${member.role} ${member.uid}`)
  ].join(' ').toLowerCase().includes(keyword));
}

function renderRoomRow(room) {
  const owner = room.members.find((member) => member.role === 'owner' || member.role === 'dom');
  const partner = room.members.find((member) => member.role === 'partner' || member.role === 'sub');
  return `
    <tr>
      <td><strong>${escapeHtml(room.roomCode)}</strong><br><small>${room.hasData ? '데이터 있음' : '데이터 없음'}</small></td>
      <td>${escapeHtml(owner?.email || '-')}</td>
      <td>${escapeHtml(partner?.email || '-')}</td>
      <td>${room.members.length}명</td>
      <td><span class="admin-status-pill ${room.hasData ? 'ok' : 'warn'}">${room.hasData ? '정상' : '점검 필요'}</span></td>
      <td>${escapeHtml(formatDateTime(room.updatedAt))}</td>
    </tr>
  `;
}

function renderShell() {
  const filtered = filteredRooms();

  return `
    <section class="module-view" aria-labelledby="roomsHeading">
      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2 id="roomsHeading">Room 관리</h2>
            <p>기존 관리자 콘솔 형식으로 Owner와 Partner 연결을 확인합니다. 전체 ${rooms.length}개</p>
          </div>
          <input class="admin-table-search" data-room-search type="search" placeholder="Room Code, 이메일, UID 검색" value="${escapeHtml(query)}">
        </div>
        <div class="admin-table-wrap">
          <table class="admin-data-table">
            <thead><tr><th>Room</th><th>Dom / Owner</th><th>Sub / Partner</th><th>멤버</th><th>상태</th><th>최근 갱신</th></tr></thead>
            <tbody>${filtered.length ? filtered.map(renderRoomRow).join('') : '<tr><td colspan="6">검색 조건에 맞는 Room이 없습니다.</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    </section>
  `;
}

export async function render() {
  await loadRooms();
  return renderShell();
}

export function afterRender(root) {
  root.addEventListener('input', (event) => {
    if (!event.target.matches('[data-room-search]')) return;
    query = event.target.value.trim();
    root.innerHTML = renderShell();
    root.querySelector('[data-room-search]')?.focus();
  });
}
