import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a3-request-status-audit-20260718';
import { getState } from '../admin-state.js?v=admin-2-0-a3-request-status-audit-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a3-request-status-audit-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a3-request-status-audit-20260718';

const OPEN_STATUSES = new Set(['pending', 'reviewing', 'approved', 'hold', 'scheduled', 'processing', 'failed']);
const CLOSED_STATUSES = new Set(['rejected', 'canceled', 'completed']);

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

const REQUEST_TYPE_LABELS = {
  account: '계정 삭제',
  leave_room: 'Room 연결 해제',
  delete_room: 'Room 전체 삭제'
};

const REQUEST_TYPE_DESCRIPTIONS = {
  account: '로그인 계정과 개인 프로필 삭제 요청입니다. 공동 Room 기록은 별도 검토 대상입니다.',
  leave_room: '요청자의 Room 연결만 끊고, 기존 공동 기록은 보존하는 유형입니다.',
  delete_room: '채팅·기록·사진 등 공동 데이터 삭제 요청입니다. 상대방 권리와 보관 필요성을 함께 확인해야 합니다.'
};

const SEGMENTS = [
  { key: 'account', label: '계정 삭제', type: 'account' },
  { key: 'leave_room', label: 'Room 연결 해제', type: 'leave_room' },
  { key: 'delete_room', label: 'Room 전체 삭제', type: 'delete_room' },
  { key: 'all', label: '전체', type: null }
];

const ACTION_STATUSES = {
  reviewing: {
    label: '검토 중',
    confirm: '이 요청을 검토 중으로 변경할까요?'
  },
  hold: {
    label: '보류',
    confirm: '이 요청을 보류 상태로 변경할까요?'
  },
  approved: {
    label: '승인',
    confirm: '이 요청을 승인 상태로 변경할까요? 실제 삭제/해제 실행은 아직 하지 않습니다.'
  },
  rejected: {
    label: '거절',
    confirm: '이 요청을 거절 상태로 변경할까요? 사용자에게 보일 답변을 먼저 확인해 주세요.'
  }
};

const AUDIT_ACTION_LABELS = {
  request_memo_saved: '관리자 메모 저장',
  request_status_reviewing: '요청 검토 중',
  request_status_hold: '요청 보류',
  request_status_approved: '요청 승인',
  request_status_rejected: '요청 거절'
};

let currentRows = [];
let currentSegment = 'all';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (text.length <= 12) return text || '-';
  return `${text.slice(0, 6)}…${text.slice(-5)}`;
}

function requestTypeLabel(item) {
  return REQUEST_TYPE_LABELS[item.requestType] || item.requestTypeLabel || item.requestType || '데이터 요청';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '접수됨';
}

function statusClass(status) {
  if (['completed', 'approved'].includes(status)) return 'ok';
  if (['rejected', 'failed'].includes(status)) return 'danger';
  if (['canceled'].includes(status)) return 'muted';
  if (['hold', 'scheduled', 'processing'].includes(status)) return 'warn';
  return 'active';
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

function pathKey(row) {
  return `${row.ownerUid}__${row.id}`;
}

function serverTimestamp() {
  return window.firebase.database.ServerValue.TIMESTAMP;
}

function pushAuditUpdate(database, updates, action, row, detail = {}) {
  const state = getState();
  const auditRef = database.ref('adminAuditLogs').push();
  updates[`adminAuditLogs/${auditRef.key}`] = {
    action,
    actionLabel: AUDIT_ACTION_LABELS[action] || action,
    target: 'dataDeleteRequest',
    targetType: row.requestType || '',
    targetLabel: row.typeLabel || requestTypeLabel(row),
    ownerUid: row.ownerUid || '',
    requestId: row.id || '',
    roomCode: row.roomCode || '',
    requestedByUid: row.requestedByUid || row.ownerUid || '',
    requestedByEmail: row.requestedByEmail || '',
    statusBefore: row.status || '',
    statusAfter: detail.statusAfter || row.status || '',
    note: detail.note || '',
    adminUid: state.user?.uid || '',
    adminEmail: state.user?.email || '',
    createdAt: serverTimestamp()
  };
}

function findRow(ownerUid, requestId) {
  return currentRows.find((row) => row.ownerUid === ownerUid && row.id === requestId) || null;
}

function defaultAdminMessage(status, row) {
  if (status === 'reviewing') return '요청을 확인하고 있습니다. 필요한 내용을 검토한 뒤 다시 안내드리겠습니다.';
  if (status === 'hold') return '요청 내용 확인을 위해 처리를 잠시 보류했습니다. 추가 확인 후 다시 안내드리겠습니다.';
  if (status === 'approved') return '요청이 승인되었습니다. 실제 처리 일정과 범위는 운영자가 확인 후 안내드리겠습니다.';
  if (status === 'rejected') return '요청을 검토했으나 현재 상태에서는 처리하기 어렵습니다. 필요한 경우 사유를 보완해 다시 요청해 주세요.';
  return row?.adminMessage || '요청이 접수되었습니다. 운영자가 내용을 확인할 예정입니다.';
}

async function loadRequests() {
  const database = getAdminDatabase();
  const [requestSnap, noteSnap] = await Promise.all([
    database.ref('dataDeleteRequests').once('value'),
    database.ref('dataDeleteRequestAdminNotes').once('value')
  ]);

  const requestRoot = asObject(requestSnap.val());
  const noteRoot = asObject(noteSnap.val());
  const rows = [];

  Object.entries(requestRoot).forEach(([ownerUid, requests]) => {
    Object.entries(asObject(requests)).forEach(([requestId, rawItem]) => {
      const item = asObject(rawItem);
      const note = asObject(asObject(noteRoot[ownerUid])[requestId]);
      const status = item.status || 'pending';
      rows.push({
        id: requestId,
        ownerUid,
        status,
        typeLabel: requestTypeLabel(item),
        requestedAt: latestNumber(item.requestedAt, item.updatedAt),
        updatedAt: latestNumber(item.updatedAt, item.reviewedAt, item.requestedAt),
        requestedByEmail: item.requestedByEmail || '',
        requestedByUid: item.requestedByUid || ownerUid,
        roomCode: item.roomCode || '',
        requestType: item.requestType || '',
        reason: item.reason || '',
        adminMessage: item.adminMessage || '',
        partnerConsentRequired: item.partnerConsentRequired === true,
        reviewedByUid: item.reviewedByUid || '',
        memo: note.memo || ''
      });
    });
  });

  return rows.sort((a, b) => b.requestedAt - a.requestedAt);
}

function renderStats(rows) {
  const open = rows.filter((row) => OPEN_STATUSES.has(row.status)).length;
  const account = rows.filter((row) => row.requestType === 'account').length;
  const leaveRoom = rows.filter((row) => row.requestType === 'leave_room').length;
  const deleteRoom = rows.filter((row) => row.requestType === 'delete_room').length;

  return `
    <div class="metric-grid admin-request-metrics">
      <article class="metric-card"><span>처리 필요</span><strong>${open}</strong><small>열린 상태 요청</small></article>
      <article class="metric-card"><span>계정 삭제</span><strong>${account}</strong><small>개인 정보 중심</small></article>
      <article class="metric-card"><span>Room 연결 해제</span><strong>${leaveRoom}</strong><small>공동 기록 보존</small></article>
      <article class="metric-card"><span>Room 전체 삭제</span><strong>${deleteRoom}</strong><small>추가 검토 필요</small></article>
    </div>`;
}

function segmentCount(rows, segment) {
  if (!segment.type) return rows.length;
  return rows.filter((row) => row.requestType === segment.type).length;
}

function renderSegments(rows) {
  return `
    <div class="admin-request-segments" role="tablist" aria-label="요청 유형 선택">
      ${SEGMENTS.map((segment) => `
        <button
          type="button"
          class="admin-request-segment ${currentSegment === segment.key ? 'active' : ''}"
          data-admin-request-segment="${escapeHtml(segment.key)}"
          aria-selected="${currentSegment === segment.key ? 'true' : 'false'}">
          ${escapeHtml(segment.label)}
          <span>${segmentCount(rows, segment)}</span>
        </button>
      `).join('')}
    </div>`;
}

function renderSegmentGuide() {
  const visibleSegments = SEGMENTS.filter((segment) => segment.type);
  return `
    <div class="admin-request-guide-grid" aria-label="요청 유형 설명">
      ${visibleSegments.map((segment) => `
        <article class="admin-request-guide-card">
          <strong>${escapeHtml(segment.label)}</strong>
          <p>${escapeHtml(REQUEST_TYPE_DESCRIPTIONS[segment.type])}</p>
        </article>
      `).join('')}
    </div>`;
}

function renderRequestCard(row) {
  const searchable = [
    row.typeLabel,
    row.status,
    statusLabel(row.status),
    row.requestedByEmail,
    row.requestedByUid,
    row.ownerUid,
    row.roomCode,
    row.reason,
    row.adminMessage,
    row.memo
  ].join(' ').toLowerCase();

  const sharedNotice = row.requestType === 'delete_room' || row.partnerConsentRequired
    ? '<span class="admin-request-warning">공동 Room 검토 필요</span>'
    : '';
  const key = pathKey(row);
  const isApproved = row.status === 'approved';
  const isClosed = CLOSED_STATUSES.has(row.status);
  const flowText = isApproved
    ? '승인됨 · 실제 삭제/연결 해제 실행은 별도 안전 단계에서만 진행'
    : isClosed
      ? '닫힌 요청 · 필요하면 기록 확인 후 별도 요청으로 재진행'
      : '열린 요청 · 답변/메모/상태를 남기고 검토 계속';

  return `
    <article class="admin-request-card" data-admin-request-row data-request-type="${escapeHtml(row.requestType)}" data-status="${escapeHtml(row.status)}" data-search="${escapeHtml(searchable)}">
      <div class="admin-request-head">
        <div>
          <strong>${escapeHtml(row.typeLabel)}</strong>
          <p>${escapeHtml(row.requestedByEmail || row.requestedByUid || '-')}</p>
        </div>
        <span class="admin-request-status ${statusClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span>
      </div>
      <div class="admin-request-meta">
        <span>Room ${escapeHtml(row.roomCode || '-')}</span>
        <span>UID ${escapeHtml(shortUid(row.ownerUid))}</span>
        <span>접수 ${escapeHtml(formatDateTime(row.requestedAt))}</span>
        <span>갱신 ${escapeHtml(formatDateTime(row.updatedAt))}</span>
        ${sharedNotice}
      </div>
      <div class="admin-request-body">
        <div><strong>요청 사유</strong><p>${escapeHtml(row.reason || '-')}</p></div>
        <div><strong>운영자 답변</strong><p>${escapeHtml(row.adminMessage || '아직 운영자 답변이 없습니다.')}</p></div>
      </div>
      <div class="admin-request-flow">
        <span class="admin-request-flow-step ${isClosed ? 'done' : 'active'}">${escapeHtml(statusLabel(row.status))}</span>
        <p>${escapeHtml(flowText)}</p>
      </div>
      <div class="admin-request-editor">
        <label>
          <span>사용자에게 전달할 답변</span>
          <textarea data-admin-reply="${escapeHtml(key)}" rows="3">${escapeHtml(row.adminMessage || defaultAdminMessage(row.status, row))}</textarea>
        </label>
        <label>
          <span>관리자 내부 메모</span>
          <textarea data-admin-memo="${escapeHtml(key)}" rows="3" placeholder="사용자에게 보이지 않습니다.">${escapeHtml(row.memo || '')}</textarea>
        </label>
      </div>
      <div class="admin-request-actions" data-owner-uid="${escapeHtml(row.ownerUid)}" data-request-id="${escapeHtml(row.id)}">
        <button type="button" data-admin-save-memo>관리자 메모 저장</button>
        <button type="button" data-admin-status="reviewing">검토 중</button>
        <button type="button" data-admin-status="hold">보류</button>
        <button type="button" data-admin-status="approved">승인</button>
        <button type="button" class="danger" data-admin-status="rejected">거절</button>
      </div>
      <p class="admin-request-safe-note">이 화면에서는 답변·메모·상태만 저장합니다. 실제 데이터 삭제나 Room 연결 해제는 실행하지 않습니다.</p>
    </article>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return renderEmptyState('표시할 데이터 요청이 없습니다', '아직 사용자가 보낸 삭제 또는 데이터 처리 요청이 없습니다.');
  }
  return `<div class="admin-request-list">${rows.map(renderRequestCard).join('')}</div>`;
}

export async function render() {
  try {
    currentRows = await loadRequests();
    return `
      <section class="module-view" aria-labelledby="adminRequestsHeading">
        <div class="foundation-notice">
          <div><span class="notice-icon" aria-hidden="true">🛡️</span></div>
          <div>
            <h2 id="adminRequestsHeading">데이터 요청 관리</h2>
            <p>삭제 요청을 계정 삭제, Room 연결 해제, Room 전체 삭제로 나누어 확인합니다. 이 단계에서는 답변·메모·상태 저장만 제공합니다.</p>
          </div>
        </div>
        ${renderStats(currentRows)}
        <article class="panel">
          <div class="panel-header admin-request-panel-header">
            <div>
              <h2>데이터 요청 관리</h2>
              <p>요청 유형을 먼저 고르고, 상태와 검색으로 필요한 요청만 좁혀 볼 수 있습니다.</p>
            </div>
            <div class="admin-request-tools">
              <select id="adminRequestFilter" class="admin-request-filter" aria-label="요청 상태 필터">
                <option value="open">처리 필요</option>
                <option value="all">모든 상태</option>
                <option value="closed">닫힌 요청</option>
              </select>
              <input id="adminRequestSearch" class="admin-user-search" type="search" placeholder="요청 검색">
            </div>
          </div>
          ${renderSegments(currentRows)}
          ${renderSegmentGuide()}
          ${renderRows(currentRows)}
        </article>
      </section>`;
  } catch (error) {
    console.error('[Admin Requests] load failed', error);
    return `
      <section class="module-view">
        <div class="error-card">
          <strong>데이터 요청 목록을 불러오지 못했습니다.</strong>
          <p>${escapeHtml(error.message || error)}</p>
        </div>
      </section>`;
  }
}

function getTextarea(row, type) {
  const key = pathKey(row);
  const attr = type === 'memo' ? 'data-admin-memo' : 'data-admin-reply';
  return Array.from(document.querySelectorAll(`textarea[${attr}]`))
    .find((textarea) => textarea.getAttribute(attr) === key) || null;
}

async function saveMemo(row) {
  const memoText = (getTextarea(row, 'memo')?.value || '').trim();
  const database = getAdminDatabase();
  const updates = {};
  const notePath = `dataDeleteRequestAdminNotes/${row.ownerUid}/${row.id}`;
  if (memoText) {
    const state = getState();
    updates[notePath] = {
      memo: memoText,
      updatedAt: serverTimestamp(),
      updatedByUid: state.user?.uid || ''
    };
  } else {
    updates[notePath] = null;
  }
  pushAuditUpdate(database, updates, 'request_memo_saved', row, {
    note: memoText ? '관리자 내부 메모 저장' : '관리자 내부 메모 삭제'
  });
  await database.ref().update(updates);
}

async function updateRequestStatus(row, status) {
  const action = ACTION_STATUSES[status];
  if (!action) return;

  const replyText = (getTextarea(row, 'reply')?.value || '').trim() || defaultAdminMessage(status, row);
  if (!replyText) {
    window.alert('사용자에게 전달할 답변을 먼저 작성해 주세요.');
    return;
  }
  if (!window.confirm(action.confirm)) return;

  const state = getState();
  const database = getAdminDatabase();
  const requestPath = `dataDeleteRequests/${row.ownerUid}/${row.id}`;
  const updates = {
    [`${requestPath}/status`]: status,
    [`${requestPath}/adminMessage`]: replyText,
    [`${requestPath}/reviewedByUid`]: state.user?.uid || '',
    [`${requestPath}/reviewedAt`]: serverTimestamp(),
    [`${requestPath}/updatedAt`]: serverTimestamp()
  };

  const memoText = (getTextarea(row, 'memo')?.value || '').trim();
  const notePath = `dataDeleteRequestAdminNotes/${row.ownerUid}/${row.id}`;
  if (memoText) {
    updates[notePath] = {
      memo: memoText,
      updatedAt: serverTimestamp(),
      updatedByUid: state.user?.uid || ''
    };
  }

  pushAuditUpdate(database, updates, `request_status_${status}`, row, {
    statusAfter: status,
    note: `${statusLabel(row.status)} → ${statusLabel(status)}`
  });

  await database.ref().update(updates);
}

async function refreshRequestsView() {
  const outlet = document.getElementById('adminOutlet');
  if (!outlet) return;
  outlet.innerHTML = await render();
  afterRender();
}

function applyFilter() {
  const search = document.getElementById('adminRequestSearch');
  const filter = document.getElementById('adminRequestFilter');
  const query = (search?.value || '').trim().toLowerCase();
  const mode = filter?.value || 'open';
  const segment = SEGMENTS.find((item) => item.key === currentSegment) || SEGMENTS[SEGMENTS.length - 1];

  document.querySelectorAll('[data-admin-request-row]').forEach((row) => {
    const status = row.dataset.status || 'pending';
    const requestType = row.dataset.requestType || '';
    const matchesSegment = !segment.type || requestType === segment.type;
    const matchesQuery = !query || String(row.dataset.search || '').includes(query);
    const matchesMode =
      mode === 'all' ||
      (mode === 'open' && OPEN_STATUSES.has(status)) ||
      (mode === 'closed' && CLOSED_STATUSES.has(status));
    row.hidden = !(matchesSegment && matchesQuery && matchesMode);
  });
}

export function afterRender() {
  const search = document.getElementById('adminRequestSearch');
  const filter = document.getElementById('adminRequestFilter');

  search?.addEventListener('input', applyFilter);
  filter?.addEventListener('change', applyFilter);

  document.querySelectorAll('[data-admin-request-segment]').forEach((button) => {
    button.addEventListener('click', () => {
      currentSegment = button.dataset.adminRequestSegment || 'all';
      document.querySelectorAll('[data-admin-request-segment]').forEach((item) => {
        const active = item.dataset.adminRequestSegment === currentSegment;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      applyFilter();
    });
  });

  document.querySelectorAll('[data-admin-save-memo]').forEach((button) => {
    button.addEventListener('click', async () => {
      const actionBox = button.closest('[data-owner-uid][data-request-id]');
      const row = findRow(actionBox?.dataset.ownerUid, actionBox?.dataset.requestId);
      if (!row) return;
      button.disabled = true;
      try {
        await saveMemo(row);
        window.alert('관리자 메모를 저장했습니다.');
        await refreshRequestsView();
      } catch (error) {
        console.error('[Admin Requests] memo save failed', error);
        window.alert(`관리자 메모 저장에 실패했습니다.\n${error.message || error}`);
      } finally {
        button.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-admin-status]').forEach((button) => {
    button.addEventListener('click', async () => {
      const actionBox = button.closest('[data-owner-uid][data-request-id]');
      const row = findRow(actionBox?.dataset.ownerUid, actionBox?.dataset.requestId);
      const status = button.dataset.adminStatus;
      if (!row || !status) return;
      button.disabled = true;
      try {
        await updateRequestStatus(row, status);
        await refreshRequestsView();
      } catch (error) {
        console.error('[Admin Requests] status update failed', error);
        window.alert(`요청 상태 저장에 실패했습니다.\n${error.message || error}`);
      } finally {
        button.disabled = false;
      }
    });
  });

  applyFilter();
}
