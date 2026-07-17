// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.2.10',
        appVersion: 'HearMe2nite v1.0 STEP6.2.10',
        step: 'STEP6.2.10',
        build: '20260717',
        releaseDate: '2026.07.17',
        stage: 'Beta',
        title: '홈 기록 통계 센터 준비',
        description: '기록 날짜와 오늘의 요약 사이에서 주요 기록 항목의 주간·한 달 흐름을 카드와 캘린더로 확인할 수 있게 준비했습니다.',
        changes: Object.freeze([
            '기록 날짜와 오늘의 요약 사이에 기록 통계 카드 추가',
            '오늘의 약속, 나의 루틴, 기분, 체중, 운동, 수분, 기상, 식사, 외출, 취침, 하루 기록 메뉴 제공',
            '각 메뉴를 누르면 중앙 모달에서 주간·한 달 캘린더 통계 표시',
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
