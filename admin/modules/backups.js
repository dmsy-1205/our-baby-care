import { getAdminDatabase, getAdminFunctions } from '../admin-api.js?v=admin-2-0-a14-1-backup-registry-20260719';
import { asObject, compactId, escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a14-1-backup-registry-20260719';

let requests = [];
let backups = {};

function flattenRequests(value) {
  return Object.entries(asObject(value)).flatMap(([ownerUid, group]) =>
    Object.entries(asObject(group)).map(([id, item]) => ({ ownerUid, id, ...asObject(item) }))
  ).filter((item) => item.status === 'approved' && ['account', 'delete_room'].includes(item.requestType));
}

function backupStatus(item) {
  if (!item || !Object.keys(item).length) return ['미생성', 'muted'];
  if (item.status === 'verified') return ['검증 완료', 'ok'];
  if (item.status === 'failed') return ['검증 실패', 'danger'];
  return ['검증 중', 'warn'];
}

function renderRow(request) {
  const backup = asObject(backups[request.id]);
  const [statusLabel, statusClass] = backupStatus(backup);
  return `<article class="admin-card admin-backup-card">
    <div class="admin-request-card-head"><div><h3>${request.requestType === 'delete_room' ? 'Room 전체 삭제' : '계정 삭제'} 백업</h3><p>${escapeHtml(request.requestedByEmail || request.ownerUid)}</p></div><span class="admin-status-pill ${statusClass}">${statusLabel}</span></div>
    <div class="admin-meta-row"><span>요청 ${escapeHtml(compactId(request.id, 10, 6))}</span><span>UID ${escapeHtml(compactId(request.ownerUid))}</span><span>Room ${escapeHtml(request.roomCode || '미연결')}</span></div>
    ${Object.keys(backup).length ? `<div class="admin-grid admin-grid-4"><div class="admin-soft-card"><strong>저장 방식</strong><p>프로젝트 내부 스냅샷</p></div><div class="admin-soft-card"><strong>크기</strong><p>${Number(backup.sizeBytes || 0).toLocaleString()} bytes</p></div><div class="admin-soft-card"><strong>경로</strong><p>${Number(backup.pathCount || 0)}개</p></div><div class="admin-soft-card"><strong>검증 시각</strong><p>${escapeHtml(formatDateTime(backup.verifiedAt))}</p></div></div><code class="admin-backup-checksum">SHA-256 ${escapeHtml(backup.checksum || '-')}</code>` : '<div class="admin-warning-box">아직 운영 스냅샷이 없습니다. 원본 데이터는 변경되지 않았습니다.</div>'}
    <div class="admin-action-row"><button class="admin-button" type="button" data-create-backup="${escapeHtml(request.id)}">${backup.status === 'verified' ? '백업 다시 생성' : '백업 생성·검증'}</button>${Object.keys(backup).length ? `<button class="admin-button" type="button" data-verify-backup="${escapeHtml(request.id)}">무결성 다시 검사</button>` : ''}<span class="admin-status-pill danger">영구 삭제 OFF</span></div>
  </article>`;
}

function renderShell() {
  const verified = Object.values(backups).filter((item) => item?.status === 'verified').length;
  const failed = Object.values(backups).filter((item) => item?.status === 'failed').length;
  return `<section class="admin-stack" aria-labelledby="backupsHeading">
    <section class="admin-hero-card"><div class="admin-hero-icon">▣</div><div><h2 id="backupsHeading">백업 등록부·무결성 검증</h2><p>승인된 삭제 요청의 대상 데이터를 서버 스냅샷으로 보관하고 SHA-256 체크섬을 다시 검사합니다.</p></div></section>
    <section class="admin-warning-box"><strong>백업 등급 안내</strong><p>현재 백업은 같은 Firebase 프로젝트 안에 저장되는 운영 스냅샷입니다. 실수 복구에는 사용할 수 있지만 프로젝트 전체 장애를 대비한 외부 백업은 아닙니다.</p></section>
    <section class="admin-grid admin-grid-4"><article class="admin-card admin-metric"><span>백업 대상</span><strong>${requests.length}</strong><small>승인된 삭제 요청</small></article><article class="admin-card admin-metric"><span>검증 완료</span><strong>${verified}</strong><small>체크섬 일치</small></article><article class="admin-card admin-metric"><span>검증 실패</span><strong>${failed}</strong><small>실행 차단</small></article><article class="admin-card admin-metric"><span>영구 삭제</span><strong>OFF</strong><small>서버 잠금</small></article></section>
    <section class="admin-card admin-panel"><div class="admin-panel-head"><div><h2>요청별 백업</h2><p>백업 생성과 재검증은 서버에서만 실행되며 원본 데이터를 변경하지 않습니다.</p></div><span class="admin-status-pill muted">A14.1</span></div><div class="admin-backup-list">${requests.length ? requests.map(renderRow).join('') : '<div class="state-card"><strong>백업 대상이 없습니다.</strong><p>승인된 계정 삭제 또는 Room 전체 삭제 요청이 생기면 여기에 표시됩니다.</p></div>'}</div></section>
  </section>`;
}

async function loadData() {
  const database = getAdminDatabase();
  const [requestSnap, backupSnap] = await Promise.all([
    database.ref('dataDeleteRequests').once('value'), database.ref('dataBackups').once('value').catch(() => ({ val: () => null }))
  ]);
  requests = flattenRequests(requestSnap.val());
  backups = asObject(backupSnap.val());
}

async function refresh(root) {
  await loadData();
  root.innerHTML = renderShell();
}

export async function render() {
  await loadData();
  return renderShell();
}

export function afterRender(root) {
  root.addEventListener('click', async (event) => {
    const createButton = event.target.closest('[data-create-backup]');
    if (createButton) {
      const requestId = createButton.dataset.createBackup;
      const request = requests.find((item) => item.id === requestId);
      if (!request) return;
      if (!confirm('현재 데이터를 서버 스냅샷으로 보관하고 무결성을 검증할까요? 원본은 변경되지 않습니다.')) return;
      createButton.disabled = true;
      try {
        await getAdminFunctions().httpsCallable('createDeletionBackup')({ targetUid: request.ownerUid, requestId });
        await refresh(root);
      } catch (error) {
        alert(`백업 생성에 실패했습니다. ${error.message || error}`);
        createButton.disabled = false;
      }
      return;
    }
    const verifyButton = event.target.closest('[data-verify-backup]');
    if (!verifyButton) return;
    verifyButton.disabled = true;
    try {
      await getAdminFunctions().httpsCallable('verifyDeletionBackup')({ requestId: verifyButton.dataset.verifyBackup });
      await refresh(root);
    } catch (error) {
      alert(`무결성 검사에 실패했습니다. ${error.message || error}`);
      verifyButton.disabled = false;
    }
  });
}
