import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-route-render-fix-20260719';

const ADMIN_STEP = 'STEP A11';
const ADMIN_LABEL = 'Data Center Readonly';
const ADMIN_CACHE_KEY = 'admin-2-0-a11-route-render-fix-20260719';
const MAIN_STEP = 'STEP6.2.13.4';
const MAIN_VERSION = 'HearMe2nite v1.0 STEP6.2.13.4';
const RELEASE_DATE = '2026.07.19';

function safeChanges(release) {
  const changes = Array.isArray(release.changes) ? release.changes : [];
  const fallback = [
    '관리자 공통 모듈 UTF-8 문자열 정리',
    '데이터 요청 관리 화면 상태·메모 저장 안정화',
    '시스템 화면에 데이터 관리 센터 읽기 점검 추가',
    '복구 센터를 실행 전 기준점 확인 화면으로 정리',
    '릴리스와 관리자 스텝을 메인앱 버전과 분리 표시',
    '메인앱 STEP6.2.13.4 기준 유지'
  ];

  return (changes.length ? changes : fallback).slice(0, 8);
}

export function render() {
  const release = window.HM_RELEASE || {};
  const changes = safeChanges(release);

  return `
    <section class="module-view" aria-labelledby="releaseHeading">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">⬆️</div>
        <div>
          <h2 id="releaseHeading">릴리스 센터 · 배포 기준판</h2>
          <p>메인앱 버전과 관리자 콘솔 스텝을 분리해서 확인합니다. 이 화면은 읽기 전용입니다.</p>
        </div>
      </section>

      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>메인앱 기준</span><strong>${MAIN_STEP}</strong><small>${MAIN_VERSION}</small></article>
        <article class="admin-card admin-metric"><span>관리자 기준</span><strong>${ADMIN_STEP}</strong><small>${ADMIN_LABEL}</small></article>
        <article class="admin-card admin-metric"><span>릴리스 날짜</span><strong>${RELEASE_DATE}</strong><small>Beta</small></article>
        <article class="admin-card admin-metric"><span>캐시 키</span><strong>A11</strong><small>${ADMIN_CACHE_KEY}</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>현재 배포 정보</h2>
            <p>관리자 업데이트가 메인앱 기준을 올리지 않았는지 확인하는 기준입니다.</p>
          </div>
          <span class="admin-status-pill muted">Read Only</span>
        </div>
        <div class="admin-grid admin-grid-2">
          <article class="admin-soft-card">
            <h3>메인앱 안정 기준</h3>
            <div class="admin-key-value"><span>제품</span><strong>HearMe2nite</strong></div>
            <div class="admin-key-value"><span>앱 버전</span><strong>${MAIN_VERSION}</strong></div>
            <div class="admin-key-value"><span>스텝</span><strong>${MAIN_STEP}</strong></div>
            <div class="admin-key-value"><span>빌드</span><strong>20260718</strong></div>
          </article>
          <article class="admin-soft-card">
            <h3>관리자 작업 기준</h3>
            <div class="admin-key-value"><span>관리자 스텝</span><strong>${ADMIN_STEP}</strong></div>
            <div class="admin-key-value"><span>작업명</span><strong>${ADMIN_LABEL}</strong></div>
            <div class="admin-key-value"><span>범위</span><strong>관리자 앱 전용</strong></div>
            <div class="admin-key-value"><span>실행 기능</span><strong>없음 · 읽기/메모/상태 저장 중심</strong></div>
          </article>
        </div>
      </section>

      <section class="admin-card admin-panel">
        <h2>배포 전 체크</h2>
        <p>GitHub 업로드 전에 메인앱과 관리자 앱 기준을 나눠 확인합니다.</p>
        <div class="admin-grid admin-grid-2">
          <div class="admin-check-row">✓ 메인앱 버전은 ${MAIN_STEP} 기준 유지</div>
          <div class="admin-check-row">✓ 관리자 캐시는 ${ADMIN_CACHE_KEY} 기준으로 갱신</div>
          <div class="admin-check-row">✓ 관리자 콘솔 좌측 배지에서 현재 스텝 확인</div>
          <div class="admin-check-row">✓ 실제 삭제·복구 실행 기능은 아직 연결하지 않음</div>
          <div class="admin-check-row">✓ 배포 후 관리자 메뉴별 화면 진입 확인</div>
          <div class="admin-check-row">✓ 문제가 생기면 메인앱 안정 기준과 관리자 스텝을 분리해서 롤백 판단</div>
        </div>
      </section>

      <section class="admin-card admin-panel">
        <h2>현재 릴리스 변경 내역</h2>
        <p>관리자 기준 파일에 등록된 변경 내역입니다.</p>
        <ul class="admin-change-list">
          ${changes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </section>
    </section>
  `;
}
