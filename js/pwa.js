// =========================================================
// HearMe2nite v1.0 STEP6.2.12.11
// PWA install foundation: manifest + service worker registration
// - FCM/push notification is intentionally separated into the next step.
// =========================================================
(function () {
    const HM_PWA_SW_URL = '/service-worker.js?v=step6-2-12-11-ios-pwa-install-guide-20260718';
    const HM_PWA_DISMISS_KEY = 'hm_pwa_install_dismiss_until';
    const HM_DAY_MS = 24 * 60 * 60 * 1000;
    let deferredInstallPrompt = null;
    let installBanner = null;
    let iosGuideOverlay = null;

    function isStandaloneMode() {
        return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function isIOSDevice() {
        const ua = window.navigator.userAgent || '';
        const platform = window.navigator.platform || '';
        const iOSClassic = /iPhone|iPad|iPod/i.test(ua + platform);
        const iPadDesktopMode = platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
        return iOSClassic || iPadDesktopMode;
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
                <b>${isIOSDevice() ? '아이폰 홈 화면에 추가' : '앱으로 설치하기'}</b>
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

    function ensureIOSGuideOverlay() {
        if (iosGuideOverlay) return iosGuideOverlay;
        iosGuideOverlay = document.createElement('div');
        iosGuideOverlay.className = 'hm-pwa-ios-guide-overlay';
        iosGuideOverlay.hidden = true;
        iosGuideOverlay.setAttribute('role', 'dialog');
        iosGuideOverlay.setAttribute('aria-modal', 'true');
        iosGuideOverlay.setAttribute('aria-label', '아이폰 홈 화면 추가 안내');
        iosGuideOverlay.innerHTML = `
            <div class="hm-pwa-ios-guide-card">
                <button type="button" class="hm-pwa-ios-guide-close" aria-label="닫기">×</button>
                <span class="hm-pwa-ios-guide-icon" aria-hidden="true">📲</span>
                <strong>아이폰은 직접 추가해야 해요</strong>
                <p>Safari 하단의 <b>공유 버튼</b>을 누른 뒤<br><b>홈 화면에 추가</b>를 선택하면 앱처럼 열 수 있어요.</p>
                <ol>
                    <li>Safari에서 HearMe2nite 열기</li>
                    <li>공유 버튼 누르기</li>
                    <li>홈 화면에 추가 선택</li>
                </ol>
                <button type="button" class="hm-pwa-ios-guide-ok">알겠어요</button>
            </div>
        `;
        iosGuideOverlay.addEventListener('click', (event) => {
            if (
                event.target === iosGuideOverlay ||
                event.target.closest('.hm-pwa-ios-guide-close') ||
                event.target.closest('.hm-pwa-ios-guide-ok')
            ) {
                closeIOSGuide();
            }
        });
        document.body.appendChild(iosGuideOverlay);
        return iosGuideOverlay;
    }

    function openIOSGuide() {
        const overlay = ensureIOSGuideOverlay();
        overlay.hidden = false;
    }

    function closeIOSGuide() {
        if (iosGuideOverlay) iosGuideOverlay.hidden = true;
    }

    async function promptInstall() {
        if (!deferredInstallPrompt) {
            if (isIOSDevice()) {
                openIOSGuide();
                rememberDismiss(3);
            } else if (typeof showToast === 'function') {
                showToast('브라우저 메뉴에서 홈 화면에 추가할 수 있어요.');
                rememberDismiss(1);
                hideInstallBanner();
            }
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
        document.addEventListener('DOMContentLoaded', () => {
            registerServiceWorker();
            if (isIOSDevice() && !isStandaloneMode()) {
                setTimeout(showInstallBanner, 900);
            }
        }, { once: true });
    } else {
        registerServiceWorker();
        if (isIOSDevice() && !isStandaloneMode()) {
            setTimeout(showInstallBanner, 900);
        }
    }
})();
