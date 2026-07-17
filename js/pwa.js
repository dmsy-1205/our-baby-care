// =========================================================
// HearMe2nite v1.0 STEP6.2.11.2
// PWA install foundation: manifest + service worker registration
// - FCM/push notification is intentionally separated into the next step.
// =========================================================
(function () {
    const HM_PWA_SW_URL = '/service-worker.js?v=step6-2-11-2-pwa-install-prompt-comfort-20260718';
    const HM_PWA_DISMISS_KEY = 'hm_pwa_install_dismiss_until';
    const HM_DAY_MS = 24 * 60 * 60 * 1000;
    let deferredInstallPrompt = null;
    let installBanner = null;

    function isStandaloneMode() {
        return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function isInstallDismissed() {
        const until = Number(localStorage.getItem(HM_PWA_DISMISS_KEY) || 0);
        return Number.isFinite(until) && until > Date.now();
    }

    function rememberDismiss(days) {
        try {
            localStorage.setItem(HM_PWA_DISMISS_KEY, String(Date.now() + days * HM_DAY_MS));
        } catch (error) {
            console.warn('[HearMe2nite][PWA] dismiss storage failed', error);
        }
    }

    function ensureInstallBanner() {
        if (installBanner || isStandaloneMode()) return installBanner;
        installBanner = document.createElement('div');
        installBanner.className = 'hm-pwa-install-banner';
        installBanner.setAttribute('role', 'region');
        installBanner.setAttribute('aria-label', 'HearMe2nite 앱 설치 안내');
        installBanner.innerHTML = `
            <button type="button" class="hm-pwa-install-main" aria-label="HearMe2nite 앱 설치하기">
                <span aria-hidden="true">💗</span>
                <b>앱으로 설치하기</b>
            </button>
            <button type="button" class="hm-pwa-install-close" aria-label="앱 설치 안내 닫기">×</button>
        `;
        installBanner.querySelector('.hm-pwa-install-main')?.addEventListener('click', promptInstall);
        installBanner.querySelector('.hm-pwa-install-close')?.addEventListener('click', dismissInstallBanner);
        document.body.appendChild(installBanner);
        return installBanner;
    }

    function showInstallBanner() {
        if (isInstallDismissed()) return;
        const banner = ensureInstallBanner();
        if (banner) banner.hidden = false;
    }

    function hideInstallBanner() {
        if (installBanner) installBanner.hidden = true;
    }

    function dismissInstallBanner() {
        rememberDismiss(7);
        hideInstallBanner();
    }

    async function promptInstall() {
        if (!deferredInstallPrompt) {
            if (typeof showToast === 'function') showToast('브라우저 메뉴에서 홈 화면에 추가할 수 있어요.');
            rememberDismiss(1);
            hideInstallBanner();
            return;
        }
        deferredInstallPrompt.prompt();
        try {
            const choice = await deferredInstallPrompt.userChoice;
            if (choice && choice.outcome === 'accepted' && typeof showToast === 'function') {
                showToast('HearMe2nite가 앱처럼 설치됩니다. 💜');
            } else {
                rememberDismiss(1);
            }
        } finally {
            deferredInstallPrompt = null;
            hideInstallBanner();
        }
    }

    async function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
        try {
            const registration = await navigator.serviceWorker.register(HM_PWA_SW_URL, {
                scope: '/',
                updateViaCache: 'none'
            });
            window.hmPwaServiceWorkerRegistration = registration;
            setTimeout(() => registration.update().catch(() => {}), 1200);
        } catch (error) {
            console.warn('[HearMe2nite][PWA] service worker registration failed', error);
        }
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        showInstallBanner();
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        rememberDismiss(3650);
        hideInstallBanner();
        if (typeof showToast === 'function') showToast('HearMe2nite 설치가 완료됐어요. 💜');
    });

    window.hmPromptPwaInstall = promptInstall;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerServiceWorker, { once: true });
    } else {
        registerServiceWorker();
    }
})();
