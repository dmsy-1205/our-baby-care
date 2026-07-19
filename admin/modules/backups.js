import { getAdminDatabase, getAdminFunctions } from '../admin-api.js?v=admin-2-0-a14-2-4-recovery-safety-suite-20260719';
import { asObject, compactId, escapeHtml, formatDateTime } from '../admin-utils.js?v=admin-2-0-a14-2-4-recovery-safety-suite-20260719';

let requests = [];
let backups = {};
let restorePlans = {};
let externalBackups = {};

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
  const plan = asObject(restorePlans[request.id]);
  const external = asObject(externalBackups[request.id]);
  const [statusLabel, statusClass] = backupStatus(backup);
  return `<article class="admin-card admin-backup-card">
    <div class="admin-request-card-head"><div><h3>${request.requestType === 'delete_room' ? 'Room 전체 삭제' : '계정 삭제'} 백업</h3><p>${escapeHtml(request.requestedByEmail || request.ownerUid)}</p></div><span class="admin-status-pill ${statusClass}">${statusLabel}</span></div>
    <div class="admin-meta-row"><span>요청 ${escapeHtml(compactId(request.id, 10, 6))}</span><span>UID ${escapeHtml(compactId(request.ownerUid))}</span><span>Room ${escapeHtml(request.roomCode || '미연결')}</span></div>
    ${Object.keys(backup).length ? `<div class="admin-grid admin-grid-4"><div class="admin-soft-card"><strong>저장 방식</strong><p>프로젝트 내부 스냅샷</p></div><div class="admin-soft-card"><strong>크기</strong><p>${Number(backup.sizeBytes || 0).toLocaleString()} bytes</p></div><div class="admin-soft-card"><strong>경로</strong><p>${Number(backup.pathCount || 0)}개</p></div><div class="admin-soft-card"><strong>검증 시각</strong><p>${escapeHtml(formatDateTime(backup.verifiedAt))}</p></div></div><code class="admin-backup-checksum">SHA-256 ${escapeHtml(backup.checksum || '-')}</code>` : '<div class="admin-warning-box">아직 운영 스냅샷이 없습니다. 원본 데이터는 변경되지 않았습니다.</div>'}
    ${Object.keys(plan).length ? `<section class="admin-restore-plan"><div class="admin-impact-head"><div><strong>복구 Dry Run 결과</strong><p>${escapeHtml(formatDateTime(plan.updatedAt))} · ${escapeHtml(plan.risk || '검토')}</p></div><span class="admin-impact-risk ${Number(plan.summary?.overwrite || 0) ? 'danger' : 'ok'}">${Number(plan.summary?.overwrite || 0) ? '충돌 검토 필요' : '복구 가능'}</span></div><div class="admin-impact-grid"><div><span>새로 생성</span><strong>${Number(plan.summary?.create || 0)}</strong></div><div><span>덮어쓰기 충돌</span><strong>${Number(plan.summary?.overwrite || 0)}</strong></div><div><span>동일 데이터</span><strong>${Number(plan.summary?.unchanged || 0)}</strong></div><div><span>검사 항목</span><strong>${Number(plan.summary?.scanned || 0)}</strong></div></div><details><summary>영향 경로 미리보기</summary><div class="admin-backup-paths">${(plan.summary?.samples || []).map((item) => `<code>${escapeHtml(item.action)} · ${escapeHtml(item.path)}</code>`).join('') || '<span>변경 경로 없음</span>'}</div></details></section>` : ''}
    ${Object.keys(external).length ? `<div class="admin-info-box"><strong>외부 백업 증빙 등록됨</strong><p>${escapeHtml(external.provider)} · ${escapeHtml(external.objectRef)} · 수동 검토 필요</p></div>` : ''}
    <div class="admin-action-row"><button class="admin-button" type="button" data-create-backup="${escapeHtml(request.id)}">${backup.status === 'verified' ? '백업 다시 생성' : '백업 생성·검증'}</button>${Object.keys(backup).length ? `<button class="admin-button" type="button" data-verify-backup="${escapeHtml(request.id)}">무결성 다시 검사</button>` : ''}${backup.status === 'verified' ? `<button class="admin-button" type="button" data-restore-dry-run="${escapeHtml(request.id)}">복구 Dry Run</button>` : ''}<button class="admin-button danger" type="button" disabled>통제 복구 잠금</button><span class="admin-status-pill danger">영구 삭제 OFF</span></div>
    ${backup.status === 'verified' ? `<details class="admin-external-backup"><summary>외부 백업 증빙 등록</summary><form data-external-backup="${escapeHtml(request.id)}"><select name="provider" required><option value="google_cloud_storage">Google Cloud Storage</option><option value="firebase_export">Firebase Export</option><option value="manual_export">수동 Export</option></select><input name="objectRef" required maxlength="500" placeholder="외부 객체 위치 또는 Export ID"><input name="checksum" required pattern="[a-fA-F0-9]{64}" placeholder="SHA-256 64자리"><input name="capturedAt" required type="datetime-local"><button class="admin-button" type="submit">증빙 등록</button></form></details>` : ''}
  </article>`;
}

function renderShell() {
  const verified = Object.values(backups).filter((item) => item?.status === 'verified').length;
  const failed = Object.values(backups).filter((item) => item?.status === 'failed').length;
  const dryRuns = Object.keys(restorePlans).length;
  const externalCount = Object.keys(externalBackups).length;
  return `<section class="admin-stack" aria-labelledby="backupsHeading">
    <section class="admin-hero-card"><div class="admin-hero-icon">▣</div><div><h2 id="backupsHeading">백업 등록부·무결성 검증</h2><p>승인된 삭제 요청의 대상 데이터를 서버 스냅샷으로 보관하고 SHA-256 체크섬을 다시 검사합니다.</p></div></section>
    <section class="admin-warning-box"><strong>백업 등급 안내</strong><p>현재 백업은 같은 Firebase 프로젝트 안에 저장되는 운영 스냅샷입니다. 실수 복구에는 사용할 수 있지만 프로젝트 전체 장애를 대비한 외부 백업은 아닙니다.</p></section>
    <section class="admin-grid admin-grid-4"><article class="admin-card admin-metric"><span>백업 대상</span><strong>${requests.length}</strong><small>승인된 삭제 요청</small></article><article class="admin-card admin-metric"><span>검증 완료</span><strong>${verified}</strong><small>실패 ${failed}건</small></article><article class="admin-card admin-metric"><span>복구 Dry Run</span><strong>${dryRuns}</strong><small>외부 증빙 ${externalCount}건</small></article><article class="admin-card admin-metric"><span>실제 복구·삭제</span><strong>OFF</strong><small>서버 잠금</small></article></section>
    <section class="admin-card admin-panel"><div class="admin-panel-head"><div><h2>요청별 백업</h2><p>백업 생성과 재검증은 서버에서만 실행되며 원본 데이터를 변경하지 않습니다.</p></div><span class="admin-status-pill muted">A14.1</span></div><div class="admin-backup-list">${requests.length ? requests.map(renderRow).join('') : '<div class="state-card"><strong>백업 대상이 없습니다.</strong><p>승인된 계정 삭제 또는 Room 전체 삭제 요청이 생기면 여기에 표시됩니다.</p></div>'}</div></section>
  </section>`;
}

async function loadData() {
  const database = getAdminDatabase();
  const [requestSnap, backupSnap, planSnap, externalSnap] = await Promise.all([
    database.ref('dataDeleteRequests').once('value'),
    database.ref('dataBackups').once('value').catch(() => ({ val: () => null })),
    database.ref('restorePlans').once('value').catch(() => ({ val: () => null })),
    database.ref('externalBackupRegistry').once('value').catch(() => ({ val: () => null }))
  ]);
  requests = flattenRequests(requestSnap.val());
  backups = asObject(backupSnap.val());
  restorePlans = asObject(planSnap.val());
  externalBackups = asObject(externalSnap.val());
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
    if (verifyButton) {
      verifyButton.disabled = true;
      try {
        await getAdminFunctions().httpsCallable('verifyDeletionBackup')({ requestId: verifyButton.dataset.verifyBackup });
        await refresh(root);
      } catch (error) {
        alert(`무결성 검사에 실패했습니다. ${error.message || error}`);
        verifyButton.disabled = false;
      }
      return;
    }
    const dryRunButton = event.target.closest('[data-restore-dry-run]');
    if (!dryRunButton) return;
    dryRunButton.disabled = true;
    try {
      await getAdminFunctions().httpsCallable('generateRestoreDryRun')({ requestId: dryRunButton.dataset.restoreDryRun });
      await refresh(root);
    } catch (error) {
      alert(`복구 Dry Run에 실패했습니다. ${error.message || error}`);
      dryRunButton.disabled = false;
    }
  });
  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-external-backup]');
    if (!form) return;
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      await getAdminFunctions().httpsCallable('registerExternalBackupEvidence')({
        requestId: form.dataset.externalBackup,
        provider: form.elements.provider.value,
        objectRef: form.elements.objectRef.value.trim(),
        checksum: form.elements.checksum.value.trim(),
        capturedAt: new Date(form.elements.capturedAt.value).getTime()
      });
      await refresh(root);
    } catch (error) {
      alert(`외부 백업 증빙 등록에 실패했습니다. ${error.message || error}`);
      submit.disabled = false;
    }
  });
}
