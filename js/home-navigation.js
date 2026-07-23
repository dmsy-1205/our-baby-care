// HearMe2nite STEP6.2.14.1 - adaptive category home
(function () {
    'use strict';

    const CATEGORIES = [
        {
            key: 'mission', icon: 'target', title: '커스텀 미션', subtitle: '오늘의 약속 · 나의 루틴',
            actions: [
                ['heart', '오늘의 약속', '함께 정한 미션을 확인하고 관리합니다.', () => window.openCustomRoutineHub?.()],
                ['routine', '나의 루틴', '기록하는 사람이 직접 만드는 개인 루틴입니다.', () => window.openSubRoutineHub?.()]
            ]
        },
        {
            key: 'condition', icon: 'pulse', title: '오늘의 컨디션', subtitle: '기분 · 건강 · 수분',
            actions: [
                ['smile', '오늘의 기분', '지금의 기분을 기록합니다.', () => window.openDailyModal?.('mood')],
                ['scale', '체중', '선택한 날짜의 체중을 입력합니다.', () => window.openDailyModal?.('weight')],
                ['activity', '오늘의 운동', '운동 여부와 내용을 기록합니다.', () => window.openDailyModal?.('exercise')],
                ['droplet', '오늘의 수분', '마신 물의 양을 추가합니다.', () => window.openDailyModal?.('water')]
            ]
        },
        {
            key: 'daily', icon: 'note', title: '오늘의 기록', subtitle: '하루 · 식사 · 사진',
            actions: [
                ['sunrise', '기상 시간', '하루를 시작한 시간을 기록합니다.', () => window.openDailyModal?.('wake')],
                ['meal', '식사 기록', '아침·점심·저녁을 기록합니다.', () => window.openDailyModal?.('meal')],
                ['image', '오늘의 순간', '외출과 일상 사진을 남깁니다.', () => window.openDailyModal?.('outing')],
                ['moon', '취침 예정', '잠들 예정 시간을 기록합니다.', () => window.openDailyModal?.('sleep')],
                ['note', '오늘의 하루', '하루의 이야기와 코멘트를 남깁니다.', () => window.openDailyModal?.('diary')],
                ['sparkles', '오늘 기록 완성', '오늘 기록을 정리하고 복사합니다.', openDailyCompletion]
            ]
        },
        {
            key: 'feedback', icon: 'diamond', title: '관리와 피드백', subtitle: '피드백 · 선물 · 메모',
            actions: [
                ['message', '주인의 피드백', 'Dom은 작성하고 Sub는 확인합니다.', () => window.openDailyModal?.('feedback')],
                ['gift', '오늘의 선물', '작은 보상이나 편안한 휴식을 전합니다.', () => window.openDailyModal?.('reward')],
                ['lock', 'Dom 비공개 메모', 'Dom만 확인하는 관리 메모입니다.', () => window.openDailyModal?.('ownerNote')]
            ]
        },
        {
            key: 'records', icon: 'calendar', title: '우리의 기록', subtitle: '흐름 · 이야기 · 기념일',
            actions: [
                ['trend', '우리의 흐름', '주간·월간 기록 변화를 확인합니다.', () => window.hmOpenHomeStatsModal?.('promise')],
                ['history', '우리의 이야기', '지난 기록·사진·코멘트를 함께 봅니다.', () => document.querySelector('.history-launch-card')?.click()]
            ]
        },
        {
            key: 'settings', icon: 'settings', title: '내 정보 · 설정', subtitle: '공간 · 테마 · 데이터',
            actions: [
                ['user', '내 계정', '프로필·테마·데이터·로그아웃을 관리합니다.', () => window.openAccountMenuModal?.()],
                ['home', '우리의 공간', '연결, 역할, 초대코드를 관리합니다.', () => window.openRoomSettingsModal?.()],
                ['help', '도움말과 문의', '가이드와 베타 문의를 확인합니다.', () => window.openGuideModal?.()]
            ]
        }
    ];

    let activeCategory = null;
    let normalizeQueued = false;
    let activeRouteKey = '';
    const mountedEditors = [];
    const EDITOR_ROUTES = Object.freeze({
        condition: ['mood', 'weight', 'exercise', 'water'],
        daily: ['wake', 'meal', 'outing', 'sleep', 'diary'],
        feedback: ['feedback', 'reward', 'ownerNote']
    });
    const $ = (id) => document.getElementById(id);
    const icon = (name, className = 'hm-ui-icon') => window.HM_UI_ICONS?.render(name, className) || '';

    function safeText(value) {
        return String(value || '').trim();
    }

    function initials(value, fallback) {
        const text = safeText(value);
        return text ? text.charAt(0).toUpperCase() : fallback;
    }

    function createProfileStrip() {
        if ($('hmAdaptiveProfileStrip')) return $('hmAdaptiveProfileStrip');
        const strip = document.createElement('section');
        strip.id = 'hmAdaptiveProfileStrip';
        strip.className = 'hm-adaptive-profile-strip';
        strip.setAttribute('aria-label', '두 사람의 접속 상태');
        strip.setAttribute('role', 'button');
        strip.setAttribute('tabindex', '0');
        strip.innerHTML = `
            <div class="hm-adaptive-person self" id="hmAdaptiveSelf">
                <span class="hm-adaptive-avatar" id="hmAdaptiveSelfAvatar">나</span>
                <span><strong id="hmAdaptiveSelfName">나</strong><small><i id="hmAdaptiveSelfDot"></i><span id="hmAdaptiveSelfState">접속 확인 중</span></small></span>
            </div>
            <span class="hm-adaptive-together" aria-hidden="true">♡</span>
            <div class="hm-adaptive-person partner">
                <span class="hm-adaptive-avatar" id="hmAdaptivePartnerAvatar">상</span>
                <span><strong id="hmAdaptivePartnerName">상대</strong><small><i id="hmAdaptivePartnerDot"></i><span id="hmAdaptivePartnerState">접속 확인 중</span></small></span>
            </div>`;
        const openAccount = () => window.openAccountMenuModal?.();
        strip.addEventListener('click', openAccount);
        strip.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openAccount(); }
        });
        return strip;
    }

    function createCategoryGrid() {
        if ($('hmAdaptiveCategoryGrid')) return $('hmAdaptiveCategoryGrid');
        const section = document.createElement('section');
        section.id = 'hmAdaptiveCategoryGrid';
        section.className = 'hm-adaptive-category-section';
        section.innerHTML = `<div class="hm-adaptive-category-head"><strong>오늘 무엇을 할까요?</strong><small>필요한 카테고리를 선택하세요.</small></div><div class="hm-adaptive-category-grid">${CATEGORIES.map((item, index) => `
            <button type="button" class="hm-adaptive-category" data-hm-category="${item.key}" data-tone="${index + 1}" aria-label="${item.title}: ${item.subtitle}">
                <span class="hm-adaptive-category-icon" aria-hidden="true">${icon(item.icon)}</span>
                <span><strong>${item.title}</strong><small>${item.subtitle}</small></span>
                <span class="hm-adaptive-category-arrow" aria-hidden="true">›</span>
            </button>`).join('')}</div>`;
        section.addEventListener('click', (event) => {
            const button = event.target.closest('[data-hm-category]');
            if (button) openCategory(button.dataset.hmCategory);
        });
        return section;
    }

    function createBrandSignature() {
        if ($('hmHomeBrandSignature')) return $('hmHomeBrandSignature');
        const signature = document.createElement('footer');
        signature.id = 'hmHomeBrandSignature';
        signature.className = 'hm-home-brand-signature';
        signature.setAttribute('aria-label', 'HearMe2nite');
        signature.innerHTML = '<span class="hm-home-brand-mark" aria-hidden="true">❤☾</span><strong>HearMe2nite</strong>';
        return signature;
    }

    function createCategoryOverlay() {
        if ($('hmAdaptiveCategoryOverlay')) return $('hmAdaptiveCategoryOverlay');
        const overlay = document.createElement('div');
        overlay.id = 'hmAdaptiveCategoryOverlay';
        overlay.className = 'daily-modal-overlay hm-adaptive-category-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('inert', '');
        overlay.innerHTML = `<div class="daily-modal hm-adaptive-category-modal" role="dialog" aria-modal="true" aria-labelledby="hmAdaptiveCategoryTitle">
            <div class="daily-modal-head"><div><h2 id="hmAdaptiveCategoryTitle">카테고리</h2><p id="hmAdaptiveCategorySubtitle"></p></div><button type="button" class="modal-close-btn" id="hmAdaptiveCategoryClose">닫기</button></div>
            <div class="hm-adaptive-action-grid" id="hmAdaptiveCategoryActions"></div>
        </div>`;
        overlay.addEventListener('click', (event) => { if (event.target === overlay) closeCategory(); });
        overlay.querySelector('#hmAdaptiveCategoryClose').addEventListener('click', closeCategory);
        document.body.appendChild(overlay);
        return overlay;
    }

    function createCategoryRoute() {
        if ($('hmAdaptiveCategoryRoute')) return $('hmAdaptiveCategoryRoute');
        const route = document.createElement('section');
        route.id = 'hmAdaptiveCategoryRoute';
        route.className = 'hm-adaptive-route';
        route.hidden = true;
        route.innerHTML = `<header class="hm-adaptive-route-head">
            <button type="button" class="hm-adaptive-route-back" id="hmAdaptiveRouteBack" aria-label="홈으로 돌아가기"><span aria-hidden="true">←</span><strong>홈</strong></button>
            <div><small id="hmAdaptiveRouteKicker">오늘의 기록</small><h2 id="hmAdaptiveRouteTitle">카테고리</h2><p id="hmAdaptiveRouteSubtitle"></p></div>
            <span class="hm-adaptive-route-save" id="hmAdaptiveRouteSaveState">☁ 저장됨</span>
        </header><main class="hm-adaptive-route-body" id="hmAdaptiveRouteBody"></main>`;
        route.querySelector('#hmAdaptiveRouteBack').addEventListener('click', requestRouteBack);
        document.getElementById('appContent')?.appendChild(route);
        return route;
    }

    function restoreMountedEditors() {
        while (mountedEditors.length) {
            const item = mountedEditors.pop();
            if (item.momentsSaveButton) item.momentsSaveButton.textContent = item.momentsSaveText;
            if (item.dialogRole) item.modal.setAttribute('role', item.dialogRole); else item.modal.removeAttribute('role');
            if (item.dialogAriaModal) item.modal.setAttribute('aria-modal', item.dialogAriaModal); else item.modal.removeAttribute('aria-modal');
            item.modal.classList.remove('hm-route-embedded-editor');
            item.overlay.appendChild(item.modal);
        }
    }

    function mountRouteEditors(routeKey, body) {
        const isManager = typeof window.canManageRelationshipCards === 'function' && window.canManageRelationshipCards();
        const types = (EDITOR_ROUTES[routeKey] || []).filter((type) => type !== 'ownerNote' || isManager);
        const list = document.createElement('div');
        list.className = 'hm-adaptive-route-editors';
        types.forEach((type) => {
            const overlay = $(`${type}ModalOverlay`);
            const modal = overlay?.querySelector(':scope > .daily-modal');
            if (!overlay || !modal) return;
            const momentsSaveButton = type === 'outing' ? modal.querySelector('#dailyMomentsSaveButton') : null;
            const momentsSaveText = momentsSaveButton?.textContent || '';
            const dialogRole = modal.getAttribute('role');
            const dialogAriaModal = modal.getAttribute('aria-modal');
            mountedEditors.push({ overlay, modal, momentsSaveButton, momentsSaveText, dialogRole, dialogAriaModal });
            modal.setAttribute('role', 'region');
            modal.removeAttribute('aria-modal');
            modal.classList.add('hm-route-embedded-editor');
            modal.querySelector('.card-conversation-panel')?.remove();
            if ((type === 'feedback' || type === 'reward') && typeof window.hmApplyManagerOnlyModalView === 'function') {
                window.hmApplyManagerOnlyModalView(type);
            }
            if (momentsSaveButton) momentsSaveButton.textContent = '선택한 사진 저장';
            modal.querySelector('.hm-route-comment-trigger')?.remove();
            if (type !== 'ownerNote') {
                const commentTrigger = document.createElement('button');
                commentTrigger.type = 'button';
                commentTrigger.className = 'hm-route-comment-trigger';
                commentTrigger.dataset.cardConversationOpen = type;
                commentTrigger.innerHTML = `<span>💞</span><span><strong>코멘트</strong><small>Sub와 Dom이 이 기록에 함께 남긴 말을 확인합니다.</small></span><em data-hm-route-comment-count="${type}">›</em>`;
                const saveButton = modal.querySelector(':scope > .daily-modal-save');
                if (saveButton) saveButton.before(commentTrigger); else modal.appendChild(commentTrigger);
            }
            list.appendChild(modal);
        });
        body.appendChild(list);
        if (routeKey === 'feedback' && typeof window.renderFeedbackReviewStatus === 'function') {
            window.renderFeedbackReviewStatus();
        }
        if (typeof window.hmRefreshConversationBadges === 'function') window.hmRefreshConversationBadges();
        if (routeKey === 'daily') {
            const finish = document.createElement('button');
            finish.type = 'button';
            finish.className = 'hm-adaptive-route-finish';
            finish.innerHTML = '<span>✨</span><span><strong>오늘 기록 완성</strong><small>작성한 오늘 기록을 확인하고 복사합니다.</small></span><em>›</em>';
            finish.addEventListener('click', openDailyCompletion);
            body.appendChild(finish);
        }
    }

    function appendMissionLists(body) {
        const section = document.createElement('section');
        section.className = 'hm-adaptive-mission-live';
        section.innerHTML = `
            <div class="hm-adaptive-live-group" data-live-group="promise">
                <div class="hm-adaptive-live-head"><strong>오늘의 약속</strong><small>등록된 미션</small></div>
                <div class="hm-adaptive-live-list" data-live-list="promise"></div>
            </div>
            <div class="hm-adaptive-live-group" data-live-group="routine">
                <div class="hm-adaptive-live-head"><strong>나의 루틴</strong><small>선택한 날짜의 루틴</small></div>
                <div class="hm-adaptive-live-list" data-live-list="routine"></div>
            </div>`;
        body.appendChild(section);
        refreshMissionLists(section);
    }

    function refreshMissionLists(scope = document) {
        const copyInteractiveList = (sourceSelector, targetSelector, emptyText) => {
            const source = document.querySelector(sourceSelector);
            const target = scope.querySelector(targetSelector);
            if (!target) return;
            const cards = source ? Array.from(source.children) : [];
            target.innerHTML = cards.length ? cards.map((node) => node.outerHTML).join('') : `<div class="hm-adaptive-live-empty">${emptyText}</div>`;
        };
        copyInteractiveList('#customRoutineList', '[data-live-list="promise"]', '아직 등록된 오늘의 약속이 없습니다.');
        copyInteractiveList('#subRoutineHomeList', '[data-live-list="routine"]', '선택한 날짜에 표시할 나의 루틴이 없습니다.');
    }
    window.hmRefreshAdaptiveMissionLists = function hmRefreshAdaptiveMissionLists() {
        document.querySelectorAll('.hm-adaptive-mission-live').forEach((section) => refreshMissionLists(section));
    };

    function renderRouteActions(category, body) {
        const grid = document.createElement('div');
        grid.className = 'hm-adaptive-route-actions';
        grid.innerHTML = category.actions.map((action, index) => `<button type="button" class="hm-adaptive-action" data-route-action-index="${index}"><span aria-hidden="true">${icon(action[0])}</span><span><strong>${action[1]}</strong><small>${action[2]}</small></span><em aria-hidden="true">›</em></button>`).join('');
        grid.addEventListener('click', (event) => {
            const button = event.target.closest('[data-route-action-index]');
            if (!button) return;
            if (category.key !== 'settings'
                && typeof window.hmGuardRelationshipDataAccess === 'function'
                && !window.hmGuardRelationshipDataAccess()) {
                event.preventDefault();
                return;
            }
            category.actions[Number(button.dataset.routeActionIndex)]?.[3]?.();
        });
        body.appendChild(grid);
        if (category.key === 'mission') appendMissionLists(body);
        appendRouteContext(category.key, body);
    }

    function appendRouteContext(routeKey, body) {
        if (routeKey !== 'records' && routeKey !== 'settings') return;
        const panel = document.createElement('aside');
        panel.className = 'hm-adaptive-route-context';
        if (routeKey === 'records') {
            const recordDate = safeText($('recordDate')?.value);
            const date = recordDate || safeText($('hmRecordDateDisplayValue')?.textContent) || '선택한 날짜';
            panel.classList.add('is-clickable');
            panel.setAttribute('role', 'button');
            panel.setAttribute('tabindex', '0');
            panel.setAttribute('aria-label', `${date} 기록 보기`);
            panel.innerHTML = `<span class="hm-adaptive-route-context-icon">📅</span><div><small>현재 보고 있는 날짜</small><strong>${date}</strong><p>눌러서 이 날짜의 기록을 확인하세요.</p></div><em aria-hidden="true">›</em>`;
            const openRecord = () => {
                if (typeof window.openHistoryDetailModal === 'function' && /^\d{4}-\d{2}-\d{2}$/.test(recordDate)) window.openHistoryDetailModal(recordDate);
                else document.querySelector('.history-launch-card')?.click();
            };
            panel.addEventListener('click', openRecord);
            panel.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openRecord(); } });
        } else {
            const roomCode = safeText(typeof activeRoomCode === 'string' ? activeRoomCode : '');
            const role = typeof window.canManageRelationshipCards === 'function' && window.canManageRelationshipCards() ? '관리(Dom)' : '기록(Sub)';
            const themeNames = { lavender: '라벤더', blossom: '블라썸', ocean: '오션', forest: '포레스트', cream: '크림' };
            const theme = themeNames[document.documentElement.dataset.hmTheme] || '기본';
            const mode = document.documentElement.dataset.hmDisplay === 'dark' ? '다크' : '라이트';
            const relationshipStatus = typeof activeRelationshipStatus === 'string' ? activeRelationshipStatus : 'active';
            const relationshipLabel = !roomCode
                ? '연결된 관계 없음'
                : relationshipStatus === 'ended'
                    ? '관계 종료됨 · 데이터 잠김'
                    : relationshipStatus === 'recovery_pending'
                        ? '관계 회복 동의 대기 중'
                        : relationshipStatus === 'locked'
                            ? '관계 상태 확인 필요 · 안전 잠금'
                        : '관계 연결됨 · 데이터 공유 중';
            panel.dataset.hmAction = 'open-room-settings';
            panel.dataset.hmKeypress = 'open-room-settings';
            panel.setAttribute('role', 'button');
            panel.setAttribute('tabindex', '0');
            panel.setAttribute('aria-label', `${relationshipLabel}. 우리의 공간 열기`);
            panel.innerHTML = `<span class="hm-adaptive-route-context-icon">✨</span><div><small>현재 앱 상태</small><strong>${theme} 테마 · ${mode} 모드</strong><p><span>공간 연결</span><b>${roomCode ? '연결됨' : '연결 안 됨'}</b><span>현재 역할</span><b>${role}</b></p><small class="hm-relationship-status-line">${relationshipLabel} · 눌러서 우리의 공간 열기</small></div>`;
        }
        body.appendChild(panel);
    }

    function openCategoryRoute(category, pushHistory = true) {
        const route = createCategoryRoute();
        const body = $('hmAdaptiveRouteBody');
        restoreMountedEditors();
        body.innerHTML = '';
        activeCategory = category;
        activeRouteKey = category.key;
        $('hmAdaptiveRouteKicker').textContent = 'HearMe2nite';
        const isManager = typeof window.canManageRelationshipCards === 'function' && window.canManageRelationshipCards();
        const isSubFeedback = category.key === 'feedback' && !isManager;
        $('hmAdaptiveRouteTitle').textContent = isSubFeedback ? '주인의 메시지' : category.title;
        $('hmAdaptiveRouteSubtitle').textContent = isSubFeedback ? '주인의 피드백 · 오늘의 선물' : category.subtitle;
        $('hmAdaptiveRouteSaveState').textContent = isSubFeedback ? '읽기 전용' : (EDITOR_ROUTES[category.key] ? '☁ 자동 저장' : '둘만의 공간');
        if (EDITOR_ROUTES[category.key]) mountRouteEditors(category.key, body);
        else renderRouteActions(category, body);
        document.querySelector('#appContent > .container')?.classList.add('hm-adaptive-route-home-hidden');
        document.querySelector('#appContent > .history-launch-card')?.classList.add('hm-adaptive-route-home-hidden');
        route.hidden = false;
        document.body.classList.add('hm-adaptive-route-open');
        window.scrollTo({ top: 0, behavior: 'instant' });
        if (pushHistory && history.state?.hmAdaptiveRoute !== category.key) {
            history.pushState({ ...(history.state || {}), hmAdaptiveRoute: category.key }, '', `#${category.key}`);
        }
    }

    function closeCategoryRoute() {
        if (!activeRouteKey) return;
        restoreMountedEditors();
        const route = $('hmAdaptiveCategoryRoute');
        if (route) route.hidden = true;
        document.querySelector('#appContent > .container')?.classList.remove('hm-adaptive-route-home-hidden');
        document.querySelector('#appContent > .history-launch-card')?.classList.remove('hm-adaptive-route-home-hidden');
        document.body.classList.remove('hm-adaptive-route-open');
        activeRouteKey = '';
        activeCategory = null;
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function requestRouteBack() {
        if (history.state?.hmAdaptiveRoute) history.back();
        else closeCategoryRoute();
    }

    function createCompletionOverlay() {
        if ($('hmAdaptiveCompletionOverlay')) return $('hmAdaptiveCompletionOverlay');
        const overlay = document.createElement('div');
        overlay.id = 'hmAdaptiveCompletionOverlay';
        overlay.className = 'daily-modal-overlay hm-adaptive-completion-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('inert', '');
        overlay.innerHTML = `<div class="daily-modal hm-adaptive-completion-modal" role="dialog" aria-modal="true" aria-labelledby="hmAdaptiveCompletionTitle">
            <div class="daily-modal-head"><div><h2 id="hmAdaptiveCompletionTitle">✨ 오늘 기록 완성</h2><p>선택한 날짜의 기록을 한눈에 확인하고 복사할 수 있어요.</p></div><button type="button" class="modal-close-btn" id="hmAdaptiveCompletionClose">닫기</button></div>
            <textarea id="hmAdaptiveCompletionText" readonly aria-label="완성된 오늘 기록"></textarea>
            <button type="button" class="daily-modal-save" id="hmAdaptiveCompletionCopy">기록 복사하기</button>
        </div>`;
        overlay.addEventListener('click', (event) => { if (event.target === overlay) closeCompletion(); });
        overlay.querySelector('#hmAdaptiveCompletionClose').addEventListener('click', closeCompletion);
        overlay.querySelector('#hmAdaptiveCompletionCopy').addEventListener('click', () => {
            document.querySelector('#resultContainer .btn-copy')?.click();
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    function closeCompletion() {
        if (typeof window.closeModalOverlayById === 'function') window.closeModalOverlayById('hmAdaptiveCompletionOverlay');
        else {
            const overlay = $('hmAdaptiveCompletionOverlay');
            if (overlay) { overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true'); overlay.setAttribute('inert', ''); }
        }
    }

    function openDailyCompletion() {
        const sourceButton = document.querySelector('#appContent > .container > .btn-main');
        const sourceResult = $('resultBox');
        if (!sourceButton || !sourceResult) {
            window.showToast?.('오늘 기록 완성 기능을 불러오지 못했습니다.');
            return;
        }
        sourceResult.value = '';
        sourceButton.click();
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            if (sourceResult.value.trim()) {
                clearInterval(timer);
                createCompletionOverlay();
                $('hmAdaptiveCompletionText').value = sourceResult.value;
                if (typeof window.openModalOverlayById === 'function') window.openModalOverlayById('hmAdaptiveCompletionOverlay');
                else {
                    const overlay = $('hmAdaptiveCompletionOverlay');
                    overlay.removeAttribute('inert'); overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden', 'false');
                }
            } else if (attempts >= 40) clearInterval(timer);
        }, 150);
    }

    function openCategory(key) {
        const category = CATEGORIES.find((item) => item.key === key);
        if (!category) return;
        if (key !== 'settings'
            && typeof window.hmGuardRelationshipDataAccess === 'function'
            && !window.hmGuardRelationshipDataAccess()) return;
        openCategoryRoute(category);
    }

    function closeCategory() {
        if (typeof window.closeModalOverlayById === 'function') window.closeModalOverlayById('hmAdaptiveCategoryOverlay');
        else {
            const overlay = $('hmAdaptiveCategoryOverlay');
            if (overlay) { overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true'); overlay.setAttribute('inert', ''); }
        }
    }

    function dateGroup() {
        return $('recordDate')?.closest('.input-group') || null;
    }

    function markOriginalHomeContent() {
        const container = document.querySelector('#appContent > .container');
        if (!container) return;
        const keep = new Set([
            $('saveStatus'), container.querySelector('.app-title-row'), container.querySelector('.app-subtitle'), container.querySelector('.app-meta-row'),
            $('hmAdaptiveProfileStrip'), dateGroup(), $('chatLaunchCard'), $('hmNotificationBar'), $('hmProductDashboard'), $('hmAdaptiveCategoryGrid'), $('hmHomeBrandSignature')
        ]);
        Array.from(container.children).forEach((node) => {
            if (keep.has(node) || node.classList.contains('daily-modal-overlay') || node.classList.contains('room-settings-overlay')) {
                node.classList.remove('hm-adaptive-home-hidden');
                return;
            }
            node.classList.add('hm-adaptive-home-hidden');
        });
        const history = document.querySelector('#appContent > .history-launch-card');
        if (history) history.classList.add('hm-adaptive-home-hidden');
    }

    function normalizeHome() {
        const container = document.querySelector('#appContent > .container');
        const meta = container?.querySelector('.app-meta-row');
        const date = dateGroup();
        const chat = $('chatLaunchCard');
        const notice = $('hmNotificationBar');
        const summary = $('hmProductDashboard');
        if (!container || !meta || !date || !chat || !notice) return;

        const placeAfter = (anchor, node) => { if (anchor && node && anchor.nextElementSibling !== node) anchor.insertAdjacentElement('afterend', node); };
        const profile = createProfileStrip();
        const grid = createCategoryGrid();
        const signature = createBrandSignature();
        placeAfter(meta, profile);
        placeAfter(profile, notice);
        if (summary) placeAfter(notice, summary);
        placeAfter(summary || notice, chat);
        placeAfter(chat, date);
        placeAfter(date, grid);
        placeAfter(grid, signature);
        markOriginalHomeContent();
        updateRoleAwareCategoryGrid();
        updateProfileStrip();
    }

    function updateRoleAwareCategoryGrid() {
        const isManager = typeof window.canManageRelationshipCards === 'function' && window.canManageRelationshipCards();
        const button = document.querySelector('[data-hm-category="feedback"]');
        if (!button) return;
        const title = isManager ? '관리와 피드백' : '주인의 메시지';
        const subtitle = isManager ? '피드백 · 선물 · 메모' : '주인의 피드백 · 오늘의 선물';
        button.setAttribute('aria-label', `${title}: ${subtitle}`);
        const strong = button.querySelector('strong');
        const small = button.querySelector('small');
        if (strong) strong.textContent = title;
        if (small) small.textContent = subtitle;
    }

    function updateProfileStrip() {
        const ownName = safeText($('userBarNickname')?.textContent) || '나';
        const indicator = $('homePresenceIndicator');
        const selfDot = $('homePresenceSelfDot');
        const partnerDot = $('homePresencePartnerDot');
        const selfOnline = selfDot?.classList.contains('online');
        const partnerOnline = partnerDot?.classList.contains('online');
        const title = safeText(indicator?.title);
        const partnerName = safeText(window.hmAdaptivePartnerDisplayName) || '상대';
        if ($('hmAdaptiveSelfName')) $('hmAdaptiveSelfName').textContent = ownName;
        if ($('hmAdaptiveSelfAvatar')) $('hmAdaptiveSelfAvatar').textContent = safeText(window.hmCurrentAvatar) || initials(ownName, '나');
        if ($('hmAdaptivePartnerName')) $('hmAdaptivePartnerName').textContent = partnerName;
        if ($('hmAdaptivePartnerAvatar')) $('hmAdaptivePartnerAvatar').textContent = safeText(window.hmAdaptivePartnerAvatar) || initials(partnerName, '상');
        $('hmAdaptiveSelfDot')?.classList.toggle('online', !!selfOnline);
        $('hmAdaptivePartnerDot')?.classList.toggle('online', !!partnerOnline);
        if ($('hmAdaptiveSelfState')) $('hmAdaptiveSelfState').textContent = selfOnline ? '온라인' : '오프라인';
        if ($('hmAdaptivePartnerState')) $('hmAdaptivePartnerState').textContent = title.includes('아직 연결 전') ? '연결 전' : (partnerOnline ? '온라인' : '오프라인');
    }

    function queueNormalize() {
        if (normalizeQueued) return;
        normalizeQueued = true;
        requestAnimationFrame(() => {
            normalizeQueued = false;
            normalizeHome();
        });
    }

    function init() {
        createCategoryOverlay();
        createCategoryRoute();
        createCompletionOverlay();
        normalizeHome();
        const container = document.querySelector('#appContent > .container');
        if (container) new MutationObserver(queueNormalize).observe(container, { childList: true, subtree: false });
        setInterval(() => {
            updateProfileStrip();
            if (activeRouteKey === 'mission') refreshMissionLists($('hmAdaptiveRouteBody'));
            if (!activeRouteKey) normalizeHome();
        }, 1500);
        window.addEventListener('popstate', () => {
            const key = history.state?.hmAdaptiveRoute || '';
            if (key) {
                const category = CATEGORIES.find((item) => item.key === key);
                if (category && activeRouteKey !== key) openCategoryRoute(category, false);
            } else closeCategoryRoute();
        });
        window.hmAdaptiveOpenCategory = openCategory;
        window.hmAdaptiveCloseCategory = closeCategory;
        window.hmAdaptiveCloseRoute = requestRouteBack;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
