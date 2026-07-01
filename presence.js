// =========================================================
// HearMe2nite RC2.14.4 Recovery
// presence.js - isolated room presence layer
// - Does not change existing Room / History / Daily data paths.
// - Adds only roomMembers/{roomCode}/{uid}/presence.
// - If Firebase permission fails, app boot continues safely.
// =========================================================
(function(){
    if (window.__hmPresenceLayerInstalled) return;
    window.__hmPresenceLayerInstalled = true;

    let membersRef = null;
    let selfRef = null;
    let activePresenceRoom = null;
    let activePresenceUid = null;
    let heartbeatTimer = null;
    const HEARTBEAT_MS = 15000;

    const $ = (id) => document.getElementById(id);
    const safe = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

    function getRoomCode(){
        try { return window.activeRoomCode || activeRoomCode || ''; } catch(e) { return ''; }
    }
    function getUser(){
        try { return window.currentUser || currentUser || null; } catch(e) { return null; }
    }
    function getRole(){
        try { return window.activeRelationshipRole || activeRelationshipRole || window.pendingRelationshipRole || pendingRelationshipRole || ''; } catch(e) { return ''; }
    }
    function roleLabel(role){
        try {
            if (typeof window.getRelationshipRoleLabel === 'function') return window.getRelationshipRoleLabel(role);
            if (typeof getRelationshipRoleLabel === 'function') return getRelationshipRoleLabel(role);
        } catch(e) {}
        if (role === 'dom') return '관리(Dom)';
        if (role === 'sub') return '기록(Sub)';
        return '상대';
    }
    function emailOf(user){
        const email = user && user.email ? user.email : '';
        try {
            if (typeof window.normalizeEmail === 'function') return window.normalizeEmail(email);
            if (typeof normalizeEmail === 'function') return normalizeEmail(email);
        } catch(e) {}
        return String(email || '').trim().toLowerCase();
    }
    function ensureBox(){
        let box = $('roomPresenceBox');
        if (box) return box;
        const anchor = $('currentRoomInfo');
        if (!anchor || !anchor.parentNode) return null;
        box = document.createElement('div');
        box.id = 'roomPresenceBox';
        box.className = 'room-presence-box';
        box.style.display = 'none';
        box.innerHTML = '<div class="room-presence-title">👀 상대 접속 상태</div><div id="roomPresenceContent" class="room-presence-content"></div>';
        anchor.insertAdjacentElement('afterend', box);
        return box;
    }
    function formatTime(ts){
        if (!ts) return '아직 기록 없음';
        const d = new Date(Number(ts));
        if (Number.isNaN(d.getTime())) return '시간 확인 불가';
        const diff = Date.now() - d.getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return '방금 전';
        if (min < 60) return min + '분 전';
        const hour = Math.floor(min / 60);
        if (hour < 24) return hour + '시간 전';
        return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    }
    function render(members){
        const box = ensureBox();
        const content = $('roomPresenceContent');
        const roomCode = getRoomCode();
        const user = getUser();
        if (!box || !content) return;
        if (!roomCode || !user) {
            box.style.display = 'none';
            content.innerHTML = '';
            return;
        }
        box.style.display = 'block';
        const rows = members && typeof members === 'object' ? Object.entries(members).filter(([uid]) => uid !== user.uid) : [];
        if (!rows.length) {
            content.innerHTML = '<div class="presence-empty"><strong>아직 연결된 상대가 없습니다.</strong><br>상대방이 초대코드로 들어오면 온라인 상태와 마지막 접속 시간이 표시됩니다.</div>';
            return;
        }
        content.innerHTML = rows.map(([uid, member]) => {
            member = member || {};
            const presence = member.presence || {};
            const isOnline = presence.online === true;
            const role = presence.relationshipRole || member.relationshipRole || (member.role === 'owner' ? 'dom' : 'sub');
            const email = member.email || presence.email || '상대 사용자';
            const lastSeen = presence.lastSeen || presence.updatedAt || member.lastSeen || member.joinedAt || 0;
            return `<div class="presence-user-card">
                <div class="presence-user-main">
                    <span class="presence-dot ${isOnline ? 'online' : 'offline'}"></span>
                    <div><div class="presence-user-title">${safe(roleLabel(role))}</div><div class="presence-user-email">${safe(email)}</div></div>
                </div>
                <div class="presence-user-status"><strong>${isOnline ? '온라인' : '오프라인'}</strong><span>마지막 접속: ${safe(formatTime(lastSeen))}</span></div>
            </div>`;
        }).join('');
    }
    function writeSelfOnline(){
        try {
            const user = getUser();
            if (!selfRef || !user) return;
            selfRef.update({
                online: true,
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                email: emailOf(user),
                relationshipRole: getRole()
            }).catch(err => console.warn('[Presence] heartbeat skipped:', err && err.message ? err.message : err));
        } catch(e) {}
    }
    function startHeartbeat(){
        stopHeartbeat();
        heartbeatTimer = setInterval(writeSelfOnline, HEARTBEAT_MS);
    }
    function stopHeartbeat(){
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    }
    function stop(){
        stopHeartbeat();
        try { if (selfRef) selfRef.update({ online:false, lastSeen: firebase.database.ServerValue.TIMESTAMP, updatedAt: firebase.database.ServerValue.TIMESTAMP }); } catch(e) {}
        try { if (membersRef) membersRef.off(); } catch(e) {}
        membersRef = null; selfRef = null; activePresenceRoom = null; activePresenceUid = null;
    }
    function start(){
        const roomCode = getRoomCode();
        const user = getUser();
        if (!roomCode || !user || typeof db === 'undefined' || !db) { render(null); return; }
        if (activePresenceRoom === roomCode && activePresenceUid === user.uid && membersRef) {
            writeSelfOnline();
            startHeartbeat();
            return;
        }
        stop();
        activePresenceRoom = roomCode;
        activePresenceUid = user.uid;
        try {
            selfRef = db.ref(`roomMembers/${roomCode}/${user.uid}/presence`);
            writeSelfOnline();
            try { selfRef.onDisconnect().update({ online:false, lastSeen: firebase.database.ServerValue.TIMESTAMP, updatedAt: firebase.database.ServerValue.TIMESTAMP }); } catch(e) {}
            startHeartbeat();
            membersRef = db.ref(`roomMembers/${roomCode}`);
            membersRef.on('value', snap => render(snap.val() || {}), err => { console.warn('[Presence] read skipped:', err && err.message ? err.message : err); render({}); });
        } catch(err) {
            console.warn('[Presence] start failed:', err);
            render({});
        }
    }
    function refresh(){
        ensureBox();
        start();
    }
    const originalUpdate = window.updateCurrentRoomInfo;
    if (typeof originalUpdate === 'function') {
        window.updateCurrentRoomInfo = function(){
            const result = originalUpdate.apply(this, arguments);
            setTimeout(refresh, 0);
            return result;
        };
    }
    window.hmPresenceRefresh = refresh;
    window.hmPresenceStop = stop;
    window.addEventListener('beforeunload', stop);
    // RC2.14.6: Do not mark offline on tab/window blur or hidden state.
    // Chrome normal/incognito testing and mobile app-switching can trigger
    // visibilityState='hidden' while the session is still connected.
    // Offline state is now handled only by logout, beforeunload, and Firebase onDisconnect().
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refresh();
    });
    // RC2.14.7: keep active sessions online with a lightweight heartbeat.
    // This stabilizes normal/incognito dual-login tests and prevents one side
    // from staying offline after the first room restore timing.
    document.addEventListener('DOMContentLoaded', () => setTimeout(refresh, 700));
})();
