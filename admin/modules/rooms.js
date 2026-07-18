import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a2-data-request-actions-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a2-data-request-actions-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a2-data-request-actions-20260718';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (text.length <= 12) return text || '-';
  return `${text.slice(0, 6)}??{text.slice(-5)}`;
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

function roleLabel(member) {
  if (member.relationshipRole === 'dom') return 'ê´€ë¦?Dom)';
  if (member.relationshipRole === 'sub') return 'ê¸°ë¡(Sub)';
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
  if (row.meta._metaReadError) return { className: 'warn', label: 'Meta ?•ì¸ ?„ìš”' };
  if (row.memberRows.length >= 2 || row.hasPartner) return { className: 'complete', label: '?°ê²° ?„ë£Œ' };
  if (row.memberRows.length === 1) return { className: 'solo', label: '?¼ì ?¬ìš©' };
  return { className: 'empty', label: 'ë©¤ë²„ ?†ìŒ' };
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
      <article class="metric-card"><span>?„ì²´ Room</span><strong>${rows.length}</strong><small>roomMembers/userRooms ê¸°ì?</small></article>
      <article class="metric-card"><span>?°ê²° ?„ë£Œ</span><strong>${complete}</strong><small>Dom/Sub ?ëŠ” 2ëª??´ìƒ</small></article>
      <article class="metric-card"><span>?¼ì ?¬ìš©</span><strong>${solo}</strong><small>ë©¤ë²„ 1ëª?Room</small></article>
      <article class="metric-card"><span>?•ì¸ ì°¸ê³ </span><strong>${needsCheck}</strong><small>Meta ?ëŠ” ë©¤ë²„ ?•ì¸ ?„ìš”</small></article>
    </div>`;
}

function renderMember(member) {
  return `
    <div class="admin-room-member">
      <div>
        <strong>${escapeHtml(member.nickname || '?´ë¦„ ?†ìŒ')}</strong>
        <span>${escapeHtml(member.email || '?´ë©”???†ìŒ')}</span>
      </div>
      <div class="admin-room-member-tags">
        <span>${escapeHtml(member.role)}</span>
        <span>UID ${escapeHtml(shortUid(member.uid))}</span>
        <span>ì°¸ì—¬ ${escapeHtml(formatDateTime(member.joinedAt))}</span>
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
          <p>${escapeHtml(row.owner.nickname || 'Dom ?•ë³´ ?†ìŒ')} Â· ${escapeHtml(row.partner.nickname || (row.hasPartner ? 'Sub ?°ê²°' : 'Sub ë¯¸ì—°ê²?))}</p>
        </div>
        <span class="admin-room-status ${row.status.className}">${escapeHtml(row.status.label)}</span>
      </div>
      <div class="admin-room-meta">
        <span>ë©¤ë²„ ${row.memberCount}ëª?/span>
        <span>?ì„±/ì°¸ì—¬ ${escapeHtml(formatDateTime(row.createdAt))}</span>
        <span>Dom ${escapeHtml(row.owner.email || row.owner.uid || '-')}</span>
        <span>Sub ${escapeHtml(row.partner.email || row.partner.uid || '-')}</span>
      </div>
      <div class="admin-room-members">
        ${row.memberRows.length ? row.memberRows.map(renderMember).join('') : '<p class="admin-room-empty">?œì‹œ??ë©¤ë²„ê°€ ?†ìŠµ?ˆë‹¤.</p>'}
      </div>
    </article>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return renderEmptyState('?œì‹œ??Room???†ìŠµ?ˆë‹¤', '?„ì§ roomMembers ?ëŠ” userRooms ?°ì´?°ê? ?†ìŠµ?ˆë‹¤.');
  }
  return `<div class="admin-room-list">${rows.map(renderRoomCard).join('')}</div>`;
}

export async function render() {
  try {
    const rows = await loadRoomDirectory();
    return `
      <section class="module-view" aria-labelledby="adminRoomsHeading">
        <div class="foundation-notice">
          <div><span class="notice-icon" aria-hidden="true">? </span></div>
          <div>
            <h2 id="adminRoomsHeading">Room ëª©ë¡ ?½ê¸° ?„ìš©</h2>
            <p>Room ì½”ë“œ, Dom/Sub ?°ê²° ?íƒœ, ë©¤ë²„ êµ¬ì„±??ì¡°íšŒ?©ë‹ˆ?? ?´ì˜ ?ˆì „???„í•´ ???”ë©´?ì„œ???°ì´?°ë? ?€?¥í•˜ê±°ë‚˜ ë³€ê²½í•˜ì§€ ?ŠìŠµ?ˆë‹¤.</p>
          </div>
        </div>
        ${renderStats(rows)}
        <article class="panel">
          <div class="panel-header admin-room-panel-header">
            <div>
              <h2>Room ëª©ë¡</h2>
              <p>Room ì½”ë“œ, ?´ë©”?? ?‰ë„¤?? UIDë¡?ë¹ ë¥´ê²?ì°¾ì„ ???ˆìŠµ?ˆë‹¤.</p>
            </div>
            <input id="adminRoomSearch" class="admin-user-search" type="search" placeholder="Room ê²€??>
          </div>
          ${renderRows(rows)}
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin Rooms] load failed', error);
    return `
      <section class="module-view">
        <div class="error-card">
          <strong>Room ëª©ë¡??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??</strong>
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
