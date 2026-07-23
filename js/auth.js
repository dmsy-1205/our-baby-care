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
    let hmAuthMode = 'login';

    function setAuthFormStatus(message = '', type = '') {
        const status = document.getElementById('authFormStatus');
        if (!status) return;
        status.textContent = message;
        status.className = `hm-auth-form-status${type ? ` is-${type}` : ''}`;
    }

    function toggleAuthPassword(targetId, button) {
        const input = document.getElementById(targetId);
        if (!input || !button) return;
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        button.textContent = reveal ? '숨김' : '보기';
        button.setAttribute('aria-label', reveal ? '비밀번호 숨기기' : '비밀번호 표시');
        button.setAttribute('aria-pressed', String(reveal));
        input.focus({ preventScroll: true });
    }

    async function resetAuthPassword() {
        const emailInput = document.getElementById('authEmail');
        const email = normalizeEmail(emailInput ? emailInput.value : '');
        if (!email) {
            setAuthFormStatus('비밀번호 재설정 메일을 받을 이메일을 먼저 입력해 주세요.', 'error');
            emailInput?.focus();
            return;
        }
        setAuthFormStatus('비밀번호 재설정 메일을 보내는 중입니다.', 'info');
        try {
            await babyAuth.sendPasswordResetEmail(email);
            setAuthFormStatus('비밀번호 재설정 메일을 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.', 'success');
        } catch (err) {
            setAuthFormStatus(firebaseAuthErrorToKorean(String(err && (err.code || err.message) || '')), 'error');
        }
    }
    let hmSignupFlowActive = false;
    let hmVerificationEmailSentAt = 0;
    let hmVerificationCooldownTimer = null;
    const HM_VERIFICATION_RESEND_COOLDOWN_MS = 60000;

    function setAuthMode(mode) {
        hmAuthMode = mode === 'signup' ? 'signup' : 'login';
        const signup = hmAuthMode === 'signup';
        const confirmGroup = document.getElementById('authPasswordConfirmGroup');
        const confirmInput = document.getElementById('authPasswordConfirm');
        const passwordInput = document.getElementById('authPassword');
        const loginTab = document.getElementById('authLoginTab');
        const signupTab = document.getElementById('authSignupTab');
        const submitBtn = document.getElementById('authSubmitBtn');
        const loginUtility = document.getElementById('authLoginUtility');

        if (confirmGroup) confirmGroup.hidden = !signup;
        if (!signup && confirmInput) confirmInput.value = '';
        if (passwordInput) passwordInput.autocomplete = signup ? 'new-password' : 'current-password';
        if (loginTab) { loginTab.classList.toggle('active', !signup); loginTab.setAttribute('aria-selected', String(!signup)); loginTab.tabIndex = signup ? -1 : 0; }
        if (signupTab) { signupTab.classList.toggle('active', signup); signupTab.setAttribute('aria-selected', String(signup)); signupTab.tabIndex = signup ? 0 : -1; }

        const values = signup ? {
            icon: '✨', kicker: 'SIGN UP', title: '회원가입',
            trustTitle: 'HearMe2nite 시작하기',
            trustText: '이메일과 비밀번호로 계정을 만든 뒤 새로운 공간을 만들거나 초대코드로 참여할 수 있습니다.',
            submit: '회원가입하기',
            help: '회원가입만으로 다른 Room에 접근할 수 없습니다. 공간을 만들거나 유효한 초대코드로 참여해야 합니다.'
        } : {
            icon: '🔐', kicker: 'LOGIN', title: '로그인',
            trustTitle: '안전한 공간으로 들어가기',
            trustText: '기존 HearMe2nite 계정으로 로그인하세요.',
            submit: '로그인하기',
            help: '방을 만들거나 초대코드로 참여하면 연결된 사용자에게만 기록이 표시됩니다.'
        };

        const bindings = {
            authModeIcon: values.icon, authModeKicker: values.kicker, authModeTitle: values.title,
            authModeTrustTitle: values.trustTitle, authModeTrustText: values.trustText,
            authModeHelp: values.help
        };
        Object.entries(bindings).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
        if (submitBtn) submitBtn.textContent = values.submit;
        if (loginUtility) loginUtility.hidden = signup;
        setAuthFormStatus('');
    }


    function setVerificationStatus(message, type = '') {
        const status = document.getElementById('verificationStatus');
        if (!status) return;
        status.textContent = message || '';
        status.className = `hm-verification-status${type ? ` is-${type}` : ''}`;
    }

    function startVerificationResendCooldown(durationMs = HM_VERIFICATION_RESEND_COOLDOWN_MS) {
        const btn = document.getElementById('resendVerificationBtn');
        if (!btn) return;
        if (hmVerificationCooldownTimer) clearInterval(hmVerificationCooldownTimer);
        const endAt = Date.now() + durationMs;
        const render = () => {
            const seconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
            if (seconds <= 0) {
                clearInterval(hmVerificationCooldownTimer);
                hmVerificationCooldownTimer = null;
                btn.disabled = false;
                btn.textContent = '인증 메일 다시 보내기';
                setVerificationStatus('인증 메일을 다시 보낼 수 있습니다.', 'ready');
                return;
            }
            btn.disabled = true;
            btn.textContent = `다시 보내기 (${seconds}초)`;
        };
        render();
        hmVerificationCooldownTimer = setInterval(render, 1000);
    }

    function showEmailVerificationPanel(user) {
        const entryPanel = document.getElementById('authEntryPanel');
        const verifyPanel = document.getElementById('emailVerificationPanel');
        const tabs = document.querySelector('.hm-auth-mode-tabs');
        const trust = document.querySelector('.hm-login-trust');
        const fields = document.querySelectorAll('.hm-login-field');
        const emailText = document.getElementById('verificationEmailText');

        if (entryPanel) entryPanel.hidden = true;
        if (verifyPanel) verifyPanel.hidden = false;
        if (tabs) tabs.hidden = true;
        if (trust) trust.hidden = true;
        fields.forEach(el => { el.hidden = true; });
        if (emailText) emailText.textContent = normalizeEmail((user && user.email) || '가입한 이메일');

        const icon = document.getElementById('authModeIcon');
        const kicker = document.getElementById('authModeKicker');
        const title = document.getElementById('authModeTitle');
        if (icon) icon.textContent = '✉️';
        if (kicker) kicker.textContent = 'VERIFY EMAIL';
        if (title) title.textContent = '이메일 인증';
        setVerificationStatus('인증 메일을 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.', 'info');
    }

    function hideEmailVerificationPanel() {
        const entryPanel = document.getElementById('authEntryPanel');
        const verifyPanel = document.getElementById('emailVerificationPanel');
        const tabs = document.querySelector('.hm-auth-mode-tabs');
        const trust = document.querySelector('.hm-login-trust');
        const fields = document.querySelectorAll('.hm-login-field');

        if (entryPanel) entryPanel.hidden = false;
        if (verifyPanel) verifyPanel.hidden = true;
        if (tabs) tabs.hidden = false;
        if (trust) trust.hidden = false;
        fields.forEach(el => {
            if (el.id === 'authPasswordConfirmGroup') el.hidden = hmAuthMode !== 'signup';
            else el.hidden = false;
        });
        setAuthMode(hmAuthMode);
        setVerificationStatus('');
        if (hmVerificationCooldownTimer) { clearInterval(hmVerificationCooldownTimer); hmVerificationCooldownTimer = null; }
    }

    async function hmGetEmailVerificationPolicy(user) {
        if (!user) return { required: false, existingUser: false };
        let profile = null;
        try {
            const snap = await db.ref(`users/${user.uid}`).once('value');
            profile = snap.val() || null;
        } catch (err) {
            console.warn('[STEP5.2] 이메일 인증 정책 조회 실패:', err);
        }

        const explicitlyRequired = !!(profile && profile.emailVerificationRequired === true);
        // 기존 계정 보호: 가입일을 추정해 차단하지 않는다.
        // STEP5.2 회원가입 흐름 또는 신규 가입 시 저장된 명시적 표시만 인증 대상으로 본다.
        const required = explicitlyRequired || hmSignupFlowActive;
        return { required, existingUser: !required, profile };
    }

    // 신규 인증 사용자의 Realtime Database 쓰기 전에 ID 토큰의
    // email_verified claim을 강제로 갱신한다. user.reload()만으로는
    // user.emailVerified 값만 갱신되고 기존 ID 토큰이 남을 수 있다.
    async function hmEnsureVerifiedAuthToken(user = babyAuth.currentUser) {
        if (!user) return false;
        await user.reload();
        const refreshedUser = babyAuth.currentUser;
        if (!refreshedUser || !refreshedUser.emailVerified) return false;

        const tokenResult = await refreshedUser.getIdTokenResult(true);
        return tokenResult && tokenResult.claims && tokenResult.claims.email_verified === true;
    }

    // STEP6.2.13.5 / ADMIN A18.3: 휴면 데이터는 삭제하지 않고 로그인 시 서버에서 정상 상태로 되돌린다.
    async function hmReactivateLifecycleOnLogin(user = babyAuth.currentUser) {
        if (!user) return { reactivated: false };
        try {
            const app = typeof babyApp !== 'undefined' ? babyApp : firebase.app();
            const projectId = String(app?.options?.projectId || window.HM_FIREBASE_ENV?.projectId || '');
            const callable = firebase.app(app.name).functions('us-central1').httpsCallable('reactivateDormantAccount');
            const response = await callable({ expectedProjectId: projectId });
            const result = response?.data || {};
            if (result.reactivated) {
                showSaveStatus('🌱 휴면 계정이 정상 상태로 복원되었습니다.');
                console.info('[HearMe2nite] dormant lifecycle reactivated', { projectId, restoredAt: result.restoredAt });
            }
            return result;
        } catch (error) {
            // 재활성화 Functions가 아직 배포되지 않은 환경에서도 기존 로그인과 데이터 읽기는 계속한다.
            console.warn('[HearMe2nite] lifecycle reactivation deferred', error?.code || error?.message || error);
            return { reactivated: false, deferred: true };
        }
    }

    async function hmSendVerificationEmail(user, force = false) {
        if (!user || user.emailVerified) return;
        const now = Date.now();
        if (!force && now - hmVerificationEmailSentAt < 10000) return;
        await user.sendEmailVerification();
        hmVerificationEmailSentAt = now;
        startVerificationResendCooldown();
    }

    async function createHearMe2niteAccount(email, password) {
        hmSignupFlowActive = true;
        const credential = await babyAuth.createUserWithEmailAndPassword(email, password);
        const user = credential.user;
        if (!user) throw new Error('auth/user-not-created');

        await db.ref(`users/${user.uid}`).update({
            email: normalizeEmail(user.email || email),
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastLogin: firebase.database.ServerValue.TIMESTAMP,
            hasSeenGuide: false,
            emailVerificationRequired: true,
            emailVerified: false,
            registrationVersion: 'STEP5.2'
        });

        await hmSendVerificationEmail(user, true);
        return user;
    }

    async function checkEmailVerificationStatus() {
        const user = babyAuth.currentUser;
        if (!user) { alert('로그인 정보가 없습니다. 다시 로그인해 주세요.'); return; }
        const btn = document.getElementById('checkVerificationBtn');
        if (btn) btn.disabled = true;
        try {
            await user.reload();
            const refreshedUser = babyAuth.currentUser;
            if (!refreshedUser || !refreshedUser.emailVerified) {
                setVerificationStatus('아직 인증이 확인되지 않았습니다. 메일의 인증 링크를 누른 뒤 다시 확인해 주세요.', 'warning');
                alert('아직 이메일 인증이 확인되지 않았습니다.\n받은편지함 또는 스팸함에서 인증 메일의 링크를 누른 뒤 다시 확인해 주세요.');
                return;
            }
            const tokenReady = await hmEnsureVerifiedAuthToken(refreshedUser);
            if (!tokenReady) {
                throw new Error('auth/email-verification-token-not-refreshed');
            }
            await db.ref(`users/${refreshedUser.uid}`).update({
                emailVerified: true,
                emailVerifiedAt: firebase.database.ServerValue.TIMESTAMP
            });
            hmSignupFlowActive = false;
            setVerificationStatus('이메일 인증이 확인되었습니다.', 'success');
            alert('이메일 인증이 확인되었습니다. HearMe2nite를 시작합니다.');
            window.location.reload();
        } catch (err) {
            console.error(err);
            setVerificationStatus('인증 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
            alert('인증 상태를 확인하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function resendEmailVerification() {
        const user = babyAuth.currentUser;
        if (!user) { alert('로그인 정보가 없습니다. 다시 로그인해 주세요.'); return; }
        const btn = document.getElementById('resendVerificationBtn');
        if (btn && btn.disabled) return;
        if (btn) btn.disabled = true;
        setVerificationStatus('인증 메일을 보내는 중입니다...', 'info');
        try {
            await user.reload();
            if (babyAuth.currentUser && babyAuth.currentUser.emailVerified) {
                await checkEmailVerificationStatus();
                return;
            }
            await hmSendVerificationEmail(babyAuth.currentUser, true);
            setVerificationStatus('인증 메일을 다시 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.', 'success');
            alert('인증 메일을 다시 보냈습니다.\n받은편지함에 없으면 스팸함 또는 정크메일함도 확인해 주세요.');
        } catch (err) {
            console.error(err);
            alert(firebaseAuthErrorToKorean(err.code || err.message));
        } finally {
            if (btn && !hmVerificationCooldownTimer) btn.disabled = false;
        }
    }

    async function handleAuthSubmit() {
        const emailInput = document.getElementById('authEmail');
        const passwordInput = document.getElementById('authPassword');
        const confirmInput = document.getElementById('authPasswordConfirm');
        const submitBtn = document.getElementById('authSubmitBtn');
        const email = normalizeEmail(emailInput ? emailInput.value : '');
        const password = passwordInput ? passwordInput.value : '';
        const passwordConfirm = confirmInput ? confirmInput.value : '';
        const signup = hmAuthMode === 'signup';

        setAuthFormStatus('');

        if (!email || !password) { setAuthFormStatus('이메일과 비밀번호를 입력해 주세요.', 'error'); (!email ? emailInput : passwordInput)?.focus(); return; }
        if (password.length < 6) { setAuthFormStatus('비밀번호는 6자리 이상이어야 합니다.', 'error'); passwordInput?.focus(); return; }
        if (signup && password !== passwordConfirm) { setAuthFormStatus('비밀번호 확인이 일치하지 않습니다.', 'error'); confirmInput?.focus(); return; }

        if (submitBtn) submitBtn.disabled = true;
        if (submitBtn) submitBtn.setAttribute('aria-busy', 'true');
        setAuthFormStatus(signup ? '회원가입을 처리하는 중입니다.' : '로그인하는 중입니다.', 'info');
        try {
            if (signup) {
                showSaveStatus('✨ HearMe2nite 계정을 만드는 중...');
                const newUser = await createHearMe2niteAccount(email, password);
                showEmailVerificationPanel(newUser);
                showSaveStatus('✉️ 이메일 인증 대기 중');
                alert('회원가입이 완료되었습니다.\n가입한 이메일로 인증 메일을 보냈습니다.\n받은편지함에 없으면 스팸함 또는 정크메일함을 확인해 주세요.\n인증을 완료해야 Room을 만들거나 초대에 참여할 수 있습니다.');
            } else {
                showSaveStatus('🔐 HearMe2nite 로그인 확인 중...');
                await babyAuth.signInWithEmailAndPassword(email, password);
                try { if (window.hmRefreshPresenceFromRoom) window.hmRefreshPresenceFromRoom('login-complete'); } catch(e) { console.warn(e); }
                try { if (window.hmPresenceRefresh) setTimeout(window.hmPresenceRefresh, 600); } catch(e) { console.warn(e); }
                showSaveStatus('☁️ 로그인 완료');
                setAuthFormStatus('로그인되었습니다.', 'success');
            }
        } catch (err) {
            const authCode = String(err && (err.code || err.message) || '');
            const expectedAuthError = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/email-already-in-use', 'auth/weak-password'].some((code) => authCode.includes(code));
            if (expectedAuthError) console.warn('[HearMe2nite Auth] 인증 요청이 거절되었습니다:', authCode);
            else console.error('[HearMe2nite Auth] 예상하지 못한 인증 오류', err);
            setAuthFormStatus(firebaseAuthErrorToKorean(authCode), 'error');
            showSaveStatus(signup ? '❌ 회원가입 실패' : '❌ 로그인 실패');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (submitBtn) submitBtn.removeAttribute('aria-busy');
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
            'auth/too-many-requests': '요청이 너무 많습니다. 잠시 기다린 뒤 다시 시도해 주세요.',
            'auth/requires-recent-login': '보안을 위해 다시 로그인한 뒤 시도해 주세요.',
            'auth/user-disabled': '사용이 중지된 계정입니다. 관리자에게 문의해 주세요.',
            'auth/quota-exceeded': '인증 메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
            'auth/internal-error': '인증 서버에서 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
            'auth/weak-password': '비밀번호는 6자리 이상으로 설정해 주세요.',
            'auth/operation-not-allowed': '현재 이메일 회원가입을 사용할 수 없습니다. 관리자에게 문의해 주세요.',
            'auth/user-not-created': '회원가입 계정을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.'
        };
        return map[code] || `로그인 처리 중 오류가 생겼습니다. (${code})`;
    }

    window.toggleAuthPassword = toggleAuthPassword;
    window.resetAuthPassword = resetAuthPassword;

    // =========================================================

    // MODULE: AUTH / LOGOUT

    // Split-ready target: logoutUser

    // =========================================================

    async function logoutUser() {
        window.hmIsLoggingOut = true;
        try {
            try { if (typeof window.hmDiscardPendingMedia === 'function') window.hmDiscardPendingMedia(); } catch(e) { console.warn(e); }
            try { if (typeof window.hmStopSubRoutines === 'function') window.hmStopSubRoutines(); } catch(e) { console.warn(e); }
            try { if (window.hmPresenceStop) window.hmPresenceStop(); } catch(e) { console.warn(e); }
            disconnectAllListeners();
            activeRoomCode = "";
            activeRoomRole = "";
            activeRelationshipRole = "";
            clearRoomInputs();
            clearFormFieldsExceptSync();
            hmSignupFlowActive = false;
            hideEmailVerificationPanel();
            try { await babyAuth.signOut(); } catch(e) { console.warn(e); }
        } finally {
            window.hmIsLoggingOut = false;
        }
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

            // 보안 원칙: roomMembers 전체 목록은 사용자에게 공개하지 않는다.
            // 기존 공간 복구는 users/{uid}/activeRoom 및 userRooms/{uid}만 사용한다.
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
