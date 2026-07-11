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

        const requiredElementIds = [
            'recordDate', 'authEmail', 'authPassword', 'roomCode', 'currentRoomInfo',
            'saveStatus', 'historyList', 'historyPanelOverlay', 'historyDetailOverlay',
            'chatMessages', 'chatInput', 'missionModalOverlay',
            'verificationEmailText', 'verificationStatus', 'guideModal'
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
            'checkEmailVerificationStatus', 'resendEmailVerification', 'showEmailVerificationPanel'
        ];
        requiredFunctions.forEach((name) => {
            // eval 결과가 function인지 확인한다. 일부 함수는 전역 프로퍼티가 아닌 스크립트 스코프에 존재한다.
            let isFunction = false;
            try { isFunction = eval(`typeof ${name}`) === 'function'; } catch (err) { isFunction = false; }
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
        const firebaseHealthy = firebaseChecks.sdkLoaded && firebaseChecks.authReady && firebaseChecks.databaseReady
            && firebaseChecks.projectId === 'our-baby-care'
            && /our-baby-care-default-rtdb/.test(firebaseChecks.databaseURL || '');
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

