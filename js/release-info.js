// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.2.14.45',
        appVersion: 'HearMe2nite v1.0 STEP6.2.14.45',
        step: 'STEP6.2.14.45',
        build: '20260723',
        releaseDate: '2026.07.23',
        stage: 'Beta',
        title: '달력 색상 테마 동기화',
        description: '달력의 바깥 베일·날짜 버튼·선택 강조색이 라벤더·블라썸·오션·포레스트·크림 테마를 정확히 따릅니다.',
        userChanges: Object.freeze([
            '나와 상대의 닉네임·접속 상태를 홈 상단에서 바로 확인할 수 있습니다.',
            '날짜와 알림은 작게 유지하고 우리의 대화는 더 선명하게 강조했습니다.',
            '커스텀 미션·컨디션·기록·피드백·우리의 기록·설정 여섯 카테고리로 빠르게 이동합니다.',
            '모바일, Fold, 태블릿, PC에서 같은 기능 그룹을 화면 크기에 맞게 배치합니다.'
            ,'PC 홈을 넓은 앱 화면으로 조정해 공중에 떠 있는 듯한 여백을 줄였습니다.'
            ,'Fold·태블릿·PC 세부 메뉴를 모바일과 같은 한 줄 목록으로 통일했습니다.'
            ,'오늘 기록 완성을 결과 확인·복사 팝업에 직접 연결했습니다.'
            ,'컨디션·오늘의 기록·관리와 피드백을 전체화면에서 연속 작성할 수 있습니다.'
            ,'상단 돌아가기와 기기 뒤로가기로 홈에 복귀할 수 있습니다.'
            ,'전체화면의 각 공유 기록에서 코멘트를 바로 확인하고 작성할 수 있습니다.'
            ,'오늘의 요약을 홈 상단으로 옮기고 날짜 카드를 테마형으로 다듬었습니다.'
            ,'날짜 선택 달력이 라이트·다크와 현재 색상 테마를 따릅니다.'
            ,'전체화면 뒤로가기에 홈 문구를 표시하고 사진 저장 동작을 명확히 안내합니다.'
            ,'우리의 기록과 설정 화면에 현재 날짜·테마·공간 정보를 표시합니다.'
            ,'확인한 알림과 코멘트 읽음 상태를 계정 기준으로 동기화합니다.'
            ,'코멘트는 하나의 버튼과 숫자로 표시해 중복 영역을 제거했습니다.'
            ,'추가한 오늘의 약속과 나의 루틴을 현재 화면에 바로 반영합니다.'
            ,'현재 보고 있는 날짜 카드는 정확한 날짜 기록을 직접 엽니다.'
            ,'자동 저장의 대기·저장 중·완료·실패 상태를 명확히 구분합니다.'
            ,'Dom은 선택 날짜의 작성 현황을 확인하고 Sub는 피드백·선물 화면이 읽기 전용임을 바로 알 수 있습니다.'
            ,'라이트 모드의 팝업 바깥은 밝은 테마 베일로, 다크 모드는 어두운 베일과 표면으로 명확히 분리됩니다.'
            ,'날짜 달력의 밝은 배경도 현재 선택한 색상 테마와 함께 바뀝니다.'
        ]),
        changes: Object.freeze([
            'Strengthens secondary text contrast throughout light-mode category and settings routes',
            'Unifies home and route action symbols with one consistent container treatment',
            'Adds the same subtle dashed empty-state border below Promise and My Routine',
            'Matches the My Routine empty message typography to the Promise helper card',
            'Prevents the comment dialog title from collapsing into a vertical column on mobile',
            'Keeps the title and close button in a stable two-column header',
            'Keeps record modals unchanged by opening comments in a separate dialog',
            'Shows only a compact optional comment trigger inside eligible cards',
            'Automatically opens the comment dialog when entering from a comment notification',
            'Hides only the comment panel on Promise, My Routine, Diary, and Management cards',
            'Preserves existing badges, notifications, read state, and History conversation data',
            'Keeps the conversation area at a stable height with internal scrolling',
            'Automatically shows the newest comment while older comments move upward',
            'Improves Dom and Sub comment contrast in dark mode',
            'Fixed valid invitation codes being reported as expired when claim permission was rejected',
            'Uses the Firebase server timestamp when an invitation is accepted',
            'Explains that invite creators must test acceptance with a different account',
            'Added shared Sub and Dom conversations to every record card',
            'Shows role-separated comments, unread card badges, and comment notifications',
            'Displays card conversations in History without changing statistics',
            'Keeps original record editing permissions separate from shared visibility',
            'Deploys only explicitly approved web assets through the generated public directory',
            'Excludes Firebase rules, Functions, documentation, scripts, and repository metadata from Hosting',
            'Validates required app and admin assets before every Hosting deployment',
            'Stages selected photos locally until Save and Close is pressed',
            'Discards unsaved photo selections when closing the modal',
            'Prevents duplicate photo cards from realtime listener races',
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
            list.innerHTML = release.userChanges.map((item) => `<li>${escapeReleaseHtml(item)}</li>`).join('');
        }

        const updateCard = document.getElementById('helpLatestUpdateCard');
        if (updateCard) {
            updateCard.dataset.helpKeywords = `업데이트 최신 버전 ${release.version} ${release.title} ${release.userChanges.join(' ')}`;
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
