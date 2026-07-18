import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a10-system-status-baseline-20260718';

const ADMIN_RELEASE_STEP = 'STEP A10';
const ADMIN_RELEASE_LABEL = 'System Status Baseline';
const ADMIN_CACHE_KEY = 'admin-2-0-a10-system-status-baseline-20260718';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function renderReleaseChanges(changes) {
  if (!changes.length) {
    return '<li>등록된 변경 내역이 없습니다.</li>';
  }

  return changes.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

export function render() {
  const release = window.HM_RELEASE || {};
  const changes = asArray(release.changes);

  return `
    <section class="module-view" aria-labelledby="adminReleaseHeading">
      <div class="foundation-notice">
        <span class="notice-icon" aria-hidden="true">⬆</span>
        <div>
          <h2 id="adminReleaseHeading">릴리스 센터 · 배포 기준판</h2>
          <p>메인앱 버전과 관리자 콘솔 스텝을 분리해서 확인합니다. 이 화면은 읽기 전용입니다.</p>
        </div>
      </div>

      <div class="metric-grid admin-release-metrics">
        <article class="metric-card">
          <span>메인앱 기준</span>
          <strong>${escapeHtml(release.step || '-')}</strong>
          <small>${escapeHtml(release.appVersion || release.version || '-')}</small>
        </article>
        <article class="metric-card">
          <span>관리자 기준</span>
          <strong>${ADMIN_RELEASE_STEP}</strong>
          <small>${ADMIN_RELEASE_LABEL}</small>
        </article>
        <article class="metric-card">
          <span>릴리스 날짜</span>
          <strong>${escapeHtml(release.releaseDate || '-')}</strong>
          <small>${escapeHtml(release.stage || 'Beta')}</small>
        </article>
        <article class="metric-card">
          <span>캐시 키</span>
          <strong>A9</strong>
          <small>${ADMIN_CACHE_KEY}</small>
        </article>
      </div>

      <article class="panel">
        <div class="panel-header admin-release-panel-header">
          <div>
            <h2>현재 배포 정보</h2>
            <p>관리자 업데이트가 메인앱 버전을 올리지 않았는지 확인하는 기준입니다.</p>
          </div>
          <span class="phase-badge">Read Only</span>
        </div>

        <div class="admin-release-grid">
          <section class="admin-release-card">
            <h3>메인앱 안정 기준</h3>
            <dl>
              <div><dt>제품</dt><dd>${escapeHtml(release.product || 'HearMe2nite')}</dd></div>
              <div><dt>앱 버전</dt><dd>${escapeHtml(release.appVersion || release.version || '-')}</dd></div>
              <div><dt>스텝</dt><dd>${escapeHtml(release.step || '-')}</dd></div>
              <div><dt>빌드</dt><dd>${escapeHtml(release.build || '-')}</dd></div>
            </dl>
          </section>

          <section class="admin-release-card">
            <h3>관리자 작업 기준</h3>
            <dl>
              <div><dt>관리자 스텝</dt><dd>${ADMIN_RELEASE_STEP}</dd></div>
              <div><dt>작업명</dt><dd>${ADMIN_RELEASE_LABEL}</dd></div>
              <div><dt>범위</dt><dd>관리자 앱 전용</dd></div>
              <div><dt>실행 기능</dt><dd>없음 · 읽기 전용</dd></div>
            </dl>
          </section>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header admin-release-panel-header">
          <div>
            <h2>배포 전 체크</h2>
            <p>GitHub 업로드 전에 메인앱과 관리자 앱 기준을 나눠 확인합니다.</p>
          </div>
        </div>
        <div class="admin-release-checks">
          <div>✓ 메인앱 버전은 ${escapeHtml(release.step || '기존 안정 버전')} 기준 유지</div>
          <div>✓ 관리자 캐시는 ${ADMIN_CACHE_KEY} 기준으로 갱신</div>
          <div>✓ 관리자 콘솔 좌측 배지에서 현재 스텝 확인</div>
          <div>✓ 실제 삭제·복구 실행 기능은 아직 연결하지 않음</div>
          <div>✓ 배포 후 관리자 메뉴별 화면 진입 확인</div>
          <div>✓ 문제가 생기면 메인앱 안정 기준과 관리자 스텝을 분리해서 롤백 판단</div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header admin-release-panel-header">
          <div>
            <h2>현재 릴리스 변경 내역</h2>
            <p>메인앱 기준 파일에 등록된 변경 내역입니다.</p>
          </div>
        </div>
        <ul class="admin-release-changes">
          ${renderReleaseChanges(changes)}
        </ul>
      </article>
    </section>`;
}
