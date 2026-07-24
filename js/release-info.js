// HearMe2nite current release summary.
// Keep only the current user-facing completion summary here.
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.2.14.89',
        appVersion: 'HearMe2nite v1.0 STEP6.2.14.89',
        step: 'STEP6.2.14.89',
        build: '20260724',
        releaseDate: '2026.07.24',
        stage: 'Beta',
        title: '약속·루틴 사진과 통합 보관',
        description: '오늘의 약속과 나의 루틴에 사진을 선택해 저장하고, 오늘의 순간과 식사 사진도 테스트·메인에서 같은 안전한 Storage 구조로 보관합니다.',
        userChanges: Object.freeze([
            '오늘의 약속과 나의 루틴마다 대표 사진을 선택·미리보기·교체·삭제할 수 있습니다.',
            '오늘의 순간과 식사 사진은 테스트와 메인 모두 같은 보안 API를 거쳐 Storage에 저장되며 기존 Base64 사진도 계속 볼 수 있습니다.',
            '갤럭시와 iPhone의 홈 카드 배열을 고정하고, 역할 닉네임은 안내문에서 8자 이후 말줄임표로 표시해 긴 이름도 화면을 벗어나지 않습니다.',
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
