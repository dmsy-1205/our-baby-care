// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.2.10.10',
        appVersion: 'HearMe2nite v1.0 STEP6.2.10.10',
        step: 'STEP6.2.10.10',
        build: '20260718',
        releaseDate: '2026.07.18',
        stage: 'Beta',
        title: 'Our Flow Monthly Heatmap Redesign',
        description: '우리의 흐름 한 달 통계를 작은 막대형 대신 달력형 히트맵으로 바꾸고, 모바일·폴드·태블릿·컴퓨터에서 가로 깨짐을 막았습니다.',
        changes: Object.freeze([
            'Changed monthly promise and routine charts to calendar-style achievement heatmaps',
            'Changed monthly check charts to calendar-style dot heatmaps',
            'Changed monthly meal charts to calendar-style three-dot heatmaps',
            'Added weekday headers and fixed seven-column monthly layout across screen sizes',
            'Expanded line and water charts slightly for better readability',
            '기존 days 기록을 읽기만 하며 Firebase 저장 구조는 변경하지 않음'
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
