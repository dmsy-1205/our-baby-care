import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-route-render-fix-20260719';
import { getState } from '../admin-state.js';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a11-route-render-fix-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a11-route-render-fix-20260719';

const CLOSED_STATUSES = new Set(['completed', 'rejected', 'canceled', 'cancelled']);

const STATUS_LABELS = {
  pending: '접수됨',
  reviewing: '검토 중',
  hold: '보류',
  approved: '승인',
  rejected: '거절',
  canceled: '사용자 취소',
  cancelled: '사용자 취소',
  scheduled: '삭제 예정',
  processing: '처리 중',
  completed: '처리 완료',
  failed: '처리 실패'
};

const TYPE_LABELS = {
  account: '계정 삭제',
  leave_room: 'Room 연결 해제',
  delete_room: 'Room 전체 삭제'
};

const TYPE_DESCRIPTIONS = {
  account: '로그인 계정과 개인 프로필 삭제 요청입니다. 공동 Room 기록은 별도 검토 대상입니다.',
  leave_room: '요청자의 Room 연결만 끊고, 기존 공동 기록은 보존하는 유형입니다.',
  delete_room: '채팅·기록·사진 등 공동 데이터를 삭제하는 요청입니다. 상대방 권리와 보관 필요성을 함께 확인해야 합니다.'
};

const SEGMENTS = [
  { key: 'account', label: '계정 삭제', type: 'account' },
  { key: 'leave_room', label: 'Room 연결 해제', type: 'leave_room' },
  { key: 'delete_room', label: 'Room 전체 삭제', type: 'delete_room' },
  { key: 'all', label: '전체', type: null }
];

const ACTIONS = [
  { status: 'reviewing', label: '검토 중', confirm: '이 요청을 검토 중으로 변경할까요?' },
  { status: 'hold', label: '보류', confirm: '이 요청을 보류 상태로 변경할까요?' },
  { status: 'approved', label: '승인', confirm: '이 요청을 승인 상태로 변경할까요? 실제 삭제 실행은 아직 하지 않습니다.' },
  { status: 'rejected', label: '거절', confirm: '이 요청을 거절 상태로 변경할까요?' }
];

let rows = [];
let currentSegment = 'all';
let currentStatusFilter = 'open';
let currentSearch = '';
const openDetails = new Set();

function escapeSelector(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(String(value));
  }

  return String(value).replace(/["\\\]]/g, '\\$&');
}

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function serverTimestamp() {
  return window.firebase.database.ServerValue.TIMESTAMP;
}

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
}

function requestKey(row) {
  return `${row.ownerUid}__${row.id}`;
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '접수됨';
}

function typeLabel(row) {
  return TYPE_LABELS[row.requestType] || row.requestTypeLabel || row.requestType || '데이터 요청';
}

function statusClass(status) {
  if (['completed', 'approved'].includes(status)) return 'ok';
  if (['rejected', 'failed'].includes(status)) return 'danger';
  if (['hold', 'scheduled', 'processing'].includes(status)) return 'warn';
  if (['canceled', 'cancelled'].includes(status)) return 'muted';
  return 'pending';
}

function isClosed(row) {
  return CLOSED_STATUSES.has(row.status);
}

function normalizeType(request) {
  const raw = request.requestType || request.type || request.deleteType || request.mode || '';
  if (raw === 'account' || raw === 'account_delete' || raw === 'delete_account') return 'account';
  if (raw === 'leave_room' || raw === 'disconnect_room' || raw === 'unlink_room') return 'leave_room';
  if (raw === 'delete_room' || raw === 'room_delete' || raw === 'room') return 'delete_room';
  return raw || 'account';
}

function normalizeRows(requestsValue, notesValue) {
  const requestsByUser = asObject(requestsValue);
  const notesById = asObject(notesValue);
  const output = [];

  Object.entries(requestsByUser).forEach(([ownerUid, requestGroup]) => {
    Object.entries(asObject(requestGroup)).forEach(([id, value]) => {
      const request = asObject(value);
      const note = asObject(notesById[id] || notesById[`${ownerUid}_${id}`]);
      const status = request.status || request.state || 'pending';
      const requestType = normalizeType(request);
      const updatedAt = latestNumber(request.updatedAt, request.reviewedAt, request.createdAt, request.requestedAt);

      output.push({
        ...request,
        ...note,
        ownerUid,
        id,
        requestType,
        status,
        requesterEmail: request.requesterEmail || request.email || request.userEmail || request.profileEmail || '',
        roomCode: request.roomCode || request.roomId || request.activeRoom || request.room || '',
        reason: request.reason || request.message || request.requestReason || '',
        adminMessage: note.adminMessage || request.adminMessage || request.operatorMessage || '요청이 접수되었습니다. 운영자가 내용을 확인할 예정입니다.',
        internalMemo: note.internalMemo || request.internalMemo || '',
        createdAt: latestNumber(request.createdAt, request.requestedAt, request.submittedAt),
        updatedAt
      });
    });
  });

  return output.sort((a, b) => latestNumber(b.updatedAt, b.createdAt) - latestNumber(a.updatedAt, a.createdAt));
}

function getCounts() {
  const byType = { account: 0, leave_room: 0, delete_room: 0, all: rows.length };
  const open = rows.filter((row) => !isClosed(row)).length;

  rows.forEach((row) => {
    if (byType[row.requestType] !== undefined) byType[row.requestType] += 1;
  });

  return { byType, open };
}

function matchesFilter(row) {
  const segment = SEGMENTS.find((item) => item.key === currentSegment);
  if (segment?.type && row.requestType !== segment.type) return false;

  if (currentStatusFilter === 'open' && isClosed(row)) return false;
  if (currentStatusFilter === 'closed' && !isClosed(row)) return false;
  if (!['all', 'open', 'closed'].includes(currentStatusFilter) && row.status !== currentStatusFilter) return false;

  if (!currentSearch) return true;
  const haystack = [
    typeLabel(row),
    statusLabel(row.status),
    row.requesterEmail,
    row.ownerUid,
    row.roomCode,
    row.reason,
    row.adminMessage,
    row.internalMemo,
    row.id
  ].join(' ').toLowerCase();

  return haystack.includes(currentSearch.toLowerCase());
}

function renderMetrics() {
  const counts = getCounts();
  return `
    <section class="admin-grid admin-grid-4">
      <article class="admin-card admin-metric">
        <span>처리 필요</span>
        <strong>${counts.open}</strong>
        <small>열린 상태 요청</small>
      </article>
      <article class="admin-card admin-metric">
        <span>계정 삭제</span>
        <strong>${counts.byType.account}</strong>
        <small>개인 정보 중심</small>
      </article>
      <article class="admin-card admin-metric">
        <span>Room 연결 해제</span>
        <strong>${counts.byType.leave_room}</strong>
        <small>공동 기록 보존</small>
      </article>
      <article class="admin-card admin-metric">
        <span>Room 전체 삭제</span>
        <strong>${counts.byType.delete_room}</strong>
        <small>추가 검토 필요</small>
      </article>
    </section>
  `;
}

function renderSegments() {
  const counts = getCounts();
  return `
    <div class="admin-segment-row" data-request-segments>
      ${SEGMENTS.map((segment) => `
        <button class="admin-chip ${currentSegment === segment.key ? 'is-active' : ''}" data-segment="${segment.key}" type="button">
          ${escapeHtml(segment.label)}
          <span>${counts.byType[segment.key] || 0}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderTypeDescriptions() {
  return `
    <div class="admin-grid admin-grid-3 admin-request-type-guide">
      ${SEGMENTS.filter((segment) => segment.type).map((segment) => `
        <article class="admin-card admin-soft-card">
          <h3>${escapeHtml(segment.label)}</h3>
          <p>${escapeHtml(TYPE_DESCRIPTIONS[segment.type])}</p>
        </article>
      `).join('')}
    </div>
  `;
}

function renderRequestList() {
  const filtered = rows.filter(matchesFilter);
  const segmentLabel = SEGMENTS.find((item) => item.key === currentSegment)?.label || '전체';
  const statusSummary = currentStatusFilter === 'open' ? '처리 필요' : currentStatusFilter === 'all' ? '모든 상태' : currentStatusFilter === 'closed' ? '닫힌 상태' : statusLabel(currentStatusFilter);

  if (!filtered.length) {
    return `
      <div class="admin-section-subtitle">${escapeHtml(segmentLabel)} · 현재 조건에 맞는 요청이 없습니다.</div>
      ${renderEmptyState('요청 없음', '필터나 검색어를 바꾸면 다른 요청을 볼 수 있습니다.')}
    `;
  }

  return `
    <div class="admin-section-subtitle">${escapeHtml(segmentLabel)} · ${escapeHtml(statusSummary)} 기준 ${filtered.length}건 표시</div>
    <div class="admin-request-list">
      ${filtered.map(renderRequestCard).join('')}
    </div>
  `;
}

function renderRequestCard(row) {
  const key = requestKey(row);
  const open = openDetails.has(key);
  const closed = isClosed(row);
  const updated = row.updatedAt || row.createdAt;

  return `
    <article class="admin-card admin-request-card" data-request-card="${escapeHtml(key)}">
      <div class="admin-request-card-head">
        <div>
          <h3>${escapeHtml(typeLabel(row))}</h3>
          <p>${escapeHtml(row.requesterEmail || row.ownerUid || '요청자 정보 없음')}</p>
        </div>
        <div class="admin-request-actions">
          <span class="admin-status-pill ${statusClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span>
          <button class="admin-button admin-button-small" type="button" data-toggle-detail="${escapeHtml(key)}">
            ${open ? '상세 접기' : '상세 보기'}
          </button>
        </div>
      </div>
      <div class="admin-meta-row">
        <span>Room ${escapeHtml(row.roomCode || '미연결')}</span>
        <span>UID ${escapeHtml(compactId(row.ownerUid))}</span>
        <span>접수 ${escapeHtml(formatDateTime(row.createdAt))}</span>
        <span>갱신 ${escapeHtml(formatDateTime(updated))}</span>
      </div>
      ${open ? renderRequestDetail(row, closed) : ''}
    </article>
  `;
}

function renderRequestDetail(row, closed) {
  const key = requestKey(row);
  return `
    <div class="admin-request-detail">
      <div class="admin-grid admin-grid-2">
        <label class="admin-field">
          <span>요청 사유</span>
          <textarea readonly>${escapeHtml(row.reason || '요청 사유 없음')}</textarea>
        </label>
        <label class="admin-field">
          <span>사용자에게 전달할 답변</span>
          <textarea data-admin-message="${escapeHtml(key)}">${escapeHtml(row.adminMessage || '')}</textarea>
        </label>
        <label class="admin-field">
          <span>관리자 내부 메모</span>
          <textarea data-internal-memo="${escapeHtml(key)}">${escapeHtml(row.internalMemo || '')}</textarea>
        </label>
        <div class="admin-info-box">
          <strong>${closed ? '닫힌 요청' : '처리 가능 요청'}</strong>
          <p>${closed ? '이미 닫힌 요청입니다. 기록 확인과 내부 메모 저장만 권장합니다.' : '답변·메모·상태만 저장합니다. 실제 삭제나 Room 연결 해제는 실행하지 않습니다.'}</p>
        </div>
      </div>
      <div class="admin-action-row">
        <button class="admin-button" type="button" data-save-request="${escapeHtml(key)}">관리자 메모 저장</button>
        ${closed ? '' : ACTIONS.map((action) => `
          <button class="admin-button admin-button-small" type="button" data-status="${escapeHtml(action.status)}" data-request="${escapeHtml(key)}">
            ${escapeHtml(action.label)}
          </button>
        `).join('')}
      </div>
      <p class="admin-muted">이 화면에서는 답변·메모·상태만 저장합니다. 실제 데이터 삭제나 Room 연결 해제는 실행하지 않습니다.</p>
    </div>
  `;
}

function findRow(key) {
  return rows.find((row) => requestKey(row) === key);
}

function getRequestPayload(root, key, nextStatus) {
  const row = findRow(key);
  if (!row) throw new Error('요청을 찾을 수 없습니다.');

  const safeKey = escapeSelector(key);
  const adminMessage = root.querySelector(`[data-admin-message="${safeKey}"]`)?.value || '';
  const internalMemo = root.querySelector(`[data-internal-memo="${safeKey}"]`)?.value || '';
  const state = getState();
  const adminEmail = state.user?.email || 'admin';

  return {
    row,
    adminMessage,
    internalMemo,
    status: nextStatus || row.status,
    adminEmail
  };
}

async function saveRequest(root, key, nextStatus = null) {
  const db = getAdminDatabase();
  const payload = getRequestPayload(root, key, nextStatus);
  const update = {
    adminMessage: payload.adminMessage,
    internalMemo: payload.internalMemo,
    status: payload.status,
    updatedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
    reviewedBy: payload.adminEmail
  };

  await db.ref(`dataDeleteRequests/${payload.row.ownerUid}/${payload.row.id}`).update(update);

  try {
    await db.ref(`dataDeleteRequestAdminNotes/${payload.row.id}`).update({
      ownerUid: payload.row.ownerUid,
      requestId: payload.row.id,
      requestType: payload.row.requestType,
      adminMessage: payload.adminMessage,
      internalMemo: payload.internalMemo,
      status: payload.status,
      updatedAt: serverTimestamp(),
      updatedBy: payload.adminEmail
    });
  } catch (error) {
    console.warn('[Admin Requests] admin note mirror skipped', error);
  }

  try {
    await db.ref(`adminAuditLogs/${Date.now()}_${payload.row.id}`).set({
      action: nextStatus ? 'request_status_update' : 'request_note_update',
      requestId: payload.row.id,
      ownerUid: payload.row.ownerUid,
      requestType: payload.row.requestType,
      status: payload.status,
      adminEmail: payload.adminEmail,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.warn('[Admin Requests] audit log skipped', error);
  }
}

function renderShell() {
  return `
    <section class="admin-stack">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">🛡️</div>
        <div>
          <h2>데이터 요청 관리</h2>
          <p>삭제 요청을 계정 삭제, Room 연결 해제, Room 전체 삭제로 나누어 확인합니다. 현재 화면은 답변·메모·상태 저장까지만 제공합니다.</p>
        </div>
      </section>
      ${renderMetrics()}
      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>데이터 요청 관리</h2>
            <p>요청 유형을 먼저 고르고, 상태와 검색으로 필요한 요청만 좁혀 볼 수 있습니다.</p>
          </div>
          <div class="admin-filter-row">
            <select data-request-status-filter>
              <option value="open" ${currentStatusFilter === 'open' ? 'selected' : ''}>처리 필요</option>
              <option value="all" ${currentStatusFilter === 'all' ? 'selected' : ''}>모든 상태</option>
              <option value="closed" ${currentStatusFilter === 'closed' ? 'selected' : ''}>닫힌 상태</option>
              <option value="pending" ${currentStatusFilter === 'pending' ? 'selected' : ''}>접수됨</option>
              <option value="reviewing" ${currentStatusFilter === 'reviewing' ? 'selected' : ''}>검토 중</option>
              <option value="hold" ${currentStatusFilter === 'hold' ? 'selected' : ''}>보류</option>
              <option value="approved" ${currentStatusFilter === 'approved' ? 'selected' : ''}>승인</option>
              <option value="rejected" ${currentStatusFilter === 'rejected' ? 'selected' : ''}>거절</option>
              <option value="canceled" ${currentStatusFilter === 'canceled' ? 'selected' : ''}>사용자 취소</option>
            </select>
            <input data-request-search type="search" placeholder="요청 검색" value="${escapeHtml(currentSearch)}">
          </div>
        </div>
        ${renderSegments()}
        ${renderTypeDescriptions()}
        <div data-request-list>${renderRequestList()}</div>
      </section>
    </section>
  `;
}

function refresh(root) {
  root.innerHTML = renderShell();
}

function bindEvents(root) {
  if (root.dataset.requestsBound === '1') return;
  root.dataset.requestsBound = '1';

  root.addEventListener('click', async (event) => {
    const segmentButton = event.target.closest('[data-segment]');
    if (segmentButton) {
      currentSegment = segmentButton.dataset.segment;
      refresh(root);
      return;
    }

    const toggleButton = event.target.closest('[data-toggle-detail]');
    if (toggleButton) {
      const key = toggleButton.dataset.toggleDetail;
      if (openDetails.has(key)) openDetails.delete(key);
      else openDetails.add(key);
      root.querySelector('[data-request-list]').innerHTML = renderRequestList();
      return;
    }

    const saveButton = event.target.closest('[data-save-request]');
    if (saveButton) {
      saveButton.disabled = true;
      try {
        await saveRequest(root, saveButton.dataset.saveRequest);
        await loadRequests();
        root.querySelector('[data-request-list]').innerHTML = renderRequestList();
      } catch (error) {
        alert(`저장에 실패했습니다. ${error.message || error}`);
      } finally {
        saveButton.disabled = false;
      }
      return;
    }

    const statusButton = event.target.closest('[data-status][data-request]');
    if (statusButton) {
      const action = ACTIONS.find((item) => item.status === statusButton.dataset.status);
      if (action && !confirm(action.confirm)) return;

      statusButton.disabled = true;
      try {
        await saveRequest(root, statusButton.dataset.request, statusButton.dataset.status);
        await loadRequests();
        root.querySelector('[data-request-list]').innerHTML = renderRequestList();
      } catch (error) {
        alert(`상태 저장에 실패했습니다. ${error.message || error}`);
      } finally {
        statusButton.disabled = false;
      }
    }
  });

  root.addEventListener('change', (event) => {
    if (!event.target.matches('[data-request-status-filter]')) return;
    currentStatusFilter = event.target.value;
    refresh(root);
  });

  root.addEventListener('input', (event) => {
    if (!event.target.matches('[data-request-search]')) return;
    currentSearch = event.target.value.trim();
    root.querySelector('[data-request-list]').innerHTML = renderRequestList();
  });
}

async function loadRequests() {
  const db = getAdminDatabase();
  const [requestsSnapshot, notesSnapshot] = await Promise.all([
    db.ref('dataDeleteRequests').once('value'),
    db.ref('dataDeleteRequestAdminNotes').once('value').catch(() => ({ val: () => null }))
  ]);

  rows = normalizeRows(requestsSnapshot.val(), notesSnapshot.val());
}

export async function render() {
  await loadRequests();
  return renderShell();
}

export function afterRender(root) {
  bindEvents(root);
}
