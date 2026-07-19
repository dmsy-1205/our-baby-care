import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { asObject, countObject } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';

async function loadDashboardData() {
  const database = getAdminDatabase();
  const [usersSnap, roomsSnap, roomMembersSnap, requestsSnap, auditSnap] = await Promise.all([
    database.ref('users').once('value'),
    database.ref('rooms').once('value'),
    database.ref('roomMembers').once('value'),
    database.ref('dataDeleteRequests').once('value'),
    database.ref('adminAuditLogs').once('value').catch(() => ({ val: () => null }))
  ]);

  const users = asObject(usersSnap.val());
  const rooms = asObject(roomsSnap.val());
  const roomMembers = asObject(roomMembersSnap.val());
  const requestsRoot = asObject(requestsSnap.val());
  const auditLogs = asObject(auditSnap.val());
  const requests = Object.values(requestsRoot).flatMap((group) => Object.values(asObject(group)));
  const openRequests = requests.filter((item) => !['completed', 'rejected', 'canceled', 'cancelled'].includes(item?.status || 'pending')).length;

  return {
    users: countObject(users),
    rooms: countObject(rooms),
    roomMembers: Object.values(roomMembers).reduce((sum, members) => sum + countObject(members), 0),
    requests: requests.length,
    openRequests,
    auditLogs: countObject(auditLogs)
  };
}

export async function render() {
  const data = await loadDashboardData();

  return `
    <section class="module-view" aria-labelledby="dashboardHeading">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">✓</div>
        <div>
          <h2 id="dashboardHeading">Secure Foundation 활성화</h2>
          <p>관리자 인증을 통과한 계정에만 이 화면이 생성됩니다. 현재 관리자 콘솔은 메인앱 데이터를 직접 변경하지 않는 안전 모드입니다.</p>
        </div>
      </section>

      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>사용자</span><strong>${data.users}</strong><small>users 기준</small></article>
        <article class="admin-card admin-metric"><span>Room</span><strong>${data.rooms}</strong><small>rooms 기준</small></article>
        <article class="admin-card admin-metric"><span>Room 멤버</span><strong>${data.roomMembers}</strong><small>roomMembers 기준</small></article>
        <article class="admin-card admin-metric"><span>처리 필요</span><strong>${data.openRequests}</strong><small>열린 데이터 요청</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>1단계 적용 범위</h2>
            <p>기반 구조와 운영 점검 화면이 서로 독립된 모듈로 구성되어 있습니다.</p>
          </div>
          <span class="admin-status-pill muted">Read Only</span>
        </div>
        <div class="admin-grid admin-grid-4">
          <div class="admin-soft-card">✓ 안전한 인증 Gate</div>
          <div class="admin-soft-card">✓ 관리자 권한 검증</div>
          <div class="admin-soft-card">✓ 모듈 Router</div>
          <div class="admin-soft-card">✓ 공통 Sidebar</div>
          <div class="admin-soft-card">✓ 공통 Topbar</div>
          <div class="admin-soft-card">✓ 오류·빈 상태 UI</div>
          <div class="admin-soft-card">✓ 반응형 레이아웃</div>
          <div class="admin-soft-card">✓ 한글 인코딩 정리</div>
        </div>
      </section>

      <section class="admin-card admin-panel">
        <h2>운영 요약</h2>
        <p>데이터 요청 ${data.requests}건, 감사 로그 ${data.auditLogs}건을 읽을 수 있습니다. 실제 삭제와 복구 실행은 아직 연결하지 않았습니다.</p>
      </section>
    </section>
  `;
}
