export function render() {
  const release = window.HM_RELEASE || {};
  return `
    <section class="module-view" aria-labelledby="dashboardHeading">
      <div class="foundation-notice">
        <div><span class="notice-icon" aria-hidden="true">✓</span></div>
        <div><h2 id="dashboardHeading">Secure Foundation 활성화</h2><p>관리자 인증을 통과한 계정에만 이 화면이 생성됩니다. Phase 1에서는 운영 데이터 변경 기능을 제공하지 않습니다.</p></div>
      </div>
      <div class="metric-grid">
        <article class="metric-card"><span>관리자 인증</span><strong>정상</strong><small>/admins/{uid} 검증 완료</small></article>
        <article class="metric-card"><span>운영 모드</span><strong>읽기 전용</strong><small>쓰기 기능 비활성</small></article>
        <article class="metric-card"><span>현재 앱 버전</span><strong>${release.step || '-'}</strong><small>${release.appVersion || '-'}</small></article>
        <article class="metric-card"><span>관리자 센터</span><strong>2.0</strong><small>Phase 1 Foundation</small></article>
      </div>
      <article class="panel">
        <div class="panel-header"><div><h2>1단계 적용 범위</h2><p>다음 기반 구조가 서로 독립된 모듈로 구성되었습니다.</p></div></div>
        <div class="check-grid">
          <div>✓ 안전한 인증 Gate</div><div>✓ 관리자 권한 검증</div><div>✓ 모듈 Router</div><div>✓ 공통 Sidebar</div><div>✓ 공통 Topbar</div><div>✓ 오류·빈 상태 UI</div><div>✓ 반응형 레이아웃</div><div>✓ 다크모드 기반</div>
        </div>
      </article>
    </section>`;
}
