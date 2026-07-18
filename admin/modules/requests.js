import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a10-recovery-clean-20260719';
import { getState } from '../admin-state.js';
import { escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a10-recovery-clean-20260719';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a10-recovery-clean-20260719';

const CACHE_KEY = 'admin-2-0-a10-recovery-clean-20260719';

const CLOSED_STATUSES = new Set(['completed', 'rejected', 'canceled']);

const STATUS_LABELS = {
  pending: '접수됨',
  reviewing: '검토 중',
  hold: '보류',
  approved: '승인',
  rejected: '거절',
  canceled: '사용자 취소',
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
  delete_room: '채팅 · 기록 · 사진 등 공동 데이터를 삭제하는 요청입니다. 상대방 권리와 보관 필요성을 함께 확인해야 합니다.'
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

function typeLabel(row) {
  return TYPE_LABELS[row.requestType] || row.requestTypeLabel || row.requestType || '데이터 요청';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '접수됨';
}

function statusClass(status) {
  if (['completed', 'approved'].includes(status)) return 'ok';
  if (['rejected', 'failed'].includes(status)) return 'danger';
  if (['hold', 'scheduled', 'processing'].includes(status)) return 'warn';
  if (status === 'canceled') return 'muted';
  return 'active';
}

function isOpen(row) {
  return !CLOSED_STATUSES.has(row.status || 'pending');
}

async function loadRequests() {
  const database = getAdminDatabase();
  const [requestsSnap, notesSnap] = await Promise.all([
    database.ref('dataDeleteRequests').once('value'),
    database.ref('dataDeleteRequestAdminNotes').once('value').catch(() => ({ val: () => null }))
  ]);

  const notesRoot = asObject(notesSnap.val());
  const loaded = [];
  Object.entries(asObject(requestsSnap.val())).forEach(([ownerUid, byRequest]) => {
    Object.entries(asObject(byRequest)).forEach(([id, value]) => {
      const item = asObject(value);
      const note = asObject(asObject(notesRoot[ownerUid])[id]);
      loaded.push({
        id,
        ownerUid,
        ...item,
        status: item.status || 'pending',
        requestType: item.requestType || item.type || 'account',
        adminMessage: item.adminMessage || note.adminMessage || '',
        internalMemo: note.internalMemo || item.internalMemo || '',
        latest: latestNumber(item.updatedAt, item.reviewedAt, item.createdAt, note.updatedAt)
      });
    });
  });

  rows = loaded.sort((a, b) => b.latest - a.latest);
  return rows;
}

function filteredRows() {
  return rows.filter((row) => {
    if (currentSegment !== 'all') {
      const segment = SEGMENTS.find((item) => item.key === currentSegment);
      if (segment?.type && row.requestType !== segment.type) return false;
    }

    if (currentStatusFilter === 'open' && !isOpen(row)) return false;
    if (currentStatusFilter === 'closed' && isOpen(row)) return false;

    if (currentSearch) {
      const haystack = [
        row.ownerUid,
        row.requestedByUid,
        row.requestedByEmail,
        row.email,
        row.roomCode,
        row.reason,
        row.adminMessage,
        row.internalMemo,
        typeLabel(row),
        statusLabel(row.status)
      ].join(' ').toLowerCase();
      if (!haystack.includes(currentSearch)) return false;
    }

    return true;
  });
}

function segmentCount(segment) {
  if (segment.key === 'all') return rows.length;
  return rows.filter((row) => row.requestType === segment.type).length;
}

function renderStats() {
  const open = rows.filter(isOpen).length;
  const account = rows.filter((row) => row.requestType === 'account').length;
  const leaveRoom = rows.filter((row) => row.requestType === 'leave_room').length;
  const deleteRoom = rows.filter((row) => row.requestType === 'delete_room').length;
  return `
    <div class="metric-grid">
      <article class="metric-card"><span>처리 필요</span><strong>${open}</strong><small>열린 상태 요청</small></article>
      <article class="metric-card"><span>계정 삭제</span><strong>${account}</strong><small>개인 정보 중심</small></article>
      <article class="metric-card"><span>Room 연결 해제</span><strong>${leaveRoom}</strong><small>공동 기록 보존</small></article>
      <article class="metric-card"><span>Room 전체 삭제</span><strong>${deleteRoom}</strong><small>추가 검토 필요</small></article>
    </div>`;
}

function renderSegments() {
  return `
    <div class="admin-request-segments" role="tablist" aria-label="요청 유형 필터">
      ${SEGMENTS.map((segment) => `
        <button type="button" class="admin-request-segment ${currentSegment === segment.key ? 'active' : ''}" data-request-segment="${segment.key}">
          ${escapeHtml(segment.label)} <span>${segmentCount(segment)}</span>
        </button>
      `).join('')}
    </div>`;
}

function renderGuide() {
  return `
    <div class="admin-request-guide-grid">
      ${SEGMENTS.filter((segment) => segment.type).map((segment) => `
        <div class="admin-request-guide-card">
          <strong>${escapeHtml(segment.label)}</strong>
          <p>${escapeHtml(TYPE_DESCRIPTIONS[segment.type])}</p>
        </div>
      `).join('')}
    </div>`;
}

function renderRequestCard(row, index) {
  const key = requestKey(row);
  const expanded = openDetails.has(key) || index === 0;
  const requester = row.requestedByEmail || row.email || row.ownerEmail || row.ownerUid;
  const summaryStatus = row.status === 'canceled' ? '닫힌 요청 · 필요하면 기록 확인 후 별도 요청으로 재진행' : `${statusLabel(row.status)} 상태`;

  return `
    <article class="admin-request-card ${expanded ? '' : 'is-collapsed'}" data-request-key="${escapeHtml(key)}">
      <div class="admin-request-head">
        <div>
          <strong>${escapeHtml(typeLabel(row))}</strong>
          <p>${escapeHtml(requester || '요청자 정보 없음')}</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <span class="admin-request-status ${statusClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span>
          <button type="button" class="admin-request-detail-toggle" data-request-toggle="${escapeHtml(key)}">${expanded ? '상세 접기' : '상세 보기'}</button>
        </div>
      </div>

      <div class="admin-request-meta">
        <span>Room ${escapeHtml(row.roomCode || '미연결')}</span>
        <span>UID ${escapeHtml(compactId(row.ownerUid || row.requestedByUid))}</span>
        <span>접수 ${escapeHtml(formatDateTime(row.createdAt))}</span>
        <span>갱신 ${escapeHtml(formatDateTime(row.latest))}</span>
        ${row.requestType === 'delete_room' ? '<span class="admin-request-warning">공동 Room 검토 필요</span>' : ''}
      </div>

      <div class="admin-request-body">
        <div>
          <strong>요청 사유</strong>
          <p>${escapeHtml(row.reason || '요청 사유가 없습니다.')}</p>
        </div>
        <div>
          <strong>운영자 답변</strong>
          <p>${escapeHtml(row.adminMessage || '아직 전달된 답변이 없습니다.')}</p>
        </div>
      </div>

      <div class="admin-request-flow">
        <span class="admin-request-flow-step ${isOpen(row) ? '' : 'done'}">${escapeHtml(statusLabel(row.status))}</span>
        <p>${escapeHtml(summaryStatus)}</p>
      </div>

      <div class="admin-request-editor">
        <label>
          <span>사용자에게 전달할 답변</span>
          <textarea data-request-admin-message="${escapeHtml(key)}" ${row.status === 'canceled' ? 'readonly' : ''}>${escapeHtml(row.adminMessage || '')}</textarea>
        </label>
        <label>
          <span>관리자 내부 메모</span>
          <textarea data-request-internal-memo="${escapeHtml(key)}" placeholder="사용자에게 보이지 않습니다.">${escapeHtml(row.internalMemo || '')}</textarea>
        </label>
      </div>

      <div class="admin-request-actions ${CLOSED_STATUSES.has(row.status) ? 'is-locked' : ''}">
        <button type="button" data-request-save="${escapeHtml(key)}">관리자 메모 저장</button>
        ${CLOSED_STATUSES.has(row.status)
          ? '<span class="admin-request-locked-note">닫힌 요청입니다. 기록 확인과 내부 메모 저장만 가능합니다.</span>'
          : ACTIONS.map((action) => `<button type="button" class="${action.status === 'rejected' ? 'danger' : ''}" data-request-status="${escapeHtml(key)}" data-status="${action.status}">${escapeHtml(action.label)}</button>`).join('')}
      </div>
      <p class="admin-request-safe-note">이 화면에서는 답변 · 메모 · 상태만 저장합니다. 실제 데이터 삭제나 Room 연결 해제는 실행하지 않습니다.</p>
    </article>`;
}

function renderList() {
  const visible = filteredRows();
  const label = SEGMENTS.find((item) => item.key === currentSegment)?.label || '전체';
  if (!visible.length) {
    return `
      <p class="admin-request-visible-note">${escapeHtml(label)} · 현재 조건에 맞는 요청이 없습니다.</p>
      ${renderEmptyState('요청 없음', '필터나 검색어를 바꾸면 다른 요청을 볼 수 있습니다.', '🛡️')}`;
  }

  return `
    <p class="admin-request-visible-note">${escapeHtml(label)} · 현재 조건 ${visible.length}건 표시</p>
    <div class="admin-request-list">
      ${visible.map(renderRequestCard).join('')}
    </div>`;
}

function findRowByKey(key) {
  return rows.find((row) => requestKey(row) === key);
}

function readEditorValue(root, selector) {
  return root.querySelector(selector)?.value || '';
}

function auditPath(database) {
  return database.ref('adminAuditLogs').push().key;
}

async function saveRequest(root, key, nextStatus = null) {
  const row = findRowByKey(key);
  if (!row) {
    window.alert('요청 정보를 찾을 수 없습니다.');
    return;
  }

  const action = nextStatus ? ACTIONS.find((item) => item.status === nextStatus) : null;
  if (action && !window.confirm(action.confirm)) return;

  const database = getAdminDatabase();
  const state = getState();
  const adminMessage = readEditorValue(root, `[data-request-admin-message="${CSS.escape(key)}"]`).trim();
  const internalMemo = readEditorValue(root, `[data-request-internal-memo="${CSS.escape(key)}"]`).trim();
  const updates = {};
  const now = serverTimestamp();
  const requestPath = `dataDeleteRequests/${row.ownerUid}/${row.id}`;
  const notePath = `dataDeleteRequestAdminNotes/${row.ownerUid}/${row.id}`;

  updates[`${requestPath}/adminMessage`] = adminMessage;
  updates[`${requestPath}/updatedAt`] = now;
  updates[`${requestPath}/reviewedByUid`] = state.user?.uid || '';
  updates[`${requestPath}/reviewedByEmail`] = state.user?.email || '';

  if (nextStatus) {
    updates[`${requestPath}/status`] = nextStatus;
    updates[`${requestPath}/reviewedAt`] = now;
  }

  updates[notePath] = {
    adminMessage,
    internalMemo,
    updatedAt: now,
    updatedByUid: state.user?.uid || '',
    updatedByEmail: state.user?.email || ''
  };

  const logKey = auditPath(database);
  updates[`adminAuditLogs/${logKey}`] = {
    action: nextStatus ? `request_status_${nextStatus}` : 'request_memo_saved',
    actionLabel: nextStatus ? `요청 ${statusLabel(nextStatus)}` : '관리자 메모 저장',
    target: 'dataDeleteRequest',
    targetType: row.requestType,
    targetLabel: typeLabel(row),
    requestId: row.id,
    ownerUid: row.ownerUid,
    roomCode: row.roomCode || '',
    requestedByEmail: row.requestedByEmail || row.email || '',
    adminUid: state.user?.uid || '',
    adminEmail: state.user?.email || '',
    statusBefore: row.status || 'pending',
    statusAfter: nextStatus || row.status || 'pending',
    createdAt: now
  };

  await database.ref().update(updates);
  window.alert(nextStatus ? '요청 상태를 저장했습니다.' : '관리자 메모를 저장했습니다.');
  await loadRequests();
  root.innerHTML = renderPage();
  bindEvents(root);
}

function renderPage() {
  return `
    <section class="module-view" aria-labelledby="requestsHeading">
      <div class="foundation-notice">
        <div><span class="notice-icon" aria-hidden="true">🛡️</span></div>
        <div>
          <h2 id="requestsHeading">데이터 요청 관리</h2>
          <p>삭제 요청을 계정 삭제, Room 연결 해제, Room 전체 삭제로 나누어 확인합니다. 현재 화면은 답변 · 메모 · 상태 저장까지만 제공합니다.</p>
        </div>
      </div>

      ${renderStats()}

      <article class="panel">
        <div class="panel-header admin-request-panel-header">
          <div>
            <h2>데이터 요청 관리</h2>
            <p>요청 유형을 먼저 고르고, 상태와 검색으로 필요한 요청만 좁혀 볼 수 있습니다.</p>
          </div>
          <div class="admin-request-tools">
            <select class="admin-request-filter" data-request-status-filter>
              <option value="open" ${currentStatusFilter === 'open' ? 'selected' : ''}>처리 필요</option>
              <option value="all" ${currentStatusFilter === 'all' ? 'selected' : ''}>모든 상태</option>
              <option value="closed" ${currentStatusFilter === 'closed' ? 'selected' : ''}>닫힌 요청</option>
            </select>
            <input class="admin-user-search" type="search" placeholder="요청 검색" value="${escapeHtml(currentSearch)}" data-request-search>
          </div>
        </div>
        ${renderSegments()}
        ${renderGuide()}
        <div data-request-list-zone>${renderList()}</div>
      </article>
    </section>`;
}

export async function render() {
  await loadRequests();
  return renderPage();
}

export function afterRender(root) {
  bindEvents(root);
}

function bindEvents(root) {
  root.querySelectorAll('[data-request-segment]').forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => {
      currentSegment = button.dataset.requestSegment || 'all';
      root.innerHTML = renderPage();
      bindEvents(root);
    });
  });

  const statusFilter = root.querySelector('[data-request-status-filter]');
  if (statusFilter && !statusFilter.dataset.bound) {
    statusFilter.dataset.bound = '1';
    statusFilter.addEventListener('change', (event) => {
      currentStatusFilter = event.target.value || 'open';
      root.innerHTML = renderPage();
      bindEvents(root);
    });
  }

  const searchInput = root.querySelector('[data-request-search]');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = '1';
    searchInput.addEventListener('input', (event) => {
      currentSearch = String(event.target.value || '').trim().toLowerCase();
      const zone = root.querySelector('[data-request-list-zone]');
      if (zone) zone.innerHTML = renderList();
      bindEvents(root);
    });
  }

  root.querySelectorAll('[data-request-toggle]').forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => {
      const key = button.dataset.requestToggle || '';
      if (openDetails.has(key)) openDetails.delete(key);
      else openDetails.add(key);
      root.innerHTML = renderPage();
      bindEvents(root);
    });
  });

  root.querySelectorAll('[data-request-save]').forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => saveRequest(root, button.dataset.requestSave || ''));
  });

  root.querySelectorAll('[data-request-status]').forEach((button) => {
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => saveRequest(root, button.dataset.requestStatus || '', button.dataset.status || ''));
  });

  root.dataset.adminCacheKey = CACHE_KEY;
}
