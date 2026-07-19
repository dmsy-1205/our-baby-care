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
        <div class="admin-hero-icon">◉</div>
        <div>
          <h2 id="dashboardHeading">데이터 수명주기 관찰 모드</h2>
          <p>관리자 인증을 통과한 계정만 접근할 수 있습니다. 베타 기간에는 정책별 영향과 휴면 예정일을 미리 계산하며 데이터 변경·휴면·삭제를 실행하지 않습니다.</p>
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
            <h2>STEP A12.2 적용 범위</h2>
            <p>관찰 후보의 기간 기준을 조정하고 안내 예정일, 휴면 유예 종료일, 관련 데이터 경로를 읽기 전용으로 미리 확인합니다.</p>
          </div>
          <span class="admin-status-pill muted">Read Only</span>
        </div>
        <div class="admin-grid admin-grid-4">
          <div class="admin-soft-card">✓ 정책 기간 조정</div>
          <div class="admin-soft-card">✓ 후보 재계산</div>
          <div class="admin-soft-card">✓ 안내 예정일</div>
          <div class="admin-soft-card">✓ 휴면 유예 종료일</div>
          <div class="admin-soft-card">✓ 영향 경로 표시</div>
          <div class="admin-soft-card">✓ 보호·제외 검토</div>
          <div class="admin-soft-card">✓ 서버 저장 없음</div>
          <div class="admin-soft-card">✓ Dry Run 전용</div>
        </div>
      </section>

      <section class="admin-card admin-panel">
        <h2>운영 요약</h2>
        <p>데이터 요청 ${data.requests}건, 감사 로그 ${data.auditLogs}건을 읽을 수 있습니다. 데이터 수명주기 메뉴에서 정책별 영향을 안전하게 비교할 수 있습니다.</p>
      </section>
    </section>
  `;
}
