import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a12-1-lifecycle-observer-20260719';
import { asObject, escapeHtml, formatDateTime, latestNumber, compactId } from '../admin-utils.js?v=admin-2-0-a12-1-lifecycle-observer-20260719';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const MEANINGFUL_ROOM_KEYS = new Set([
  'days', 'dayAdmin', 'chat', 'chats', 'messages', 'chatMessages', 'customCards',
  'missionLibrary', 'subRoutines', 'subRoutineDays', 'anniversaries', 'deletedRecords',
  'photos', 'history', 'records', 'ownerNotes'
]);

let analysis = null;
let activeFilter = 'all';

function values(value) {
  return Object.values(asObject(value));
}

function ageDays(timestamp) {
  if (!timestamp) return null;
  return Math.max(0, Math.floor((NOW - Number(timestamp)) / DAY));
}

function hasContent(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.some(hasContent);
  return Object.values(asObject(value)).some(hasContent);
}

function findLatestTimestamp(value, depth = 0) {
  if (depth > 7 || value == null) return 0;
  if (typeof value === 'number') {
    return value > 946684800000 && value < 4102444800000 ? value : 0;
  }
  if (typeof value !== 'object') return 0;
  return Object.entries(value).reduce((latest, [key, child]) => {
    if (/^(updatedAt|createdAt|lastSeen|joinedAt|requestedAt|timestamp|sentAt|savedAt)$/i.test(key)) {
      return Math.max(latest, Number(child) || 0);
    }
    return Math.max(latest, findLatestTimestamp(child, depth + 1));
  }, 0);
}

function roomHasMeaningfulData(room) {
  return Object.entries(asObject(room)).some(([key, value]) => MEANINGFUL_ROOM_KEYS.has(key) && hasContent(value));
}

function userProfile(raw) {
  const base = asObject(raw);
  return { ...base, ...asObject(base.profile) };
}

function candidate(kind, targetType, targetId, title, reason, details, severity = 'watch') {
  return { kind, targetType, targetId, title, reason, details, severity };
}

async function loadAnalysis() {
  const database = getAdminDatabase();
  const [usersSnap, roomsSnap, membersSnap, userRoomsSnap] = await Promise.all([
    database.ref('users').once('value'),
    database.ref('rooms').once('value'),
    database.ref('roomMembers').once('value'),
    database.ref('userRooms').once('value')
  ]);
  const users = asObject(usersSnap.val());
  const rooms = asObject(roomsSnap.val());
  const roomMembers = asObject(membersSnap.val());
  const userRooms = asObject(userRoomsSnap.val());
  const roomCodes = new Set([...Object.keys(rooms), ...Object.keys(roomMembers)]);
  const userRoomMap = {};

  Object.entries(userRooms).forEach(([uid, linked]) => {
    userRoomMap[uid] = new Set(Object.keys(asObject(linked)));
  });
  Object.entries(roomMembers).forEach(([roomCode, members]) => {
    Object.keys(asObject(members)).forEach((uid) => {
      if (!userRoomMap[uid]) userRoomMap[uid] = new Set();
      userRoomMap[uid].add(roomCode);
    });
  });

  const roomRows = [...roomCodes].map((roomCode) => {
    const room = asObject(rooms[roomCode]);
    const members = asObject(roomMembers[roomCode]);
    const memberRows = Object.entries(members).map(([uid, memberRaw]) => {
      const member = asObject(memberRaw);
      const profile = userProfile(users[uid]);
      const lastActivityAt = latestNumber(
        member.presence?.lastSeen, member.presence?.updatedAt, member.lastSeen,
        member.updatedAt, member.joinedAt, profile.lastSeen, profile.updatedAt, profile.createdAt
      );
      return { uid, email: profile.email || member.email || '', lastActivityAt };
    });
    const meaningful = roomHasMeaningfulData(room);
    const roomLatest = findLatestTimestamp(room);
    const lastActivityAt = latestNumber(roomLatest, ...memberRows.map((item) => item.lastActivityAt));
    return {
      roomCode, room, members: memberRows, meaningful, lastActivityAt,
      createdAt: latestNumber(room.meta?.createdAt, room.createdAt, ...memberRows.map((item) => asObject(members[item.uid]).joinedAt))
    };
  });

  const candidates = [];
  const protectedRooms = roomRows.filter((room) => room.meaningful).length;

  roomRows.forEach((room) => {
    const createdAge = ageDays(room.createdAt);
    const inactiveDays = ageDays(room.lastActivityAt);
    if (room.members.length <= 1 && !room.meaningful && createdAge != null && createdAge >= 3) {
      candidates.push(candidate('empty_room', 'room', room.roomCode, '빈 Room', `${createdAge}일 동안 상대방과 기록이 없습니다.`, [`멤버 ${room.members.length}명`, '의미 있는 데이터 없음', `최근 활동 ${inactiveDays ?? '-'}일 전`], createdAge >= 7 ? 'review' : 'watch'));
    } else if (room.members.length >= 2 && !room.meaningful && inactiveDays != null && inactiveDays >= 7) {
      candidates.push(candidate('dormant_room', 'room', room.roomCode, '휴면 Room 후보', `두 사용자 모두 확인할 활동이 ${inactiveDays}일 동안 없습니다.`, [`멤버 ${room.members.length}명`, '의미 있는 데이터 없음', '자동 삭제 대상 아님'], 'watch'));
    }
  });

  Object.entries(users).forEach(([uid, raw]) => {
    const profile = userProfile(raw);
    const linkedRooms = [...(userRoomMap[uid] || new Set())];
    const memberActivity = roomRows.flatMap((room) => room.members.filter((member) => member.uid === uid).map((member) => member.lastActivityAt));
    const createdAt = latestNumber(profile.createdAt, profile.registeredAt);
    const lastActivityAt = latestNumber(profile.lastSeen, profile.updatedAt, createdAt, ...memberActivity);
    const createdAge = ageDays(createdAt);
    const inactiveDays = ageDays(lastActivityAt);
    const verified = profile.emailVerified === true || profile.emailVerificationRequired !== true;
    const ownedRooms = roomRows.filter((room) => {
      const member = asObject(asObject(roomMembers[room.roomCode])[uid]);
      return member.role === 'owner' || member.relationshipRole === 'dom';
    });

    if (!linkedRooms.length && !verified && createdAge != null && createdAge >= 3) {
      candidates.push(candidate('browse_account', 'user', uid, '둘러보기 계정', `${createdAge}일 전에 가입했지만 인증과 Room 연결이 없습니다.`, [profile.email || '이메일 정보 없음', 'Room 0개', `최근 활동 ${inactiveDays ?? '-'}일 전`], createdAge >= 7 ? 'review' : 'watch'));
    } else if (!linkedRooms.length && inactiveDays != null && inactiveDays >= 7) {
      candidates.push(candidate('unused_account', 'user', uid, '미사용 계정 후보', `${inactiveDays}일 동안 Room 연결과 의미 있는 활동이 없습니다.`, [profile.email || '이메일 정보 없음', 'Room 0개', verified ? '이메일 확인됨' : '이메일 미확인'], 'review'));
    }

    if (ownedRooms.length >= 3) {
      const emptyOwned = ownedRooms.filter((room) => !room.meaningful && room.members.length <= 1).length;
      candidates.push(candidate('excessive_creation', 'user', uid, 'Room 생성 점검', `소유 Room이 ${ownedRooms.length}개입니다.`, [profile.email || compactId(uid), `빈 1인 Room ${emptyOwned}개`, '24시간 생성 횟수는 다음 단계에서 서버 기록 필요'], emptyOwned >= 2 ? 'review' : 'watch'));
    }
  });

  return {
    generatedAt: Date.now(), candidates, protectedRooms,
    totals: { users: Object.keys(users).length, rooms: roomRows.length },
    counts: {
      browse_account: candidates.filter((item) => item.kind === 'browse_account').length,
      unused_account: candidates.filter((item) => item.kind === 'unused_account').length,
      empty_room: candidates.filter((item) => item.kind === 'empty_room').length,
      dormant_room: candidates.filter((item) => item.kind === 'dormant_room').length,
      excessive_creation: candidates.filter((item) => item.kind === 'excessive_creation').length
    }
  };
}

const FILTERS = [
  ['all', '전체'], ['account', '계정 후보'], ['room', 'Room 후보'],
  ['excessive_creation', '생성 점검'], ['review', '검토 우선']
];

function visibleCandidates() {
  if (activeFilter === 'all') return analysis.candidates;
  if (activeFilter === 'account') return analysis.candidates.filter((item) => item.targetType === 'user');
  if (activeFilter === 'room') return analysis.candidates.filter((item) => item.targetType === 'room');
  if (activeFilter === 'review') return analysis.candidates.filter((item) => item.severity === 'review');
  return analysis.candidates.filter((item) => item.kind === activeFilter);
}

function renderCandidate(item) {
  const statusClass = item.severity === 'review' ? 'warn' : 'pending';
  return `
    <article class="admin-lifecycle-card">
      <div class="admin-lifecycle-head">
        <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.reason)}</p></div>
        <span class="admin-status-pill ${statusClass}">${item.severity === 'review' ? '검토 우선' : '관찰'}</span>
      </div>
      <div class="admin-lifecycle-target"><span>${item.targetType === 'user' ? '사용자' : 'Room'}</span><code title="${escapeHtml(item.targetId)}">${escapeHtml(compactId(item.targetId, 12, 8))}</code></div>
      <ul>${item.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join('')}</ul>
      <p class="admin-lifecycle-readonly">읽기 전용 · 자동 처리 없음</p>
    </article>`;
}

function renderShell() {
  const items = visibleCandidates();
  return `
    <section class="module-view admin-stack" aria-labelledby="lifecycleHeading">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">◉</div>
        <div><h2 id="lifecycleHeading">데이터 수명주기 관찰 센터</h2><p>베타 기간 동안 빈 계정·빈 Room·과다 생성 가능성을 관찰합니다. 데이터 변경, 휴면, 삭제는 실행하지 않습니다.</p></div>
      </section>
      <section class="admin-grid admin-grid-4 admin-lifecycle-metrics">
        <article class="admin-card admin-metric"><span>관찰 후보</span><strong>${analysis.candidates.length}</strong><small>자동 처리 없음</small></article>
        <article class="admin-card admin-metric"><span>계정 후보</span><strong>${analysis.counts.browse_account + analysis.counts.unused_account}</strong><small>전체 사용자 ${analysis.totals.users}명</small></article>
        <article class="admin-card admin-metric"><span>Room 후보</span><strong>${analysis.counts.empty_room + analysis.counts.dormant_room}</strong><small>전체 Room ${analysis.totals.rooms}개</small></article>
        <article class="admin-card admin-metric"><span>보존 Room</span><strong>${analysis.protectedRooms}</strong><small>기록 데이터 감지</small></article>
      </section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div><h2>베타 관찰 기준</h2><p>가입 3일 후 미인증·미연결 계정, 3일 이상 비어 있는 1인 Room, 7일 이상 무활동 후보, 소유 Room 3개 이상을 표시합니다.</p></div>
          <span class="admin-status-pill muted">Dry Run</span>
        </div>
        <div class="admin-lifecycle-policy-grid">
          <div><strong>둘러보기 계정</strong><span>${analysis.counts.browse_account}</span></div>
          <div><strong>미사용 계정</strong><span>${analysis.counts.unused_account}</span></div>
          <div><strong>빈 Room</strong><span>${analysis.counts.empty_room}</span></div>
          <div><strong>휴면 Room</strong><span>${analysis.counts.dormant_room}</span></div>
          <div><strong>생성 점검</strong><span>${analysis.counts.excessive_creation}</span></div>
        </div>
      </section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head"><div><h2>관찰 후보</h2><p>후보가 된 이유와 사용된 신호를 확인합니다.</p></div><small>분석 ${escapeHtml(formatDateTime(analysis.generatedAt))}</small></div>
        <div class="admin-segment-row">${FILTERS.map(([id, label]) => `<button class="admin-chip${activeFilter === id ? ' is-active' : ''}" type="button" data-lifecycle-filter="${id}">${label}</button>`).join('')}</div>
        <div class="admin-lifecycle-list">${items.length ? items.map(renderCandidate).join('') : '<div class="state-card"><strong>현재 조건에 맞는 후보가 없습니다.</strong><p>다른 분류를 선택하거나 다음 분석 시점에 다시 확인하세요.</p></div>'}</div>
      </section>
      <section class="admin-warning-box">이 화면의 결과는 운영 판단을 돕는 후보입니다. 후보로 표시되었다는 이유만으로 계정이나 Room을 삭제해서는 안 됩니다.</section>
    </section>`;
}

export async function render() {
  analysis = await loadAnalysis();
  return renderShell();
}

export function afterRender(root) {
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-lifecycle-filter]');
    if (!button) return;
    activeFilter = button.dataset.lifecycleFilter || 'all';
    root.innerHTML = renderShell();
  });
}
