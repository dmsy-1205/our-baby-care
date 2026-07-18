import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a12-action-guard-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a12-action-guard-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a12-action-guard-20260718';

const REQUEST_TYPE_LABELS = {
  account: '계정 삭제',
  leave_room: 'Room 연결 해제',
  delete_room: 'Room 전체 삭제'
};

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (!text) return '-';
  if (text.length <= 14) return text;
  return `${text.slice(0, 7)}…${text.slice(-5)}`;
}

function latestNumber(...values) {
  return values.map(Number).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => b - a)[0] || 0;
}

function requestTypeLabel(requestType) {
  return REQUEST_TYPE_LABELS[requestType] || requestType || '데이터 요청';
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

  Object.entries(requestsRoot).forEach(([ownerUid, requests]) => {
    Object.entries(asObject(requests)).forEach(([requestId, request]) => {
      const requestType = request?.requestType || request?.type || 'account';
      const roomCode = request?.roomCode || request?.roomId || request?.activeRoom || users[ownerUid]?.activeRoom || '';
      const members = asObject(roomMembers[roomCode]);
      rows.push({
        ownerUid,
        requestId,
        requestType,
        status: request?.status || 'pending',
        requesterEmail: request?.requesterEmail || request?.email || users[ownerUid]?.email || '',
        roomCode,
        createdAt: latestNumber(request?.createdAt, request?.requestedAt),
        updatedAt: latestNumber(request?.updatedAt, request?.reviewedAt, request?.createdAt),
        hasUser: Boolean(users[ownerUid]),
        hasUserRoom: Boolean(roomCode && asObject(userRooms[ownerUid])[roomCode]),
        hasRoomMembers: Boolean(roomCode && members[ownerUid]),
        roomMemberCount: Object.keys(members).length,
        hasRoomData: Boolean(roomCode && rooms[roomCode])
      });
    });
  });

  return rows.sort((a, b) => b.updatedAt - a.updatedAt);
}

function renderStats(rows) {
  const account = rows.filter((row) => row.requestType === 'account').length;
  const leaveRoom = rows.filter((row) => row.requestType === 'leave_room').length;
  const deleteRoom = rows.filter((row) => row.requestType === 'delete_room').length;
  return `
    <div class="metric-grid admin-recovery-metrics">
      <article class="metric-card"><span>기준점 요청</span><strong>${rows.length}</strong><small>전체 데이터 요청</small></article>
      <article class="metric-card"><span>계정 삭제</span><strong>${account}</strong><small>개인 정보 중심</small></article>
      <article class="metric-card"><span>Room 연결 해제</span><strong>${leaveRoom}</strong><small>공동 기록 보존</small></article>
      <article class="metric-card"><span>Room 전체 삭제</span><strong>${deleteRoom}</strong><small>이중 검토 필요</small></article>
    </div>`;
}

function renderRecoveryCard(row) {
  return `
    <article class="admin-list-card">
      <div class="admin-list-card-head">
        <div>
          <strong>${escapeHtml(requestTypeLabel(row.requestType))}</strong>
          <p>${escapeHtml(row.requesterEmail || row.ownerUid)}</p>
        </div>
        <span class="admin-status is-closed">${escapeHtml(row.status)}</span>
      </div>
      <div class="admin-meta-row">
        <span>UID ${escapeHtml(shortUid(row.ownerUid))}</span>
        <span>요청 ID ${escapeHtml(shortUid(row.requestId))}</span>
        <span>Room ${escapeHtml(row.roomCode || '미연결')}</span>
        <span>접수 ${escapeHtml(formatDateTime(row.createdAt))}</span>
        <span>갱신 ${escapeHtml(formatDateTime(row.updatedAt))}</span>
      </div>
      <div class="admin-system-grid">
        <section class="admin-system-card">
          <h3>기준점</h3>
          <ul>
            <li>사용자 정보: ${row.hasUser ? '있음' : '없음'}</li>
            <li>사용자 Room 연결: ${row.hasUserRoom ? '있음' : '없음'}</li>
            <li>Room 멤버십: ${row.hasRoomMembers ? '있음' : '없음'}</li>
            <li>Room 데이터: ${row.hasRoomData ? '있음' : '없음'}</li>
            <li>Room 멤버 수: ${row.roomMemberCount}명</li>
          </ul>
        </section>
        <section class="admin-system-card">
          <h3>실행 전 체크</h3>
          <ul>
            <li>이 화면은 읽기 전용입니다.</li>
            <li>실제 삭제·Room 연결 해제는 별도 승인 단계에서만 진행합니다.</li>
            <li>공동 Room 데이터는 상대방 권리와 보관 필요성을 먼저 확인합니다.</li>
          </ul>
        </section>
      </div>
    </article>`;
}

export async function render() {
  try {
    const rows = await loadRecoveryRows();
    return `
      ${renderStats(rows)}
      <section class="admin-card">
        <div class="admin-section-head">
          <div>
            <h2>복구 센터 · 실행 전 기준점</h2>
            <p>삭제나 Room 연결 해제 전에 되돌릴 기준 정보를 읽기 전용으로 확인합니다.</p>
          </div>
          <span class="phase-badge">Read Only</span>
        </div>
        <div class="admin-list">
          ${rows.length ? rows.map(renderRecoveryCard).join('') : renderEmptyState('기준점 요청이 없습니다.', '데이터 요청이 접수되면 여기에서 확인할 수 있습니다.')}
        </div>
      </section>`;
  } catch (error) {
    console.error('[Admin Recovery] load failed', error);
    return `<section class="admin-card">${renderEmptyState('복구 기준점을 불러오지 못했습니다.', error.message)}</section>`;
  }
}
