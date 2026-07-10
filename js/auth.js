// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// auth.js - Auth / Session
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // MODULE: AUTH / USER SESSION HELPERS

    // Split-ready target: normalizeEmail

    // =========================================================

    // 이메일 비교용 정규화 함수
    // Firebase roomAccess / users 데이터에서 이메일 대소문자 차이로 권한이 어긋나는 것을 방지한다.

    // =========================================================
    // MODULE 02. COMMON UTILS
    // 분리 후보: utils.js
    // 이메일 정규화, 랜덤 코드, HTML escape, 시간 포맷, 복사/토스트 등
    // 여러 모듈에서 같이 쓰는 작은 순수 함수 영역이다.
    // =========================================================
    // RC2 v2.8.0 STEP1: normalizeEmail moved to js/utils.js


    // =========================================================

    // MODULE: ROOM INPUT HELPERS

    // Split-ready target: clearRoomInputs

    // =========================================================

    function clearRoomInputs() {
        const room = document.getElementById('roomCode');
        const invite = document.getElementById('inviteCodeInput');
        if (room) room.value = '';
        if (invite) invite.value = '';
        activeRoomCode = '';
        activeRoomRole = '';
        activeRelationshipRole = '';
        setDataSectionsVisible(false);
        resetProtectedDataUI();
        updateCurrentRoomInfo();
    }


    // =========================================================
    // STEP3: MasterOS/HearU2nite Access Gate 제거 완료.
    // 기존 our-baby-care Firebase Authentication 계정으로만 로그인한다.

    // MODULE: AUTH / LOGIN / SIGNUP

    // Split-ready target: handleAuthSubmit

    // =========================================================

    // 기존 HearMe2nite 계정 직접 로그인 처리
    // 신규 계정 생성은 STEP4에서 별도로 구현한다.
    // 주의: 로그인 성공 이후 방 복구는 onAuthStateChanged 흐름에서 처리한다.

    // =========================================================
    // MODULE 03. AUTH
    // 분리 후보: auth.js
    // Firebase Auth 로그인/회원가입/로그아웃, 로그인 후 기본 방 복원을 담당한다.
    // 로그인 구조와 기존 계정 데이터는 변경하지 않는다.
    // =========================================================
    async function handleAuthSubmit() {
        const email = normalizeEmail(document.getElementById('authEmail').value);
        const password = document.getElementById('authPassword').value;
        if (!email || !password) { alert('이메일과 비밀번호를 입력해 주세요.'); return; }
        if (password.length < 6) { alert('비밀번호는 6자리 이상이어야 합니다.'); return; }

        try {
            showSaveStatus('🔐 HearMe2nite 로그인 확인 중...');

            // STEP3: 기존 our-baby-care Authentication 계정으로만 직접 로그인한다.
            // 실패 시 계정을 자동 생성하지 않아 기존 UID와 Room 연결을 보호한다.
            await babyAuth.signInWithEmailAndPassword(email, password);

            try { if (window.hmRefreshPresenceFromRoom) window.hmRefreshPresenceFromRoom('login-complete'); } catch(e) { console.warn(e); }
            try { if (window.hmPresenceRefresh) setTimeout(window.hmPresenceRefresh, 600); } catch(e) { console.warn(e); }
            showSaveStatus('☁️ 로그인 완료');
        } catch (err) {
            console.error(err);
            alert(firebaseAuthErrorToKorean(err.code));
            showSaveStatus('❌ 로그인 실패');
        }
    }

    // =========================================================

    // MODULE: AUTH / ERROR MESSAGE MAPPING

    // Split-ready target: firebaseAuthErrorToKorean

    // =========================================================

    function firebaseAuthErrorToKorean(code) {
        const map = {
            'auth/email-already-in-use': '이미 가입된 이메일입니다.',
            'auth/invalid-email': '이메일 형식이 올바르지 않습니다.',
            'auth/user-not-found': '등록된 HearMe2nite 계정을 찾을 수 없습니다. 이메일을 확인해 주세요.',
            'auth/wrong-password': '비밀번호가 맞지 않습니다.',
            'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않습니다.',
            'auth/network-request-failed': '인터넷 연결을 확인해 주세요.',
            'auth/too-many-requests': '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'
        };
        return map[code] || `로그인 처리 중 오류가 생겼습니다. (${code})`;
    }

    // =========================================================

    // MODULE: AUTH / LOGOUT

    // Split-ready target: logoutUser

    // =========================================================

    async function logoutUser() {
        try { if (window.hmPresenceStop) window.hmPresenceStop(); } catch(e) { console.warn(e); }
        disconnectAllListeners();
        activeRoomCode = "";
        activeRoomRole = "";
        activeRelationshipRole = "";
        clearRoomInputs();
        clearFormFieldsExceptSync();
        try { await babyAuth.signOut(); } catch(e) { console.warn(e); }
    }

    // =========================================================

    // MODULE: ROOM / ACTIVE ROOM RESTORE

    // Split-ready target: loadUserActiveRoom

    // =========================================================

    // 사용자별 마지막 활성 방 복구
    // users/{uid}/activeRoom 값을 읽어 기존 방을 자동 연결한다.
    // 주의: 공유코드를 localStorage에 저장하지 않는 현재 보안 원칙을 유지한다.
    async function hmActivateRecoveredRoom(roomCode, defaultRelationshipRole = '') {
        if (!currentUser || !roomCode) return false;
        const allowed = await canCurrentUserAccessRoom(roomCode);
        if (!allowed) return false;

        activeRoomCode = roomCode;
        activeRoomRole = await getCurrentUserRoomRole(roomCode) || 'member';
        activeRelationshipRole = await getCurrentUserRelationshipRole(roomCode) || defaultRelationshipRole || (activeRoomRole === 'owner' ? 'dom' : 'sub');
        pendingRelationshipRole = activeRelationshipRole;

        const roomInput = document.getElementById('roomCode');
        if (roomInput) roomInput.value = roomCode;

        const updates = {};
        updates[`users/${currentUser.uid}/activeRoom`] = roomCode;
        updates[`users/${currentUser.uid}/email`] = normalizeEmail(currentUser.email);
        updates[`users/${currentUser.uid}/lastLogin`] = firebase.database.ServerValue.TIMESTAMP;
        if (activeRelationshipRole) updates[`users/${currentUser.uid}/relationshipRole`] = activeRelationshipRole;
        updates[`userRooms/${currentUser.uid}/${roomCode}`] = true;
        await db.ref().update(updates);

        updateCurrentRoomInfo();
        connectAndListenFirebase();
        try { if (window.hmRefreshPresenceFromRoom) window.hmRefreshPresenceFromRoom('recovered-room'); } catch(e) { console.warn(e); }
        try { if (window.hmPresenceRefresh) setTimeout(window.hmPresenceRefresh, 250); } catch(e) { console.warn(e); }
        return true;
    }

    async function hmRecoverRoomFromMembership(defaultRelationshipRole = '') {
        if (!currentUser) return false;
        try {
            const userRoomsSnap = await db.ref(`userRooms/${currentUser.uid}`).once('value');
            const userRooms = userRoomsSnap.val() || {};
            for (const roomCode of Object.keys(userRooms).filter(Boolean)) {
                if (await hmActivateRecoveredRoom(roomCode, defaultRelationshipRole)) {
                    showSaveStatus('☁️ 기존 공간 자동 복구 완료');
                    return true;
                }
            }

            // Legacy fallback: userRooms가 비어 있거나 손상된 경우 roomMembers에서 내 UID를 역검색한다.
            const membersSnap = await db.ref('roomMembers').once('value');
            const allMembers = membersSnap.val() || {};
            for (const roomCode of Object.keys(allMembers)) {
                if (allMembers[roomCode] && allMembers[roomCode][currentUser.uid]) {
                    if (await hmActivateRecoveredRoom(roomCode, defaultRelationshipRole)) {
                        showSaveStatus('☁️ 기존 공간 자동 복구 완료');
                        return true;
                    }
                }
            }
        } catch (err) {
            console.warn('[Room Recovery] 기존 공간 자동 복구 실패:', err);
        }
        return false;
    }

    async function loadUserActiveRoom() {
        if (!currentUser) return;
        try {
            const defaultRelationshipRole = await getUserDefaultRelationshipRole();
            if (defaultRelationshipRole) {
                activeRelationshipRole = defaultRelationshipRole;
                pendingRelationshipRole = defaultRelationshipRole;
                updateRelationshipRoleUI();
                updateOwnerOnlySections();
            }

            const snap = await db.ref(`users/${currentUser.uid}/activeRoom`).once('value');
            const savedRoom = snap.val();
            if (savedRoom) {
                const restored = await hmActivateRecoveredRoom(savedRoom, defaultRelationshipRole);
                if (restored) return;
                console.warn('[Room Recovery] activeRoom 접근 실패, membership 기반 복구를 시도합니다:', savedRoom);
            }

            const recovered = await hmRecoverRoomFromMembership(defaultRelationshipRole);
            if (recovered) return;

            showSaveStatus('🔑 방을 만들거나 초대코드로 참여해 주세요.');
            resetProtectedDataUI('방을 만들거나 초대코드로 참여하면 기록이 표시됩니다. ✨');
            updateRelationshipRoleUI();
        } catch (err) {
            console.error(err);
            showSaveStatus('❌ 저장된 공유코드 확인 실패');
        }
    }

    // =========================================================

    // MODULE: INVITE / URL CAPTURE

    // Split-ready target: captureInviteFromUrl

    // =========================================================

    // 초대 링크 진입 처리
    // URL의 invite 파라미터를 로그인 전 임시 입력값으로만 보관한다.
    // 실제 방 참여/권한 기록은 acceptPendingInviteIfAny 이후 Firebase에 저장된다.
    function captureInviteFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const invite = (params.get('invite') || '').trim().toUpperCase();
        if (invite) {
            sessionStorage.setItem('pendingInviteCode', invite);
            const help = document.querySelector('#authBox .auth-help');
            if (help) {
                help.innerHTML = `초대코드 <strong>${escapeHtml(invite)}</strong>가 확인되었습니다.<br>HearMe2nite 계정으로 로그인하면 자동으로 방 참여를 진행합니다.`;
            }
        }
    }

