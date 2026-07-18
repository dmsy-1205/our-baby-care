import { getAdminDatabase } from '../admin-api.js?v=step6-2-13-6-admin-data-requests-actions-20260718';
import { getState } from '../admin-state.js?v=step6-2-13-6-admin-data-requests-actions-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=step6-2-13-6-admin-data-requests-actions-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=step6-2-13-6-admin-data-requests-actions-20260718';

const OPEN_STATUSES = new Set(['pending', 'reviewing', 'approved', 'hold', 'scheduled', 'processing', 'failed']);
const CLOSED_STATUSES = new Set(['completed', 'rejected', 'canceled']);
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
const ACTION_STATUSES = [
  ['reviewing', '검토 중'],
  ['hold', '보류'],
  ['approved', '승인'],
  ['rejected', '거절']
];
const REQUEST_TYPE_LABELS = {
  account: '내 계정 및 개인 정보 삭제',
  leave_room: '현재 Room 연결 해제',
  delete_room: 'Room 전체 데이터 삭제'
};
const SEGMENTS = [
  ['account', '계정 삭제'],
  ['leave_room', 'Room 연결 해제'],
  ['delete_room', 'Room 전체 삭제'],
  ['all', '전체']
];

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

function latestNumber(...values) {
  return values
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)[0] || 0;
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

function countForSegment(rows, segment) {
  if (segment === 'all') return rows.length;
  return rows.filter((row) => row.requestType === segment).length;
}

function requestPath(uid, requestId) {
  return `dataDeleteRequests/${uid}/${requestId}`;
}

function notePath(uid, requestId) {
  return `dataDeleteRequestAdminNotes/${uid}/${requestId}`;
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
        reviewedAt: latestNumber(item.reviewedAt),
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
  const deleteRoom = rows.filter((row) => row.requestType === 'delete_room' || row.partnerConsentRequired).length;
  return `
    <div class="metric-grid admin-request-metrics">
      <article class="metric-card"><span>처리 필요</span><strong>${open}</strong><small>열린 상태 요청</small></article>
      <article class="metric-card"><span>계정 삭제</span><strong>${account}</strong><small>개인 정보 중심</small></article>
      <article class="metric-card"><span>Room 연결 해제</span><strong>${leaveRoom}</strong><small>공동 기록 보존</small></article>
      <article class="metric-card"><span>Room 전체 삭제</span><strong>${deleteRoom}</strong><small>추가 검토 필요</small></article>
    </div>`;
}

function renderSegmentTabs(rows) {
  return `
    <div class="admin-request-segments" role="tablist" aria-label="데이터 요청 유형">
      ${SEGMENTS.map(([value, label], index) => `
        <button type="button" class="admin-request-segment ${index === 3 ? 'is-active' : ''}" data-request-segment="${value}" aria-selected="${index === 3 ? 'true' : 'false'}">
          <span>${escapeHtml(label)}</span>
          <strong>${countForSegment(rows, value)}</strong>
        </button>`).join('')}
    </div>`;
}

function renderRequestGuide() {
  return `
    <div class="admin-request-guide">
      <article><strong>계정 삭제</strong><p>로그인 계정과 개인 프로필 삭제 요청입니다. 공동 Room 기록은 별도 검토 대상입니다.</p></article>
      <article><strong>Room 연결 해제</strong><p>요청자의 Room 연결만 끊고, 기존 공동 기록은 보존하는 유형입니다.</p></article>
      <article><strong>Room 전체 삭제</strong><p>채팅·기록·사진 등 공동 데이터 삭제 요청입니다. 상대방 권리와 보관 필요성을 함께 확인해야 합니다.</p></article>
    </div>`;
}

function renderActions(row) {
  const disabled = row.status === 'canceled' || row.status === 'completed';
  return `
    <div class="admin-request-edit">
      <label>
        <span>사용자에게 전달할 답변</span>
        <textarea data-admin-request-message data-owner-uid="${escapeHtml(row.ownerUid)}" data-request-id="${escapeHtml(row.id)}" rows="3" ${disabled ? 'disabled' : ''}>${escapeHtml(row.adminMessage || '')}</textarea>
      </label>
      <label>
        <span>관리자 내부 메모</span>
        <textarea data-admin-request-memo data-owner-uid="${escapeHtml(row.ownerUid)}" data-request-id="${escapeHtml(row.id)}" rows="2" placeholder="사용자에게 보이지 않습니다.">${escapeHtml(row.memo || '')}</textarea>
      </label>
      <div class="admin-request-action-row">
        <button type="button" class="admin-request-save-memo" data-admin-request-save-memo data-owner-uid="${escapeHtml(row.ownerUid)}" data-request-id="${escapeHtml(row.id)}">메모 저장</button>
        ${ACTION_STATUSES.map(([status, label]) => `
          <button type="button" class="admin-request-action ${row.status === status ? `is-selected ${statusClass(status)}` : ''}" data-admin-request-status-action="${status}" data-owner-uid="${escapeHtml(row.ownerUid)}" data-request-id="${escapeHtml(row.id)}" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>`).join('')}
      </div>
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
    ? '<span class="admin-request-warning">공동 Room 삭제 검토</span>'
    : '';

  return `
    <article class="admin-request-card" data-admin-request-row data-status="${escapeHtml(row.status)}" data-type="${escapeHtml(row.requestType)}" data-open="${OPEN_STATUSES.has(row.status) ? 'true' : 'false'}" data-closed="${CLOSED_STATUSES.has(row.status) ? 'true' : 'false'}" data-search="${escapeHtml(searchable)}">
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
        ${row.reviewedByUid ? `<span>검토 ${escapeHtml(shortUid(row.reviewedByUid))}</span>` : ''}
        ${sharedNotice}
      </div>
      <div class="admin-request-body">
        <div><strong>요청 사유</strong><p>${escapeHtml(row.reason || '-')}</p></div>
        <div><strong>현재 운영자 답변</strong><p>${escapeHtml(row.adminMessage || '아직 운영자 답변이 없습니다.')}</p></div>
      </div>
      ${renderActions(row)}
    </article>`;
}

function renderRows(rows) {
  if (!rows.length) {
    return renderEmptyState('표시할 데이터 요청이 없습니다', '아직 사용자가 보낸 삭제 또는 데이터 처리 요청이 없습니다.');
  }
  return `<div id="adminRequestList" class="admin-request-list">${rows.map(renderRequestCard).join('')}</div>`;
}

export async function render() {
  try {
    currentRows = await loadRequests();
    return `
      <section class="module-view" aria-labelledby="adminRequestsHeading">
        <div class="foundation-notice">
          <div><span class="notice-icon" aria-hidden="true">🛡️</span></div>
          <div>
            <h2 id="adminRequestsHeading">데이터 요청 처리</h2>
            <p>삭제 요청을 유형별로 확인하고, 사용자 답변·관리자 메모·검토 상태를 저장합니다. 실제 데이터 삭제 실행은 별도 단계로 분리합니다.</p>
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
              <select id="adminRequestStatusFilter" class="admin-request-filter" aria-label="요청 상태 필터">
                <option value="any">모든 상태</option>
                <option value="open" selected>처리 필요</option>
                <option value="pending">접수됨</option>
                <option value="reviewing">검토 중</option>
                <option value="approved">승인</option>
                <option value="hold">보류</option>
                <option value="rejected">거절</option>
                <option value="completed">완료</option>
                <option value="closed">닫힌 요청</option>
              </select>
              <input id="adminRequestSearch" class="admin-user-search" type="search" placeholder="요청 검색">
            </div>
          </div>
          ${renderSegmentTabs(currentRows)}
          ${renderRequestGuide()}
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

function setButtonBusy(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.classList.toggle('is-busy', busy);
}

function getTextarea(selector, uid, requestId) {
  return [...document.querySelectorAll(selector)].find((element) => (
    element.dataset.ownerUid === uid && element.dataset.requestId === requestId
  ));
}

async function saveMemo(uid, requestId, button) {
  const database = getAdminDatabase();
  const state = getState();
  const memo = (getTextarea('[data-admin-request-memo]', uid, requestId)?.value || '').trim();
  setButtonBusy(button, true);
  try {
    const ref = database.ref(notePath(uid, requestId));
    if (memo) {
      await ref.set({ memo, updatedByUid: state.user?.uid || '', updatedAt: firebase.database.ServerValue.TIMESTAMP });
    } else {
      await ref.remove();
    }
    window.alert(memo ? '관리자 메모를 저장했습니다.' : '관리자 메모를 비웠습니다.');
  } catch (error) {
    console.error('[Admin Requests] memo save failed', error);
    window.alert(`관리자 메모 저장에 실패했습니다.\n${error.message || error}`);
  } finally {
    setButtonBusy(button, false);
  }
}

async function updateRequestStatus(uid, requestId, status, button) {
  const database = getAdminDatabase();
  const state = getState();
  const message = (getTextarea('[data-admin-request-message]', uid, requestId)?.value || '').trim();
  const memo = (getTextarea('[data-admin-request-memo]', uid, requestId)?.value || '').trim();
  const label = statusLabel(status);

  if (!message) {
    window.alert('사용자에게 전달할 답변을 먼저 작성해 주세요.');
    return;
  }
  if (!window.confirm(`이 요청을 '${label}' 상태로 변경할까요?`)) return;

  setButtonBusy(button, true);
  try {
    const updates = {};
    updates[`${requestPath(uid, requestId)}/status`] = status;
    updates[`${requestPath(uid, requestId)}/adminMessage`] = message;
    updates[`${requestPath(uid, requestId)}/reviewedByUid`] = state.user?.uid || '';
    updates[`${requestPath(uid, requestId)}/reviewedAt`] = firebase.database.ServerValue.TIMESTAMP;
    updates[`${requestPath(uid, requestId)}/updatedAt`] = firebase.database.ServerValue.TIMESTAMP;
    updates[notePath(uid, requestId)] = memo
      ? { memo, updatedByUid: state.user?.uid || '', updatedAt: firebase.database.ServerValue.TIMESTAMP }
      : null;
    await database.ref().update(updates);
    window.alert(`요청을 '${label}' 상태로 저장했습니다.`);
    const outlet = document.getElementById('adminOutlet');
    if (outlet) {
      outlet.innerHTML = await render();
      afterRender();
    }
  } catch (error) {
    console.error('[Admin Requests] status update failed', error);
    window.alert(`요청 상태 저장에 실패했습니다.\n${error.message || error}`);
  } finally {
    setButtonBusy(button, false);
  }
}

function applyFilter() {
  const search = document.getElementById('adminRequestSearch');
  const statusFilter = document.getElementById('adminRequestStatusFilter');
  const query = (search?.value || '').trim().toLowerCase();
  const statusMode = statusFilter?.value || 'open';
  document.querySelectorAll('[data-admin-request-row]').forEach((row) => {
    const status = row.dataset.status || 'pending';
    const type = row.dataset.type || '';
    const matchesQuery = !query || String(row.dataset.search || '').includes(query);
    const matchesSegment = currentSegment === 'all' || type === currentSegment;
    const matchesStatus =
      statusMode === 'any' ||
      (statusMode === 'open' && row.dataset.open === 'true') ||
      (statusMode === 'closed' && row.dataset.closed === 'true') ||
      status === statusMode;
    row.hidden = !(matchesQuery && matchesSegment && matchesStatus);
  });
}

export function afterRender() {
  const search = document.getElementById('adminRequestSearch');
  const statusFilter = document.getElementById('adminRequestStatusFilter');
  const segmentButtons = [...document.querySelectorAll('[data-request-segment]')];

  segmentButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentSegment = button.dataset.requestSegment || 'all';
      segmentButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      applyFilter();
    });
  });
  search?.addEventListener('input', applyFilter);
  statusFilter?.addEventListener('change', applyFilter);
  document.querySelectorAll('[data-admin-request-save-memo]').forEach((button) => {
    button.addEventListener('click', () => saveMemo(button.dataset.ownerUid || '', button.dataset.requestId || '', button));
  });
  document.querySelectorAll('[data-admin-request-status-action]').forEach((button) => {
    button.addEventListener('click', () => updateRequestStatus(button.dataset.ownerUid || '', button.dataset.requestId || '', button.dataset.adminRequestStatusAction || 'reviewing', button));
  });
  applyFilter();
}
