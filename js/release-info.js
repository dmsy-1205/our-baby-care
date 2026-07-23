// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.2.14.69',
        appVersion: 'HearMe2nite v1.0 STEP6.2.14.69',
        step: 'STEP6.2.14.69',
        build: '20260723',
        releaseDate: '2026.07.23',
        stage: 'Beta',
        title: '메인 이전 전 환경·저장 안전성 보강',
        description: '테스트와 메인 Hosting의 Firebase 프로젝트 불일치를 차단하고, 요약 설정 동기화 실패와 계정 전환 문맥을 안전하게 처리합니다.',
        userChanges: Object.freeze([
            'PWA 새 설치가 현재 버전의 시작 주소로 실행되도록 설치 시작 경로를 최신 릴리스와 동기화했습니다.',
            '관계 종료를 실행한 기기는 서버 요청 전에 모든 Room 연결을 선제 종료하며, 실패한 경우에만 안전하게 다시 연결합니다.',
            '관계 회복 신청 후 상대방 동의 전까지 공유 테마와 월별 기록 동기화를 시작하거나 반영하지 않습니다.',
            '관계 종료 시 코멘트와 접속상태의 이전 읽기 요청을 즉시 정리하여 예상된 권한 차단 로그가 남지 않도록 했습니다.',
            '관계 종료 또는 회복 대기 중에는 오늘의 요약 상세와 요약 설정도 열리지 않습니다.',
            '관계 종료 상태에서는 홈 카테고리와 기록 편집 화면이 열리지 않고 사진 선택 창도 실행되지 않습니다.',
            '관계 상태 잠금 파일의 주소를 새로 갱신하여 브라우저와 PWA에 이전 동작이 남지 않도록 했습니다.',
            '관계 종료 또는 회복 대기 중에는 하루 기록 입력과 식사·일상 사진 선택 및 저장을 모두 차단합니다.',
            '홈 카테고리와 주요 화면 이동 아이콘을 동일한 굵기와 형태의 선형 아이콘으로 통일했습니다.',
            '기록 의미를 빠르게 구분하는 기분·수분·식사·사진 이모지는 유지했습니다.',
            '기록 카드와 기록 작성 화면의 코멘트 버튼에서 현재 코멘트 수를 바로 확인할 수 있습니다.',
            '상대가 남긴 새 코멘트가 있으면 숫자 배지가 강조되고, 확인하면 일반 숫자 배지로 바뀝니다.',
            '테스트와 메인 Hosting이 잘못된 Firebase 프로젝트를 향하면 데이터 연결을 중단하고 안내합니다.',
            '오늘의 요약 설정을 서버에 저장하지 못하면 실패 사실과 이 기기 보관 상태를 안내합니다.',
            '요약 설정 저장 중 계정이 바뀌면 이전 계정의 완료 응답을 새 화면에 반영하지 않습니다.',
            '요약 순서 화살표와 관계 관리 버튼의 모바일 터치 영역을 44px로 확대했습니다.',
            '오늘의 요약 설정 목록에 나의 루틴을 추가했습니다.',
            '나의 루틴 요약은 선택한 날짜에 저장된 완료 개수와 전체 루틴 수를 표시합니다.',
            '관계 종료를 주요 행동 영역에서 분리해 우리의 공간 맨 아래 관계 관리 영역으로 옮겼습니다.',
            '새 공간 시작, 상대방 초대, 받은 초대코드, 이전 공간 불러오기를 공간 연결과 이동 블록 하나로 정리했습니다.',
            '관계 종료가 서버에서 실제로 저장된 뒤에만 관계 종료됨 상태를 표시합니다.',
            '관계 상태 변경이 실패하면 임시 종료 화면을 남기지 않고 서버의 실제 연결 상태로 복원합니다.',
            '관계 종료가 상대 기기에 전달되면 열린 코멘트·알림·기록 화면과 관련 캐시를 즉시 정리합니다.',
            '관계 상태를 확인하지 못한 경우 연결된 것으로 간주하지 않고 안전 잠금 상태를 표시합니다.',
            '우리의 공간에서 관계 종료 전 양쪽에 적용되는 기능 제한을 확인할 수 있습니다.',
            '관계가 종료되면 Dom과 Sub 모두 기존 Room 데이터를 불러오거나 새 기록을 작성할 수 없습니다.',
            '한쪽이 관계 회복을 요청하고 다른 쪽이 동의하면 보존된 기록을 다시 사용할 수 있습니다.',
            '내 정보·설정의 현재 앱 상태에서 연결, 종료, 회복 대기 상태를 확인하고 우리의 공간으로 이동할 수 있습니다.',
            'Dom과 Sub 모두 우리의 공간에서 자신이 참여했던 이전 공간으로 다시 이동할 수 있습니다.',
            '이전 공간 전환 시 실제 Room 멤버십을 다시 확인해 가입하지 않은 공간에는 접근할 수 없습니다.',
            '초대링크로 들어오면 로그인 화면에서 초대코드 보존 상태를 확인할 수 있습니다.',
            '처음 역할을 선택한 뒤 보류 중인 초대 참여를 자동으로 다시 진행합니다.',
            '카카오톡·SNS에 링크를 공유할 때 HearMe2nite 제목과 설명, 아이콘이 표시됩니다.',
            '신규 회원가입 비밀번호는 8자리 이상으로 안내하고 검사합니다.',
            '기존 계정은 이전 비밀번호 길이와 관계없이 정상 로그인을 계속 지원합니다.',
            '테스트 Hosting 응답에 클릭재킹·MIME 스니핑·리퍼러 노출 방어 헤더를 적용했습니다.',
            'PC·Fold·휴대폰에서 로그인 카드의 폭과 여백이 화면에 맞게 정돈됩니다.',
            '밝은 입력창과 선명한 레이블로 이메일과 비밀번호를 쉽게 구분할 수 있습니다.',
            '비밀번호 보기·숨기기와 비밀번호 재설정 메일을 로그인 화면에서 사용할 수 있습니다.',
            '로그인 진행과 입력 오류를 화면 안에서 바로 안내합니다.',
            '빠르게 계정을 전환해도 이전 사용자의 닉네임이 새 계정 화면이나 공유 상태에 반영되지 않습니다.',
            '코멘트 저장에 실패하면 작성 중인 내용이 입력창에 그대로 남습니다.',
            '코멘트 작성자 이름은 프로필에서 설정한 닉네임과 동일하게 표시됩니다.',
            '코멘트 창은 스크린리더 제목, 키보드 포커스, Escape 닫기와 원래 위치 복귀를 지원합니다.',
            '테스트 Hosting 배포와 운영 Hosting 배포 절차를 별도 스크립트로 분리했습니다.',
            '서비스워커는 현재 버전 캐시를 보존하고 과거 버전 캐시만 정리합니다.',
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
