// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// qa.js - Final QA / Usability
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // =========================================================
    // RC2 v2.7.0 STEP5: ERROR LOG + FINAL STABILITY QA
    // 분리 후보: qa.js 또는 boot.js
    // 목적: 배포 전 최종 상태를 브라우저 콘솔에서 확인할 수 있게 하고,
    //       필수 DOM/함수/전역 상태 누락을 조기 감지한다.
    // =========================================================
    function hmQaLog(level, context, message, extra) {
        const entry = { level, context, message, extra: extra || null, at: new Date().toISOString() };
        if (!window.hmQaState) window.hmQaState = hmQaState;
        if (level === 'error') window.hmQaState.errors.push(entry);
        else if (level === 'warn') window.hmQaState.warnings.push(entry);
        else window.hmQaState.checks.push(entry);

        const prefix = `[HearMe2nite QA][${context}] ${message}`;
        if (level === 'error') console.error(prefix, extra || '');
        else if (level === 'warn') console.warn(prefix, extra || '');
        else console.info(prefix, extra || '');
    }

    function hmRunFinalStabilityQA() {
        if (window.__hmFinalStabilityQARan) return;
        window.__hmFinalStabilityQARan = true;
        window.hmQaState = hmQaState;
        window.hmQaVersion = HM_APP_VERSION;

        const releaseInfo = window.HM_RELEASE || null;
        const releaseVersionOk = !!(releaseInfo && releaseInfo.appVersion === HM_APP_VERSION);
        hmQaLog(releaseVersionOk ? 'info' : 'error', 'RELEASE_SYNC', releaseVersionOk
            ? `릴리스 정보 동기화 OK (${HM_APP_VERSION})`
            : `릴리스 정보 불일치: release=${releaseInfo ? releaseInfo.appVersion : '없음'}, app=${HM_APP_VERSION}`);
        const versionBadge = document.getElementById('appVersionBadge');
        const expectedBadge = releaseInfo ? `Version ${releaseInfo.version}` : '';
        const badgeOk = !!(versionBadge && releaseInfo && versionBadge.textContent.trim() === expectedBadge);
        hmQaLog(badgeOk ? 'info' : 'warn', 'RELEASE_SYNC', badgeOk
            ? '홈 버전 표시 동기화 OK'
            : `홈 버전 표시 확인 필요: expected=${expectedBadge}, actual=${versionBadge ? versionBadge.textContent.trim() : '없음'}`);
        const guideVersion = document.querySelector('#helpLatestUpdateCard [data-hm-release-version]');
        const guideOk = !!(guideVersion && releaseInfo && guideVersion.textContent.trim() === releaseInfo.version);
        hmQaLog(guideOk ? 'info' : 'warn', 'RELEASE_SYNC', guideOk
            ? '사용자 설명서 업데이트 버전 동기화 OK'
            : '사용자 설명서 업데이트 버전 확인 필요');

        const requiredElementIds = [
            'recordDate', 'authEmail', 'authPassword', 'roomCode', 'currentRoomInfo',
            'saveStatus', 'historyList', 'historyPanelOverlay', 'historyDetailOverlay',
            'chatMessages', 'chatInput', 'chatSender', 'missionModalOverlay',
            'verificationEmailText', 'verificationStatus', 'guideModal', 'profileOverlay', 'profileNicknameInput'
        ];
        requiredElementIds.forEach((id) => {
            const found = !!document.getElementById(id);
            hmQaLog(found ? 'info' : 'warn', 'DOM', `${id} ${found ? 'OK' : '누락 확인 필요'}`);
        });

        const requiredFunctions = [
            'handleAuthSubmit', 'logoutUser', 'createMyRoom', 'acceptInviteFromInput',
            'createInviteCode', 'connectAndListenFirebase', 'triggerAutoSave', 'executeAutoSave',
            'displayHistory', 'renderCalendar', 'openDailyModal', 'closeDailyModal',
            'openMissionModal', 'closeMissionModal', 'listenChat', 'sendChatMessage',
            'checkEmailVerificationStatus', 'resendEmailVerification', 'showEmailVerificationPanel',
            'loadUserProfile', 'openProfileModal', 'saveProfileNickname', 'hmGetChatDisplayName',
            'loadUserTheme', 'openThemeModal', 'previewPersonalTheme', 'savePersonalTheme', 'selectThemeMode', 'hmRefreshThemeForActiveRoom'
        ];
        requiredFunctions.forEach((name) => {
            // 전역 함수 테이블을 직접 확인해 동적 코드 실행 없이 진단한다.
            const isFunction = typeof window[name] === 'function';
            hmQaLog(isFunction ? 'info' : 'warn', 'FUNCTION', `${name} ${isFunction ? 'OK' : '누락 확인 필요'}`);
        });

        const duplicateFunctions = [];
        try {
            const scriptText = Array.from(document.scripts).map(script => script.textContent || '').join('\n');
            const matches = [...scriptText.matchAll(/function\s+([a-zA-Z0-9_$]+)\s*\(/g)].map(match => match[1]);
            const counts = matches.reduce((acc, name) => { acc[name] = (acc[name] || 0) + 1; return acc; }, {});
            Object.keys(counts).forEach((name) => { if (counts[name] > 1) duplicateFunctions.push(`${name} x${counts[name]}`); });
        } catch (err) {
            hmQaLog('warn', 'DUPLICATE_SCAN', '중복 함수 스캔 중 경고', err);
        }
        if (duplicateFunctions.length) hmQaLog('warn', 'DUPLICATE_SCAN', '중복 함수 확인 필요', duplicateFunctions);
        else hmQaLog('info', 'DUPLICATE_SCAN', '중복 함수 없음');

        // STEP5.5: 중복 DOM id, Firebase 초기화, 핵심 설정값을 읽기 전용으로 점검한다.
        const allIds = Array.from(document.querySelectorAll('[id]')).map((el) => el.id).filter(Boolean);
        const duplicateIds = Object.entries(allIds.reduce((acc, id) => {
            acc[id] = (acc[id] || 0) + 1;
            return acc;
        }, {})).filter(([, count]) => count > 1).map(([id, count]) => `${id} x${count}`);
        if (duplicateIds.length) hmQaLog('warn', 'DOM_ID_SCAN', '중복 id 확인 필요', duplicateIds);
        else hmQaLog('info', 'DOM_ID_SCAN', '중복 id 없음');

        const firebaseChecks = {
            sdkLoaded: typeof firebase !== 'undefined',
            authReady: typeof babyAuth !== 'undefined' && !!babyAuth,
            databaseReady: typeof db !== 'undefined' && !!db,
            projectId: typeof babyFirebaseConfig !== 'undefined' ? babyFirebaseConfig.projectId : '',
            databaseURL: typeof babyFirebaseConfig !== 'undefined' ? babyFirebaseConfig.databaseURL : ''
        };
        const allowedFirebaseProjects = ['our-baby-care', 'hearme2nite1205'];
        const firebaseHealthy = firebaseChecks.sdkLoaded && firebaseChecks.authReady && firebaseChecks.databaseReady
            && allowedFirebaseProjects.includes(firebaseChecks.projectId)
            && /^https:\/\//.test(firebaseChecks.databaseURL || '');
        hmQaLog(firebaseHealthy ? 'info' : 'error', 'FIREBASE', firebaseHealthy ? 'Firebase 기본 연결 설정 OK' : 'Firebase 기본 연결 설정 확인 필요', firebaseChecks);

        const authPolicyHealthy = typeof hmGetEmailVerificationPolicy === 'function'
            && typeof checkEmailVerificationStatus === 'function'
            && typeof resendEmailVerification === 'function';
        hmQaLog(authPolicyHealthy ? 'info' : 'error', 'AUTH_POLICY', authPolicyHealthy ? '신규 회원 이메일 인증 함수 OK' : '이메일 인증 함수 확인 필요');

        hmQaLog('info', 'BOOT', `${HM_APP_VERSION} 로드 완료`, {
            online: navigator.onLine,
            firebaseReady: typeof firebase !== 'undefined',
            currentUser: !!currentUser,
            activeRoomCode: activeRoomCode || ''
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hmRunFinalStabilityQA);
    } else {
        hmRunFinalStabilityQA();
    }



    // =========================================================
    // RC2 v2.7.0 STEP4: USABILITY QA / BUTTON & POPUP SAFETY
    // 분리 후보: usability.js 또는 popup.js
    // 목적: 기능 변경 없이 팝업/버튼 사용 중 발생할 수 있는 UX 오류를 방지한다.
    // =========================================================
    function hmSetupUsabilityQA() {
        if (window.__hmUsabilityQABound) return;
        window.__hmUsabilityQABound = true;

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const closed = hmCloseTopModal();
                if (closed) event.preventDefault();
            }
        });

        document.addEventListener('click', (event) => {
            const button = event.target.closest('button, .btn-delete, .history-thumb, .calendar-day.has-record');
            if (!button) return;

            // 빠른 연속 클릭으로 같은 저장/삭제/전송 동작이 중복 실행되는 것을 완화한다.
            const now = Date.now();
            const lastClick = Number(button.dataset.hmLastClickAt || 0);
            const isRapidClick = now - lastClick < 360;
            button.dataset.hmLastClickAt = String(now);

            const allowRapid = button.classList.contains('btn-water') || button.classList.contains('mood-btn') || button.classList.contains('choice-btn');
            if (isRapidClick && !allowRapid) {
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);

        document.addEventListener('submit', (event) => {
            // form이 생기더라도 페이지 리로드로 입력값이 날아가지 않도록 기본 제출을 막는다.
            event.preventDefault();
        });

        document.addEventListener('touchmove', (event) => {
            // 팝업이 열려 있을 때 배경 스크롤 튐을 줄인다. 팝업 내부 스크롤은 허용한다.
            if (!document.body.classList.contains('hm-modal-open')) return;
            if (event.target.closest('.daily-modal, .room-settings-modal, .mission-modal, .guide-card, .history-panel-modal, .history-detail-modal')) return;
            event.preventDefault();
        }, { passive: false });
    }

    hmSetupUsabilityQA();

    // STEP5.5: 배포 후 콘솔에서 읽기 전용 QA 결과를 다시 확인할 수 있다.
    window.hmGetQaReport = function hmGetQaReport() {
        return JSON.parse(JSON.stringify(window.hmQaState || hmQaState));
    };
    window.hmPrintQaSummary = function hmPrintQaSummary() {
        const report = window.hmGetQaReport();
        const summary = {
            version: window.hmQaVersion || HM_APP_VERSION,
            checks: report.checks.length,
            warnings: report.warnings.length,
            errors: report.errors.length,
            bootedAt: report.bootedAt
        };
        console.table(summary);
        if (report.warnings.length) console.warn('[HearMe2nite QA] warnings', report.warnings);
        if (report.errors.length) console.error('[HearMe2nite QA] errors', report.errors);
        return summary;
    };



    // =========================================================
    // STEP5.6.4.2: CHAT / READ STATUS SECURITY QA
    // 기능을 변경하지 않고 현재 로그인 계정의 보안 적용 상태를 읽기 전용으로 확인한다.
    // 콘솔 실행: await hmRunSecurityCompatibilityQA()
    // =========================================================
    window.hmRunSecurityCompatibilityQA = async function hmRunSecurityCompatibilityQA() {
        const result = {
            version: HM_APP_VERSION,
            checkedAt: new Date().toISOString(),
            signedIn: !!currentUser,
            uid: currentUser ? currentUser.uid : '',
            email: currentUser ? (currentUser.email || '') : '',
            emailVerified: !!(currentUser && currentUser.emailVerified),
            activeRoomCode: activeRoomCode || '',
            activeRoomRole: activeRoomRole || '',
            activeRelationshipRole: activeRelationshipRole || '',
            adminValueIsTrue: false,
            membershipExists: false,
            membershipRole: '',
            membershipRelationshipRole: '',
            canManagePrivateNote: false,
            ownerNoteListenerExpected: false,
            ownerNoteListenerConnected: !!ownerNoteRef,
            checks: [],
            warnings: [],
            errors: []
        };

        const add = (level, name, ok, detail) => {
            const item = { name, ok: !!ok, detail: detail || '' };
            result[level].push(item);
            const method = level === 'errors' ? 'error' : level === 'warnings' ? 'warn' : 'info';
            console[method](`[HearMe2nite Security QA] ${ok ? 'OK' : 'CHECK'} ${name}`, detail || '');
        };

        if (!currentUser) {
            add('errors', '로그인 상태', false, '로그인 후 다시 실행하세요.');
            console.table(result);
            window.hmLastSecurityCompatibilityReport = result;
            return result;
        }
        add('checks', '로그인 상태', true, currentUser.email || currentUser.uid);
        add(result.emailVerified ? 'checks' : 'warnings', '이메일 인증', result.emailVerified, result.emailVerified ? '인증됨' : '미인증 계정');

        try {
            const adminSnap = await db.ref(`admins/${currentUser.uid}`).once('value');
            result.adminValueIsTrue = adminSnap.val() === true;
            add('checks', '관리자 판정 true 기준', true, result.adminValueIsTrue ? '관리자' : '일반 사용자');
        } catch (err) {
            add('errors', '관리자 판정 읽기', false, err && err.code ? err.code : String(err));
        }

        if (!activeRoomCode) {
            add('warnings', '활성 Room', false, 'Room 연결 후 다시 실행하세요.');
        } else {
            try {
                const memberSnap = await db.ref(`roomMembers/${activeRoomCode}/${currentUser.uid}`).once('value');
                const member = memberSnap.val() || {};
                result.membershipExists = memberSnap.exists();
                result.membershipRole = member.role || '';
                result.membershipRelationshipRole = member.relationshipRole || '';
                add(result.membershipExists ? 'checks' : 'errors', '현재 Room 멤버십', result.membershipExists, result.membershipExists ? `${result.membershipRole}/${result.membershipRelationshipRole}` : '멤버십 없음');
            } catch (err) {
                add('errors', '현재 Room 멤버십 읽기', false, err && err.code ? err.code : String(err));
            }
        }

        result.canManagePrivateNote = typeof canManageRelationshipCards === 'function' && canManageRelationshipCards();
        result.ownerNoteListenerExpected = result.canManagePrivateNote && !!activeRoomCode;
        const listenerCorrect = result.ownerNoteListenerExpected ? !!ownerNoteRef : !ownerNoteRef;
        add(listenerCorrect ? 'checks' : 'warnings', '비공개 메모 리스너', listenerCorrect,
            result.ownerNoteListenerExpected
                ? (ownerNoteRef ? 'Dom/Owner 리스너 연결됨' : 'Dom/Owner지만 리스너 미연결')
                : (ownerNoteRef ? 'Sub/비관리 계정에 리스너가 연결됨' : 'Sub/비관리 계정 리스너 차단됨'));

        const roleConsistent = !result.membershipExists || !result.membershipRelationshipRole || !activeRelationshipRole || result.membershipRelationshipRole === activeRelationshipRole;
        add(roleConsistent ? 'checks' : 'warnings', '관계 역할 일치', roleConsistent,
            `active=${activeRelationshipRole || '-'}, member=${result.membershipRelationshipRole || '-'}`);

        console.group('[HearMe2nite Security QA] 결과');
        console.table({
            version: result.version,
            signedIn: result.signedIn,
            emailVerified: result.emailVerified,
            activeRoomCode: result.activeRoomCode,
            adminValueIsTrue: result.adminValueIsTrue,
            membershipExists: result.membershipExists,
            role: `${result.membershipRole || '-'}/${result.membershipRelationshipRole || '-'}`,
            ownerNoteListenerExpected: result.ownerNoteListenerExpected,
            ownerNoteListenerConnected: result.ownerNoteListenerConnected,
            warnings: result.warnings.length,
            errors: result.errors.length
        });
        console.groupEnd();
        window.hmLastSecurityCompatibilityReport = result;
        return result;
    };

    window.hmGetLastSecurityCompatibilityReport = function hmGetLastSecurityCompatibilityReport() {
        return window.hmLastSecurityCompatibilityReport
            ? JSON.parse(JSON.stringify(window.hmLastSecurityCompatibilityReport))
            : null;
    };
