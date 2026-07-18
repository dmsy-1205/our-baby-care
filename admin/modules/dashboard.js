import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-data-center-readonly-20260719';
import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-data-center-readonly-20260719';

function asObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function flattenRequests(root) {
  return Object.values(asObject(root)).flatMap((byUser) => Object.values(asObject(byUser)));
}

async function readCounts() {
  const database = getAdminDatabase();
  const [usersSnap, roomsSnap, roomMembersSnap, requestsSnap, auditSnap] = await Promise.all([
    database.ref('users').once('value'),
    database.ref('rooms').once('value'),
    database.ref('roomMembers').once('value'),
    database.ref('dataDeleteRequests').once('value'),
    database.ref('adminAuditLogs').limitToLast(1).once('value').catch(() => ({ val: () => null }))
  ]);

  const users = asObject(usersSnap.val());
  const rooms = asObject(roomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const requests = flattenRequests(requestsSnap.val());
  const openRequests = requests.filter((item) => !['completed', 'rejected', 'canceled', 'cancelled'].includes(item?.status || 'pending'));

  return {
    users: Object.keys(users).length,
    rooms: new Set([...Object.keys(rooms), ...Object.keys(roomMembers)]).size,
    roomMembers: Object.values(roomMembers).reduce((sum, members) => sum + Object.keys(asObject(members)).length, 0),
    requests: requests.length,
    openRequests: openRequests.length,
    auditReady: Object.keys(asObject(auditSnap.val())).length > 0
  };
}

export async function render() {
  const counts = await readCounts();
  const release = window.HM_RELEASE || {};
  return `
    <section class="module-view" aria-labelledby="dashboardHeading">
      <div class="foundation-notice">
        <div><span class="notice-icon" aria-hidden="true">✓</span></div>
        <div>
          <h2 id="dashboardHeading">Secure Foundation 활성화</h2>
          <p>관리자 인증을 통과한 계정만 이 화면에 접근합니다. 현재 단계는 메인앱을 변경하지 않고 운영 데이터를 읽고 점검합니다.</p>
        </div>
      </div>

      <div class="metric-grid">
        <article class="metric-card"><span>전체 사용자</span><strong>${counts.users}</strong><small>users 기준</small></article>
        <article class="metric-card"><span>전체 Room</span><strong>${counts.rooms}</strong><small>rooms · roomMembers 통합</small></article>
        <article class="metric-card"><span>데이터 요청</span><strong>${counts.requests}</strong><small>열린 요청 ${counts.openRequests}건</small></article>
        <article class="metric-card"><span>메인앱 기준</span><strong>${escapeHtml(release.step || 'STEP6.2.13.4')}</strong><small>관리자 작업과 분리 유지</small></article>
      </div>

      <article class="panel">
        <div class="panel-header">
          <div>
            <h2>운영 기준</h2>
            <p>이번 관리자 앱은 메인앱을 건드리지 않고, 데이터 구조를 읽어서 검토하는 기준점입니다.</p>
          </div>
          <span class="phase-badge">Read Only 중심</span>
        </div>
        <div class="check-grid">
          <div>✓ 관리자 인증 Gate</div>
          <div>✓ 사용자 목록 읽기</div>
          <div>✓ Room 관계 점검</div>
          <div>✓ 데이터 요청 검토</div>
          <div>✓ 복구 기준점 확인</div>
          <div>✓ 감사 로그 확인</div>
          <div>✓ 릴리스 기준 분리</div>
          <div>✓ 시스템 상태 점검</div>
        </div>
      </article>
    </section>`;
}
