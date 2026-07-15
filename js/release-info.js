// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP5.10.9',
        appVersion: 'HearMe2nite v1.0 STEP5.10.9',
        step: 'STEP5.10.9',
        build: '20260715',
        releaseDate: '2026.07.15',
        stage: 'Beta',
        title: '사용자 설명서 2.0 및 릴리스 정보 자동 동기화',
        description: '최신 기능 안내와 버전·업데이트 항목을 하나의 릴리스 정보에서 자동으로 표시합니다.',
        changes: Object.freeze([
            '사용자 설명서를 STEP5.10.8까지의 최신 기능 기준으로 전면 개편',
            '나의 루틴 생성·반복·입력·기록실 연동 사용법 추가',
            '개인 테마·우리의 공용 테마·라이트·다크·시스템 모드 안내 추가',
            '계정 설정·오늘의 약속·기록실·데이터 삭제 요청 안내 최신화',
            '홈 버전·브라우저 제목·사용자 설명서·QA 버전을 단일 정보로 자동 동기화',
            '사용자 설명서 업데이트 항목을 릴리스 정보에서 자동 생성'
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
