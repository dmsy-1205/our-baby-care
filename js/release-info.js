// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.2.13.5',
        appVersion: 'HearMe2nite v1.0 STEP6.2.13.5',
        step: 'STEP6.2.13.5',
        build: '20260720',
        releaseDate: '2026.07.20',
        stage: 'Beta',
        title: 'Security Hardening Pass',
        description: '보안 검수에서 발견된 항목을 수정했습니다: Hosting 보안 헤더 추가, 기록실 onclick 이스케이프 일원화, 프로필 사진 Storage 열람 범위 축소.',
        changes: Object.freeze([
            'Added CSP / X-Frame-Options / X-Content-Type-Options / Referrer-Policy / HSTS / Permissions-Policy hosting headers',
            'Extracted index.html inline theme-init script into js/theme-init.js',
            'Added global escapeJs() helper in js/utils.js and applied it to every date/id value previously interpolated unescaped into onclick attributes in js/history.js',
            'storage.rules: profile photo read narrowed from "any authenticated user" to "owner only" (feature is not yet wired up client-side, so this is a safe tightening)',
            '기존 기록/채팅 저장 구조 변경 없음 — 보안/인프라 항목만 수정'
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
