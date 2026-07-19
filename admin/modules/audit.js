const STEP_LABEL = 'STEP A11.1.2 - Route Cleanup';

function resolveRoot(context = {}) {
  return context.root || context.container || context.mount || context.app || context.el ||
    document.querySelector('[data-admin-view]') ||
    document.getElementById('admin-view') ||
    document.getElementById('admin-content') ||
    document.querySelector('.admin-main') ||
    document.querySelector('main') ||
    document.body;
}

function mount(context, html) {
  const root = resolveRoot(context);
  if (!root) {
    throw new Error('관리자 화면 컨테이너를 찾을 수 없습니다.');
  }
  root.innerHTML = html;
}

function database() {
  if (!window.firebase || !firebase.apps || !firebase.apps.length) {
    return null;
  }
  return firebase.database();
}

async function readPath(path) {
  const db = database();
  if (!db) {
    return null;
  }
  const snap = await db.ref(path).once('value');
  return snap.val();
}

function flattenRecords(value, parentKey = '') {
  if (!value || typeof value !== 'object') {
    return [];
  }
  return Object.entries(value).flatMap(([key, item]) => {
    if (item && typeof item === 'object') {
      const looksLikeRecord =
        'status' in item || 'type' in item || 'requestType' in item ||
        'createdAt' in item || 'updatedAt' in item || 'timestamp' in item ||
        'action' in item || 'email' in item || 'roomCode' in item ||
        'uid' in item || 'adminMessage' in item || 'internalMemo' in item;
      if (looksLikeRecord) {
        return [{ id: key, parentKey, ...item }];
      }
      return flattenRecords(item, key);
    }
    return [{ id: key, parentKey, value: item }];
  });
}

function esc(value) {
  return String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fmtTime(value) {
  if (!value) {
    return '-';
  }
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleString('ko-KR');
}

function recordTime(record) {
  return record.updatedAt || record.createdAt || record.timestamp || record.time || 0;
}

function styles() {
  return `
    <style>
      .admin-clean-wrap{display:grid;gap:22px;max-width:1440px}
      .admin-clean-card{border:1px solid rgba(174,149,255,.25);background:rgba(31,35,52,.9);border-radius:18px;padding:22px;min-width:0}
      .admin-clean-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
      .admin-clean-title{font-size:26px;font-weight:900;margin:0 0 8px}
      .admin-clean-muted{color:#c9c3dd}
      .admin-clean-kpi{font-size:28px;font-weight:900;margin-top:8px}
      .admin-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.05);margin:3px;max-width:100%;overflow-wrap:anywhere}
      .admin-clean-list{display:grid;gap:12px}
      .admin-clean-row{border:1px solid rgba(174,149,255,.2);background:rgba(255,255,255,.035);border-radius:16px;padding:16px;min-width:0}
      .admin-path{overflow-wrap:anywhere;word-break:break-word;line-height:1.55}
      .admin-warning{border-color:rgba(255,197,96,.35);background:rgba(255,197,96,.08);color:#ffd58a}
    </style>
  `;
}

function logRow(record) {
  const title = record.title || record.action || record.event || record.status || '관리자 작업';
  const status = record.status || record.nextStatus || record.result || '-';
  const target = record.roomCode || record.uid || record.requestId || record.id;
  return `
    <article class="admin-clean-row">
      <strong>${esc(title)}</strong>
      <span class="admin-chip">${esc(status)}</span>
      <span class="admin-chip">${fmtTime(recordTime(record))}</span>
      <div class="admin-path admin-clean-muted">
        ${target ? `대상 ${esc(target)}` : '대상 정보 없음'}
      </div>
      <div>
        ${record.requestType || record.type ? `<span class="admin-chip">유형 ${esc(record.requestType || record.type)}</span>` : ''}
        ${record.adminUid ? `<span class="admin-chip">관리자 ${esc(record.adminUid)}</span>` : ''}
        ${record.requesterEmail || record.email ? `<span class="admin-chip">요청자 ${esc(record.requesterEmail || record.email)}</span>` : ''}
      </div>
    </article>
  `;
}

export async function render(context = {}) {
  const [auditRaw, requestsRaw] = await Promise.all([
    readPath('adminAuditLogs'),
    readPath('dataDeleteRequests'),
  ]);

  const logs = flattenRecords(auditRaw)
    .sort((a, b) => Number(recordTime(b) || 0) - Number(recordTime(a) || 0))
    .slice(0, 80);
  const requests = flattenRecords(requestsRaw);
  const approveCount = logs.filter((item) => String(item.status || item.action || '').includes('approve') || String(item.status || '').includes('approved')).length;
  const latest = logs[0] ? fmtTime(recordTime(logs[0])) : '-';

  mount(context, `
    ${styles()}
    <section class="admin-clean-wrap">
      <div class="admin-clean-card">
        <p class="admin-clean-muted">BETA OPERATIONS</p>
        <h1 class="admin-clean-title">감사 로그</h1>
        <p class="admin-clean-muted">관리자 요청 처리 과정에서 누가, 언제, 어떤 상태를 남겼는지 확인합니다. 실제 삭제 실행 전 기준점으로 사용합니다.</p>
        <span class="admin-chip">${STEP_LABEL}</span>
      </div>

      <div class="admin-clean-grid">
        <div class="admin-clean-card"><div>최근 로그</div><div class="admin-clean-kpi">${logs.length}</div><p class="admin-clean-muted">최대 80개 표시</p></div>
        <div class="admin-clean-card"><div>데이터 요청</div><div class="admin-clean-kpi">${requests.length}</div><p class="admin-clean-muted">요청관리 작업</p></div>
        <div class="admin-clean-card"><div>승인 기록</div><div class="admin-clean-kpi">${approveCount}</div><p class="admin-clean-muted">실행 전 검토 기준</p></div>
        <div class="admin-clean-card"><div>최근 작업</div><div class="admin-clean-kpi">${latest}</div><p class="admin-clean-muted">마지막 로그 시간</p></div>
      </div>

      <div class="admin-clean-card">
        <h2>최근 관리자 작업</h2>
        <p class="admin-clean-muted">요청관리의 답변, 메모, 상태 변경 기록을 최신순으로 보여줍니다.</p>
        <div class="admin-clean-list">
          ${logs.length ? logs.map(logRow).join('') : '<div class="admin-clean-row admin-clean-muted">감사 로그가 없습니다.</div>'}
        </div>
      </div>
    </section>
  `);
}

export default { render };
