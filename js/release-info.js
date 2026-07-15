// =========================================================
// HearMe2nite Release Information - Single Source of Truth
// Update this file once for each release.
// =========================================================
(function () {
    const release = Object.freeze({
        product: 'HearMe2nite',
        version: 'v1.0 STEP6.1.1',
        appVersion: 'HearMe2nite v1.0 STEP6.1.1',
        step: 'STEP6.1.1',
        build: '20260716',
        releaseDate: '2026.07.16',
        stage: 'Beta',
        title: '관리자 홈 운영 콘솔 바로가기',
        description: '관리자 계정의 홈 계정 메뉴에서 읽기 전용 운영 콘솔로 바로 이동할 수 있는 전용 버튼을 추가합니다.',
        changes: Object.freeze([
            '관리자 계정에만 운영 콘솔 진입 버튼 표시',
            '홈 계정 메뉴에서 admin.html로 즉시 이동',
            '기존 삭제 요청 관리와 운영 콘솔 진입 버튼 분리',
            'STEP6.1 읽기 전용 Beta Admin Console 추가',
            '관리자 전용 사용자·Room 목록 및 검색 추가',
            '삭제 요청·복구 센터·릴리스·시스템 상태 조회 추가',
            '관리자에게만 사용자 및 Room 부모 목록 조회를 허용하도록 Firebase Rules 보강',
            '우리의 공간 접속 상태 카드와 역할 선택 영역의 잔여 흰색 배경 제거',
            '오늘의 요약 상세 행과 아이콘 영역을 다크 카드 톤으로 통일',
            '우리의 대화 메시지 영역·오프라인 안내·입력줄의 라이트 표면 제거',
            '오늘의 약속 체크 항목과 입력 필드의 다크모드 대비 보정',
            '주인의 피드백 선택 버튼·확인 체크 카드의 다크모드 통일',
            '기록실 사진 모아보기 카드의 밝은 하단선·아이콘 박스·수량 표시 정렬 보정',
            '기록실 캘린더 배경·날짜 셀·요일·선택 상태의 라이트·다크 테마 통일',
            '사진 모아보기 카드에 최근 사진 최대 3장만 작게 표시하여 기록실 길이 유지',
            '사진이 3장을 넘으면 마지막 미리보기에 남은 사진 수 표시',
            '사진 카드를 누르면 기존 전체 사진 모아보기 팝업을 열도록 연결',
            '삭제 기록 관리 영역을 한 줄 카드로 축소하고 별도 중앙 팝업으로 이동',
            'Sub가 주인의 피드백·오늘의 선물 카드를 열면 입력 UI 대신 관리자 전용 안내만 표시',
            'Sub가 관리자 전용 팝업을 닫을 때 불필요한 자동 저장이 실행되지 않도록 차단',
            '사용자 설명서 상단·검색창·업데이트 탭의 다크모드 누락 수정',
            '도움말 카드·FAQ·검색 결과·팁·릴리스 카드의 다크모드 표면과 글자 대비 통일',
            '관리 안내·피드백·선물·데이터·기록 삭제 등 공통 카드와 안내 패널의 다크모드 전수 보정',
            '삭제 기능이 이름 없는 Firebase 기본 앱을 호출하던 오류 수정',
            '삭제·복구·확인 기능을 기존 babyApp Auth와 Database 연결로 통일',
            'Sub 미확인 삭제 알림을 홈 계정 카드 바로 아래에 표시',
            '삭제 기록을 전체·복구 가능·복구 완료·기간 만료 상태로 구분하여 조회',
            '삭제자 이메일·삭제 시간·수동 삭제 사유·앱 버전을 기록실에 명확히 표시',
            '복구 가능 일수와 Room 구성원의 확인 기록을 함께 표시',
            '복구 실행자 이메일과 복구 시간을 감사 이력에 추가 저장',
            '삭제 기록 요약 카드와 상태 필터로 Dom·Sub의 확인 편의 개선',
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
