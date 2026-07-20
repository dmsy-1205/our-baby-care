import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a15-1-support-center-20260720';
import { getState } from '../admin-state.js';
import { asObject, escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a15-1-support-center-20260720';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a15-1-support-center-20260720';

const STATUS_LABELS = { received: '접수됨', reviewing: '확인 중', waiting_user: '추가 정보 필요', resolved: '답변 완료', closed: '종료' };
const CATEGORY_LABELS = { usage: '앱 사용 문의', data_error: '데이터 오류', account_room: '계정·Room 문의', report: '신고·안전', suggestion: '기능 제안' };
const STATUS_OPTIONS = Object.entries(STATUS_LABELS);
let tickets = [];
let replies = {};
let notes = {};
let currentStatus = 'open';
let currentSearch = '';
const openTickets = new Set();

function timestamp() { return window.firebase.database.ServerValue.TIMESTAMP; }
function keyOf(row) { return `${row.ownerUid}__${row.id}`; }
function isOpen(row) { return !['resolved', 'closed'].includes(row.status); }
function statusClass(status) { return status === 'resolved' ? 'ok' : status === 'closed' ? 'muted' : status === 'waiting_user' ? 'warn' : 'pending'; }

function flattenTickets(value) {
  const output = [];
  Object.entries(asObject(value)).forEach(([ownerUid, group]) => {
    Object.entries(asObject(group)).forEach(([id, item]) => output.push({ id, ownerUid, ...asObject(item) }));
  });
  return output.sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}

function replyList(row) {
  return Object.values(asObject(asObject(replies[row.ownerUid])[row.id]))
    .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

function matches(row) {
  if (currentStatus === 'open' && !isOpen(row)) return false;
  if (currentStatus === 'closed' && isOpen(row)) return false;
  if (!['all', 'open', 'closed'].includes(currentStatus) && row.status !== currentStatus) return false;
  if (!currentSearch) return true;
  return [row.title, row.message, row.ownerEmail, row.ownerUid, row.roomCode, CATEGORY_LABELS[row.category], STATUS_LABELS[row.status]]
    .join(' ').toLowerCase().includes(currentSearch.toLowerCase());
}

function renderDetail(row) {
  const rowReplies = replyList(row);
  const note = asObject(notes[row.id]);
  return `<div class="admin-support-detail">
    <section class="admin-soft-card"><h4>문의 내용</h4><p>${escapeHtml(row.message || '')}</p></section>
    <div class="admin-meta-row"><span>UID ${escapeHtml(compactId(row.ownerUid))}</span><span>Room ${escapeHtml(row.roomCode || '미연결')}</span><span>접수 ${escapeHtml(formatDateTime(row.createdAt))}</span><span>버전 ${escapeHtml(row.appVersion || '-')}</span></div>
    <section class="admin-support-history"><h4>사용자에게 공개된 답변</h4>${rowReplies.length ? rowReplies.map((reply) => `<div><p>${escapeHtml(reply.message || '')}</p><small>${escapeHtml(formatDateTime(reply.createdAt))} · ${escapeHtml(reply.createdByEmail || '관리자')}</small></div>`).join('') : '<p class="admin-muted">아직 공개 답변이 없습니다.</p>'}</section>
    <label class="admin-field"><span>공개 답변</span><textarea data-public-reply="${escapeHtml(keyOf(row))}" maxlength="2000" placeholder="사용자에게 보일 답변을 작성하세요."></textarea></label>
    <label class="admin-field"><span>내부 메모 (사용자에게 보이지 않음)</span><textarea data-internal-note="${escapeHtml(keyOf(row))}" maxlength="2000" placeholder="운영자 확인 사항을 기록하세요.">${escapeHtml(note.message || '')}</textarea></label>
    <div class="admin-support-actions"><select data-ticket-status="${escapeHtml(keyOf(row))}">${STATUS_OPTIONS.map(([value, label]) => `<option value="${value}" ${row.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="admin-button" type="button" data-save-ticket="${escapeHtml(keyOf(row))}">답변·상태 저장</button></div>
  </div>`;
}

function renderCard(row) {
  const key = keyOf(row);
  const open = openTickets.has(key);
  return `<article class="admin-card admin-support-card"><div class="admin-request-card-head"><div><h3>${escapeHtml(row.title || '문의')}</h3><p>${escapeHtml(row.ownerEmail || row.ownerUid)} · ${escapeHtml(CATEGORY_LABELS[row.category] || row.category || '일반')}</p></div><div class="admin-request-actions"><span class="admin-status-pill ${statusClass(row.status)}">${escapeHtml(STATUS_LABELS[row.status] || row.status || '접수됨')}</span><button class="admin-button admin-button-small" type="button" data-toggle-ticket="${escapeHtml(key)}">${open ? '접기' : '보기'}</button></div></div>${open ? renderDetail(row) : ''}</article>`;
}

function filteredRows() { return tickets.filter(matches); }
function renderList() {
  const rows = filteredRows();
  return rows.length ? rows.map(renderCard).join('') : renderEmptyState('문의 없음', '현재 필터 조건에 맞는 문의가 없습니다.');
}

function renderShell() {
  const openCount = tickets.filter(isOpen).length;
  const waiting = tickets.filter((row) => row.status === 'waiting_user').length;
  const resolved = tickets.filter((row) => row.status === 'resolved').length;
  return `<section class="admin-stack" aria-labelledby="supportHeading">
    <section class="admin-hero-card"><div class="admin-hero-icon">✉</div><div><h2 id="supportHeading">문의·고객센터</h2><p>사용자 문의를 확인하고 공개 답변과 내부 운영 메모를 분리해 관리합니다.</p></div></section>
    <section class="admin-grid admin-grid-4"><article class="admin-card admin-metric"><span>전체 문의</span><strong>${tickets.length}</strong><small>누적 접수</small></article><article class="admin-card admin-metric"><span>처리 필요</span><strong>${openCount}</strong><small>접수·확인 중</small></article><article class="admin-card admin-metric"><span>사용자 확인 필요</span><strong>${waiting}</strong><small>추가 정보 대기</small></article><article class="admin-card admin-metric"><span>답변 완료</span><strong>${resolved}</strong><small>종료 전 문의</small></article></section>
    <section class="admin-card admin-panel"><div class="admin-panel-head"><div><h2>문의 목록</h2><p>공개 답변만 사용자 화면에 표시됩니다. 내부 메모는 관리자만 읽을 수 있습니다.</p></div><div class="admin-filter-row"><select data-support-filter><option value="open" ${currentStatus === 'open' ? 'selected' : ''}>처리 필요</option><option value="all" ${currentStatus === 'all' ? 'selected' : ''}>전체</option><option value="closed" ${currentStatus === 'closed' ? 'selected' : ''}>완료·종료</option>${STATUS_OPTIONS.map(([value, label]) => `<option value="${value}" ${currentStatus === value ? 'selected' : ''}>${label}</option>`).join('')}</select><input data-support-search type="search" placeholder="이메일, 제목, Room 검색" value="${escapeHtml(currentSearch)}"></div></div><div class="admin-support-list" data-support-list>${renderList()}</div></section>
  </section>`;
}

function findTicket(key) { return tickets.find((row) => keyOf(row) === key); }

async function saveTicket(root, key) {
  const row = findTicket(key);
  if (!row) throw new Error('문의 정보를 찾을 수 없습니다.');
  const database = getAdminDatabase();
  const state = getState();
  const reply = root.querySelector(`[data-public-reply="${CSS.escape(key)}"]`)?.value.trim() || '';
  const internal = root.querySelector(`[data-internal-note="${CSS.escape(key)}"]`)?.value.trim() || '';
  const status = root.querySelector(`[data-ticket-status="${CSS.escape(key)}"]`)?.value || row.status || 'received';
  const updates = {};
  updates[`supportTickets/${row.ownerUid}/${row.id}/status`] = status;
  updates[`supportTickets/${row.ownerUid}/${row.id}/updatedAt`] = timestamp();
  updates[`supportTickets/${row.ownerUid}/${row.id}/lastAdminAt`] = timestamp();
  updates[`supportInternalNotes/${row.id}`] = { ticketId: row.id, ownerUid: row.ownerUid, message: internal, updatedByUid: state.user?.uid || '', updatedByEmail: state.user?.email || '', updatedAt: timestamp() };
  if (reply) {
    const replyRef = database.ref(`supportReplies/${row.ownerUid}/${row.id}`).push();
    updates[`supportReplies/${row.ownerUid}/${row.id}/${replyRef.key}`] = { replyId: replyRef.key, ticketId: row.id, message: reply, createdByUid: state.user?.uid || '', createdByEmail: state.user?.email || '', createdAt: timestamp() };
  }
  const auditRef = database.ref('adminAuditLogs').push();
  updates[`adminAuditLogs/${auditRef.key}`] = { action: reply ? 'support_public_reply_saved' : 'support_ticket_updated', targetId: row.id, ownerUid: row.ownerUid, status, adminUid: state.user?.uid || '', adminEmail: state.user?.email || '', createdAt: timestamp() };
  await database.ref().update(updates);
}

async function loadData() {
  const database = getAdminDatabase();
  const [ticketSnap, replySnap, noteSnap] = await Promise.all([database.ref('supportTickets').once('value'), database.ref('supportReplies').once('value'), database.ref('supportInternalNotes').once('value')]);
  tickets = flattenTickets(ticketSnap.val()); replies = asObject(replySnap.val()); notes = asObject(noteSnap.val());
}

export async function render() { await loadData(); return renderShell(); }

export function afterRender(root) {
  root.addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-toggle-ticket]');
    if (toggle) { const key = toggle.dataset.toggleTicket; openTickets.has(key) ? openTickets.delete(key) : openTickets.add(key); root.querySelector('[data-support-list]').innerHTML = renderList(); return; }
    const save = event.target.closest('[data-save-ticket]');
    if (!save) return;
    save.disabled = true;
    try { await saveTicket(root, save.dataset.saveTicket); await loadData(); root.innerHTML = renderShell(); }
    catch (error) { alert(`문의 저장에 실패했습니다. ${error.message || error}`); }
    finally { save.disabled = false; }
  }, { once: false });
  root.addEventListener('change', (event) => { if (event.target.matches('[data-support-filter]')) { currentStatus = event.target.value; root.querySelector('[data-support-list]').innerHTML = renderList(); } });
  root.addEventListener('input', (event) => { if (event.target.matches('[data-support-search]')) { currentSearch = event.target.value.trim(); root.querySelector('[data-support-list]').innerHTML = renderList(); } });
}
