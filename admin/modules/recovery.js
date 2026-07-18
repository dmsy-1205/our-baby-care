import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-route-render-fix-20260719';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a11-route-render-fix-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-route-render-fix-20260719';

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
    account: '계정 삭제',
    leave_room: 'Room 연결 해제',
    delete_room: 'Room 전체 삭제'
  }[type] || type || '데이터 요청';
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
  const room = row.roomCode || '미연결';
  return `
    <article class="admin-card admin-recovery-card">
      <div class="admin-request-card-head">
        <div>
          <h3>${escapeHtml(typeLabel(row.requestType))}</h3>
          <p>${escapeHtml(row.email || row.ownerUid || '요청자 정보 없음')}</p>
        </div>
        <span class="admin-status-pill muted">${escapeHtml(closed ? '닫힌 요청' : '열린 요청')}</span>
      </div>
      <div class="admin-meta-row">
        <span>UID ${escapeHtml(compactId(row.ownerUid))}</span>
        <span>요청 ID ${escapeHtml(compactId(row.requestId))}</span>
        <span>Room ${escapeHtml(room)}</span>
        <span>접수 ${escapeHtml(formatDateTime(row.createdAt))}</span>
        <span>갱신 ${escapeHtml(formatDateTime(row.updatedAt))}</span>
      </div>
      <div class="admin-grid admin-grid-3">
        <article class="admin-soft-card">
          <h4>${escapeHtml(typeLabel(row.requestType))} 기준점</h4>
          <ul>
            <li>사용자 정보: ${row.hasUser ? '있음' : '없음'}</li>
            <li>사용자 Room 연결: ${row.hasUserRoom ? '있음' : '없음'}</li>
            <li>Room 멤버십: ${row.hasRoomMembership ? '있음' : '없음'}</li>
            <li>Room 데이터: ${row.hasRoomData ? '있음' : '없음'}</li>
            <li>Room 멤버 수: ${row.roomMemberCount}명</li>
          </ul>
        </article>
        <article class="admin-soft-card">
          <h4>확인 경로</h4>
          <ul>
            <li>users/${escapeHtml(row.ownerUid)}</li>
            <li>userRooms/${escapeHtml(row.ownerUid)}/${escapeHtml(room)}</li>
            <li>roomMembers/${escapeHtml(room)}/${escapeHtml(row.ownerUid)}</li>
            <li>rooms/${escapeHtml(room)}</li>
          </ul>
        </article>
        <article class="admin-soft-card">
          <h4>실행 전 체크</h4>
          <ul>
            <li>요청자 본인 요청과 현재 상태 확인</li>
            <li>공동 Room 기록은 상대방 권리와 보존 필요성 함께 확인</li>
            <li>관리자 메모와 감사 로그를 먼저 확인</li>
            <li>실제 삭제는 별도 승인 단계에서만 진행</li>
          </ul>
        </article>
      </div>
      <div class="admin-warning-box">읽기 전용 기준점입니다. 이 화면에서는 실제 삭제, Room 연결 해제, Room 전체 삭제를 실행하지 않습니다.</div>
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
        <div class="admin-hero-icon">↺</div>
        <div>
          <h2 id="recoveryHeading">복구 센터 · 실행 전 기준점</h2>
          <p>삭제나 Room 연결 해제 전에 되돌릴 기준 정보를 읽기 전용으로 확인합니다. 현재 단계에서는 데이터를 변경하지 않습니다.</p>
        </div>
      </section>

      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>기준점 요청</span><strong>${rows.length}</strong><small>전체 데이터 요청</small></article>
        <article class="admin-card admin-metric"><span>계정 삭제</span><strong>${account}</strong><small>개인 정보 중심</small></article>
        <article class="admin-card admin-metric"><span>Room 연결 해제</span><strong>${leaveRoom}</strong><small>공동 기록 보존</small></article>
        <article class="admin-card admin-metric"><span>Room 전체 삭제</span><strong>${deleteRoom}</strong><small>이중 검토 필요</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>삭제 요청 기준점</h2>
            <p>사용자 요청, 연결 Room, 멤버십, 공동 데이터 확인 경로를 읽기 전용으로 보여줍니다.</p>
          </div>
          <span class="admin-status-pill muted">Read Only</span>
        </div>
        ${rows.length ? rows.map(renderBaselineCard).join('') : renderEmptyState('기준점 없음', '현재 확인할 데이터 요청 기준점이 없습니다.')}
      </section>
    </section>
  `;
}
