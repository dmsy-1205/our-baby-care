export function render() {
  const release = window.HM_RELEASE || {};
  return `
    <section class="module-view" aria-labelledby="dashboardHeading">
      <div class="foundation-notice">
        <div><span class="notice-icon" aria-hidden="true">✓</span></div>
        <div>
          <h2 id="dashboardHeading">Secure Foundation 활성화</h2>
          <p>관리자 인증을 통과한 계정에만 이 화면이 생성됩니다. 현재 단계에서는 운영 데이터를 직접 삭제하지 않습니다.</p>
        </div>
      </div>
      <div class="metric-grid">
        <article class="metric-card"><span>관리자 인증</span><strong>정상</strong><small>/admins/{uid} 검증 완료</small></article>
        <article class="metric-card"><span>운영 모드</span><strong>읽기·검토 중심</strong><small>실제 삭제 기능 비활성</small></article>
        <article class="metric-card"><span>현재 메인앱</span><strong>${release.step || '-'}</strong><small>${release.appVersion || '-'}</small></article>
        <article class="metric-card"><span>관리자 스텝</span><strong>STEP A11</strong><small>Data Center Foundation</small></article>
      </div>
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2>이번 단계 적용 범위</h2>
            <p>메인앱은 STEP6.2.13.4 기준으로 유지하고, 관리자 앱의 데이터 점검 기능만 확장합니다.</p>
          </div>
        </div>
        <div class="check-grid">
          <div>✓ 메인앱 버전 동결</div>
          <div>✓ 관리자 앱 캐시 분리</div>
          <div>✓ 데이터 경로 읽기 점검</div>
          <div>✓ 위험 신호 요약</div>
          <div>✓ 실제 삭제 미연결</div>
          <div>✓ 감사·복구 기준 유지</div>
          <div>✓ 한글 인코딩 복구</div>
          <div>✓ 기능 중심 확장</div>
        </div>
      </article>
    </section>`;
}
