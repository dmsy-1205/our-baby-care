import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-data-center-foundation-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a11-data-center-foundation-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-data-center-foundation-20260718';

const REQUEST_TYPE_LABELS = {
  account: '계정 삭제',
  leave_room: 'Room 연결 해제',
  delete_room: 'Room 전체 삭제'
};

const STATUS_LABELS = {
  pending: '접수됨',
  reviewing: '검토 중',
  approved: '승인',
  hold: '보류',
  rejected: '거절',
  canceled: '사용자 취소',
  scheduled: '삭제 예정',
  processing: '처리 중',
  completed: '처리 완료',
  failed: '처리 실패'
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
  return `${text.slice(0, 7)}…${text.slice(-5)}`;
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

function requestTypeLabel(requestType) {
  return REQUEST_TYPE_LABELS[requestType] || requestType || '데이터 요청';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '상태 확인 필요';
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
  return roomCodes.length ? roomCodes.join(', ') : '연결 Room 확인 필요';
}

function memberListText(members) {
  if (!members.length) return 'Room 멤버 확인 필요';
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
  const activeRoomMatch = roomCode && user.activeRoom === roomCode ? '예' : '아니오 또는 확인 필요';
  const memberExists = roomCode && asObject(roomMembers[roomCode])[row.ownerUid] ? '존재' : '확인 필요';

  if (request.requestType === 'account') {
    return {
      title: '계정 삭제 기준점',
      summary: [
        `사용자 UID: ${shortUid(row.ownerUid)}`,
        `이메일: ${request.requestedByEmail || user.email || '-'}`,
        `activeRoom: ${user.activeRoom || '-'}`,
        `연결 Room: ${roomListText(userRoomCodes)}`
      ],
      paths: [
        `users/${row.ownerUid}`,
        `userRooms/${row.ownerUid}`,
        'roomMembers/{roomCode}/{uid}',
        'dataDeleteRequests/{uid}/{requestId}'
      ],
      checklist: [
        '계정 삭제 전 사용자 본인 요청과 현재 상태를 확인',
        '공동 Room 기록은 상대방 권리와 보존 필요성을 함께 확인',
        '관리자 메모와 감사 로그를 먼저 확인',
        '실제 삭제는 별도 승인 단계에서만 진행'
      ]
    };
  }

  if (request.requestType === 'leave_room') {
    return {
      title: 'Room 연결 해제 기준점',
      summary: [
        `대상 Room: ${roomCode || '-'}`,
        `요청자 멤버십: ${memberExists}`,
        `activeRoom 일치: ${activeRoomMatch}`,
        `Room 멤버: ${roomMemberList.length}명`
      ],
      paths: [
        `userRooms/${row.ownerUid}/${roomCode || '{roomCode}'}`,
        `roomMembers/${roomCode || '{roomCode}'}/${row.ownerUid}`,
        `users/${row.ownerUid}/activeRoom`,
        `rooms/${roomCode || '{roomCode}'} 기록은 보존`
      ],
      checklist: [
        '요청자의 Room 연결만 해제하는 요청인지 확인',
        '기존 공동 기록은 삭제하지 않고 보존',
        'activeRoom이 대상 Room이면 해제 기준 확인',
        '상대방 Room 접근권이 유지되는지 확인'
      ]
    };
  }

  if (request.requestType === 'delete_room') {
    return {
      title: 'Room 전체 삭제 기준점',
      summary: [
        `대상 Room: ${roomCode || '-'}`,
        `Room 멤버: ${roomMemberList.length}명`,
        `멤버 목록: ${memberListText(roomMemberList)}`,
        `공동 검토: ${request.partnerConsentRequired ? '필요' : '필요 여부 확인'}`
      ],
      paths: [
        `rooms/${roomCode || '{roomCode}'}`,
        `roomMembers/${roomCode || '{roomCode}'}`,
        `userRooms/{memberUid}/${roomCode || '{roomCode}'}`,
        '사진·채팅·기록 삭제 범위 별도 확인'
      ],
      checklist: [
        'Room 전체 삭제는 상대방 권리와 보관 필요성을 함께 확인',
        '채팅·기록·사진 등 공동 데이터 범위를 먼저 점검',
        '실행 전 관리자 메모와 감사 로그를 남김',
        '실제 삭제 전 별도 백업/복구 기준점을 확보'
      ]
    };
  }

  return {
    title: '요청 기준점',
    summary: [
      `사용자 UID: ${shortUid(row.ownerUid)}`,
      `이메일: ${request.requestedByEmail || user.email || '-'}`,
      `요청 유형: ${requestTypeLabel(request.requestType)}`,
      `Room: ${roomCode || '-'}`
    ],
    paths: ['dataDeleteRequests/{uid}/{requestId}', 'users/{uid}', 'userRooms/{uid}', 'roomMembers/{roomCode}'],
    checklist: [
      '요청 유형과 상태를 먼저 확인',
      '실제 데이터 변경 전 관리자 메모를 남김',
      '공동 데이터는 상대방 권리를 확인',
      '이 화면에서는 실제 삭제를 실행하지 않음'
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
      <article class="metric-card"><span>기준점 요청</span><strong>${rows.length}</strong><small>전체 데이터 요청</small></article>
      <article class="metric-card"><span>계정 삭제</span><strong>${accountCount}</strong><small>개인 정보 중심</small></article>
      <article class="metric-card"><span>Room 연결 해제</span><strong>${leaveRoomCount}</strong><small>공동 기록 보존</small></article>
      <article class="metric-card"><span>Room 전체 삭제</span><strong>${deleteRoomCount}</strong><small>이중 검토 필요</small></article>
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
        <span>요청 ID ${escapeHtml(shortUid(row.id))}</span>
        <span>Room ${escapeHtml(request.roomCode || user.activeRoom || '-')}</span>
        <span>접수 ${escapeHtml(formatDateTime(requestedAt))}</span>
        <span>갱신 ${escapeHtml(formatDateTime(updatedAt))}</span>
      </div>
      <div class="admin-recovery-grid">
        <section>
          <h3>${escapeHtml(baseline.title)}</h3>
          ${renderCheckList(baseline.summary)}
        </section>
        <section>
          <h3>확인 경로</h3>
          ${renderCheckList(baseline.paths)}
        </section>
        <section>
          <h3>실행 전 체크</h3>
          ${renderCheckList(baseline.checklist)}
        </section>
      </div>
      <p class="admin-recovery-warning">읽기 전용 기준점입니다. 이 화면에서는 실제 삭제, Room 연결 해제, Room 전체 삭제를 실행하지 않습니다.</p>
    </article>`;
}

export async function render() {
  try {
    const rows = await loadRecoveryRows();

    return `
      <section class="module-view" aria-labelledby="adminRecoveryHeading">
        <div class="foundation-notice">
          <span class="notice-icon">↺</span>
          <div>
            <h2 id="adminRecoveryHeading">복구 센터 · 실행 전 기준점</h2>
            <p>삭제나 Room 연결 해제 전에 되돌릴 기준 정보를 확인합니다. 현재 단계에서는 데이터를 변경하지 않습니다.</p>
          </div>
        </div>
        ${renderMetrics(rows)}
        <article class="panel">
          <div class="panel-header admin-recovery-panel-header">
            <div>
              <h2>삭제 요청 기준점</h2>
              <p>사용자 요청, 연결 Room, 멤버십, 공동 데이터 확인 경로를 읽기 전용으로 보여줍니다.</p>
            </div>
            <span class="phase-badge">Read Only</span>
          </div>
          ${rows.length ? `<div class="admin-recovery-list">${rows.map(renderRecoveryCard).join('')}</div>` : renderEmptyState('복구 기준점 없음', '현재 확인할 데이터 삭제 요청이 없습니다.')}
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin Recovery] load failed', error);
    return `
      <section class="module-view">
        <article class="error-card">
          <h2>복구 센터를 불러오지 못했습니다.</h2>
          <p>${escapeHtml(error.message || error)}</p>
        </article>
      </section>`;
  }
}
