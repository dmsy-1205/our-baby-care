import { getAdminDatabase } from '../admin-api.js?v=admin-2-0-a13-2-approval-queue-visibility-20260719';
import { asObject, escapeHtml, formatDateTime, latestNumber, compactId } from '../admin-utils.js?v=admin-2-0-a13-2-approval-queue-visibility-20260719';

const DAY = 24 * 60 * 60 * 1000;
const MEANINGFUL_ROOM_KEYS = new Set([
  'days', 'dayAdmin', 'chat', 'chats', 'messages', 'chatMessages', 'customCards',
  'missionLibrary', 'subRoutines', 'subRoutineDays', 'anniversaries', 'deletedRecords',
  'photos', 'history', 'records', 'ownerNotes'
]);

let analysis = null;
let activeFilter = 'all';
let policy = {
  browseAccountDays: 3,
  unusedAccountDays: 7,
  emptyRoomDays: 3,
  dormantRoomDays: 7,
  noticeDays: 7,
  dormantGraceDays: 30,
  excessiveRoomCount: 3
};
const reviewStates = new Map();

function values(value) {
  return Object.values(asObject(value));
}

function ageDays(timestamp) {
  if (!timestamp) return null;
  return Math.max(0, Math.floor((Date.now() - Number(timestamp)) / DAY));
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

function candidate(kind, targetType, targetId, title, reason, details, severity = 'watch', lastActivityAt = 0, linkedRooms = [], accountStatus = 'active') {
  const root = targetType === 'user' ? `users/${targetId}` : `rooms/${targetId}`;
  const paths = targetType === 'user'
    ? [root, `userRooms/${targetId}`]
    : [root, `roomMembers/${targetId}`];
  return { kind, targetType, targetId, title, reason, details, severity, lastActivityAt, paths, linkedRooms, accountStatus };
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
    if (room.members.length <= 1 && !room.meaningful && createdAge != null && createdAge >= policy.emptyRoomDays) {
      candidates.push(candidate('empty_room', 'room', room.roomCode, '빈 Room', `${createdAge}일 동안 상대방과 기록이 없습니다.`, [`멤버 ${room.members.length}명`, '의미 있는 데이터 없음', `최근 활동 ${inactiveDays ?? '-'}일 전`], createdAge >= policy.emptyRoomDays + policy.noticeDays ? 'review' : 'watch', room.lastActivityAt || room.createdAt));
    } else if (room.members.length >= 2 && !room.meaningful && inactiveDays != null && inactiveDays >= policy.dormantRoomDays) {
      candidates.push(candidate('dormant_room', 'room', room.roomCode, '휴면 Room 후보', `두 사용자 모두 확인할 활동이 ${inactiveDays}일 동안 없습니다.`, [`멤버 ${room.members.length}명`, '의미 있는 데이터 없음', '자동 삭제 대상 아님'], 'watch', room.lastActivityAt));
    }
  });

  Object.entries(users).forEach(([uid, raw]) => {
    const profile = userProfile(raw);
    const linkedRooms = [...(userRoomMap[uid] || new Set())];
    const memberActivity = roomRows.flatMap((room) => room.members.filter((member) => member.uid === uid).map((member) => member.lastActivityAt));
    const createdAt = latestNumber(profile.createdAt, profile.registeredAt);
    const lastActivityAt = latestNumber(profile.lastSeen, profile.updatedAt, profile.lifecycle?.lastLoginAt, profile.lifecycle?.restoredAt, createdAt, ...memberActivity);
    const createdAge = ageDays(createdAt);
    const inactiveDays = ageDays(lastActivityAt);
    const verified = profile.emailVerified === true || profile.emailVerificationRequired !== true;
    const accountStatus = asObject(profile.lifecycle).status || 'active';
    const ownedRooms = roomRows.filter((room) => {
      const member = asObject(asObject(roomMembers[room.roomCode])[uid]);
      return member.role === 'owner' || member.relationshipRole === 'dom';
    });

    if (!linkedRooms.length && !verified && createdAge != null && createdAge >= policy.browseAccountDays) {
      candidates.push(candidate('browse_account', 'user', uid, '둘러보기 계정', `${createdAge}일 전에 가입했지만 인증과 Room 연결이 없습니다.`, [profile.email || '이메일 정보 없음', 'Room 0개', `최근 활동 ${inactiveDays ?? '-'}일 전`], createdAge >= policy.browseAccountDays + policy.noticeDays ? 'review' : 'watch', lastActivityAt, linkedRooms, accountStatus));
    } else if (!linkedRooms.length && inactiveDays != null && inactiveDays >= policy.unusedAccountDays) {
      candidates.push(candidate('unused_account', 'user', uid, '미사용 계정 후보', `${inactiveDays}일 동안 Room 연결과 의미 있는 활동이 없습니다.`, [profile.email || '이메일 정보 없음', 'Room 0개', verified ? '이메일 확인됨' : '이메일 미확인'], 'review', lastActivityAt, linkedRooms, accountStatus));
    }

    if (ownedRooms.length >= policy.excessiveRoomCount) {
      const emptyOwned = ownedRooms.filter((room) => !room.meaningful && room.members.length <= 1).length;
      candidates.push(candidate('excessive_creation', 'user', uid, 'Room 생성 점검', `소유 Room이 ${ownedRooms.length}개입니다.`, [profile.email || compactId(uid), `빈 1인 Room ${emptyOwned}개`, '24시간 생성 횟수는 서버 기록 도입 후 판정'], emptyOwned >= 2 ? 'review' : 'watch', lastActivityAt, linkedRooms, accountStatus));
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

function stateFor(item) {
  return reviewStates.get(`${item.targetType}:${item.targetId}`) || 'observe';
}

function scheduleFor(item) {
  const threshold = {
    browse_account: policy.browseAccountDays,
    unused_account: policy.unusedAccountDays,
    empty_room: policy.emptyRoomDays,
    dormant_room: policy.dormantRoomDays,
    excessive_creation: 0
  }[item.kind] || 0;
  const eligibleAt = (Number(item.lastActivityAt) || Date.now()) + threshold * DAY;
  const noticeAt = Math.max(Date.now(), eligibleAt);
  return {
    noticeLabel: eligibleAt <= Date.now() ? `지금 안내 가능 · ${formatDateTime(Date.now())}` : formatDateTime(noticeAt),
    dormantUntil: formatDateTime(noticeAt + policy.noticeDays * DAY + policy.dormantGraceDays * DAY)
  };
}

function renderPolicyField(key, label, min = 1, max = 365) {
  return `<label class="admin-lifecycle-policy-field"><span>${label}</span><div><input type="number" min="${min}" max="${max}" value="${policy[key]}" data-policy-key="${key}"><small>일</small></div></label>`;
}

function renderCandidate(item) {
  const statusClass = item.severity === 'review' ? 'warn' : 'pending';
  const reviewState = stateFor(item);
  const schedule = scheduleFor(item);
  return `
    <article class="admin-lifecycle-card${reviewState !== 'observe' ? ` is-${reviewState}` : ''}">
      <div class="admin-lifecycle-head">
        <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.reason)}</p></div>
        <span class="admin-status-pill ${statusClass}">${reviewState === 'protected' ? '보호' : reviewState === 'excluded' ? '제외' : item.severity === 'review' ? '검토 우선' : '계속 관찰'}</span>
      </div>
      <div class="admin-lifecycle-target"><span>${item.targetType === 'user' ? '사용자' : 'Room'}</span><code title="${escapeHtml(item.targetId)}">${escapeHtml(compactId(item.targetId, 12, 8))}</code></div>
      <ul>${item.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join('')}</ul>
      <div class="admin-lifecycle-preview"><strong>정책 미리보기</strong><span>안내 예정 ${escapeHtml(schedule.noticeLabel)}</span><span>휴면 유예 종료 ${escapeHtml(schedule.dormantUntil)}</span></div>
      <details class="admin-lifecycle-paths"><summary>영향 경로 ${item.paths.length}개</summary>${item.paths.map((path) => `<code>${escapeHtml(path)}</code>`).join('')}</details>
      <div class="admin-lifecycle-actions" data-review-target="${escapeHtml(`${item.targetType}:${item.targetId}`)}">
        <button type="button" data-review-state="observe"${reviewState === 'observe' ? ' class="is-active"' : ''}>계속 관찰</button>
        <button type="button" data-review-state="protected"${reviewState === 'protected' ? ' class="is-active"' : ''}>보호</button>
        <button type="button" data-review-state="excluded"${reviewState === 'excluded' ? ' class="is-active"' : ''}>제외</button>
        ${item.targetType === 'user' && item.accountStatus === 'dormant' ? '<span class="admin-status-pill ok">현재 휴면 · 로그인 복원 가능</span>' : item.targetType === 'user' && reviewState === 'observe' ? `<button type="button" class="danger" data-dormant-uid="${escapeHtml(item.targetId)}">휴면 전환</button>` : ''}
      </div>
      <p class="admin-lifecycle-readonly">검토 상태는 임시 · 휴면 전환만 관리자 확인 후 저장 · 자동 삭제 없음</p>
    </article>`;
}

function renderShell() {
  const items = visibleCandidates();
  return `
    <section class="module-view admin-stack" aria-labelledby="lifecycleHeading">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">◉</div>
        <div><h2 id="lifecycleHeading">데이터 수명주기 센터</h2><p>빈 계정·빈 Room·과다 생성 가능성을 관찰합니다. 사용자 휴면은 관리자 확인 후 수동으로만 적용하며 Room과 기록은 보존합니다.</p></div>
      </section>
      <section class="admin-grid admin-grid-4 admin-lifecycle-metrics">
        <article class="admin-card admin-metric"><span>관찰 후보</span><strong>${analysis.candidates.length}</strong><small>자동 처리 없음</small></article>
        <article class="admin-card admin-metric"><span>계정 후보</span><strong>${analysis.counts.browse_account + analysis.counts.unused_account}</strong><small>전체 사용자 ${analysis.totals.users}명</small></article>
        <article class="admin-card admin-metric"><span>Room 후보</span><strong>${analysis.counts.empty_room + analysis.counts.dormant_room}</strong><small>전체 Room ${analysis.totals.rooms}개</small></article>
        <article class="admin-card admin-metric"><span>보존 Room</span><strong>${analysis.protectedRooms}</strong><small>기록 데이터 감지</small></article>
      </section>
      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div><h2>정책 설정 · 미리보기</h2><p>기간을 바꾸면 후보와 예정일만 다시 계산합니다. 설정은 새로고침하면 초기화되며 데이터베이스에는 저장하지 않습니다.</p></div>
          <span class="admin-status-pill muted">A12.3 · 정책 Dry Run</span>
        </div>
        <form class="admin-lifecycle-policy-form" data-lifecycle-policy>
          ${renderPolicyField('browseAccountDays', '미인증·미연결 계정')}
          ${renderPolicyField('unusedAccountDays', '미사용 계정')}
          ${renderPolicyField('emptyRoomDays', '빈 Room')}
          ${renderPolicyField('dormantRoomDays', '2인 무활동 Room')}
          ${renderPolicyField('noticeDays', '사용자 안내 유예')}
          ${renderPolicyField('dormantGraceDays', '휴면 후 보존', 7, 730)}
          <label class="admin-lifecycle-policy-field"><span>소유 Room 점검</span><div><input type="number" min="2" max="50" value="${policy.excessiveRoomCount}" data-policy-key="excessiveRoomCount"><small>개</small></div></label>
          <button class="admin-primary-button" type="submit">정책 다시 계산</button>
        </form>
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
      <section class="admin-warning-box">보호·제외·계속 관찰 선택은 현재 브라우저에서만 유지됩니다. 휴면은 관리자 수동 확인으로만 적용되며 자동 휴면과 자동 삭제는 꺼져 있습니다.</section>
    </section>`;
}

export async function render() {
  analysis = await loadAnalysis();
  return renderShell();
}

export function afterRender(root) {
  root.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-lifecycle-filter]');
    if (button) {
      activeFilter = button.dataset.lifecycleFilter || 'all';
      root.innerHTML = renderShell();
      return;
    }
    const reviewButton = event.target.closest('[data-review-state]');
    const actionRow = reviewButton?.closest('[data-review-target]');
    if (reviewButton && actionRow) {
      reviewStates.set(actionRow.dataset.reviewTarget, reviewButton.dataset.reviewState || 'observe');
      root.innerHTML = renderShell();
      return;
    }
    const dormantButton = event.target.closest('[data-dormant-uid]');
    if (!dormantButton) return;
    const uid = dormantButton.dataset.dormantUid;
    const item = analysis.candidates.find((candidateItem) => candidateItem.targetType === 'user' && candidateItem.targetId === uid);
    if (!item || !window.confirm('이 사용자를 휴면 상태로 전환할까요? Room과 기록은 삭제되지 않으며 사용자가 로그인하면 직접 복원할 수 있습니다.')) return;
    dormantButton.disabled = true;
    dormantButton.textContent = '전환 중…';
    try {
      const database = getAdminDatabase();
      const now = Date.now();
      await database.ref(`users/${uid}/lifecycle`).update({
        status: 'dormant', dormantAt: now, updatedAt: now,
        reason: item.kind, archivedRoomCodes: item.linkedRooms.reduce((result, roomCode) => ({ ...result, [roomCode]: true }), {})
      });
      await database.ref('adminAuditLogs').push({
        action: 'user_dormant_applied', targetType: 'user', targetId: uid,
        source: 'lifecycle_a12_3', createdAt: now, automatic: false
      });
      reviewStates.set(`user:${uid}`, 'protected');
      window.alert('휴면 상태로 전환했습니다. 데이터와 Room은 그대로 보존됩니다.');
      root.innerHTML = renderShell();
    } catch (error) {
      console.error('[A12.3] dormant transition failed', error);
      window.alert(`휴면 전환에 실패했습니다. ${error?.message || error}`);
      dormantButton.disabled = false;
      dormantButton.textContent = '휴면 전환';
    }
  });
  root.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-lifecycle-policy]');
    if (!form) return;
    event.preventDefault();
    form.querySelectorAll('[data-policy-key]').forEach((input) => {
      const value = Math.max(Number(input.min) || 1, Math.min(Number(input.max) || 730, Number(input.value) || 1));
      policy[input.dataset.policyKey] = value;
    });
    root.innerHTML = '<div class="state-card"><strong>정책을 다시 계산하고 있습니다.</strong></div>';
    analysis = await loadAnalysis();
    root.innerHTML = renderShell();
  });
}
