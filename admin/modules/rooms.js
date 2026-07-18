import { getAdminDatabase } from '../admin-api.js?v=step6-2-13-3-admin-room-directory-readonly-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=step6-2-13-3-admin-room-directory-readonly-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=step6-2-13-3-admin-room-directory-readonly-20260718';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (text.length <= 12) return text || '-';
  return `${text.slice(0, 6)}…${text.slice(-5)}`;
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

function roleLabel(member) {
  if (member.relationshipRole === 'dom') return '관리(Dom)';
  if (member.relationshipRole === 'sub') return '기록(Sub)';
  if (member.role === 'owner') return 'Owner';
  if (member.role === 'partner') return 'Partner';
  return member.role || '-';
}

function profileName(users, uid, member) {
  const user = asObject(users[uid]);
  const profile = asObject(user.profile);
  return profile.nickname || user.nickname || user.displayName || member.nickname || user.email || member.email || uid;
}

function profileEmail(users, uid, member) {
  const user = asObject(users[uid]);
  return user.email || member.email || '';
}

function collectRoomCodes(roomMembers, userRooms) {
  const roomCodes = new Set(Object.keys(roomMembers));
  Object.values(userRooms).forEach((roomsByUser) => {
    Object.keys(asObject(roomsByUser)).forEach((roomCode) => roomCodes.add(roomCode));
  });
  return [...roomCodes].filter(Boolean);
}

async function readRoomMeta(database, roomCode) {
  try {
    const snap = await database.ref(`rooms/${roomCode}/meta`).once('value');
    return asObject(snap.val());
  } catch (error) {
    console.warn('[Admin Rooms] meta read failed', roomCode, error);
    return { _metaReadError: true };
  }
}

function buildMemberRows(roomCode, roomMembers, userRooms, users) {
  const members = { ...asObject(roomMembers[roomCode]) };
  Object.entries(userRooms).forEach(([uid, roomsByUser]) => {
    if (asObject(roomsByUser)[roomCode] && !members[uid]) {
      members[uid] = asObject(asObject(roomsByUser)[roomCode]);
    }
  });

  return Object.entries(members).map(([uid, rawMember]) => {
    const member = asObject(rawMember);
    return {
      uid,
      role: roleLabel(member),
      relationshipRole: member.relationshipRole || '',
      email: profileEmail(users, uid, member),
      nickname: profileName(users, uid, member),
      joinedAt: latestNumber(member.joinedAt, member.createdAt, member.updatedAt)
    };
  }).sort((a, b) => {
    const roleRank = { dom: 0, sub: 1 };
    return (roleRank[a.relationshipRole] ?? 9) - (roleRank[b.relationshipRole] ?? 9) || b.joinedAt - a.joinedAt;
  });
}

function getRoomStatus(row) {
  if (row.meta._metaReadError) return { className: 'warn', label: 'Meta 확인 필요' };
  if (row.memberRows.length >= 2 || row.hasPartner) return { className: 'complete', label: '연결 완료' };
  if (row.memberRows.length === 1) return { className: 'solo', label: '혼자 사용' };
  return { className: 'empty', label: '멤버 없음' };
}

async function loadRoomDirectory() {
  const database = getAdminDatabase();
  const [usersSnap, userRoomsSnap, roomMembersSnap] = await Promise.all([
    database.ref('users').once('value'),
    database.ref('userRooms').once('value'),
    database.ref('roomMembers').once('value')
  ]);

  const users = asObject(usersSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const roomCodes = collectRoomCodes(roomMembers, userRooms);
  const metaEntries = await Promise.all(roomCodes.map(async (roomCode) => [roomCode, await readRoomMeta(database, roomCode)]));
  const metaByRoom = Object.fromEntries(metaEntries);

  return roomCodes.map((roomCode) => {
    const meta = metaByRoom[roomCode] || {};
    const memberRows = buildMemberRows(roomCode, roomMembers, userRooms, users);
    const owner = memberRows.find((member) => member.relationshipRole === 'dom' || member.role === 'Owner') || memberRows[0] || {};
    const partner = memberRows.find((member) => member.relationshipRole === 'sub' || member.role === 'Partner') || {};
    const createdAt = latestNumber(meta.createdAt, meta.updatedAt, owner.joinedAt, partner.joinedAt, ...memberRows.map((member) => member.joinedAt));
    const row = {
      roomCode,
      meta,
      memberRows,
      memberCount: memberRows.length,
      owner,
      partner,
      hasPartner: Boolean(meta.partnerUid || partner.uid),
      createdAt
    };
    return { ...row, status: getRoomStatus(row) };
  }).sort((a, b) => b.createdAt - a.createdAt || a.roomCode.localeCompare(b.roomCode));
}

function renderStats(rows) {
  const complete = rows.filter((row) => row.status.className === 'complete').length;
  const solo = rows.filter((row) => row.status.className === 'solo').length;
  const needsCheck = rows.filter((row) => row.status.className === 'warn' || row.status.className === 'empty').length;
  return `
    <div class="metric-grid admin-room-metrics">
      <article class="metric-card"><span>전체 Room</span><strong>${rows.length}</strong><small>roomMembers/userRooms 기준</small></article>
      <article class="metric-card"><span>연결 완료</span><strong>${complete}</strong><small>Dom/Sub 또는 2명 이상</small></article>
      <article class="metric-card"><span>혼자 사용</span><strong>${solo}</strong><small>멤버 1명 Room</small></article>
      <article class="metric-card"><span>확인 참고</span><strong>${needsCheck}</strong><small>Meta 또는 멤버 확인 필요</small></article>
    </div>`;
}

function renderMember(member) {
  return `
    <div class="admin-room-member">
      <div>
        <strong>${escapeHtml(member.nickname || '이름 없음')}</strong>
        <span>${escapeHtml(member.email || '이메일 없음')}</span>
      </div>
      <div class="admin-room-member-tags">
        <span>${escapeHtml(member.role)}</span>
        <span>UID ${escapeHtml(shortUid(member.uid))}</span>
        <span>참여 ${escapeHtml(formatDateTime(member.joinedAt))}</span>
      </div>
    </div>`;
}

function renderRoomCard(row) {
  const searchable = [
    row.roomCode,
    row.status.label,
    row.owner.nickname,
    row.owner.email,
    row.partner.nickname,
    row.partner.email,
    ...row.memberRows.flatMap((member) => [member.uid, member.nickname, member.email, member.role])
  ].join(' ').toLowerCase();

  return `
    <article class="admin-room-card" data-admin-room-row data-search="${escapeHtml(searchable)}">
      <div class="admin-room-head">
        <div>
          <strong class="admin-room-code">Room ${escapeHtml(row.roomCode)}</strong>
          <p>${escapeHtml(row.owner.nickname || 'Dom 정보 없음')} · ${escapeHtml(row.partner.nickname || (row.hasPartner ? 'Sub 연결' : 'Sub 미연결'))}</p>
        </div>
        <span class="admin-room-status ${row.status.className}">${escapeHtml(row.status.label)}</span>
      </div>
      <div class="admin-room-meta">
        <span>멤버 ${row.memberCount}명</span>
        <span>생성/참여 ${escapeHtml(formatDateTime(row.createdAt))}</span>
        <span>Dom ${escapeHtml(row.owner.email || row.owner.uid || '-')}</span>
        <span>Sub ${escapeHtml(row.partner.email || row.partner.uid || '-')}</span>
      </div>
      <div class="admin-room-members">
        ${row.memberRows.length ? row.memberRows.map(renderMember).join('') : '<p class="admin-room-empty">표시할 멤버가 없습니다.</p>'}
      </div>
    </article>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return renderEmptyState('표시할 Room이 없습니다', '아직 roomMembers 또는 userRooms 데이터가 없습니다.');
  }
  return `<div class="admin-room-list">${rows.map(renderRoomCard).join('')}</div>`;
}

export async function render() {
  try {
    const rows = await loadRoomDirectory();
    return `
      <section class="module-view" aria-labelledby="adminRoomsHeading">
        <div class="foundation-notice">
          <div><span class="notice-icon" aria-hidden="true">🏠</span></div>
          <div>
            <h2 id="adminRoomsHeading">Room 목록 읽기 전용</h2>
            <p>Room 코드, Dom/Sub 연결 상태, 멤버 구성을 조회합니다. 운영 안전을 위해 이 화면에서는 데이터를 저장하거나 변경하지 않습니다.</p>
          </div>
        </div>
        ${renderStats(rows)}
        <article class="panel">
          <div class="panel-header admin-room-panel-header">
            <div>
              <h2>Room 목록</h2>
              <p>Room 코드, 이메일, 닉네임, UID로 빠르게 찾을 수 있습니다.</p>
            </div>
            <input id="adminRoomSearch" class="admin-user-search" type="search" placeholder="Room 검색">
          </div>
          ${renderRows(rows)}
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin Rooms] load failed', error);
    return `
      <section class="module-view">
        <div class="error-card">
          <strong>Room 목록을 불러오지 못했습니다.</strong>
          <p>${escapeHtml(error.message || error)}</p>
        </div>
      </section>`;
  }
}

export function afterRender() {
  const search = document.getElementById('adminRoomSearch');
  if (!search) return;
  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-admin-room-row]').forEach((row) => {
      row.hidden = Boolean(query) && !String(row.dataset.search || '').includes(query);
    });
  });
}
