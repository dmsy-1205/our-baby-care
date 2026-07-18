import { getAdminDatabase } from '../admin-api.js?v=step6-2-13-4-admin-data-requests-readonly-20260718';
import { escapeHtml, formatDateTime } from '../admin-utils.js?v=step6-2-13-4-admin-data-requests-readonly-20260718';
import { renderEmptyState } from '../components/empty-state.js?v=step6-2-13-4-admin-data-requests-readonly-20260718';

const OPEN_STATUSES = new Set(['pending', 'reviewing', 'approved', 'hold', 'scheduled', 'processing', 'failed']);
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
  account: '내 계정 및 개인 정보 삭제',
  leave_room: '현재 Room 연결 해제',
  delete_room: 'Room 전체 데이터 삭제'
};

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
  const completed = rows.filter((row) => row.status === 'completed').length;
  const roomDelete = rows.filter((row) => row.requestType === 'delete_room' || row.partnerConsentRequired).length;
  return `
    <div class="metric-grid admin-request-metrics">
      <article class="metric-card"><span>전체 요청</span><strong>${rows.length}</strong><small>dataDeleteRequests 기준</small></article>
      <article class="metric-card"><span>처리 필요</span><strong>${open}</strong><small>열린 상태 요청</small></article>
      <article class="metric-card"><span>Room 전체 삭제</span><strong>${roomDelete}</strong><small>상대 확인 필요 가능</small></article>
      <article class="metric-card"><span>완료</span><strong>${completed}</strong><small>처리 완료 요청</small></article>
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
  const memo = row.memo
    ? `<div><strong>관리자 내부 메모</strong><p>${escapeHtml(row.memo)}</p></div>`
    : '';

  return `
    <article class="admin-request-card" data-admin-request-row data-status="${escapeHtml(row.status)}" data-search="${escapeHtml(searchable)}">
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
        ${memo}
      </div>
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
    const rows = await loadRequests();
    return `
      <section class="module-view" aria-labelledby="adminRequestsHeading">
        <div class="foundation-notice">
          <div><span class="notice-icon" aria-hidden="true">🛡️</span></div>
          <div>
            <h2 id="adminRequestsHeading">데이터 요청 읽기 전용</h2>
            <p>사용자가 보낸 계정 삭제, Room 연결 해제, Room 전체 삭제 요청을 조회합니다. 이번 단계에서는 승인·거절·메모 저장 기능을 제공하지 않습니다.</p>
          </div>
        </div>
        ${renderStats(rows)}
        <article class="panel">
          <div class="panel-header admin-request-panel-header">
            <div>
              <h2>요청 목록</h2>
              <p>상태, 이메일, UID, Room 코드, 요청 사유로 찾을 수 있습니다.</p>
            </div>
            <div class="admin-request-tools">
              <select id="adminRequestFilter" class="admin-request-filter" aria-label="요청 상태 필터">
                <option value="open">처리 필요</option>
                <option value="all">전체</option>
                <option value="completed">완료</option>
                <option value="closed">닫힌 요청</option>
              </select>
              <input id="adminRequestSearch" class="admin-user-search" type="search" placeholder="요청 검색">
            </div>
          </div>
          ${renderRows(rows)}
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

export function afterRender() {
  const search = document.getElementById('adminRequestSearch');
  const filter = document.getElementById('adminRequestFilter');
  const applyFilter = () => {
    const query = (search?.value || '').trim().toLowerCase();
    const mode = filter?.value || 'open';
    document.querySelectorAll('[data-admin-request-row]').forEach((row) => {
      const status = row.dataset.status || 'pending';
      const matchesQuery = !query || String(row.dataset.search || '').includes(query);
      const matchesMode =
        mode === 'all' ||
        (mode === 'open' && OPEN_STATUSES.has(status)) ||
        (mode === 'completed' && status === 'completed') ||
        (mode === 'closed' && !OPEN_STATUSES.has(status));
      row.hidden = !(matchesQuery && matchesMode);
    });
  };
  search?.addEventListener('input', applyFilter);
  filter?.addEventListener('change', applyFilter);
  applyFilter();
}
