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
    // MODULE: MASTEROS APP ACCESS DIAGNOSTIC
    // v0.10.20 Safe Enforced Access Gate
    // 목적: MasterOS 승인 사용자만 HearMe2nite 앱 실행을 허용한다. 기존 사용자 보호를 위해 READ_ERROR는 임시 통과한다.
    // MasterOS DB 기준 경로:
    // - userAppAccess/{masterUid}/baby-care-secure
    // - appAccessRequests/baby-care-secure/{masterUid}
    // - appAccessRequests/baby-care-secure/* 중 email 일치 항목
    // - users/* 중 email 일치 UID → userAppAccess/{matchedUid}/baby-care-secure
    // =========================================================

    function waitForMasterUser(timeoutMs = 5000) {
        if (masterAuth.currentUser) return Promise.resolve(masterAuth.currentUser);
        return new Promise((resolve) => {
            let resolved = false;
            const timer = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                unsubscribe();
                resolve(masterAuth.currentUser || null);
            }, timeoutMs);
            const unsubscribe = masterAuth.onAuthStateChanged((user) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timer);
                unsubscribe();
                resolve(user || null);
            });
        });
    }

    function normalizeAccessEmail(email) {
        return (email || '').trim().toLowerCase();
    }

    function isMasterAccessApproved(accessData) {
        // userAppAccess는 active:true가 기본이지만, 과거 데이터 호환을 위해 active가 없으면 차단하지 않는다.
        return !!accessData && accessData.status === 'approved' && accessData.active !== false;
    }

    function isMasterAccessExplicitlyBlocked(accessData) {
        return !!accessData && (accessData.status === 'rejected' || accessData.status === 'blocked' || accessData.active === false);
    }

    function isRequestApproved(requestData) {
        return !!requestData && requestData.status === 'approved';
    }

    function objectEntriesSafe(value) {
        if (!value || typeof value !== 'object') return [];
        return Object.entries(value);
    }

    async function readPathSafe(path) {
        try {
            const snap = await masterDb.ref(path).once('value');
            return { ok: true, path, exists: snap.exists(), value: snap.val(), error: null };
        } catch (err) {
            return { ok: false, path, exists: false, value: null, error: err && (err.message || err.code || String(err)) };
        }
    }

    async function queryByEmailSafe(path, email) {
        try {
            const snap = await masterDb.ref(path).orderByChild('email').equalTo(email).once('value');
            return { ok: true, path, email, exists: snap.exists(), value: snap.val(), error: null };
        } catch (err) {
            return { ok: false, path, email, exists: false, value: null, error: err && (err.message || err.code || String(err)) };
        }
    }

    async function readMasterAccessDiagnostic(masterUid, masterEmail) {
        const appId = HM_MASTER_APP_ID || 'baby-care-secure';
        const normalizedEmail = normalizeAccessEmail(masterEmail);
        const primaryPath = masterUid ? `userAppAccess/${masterUid}/${appId}` : '';
        const requestPath = masterUid ? `appAccessRequests/${appId}/${masterUid}` : '';

        const result = {
            approved: false,
            blocked: false,
            reason: 'NO_APPROVED_ACCESS_RECORD',
            result: 'NO_ACCESS_RECORD',
            source: 'none',
            appId,
            masterUid: masterUid || '',
            masterEmail: normalizedEmail,
            primaryPath,
            requestPath,
            primary: null,
            request: null,
            usersByEmail: null,
            requestsByEmail: null,
            matchedUserUids: [],
            matchedApprovedUserAccess: [],
            matchedApprovedRequests: [],
            diagnostics: []
        };

        if (!masterUid) {
            result.reason = 'NO_MASTER_UID';
            result.diagnostics.push('MasterOS UID가 없어 직접 경로를 확인하지 못했습니다.');
            return result;
        }

        // 1) 현재 MasterOS UID 직접 승인 확인
        result.primary = await readPathSafe(primaryPath);
        const primaryData = result.primary.value;
        if (isMasterAccessApproved(primaryData)) {
            result.approved = true;
            result.result = 'PASS';
            result.reason = 'APPROVED_CURRENT_UID_USER_ACCESS';
            result.source = 'userAppAccess/currentMasterUid';
            return result;
        }
        if (isMasterAccessExplicitlyBlocked(primaryData)) {
            result.blocked = true;
            result.result = 'BLOCKED';
            result.reason = 'EXPLICITLY_BLOCKED_CURRENT_UID_USER_ACCESS';
            result.source = 'userAppAccess/currentMasterUid';
            return result;
        }

        // 2) 현재 MasterOS UID의 승인 요청 확인
        result.request = await readPathSafe(requestPath);
        const requestData = result.request.value;
        if (isRequestApproved(requestData)) {
            result.approved = true;
            result.result = 'PASS';
            result.reason = 'APPROVED_CURRENT_UID_ACCESS_REQUEST';
            result.source = 'appAccessRequests/currentMasterUid';
            return result;
        }
        if (isMasterAccessExplicitlyBlocked(requestData)) {
            result.blocked = true;
            result.result = 'BLOCKED';
            result.reason = 'EXPLICITLY_BLOCKED_CURRENT_UID_ACCESS_REQUEST';
            result.source = 'appAccessRequests/currentMasterUid';
            return result;
        }

        // 3) email 기준 users 검색 → 같은 email의 다른 MasterOS UID 찾기
        if (normalizedEmail) {
            result.usersByEmail = await queryByEmailSafe('users', normalizedEmail);
            const userMatches = objectEntriesSafe(result.usersByEmail.value);
            result.matchedUserUids = userMatches.map(([uid, data]) => ({ uid, email: normalizeAccessEmail(data && data.email), userStatus: data && data.userStatus, role: data && data.role }));

            for (const [uid, userData] of userMatches) {
                const accessPath = `userAppAccess/${uid}/${appId}`;
                const accessRead = await readPathSafe(accessPath);
                const accessData = accessRead.value;
                const match = { uid, user: userData, accessPath, accessRead, accessData };
                if (isMasterAccessApproved(accessData)) {
                    result.matchedApprovedUserAccess.push(match);
                }
            }

            if (result.matchedApprovedUserAccess.length > 0) {
                result.approved = true;
                result.result = 'PASS_BY_EMAIL_USER_ACCESS';
                result.reason = 'APPROVED_EMAIL_MATCHED_USER_ACCESS';
                result.source = 'userAppAccess/emailMatchedUid';
                return result;
            }

            // 4) email 기준 appAccessRequests 검색
            result.requestsByEmail = await queryByEmailSafe(`appAccessRequests/${appId}`, normalizedEmail);
            const requestMatches = objectEntriesSafe(result.requestsByEmail.value);
            result.matchedApprovedRequests = requestMatches
                .map(([uid, data]) => ({ uid, data }))
                .filter(item => isRequestApproved(item.data));

            if (result.matchedApprovedRequests.length > 0) {
                result.approved = true;
                result.result = 'PASS_BY_EMAIL_REQUEST';
                result.reason = 'APPROVED_EMAIL_MATCHED_ACCESS_REQUEST';
                result.source = 'appAccessRequests/emailMatchedUid';
                return result;
            }
        }

        result.diagnostics.push('현재 MasterOS UID로 승인 기록이 없습니다.');
        result.diagnostics.push('email fallback에서도 승인된 userAppAccess 또는 appAccessRequests를 찾지 못했습니다.');
        result.result = result.blocked ? 'BLOCKED' : 'NO_ACCESS_RECORD';
        return result;
    }

    async function verifyMasterAppAccess(options = {}) {
        const masterUser = await waitForMasterUser(options.timeoutMs || 5000);
        const label = options.label || 'Access Diagnostic';
        if (!masterUser) {
            const result = { approved: false, blocked: false, reason: 'MASTER_AUTH_NOT_READY', source: 'auth', masterUid: '', masterEmail: '', result: 'MASTER_AUTH_NOT_READY' };
            console.warn(`[${label}] MasterOS auth not ready`, result);
            return result;
        }

        try {
            const result = await readMasterAccessDiagnostic(masterUser.uid, masterUser.email || '');
            console.groupCollapsed(`[${label}] HearMe2nite approval diagnostic: ${result.result}`);
            console.log('Master UID:', result.masterUid);
            console.log('Master Email:', result.masterEmail);
            console.log('App ID:', result.appId);
            console.log('Primary current UID path:', result.primaryPath);
            console.log('Primary current UID read:', result.primary);
            console.log('Request current UID path:', result.requestPath);
            console.log('Request current UID read:', result.request);
            console.log('Users by email:', result.usersByEmail);
            console.log('Matched user UIDs by email:', result.matchedUserUids);
            console.log('Approved userAppAccess matches by email:', result.matchedApprovedUserAccess);
            console.log('Requests by email:', result.requestsByEmail);
            console.log('Approved request matches by email:', result.matchedApprovedRequests);
            console.log('Final Result:', result.result, result.reason, 'source:', result.source);
            console.log('Full diagnostic object:', result);
            console.groupEnd();
            return result;
        } catch (err) {
            const result = { approved: false, blocked: false, reason: 'MASTER_ACCESS_DIAGNOSTIC_FAILED', source: 'error', error: err, masterUid: masterUser.uid, masterEmail: masterUser.email || '', result: 'READ_ERROR' };
            console.groupCollapsed(`[${label}] HearMe2nite approval diagnostic: READ_ERROR`);
            console.error(err);
            console.log(result);
            console.groupEnd();
            return result;
        }
    }


    // =========================================================
    // MODULE: MASTEROS APP ACCESS ENFORCEMENT
    // v0.10.20 Safe Enforced Access Gate
    // 정책:
    // - PASS / PASS_BY_EMAIL_* : 앱 실행 허용
    // - NO_ACCESS_RECORD / BLOCKED : 앱 실행 차단
    // - READ_ERROR / MASTER_AUTH_NOT_READY : 기존 사용자 보호를 위해 임시 통과 + 콘솔 경고
    // =========================================================

    function isAccessGateAllowed(result) {
        if (!result) return true; // 예외적 상황은 기존 사용자 보호를 위해 통과
        if (result.approved === true) return true;
        if (result.result === 'PASS' || result.result === 'PASS_BY_EMAIL_USER_ACCESS' || result.result === 'PASS_BY_EMAIL_REQUEST') return true;
        if (result.result === 'READ_ERROR' || result.result === 'MASTER_AUTH_NOT_READY') {
            console.warn('[Access Gate] approval check unavailable, fail-open for existing-user safety', result);
            return true;
        }
        return false;
    }

    function showAccessDeniedScreen(result) {
        document.body.classList.remove('hm-booting');
        try {
            disconnectAllListeners();
            clearRoomInputs();
            clearFormFieldsExceptSync();
            setDataSectionsVisible(false);
            resetProtectedDataUI();
        } catch (err) {
            console.warn('[Access Gate] cleanup warning', err);
        }

        const authBox = document.getElementById('authBox');
        const appContent = document.getElementById('appContent');
        if (appContent) appContent.style.display = 'none';
        if (authBox) {
            authBox.classList.remove('is-hidden');
            authBox.style.display = 'grid';
            let denied = document.getElementById('accessDeniedNotice');
            if (!denied) {
                denied = document.createElement('div');
                denied.id = 'accessDeniedNotice';
                denied.setAttribute('role', 'alert');
                denied.style.cssText = 'grid-column:1/-1;max-width:620px;margin:0 auto 16px;padding:18px 20px;border-radius:22px;background:rgba(255,255,255,.94);box-shadow:0 18px 45px rgba(88,60,120,.18);border:1px solid rgba(166,121,214,.28);text-align:center;color:#3c3150;line-height:1.55;';
                authBox.insertBefore(denied, authBox.firstChild);
            }
            denied.innerHTML = `
                <strong style="display:block;font-size:1.08rem;margin-bottom:6px;">앱 사용 권한이 없습니다</strong>
                <span style="display:block;font-size:.92rem;color:#6f6380;">MasterOS Platform에서 HearMe2nite 앱 승인을 받은 후 사용할 수 있습니다.</span>
                <button type="button" onclick="location.href='https://hearu2nite.netlify.app/'" style="margin-top:12px;border:0;border-radius:999px;padding:10px 16px;background:linear-gradient(135deg,#ff7ab6,#8b5cf6);color:white;font-weight:800;cursor:pointer;">플랫폼으로 이동</button>
            `;
        }
        showSaveStatus('🔒 앱 승인이 필요합니다.');
        console.warn('[Access Gate] blocked user access', result);
    }

    async function enforceMasterAppAccess(options = {}) {
        const result = await verifyMasterAppAccess(options);
        const allowed = isAccessGateAllowed(result);
        if (!allowed) {
            showAccessDeniedScreen(result);
            try { await babyAuth.signOut(); } catch(e) { console.warn(e); }
            return { allowed: false, result };
        }
        const oldNotice = document.getElementById('accessDeniedNotice');
        if (oldNotice) oldNotice.remove();
        return { allowed: true, result };
    }

    // =========================================================

    // MODULE: AUTH / LOGIN / SIGNUP

    // Split-ready target: handleAuthSubmit

    // =========================================================

    // 로그인/회원가입 공통 처리
    // Auth 탭 상태에 따라 Firebase Auth signIn 또는 createUser를 실행한다.
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
            showSaveStatus('🔐 MasterOS 로그인 확인 중...');

            // 1단계: MasterOS 계정 로그인
            await masterAuth.signInWithEmailAndPassword(email, password);

            // 2단계: MasterOS 승인 상태 확인. 승인된 사용자만 HearMe2nite 로그인 진행.
            showSaveStatus('🔐 앱 승인 상태 확인 중...');
            const gate = await enforceMasterAppAccess({ timeoutMs: 5000, label: 'Access Gate / Login' });
            if (!gate.allowed) {
                try { await masterAuth.signOut(); } catch(e) { console.warn(e); }
                return;
            }

            // 3단계: 기존 rooms 데이터가 있는 our-baby-care에도 로그인
            try {
                await babyAuth.signInWithEmailAndPassword(email, password);
            } catch (babyErr) {
                if (babyErr.code === 'auth/user-not-found' || babyErr.code === 'auth/invalid-credential') {
                    // master에는 가입되어 있지만 baby 쪽 계정이 없는 경우만 생성
                    await babyAuth.createUserWithEmailAndPassword(email, password);
                } else if (babyErr.code === 'auth/wrong-password') {
                    alert('MasterOS 로그인과 앱 승인은 확인됐지만, 기존 HearMe2nite 계정의 비밀번호가 달라 로그인하지 못했습니다. 두 프로젝트의 비밀번호를 맞춰 주세요.');
                    return;
                } else {
                    throw babyErr;
                }
            }

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
            'auth/user-not-found': '2번 사이트(hearu2nite)에서 먼저 회원가입해 주세요.',
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
        try { await masterAuth.signOut(); } catch(e) { console.warn(e); }
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
                help.innerHTML = `초대코드 <strong>${escapeHtml(invite)}</strong>가 확인되었습니다.<br>HearU2nite 계정으로 로그인하면 자동으로 방 참여를 진행합니다.`;
            }
        }
    }

