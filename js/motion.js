// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// motion.js - Motion QA
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // MODULE 18. BOOT / MOTION QA
    // 분리 후보: boot.js 또는 motion.js
    // 카드 터치감, 모션 바인딩, MutationObserver 기반 동적 UI 보정을 담당한다.
    // =========================================================
    hmSetupStabilityListeners();

    (function initMotionFinalQA() {
        // =========================================================
        // MODULE: MOTION / TAP FEEDBACK
        // Split-ready target: markInteractiveTap
        // =========================================================
        function markInteractiveTap(target) {
            if (!target || target.dataset.hmTapBound === '1') return;
            target.dataset.hmTapBound = '1';
            target.addEventListener('pointerdown', () => target.classList.add('hm-pressing'), { passive: true });
            target.addEventListener('pointerup', () => target.classList.remove('hm-pressing'), { passive: true });
            target.addEventListener('pointercancel', () => target.classList.remove('hm-pressing'), { passive: true });
            target.addEventListener('pointerleave', () => target.classList.remove('hm-pressing'), { passive: true });
        }

        // =========================================================

        // MODULE: MOTION / BIND TARGETS

        // Split-ready target: bindMotionTargets

        // =========================================================

        function bindMotionTargets() {
            document.querySelectorAll('.daily-card, .room-settings-card, .mission-compact-card, .history-launch-card, .history-day-card, .choice-btn, .mood-btn, .mission-chip, .btn-main, .btn-connect, .daily-modal-save, .chat-send-btn')
                .forEach(markInteractiveTap);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindMotionTargets);
        } else {
            bindMotionTargets();
        }

        const observer = new MutationObserver(bindMotionTargets);
        observer.observe(document.documentElement, { childList: true, subtree: true });
    })();

