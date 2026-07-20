import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a17-1-2-firebase-data-sync-hotfix-20260721';
import { getState } from '../admin-state.js';
import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a17-1-2-firebase-data-sync-hotfix-20260721';
import { ADMIN_RELEASE } from '../admin-release.js?v=admin-2-0-a17-1-2-firebase-data-sync-hotfix-20260721';

const ADMIN_STEP = ADMIN_RELEASE.step;
const ADMIN_LABEL = ADMIN_RELEASE.label;
const ADMIN_CACHE_KEY = ADMIN_RELEASE.cacheKey;

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function riskIdFor(item) {
  const input = `${item.type}|${item.path}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `risk_${(hash >>> 0).toString(36)}`;
}

const REVIEW_LABELS = Object.freeze({ open: '미검토', acknowledged: '확인 중', resolved: '해결', accepted: '예외 승인' });

function flattenRequests(requestsRoot) {
  const rows = [];
  Object.entries(asObject(requestsRoot)).forEach(([uid, group]) => {
    Object.entries(asObject(group)).forEach(([id, request]) => rows.push({ uid, id, ...asObject(request) }));
  });
  return rows;
}

function flattenSupportTickets(value) {
  const rows = [];
  Object.entries(asObject(value)).forEach(([ownerUid, group]) => {
    Object.entries(asObject(group)).forEach(([id, item]) => rows.push({ ownerUid, id, ...asObject(item) }));
  });
  return rows;
}

async function readPath(database, label, path) {
  try {
    const snapshot = await database.ref(path).once('value');
    const value = asObject(snapshot.val());
    return { label, path, ok: true, value, count: Object.keys(value).length };
  } catch (error) {
    return { label, path, ok: false, value: {}, count: 0, error: error?.message || String(error) };
  }
}

async function loadSystemStatus() {
  const database = getAdminDatabase();
  const reads = await Promise.all([
    readPath(database, '사용자', 'users'), readPath(database, 'Room', 'rooms'),
    readPath(database, 'Room 멤버', 'roomMembers'), readPath(database, '사용자 Room 연결', 'userRooms'),
    readPath(database, '데이터 요청', 'dataDeleteRequests'), readPath(database, '감사 로그', 'adminAuditLogs'),
    readPath(database, '삭제 승인 대기열', 'deletionActionQueue'), readPath(database, '백업 확인', 'dataBackups'),
    readPath(database, '문의', 'supportTickets'), readPath(database, '문의 복구 사건', 'supportIncidents'),
    readPath(database, '외부 백업 증빙', 'externalBackupRegistry'), readPath(database, '복구 계획', 'restorePlans'),
    readPath(database, '운영 위험 검토', 'operationRiskReviews')
  ]);
  const byPath = Object.fromEntries(reads.map((item) => [item.path, item]));
  const users = byPath.users.value;
  const rooms = byPath.rooms.value;
  const roomMembers = byPath.roomMembers.value;
  const userRooms = byPath.userRooms.value;
  const requests = flattenRequests(byPath.dataDeleteRequests.value);
  const deletionQueue = asObject(byPath.deletionActionQueue.value);
  const backups = asObject(byPath.dataBackups.value);
  const supportTickets = flattenSupportTickets(byPath.supportTickets.value);
  const supportIncidents = asObject(byPath.supportIncidents.value);
  const externalBackups = asObject(byPath.externalBackupRegistry.value);
  const restorePlans = asObject(byPath.restorePlans.value);
  const riskReviews = asObject(byPath.operationRiskReviews.value);
  const roomCodes = new Set([...Object.keys(rooms), ...Object.keys(roomMembers)]);
  const userRoomMismatch = [];
  const membershipsWithoutUser = [];
  const roomsWithoutMembers = [];
  const membershipsWithoutUserRoom = [];
  const activeRoomInvalid = [];
  const roomMetaMismatch = [];

  Object.entries(userRooms).forEach(([uid, linkedRooms]) => {
    Object.keys(asObject(linkedRooms)).forEach((roomCode) => {
      if (!roomMembers[roomCode]?.[uid]) userRoomMismatch.push(`${uid}/${roomCode}`);
    });
  });
  Object.entries(roomMembers).forEach(([roomCode, members]) => {
    const memberIds = Object.keys(asObject(members));
    if (!memberIds.length) roomsWithoutMembers.push(roomCode);
    memberIds.forEach((uid) => {
      if (!users[uid]) membershipsWithoutUser.push(`${roomCode}/${uid}`);
      if (!userRooms[uid]?.[roomCode]) membershipsWithoutUserRoom.push(`${roomCode}/${uid}`);
    });
  });
  Object.entries(rooms).forEach(([roomCode, room]) => {
    if (!roomMembers[roomCode]) roomsWithoutMembers.push(roomCode);
    const meta = asObject(asObject(room).meta);
    ['ownerUid', 'partnerUid'].forEach((key) => {
      const uid = meta[key];
      if (uid && !roomMembers[roomCode]?.[uid]) roomMetaMismatch.push(`${roomCode}/${key}/${uid}`);
    });
  });
  Object.entries(users).forEach(([uid, user]) => {
    const roomCode = asObject(user).activeRoom;
    if (roomCode && (!rooms[roomCode] || !roomMembers[roomCode]?.[uid])) activeRoomInvalid.push(`${uid}/${roomCode}`);
  });

  const openRequests = requests.filter((row) => !['completed', 'rejected', 'canceled', 'cancelled'].includes(row.status || 'pending'));
  const requestStatusCounts = {};
  const requestTypeCounts = {};
  requests.forEach((row) => {
    const status = row.status || 'pending';
    const type = row.requestType || row.type || 'unknown';
    requestStatusCounts[status] = (requestStatusCounts[status] || 0) + 1;
    requestTypeCounts[type] = (requestTypeCounts[type] || 0) + 1;
  });
  const now = Date.now();
  const supportOpen = supportTickets.filter((row) => !['resolved', 'closed'].includes(row.status || 'received'));
  const supportOverdue = supportOpen.filter((row) => Number(row.dueAt || 0) > 0 && Number(row.dueAt) < now);
  const supportUnassigned = supportOpen.filter((row) => !row.assigneeUid);
  const dataErrorsWithoutIncident = supportOpen.filter((row) => row.category === 'data_error' && !row.incidentId);
  const openIncidents = Object.values(supportIncidents).filter((row) => !['resolved', 'restored'].includes(row?.status || 'investigating'));
  const backupFailures = Object.entries(backups).filter(([, row]) => row?.status === 'failed').map(([id]) => id);
  const externalReview = Object.entries(externalBackups).filter(([, row]) => row?.status === 'manual_review_required').map(([id]) => id);
  const restoreConflicts = Object.entries(restorePlans).filter(([, row]) => Number(row?.conflictCount || 0) > 0).map(([id]) => id);
  const riskItems = [
    ...userRoomMismatch.map((path) => ({ severity: 'high', type: '연결 불일치', path: `userRooms/${path}`, summary: 'userRooms에는 있지만 roomMembers에 없습니다.' })),
    ...membershipsWithoutUserRoom.map((path) => ({ severity: 'high', type: '역방향 연결 누락', path: `roomMembers/${path}`, summary: 'roomMembers에는 있지만 userRooms에 없습니다.' })),
    ...membershipsWithoutUser.map((path) => ({ severity: 'high', type: '사용자 없는 멤버십', path: `roomMembers/${path}`, summary: '연결된 사용자 레코드를 찾을 수 없습니다.' })),
    ...roomsWithoutMembers.map((path) => ({ severity: 'warn', type: '빈 Room', path: `rooms/${path}`, summary: 'Room 멤버가 없거나 멤버십 경로가 없습니다.' })),
    ...activeRoomInvalid.map((value) => { const [uid, roomCode] = value.split('/'); return { severity: 'high', type: '잘못된 활성 Room', path: `users/${uid}/activeRoom`, summary: `활성 Room ${roomCode} 연결이 유효하지 않습니다.` }; }),
    ...roomMetaMismatch.map((value) => { const [roomCode, key, uid] = value.split('/'); return { severity: 'high', type: 'Room 메타 불일치', path: `rooms/${roomCode}/meta/${key}`, summary: `메타 사용자 ${uid}의 실제 멤버십이 없습니다.` }; }),
    ...supportOverdue.map((row) => ({ severity: 'warn', type: '문의 기한 초과', path: `supportTickets/${row.ownerUid}/${row.id}`, summary: row.title || '처리기한을 넘긴 문의입니다.' })),
    ...supportUnassigned.map((row) => ({ severity: 'info', type: '문의 담당자 미배정', path: `supportTickets/${row.ownerUid}/${row.id}`, summary: row.title || '담당자가 없는 열린 문의입니다.' })),
    ...dataErrorsWithoutIncident.map((row) => ({ severity: 'warn', type: '복구 사건 미연결', path: `supportTickets/${row.ownerUid}/${row.id}`, summary: row.title || '데이터 오류 문의에 복구 사건이 없습니다.' })),
    ...backupFailures.map((id) => ({ severity: 'high', type: '백업 검증 실패', path: `dataBackups/${id}`, summary: '백업 상태가 failed입니다.' })),
    ...externalReview.map((id) => ({ severity: 'warn', type: '외부 백업 검토 필요', path: `externalBackupRegistry/${id}`, summary: '외부 백업 증빙을 수동 검토해야 합니다.' })),
    ...restoreConflicts.map((id) => ({ severity: 'warn', type: '복구 충돌', path: `restorePlans/${id}`, summary: '복구 Dry Run에서 충돌 경로가 발견됐습니다.' }))
  ].map((item) => {
    const riskId = riskIdFor(item);
    const review = asObject(riskReviews[riskId]);
    return { ...item, riskId, review: { status: review.status || 'open', note: review.note || '', updatedAt: review.updatedAt || 0, adminEmail: review.adminEmail || '' } };
  });
  return {
    reads, usersCount: Object.keys(users).length, roomsCount: roomCodes.size,
    roomMembersCount: Object.values(roomMembers).reduce((sum, members) => sum + Object.keys(asObject(members)).length, 0),
    requestsCount: requests.length, openRequestsCount: openRequests.length,
    risks: { userRoomMismatch, membershipsWithoutUser, roomsWithoutMembers, membershipsWithoutUserRoom, activeRoomInvalid, roomMetaMismatch, openRequests, supportOverdue, supportUnassigned, dataErrorsWithoutIncident, openIncidents, backupFailures, externalReview, restoreConflicts, items: riskItems },
    requestStatusCounts, requestTypeCounts,
    deletionQueueCount: Object.keys(deletionQueue).length,
    backupVerifiedCount: Object.values(backups).filter((item) => item?.status === 'verified' && Number(item?.verifiedAt || 0) > 0).length,
    deletionExecutionEnabledCount: Object.values(deletionQueue).filter((item) => item?.executionEnabled === true).length
  };
}

function renderRiskItems(items) {
  if (!items.length) return '<div class="admin-info-box admin-ok">현재 통합 점검 기준에서 발견된 운영 위험이 없습니다.</div>';
  return `<div class="admin-risk-list">${items.slice(0, 100).map((item) => `<article class="admin-risk-card ${escapeHtml(item.severity)}" data-risk-card="${escapeHtml(item.riskId)}"><div class="admin-risk-summary"><div><strong>${escapeHtml(item.type)}</strong><p>${escapeHtml(item.summary)}</p><code>${escapeHtml(item.path)}</code></div><span class="admin-risk-severity">${item.severity === 'high' ? '높음' : item.severity === 'warn' ? '주의' : '확인'}</span></div><div class="admin-risk-review"><label>검토 상태<select data-risk-status><option value="open" ${item.review.status === 'open' ? 'selected' : ''}>미검토</option><option value="acknowledged" ${item.review.status === 'acknowledged' ? 'selected' : ''}>확인 중</option><option value="resolved" ${item.review.status === 'resolved' ? 'selected' : ''}>해결</option><option value="accepted" ${item.review.status === 'accepted' ? 'selected' : ''}>예외 승인</option></select></label><label>관리자 메모<textarea data-risk-note maxlength="500" placeholder="확인 내용이나 후속 조치를 기록하세요.">${escapeHtml(item.review.note)}</textarea></label><div class="admin-risk-review-actions"><small data-risk-result>${item.review.updatedAt ? `${escapeHtml(item.review.adminEmail || '관리자')} · ${new Date(item.review.updatedAt).toLocaleString('ko-KR')}` : '아직 검토 기록이 없습니다.'}</small><button type="button" class="admin-button secondary" data-risk-save="${escapeHtml(item.riskId)}">검토 저장</button></div></div></article>`).join('')}</div>`;
}

function renderCountList(title, items) {
  const entries = Object.entries(items);
  if (!entries.length) return `<div class="admin-list-row"><span>${escapeHtml(title)}</span><strong>0건</strong></div>`;
  return `<div class="admin-mini-list"><h3>${escapeHtml(title)}</h3>${entries.map(([key, count]) => `<div class="admin-list-row"><span>${escapeHtml(key)}</span><strong>${count}건</strong></div>`).join('')}</div>`;
}

export async function render() {
  const state = getState();
  const status = await loadSystemStatus();
  const release = window.HM_RELEASE || {};
  const failed = status.reads.filter((item) => !item.ok).length;
  const highRisks = status.risks.items.filter((item) => item.severity === 'high').length;
  const reviewedRisks = status.risks.items.filter((item) => item.review.status !== 'open').length;
  const resolvedRisks = status.risks.items.filter((item) => item.review.status === 'resolved').length;
  const acceptedRisks = status.risks.items.filter((item) => item.review.status === 'accepted').length;
  return `
    <section class="module-view" aria-labelledby="systemHeading">
      <section class="admin-hero-card"><div class="admin-hero-icon">⚙️</div><div><h2 id="systemHeading">시스템 · 운영 상태 점검</h2><p>관리자 앱의 연결, 인증, 주요 데이터 읽기 상태를 확인합니다. 이 화면은 읽기 전용입니다.</p></div></section>
      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>Firebase 앱</span><strong>babyApp</strong><small>연결 확인</small></article>
        <article class="admin-card admin-metric"><span>관리자 인증</span><strong>${escapeHtml(state.user?.email || '-')}</strong><small>현재 로그인 관리자</small></article>
        <article class="admin-card admin-metric"><span>읽기 점검</span><strong>${status.reads.length - failed}/${status.reads.length}</strong><small>주요 경로 읽기 가능</small></article>
        <article class="admin-card admin-metric"><span>관리자 스텝</span><strong>${ADMIN_STEP}</strong><small>${ADMIN_LABEL}</small></article>
      </section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h2>운영 연결 상태</h2><p>관리자 화면이 정상적으로 데이터를 읽을 수 있는지 확인합니다.</p></div><span class="admin-status-pill muted">Read Only</span></div>
        <div class="admin-grid admin-grid-2">
          <article class="admin-soft-card"><h3>앱 기준</h3><div class="admin-key-value"><span>메인 앱 버전</span><strong>${escapeHtml(release.step || 'STEP6.2.13.4')}</strong></div><div class="admin-key-value"><span>관리자 스텝</span><strong>${ADMIN_STEP}</strong></div><div class="admin-key-value"><span>캐시 키</span><strong>${ADMIN_CACHE_KEY}</strong></div></article>
          <article class="admin-soft-card"><h3>안전 기준</h3><ul><li>관리자 인증을 통과한 계정만 접근</li><li>승인 대기열은 서버 함수만 기록</li><li>검증된 백업 전 2차 승인 차단</li><li>영구 삭제 실행 모드 ${ADMIN_RELEASE.deletionMode}</li></ul></article>
        </div>
      </section>
      <section class="admin-card admin-panel"><div class="admin-panel-head"><div><h2>통합 운영 위험 검토</h2><p>발견된 위험을 검토하고 상태와 메모를 별도 기록합니다. 원본 사용자·Room·문의·백업 데이터는 변경하지 않습니다.</p></div><span class="admin-status-pill ${highRisks ? 'danger' : status.risks.items.length ? 'warn' : 'ok'}">전체 ${status.risks.items.length}건 · 높음 ${highRisks}건</span></div><section class="admin-grid admin-grid-4"><article class="admin-card admin-metric"><span>검토 완료</span><strong>${reviewedRisks}/${status.risks.items.length}</strong><small>확인 중 포함</small></article><article class="admin-card admin-metric"><span>해결</span><strong>${resolvedRisks}</strong><small>조치 완료 기록</small></article><article class="admin-card admin-metric"><span>예외 승인</span><strong>${acceptedRisks}</strong><small>관리자 판단 보존</small></article><article class="admin-card admin-metric"><span>미검토</span><strong>${status.risks.items.length - reviewedRisks}</strong><small>후속 확인 필요</small></article></section>${renderRiskItems(status.risks.items)}</section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h2>승인 엔진 안전 상태</h2><p>서버 사전점검, 백업 확인과 최종 실행 준비 상태를 확인합니다.</p></div><span class="admin-status-pill ${status.deletionExecutionEnabledCount ? 'warn' : 'ok'}">${status.deletionExecutionEnabledCount ? `실행 준비 ${status.deletionExecutionEnabledCount}건` : '실행 준비 없음'}</span></div>
        <section class="admin-grid admin-grid-3"><article class="admin-card admin-metric"><span>승인 대기열</span><strong>${status.deletionQueueCount}</strong><small>deletionActionQueue</small></article><article class="admin-card admin-metric"><span>검증된 백업</span><strong>${status.backupVerifiedCount}</strong><small>dataBackups</small></article><article class="admin-card admin-metric"><span>실행 활성</span><strong>${status.deletionExecutionEnabledCount}</strong><small>정상 기준 0건</small></article></section>
      </section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h2>데이터 관리 센터 · 읽기 점검</h2><p>실제 데이터를 변경하지 않고 운영자가 먼저 확인해야 할 데이터 구조와 위험 신호를 요약합니다.</p></div><span class="admin-status-pill muted">Read Only</span></div>
        <section class="admin-grid admin-grid-4">
          <article class="admin-card admin-metric"><span>사용자</span><strong>${status.usersCount}</strong><small>users 기준</small></article>
          <article class="admin-card admin-metric"><span>Room</span><strong>${status.roomsCount}</strong><small>rooms/roomMembers 통합</small></article>
          <article class="admin-card admin-metric"><span>Room 멤버</span><strong>${status.roomMembersCount}</strong><small>roomMembers 기준</small></article>
          <article class="admin-card admin-metric"><span>데이터 요청</span><strong>${status.requestsCount}</strong><small>처리 중 ${status.openRequestsCount}건</small></article>
        </section>
        <div class="admin-grid admin-grid-2">
          <article class="admin-soft-card"><h3>위험 신호</h3><ul><li>사용자 Room 연결 불일치: ${status.risks.userRoomMismatch.length}건</li><li>사용자 정보 없는 멤버십: ${status.risks.membershipsWithoutUser.length}건</li><li>멤버 없는 Room 데이터: ${status.risks.roomsWithoutMembers.length}건</li><li>열린 데이터 요청: ${status.risks.openRequests.length}건</li></ul></article>
          <article class="admin-soft-card"><h3>운영 판단</h3><p>${failed ? '읽기 실패 경로가 있습니다. 권한 또는 데이터 경로를 먼저 확인해야 합니다.' : '현재 읽기 점검 기준으로 즉시 확인할 연결 오류는 없습니다.'}</p></article>
        </div>
        <div class="admin-grid admin-grid-2">${renderCountList('요청 상태 분포', status.requestStatusCounts)}${renderCountList('요청 유형 분포', status.requestTypeCounts)}</div>
      </section>
      <section class="admin-card admin-panel"><h2>주요 데이터 경로 점검</h2><div class="admin-path-list">${status.reads.map((item) => `<div class="admin-list-row"><span><strong>${escapeHtml(item.label)}</strong><br><small>${escapeHtml(item.path)}</small></span><strong class="${item.ok ? 'admin-ok' : 'admin-danger'}">${item.ok ? `읽기 가능 · ${item.count}건` : '읽기 실패'}</strong></div>`).join('')}</div></section>
    </section>`;
}

export function afterRender(root) {
  root.querySelectorAll('[data-risk-save]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('[data-risk-card]');
      const riskId = button.dataset.riskSave;
      const status = card?.querySelector('[data-risk-status]')?.value || 'open';
      const note = card?.querySelector('[data-risk-note]')?.value.trim() || '';
      const result = card?.querySelector('[data-risk-result]');
      if (!card || !REVIEW_LABELS[status] || note.length > 500) return;
      const state = getState();
      const timestamp = Date.now();
      const database = getAdminDatabase();
      const auditId = database.ref('adminAuditLogs').push().key;
      const riskPath = card.querySelector('code')?.textContent || '';
      const record = { riskId, path: riskPath, status, note, adminUid: state.user?.uid || '', adminEmail: state.user?.email || '', updatedAt: timestamp };
      button.disabled = true;
      button.textContent = '저장 중...';
      try {
        await database.ref().update({
          [`operationRiskReviews/${riskId}`]: record,
          [`adminAuditLogs/${auditId}`]: { action: 'operation_risk_review_saved', targetType: 'operationRisk', targetId: riskId, targetPath: riskPath, status, note, adminUid: record.adminUid, adminEmail: record.adminEmail, createdAt: timestamp }
        });
        if (result) result.textContent = `${record.adminEmail || '관리자'} · ${new Date(timestamp).toLocaleString('ko-KR')} · ${REVIEW_LABELS[status]}`;
        button.textContent = '저장 완료';
      } catch (error) {
        if (result) result.textContent = `저장 실패: ${error?.message || error}`;
        button.textContent = '다시 저장';
      } finally {
        button.disabled = false;
      }
    });
  });
}
