const STEP_LABEL = 'STEP A11.1.2 - Route Cleanup';
const ADMIN_CACHE_KEY = 'admin-2-0-a11-1-2-route-cleanup-20260719';

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
  if (!root) throw new Error('관리자 화면 컨테이너를 찾을 수 없습니다.');
  root.innerHTML = html;
}

function styles() {
  return `
    <style>
      .admin-clean-wrap{display:grid;gap:22px;max-width:1440px}
      .admin-clean-card{border:1px solid rgba(174,149,255,.25);background:rgba(31,35,52,.9);border-radius:18px;padding:22px;min-width:0}
      .admin-clean-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
      .admin-clean-title{font-size:26px;font-weight:900;margin:0 0 8px}
      .admin-clean-muted{color:#c9c3dd}
      .admin-clean-kpi{font-size:24px;font-weight:900;margin-top:8px;overflow-wrap:anywhere}
      .admin-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 10px;background:rgba(255,255,255,.05);margin:3px;max-width:100%;overflow-wrap:anywhere}
      .admin-clean-list{display:grid;gap:10px}
      .admin-clean-row{border:1px solid rgba(174,149,255,.2);background:rgba(255,255,255,.035);border-radius:14px;padding:14px;min-width:0}
      .admin-path{overflow-wrap:anywhere;word-break:break-word;line-height:1.55}
    </style>`;
}

export async function render(context = {}) {
  mount(context, `
    ${styles()}
    <section class="admin-clean-wrap">
      <div class="admin-clean-card">
        <p class="admin-clean-muted">BETA OPERATIONS</p>
        <h1 class="admin-clean-title">릴리스</h1>
        <p class="admin-clean-muted">메인 앱 버전과 관리자 앱 버전을 분리해서 확인합니다. 이 화면은 읽기 전용입니다.</p>
        <span class="admin-chip">${STEP_LABEL}</span>
      </div>
      <div class="admin-clean-grid">
        <div class="admin-clean-card"><div>메인 앱 버전</div><div class="admin-clean-kpi">STEP6.2.13.4</div><p class="admin-clean-muted">HearMe2nite v1.0 STEP6.2.13.4</p></div>
        <div class="admin-clean-card"><div>관리자 버전</div><div class="admin-clean-kpi">STEP A11.1.2</div><p class="admin-clean-muted">Route Cleanup</p></div>
        <div class="admin-clean-card"><div>릴리스 날짜</div><div class="admin-clean-kpi">2026.07.19</div><p class="admin-clean-muted">Beta</p></div>
        <div class="admin-clean-card"><div>캐시 키</div><div class="admin-clean-kpi admin-path">${ADMIN_CACHE_KEY}</div><p class="admin-clean-muted">관리자 앱 전용</p></div>
      </div>
      <div class="admin-clean-card">
        <h2>현재 릴리스 변경 내역</h2>
        <div class="admin-clean-list">
          <div class="admin-clean-row">관리자 라우팅 안정화</div>
          <div class="admin-clean-row">메인 앱 파일 변경 없음</div>
          <div class="admin-clean-row">감사 로그, 복구 센터, 릴리스, 시스템 화면의 독립 모듈 적용</div>
          <div class="admin-clean-row">긴 UID와 데이터 경로 줄바꿈 보호</div>
        </div>
      </div>
      <div class="admin-clean-card">
        <h2>배포 전 체크</h2>
        <div class="admin-clean-list">
          <div class="admin-clean-row">✓ 메인 앱 버전은 STEP6.2.13.4 기준 유지</div>
          <div class="admin-clean-row">✓ 관리자 콘솔 왼쪽 배지에서 현재 스텝 확인</div>
          <div class="admin-clean-row">✓ 실제 삭제와 복구 실행 기능은 아직 연결하지 않음</div>
          <div class="admin-clean-row">✓ 문제 발생 시 메인 앱 버전과 관리자 스텝을 분리해 롤백 판단</div>
        </div>
      </div>
    </section>`);
}

export default { render };
