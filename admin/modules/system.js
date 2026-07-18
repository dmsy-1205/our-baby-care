import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { getState } from '../admin-state.js';
import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';

const ADMIN_STEP = 'STEP A11';
const ADMIN_LABEL = 'Data Center Readonly';
const ADMIN_CACHE_KEY = 'admin-2-0-a11-1-clean-baseline-20260719';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function flattenRequests(requestsRoot) {
  const rows = [];
  Object.entries(asObject(requestsRoot)).forEach(([uid, group]) => {
    Object.entries(asObject(group)).forEach(([id, request]) => {
      rows.push({ uid, id, ...asObject(request) });
    });
  });
  return rows;
}

async function readPath(database, label, path) {
  try {
    const snapshot = await database.ref(path).once('value');
    const value = asObject(snapshot.val());
    return { label, path, ok: true, value, count: Object.keys(value).length };
  } catch (error) {
    return { label, path, ok: false, value: {}, count: 0, error: error?.message || String(error) };
  }
}

async function loadSystemStatus() {
  const database = getAdminDatabase();
  const reads = await Promise.all([
    readPath(database, '?ъ슜??, 'users'),
    readPath(database, 'Room', 'rooms'),
    readPath(database, 'Room 硫ㅻ쾭', 'roomMembers'),
    readPath(database, '?ъ슜??Room ?곌껐', 'userRooms'),
    readPath(database, '?곗씠???붿껌', 'dataDeleteRequests'),
    readPath(database, '媛먯궗 濡쒓렇', 'adminAuditLogs')
  ]);

  const byPath = Object.fromEntries(reads.map((item) => [item.path, item]));
  const users = byPath.users.value;
  const rooms = byPath.rooms.value;
  const roomMembers = byPath.roomMembers.value;
  const userRooms = byPath.userRooms.value;
  const requests = flattenRequests(byPath.dataDeleteRequests.value);

  const roomCodes = new Set([...Object.keys(rooms), ...Object.keys(roomMembers)]);
  const userRoomMismatch = [];
  const membershipsWithoutUser = [];
  const roomsWithoutMembers = [];

  Object.entries(userRooms).forEach(([uid, linkedRooms]) => {
    Object.keys(asObject(linkedRooms)).forEach((roomCode) => {
      if (!roomMembers[roomCode]?.[uid]) userRoomMismatch.push(`${uid}/${roomCode}`);
    });
  });

  Object.entries(roomMembers).forEach(([roomCode, members]) => {
    const memberIds = Object.keys(asObject(members));
    if (!memberIds.length) roomsWithoutMembers.push(roomCode);
    memberIds.forEach((uid) => {
      if (!users[uid]) membershipsWithoutUser.push(`${roomCode}/${uid}`);
    });
  });

  Object.keys(rooms).forEach((roomCode) => {
    if (!roomMembers[roomCode]) roomsWithoutMembers.push(roomCode);
  });

  const openRequests = requests.filter((row) => !['completed', 'rejected', 'canceled', 'cancelled'].includes(row.status || 'pending'));
  const requestStatusCounts = {};
  const requestTypeCounts = {};

  requests.forEach((row) => {
    const status = row.status || 'pending';
    const type = row.requestType || row.type || 'unknown';
    requestStatusCounts[status] = (requestStatusCounts[status] || 0) + 1;
    requestTypeCounts[type] = (requestTypeCounts[type] || 0) + 1;
  });

  return {
    reads,
    usersCount: Object.keys(users).length,
    roomsCount: roomCodes.size,
    roomMembersCount: Object.values(roomMembers).reduce((sum, members) => sum + Object.keys(asObject(members)).length, 0),
    requestsCount: requests.length,
    openRequestsCount: openRequests.length,
    risks: {
      userRoomMismatch,
      membershipsWithoutUser,
      roomsWithoutMembers,
      openRequests
    },
    requestStatusCounts,
    requestTypeCounts
  };
}

function renderCountList(title, items) {
  const entries = Object.entries(items);
  if (!entries.length) {
    return `<div class="admin-list-row"><span>${escapeHtml(title)}</span><strong>0嫄?/strong></div>`;
  }

  return `
    <div class="admin-mini-list">
      <h3>${escapeHtml(title)}</h3>
      ${entries.map(([key, count]) => `
        <div class="admin-list-row">
          <span>${escapeHtml(key)}</span>
          <strong>${count}嫄?/strong>
        </div>
      `).join('')}
    </div>
  `;
}

export async function render() {
  const state = getState();
  const status = await loadSystemStatus();
  const release = window.HM_RELEASE || {};
  const failed = status.reads.filter((item) => !item.ok).length;

  return `
    <section class="module-view" aria-labelledby="systemHeading">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">?숋툘</div>
        <div>
          <h2 id="systemHeading">?쒖뒪??쨌 ?댁쁺 ?곹깭 ?먭???/h2>
          <p>愿由ъ옄 ?깆쓽 ?곌껐, ?몄쬆, 二쇱슂 ?곗씠???쎄린 ?곹깭瑜??뺤씤?⑸땲?? ???붾㈃? ?쎄린 ?꾩슜?낅땲??</p>
        </div>
      </section>

      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>Firebase ??/span><strong>babyApp</strong><small>?곌껐 ?뺤씤</small></article>
        <article class="admin-card admin-metric"><span>愿由ъ옄 ?몄쬆</span><strong>${escapeHtml(state.user?.email || '-')}</strong><small>?꾩옱 濡쒓렇??愿由ъ옄</small></article>
        <article class="admin-card admin-metric"><span>?쎄린 ?먭?</span><strong>${status.reads.length - failed}/${status.reads.length}</strong><small>二쇱슂 寃쎈줈 ?쎄린 媛??/small></article>
        <article class="admin-card admin-metric"><span>愿由ъ옄 ?ㅽ뀦</span><strong>${ADMIN_STEP}</strong><small>${ADMIN_LABEL}</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>?댁쁺 ?곌껐 ?곹깭</h2>
            <p>愿由ъ옄 ?붾㈃???뺤긽?곸쑝濡??곗씠?곕? ?쎌쓣 ???덈뒗吏 ?뺤씤?⑸땲??</p>
          </div>
          <span class="admin-status-pill muted">Read Only</span>
        </div>
        <div class="admin-grid admin-grid-2">
          <article class="admin-soft-card">
            <h3>??湲곗?</h3>
            <div class="admin-key-value"><span>硫붿씤??踰꾩쟾</span><strong>${escapeHtml(release.step || 'STEP6.2.13.4')}</strong></div>
            <div class="admin-key-value"><span>愿由ъ옄 ?ㅽ뀦</span><strong>${ADMIN_STEP}</strong></div>
            <div class="admin-key-value"><span>罹먯떆 ??/span><strong>${ADMIN_CACHE_KEY}</strong></div>
          </article>
          <article class="admin-soft-card">
            <h3>?덉쟾 湲곗?</h3>
            <ul>
              <li>愿由ъ옄 ?몄쬆???듦낵??怨꾩젙留??묎렐</li>
              <li>?꾩옱 ?붾㈃?먯꽌???곗씠????Β룹궘??湲곕뒫 ?놁쓬</li>
              <li>二쇱슂 寃쎈줈???쎄린 ?먭?留??섑뻾</li>
              <li>硫붿씤??踰꾩쟾? 愿由ъ옄 ?ㅽ뀦怨?遺꾨━ 愿由?/li>
            </ul>
          </article>
        </div>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>?곗씠??愿由??쇳꽣 쨌 ?쎄린 ?먭?</h2>
            <p>?ㅼ젣 ?곗씠?곕? 蹂寃쏀븯吏 ?딄퀬, ?댁쁺?먭? 癒쇱? ?뺤씤?댁빞 ???곗씠??援ъ“? ?꾪뿕 ?좏샇瑜??붿빟?⑸땲??</p>
          </div>
          <span class="admin-status-pill muted">Read Only</span>
        </div>

        <section class="admin-grid admin-grid-4">
          <article class="admin-card admin-metric"><span>?ъ슜??/span><strong>${status.usersCount}</strong><small>users 湲곗?</small></article>
          <article class="admin-card admin-metric"><span>Room</span><strong>${status.roomsCount}</strong><small>rooms/roomMembers ?듯빀</small></article>
          <article class="admin-card admin-metric"><span>Room 硫ㅻ쾭</span><strong>${status.roomMembersCount}</strong><small>roomMembers 湲곗?</small></article>
          <article class="admin-card admin-metric"><span>?곗씠???붿껌</span><strong>${status.requestsCount}</strong><small>泥섎━ 以?${status.openRequestsCount}嫄?/small></article>
        </section>

        <div class="admin-grid admin-grid-2">
          <article class="admin-soft-card">
            <h3>?꾪뿕 ?좏샇</h3>
            <ul>
              <li>?ъ슜??Room ?곌껐 遺덉씪移? ${status.risks.userRoomMismatch.length}嫄?/li>
              <li>?ъ슜???뺣낫 ?녿뒗 硫ㅻ쾭?? ${status.risks.membershipsWithoutUser.length}嫄?/li>
              <li>硫ㅻ쾭 ?녿뒗 Room ?곗씠?? ${status.risks.roomsWithoutMembers.length}嫄?/li>
              <li>?대┛ ?곗씠???붿껌: ${status.risks.openRequests.length}嫄?/li>
            </ul>
          </article>
          <article class="admin-soft-card">
            <h3>?댁쁺 ?먮떒</h3>
            <p>${failed ? '?쎄린 ?ㅽ뙣 寃쎈줈媛 ?덉뒿?덈떎. 沅뚰븳 ?먮뒗 寃쎈줈瑜?癒쇱? ?뺤씤?댁빞 ?⑸땲??' : '?꾩옱 ?쎄린 ?먭? 湲곗??쇰줈 ???꾪뿕 ?좏샇???놁뒿?덈떎.'}</p>
          </article>
        </div>

        <div class="admin-grid admin-grid-2">
          ${renderCountList('?붿껌 ?곹깭 遺꾪룷', status.requestStatusCounts)}
          ${renderCountList('?붿껌 ?좏삎 遺꾪룷', status.requestTypeCounts)}
        </div>
      </section>

      <section class="admin-card admin-panel">
        <h2>二쇱슂 ?곗씠??寃쎈줈 ?먭?</h2>
        <div class="admin-path-list">
          ${status.reads.map((item) => `
            <div class="admin-list-row">
              <span><strong>${escapeHtml(item.label)}</strong><br><small>${escapeHtml(item.path)}</small></span>
              <strong class="${item.ok ? 'admin-ok' : 'admin-danger'}">${item.ok ? `?쎄린 媛??쨌 ${item.count}嫄? : '?쎄린 ?ㅽ뙣'}</strong>
            </div>
          `).join('')}
        </div>
      </section>
    </section>
  `;
}

