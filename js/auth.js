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
    // MODULE: MASTEROS ACCESS GATE
    // v0.10.15 Access Gate Enforced
    // - MasterOS 승인 경로: userAppAccess/{masterUid}/baby-care-secure
    // - status === "approved" 그리고 active === true 인 사용자만 앱 실행
    // - 생활기록 DB/Room/History 구조는 변경하지 않는다.
    // =========================================================
    const HM_MASTER_APP_ID = 'baby-care-secure';

    function waitForMasterAuthUser() {
        return new Promise((resolve) => {
            if (masterAuth.currentUser) {
                resolve(masterAuth.currentUser);
                return;
            }
            const unsubscribe = masterAuth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user || null);
            });
        });
    }

    async function checkMasterAppAccessEnforced(masterUser) {
        if (!masterUser || !masterUser.uid || typeof masterDb === 'undefined') {
            console.warn('[Access Gate] MasterOS 로그인 또는 DB 연결 정보가 없습니다.');
            return { ok: false, reason: 'missing-master-context' };
        }

        try {
            const accessSnap = await masterDb.ref(`userAppAccess/${masterUser.uid}/${HM_MASTER_APP_ID}`).once('value');
            const access = accessSnap.val();
            const passed = !!access && access.status === 'approved' && access.active === true;

            console.groupCollapsed('[Access Gate] HearMe2nite MasterOS approval check');
            console.log('masterUid:', masterUser.uid);
            console.log('appId:', HM_MASTER_APP_ID);
            console.log('status:', access && access.status);
            console.log('active:', access && access.active);
            console.log('result:', passed ? 'PASS' : 'BLOCK');
            console.groupEnd();

            return { ok: passed, access, reason: passed ? 'approved' : 'not-approved' };
        } catch (err) {
            console.error('[Access Gate] 승인 상태 확인 중 오류가 발생했습니다.', err);
            return { ok: false, reason: err && err.code ? err.code : 'access-check-error', error: err };
        }
    }

    function showAccessDeniedMessage() {
        const authBox = document.getElementById('authBox');
        const appContent = document.getElementById('appContent');
        if (appContent) appContent.style.display = 'none';
        if (!authBox) {
            alert('앱 사용 권한이 없습니다. MasterOS Platform에서 앱 승인을 받은 후 사용할 수 있습니다.');
            return;
        }

        document.body.classList.remove('hm-authenticated');
        authBox.classList.remove('is-hidden');
        authBox.style.display = 'grid';
        authBox.innerHTML = `
            <section class="hm-login-hero" aria-label="서비스 소개">
                <div class="hm-login-pill">ACCESS REQUIRED</div>
                <div class="hm-login-mark" aria-hidden="true">🔒</div>
                <h1 class="hm-login-title">HearMe2nite</h1>
                <p class="hm-login-copy">승인된 사용자만<br>둘만의 기록 공간에 들어갈 수 있어요.</p>
            </section>
            <section class="hm-login-panel" aria-label="앱 승인 안내">
                <div class="hm-login-panel-head">
                    <span class="hm-login-lock" aria-hidden="true">⛔</span>
                    <div>
                        <p class="hm-login-kicker">ACCESS</p>
                        <h2>앱 사용 권한이 없습니다</h2>
                    </div>
                </div>
                <div class="hm-login-trust">
                    <strong>MasterOS 승인이 필요합니다</strong>
                    <span>MasterOS Platform에서 HearMe2nite 앱 승인을 받은 후 다시 로그인해 주세요.</span>
                </div>
                <button type="button" class="btn-main hm-login-button" onclick="location.href='https://hearu2nite.netlify.app/'">플랫폼으로 이동</button>
                <p class="hm-login-small">이미 승인을 받았다면 잠시 후 다시 로그인해 주세요.</p>
            </section>
        `;
    }

    async function denyAccessAndSignOut() {
        try { await babyAuth.signOut(); } catch(e) { console.warn(e); }
        try { await masterAuth.signOut(); } catch(e) { console.warn(e); }
        currentUser = null;
        activeRoomCode = '';
        activeRoomRole = '';
        activeRelationshipRole = '';
        pendingRelationshipRole = '';
        disconnectAllListeners();
        showAccessDeniedMessage();
        showSaveStatus('🔒 MasterOS 앱 승인이 필요합니다.');
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
            showSaveStatus('🔐 로그인 확인 중...');

            // 1단계: 2번 사이트(master-app-platform)에 가입된 계정인지 확인
            const masterCredential = await masterAuth.signInWithEmailAndPassword(email, password);

            // v0.10.15 Access Gate: MasterOS 승인 사용자만 생활관리 앱 로그인을 진행한다.
            const accessResult = await checkMasterAppAccessEnforced(masterCredential.user);
            if (!accessResult.ok) {
                await denyAccessAndSignOut();
                return;
            }

            // 2단계: 기존 rooms 데이터가 있는 our-baby-care에도 로그인
            try {
                await babyAuth.signInWithEmailAndPassword(email, password);
            } catch (babyErr) {
                if (babyErr.code === 'auth/user-not-found' || babyErr.code === 'auth/invalid-credential') {
                    // master에는 가입되어 있지만 baby 쪽 계정이 없는 경우만 생성
                    await babyAuth.createUserWithEmailAndPassword(email, password);
                } else if (babyErr.code === 'auth/wrong-password') {
                    alert('2번 사이트 로그인은 성공했지만, 기존 생활관리앱 계정의 비밀번호가 달라서 our-baby-care에 로그인하지 못했습니다. 두 프로젝트의 비밀번호를 맞춰 주세요.');
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

