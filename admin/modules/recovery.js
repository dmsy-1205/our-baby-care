import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-data-impact-preview-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a11-data-impact-preview-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-data-impact-preview-20260718';

const REQUEST_TYPE_LABELS = {
  account: '怨꾩젙 ??젣',
  leave_room: 'Room ?곌껐 ?댁젣',
  delete_room: 'Room ?꾩껜 ??젣'
};

const STATUS_LABELS = {
  pending: '?묒닔??,
  reviewing: '寃??以?,
  approved: '?뱀씤',
  hold: '蹂대쪟',
  rejected: '嫄곗젅',
  canceled: '?ъ슜??痍⑥냼',
  scheduled: '??젣 ?덉젙',
  processing: '泥섎━ 以?,
  completed: '泥섎━ ?꾨즺',
  failed: '泥섎━ ?ㅽ뙣'
};

const TYPE_ORDER = {
  delete_room: 0,
  account: 1,
  leave_room: 2
};

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (!text) return '-';
  if (text.length <= 14) return text;
  return `${text.slice(0, 7)}??{text.slice(-5)}`;
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

function requestTypeLabel(requestType) {
  return REQUEST_TYPE_LABELS[requestType] || requestType || '?곗씠???붿껌';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '?곹깭 ?뺤씤 ?꾩슂';
}

function statusClass(status) {
  if (['completed', 'approved'].includes(status)) return 'ok';
  if (['rejected', 'failed'].includes(status)) return 'danger';
  if (status === 'canceled') return 'muted';
  if (['hold', 'scheduled', 'processing'].includes(status)) return 'warn';
  return 'active';
}

function collectUserRooms(uid, users, userRooms, roomMembers) {
  const user = asObject(users[uid]);
  const roomCodes = new Set();

  if (user.activeRoom) roomCodes.add(user.activeRoom);
  Object.keys(asObject(userRooms[uid])).forEach((roomCode) => roomCodes.add(roomCode));
  Object.entries(asObject(roomMembers)).forEach(([roomCode, members]) => {
    if (asObject(members)[uid]) roomCodes.add(roomCode);
  });

  return Array.from(roomCodes).filter(Boolean).sort();
}

function collectRoomMembers(roomCode, roomMembers, users) {
  return Object.entries(asObject(roomMembers[roomCode])).map(([uid, member]) => {
    const memberData = asObject(member);
    const userData = asObject(users[uid]);
    return {
      uid,
      email: memberData.email || userData.email || '',
      nickname: memberData.nickname || userData.nickname || userData.displayName || '',
      role: memberData.role || memberData.relationshipRole || ''
    };
  });
}

function renderCheckList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function roomListText(roomCodes) {
  return roomCodes.length ? roomCodes.join(', ') : '?곌껐 Room ?뺤씤 ?꾩슂';
}

function memberListText(members) {
  if (!members.length) return 'Room 硫ㅻ쾭 ?뺤씤 ?꾩슂';
  return members
    .map((member) => `${member.email || member.nickname || shortUid(member.uid)} (${shortUid(member.uid)})`)
    .join(', ');
}

function buildBaseline(row) {
  const { request, users, userRooms, roomMembers } = row;
  const user = asObject(users[row.ownerUid]);
  const roomCode = request.roomCode || user.activeRoom || '';
  const userRoomCodes = collectUserRooms(row.ownerUid, users, userRooms, roomMembers);
  const roomMemberList = collectRoomMembers(roomCode, roomMembers, users);
  const activeRoomMatch = roomCode && user.activeRoom === roomCode ? '?? : '?꾨땲???먮뒗 ?뺤씤 ?꾩슂';
  const memberExists = roomCode && asObject(roomMembers[roomCode])[row.ownerUid] ? '議댁옱' : '?뺤씤 ?꾩슂';

  if (request.requestType === 'account') {
    return {
      title: '怨꾩젙 ??젣 湲곗???,
      summary: [
        `?ъ슜??UID: ${shortUid(row.ownerUid)}`,
        `?대찓?? ${request.requestedByEmail || user.email || '-'}`,
        `activeRoom: ${user.activeRoom || '-'}`,
        `?곌껐 Room: ${roomListText(userRoomCodes)}`
      ],
      paths: [
        `users/${row.ownerUid}`,
        `userRooms/${row.ownerUid}`,
        'roomMembers/{roomCode}/{uid}',
        'dataDeleteRequests/{uid}/{requestId}'
      ],
      checklist: [
        '怨꾩젙 ??젣 ???ъ슜??蹂몄씤 ?붿껌怨??꾩옱 ?곹깭瑜??뺤씤',
        '怨듬룞 Room 湲곕줉? ?곷?諛?沅뚮━? 蹂댁〈 ?꾩슂?깆쓣 ?④퍡 ?뺤씤',
        '愿由ъ옄 硫붾え? 媛먯궗 濡쒓렇瑜?癒쇱? ?뺤씤',
        '?ㅼ젣 ??젣??蹂꾨룄 ?뱀씤 ?④퀎?먯꽌留?吏꾪뻾'
      ]
    };
  }

  if (request.requestType === 'leave_room') {
    return {
      title: 'Room ?곌껐 ?댁젣 湲곗???,
      summary: [
        `???Room: ${roomCode || '-'}`,
        `?붿껌??硫ㅻ쾭?? ${memberExists}`,
        `activeRoom ?쇱튂: ${activeRoomMatch}`,
        `Room 硫ㅻ쾭: ${roomMemberList.length}紐?
      ],
      paths: [
        `userRooms/${row.ownerUid}/${roomCode || '{roomCode}'}`,
        `roomMembers/${roomCode || '{roomCode}'}/${row.ownerUid}`,
        `users/${row.ownerUid}/activeRoom`,
        `rooms/${roomCode || '{roomCode}'} 湲곕줉? 蹂댁〈`
      ],
      checklist: [
        '?붿껌?먯쓽 Room ?곌껐留??댁젣?섎뒗 ?붿껌?몄? ?뺤씤',
        '湲곗〈 怨듬룞 湲곕줉? ??젣?섏? ?딄퀬 蹂댁〈',
        'activeRoom?????Room?대㈃ ?댁젣 湲곗? ?뺤씤',
        '?곷?諛?Room ?묎렐沅뚯씠 ?좎??섎뒗吏 ?뺤씤'
      ]
    };
  }

  if (request.requestType === 'delete_room') {
    return {
      title: 'Room ?꾩껜 ??젣 湲곗???,
      summary: [
        `???Room: ${roomCode || '-'}`,
        `Room 硫ㅻ쾭: ${roomMemberList.length}紐?,
        `硫ㅻ쾭 紐⑸줉: ${memberListText(roomMemberList)}`,
        `怨듬룞 寃?? ${request.partnerConsentRequired ? '?꾩슂' : '?꾩슂 ?щ? ?뺤씤'}`
      ],
      paths: [
        `rooms/${roomCode || '{roomCode}'}`,
        `roomMembers/${roomCode || '{roomCode}'}`,
        `userRooms/{memberUid}/${roomCode || '{roomCode}'}`,
        '?ъ쭊쨌梨꾪똿쨌湲곕줉 ??젣 踰붿쐞 蹂꾨룄 ?뺤씤'
      ],
      checklist: [
        'Room ?꾩껜 ??젣???곷?諛?沅뚮━? 蹂닿? ?꾩슂?깆쓣 ?④퍡 ?뺤씤',
        '梨꾪똿쨌湲곕줉쨌?ъ쭊 ??怨듬룞 ?곗씠??踰붿쐞瑜?癒쇱? ?먭?',
        '?ㅽ뻾 ??愿由ъ옄 硫붾え? 媛먯궗 濡쒓렇瑜??④?',
        '?ㅼ젣 ??젣 ??蹂꾨룄 諛깆뾽/蹂듦뎄 湲곗??먯쓣 ?뺣낫'
      ]
    };
  }

  return {
    title: '?붿껌 湲곗???,
    summary: [
      `?ъ슜??UID: ${shortUid(row.ownerUid)}`,
      `?대찓?? ${request.requestedByEmail || user.email || '-'}`,
      `?붿껌 ?좏삎: ${requestTypeLabel(request.requestType)}`,
      `Room: ${roomCode || '-'}`
    ],
    paths: ['dataDeleteRequests/{uid}/{requestId}', 'users/{uid}', 'userRooms/{uid}', 'roomMembers/{roomCode}'],
    checklist: [
      '?붿껌 ?좏삎怨??곹깭瑜?癒쇱? ?뺤씤',
      '?ㅼ젣 ?곗씠??蹂寃???愿由ъ옄 硫붾え瑜??④?',
      '怨듬룞 ?곗씠?곕뒗 ?곷?諛?沅뚮━瑜??뺤씤',
      '???붾㈃?먯꽌???ㅼ젣 ??젣瑜??ㅽ뻾?섏? ?딆쓬'
    ]
  };
}

async function loadRecoveryRows() {
  const database = getAdminDatabase();
  const [requestSnap, userSnap, userRoomsSnap, roomMembersSnap] = await Promise.all([
    database.ref('dataDeleteRequests').once('value'),
    database.ref('users').once('value'),
    database.ref('userRooms').once('value'),
    database.ref('roomMembers').once('value')
  ]);

  const requests = asObject(requestSnap.val());
  const users = asObject(userSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const rows = [];

  Object.entries(requests).forEach(([ownerUid, requestMap]) => {
    Object.entries(asObject(requestMap)).forEach(([requestId, request]) => {
      const item = asObject(request);
      rows.push({
        id: requestId,
        ownerUid,
        request: item,
        users,
        userRooms,
        roomMembers,
        sortAt: latestNumber(item.updatedAt, item.reviewedAt, item.requestedAt)
      });
    });
  });

  return rows.sort((a, b) => {
    const typeDiff = (TYPE_ORDER[a.request.requestType] ?? 9) - (TYPE_ORDER[b.request.requestType] ?? 9);
    if (typeDiff) return typeDiff;
    return b.sortAt - a.sortAt;
  });
}

function renderMetrics(rows) {
  const accountCount = rows.filter((row) => row.request.requestType === 'account').length;
  const leaveRoomCount = rows.filter((row) => row.request.requestType === 'leave_room').length;
  const deleteRoomCount = rows.filter((row) => row.request.requestType === 'delete_room').length;

  return `
    <div class="metric-grid admin-recovery-metrics">
      <article class="metric-card"><span>湲곗????붿껌</span><strong>${rows.length}</strong><small>?꾩껜 ?곗씠???붿껌</small></article>
      <article class="metric-card"><span>怨꾩젙 ??젣</span><strong>${accountCount}</strong><small>媛쒖씤 ?뺣낫 以묒떖</small></article>
      <article class="metric-card"><span>Room ?곌껐 ?댁젣</span><strong>${leaveRoomCount}</strong><small>怨듬룞 湲곕줉 蹂댁〈</small></article>
      <article class="metric-card"><span>Room ?꾩껜 ??젣</span><strong>${deleteRoomCount}</strong><small>?댁쨷 寃???꾩슂</small></article>
    </div>`;
}

function renderRecoveryCard(row) {
  const baseline = buildBaseline(row);
  const request = row.request;
  const user = asObject(row.users[row.ownerUid]);
  const email = request.requestedByEmail || user.email || '-';
  const requestedAt = latestNumber(request.requestedAt);
  const updatedAt = latestNumber(request.updatedAt, request.reviewedAt, request.requestedAt);

  return `
    <article class="admin-recovery-card">
      <div class="admin-recovery-head">
        <div>
          <strong>${escapeHtml(requestTypeLabel(request.requestType))}</strong>
          <p>${escapeHtml(email)}</p>
        </div>
        <span class="admin-request-status ${statusClass(request.status)}">${escapeHtml(statusLabel(request.status))}</span>
      </div>
      <div class="admin-recovery-meta">
        <span>UID ${escapeHtml(shortUid(row.ownerUid))}</span>
        <span>?붿껌 ID ${escapeHtml(shortUid(row.id))}</span>
        <span>Room ${escapeHtml(request.roomCode || user.activeRoom || '-')}</span>
        <span>?묒닔 ${escapeHtml(formatDateTime(requestedAt))}</span>
        <span>媛깆떊 ${escapeHtml(formatDateTime(updatedAt))}</span>
      </div>
      <div class="admin-recovery-grid">
        <section>
          <h3>${escapeHtml(baseline.title)}</h3>
          ${renderCheckList(baseline.summary)}
        </section>
        <section>
          <h3>?뺤씤 寃쎈줈</h3>
          ${renderCheckList(baseline.paths)}
        </section>
        <section>
          <h3>?ㅽ뻾 ??泥댄겕</h3>
          ${renderCheckList(baseline.checklist)}
        </section>
      </div>
      <p class="admin-recovery-warning">?쎄린 ?꾩슜 湲곗??먯엯?덈떎. ???붾㈃?먯꽌???ㅼ젣 ??젣, Room ?곌껐 ?댁젣, Room ?꾩껜 ??젣瑜??ㅽ뻾?섏? ?딆뒿?덈떎.</p>
    </article>`;
}

export async function render() {
  try {
    const rows = await loadRecoveryRows();

    return `
      <section class="module-view" aria-labelledby="adminRecoveryHeading">
        <div class="foundation-notice">
          <span class="notice-icon">??/span>
          <div>
            <h2 id="adminRecoveryHeading">蹂듦뎄 ?쇳꽣 쨌 ?ㅽ뻾 ??湲곗???/h2>
            <p>??젣??Room ?곌껐 ?댁젣 ?꾩뿉 ?섎룎由?湲곗? ?뺣낫瑜??뺤씤?⑸땲?? ?꾩옱 ?④퀎?먯꽌???곗씠?곕? 蹂寃쏀븯吏 ?딆뒿?덈떎.</p>
          </div>
        </div>
        ${renderMetrics(rows)}
        <article class="panel">
          <div class="panel-header admin-recovery-panel-header">
            <div>
              <h2>??젣 ?붿껌 湲곗???/h2>
              <p>?ъ슜???붿껌, ?곌껐 Room, 硫ㅻ쾭?? 怨듬룞 ?곗씠???뺤씤 寃쎈줈瑜??쎄린 ?꾩슜?쇰줈 蹂댁뿬以띾땲??</p>
            </div>
            <span class="phase-badge">Read Only</span>
          </div>
          ${rows.length ? `<div class="admin-recovery-list">${rows.map(renderRecoveryCard).join('')}</div>` : renderEmptyState('蹂듦뎄 湲곗????놁쓬', '?꾩옱 ?뺤씤???곗씠????젣 ?붿껌???놁뒿?덈떎.')}
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin Recovery] load failed', error);
    return `
      <section class="module-view">
        <article class="error-card">
          <h2>蹂듦뎄 ?쇳꽣瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??</h2>
          <p>${escapeHtml(error.message || error)}</p>
        </article>
      </section>`;
  }
}

