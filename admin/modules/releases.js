import { ADMIN_RELEASE } from '../admin-release.js?v=admin-2-0-a17-2-1-duplicate-reply-guard-20260721';

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

export function render() {
  return `
    ${styles()}
    <section class="admin-clean-wrap">
      <div class="admin-clean-card">
        <p class="admin-clean-muted">BETA OPERATIONS</p>
        <h1 class="admin-clean-title">릴리스</h1>
        <p class="admin-clean-muted">메인 앱 버전과 관리자 앱 버전을 분리해서 확인합니다. 이 화면은 읽기 전용입니다.</p>
        <span class="admin-chip">${ADMIN_RELEASE.step} · ${ADMIN_RELEASE.label}</span>
      </div>
      <div class="admin-clean-grid">
        <div class="admin-clean-card"><div>메인 앱 버전</div><div class="admin-clean-kpi">STEP6.2.13.4</div><p class="admin-clean-muted">HearMe2nite v1.0 STEP6.2.13.4</p></div>
        <div class="admin-clean-card"><div>관리자 버전</div><div class="admin-clean-kpi">${ADMIN_RELEASE.step}</div><p class="admin-clean-muted">${ADMIN_RELEASE.label}</p></div>
        <div class="admin-clean-card"><div>릴리스 날짜</div><div class="admin-clean-kpi">${ADMIN_RELEASE.releaseDate}</div><p class="admin-clean-muted">${ADMIN_RELEASE.stage}</p></div>
        <div class="admin-clean-card"><div>캐시 키</div><div class="admin-clean-kpi admin-path">${ADMIN_RELEASE.cacheKey}</div><p class="admin-clean-muted">관리자 앱 전용</p></div>
      </div>
      <div class="admin-clean-card">
        <h2>현재 릴리스 변경 내역</h2>
        <div class="admin-clean-list">
          ${ADMIN_RELEASE.changes.map((change) => `<div class="admin-clean-row">${change}</div>`).join('')}
        </div>
      </div>
      <div class="admin-clean-card">
        <h2>배포 전 체크</h2>
        <div class="admin-clean-list">
          <div class="admin-clean-row">✓ 메인 앱 버전은 STEP6.2.13.4 기준 유지</div>
          <div class="admin-clean-row">✓ 관리자 콘솔 왼쪽 배지에서 현재 스텝 확인</div>
          <div class="admin-clean-row">✓ 영구 삭제 실행 모드 ${ADMIN_RELEASE.deletionMode}</div>
          <div class="admin-clean-row">✓ 문제 발생 시 메인 앱 버전과 관리자 스텝을 분리해 롤백 판단</div>
        </div>
      </div>
    </section>`;
}

export default { render };
