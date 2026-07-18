import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a12-action-guard-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a12-action-guard-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a12-action-guard-20260718';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function latestNumber(...values) {
  return values.map(Number).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => b - a)[0] || 0;
}

function roleLabel(member) {
  if (member.relationshipRole === 'dom') return '관리(Dom)';
  if (member.relationshipRole === 'sub') return '기록(Sub)';
  return member.role || '-';
}

async function loadRooms() {
  const database = getAdminDatabase();
  const [usersSnap, userRoomsSnap, roomMembersSnap, roomsSnap] = await Promise.all([
    database.ref('users').once('value'),
    database.ref('userRooms').once('value'),
    database.ref('roomMembers').once('value'),
    database.ref('rooms').once('value')
  ]);

  const users = asObject(usersSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const rooms = asObject(roomsSnap.val());
  const roomCodes = new Set([...Object.keys(rooms), ...Object.keys(roomMembers)]);

  Object.values(userRooms).forEach((roomsByUser) => {
    Object.keys(asObject(roomsByUser)).forEach((roomCode) => roomCodes.add(roomCode));
  });

  return [...roomCodes].filter(Boolean).map((roomCode) => {
    const members = { ...asObject(roomMembers[roomCode]) };
    Object.entries(userRooms).forEach(([uid, roomsByUser]) => {
      if (asObject(roomsByUser)[roomCode] && !members[uid]) members[uid] = asObject(asObject(roomsByUser)[roomCode]);
    });

    const memberRows = Object.entries(members).map(([uid, member]) => {
      const user = asObject(users[uid]);
      const profile = asObject(user.profile);
      return {
        uid,
        email: user.email || member.email || '',
        nickname: profile.nickname || user.nickname || member.nickname || '',
        role: roleLabel(asObject(member)),
        joinedAt: latestNumber(member.joinedAt, member.createdAt, member.updatedAt)
      };
    });

    return {
      roomCode,
      memberRows,
      hasRoomData: Boolean(rooms[roomCode]),
      updatedAt: latestNumber(rooms[roomCode]?.updatedAt, rooms[roomCode]?.createdAt, ...memberRows.map((member) => member.joinedAt))
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt || a.roomCode.localeCompare(b.roomCode));
}

function renderStats(rows) {
  const withData = rows.filter((row) => row.hasRoomData).length;
  const withoutMembers = rows.filter((row) => !row.memberRows.length).length;
  return `
    <div class="metric-grid admin-room-metrics">
      <article class="metric-card"><span>전체 Room</span><strong>${rows.length}</strong><small>통합 기준</small></article>
      <article class="metric-card"><span>Room 데이터</span><strong>${withData}</strong><small>rooms 존재</small></article>
      <article class="metric-card"><span>멤버 없음</span><strong>${withoutMembers}</strong><small>점검 필요</small></article>
      <article class="metric-card"><span>운영 모드</span><strong>읽기 전용</strong><small>Room 변경 없음</small></article>
    </div>`;
}

function renderRoomCard(row) {
  const search = [row.roomCode, ...row.memberRows.flatMap((member) => [member.email, member.nickname, member.uid])].join(' ').toLowerCase();
  return `
    <article class="admin-list-card" data-admin-room-row data-search="${escapeHtml(search)}">
      <div class="admin-list-card-head">
        <div>
          <strong>${escapeHtml(row.roomCode)}</strong>
          <p>${row.memberRows.length}명 · ${row.hasRoomData ? 'Room 데이터 있음' : 'Room 데이터 없음'}</p>
        </div>
        <span class="admin-status ${row.memberRows.length ? 'is-open' : 'is-closed'}">${row.memberRows.length ? '정상' : '멤버 없음'}</span>
      </div>
      <div class="admin-meta-row">
        <span>최근 ${escapeHtml(formatDateTime(row.updatedAt))}</span>
      </div>
      <div class="admin-mini-list">
        ${row.memberRows.map((member) => `
          <span>${escapeHtml(member.nickname || member.email || member.uid)} · ${escapeHtml(member.role)}</span>
        `).join('') || '<span>등록된 멤버가 없습니다.</span>'}
      </div>
    </article>`;
}

export async function render() {
  try {
    const rows = await loadRooms();
    return `
      ${renderStats(rows)}
      <section class="admin-card">
        <div class="admin-section-head">
          <div>
            <h2>Room 목록</h2>
            <p>Room 연결, 멤버 구성, 데이터 존재 여부를 읽기 전용으로 확인합니다.</p>
          </div>
          <input id="roomSearch" class="admin-input" type="search" placeholder="Room 검색" autocomplete="off">
        </div>
        <div id="roomRows" class="admin-list">
          ${rows.length ? rows.map(renderRoomCard).join('') : renderEmptyState('표시할 Room이 없습니다.', 'Room 데이터가 아직 없습니다.')}
        </div>
      </section>`;
  } catch (error) {
    console.error('[Admin Rooms] load failed', error);
    return `<section class="admin-card">${renderEmptyState('Room 목록을 불러오지 못했습니다.', error.message)}</section>`;
  }
}

export function afterRender() {
  const search = document.getElementById('roomSearch');
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-admin-room-row]').forEach((row) => {
      row.hidden = query && !row.dataset.search.includes(query);
    });
  });
}
