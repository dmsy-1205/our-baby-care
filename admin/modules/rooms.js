import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { asObject, escapeHtml, formatDateTime, latestNumber } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-1-clean-baseline-20260719';

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
        role: info.role || '-',
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

function renderRoomCard(room) {
  return `
    <article class="admin-card admin-list-card">
      <div>
        <h3>${escapeHtml(room.roomCode)}</h3>
        <p>${room.members.length}명 · Room 데이터 ${room.hasData ? '있음' : '없음'}</p>
        <div class="admin-meta-row">
          <span>${room.hasData ? '정상' : '점검 필요'}</span>
          <span>최근 ${escapeHtml(formatDateTime(room.updatedAt))}</span>
        </div>
        <div class="admin-meta-row">
          ${room.members.map((member) => `<span>${escapeHtml(member.email)} · ${escapeHtml(member.role)}</span>`).join('')}
        </div>
      </div>
    </article>
  `;
}

function renderShell() {
  const emptyRooms = rooms.filter((room) => room.members.length === 0).length;
  const filtered = filteredRooms();

  return `
    <section class="module-view" aria-labelledby="roomsHeading">
      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>전체 Room</span><strong>${rooms.length}</strong><small>통합 기준</small></article>
        <article class="admin-card admin-metric"><span>Room 데이터</span><strong>${rooms.filter((room) => room.hasData).length}</strong><small>rooms 존재</small></article>
        <article class="admin-card admin-metric"><span>멤버 없음</span><strong>${emptyRooms}</strong><small>점검 필요</small></article>
        <article class="admin-card admin-metric"><span>운영 모드</span><strong>읽기 전용</strong><small>Room 변경 없음</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2 id="roomsHeading">Room 목록</h2>
            <p>Room 연결, 멤버 구성, 데이터 존재 여부를 읽기 전용으로 확인합니다.</p>
          </div>
          <input data-room-search type="search" placeholder="Room 검색" value="${escapeHtml(query)}">
        </div>
        <div class="admin-list">
          ${filtered.length ? filtered.map(renderRoomCard).join('') : renderEmptyState('Room 없음', '검색 조건에 맞는 Room이 없습니다.')}
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
