// =========================================================
// HearMe2nite v1.0 STEP6.2.11.0
// PWA install foundation: manifest + service worker registration
// - FCM/push notification is intentionally separated into the next step.
// =========================================================
(function () {
    const HM_PWA_SW_URL = '/service-worker.js?v=step6-2-11-0-pwa-install-foundation-20260718';
    let deferredInstallPrompt = null;
    let installButton = null;

    function isStandaloneMode() {
        return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function ensureInstallButton() {
        if (installButton || isStandaloneMode()) return installButton;
        installButton = document.createElement('button');
        installButton.type = 'button';
        installButton.className = 'hm-pwa-install-btn';
        installButton.textContent = '앱으로 설치하기';
        installButton.setAttribute('aria-label', 'HearMe2nite 앱 설치하기');
        installButton.addEventListener('click', promptInstall);
        document.body.appendChild(installButton);
        return installButton;
    }

    function showInstallButton() {
        const button = ensureInstallButton();
        if (button) button.hidden = false;
    }

    function hideInstallButton() {
        if (installButton) installButton.hidden = true;
    }

    async function promptInstall() {
        if (!deferredInstallPrompt) {
            if (typeof showToast === 'function') showToast('브라우저 메뉴에서 홈 화면에 추가할 수 있어요.');
            return;
        }
        deferredInstallPrompt.prompt();
        try {
            const choice = await deferredInstallPrompt.userChoice;
            if (choice && choice.outcome === 'accepted' && typeof showToast === 'function') {
                showToast('HearMe2nite가 앱처럼 설치됩니다. 💜');
            }
        } finally {
            deferredInstallPrompt = null;
            hideInstallButton();
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
        showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        hideInstallButton();
        if (typeof showToast === 'function') showToast('HearMe2nite 설치가 완료됐어요. 💜');
    });

    window.hmPromptPwaInstall = promptInstall;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerServiceWorker, { once: true });
    } else {
        registerServiceWorker();
    }
})();
