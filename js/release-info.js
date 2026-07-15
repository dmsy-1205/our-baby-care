// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP5.10.10',
        appVersion: 'HearMe2nite v1.0 STEP5.10.10',
        step: 'STEP5.10.10',
        build: '20260715',
        releaseDate: '2026.07.15',
        stage: 'Beta',
        title: '기록 삭제 이력·Sub 알림·30일 복구 안전장치',
        description: 'Dom의 기록 삭제를 추적하고 Sub에게 알리며, 삭제 원본을 30일 동안 안전하게 복구할 수 있습니다.',
        changes: Object.freeze([
            'Dom이 기록을 삭제하기 전에 days·dayAdmin 원본을 삭제 이력에 안전하게 보관',
            '삭제 날짜·삭제자·삭제 시간·앱 버전·수동 삭제 사유를 Firebase에 기록',
            'Sub 홈과 기록실에 미확인 기록 삭제 알림 표시',
            'Dom이 삭제 후 30일 동안 기록실에서 원본 기록 복구 가능',
            '복구 후에도 삭제·복구 감사 이력을 유지하여 업데이트 오류와 수동 삭제를 구분',
            '사용자 설명서에 기록 삭제 알림과 복구 방법 추가',
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
