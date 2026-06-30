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
    // MODULE: MASTEROS APP ACCESS GATE
    // v0.10.17 Master UID Access Gate
    // 승인 확인은 babyAuth UID가 아니라 MasterOS(masterAuth) UID 기준으로 한다.
    // MasterOS DB 경로: userAppAccess/{masterUid}/baby-care-secure
    // 보조 확인 경로: appAccessRequests/baby-care-secure/{masterUid}
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

    function isMasterAccessApproved(accessData) {
        return !!accessData && accessData.status === 'approved' && accessData.active === true;
    }

    function isMasterAccessExplicitlyBlocked(accessData) {
        return !!accessData && (accessData.status === 'rejected' || accessData.status === 'blocked' || accessData.active === false);
    }

    async function readMasterAccess(masterUid) {
        if (!masterUid) {
            return { approved: false, blocked: false, reason: 'NO_MASTER_UID', source: 'none', data: null };
        }

        const appId = HM_MASTER_APP_ID || 'baby-care-secure';
        const primarySnap = await masterDb.ref(`userAppAccess/${masterUid}/${appId}`).once('value');
        const primaryData = primarySnap.val();

        if (isMasterAccessApproved(primaryData)) {
            return { approved: true, blocked: false, reason: 'APPROVED_USER_ACCESS', source: 'userAppAccess', data: primaryData };
        }
        if (isMasterAccessExplicitlyBlocked(primaryData)) {
            return { approved: false, blocked: true, reason: 'EXPLICITLY_BLOCKED_USER_ACCESS', source: 'userAppAccess', data: primaryData };
        }

        // 기존 MasterOS 데이터에는 승인 신청 경로도 남아 있으므로 보조 확인한다.
        const requestSnap = await masterDb.ref(`appAccessRequests/${appId}/${masterUid}`).once('value');
        const requestData = requestSnap.val();
        if (requestData && requestData.status === 'approved') {
            return { approved: true, blocked: false, reason: 'APPROVED_ACCESS_REQUEST', source: 'appAccessRequests', data: requestData };
        }
        if (requestData && (requestData.status === 'rejected' || requestData.status === 'blocked')) {
            return { approved: false, blocked: true, reason: 'EXPLICITLY_BLOCKED_ACCESS_REQUEST', source: 'appAccessRequests', data: requestData };
        }

        return { approved: false, blocked: false, reason: 'NO_APPROVED_ACCESS_RECORD', source: 'none', data: primaryData || requestData || null };
    }

    async function verifyMasterAppAccess(options = {}) {
        const masterUser = await waitForMasterUser(options.timeoutMs || 5000);
        if (!masterUser) {
            return { approved: false, blocked: false, reason: 'MASTER_AUTH_NOT_READY', source: 'auth', masterUid: '' };
        }

        try {
            const result = await readMasterAccess(masterUser.uid);
            result.masterUid = masterUser.uid;
            result.masterEmail = masterUser.email || '';
            console.log('[Access Gate] MasterOS approval check', result);
            return result;
        } catch (err) {
            console.error('[Access Gate] MasterOS approval read failed', err);
            return { approved: false, blocked: false, reason: 'MASTER_ACCESS_READ_FAILED', source: 'error', error: err, masterUid: masterUser.uid, masterEmail: masterUser.email || '' };
        }
    }

    function showAccessDeniedScreen(reason) {
        const authBox = document.getElementById('authBox');
        const appContent = document.getElementById('appContent');
        if (appContent) appContent.style.display = 'none';
        if (authBox) {
            authBox.classList.remove('is-hidden');
            authBox.style.display = 'grid';
            authBox.innerHTML = `
                <section class="hm-login-panel" style="max-width:520px;margin:auto;text-align:center;">
                    <div class="hm-login-panel-head" style="justify-content:center;">
                        <span class="hm-login-lock" aria-hidden="true">🔒</span>
                        <div><p class="hm-login-kicker">ACCESS REQUIRED</p><h2>앱 사용 권한이 없습니다</h2></div>
                    </div>
                    <div class="hm-login-trust" style="text-align:center;">
                        <strong>MasterOS Platform 승인이 필요합니다.</strong>
                        <span>HearMe2nite는 승인된 사용자만 사용할 수 있습니다.<br>플랫폼에서 앱 사용 승인을 받은 뒤 다시 로그인해 주세요.</span>
                    </div>
                    <p class="hm-login-small">오류 코드: ${escapeHtml(reason || 'NO_APPROVED_ACCESS_RECORD')}</p>
                    <button type="button" class="btn-main hm-login-button" onclick="location.href='https://hearu2nite.netlify.app/'">플랫폼으로 이동</button>
                </section>`;
        }
    }

    async function blockCurrentSession(reason) {
        disconnectAllListeners();
        try { await babyAuth.signOut(); } catch(e) { console.warn(e); }
        try { await masterAuth.signOut(); } catch(e) { console.warn(e); }
        currentUser = null;
        showAccessDeniedScreen(reason);
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

            // 2단계: MasterOS 승인 확인. 승인되지 않으면 babyAuth 로그인 전에 차단한다.
            showSaveStatus('🔐 앱 승인 상태 확인 중...');
            const access = await verifyMasterAppAccess({ timeoutMs: 5000 });
            if (!access.approved) {
                await masterAuth.signOut();
                showAccessDeniedScreen(access.reason);
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
                // 여기서만 자동 입력합니다. 다른 계정의 브라우저 저장값은 사용하지 않습니다.
                document.getElementById('roomCode').value = savedRoom;
                const allowed = await canCurrentUserAccessRoom(savedRoom);
                if (allowed) {
                    activeRoomCode = savedRoom;
                    activeRoomRole = await getCurrentUserRoomRole(savedRoom) || 'member';
                    activeRelationshipRole = await getCurrentUserRelationshipRole(savedRoom) || defaultRelationshipRole || (activeRoomRole === 'owner' ? 'dom' : 'sub');
                    pendingRelationshipRole = activeRelationshipRole;
                    if (activeRelationshipRole && !defaultRelationshipRole) {
                        await db.ref(`users/${currentUser.uid}/relationshipRole`).set(activeRelationshipRole);
                    }
                    updateCurrentRoomInfo();
                    connectAndListenFirebase();
                } else {
                    await db.ref(`users/${currentUser.uid}/activeRoom`).remove();
                    clearRoomInputs();
                    showSaveStatus('🔒 이 계정은 저장된 공유코드 방의 허용 사용자가 아닙니다. 공유코드를 다시 연결해 주세요.');
                    resetProtectedDataUI('기존 방 연결 또는 새 초대를 진행해 주세요. ✨');
                }
            } else {
                showSaveStatus('🔑 방을 만들거나 초대코드로 참여해 주세요.');
                resetProtectedDataUI('방을 만들거나 초대코드로 참여하면 기록이 표시됩니다. ✨');
                updateRelationshipRoleUI();
            }
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

