import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a12-action-guard-20260718';
import { getState } from '../admin-state.js';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a12-action-guard-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a12-action-guard-20260718';

const OPEN_STATUSES = new Set(['pending', 'reviewing', 'approved', 'hold', 'scheduled', 'processing', 'failed']);
const CLOSED_STATUSES = new Set(['rejected', 'canceled', 'cancelled', 'completed', 'closed']);

const STATUS_LABELS = {
  pending: '접수됨',
  reviewing: '검토 중',
  approved: '승인',
  hold: '보류',
  rejected: '거절',
  canceled: '사용자 취소',
  cancelled: '사용자 취소',
  scheduled: '삭제 예정',
  processing: '처리 중',
  completed: '처리 완료',
  failed: '처리 실패',
  closed: '종료'
};

const REQUEST_TYPE_LABELS = {
  account: '계정 삭제',
  leave_room: 'Room 연결 해제',
  delete_room: 'Room 전체 삭제'
};

const REQUEST_TYPE_DESCRIPTIONS = {
  account: '로그인 계정과 개인 프로필 삭제 요청입니다. 공동 Room 기록은 별도 검토 대상입니다.',
  leave_room: '요청자의 Room 연결만 끊고, 기존 공동 기록은 보존하는 유형입니다.',
  delete_room: '채팅·기록·사진 등 공동 데이터를 삭제하는 요청입니다. 상대방 권리와 보관 필요성을 함께 확인해야 합니다.'
};

const ACTION_STATUSES = {
  reviewing: { label: '검토 중', confirm: '이 요청을 검토 중 상태로 바꿀까요?' },
  hold: { label: '보류', confirm: '이 요청을 보류 상태로 바꿀까요?' },
  approved: { label: '승인', confirm: '이 요청을 승인 상태로 바꿀까요?\n\n이 화면에서는 실제 삭제나 Room 연결 해제를 실행하지 않습니다.' },
  rejected: { label: '거절', confirm: '이 요청을 거절 상태로 바꿀까요?' }
};

const AUDIT_ACTION_LABELS = {
  reviewing: '요청 검토 중',
  hold: '요청 보류',
  approved: '요청 승인',
  rejected: '요청 거절',
  memo: '관리자 메모 저장'
};

const SEGMENTS = [
  { key: 'account', label: '계정 삭제' },
  { key: 'leave_room', label: 'Room 연결 해제' },
  { key: 'delete_room', label: 'Room 전체 삭제' },
  { key: 'all', label: '전체' }
];

let currentRows = [];
let currentSegment = 'all';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function shortUid(uid) {
  const text = String(uid || '');
  if (!text) return '-';
  if (text.length <= 13) return text;
  return `${text.slice(0, 6)}…${text.slice(-5)}`;
}

function requestTypeLabel(row) {
  const type = row.requestType || row.type || '';
  return REQUEST_TYPE_LABELS[type] || row.requestTypeLabel || type || '데이터 요청';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '상태 없음';
}

function statusClass(status) {
  if (CLOSED_STATUSES.has(status)) return 'muted';
  if (status === 'approved') return 'ok';
  if (status === 'hold') return 'warn';
  if (status === 'rejected' || status === 'failed') return 'danger';
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
  const firebaseSdk = window.firebase;
  return firebaseSdk?.database?.ServerValue?.TIMESTAMP || Date.now();
}

function isClosedStatus(status) {
  return CLOSED_STATUSES.has(status);
}

function requestGuard(row) {
  if (row.requestType === 'delete_room') {
    return {
      label: '공동 Room 검토 필요',
      tone: 'danger',
      items: [
        '상대방 권리와 공동 데이터 보관 필요성을 확인합니다.',
        '사진·채팅·기록 삭제 범위를 별도로 점검합니다.',
        '실제 삭제는 이 화면에서 실행하지 않습니다.'
      ]
    };
  }

  if (row.requestType === 'leave_room') {
    return {
      label: '공동 기록 보존',
      tone: 'info',
      items: [
        '요청자의 Room 연결만 끊는 요청인지 확인합니다.',
        '기존 공동 기록은 삭제하지 않고 보존합니다.',
        '상대방의 Room 접근권이 유지되는지 확인합니다.'
      ]
    };
  }

  if (row.requestType === 'account') {
    return {
      label: '개인 정보 중심',
      tone: 'warning',
      items: [
        '요청자 본인의 계정 삭제 요청인지 확인합니다.',
        '공동 Room 기록은 별도 검토 대상입니다.',
        '실제 계정 삭제는 별도 승인 단계에서만 진행합니다.'
      ]
    };
  }

  return {
    label: '추가 확인 필요',
    tone: 'info',
    items: ['요청 유형과 삭제 범위를 먼저 확인합니다.']
  };
}

function defaultAdminMessage(status, row) {
  if (status === 'reviewing') return '요청을 검토 중입니다. 확인 후 다시 안내드리겠습니다.';
  if (status === 'hold') return '요청 확인을 위해 보류되었습니다. 추가 확인 후 다시 안내드리겠습니다.';
  if (status === 'approved') return '요청이 승인되었습니다. 실제 처리 전 필요한 확인을 진행하겠습니다.';
  if (status === 'rejected') return '요청을 처리할 수 없어 거절되었습니다. 필요할 경우 새 요청을 남겨주세요.';
  if (row.status === 'canceled' || row.status === 'cancelled') return '사용자가 요청을 취소했습니다.';
  return row.adminMessage || '요청이 접수되었습니다. 운영자가 내용을 확인할 예정입니다.';
}

async function loadRequests() {
  const db = getAdminDatabase();
  const snapshot = await db.ref('dataDeleteRequests').once('value');
  const root = asObject(snapshot.val());
  const rows = [];

  Object.entries(root).forEach(([ownerUid, requests]) => {
    Object.entries(asObject(requests)).forEach(([id, request]) => {
      const row = {
        id,
        ownerUid,
        ...asObject(request)
      };
      row.requestType = row.requestType || row.type || 'account';
      row.status = row.status || 'pending';
      row.requesterEmail = row.requesterEmail || row.email || row.userEmail || '';
      row.roomCode = row.roomCode || row.roomId || row.room || row.activeRoom || '';
      row.reason = row.reason || row.requestReason || '';
      row.adminMessage = row.adminMessage || row.operatorMessage || '';
      row.internalMemo = row.internalMemo || row.adminMemo || '';
      row.latestAt = latestNumber(row.updatedAt, row.createdAt, row.requestedAt, row.submittedAt);
      rows.push(row);
    });
  });

  rows.sort((a, b) => b.latestAt - a.latestAt);
  return rows;
}

async function pushAuditUpdate(row, status, extra = {}) {
  const state = getState();
  const db = getAdminDatabase();
  const log = {
    action: AUDIT_ACTION_LABELS[status] || '요청 상태 변경',
    requestId: row.id,
    ownerUid: row.ownerUid,
    requestType: row.requestType,
    roomCode: row.roomCode || '',
    status,
    adminUid: state.user?.uid || '',
    adminEmail: state.user?.email || '',
    createdAt: serverTimestamp(),
    ...extra
  };

  await db.ref('adminAuditLogs').push(log);
}

function getVisibleRows() {
  const statusFilter = document.getElementById('requestStatusFilter')?.value || 'all';
  const query = (document.getElementById('requestSearch')?.value || '').trim().toLowerCase();

  return currentRows.filter((row) => {
    const segmentOk = currentSegment === 'all' || row.requestType === currentSegment;
    const statusOk = statusFilter === 'all'
      || (statusFilter === 'open' && OPEN_STATUSES.has(row.status))
      || (statusFilter === 'closed' && isClosedStatus(row.status))
      || row.status === statusFilter;
    const haystack = [
      row.requesterEmail,
      row.ownerUid,
      row.roomCode,
      requestTypeLabel(row),
      statusLabel(row.status),
      row.reason,
      row.adminMessage,
      row.internalMemo
    ].join(' ').toLowerCase();
    const queryOk = !query || haystack.includes(query);
    return segmentOk && statusOk && queryOk;
  });
}

function segmentCount(segmentKey) {
  if (segmentKey === 'all') return currentRows.length;
  return currentRows.filter((row) => row.requestType === segmentKey).length;
}

function openCount() {
  return currentRows.filter((row) => OPEN_STATUSES.has(row.status)).length;
}

function renderStats() {
  const typeCount = (type) => currentRows.filter((row) => row.requestType === type).length;
  return `
    <section class="admin-grid admin-grid-four">
      <article class="admin-stat-card"><span>처리 필요</span><strong>${openCount()}</strong><small>열린 상태 요청</small></article>
      <article class="admin-stat-card"><span>계정 삭제</span><strong>${typeCount('account')}</strong><small>개인 정보 중심</small></article>
      <article class="admin-stat-card"><span>Room 연결 해제</span><strong>${typeCount('leave_room')}</strong><small>공동 기록 보존</small></article>
      <article class="admin-stat-card"><span>Room 전체 삭제</span><strong>${typeCount('delete_room')}</strong><small>추가 검토 필요</small></article>
    </section>`;
}

function renderSegments() {
  return `<div class="admin-request-segments">
    ${SEGMENTS.map((segment) => `
      <button class="admin-request-segment ${currentSegment === segment.key ? 'active' : ''}" type="button" data-request-segment="${segment.key}">
        ${escapeHtml(segment.label)} <span>${segmentCount(segment.key)}</span>
      </button>`).join('')}
  </div>`;
}

function renderSegmentGuide() {
  return `<div class="admin-request-guide-grid">
    ${['account', 'leave_room', 'delete_room'].map((type) => `
      <article class="admin-request-guide-card">
        <strong>${escapeHtml(REQUEST_TYPE_LABELS[type])}</strong>
        <p>${escapeHtml(REQUEST_TYPE_DESCRIPTIONS[type])}</p>
      </article>`).join('')}
  </div>`;
}

function renderGuard(row) {
  const guard = requestGuard(row);
  return `
    <div class="request-guard is-${escapeHtml(guard.tone)}">
      <span>${escapeHtml(guard.label)}</span>
      <ul>${guard.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>`;
}

function renderStatusButtons(row, key) {
  if (isClosedStatus(row.status)) {
    return `
      <div class="admin-note-line">
        <strong>${escapeHtml(statusLabel(row.status))}</strong>
        <span>닫힌 요청입니다. 기록 확인과 내부 메모 저장만 가능합니다.</span>
      </div>`;
  }

  return Object.entries(ACTION_STATUSES).map(([status, action]) => `
    <button class="admin-request-action ${status === 'rejected' ? 'danger' : ''}" type="button" data-request-status="${escapeHtml(status)}" data-request-key="${escapeHtml(key)}">
      ${escapeHtml(action.label)}
    </button>`).join('');
}

function renderRequestCard(row) {
  const closed = isClosedStatus(row.status);
  const key = pathKey(row);
  const adminMessage = row.adminMessage || defaultAdminMessage(row.status, row);
  const internalMemo = row.internalMemo || '';

  return `
    <article class="admin-request-card is-collapsed" data-request-card="${escapeHtml(key)}">
      <div class="admin-request-head">
        <div>
          <strong>${escapeHtml(requestTypeLabel(row))}</strong>
          <p>${escapeHtml(row.requesterEmail || row.ownerUid || '요청자 정보 없음')}</p>
        </div>
        <div class="admin-list-card-actions">
          <span class="admin-request-status ${statusClass(row.status)}">${escapeHtml(statusLabel(row.status))}</span>
          <button class="admin-request-detail-toggle" type="button" data-request-toggle="${escapeHtml(key)}">상세 보기</button>
        </div>
      </div>

      <div class="admin-request-meta">
        <span>Room ${escapeHtml(row.roomCode || '미연결')}</span>
        <span>UID ${escapeHtml(shortUid(row.ownerUid))}</span>
        <span>접수 ${escapeHtml(formatDateTime(row.createdAt || row.requestedAt || row.submittedAt))}</span>
        <span>갱신 ${escapeHtml(formatDateTime(row.updatedAt || row.latestAt))}</span>
      </div>

      <div class="admin-request-body">
        <div><strong>요청 사유</strong><p>${escapeHtml(row.reason || '작성된 사유가 없습니다.')}</p></div>
        <div><strong>운영자 답변</strong><p>${escapeHtml(adminMessage)}</p></div>
      </div>

      <div class="admin-request-detail">
        ${renderGuard(row)}
        <div class="admin-request-editor">
          <label>
            <span>사용자에게 전달할 답변</span>
            <textarea data-admin-message="${escapeHtml(key)}" ${closed ? 'readonly' : ''}>${escapeHtml(adminMessage)}</textarea>
          </label>
          <label>
            <span>관리자 내부 메모</span>
            <textarea data-internal-memo="${escapeHtml(key)}">${escapeHtml(internalMemo)}</textarea>
          </label>
        </div>
        <div class="admin-request-actions ${closed ? 'is-locked' : ''}">
          <button type="button" data-request-memo="${escapeHtml(key)}">관리자 메모 저장</button>
          ${renderStatusButtons(row, key)}
        </div>
        <p class="admin-request-safe-note">이 화면에서는 답변·메모·상태만 저장합니다. 실제 데이터 삭제나 Room 연결 해제는 실행하지 않습니다.</p>
      </div>
    </article>`;
}

function renderRows() {
  const rows = getVisibleRows();
  if (!rows.length) {
    return renderEmptyState('표시할 요청이 없습니다.', '유형, 상태, 검색어를 바꾸면 다른 요청을 확인할 수 있습니다.');
  }

  const segmentLabel = SEGMENTS.find((segment) => segment.key === currentSegment)?.label || '전체';
  return `
    <div class="admin-request-visible-note">${escapeHtml(segmentLabel)} · 현재 조건 ${rows.length}건 표시</div>
    <div class="admin-request-list">${rows.map(renderRequestCard).join('')}</div>`;
}

export async function render() {
  try {
    currentRows = await loadRequests();
  } catch (error) {
    console.error('[Admin Requests] load failed', error);
    return `<section class="admin-card">${renderEmptyState('데이터 요청을 불러오지 못했습니다.', error.message)}</section>`;
  }

  return `
    ${renderStats()}
    <section class="admin-card">
      <div class="admin-section-head admin-request-panel-header">
        <div>
          <h2>데이터 요청 관리</h2>
          <p>요청 유형을 먼저 고르고, 상태와 검색으로 필요한 요청만 좁혀 볼 수 있습니다.</p>
        </div>
        <div class="admin-request-tools">
          <select id="requestStatusFilter" class="admin-request-filter">
            <option value="all">모든 상태</option>
            <option value="open">처리 필요</option>
            <option value="closed">닫힌 요청</option>
            <option value="pending">접수됨</option>
            <option value="reviewing">검토 중</option>
            <option value="hold">보류</option>
            <option value="approved">승인</option>
            <option value="rejected">거절</option>
            <option value="canceled">사용자 취소</option>
          </select>
          <input id="requestSearch" class="admin-user-search" type="search" placeholder="요청 검색" autocomplete="off">
        </div>
      </div>
      ${renderSegments()}
      ${renderSegmentGuide()}
      <div id="requestRows">${renderRows()}</div>
    </section>`;
}

function findRow(key) {
  return currentRows.find((row) => pathKey(row) === key);
}

async function saveMemo(row, button) {
  const key = pathKey(row);
  const adminMessageEl = document.querySelector(`[data-admin-message="${CSS.escape(key)}"]`);
  const internalMemoEl = document.querySelector(`[data-internal-memo="${CSS.escape(key)}"]`);
  const adminMessage = adminMessageEl?.value?.trim() || defaultAdminMessage(row.status, row);
  const internalMemo = internalMemoEl?.value?.trim() || '';
  const state = getState();
  const db = getAdminDatabase();

  button.disabled = true;
  button.textContent = '저장 중';

  await db.ref(`dataDeleteRequests/${row.ownerUid}/${row.id}`).update({
    adminMessage,
    internalMemo,
    updatedAt: serverTimestamp(),
    reviewedByUid: state.user?.uid || null,
    reviewedByEmail: state.user?.email || null
  });

  await db.ref(`dataDeleteRequestAdminNotes/${row.ownerUid}/${row.id}`).update({
    adminMessage,
    internalMemo,
    updatedAt: serverTimestamp(),
    updatedByUid: state.user?.uid || null,
    updatedByEmail: state.user?.email || null
  });

  await pushAuditUpdate(row, 'memo', { status: row.status });
  await refreshRequestsView();
}

async function updateRequestStatus(row, status, button) {
  const action = ACTION_STATUSES[status];
  if (!action || isClosedStatus(row.status)) return;
  if (!window.confirm(action.confirm)) return;

  const key = pathKey(row);
  const adminMessageEl = document.querySelector(`[data-admin-message="${CSS.escape(key)}"]`);
  const internalMemoEl = document.querySelector(`[data-internal-memo="${CSS.escape(key)}"]`);
  const adminMessage = adminMessageEl?.value?.trim() || defaultAdminMessage(status, row);
  const internalMemo = internalMemoEl?.value?.trim() || '';
  const state = getState();
  const db = getAdminDatabase();

  button.disabled = true;
  button.textContent = '저장 중';

  await db.ref(`dataDeleteRequests/${row.ownerUid}/${row.id}`).update({
    status,
    adminMessage,
    internalMemo,
    updatedAt: serverTimestamp(),
    reviewedAt: serverTimestamp(),
    reviewedByUid: state.user?.uid || null,
    reviewedByEmail: state.user?.email || null
  });

  await db.ref(`dataDeleteRequestAdminNotes/${row.ownerUid}/${row.id}`).update({
    status,
    adminMessage,
    internalMemo,
    updatedAt: serverTimestamp(),
    updatedByUid: state.user?.uid || null,
    updatedByEmail: state.user?.email || null
  });

  await pushAuditUpdate(row, status, { previousStatus: row.status });
  await refreshRequestsView();
}

async function refreshRequestsView() {
  currentRows = await loadRequests();
  document.getElementById('requestRows').innerHTML = renderRows();
}

function applyFilter() {
  document.getElementById('requestRows').innerHTML = renderRows();
}

export function afterRender() {
  document.querySelectorAll('[data-request-segment]').forEach((button) => {
    button.addEventListener('click', () => {
      currentSegment = button.dataset.requestSegment || 'all';
      document.querySelectorAll('[data-request-segment]').forEach((item) => {
        item.classList.toggle('active', item === button);
      });
      applyFilter();
    });
  });

  document.getElementById('requestStatusFilter')?.addEventListener('change', applyFilter);
  document.getElementById('requestSearch')?.addEventListener('input', applyFilter);

  document.getElementById('requestRows')?.addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-request-toggle]');
    if (toggle) {
      const key = toggle.dataset.requestToggle;
      const card = document.querySelector(`[data-request-card="${CSS.escape(key)}"]`);
      const willOpen = card?.classList.contains('is-collapsed');
      if (card) card.classList.toggle('is-collapsed', !willOpen);
      toggle.textContent = willOpen ? '상세 접기' : '상세 보기';
      return;
    }

    const memoButton = event.target.closest('[data-request-memo]');
    if (memoButton) {
      const row = findRow(memoButton.dataset.requestMemo);
      if (!row) return;
      await saveMemo(row, memoButton);
      return;
    }

    const statusButton = event.target.closest('[data-request-status]');
    if (statusButton) {
      const row = findRow(statusButton.dataset.requestKey);
      if (!row) return;
      await updateRequestStatus(row, statusButton.dataset.requestStatus, statusButton);
    }
  });
}
