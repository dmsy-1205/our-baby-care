import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a10-recovery-clean-20260719';
import { getState } from '../admin-state.js';
import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a10-recovery-clean-20260719';

const ADMIN_CACHE_KEY = 'admin-2-0-a10-recovery-clean-20260719';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

async function loadSystemStatus() {
  const database = getAdminDatabase();
  const paths = [
    ['사용자', 'users'],
    ['Room 멤버십', 'roomMembers'],
    ['데이터 요청', 'dataDeleteRequests'],
    ['감사 로그', 'adminAuditLogs']
  ];
  const results = await Promise.all(paths.map(async ([label, path]) => {
    try {
      const snap = await database.ref(path).once('value');
      return { label, path, ok: true, count: Object.keys(asObject(snap.val())).length };
    } catch (error) {
      return { label, path, ok: false, count: 0, error: error?.message || String(error) };
    }
  }));

  const [users, roomMembers, requests] = results;
  return { results, users, roomMembers, requests };
}

export async function render() {
  const state = getState();
  const status = await loadSystemStatus();
  const release = window.HM_RELEASE || {};
  const failed = status.results.filter((item) => !item.ok).length;

  return `
    <section class="module-view" aria-labelledby="systemHeading">
      <div class="foundation-notice">
        <div><span class="notice-icon" aria-hidden="true">⚙</span></div>
        <div>
          <h2 id="systemHeading">시스템 · 운영 상태 점검판</h2>
          <p>관리자 앱의 연결, 인증, 주요 데이터 읽기 상태를 확인합니다. 이 화면은 읽기 전용입니다.</p>
        </div>
      </div>

      <div class="metric-grid admin-system-metrics">
        <article class="metric-card"><span>Firebase 앱</span><strong>babyApp</strong><small>연결 확인</small></article>
        <article class="metric-card"><span>관리자 인증</span><strong>${state.user?.uid ? '정상' : '-'}</strong><small>UID ${escapeHtml(state.user?.uid || '-')}</small></article>
        <article class="metric-card"><span>읽기 점검</span><strong>${status.results.length - failed}/${status.results.length}</strong><small>주요 경로 읽기 가능</small></article>
        <article class="metric-card"><span>관리자 스텝</span><strong>STEP A10</strong><small>Recovery Clean</small></article>
      </div>

      <article class="panel">
        <div class="panel-header admin-system-panel-header">
          <div>
            <h2>운영 연결 상태</h2>
            <p>관리자 화면이 정상적으로 데이터를 읽을 수 있는지 확인합니다.</p>
          </div>
          <span class="phase-badge">Read Only</span>
        </div>
        <div class="admin-system-grid">
          <section class="admin-system-card">
            <h3>앱 기준</h3>
            <dl>
              <div><dt>메인앱 버전</dt><dd>${escapeHtml(release.step || 'STEP6.2.13.4')}</dd></div>
              <div><dt>관리자 스텝</dt><dd>STEP A10</dd></div>
              <div><dt>캐시 키</dt><dd>${escapeHtml(ADMIN_CACHE_KEY)}</dd></div>
              <div><dt>부팅 시간</dt><dd>${escapeHtml(state.bootedAt ? new Date(state.bootedAt).toLocaleString('ko-KR') : '-')}</dd></div>
            </dl>
          </section>
          <section class="admin-system-card">
            <h3>안전 기준</h3>
            <ul>
              <li>관리자 인증을 통과한 계정만 접근</li>
              <li>현재 화면에서는 데이터 저장 · 삭제 기능 없음</li>
              <li>주요 경로는 읽기 점검만 수행</li>
              <li>메인앱 버전은 관리자 스텝과 분리 관리</li>
            </ul>
          </section>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header"><div><h2>주요 데이터 경로 점검</h2><p>권한 또는 경로 문제가 생기면 여기서 먼저 확인합니다.</p></div></div>
        <div class="admin-system-path-list">
          ${status.results.map((item) => `
            <div class="admin-system-path-card">
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <p>${escapeHtml(item.path)}${item.error ? ` · ${escapeHtml(item.error)}` : ''}</p>
              </div>
              <div class="admin-system-path-result">
                <span class="admin-request-status ${item.ok ? 'ok' : 'danger'}">${item.ok ? '읽기 가능' : '읽기 실패'}</span>
                <strong>${item.count}건</strong>
              </div>
            </div>
          `).join('')}
        </div>
      </article>
    </section>`;
}
