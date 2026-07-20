import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a15-2-support-operations-20260720';
import { getState } from '../admin-state.js';
import { asObject, escapeHtml, formatDateTime, compactId } from '../admin-utils.js?v=admin-2-0-a15-2-support-operations-20260720';
import { renderEmptyState } from '../components/empty-state.js?v=admin-2-0-a15-2-support-operations-20260720';

const STATUS_LABELS = { received: '접수됨', reviewing: '확인 중', waiting_user: '추가 정보 필요', resolved: '답변 완료', closed: '종료' };
const CATEGORY_LABELS = { usage: '앱 사용 문의', data_error: '데이터 오류', account_room: '계정·Room 문의', report: '신고·안전', suggestion: '기능 제안' };
const PRIORITY_LABELS = { low: '낮음', normal: '보통', high: '높음', urgent: '긴급' };
const STATUS_OPTIONS = Object.entries(STATUS_LABELS);
let tickets = [];
let replies = {};
let notes = {};
let admins = {};
let incidents = {};
let currentStatus = 'open';
let currentSearch = '';
const openTickets = new Set();

function timestamp() { return window.firebase.database.ServerValue.TIMESTAMP; }
function keyOf(row) { return `${row.ownerUid}__${row.id}`; }
function isOpen(row) { return !['resolved', 'closed'].includes(row.status); }
function statusClass(status) { return status === 'resolved' ? 'ok' : status === 'closed' ? 'muted' : status === 'waiting_user' ? 'warn' : 'pending'; }
function dateTimeInput(value) {
  const number = Number(value || 0);
  if (!number) return '';
  const date = new Date(number - new Date(number).getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}

function adminOptions(selectedUid) {
  const current = getState().user;
  const entries = Object.entries(asObject(admins));
  if (current?.uid && !entries.some(([uid]) => uid === current.uid)) entries.push([current.uid, { email: current.email || '' }]);
  return `<option value="">담당자 미배정</option>${entries.map(([uid, profile]) => {
    const value = asObject(profile);
    const label = value.email || value.name || (uid === current?.uid ? current.email : '') || compactId(uid);
    return `<option value="${escapeHtml(uid)}" ${selectedUid === uid ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('')}`;
}

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
  const incident = row.incidentId ? asObject(incidents[row.incidentId]) : null;
  return `<div class="admin-support-detail">
    <section class="admin-soft-card"><h4>문의 내용</h4><p>${escapeHtml(row.message || '')}</p></section>
    <div class="admin-meta-row"><span>UID ${escapeHtml(compactId(row.ownerUid))}</span><span>Room ${escapeHtml(row.roomCode || '미연결')}</span><span>접수 ${escapeHtml(formatDateTime(row.createdAt))}</span><span>버전 ${escapeHtml(row.appVersion || '-')}</span></div>
    <section class="admin-support-history"><h4>사용자에게 공개된 답변</h4>${rowReplies.length ? rowReplies.map((reply) => `<div><p>${escapeHtml(reply.message || '')}</p><small>${escapeHtml(formatDateTime(reply.createdAt))} · ${escapeHtml(reply.createdByEmail || '관리자')}</small></div>`).join('') : '<p class="admin-muted">아직 공개 답변이 없습니다.</p>'}</section>
    <section class="admin-support-operations"><label><span>담당자</span><select data-assignee="${escapeHtml(keyOf(row))}">${adminOptions(row.assigneeUid || '')}</select></label><label><span>우선순위</span><select data-priority="${escapeHtml(keyOf(row))}">${Object.entries(PRIORITY_LABELS).map(([value, label]) => `<option value="${value}" ${(row.priority || 'normal') === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label><span>처리기한</span><input data-due-at="${escapeHtml(keyOf(row))}" type="datetime-local" value="${escapeHtml(dateTimeInput(row.dueAt))}"></label></section>
    ${row.category === 'data_error' ? `<section class="admin-support-incident"><div><strong>복구 사건 연결</strong><p>${incident ? `${escapeHtml(incident.incidentId || row.incidentId)} · ${escapeHtml(incident.status || 'investigating')}` : '아직 연결된 복구 사건이 없습니다.'}</p></div>${incident ? '<span class="admin-status-pill warn">연결됨</span>' : `<button class="admin-button" type="button" data-create-incident="${escapeHtml(keyOf(row))}">복구 사건 생성</button>`}</section>` : ''}
    <label class="admin-field"><span>공개 답변</span><textarea data-public-reply="${escapeHtml(keyOf(row))}" maxlength="2000" placeholder="사용자에게 보일 답변을 작성하세요."></textarea></label>
    <label class="admin-field"><span>내부 메모 (사용자에게 보이지 않음)</span><textarea data-internal-note="${escapeHtml(keyOf(row))}" maxlength="2000" placeholder="운영자 확인 사항을 기록하세요.">${escapeHtml(note.message || '')}</textarea></label>
    <div class="admin-support-actions"><select data-ticket-status="${escapeHtml(keyOf(row))}">${STATUS_OPTIONS.map(([value, label]) => `<option value="${value}" ${row.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="admin-button" type="button" data-save-ticket="${escapeHtml(keyOf(row))}">답변·상태 저장</button></div>
  </div>`;
}

function renderCard(row) {
  const key = keyOf(row);
  const open = openTickets.has(key);
  return `<article class="admin-card admin-support-card"><div class="admin-request-card-head"><div><h3>${escapeHtml(row.title || '문의')}</h3><p>${escapeHtml(row.ownerEmail || row.ownerUid)} · ${escapeHtml(CATEGORY_LABELS[row.category] || row.category || '일반')} · ${escapeHtml(PRIORITY_LABELS[row.priority] || '보통')}${row.assigneeEmail ? ` · 담당 ${escapeHtml(row.assigneeEmail)}` : ''}</p></div><div class="admin-request-actions"><span class="admin-status-pill ${statusClass(row.status)}">${escapeHtml(STATUS_LABELS[row.status] || row.status || '접수됨')}</span><button class="admin-button admin-button-small" type="button" data-toggle-ticket="${escapeHtml(key)}">${open ? '접기' : '보기'}</button></div></div>${open ? renderDetail(row) : ''}</article>`;
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
  const incidentCount = Object.keys(incidents).length;
  return `<section class="admin-stack" aria-labelledby="supportHeading">
    <section class="admin-hero-card"><div class="admin-hero-icon">✉</div><div><h2 id="supportHeading">문의·고객센터</h2><p>사용자 문의를 확인하고 공개 답변과 내부 운영 메모를 분리해 관리합니다.</p></div></section>
    <section class="admin-grid admin-grid-4"><article class="admin-card admin-metric"><span>전체 문의</span><strong>${tickets.length}</strong><small>누적 접수</small></article><article class="admin-card admin-metric"><span>처리 필요</span><strong>${openCount}</strong><small>접수·확인 중</small></article><article class="admin-card admin-metric"><span>복구 사건</span><strong>${incidentCount}</strong><small>데이터 오류 연결</small></article><article class="admin-card admin-metric"><span>답변 완료</span><strong>${resolved}</strong><small>추가 정보 대기 ${waiting}건</small></article></section>
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
  const assigneeUid = root.querySelector(`[data-assignee="${CSS.escape(key)}"]`)?.value || '';
  const assigneeProfile = asObject(admins[assigneeUid]);
  const assigneeEmail = assigneeUid ? (assigneeProfile.email || (assigneeUid === state.user?.uid ? state.user?.email : '') || '') : '';
  const priority = root.querySelector(`[data-priority="${CSS.escape(key)}"]`)?.value || 'normal';
  const dueValue = root.querySelector(`[data-due-at="${CSS.escape(key)}"]`)?.value || '';
  const dueAt = dueValue ? new Date(dueValue).getTime() : 0;
  const updates = {};
  updates[`supportTickets/${row.ownerUid}/${row.id}/status`] = status;
  updates[`supportTickets/${row.ownerUid}/${row.id}/updatedAt`] = timestamp();
  updates[`supportTickets/${row.ownerUid}/${row.id}/lastAdminAt`] = timestamp();
  updates[`supportTickets/${row.ownerUid}/${row.id}/assigneeUid`] = assigneeUid;
  updates[`supportTickets/${row.ownerUid}/${row.id}/assigneeEmail`] = assigneeEmail;
  updates[`supportTickets/${row.ownerUid}/${row.id}/priority`] = priority;
  updates[`supportTickets/${row.ownerUid}/${row.id}/dueAt`] = dueAt;
  updates[`supportInternalNotes/${row.id}`] = { ticketId: row.id, ownerUid: row.ownerUid, message: internal, updatedByUid: state.user?.uid || '', updatedByEmail: state.user?.email || '', updatedAt: timestamp() };
  if (reply) {
    const replyRef = database.ref(`supportReplies/${row.ownerUid}/${row.id}`).push();
    updates[`supportReplies/${row.ownerUid}/${row.id}/${replyRef.key}`] = { replyId: replyRef.key, ticketId: row.id, message: reply, createdByUid: state.user?.uid || '', createdByEmail: state.user?.email || '', createdAt: timestamp() };
    updates[`supportNotifications/${row.ownerUid}/${replyRef.key}`] = { notificationId: replyRef.key, ticketId: row.id, type: 'support_reply', title: row.title || '고객센터 답변', createdAt: timestamp(), readAt: 0 };
  }
  const auditRef = database.ref('adminAuditLogs').push();
  updates[`adminAuditLogs/${auditRef.key}`] = { action: reply ? 'support_public_reply_saved' : 'support_ticket_updated', targetId: row.id, ownerUid: row.ownerUid, status, assigneeUid, priority, dueAt, adminUid: state.user?.uid || '', adminEmail: state.user?.email || '', createdAt: timestamp() };
  await database.ref().update(updates);
}

async function createIncident(key) {
  const row = findTicket(key);
  if (!row || row.category !== 'data_error') throw new Error('데이터 오류 문의만 복구 사건으로 연결할 수 있습니다.');
  if (row.incidentId) return;
  const database = getAdminDatabase();
  const state = getState();
  const ref = database.ref('supportIncidents').push();
  const updates = {};
  updates[`supportIncidents/${ref.key}`] = { incidentId: ref.key, ticketId: row.id, ownerUid: row.ownerUid, ownerEmail: row.ownerEmail || '', roomCode: row.roomCode || '', summary: row.title || '데이터 오류 문의', status: 'investigating', severity: row.priority === 'urgent' ? 'critical' : row.priority === 'high' ? 'high' : 'normal', assignedToUid: row.assigneeUid || state.user?.uid || '', createdByUid: state.user?.uid || '', createdByEmail: state.user?.email || '', createdAt: timestamp(), updatedAt: timestamp() };
  updates[`supportTickets/${row.ownerUid}/${row.id}/incidentId`] = ref.key;
  updates[`supportTickets/${row.ownerUid}/${row.id}/status`] = 'reviewing';
  updates[`supportTickets/${row.ownerUid}/${row.id}/updatedAt`] = timestamp();
  const auditRef = database.ref('adminAuditLogs').push();
  updates[`adminAuditLogs/${auditRef.key}`] = { action: 'support_recovery_incident_created', targetId: ref.key, ticketId: row.id, ownerUid: row.ownerUid, adminUid: state.user?.uid || '', adminEmail: state.user?.email || '', createdAt: timestamp() };
  await database.ref().update(updates);
}

async function loadData() {
  const database = getAdminDatabase();
  const [ticketSnap, replySnap, noteSnap, adminSnap, incidentSnap] = await Promise.all([database.ref('supportTickets').once('value'), database.ref('supportReplies').once('value'), database.ref('supportInternalNotes').once('value'), database.ref('admins').once('value'), database.ref('supportIncidents').once('value')]);
  tickets = flattenTickets(ticketSnap.val()); replies = asObject(replySnap.val()); notes = asObject(noteSnap.val()); admins = asObject(adminSnap.val()); incidents = asObject(incidentSnap.val());
}

export async function render() { await loadData(); return renderShell(); }

export function afterRender(root) {
  root.addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-toggle-ticket]');
    if (toggle) { const key = toggle.dataset.toggleTicket; openTickets.has(key) ? openTickets.delete(key) : openTickets.add(key); root.querySelector('[data-support-list]').innerHTML = renderList(); return; }
    const incidentButton = event.target.closest('[data-create-incident]');
    if (incidentButton) {
      incidentButton.disabled = true;
      try { await createIncident(incidentButton.dataset.createIncident); await loadData(); root.innerHTML = renderShell(); }
      catch (error) { alert(`복구 사건 생성에 실패했습니다. ${error.message || error}`); }
      finally { incidentButton.disabled = false; }
      return;
    }
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
