export function render() {
  const release = window.HM_RELEASE || {};
  return `
    <section class="module-view" aria-labelledby="dashboardHeading">
      <div class="foundation-notice">
        <span class="notice-icon" aria-hidden="true">🛡️</span>
        <div>
          <h2 id="dashboardHeading">관리자 센터 기준점</h2>
          <p>메인앱은 STEP6.2.13.4 기준을 유지하고, 관리자 앱만 STEP A12로 분리 운영합니다.</p>
        </div>
      </div>
      <div class="metric-grid">
        <article class="metric-card"><span>관리자 인증</span><strong>정상</strong><small>/admins/{uid} 검증</small></article>
        <article class="metric-card"><span>운영 모드</span><strong>읽기·검토 중심</strong><small>실제 삭제 기능 비활성</small></article>
        <article class="metric-card"><span>메인앱 기준</span><strong>${release.step || 'STEP6.2.13.4'}</strong><small>${release.appVersion || 'HearMe2nite v1.0'}</small></article>
        <article class="metric-card"><span>관리자 스텝</span><strong>STEP A12</strong><small>Action Guard</small></article>
      </div>
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2>이번 단계 적용 범위</h2>
            <p>데이터 요청 처리 화면에 안전 장치를 추가하고, 관리자 앱 인코딩과 캐시 기준을 A12로 통일했습니다.</p>
          </div>
        </div>
        <div class="check-grid">
          <div>✓ 메인앱 버전 유지</div>
          <div>✓ 관리자 앱 캐시 분리</div>
          <div>✓ 데이터 요청 상태 관리</div>
          <div>✓ 관리자 답변·메모 저장</div>
          <div>✓ 감사 로그 기록</div>
          <div>✓ 실제 삭제 기능 미연결</div>
          <div>✓ 깨진 한글 잔재 정리</div>
          <div>✓ 좌측 스텝 배지 표시</div>
        </div>
      </article>
    </section>`;
}
