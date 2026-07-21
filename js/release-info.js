// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.2.13.7',
        appVersion: 'HearMe2nite v1.0 STEP6.2.13.7',
        step: 'STEP6.2.13.7',
        build: '20260721',
        releaseDate: '2026.07.21',
        stage: 'Beta',
        title: 'Daily Moments Gallery',
        description: '관리자가 휴면 처리한 계정의 데이터를 보존하고 사용자가 다시 로그인하면 정상 상태로 자동 복원합니다.',
        changes: Object.freeze([
            'Added the multi-photo Daily Moments gallery',
            'Uses Firebase Storage on hearme2nite1205 and compressed database storage on our-baby-care',
            'Preserves and displays existing single-photo records',
            'Added per-photo preview, full view, and owner deletion',
            'Keeps unread card notifications in a card-specific pending queue',
            'Marks only the selected notification as read',
            'Prevents a shared daily record update from clearing sibling notifications',
            'Added protected dormant-account reactivation on login',
            'Preserves Room and user data during dormancy',
            'Automatic account and Room deletion remains disabled',
            'Added readonly Admin Data Requests module',
            'Shows request type, status, requester, Room code, reason, admin message, and internal memo',
            'Added open/all/completed/closed filters and request search',
            'Refreshed admin and PWA cache keys for STEP6.2.13.4',
            '기존 기록/채팅 저장 구조 변경 없음'
        ])
    });

    window.HM_RELEASE = release;

    function renderReleaseInfo() {
        document.title = `${release.appVersion} · ${release.title}`;
        document.querySelectorAll('[data-hm-release-version]').forEach((el) => {
            el.textContent = release.version;
        });
        document.querySelectorAll('[data-hm-release-step]').forEach((el) => {
            el.textContent = release.step;
        });
        document.querySelectorAll('[data-hm-release-date]').forEach((el) => {
            el.textContent = release.releaseDate;
        });
        document.querySelectorAll('[data-hm-release-stage]').forEach((el) => {
            el.textContent = release.stage;
        });
        document.querySelectorAll('[data-hm-release-title]').forEach((el) => {
            el.textContent = release.title;
        });
        document.querySelectorAll('[data-hm-release-description]').forEach((el) => {
            el.textContent = release.description;
        });

        const badge = document.getElementById('appVersionBadge');
        if (badge) badge.textContent = `Version ${release.version}`;

        const list = document.getElementById('helpLatestChanges');
        if (list) {
            list.innerHTML = release.changes.map((item) => `<li>${escapeReleaseHtml(item)}</li>`).join('');
        }

        const updateCard = document.getElementById('helpLatestUpdateCard');
        if (updateCard) {
            updateCard.dataset.helpKeywords = `업데이트 최신 버전 ${release.version} ${release.title} ${release.changes.join(' ')}`;
        }
    }

    function escapeReleaseHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderReleaseInfo, { once: true });
    } else {
        renderReleaseInfo();
    }

    window.hmRenderReleaseInfo = renderReleaseInfo;
})();
