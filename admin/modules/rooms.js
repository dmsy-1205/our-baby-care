import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-data-center-readonly-20260719';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a11-data-center-readonly-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-data-center-readonly-20260719';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function latestNumber(...values) {
  return values.map(Number).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => b - a)[0] || 0;
}

function memberName(users, uid, member) {
  const user = asObject(users[uid]);
  const profile = asObject(user.profile);
  return profile.nickname || user.nickname || user.displayName || member.nickname || user.email || member.email || uid;
}

function memberRole(member) {
  if (member.relationshipRole === 'dom') return '관리(Dom)';
  if (member.relationshipRole === 'sub') return '기록(Sub)';
  return member.role || '-';
}

async function loadRooms() {
  const database = getAdminDatabase();
  const [usersSnap, roomsSnap, roomMembersSnap, userRoomsSnap] = await Promise.all([
    database.ref('users').once('value'),
    database.ref('rooms').once('value'),
    database.ref('roomMembers').once('value'),
    database.ref('userRooms').once('value')
  ]);

  const users = asObject(usersSnap.val());
  const rooms = asObject(roomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomCodes = new Set([...Object.keys(rooms), ...Object.keys(roomMembers)]);
  Object.values(userRooms).forEach((byUser) => Object.keys(asObject(byUser)).forEach((roomCode) => roomCodes.add(roomCode)));

  return [...roomCodes].filter(Boolean).map((roomCode) => {
    const room = asObject(rooms[roomCode]);
    const members = Object.entries(asObject(roomMembers[roomCode])).map(([uid, member]) => ({
      uid,
      ...asObject(member),
      name: memberName(users, uid, asObject(member)),
      email: asObject(users[uid]).email || asObject(member).email || ''
    }));
    const latest = latestNumber(room.updatedAt, room.createdAt, ...members.map((member) => member.updatedAt));
    let status = 'complete';
    let statusLabel = '연결 완료';
    if (!members.length) {
      status = 'empty';
      statusLabel = '멤버 없음';
    } else if (members.length === 1) {
      status = 'solo';
      statusLabel = '1인 사용';
    }
    return { roomCode, room, members, latest, status, statusLabel };
  }).sort((a, b) => b.latest - a.latest || a.roomCode.localeCompare(b.roomCode));
}

function renderMember(member) {
  return `
    <div class="admin-room-member">
      <div>
        <strong>${escapeHtml(member.name)}</strong>
        <span>${escapeHtml(member.email || '이메일 없음')}</span>
      </div>
      <div class="admin-room-member-tags">
        <span>${escapeHtml(memberRole(member))}</span>
        <span>UID ${escapeHtml(compactId(member.uid))}</span>
      </div>
    </div>`;
}

function renderRoomCard(row) {
  const search = [row.roomCode, row.members.map((member) => `${member.name} ${member.email} ${member.uid}`).join(' ')].join(' ').toLowerCase();
  return `
    <article class="admin-room-card" data-admin-room-row data-search="${escapeHtml(search)}">
      <div class="admin-room-head">
        <div>
          <strong class="admin-room-code">${escapeHtml(row.roomCode)}</strong>
          <p>${row.members.length}명 · Room 데이터 ${row.room && Object.keys(row.room).length ? '있음' : '확인 필요'}</p>
        </div>
        <span class="admin-room-status ${row.status}">${escapeHtml(row.statusLabel)}</span>
      </div>
      <div class="admin-room-meta">
        <span>최근 ${escapeHtml(formatDateTime(row.latest))}</span>
        <span>멤버 ${row.members.length}명</span>
      </div>
      <div class="admin-room-members">
        ${row.members.length ? row.members.map(renderMember).join('') : '<p class="admin-room-empty">연결된 멤버가 없습니다.</p>'}
      </div>
    </article>`;
}

export async function render() {
  const rows = await loadRooms();
  const withData = rows.filter((row) => row.room && Object.keys(row.room).length).length;
  const withoutMembers = rows.filter((row) => !row.members.length).length;
  const body = rows.length
    ? `<div class="admin-room-list">${rows.map(renderRoomCard).join('')}</div>`
    : renderEmptyState('Room 없음', '읽어온 Room 데이터가 없습니다.', '⌂');

  return `
    <section class="module-view" aria-labelledby="roomsHeading">
      <div class="metric-grid">
        <article class="metric-card"><span>전체 Room</span><strong>${rows.length}</strong><small>통합 기준</small></article>
        <article class="metric-card"><span>Room 데이터</span><strong>${withData}</strong><small>rooms 존재</small></article>
        <article class="metric-card"><span>멤버 없음</span><strong>${withoutMembers}</strong><small>점검 필요</small></article>
        <article class="metric-card"><span>운영 모드</span><strong>읽기 전용</strong><small>Room 변경 없음</small></article>
      </div>

      <article class="panel">
        <div class="panel-header admin-room-panel-header">
          <div>
            <h2 id="roomsHeading">Room 목록</h2>
            <p>Room 연결, 멤버 구성, 데이터 존재 여부를 읽기 전용으로 확인합니다.</p>
          </div>
          <input class="admin-user-search" type="search" placeholder="Room 검색" data-admin-filter="admin-room-row">
        </div>
        ${body}
      </article>
    </section>`;
}
