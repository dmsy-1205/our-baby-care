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
  return `${text.slice(0, 6)}??{text.slice(-5)}`;
}

function roleLabel(role, relationshipRole) {
  if (relationshipRole === 'dom') return 'ê´€ë¦?Dom)';
  if (relationshipRole === 'sub') return 'ê¸°ë¡(Sub)';
  if (role === 'owner') return 'Owner';
  if (role === 'partner') return 'Partner';
  return '-';
}

function roomLabel(activeRoom, roomCodes) {
  const codes = [...new Set([activeRoom, ...roomCodes].filter(Boolean))];
  if (!codes.length) return 'ë¯¸ì—°ê²?;
  if (codes.length === 1) return codes[0];
  return `${codes[0]} ??${codes.length - 1}`;
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
      <article class="metric-card"><span>?„ì²´ ?Œì›</span><strong>${rows.length}</strong><small>users/userRooms ê¸°ì?</small></article>
      <article class="metric-card"><span>Room ?°ê²°</span><strong>${linked}</strong><small>activeRoom ?ëŠ” membership</small></article>
      <article class="metric-card"><span>?„ì¬ ê´€ë¦¬ì</span><strong>${admins}</strong><small>ë¡œê·¸?¸í•œ ê´€ë¦¬ì ê¸°ì?</small></article>
      <article class="metric-card"><span>?•ì¸ ì°¸ê³ </span><strong>${needsCheck}</strong><small>?´ë©”???†ìŒ ?ëŠ” Room ë¯¸ì—°ê²?/small></article>
      <article class="metric-card"><span>?¸ì¦ ?Œë˜ê·?/span><strong>${verificationFlags}</strong><small>DB???¨ì? ë³´ì¡° ?œì‹œ</small></article>
    </div>`;
}

function renderUserCard(row) {
  const name = row.nickname || row.email || '?´ë¦„ ?†ìŒ';
  const initial = String(name).trim().slice(0, 1).toUpperCase() || '??;
  const room = roomLabel(row.activeRoom, row.roomCodes);
  const connected = Boolean(row.activeRoom || row.roomCodes.length);
  const statusClass = !row.email || !connected ? 'needs-check' : 'ok';
  const statusText = !row.email ? '?´ë©”???•ë³´ ?†ìŒ' : (!connected ? 'Room ë¯¸ì—°ê²? : '?•ìƒ');
  const verificationFlag = row.requiresEmailVerification ? '<span>?¸ì¦ ?Œë˜ê·??¨ìŒ</span>' : '';
  return `
    <article class="admin-user-card" data-admin-user-row data-search="${escapeHtml(`${name} ${row.email} ${row.uid} ${room} ${row.role}`.toLowerCase())}">
      <div class="admin-user-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
      <div class="admin-user-main">
        <div class="admin-user-title">
          <strong>${escapeHtml(name)}</strong>
          ${row.isAdmin ? '<span class="status-pill">Admin</span>' : ''}
          <span class="admin-user-status ${statusClass}">${statusText}</span>
        </div>
        <div class="admin-user-sub">${escapeHtml(row.email || '?´ë©”???†ìŒ')}</div>
        <div class="admin-user-meta">
          <span>UID ${escapeHtml(shortUid(row.uid))}</span>
          <span>Room ${escapeHtml(room)}</span>
          <span>??•  ${escapeHtml(row.role)}</span>
          <span>ìµœê·¼ ${escapeHtml(formatDateTime(row.lastSeen))}</span>
          ${verificationFlag}
        </div>
      </div>
    </article>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return renderEmptyState('?œì‹œ???Œì›???†ìŠµ?ˆë‹¤', '?„ì§ users ?ëŠ” userRooms ?°ì´?°ê? ?†ìŠµ?ˆë‹¤.');
  }
  return `<div class="admin-user-list">${rows.map(renderUserCard).join('')}</div>`;
}

export async function render() {
  try {
    const rows = await loadUserDirectory();
    return `
      <section class="module-view" aria-labelledby="adminUsersHeading">
        <div class="foundation-notice">
          <div><span class="notice-icon" aria-hidden="true">?‘¥</span></div>
          <div>
            <h2 id="adminUsersHeading">?¬ìš©??ëª©ë¡ ?½ê¸° ?„ìš©</h2>
            <p>ê°€???Œì›, Room ?°ê²° ?íƒœ, Dom/Sub ??• ??ì¡°íšŒ?©ë‹ˆ?? ?´ë©”???¸ì¦ ?Œë˜ê·¸ëŠ” ?¤ì œ ë¯¸ì¸ì¦??ì •???„ë‹ˆ??DB???¨ì? ì°¸ê³  ?œì‹œë¡œë§Œ ?¤ë£¹?ˆë‹¤.</p>
          </div>
        </div>
        ${renderStats(rows)}
        <article class="panel">
          <div class="panel-header admin-user-panel-header">
            <div>
              <h2>?Œì› ëª©ë¡</h2>
              <p>?´ë©”?? ?‰ë„¤?? UID, Room ì½”ë“œë¡?ë¹ ë¥´ê²?ì°¾ì„ ???ˆìŠµ?ˆë‹¤.</p>
            </div>
            <input id="adminUserSearch" class="admin-user-search" type="search" placeholder="?Œì› ê²€??>
          </div>
          ${renderRows(rows)}
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin Users] load failed', error);
    return `
      <section class="module-view">
        <div class="error-card">
          <strong>?¬ìš©??ëª©ë¡??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??</strong>
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
