// HearMe2nite current release summary.
// Keep only the current user-facing completion summary here.
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.2.14.78',
        appVersion: 'HearMe2nite v1.0 STEP6.2.14.78',
        step: 'STEP6.2.14.78',
        build: '20260723',
        releaseDate: '2026.07.23',
        stage: 'Beta',
        title: '우리만의 역할 표시명',
        description: 'Dom/Sub 권한 체계는 그대로 유지하면서 Room마다 화면에 보이는 역할 이름을 각자 설정할 수 있습니다.',
        userChanges: Object.freeze([
            '우리의 공간에서 각 사용자가 자신의 Dom/Sub 화면 표시명을 설정할 수 있으며 실제 권한은 바뀌지 않습니다.',
            '오늘의 순간 사진은 한두 장일 때 중앙에 정렬되며 날짜별 기록에서도 사진 문구를 함께 확인할 수 있습니다.',
            'Dom의 기상·취침·기분·여유·한마디가 날짜별 오늘의 기록에 함께 보관됩니다.',
            '코멘트 알림과 기록 화면은 중복 버튼 없이 하나의 대화창으로 연결되고, 새 코멘트 수를 숫자로 알려줍니다.',
            '관계 종료 시 양쪽의 기록 접근과 작성이 잠기며, 두 사람이 관계 회복에 동의하면 보존된 공간을 다시 사용할 수 있습니다.',
            '오늘의 요약과 나의 루틴, 날짜별 기록은 계정·공간·날짜 전환 중에도 이전 응답이 섞이지 않도록 보호됩니다.',
            '로그인, 라이트·다크 테마와 모바일·Fold·태블릿·PC 화면을 같은 기능 구조로 정돈했습니다.',
            'PWA는 오프라인 안내와 안전한 업데이트 흐름을 제공하며 테스트와 메인 Firebase 환경의 혼동을 차단합니다.'
        ]),
        changes: Object.freeze([
            'Finalized Dom/Sub access, relationship lifecycle, and stale-session guards',
            'Finalized protected daily records, media uploads, comments, and notifications',
            'Finalized responsive login, home, category routes, and light/dark surfaces',
            'Finalized PWA startup, offline fallback, cache versioning, and environment checks',
            'Kept Hosting deployment and Database rules deployment on separate test-only paths'
        ])
    });

    window.HM_RELEASE = release;

    function escapeReleaseHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderReleaseInfo() {
        document.title = `${release.appVersion} · ${release.title}`;
        document.querySelectorAll('[data-hm-release-version]').forEach((el) => { el.textContent = release.version; });
        document.querySelectorAll('[data-hm-release-step]').forEach((el) => { el.textContent = release.step; });
        document.querySelectorAll('[data-hm-release-date]').forEach((el) => { el.textContent = release.releaseDate; });
        document.querySelectorAll('[data-hm-release-stage]').forEach((el) => { el.textContent = release.stage; });
        document.querySelectorAll('[data-hm-release-title]').forEach((el) => { el.textContent = release.title; });
        document.querySelectorAll('[data-hm-release-description]').forEach((el) => { el.textContent = release.description; });

        const badge = document.getElementById('appVersionBadge');
        if (badge) badge.textContent = `Version ${release.version}`;

        const list = document.getElementById('helpLatestChanges');
        if (list) list.innerHTML = release.userChanges.map((item) => `<li>${escapeReleaseHtml(item)}</li>`).join('');

        const updateCard = document.getElementById('helpLatestUpdateCard');
        if (updateCard) {
            updateCard.dataset.helpKeywords = `업데이트 최신 버전 ${release.version} ${release.title} ${release.userChanges.join(' ')}`;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderReleaseInfo, { once: true });
    } else {
        renderReleaseInfo();
    }

    window.hmRenderReleaseInfo = renderReleaseInfo;
})();
