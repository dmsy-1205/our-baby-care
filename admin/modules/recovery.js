import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a10-recovery-clean-20260719';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a10-recovery-clean-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a10-recovery-clean-20260719';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

async function loadRecoveryRows() {
  const database = getAdminDatabase();
  const [requestsSnap, usersSnap, userRoomsSnap, roomMembersSnap] = await Promise.all([
    database.ref('dataDeleteRequests').once('value'),
    database.ref('users').once('value'),
    database.ref('userRooms').once('value'),
    database.ref('roomMembers').once('value')
  ]);

  const requestsRoot = asObject(requestsSnap.val());
  const users = asObject(usersSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const rows = [];

  Object.entries(requestsRoot).forEach(([ownerUid, byRequest]) => {
    Object.entries(asObject(byRequest)).forEach(([id, item]) => {
      const request = asObject(item);
      const roomCode = request.roomCode || Object.keys(asObject(userRooms[ownerUid]))[0] || '';
      const members = Object.keys(asObject(roomMembers[roomCode]));
      rows.push({
        id,
        ownerUid,
        ...request,
        requestType: request.requestType || request.type || 'account',
        status: request.status || 'pending',
        roomCode,
        userExists: Boolean(users[ownerUid]),
        roomLinked: Boolean(roomCode),
        memberCount: members.length,
        latest: latestNumber(request.updatedAt, request.reviewedAt, request.createdAt)
      });
    });
  });

  return rows.sort((a, b) => b.latest - a.latest);
}

function typeLabel(type) {
  return {
    account: '계정 삭제',
    leave_room: 'Room 연결 해제',
    delete_room: 'Room 전체 삭제'
  }[type] || type || '데이터 요청';
}

function renderRecoveryCard(row) {
  const isRoomDelete = row.requestType === 'delete_room';
  return `
    <article class="admin-recovery-card">
      <div class="admin-recovery-head">
        <div>
          <strong>${escapeHtml(typeLabel(row.requestType))}</strong>
          <p>${escapeHtml(row.requestedByEmail || row.email || row.ownerUid)}</p>
        </div>
        <span class="admin-request-status muted">읽기 전용</span>
      </div>
      <div class="admin-recovery-meta">
        <span>UID ${escapeHtml(compactId(row.ownerUid))}</span>
        <span>요청 ID ${escapeHtml(compactId(row.id))}</span>
        <span>Room ${escapeHtml(row.roomCode || '미연결')}</span>
        <span>상태 ${escapeHtml(row.status)}</span>
        <span>갱신 ${escapeHtml(formatDateTime(row.latest))}</span>
      </div>
      <div class="admin-recovery-grid">
        <section>
          <h3>기준점</h3>
          <ul>
            <li>사용자 정보: ${row.userExists ? '있음' : '없음'}</li>
            <li>사용자 Room 연결: ${row.roomLinked ? '있음' : '없음'}</li>
            <li>Room 멤버십: ${row.memberCount ? '있음' : '없음'}</li>
            <li>Room 멤버 수: ${row.memberCount}명</li>
          </ul>
        </section>
        <section>
          <h3>확인 경로</h3>
          <ul>
            <li>users/${escapeHtml(row.ownerUid)}</li>
            <li>userRooms/${escapeHtml(row.ownerUid)}</li>
            <li>roomMembers/${escapeHtml(row.roomCode || 'roomCode')}</li>
            <li>dataDeleteRequests/${escapeHtml(row.ownerUid)}/${escapeHtml(row.id)}</li>
          </ul>
        </section>
        <section>
          <h3>실행 전 체크</h3>
          <ul>
            <li>요청자와 현재 상태를 먼저 확인</li>
            <li>공동 Room 데이터는 상대방 권리와 보관 필요성 확인</li>
            <li>관리자 메모와 감사 로그 확인</li>
            <li>${isRoomDelete ? '실제 삭제 전 별도 백업 기준점 확보' : '실제 처리는 별도 승인 단계에서 진행'}</li>
          </ul>
        </section>
      </div>
      <p class="admin-recovery-warning">읽기 전용 기준점입니다. 이 화면에서는 실제 삭제, Room 연결 해제, Room 전체 삭제를 실행하지 않습니다.</p>
    </article>`;
}

export async function render() {
  const rows = await loadRecoveryRows();
  const account = rows.filter((row) => row.requestType === 'account').length;
  const leaveRoom = rows.filter((row) => row.requestType === 'leave_room').length;
  const deleteRoom = rows.filter((row) => row.requestType === 'delete_room').length;
  const list = rows.length
    ? `<div class="admin-recovery-list">${rows.map(renderRecoveryCard).join('')}</div>`
    : renderEmptyState('기준점 없음', '복구 기준으로 확인할 데이터 요청이 없습니다.', '↺');

  return `
    <section class="module-view" aria-labelledby="recoveryHeading">
      <div class="foundation-notice">
        <div><span class="notice-icon" aria-hidden="true">↺</span></div>
        <div>
          <h2 id="recoveryHeading">복구 센터 · 실행 전 기준점</h2>
          <p>삭제나 Room 연결 해제 전에 되돌릴 기준 정보를 읽기 전용으로 확인합니다.</p>
        </div>
      </div>
      <div class="metric-grid admin-recovery-metrics">
        <article class="metric-card"><span>기준점 요청</span><strong>${rows.length}</strong><small>전체 데이터 요청</small></article>
        <article class="metric-card"><span>계정 삭제</span><strong>${account}</strong><small>개인 정보 중심</small></article>
        <article class="metric-card"><span>Room 연결 해제</span><strong>${leaveRoom}</strong><small>공동 기록 보존</small></article>
        <article class="metric-card"><span>Room 전체 삭제</span><strong>${deleteRoom}</strong><small>이중 검토 필요</small></article>
      </div>
      <article class="panel">
        <div class="panel-header admin-recovery-panel-header">
          <div>
            <h2>삭제 요청 기준점</h2>
            <p>사용자 요청, 연결 Room, 멤버십, 공동 데이터 확인 경로를 읽기 전용으로 보여줍니다.</p>
          </div>
          <span class="phase-badge">Read Only</span>
        </div>
        ${list}
      </article>
    </section>`;
}
