import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-1-clean-baseline-20260719';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

function normalizeType(request) {
  const raw = request.requestType || request.type || request.deleteType || request.mode || '';
  if (['account', 'account_delete', 'delete_account'].includes(raw)) return 'account';
  if (['leave_room', 'disconnect_room', 'unlink_room'].includes(raw)) return 'leave_room';
  if (['delete_room', 'room_delete', 'room'].includes(raw)) return 'delete_room';
  return raw || 'account';
}

function typeLabel(type) {
  return {
    account: '怨꾩젙 ??젣',
    leave_room: 'Room ?곌껐 ?댁젣',
    delete_room: 'Room ?꾩껜 ??젣'
  }[type] || type || '?곗씠???붿껌';
}

function isClosed(status) {
  return ['completed', 'rejected', 'canceled', 'cancelled'].includes(status || 'pending');
}

async function loadRecoveryRows() {
  const database = getAdminDatabase();
  const [requestsSnap, usersSnap, userRoomsSnap, roomMembersSnap, roomsSnap] = await Promise.all([
    database.ref('dataDeleteRequests').once('value'),
    database.ref('users').once('value'),
    database.ref('userRooms').once('value'),
    database.ref('roomMembers').once('value'),
    database.ref('rooms').once('value')
  ]);

  const requestsRoot = asObject(requestsSnap.val());
  const users = asObject(usersSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const rooms = asObject(roomsSnap.val());
  const rows = [];

  Object.entries(requestsRoot).forEach(([ownerUid, requestGroup]) => {
    Object.entries(asObject(requestGroup)).forEach(([requestId, value]) => {
      const request = asObject(value);
      const requestType = normalizeType(request);
      const roomCode = request.roomCode || request.roomId || request.activeRoom || request.room || Object.keys(asObject(userRooms[ownerUid]))[0] || '';
      const members = asObject(roomMembers[roomCode]);
      const memberIds = Object.keys(members);

      rows.push({
        ...request,
        ownerUid,
        requestId,
        requestType,
        status: request.status || 'pending',
        roomCode,
        email: request.requesterEmail || request.email || users[ownerUid]?.email || '',
        createdAt: latestNumber(request.createdAt, request.requestedAt, request.submittedAt),
        updatedAt: latestNumber(request.updatedAt, request.reviewedAt, request.createdAt),
        hasUser: Boolean(users[ownerUid]),
        hasUserRoom: Boolean(roomCode && userRooms[ownerUid]?.[roomCode]),
        hasRoomMembership: Boolean(roomCode && roomMembers[roomCode]?.[ownerUid]),
        hasRoomData: Boolean(roomCode && rooms[roomCode]),
        roomMemberCount: memberIds.length,
        memberEmails: memberIds.map((uid) => users[uid]?.email || uid)
      });
    });
  });

  return rows.sort((a, b) => latestNumber(b.updatedAt, b.createdAt) - latestNumber(a.updatedAt, a.createdAt));
}

function renderBaselineCard(row) {
  const closed = isClosed(row.status);
  const room = row.roomCode || '誘몄뿰寃?;
  return `
    <article class="admin-card admin-recovery-card">
      <div class="admin-request-card-head">
        <div>
          <h3>${escapeHtml(typeLabel(row.requestType))}</h3>
          <p>${escapeHtml(row.email || row.ownerUid || '?붿껌???뺣낫 ?놁쓬')}</p>
        </div>
        <span class="admin-status-pill muted">${escapeHtml(closed ? '?ロ엺 ?붿껌' : '?대┛ ?붿껌')}</span>
      </div>
      <div class="admin-meta-row">
        <span>UID ${escapeHtml(compactId(row.ownerUid))}</span>
        <span>?붿껌 ID ${escapeHtml(compactId(row.requestId))}</span>
        <span>Room ${escapeHtml(room)}</span>
        <span>?묒닔 ${escapeHtml(formatDateTime(row.createdAt))}</span>
        <span>媛깆떊 ${escapeHtml(formatDateTime(row.updatedAt))}</span>
      </div>
      <div class="admin-grid admin-grid-3">
        <article class="admin-soft-card">
          <h4>${escapeHtml(typeLabel(row.requestType))} 湲곗???/h4>
          <ul>
            <li>?ъ슜???뺣낫: ${row.hasUser ? '?덉쓬' : '?놁쓬'}</li>
            <li>?ъ슜??Room ?곌껐: ${row.hasUserRoom ? '?덉쓬' : '?놁쓬'}</li>
            <li>Room 硫ㅻ쾭?? ${row.hasRoomMembership ? '?덉쓬' : '?놁쓬'}</li>
            <li>Room ?곗씠?? ${row.hasRoomData ? '?덉쓬' : '?놁쓬'}</li>
            <li>Room 硫ㅻ쾭 ?? ${row.roomMemberCount}紐?/li>
          </ul>
        </article>
        <article class="admin-soft-card">
          <h4>?뺤씤 寃쎈줈</h4>
          <ul>
            <li>users/${escapeHtml(row.ownerUid)}</li>
            <li>userRooms/${escapeHtml(row.ownerUid)}/${escapeHtml(room)}</li>
            <li>roomMembers/${escapeHtml(room)}/${escapeHtml(row.ownerUid)}</li>
            <li>rooms/${escapeHtml(room)}</li>
          </ul>
        </article>
        <article class="admin-soft-card">
          <h4>?ㅽ뻾 ??泥댄겕</h4>
          <ul>
            <li>?붿껌??蹂몄씤 ?붿껌怨??꾩옱 ?곹깭 ?뺤씤</li>
            <li>怨듬룞 Room 湲곕줉? ?곷?諛?沅뚮━? 蹂댁〈 ?꾩슂???④퍡 ?뺤씤</li>
            <li>愿由ъ옄 硫붾え? 媛먯궗 濡쒓렇瑜?癒쇱? ?뺤씤</li>
            <li>?ㅼ젣 ??젣??蹂꾨룄 ?뱀씤 ?④퀎?먯꽌留?吏꾪뻾</li>
          </ul>
        </article>
      </div>
      <div class="admin-warning-box">?쎄린 ?꾩슜 湲곗??먯엯?덈떎. ???붾㈃?먯꽌???ㅼ젣 ??젣, Room ?곌껐 ?댁젣, Room ?꾩껜 ??젣瑜??ㅽ뻾?섏? ?딆뒿?덈떎.</div>
    </article>
  `;
}

export async function render() {
  const rows = await loadRecoveryRows();
  const account = rows.filter((row) => row.requestType === 'account').length;
  const leaveRoom = rows.filter((row) => row.requestType === 'leave_room').length;
  const deleteRoom = rows.filter((row) => row.requestType === 'delete_room').length;

  return `
    <section class="module-view" aria-labelledby="recoveryHeading">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">??/div>
        <div>
          <h2 id="recoveryHeading">蹂듦뎄 ?쇳꽣 쨌 ?ㅽ뻾 ??湲곗???/h2>
          <p>??젣??Room ?곌껐 ?댁젣 ?꾩뿉 ?섎룎由?湲곗? ?뺣낫瑜??쎄린 ?꾩슜?쇰줈 ?뺤씤?⑸땲?? ?꾩옱 ?④퀎?먯꽌???곗씠?곕? 蹂寃쏀븯吏 ?딆뒿?덈떎.</p>
        </div>
      </section>

      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>湲곗????붿껌</span><strong>${rows.length}</strong><small>?꾩껜 ?곗씠???붿껌</small></article>
        <article class="admin-card admin-metric"><span>怨꾩젙 ??젣</span><strong>${account}</strong><small>媛쒖씤 ?뺣낫 以묒떖</small></article>
        <article class="admin-card admin-metric"><span>Room ?곌껐 ?댁젣</span><strong>${leaveRoom}</strong><small>怨듬룞 湲곕줉 蹂댁〈</small></article>
        <article class="admin-card admin-metric"><span>Room ?꾩껜 ??젣</span><strong>${deleteRoom}</strong><small>?댁쨷 寃???꾩슂</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>??젣 ?붿껌 湲곗???/h2>
            <p>?ъ슜???붿껌, ?곌껐 Room, 硫ㅻ쾭?? 怨듬룞 ?곗씠???뺤씤 寃쎈줈瑜??쎄린 ?꾩슜?쇰줈 蹂댁뿬以띾땲??</p>
          </div>
          <span class="admin-status-pill muted">Read Only</span>
        </div>
        ${rows.length ? rows.map(renderBaselineCard).join('') : renderEmptyState('湲곗????놁쓬', '?꾩옱 ?뺤씤???곗씠???붿껌 湲곗??먯씠 ?놁뒿?덈떎.')}
      </section>
    </section>
  `;
}

