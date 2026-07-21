// HearMe2nite STEP6.2.13.8 - Shared Card Conversations
(function hmSharedCardConversations() {
    const CARD_LABELS = Object.freeze({
        promise: '오늘의 약속', subRoutine: '나의 루틴', mission: '오늘의 미션',
        mood: '오늘의 기분', weight: '체중', exercise: '오늘의 운동', water: '오늘의 수분',
        wake: '기상 시간', meal: '식사 기록', outing: '오늘의 순간', sleep: '취침 예정',
        diary: '오늘의 하루', feedback: 'Dom 피드백', reward: '오늘의 선택', ownerNote: '함께 보는 메모'
    });
    const CARD_ICONS = Object.freeze({
        promise:'🤝', subRoutine:'🌱', mission:'🎯', mood:'😊', weight:'⚖️', exercise:'🏃',
        water:'💧', wake:'⏰', meal:'🍽️', outing:'📷', sleep:'🌙', diary:'📝',
        feedback:'💬', reward:'🎁', ownerNote:'📌'
    });
    const READ_PREFIX = 'hm_card_conversation_read_v1';
    // 이 카드는 코멘트 입력/목록 창만 표시하지 않는다.
    // 기존 배지, 알림, 읽음 처리, 기록 대화 데이터는 그대로 유지한다.
    const PANEL_DISABLED_KEYS = new Set(['promise', 'subRoutine', 'mission', 'diary', 'feedback', 'reward', 'ownerNote']);
    let boundPath = '';
    let boundRef = null;
    let cache = {};
    let activeCardKey = '';
    let activeOverlayId = '';
    let notificationOpenCardKey = '';
    let conversationDialogOpen = false;

    function roomCode() {
        try { return typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : activeRoomCode; } catch (e) { return ''; }
    }
    function dateValue() { return document.getElementById('recordDate')?.value || ''; }
    function roleValue() {
        try {
            const role = String(activeRelationshipRole || pendingRelationshipRole || '').toLowerCase();
            return role === 'dom' ? 'dom' : 'sub';
        } catch (e) { return 'sub'; }
    }
    function roleLabel(role) { return role === 'dom' ? 'Dom' : 'Sub'; }
    function text(value) { return String(value == null ? '' : value).trim(); }
    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }
    function formatTime(value) {
        const time = Number(value || 0);
        if (!time) return '';
        return new Date(time).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'numeric', minute:'2-digit' });
    }
    function readKey() { return `${READ_PREFIX}:${currentUser?.uid || 'guest'}:${roomCode() || 'no-room'}`; }
    function readMap() {
        try { return JSON.parse(localStorage.getItem(readKey()) || '{}') || {}; } catch (e) { return {}; }
    }
    function writeRead(cardKey, at) {
        try {
            const map = readMap();
            map[`${dateValue()}|${cardKey}`] = Number(at || Date.now());
            localStorage.setItem(readKey(), JSON.stringify(map));
        } catch (e) {}
    }
    function commentsFor(cardKey, date = dateValue()) {
        if (date !== dateValue()) return [];
        const source = cache?.[cardKey] || {};
        return Object.entries(source).map(([id, value]) => ({ id, ...(value || {}) }))
            .filter((item) => text(item.text))
            .sort((a,b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    }
    function unreadFor(cardKey) {
        const readAt = Number(readMap()[`${dateValue()}|${cardKey}`] || 0);
        return commentsFor(cardKey).filter((item) => item.authorUid !== currentUser?.uid && Number(item.createdAt || 0) > readAt);
    }

    function bind() {
        const room = roomCode();
        const date = dateValue();
        const nextPath = currentUser && room && date ? `rooms/${room}/cardComments/${date}` : '';
        if (nextPath === boundPath) return;
        if (boundRef) boundRef.off();
        boundRef = null;
        boundPath = nextPath;
        cache = {};
        if (!nextPath) { renderBadges(); return; }
        boundRef = db.ref(nextPath);
        boundRef.on('value', (snapshot) => {
            cache = snapshot.val() || {};
            renderBadges();
            if (activeCardKey) renderPanel(activeCardKey, activeOverlayId);
            if (conversationDialogOpen && activeCardKey) renderConversationDialog(activeCardKey);
            if (typeof hmRefreshNotificationBar === 'function') hmRefreshNotificationBar();
        }, (error) => {
            if (typeof hmReportError === 'function') hmReportError('cardComments.read', error, '❌ 함께 남긴 말을 불러오지 못했습니다.');
        });
    }

    function badgeTarget(cardKey) {
        if (cardKey === 'promise') return document.getElementById('customRoutineHubCard');
        if (cardKey === 'subRoutine') return document.getElementById('subRoutineHubCard');
        return document.querySelector(`.daily-card[onclick*="openDailyModal('${cardKey}')"]`);
    }
    function renderBadges() {
        Object.keys(CARD_LABELS).forEach((cardKey) => {
            const card = badgeTarget(cardKey);
            if (!card) return;
            let badge = card.querySelector(`[data-card-conversation-badge="${cardKey}"]`);
            const comments = commentsFor(cardKey);
            const unread = unreadFor(cardKey);
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'card-conversation-badge';
                badge.dataset.cardConversationBadge = cardKey;
                const arrow = card.querySelector('.daily-card-arrow');
                if (arrow) arrow.before(badge); else card.appendChild(badge);
            }
            badge.hidden = comments.length === 0;
            badge.classList.toggle('has-unread', unread.length > 0);
            badge.textContent = unread.length ? `새 코멘트 ${unread.length}` : `함께 남긴 말 ${comments.length}`;
        });
    }

    function ensurePanel(cardKey, overlayId) {
        const overlay = document.getElementById(overlayId);
        if (PANEL_DISABLED_KEYS.has(cardKey)) {
            overlay?.querySelector('.card-conversation-panel')?.remove();
            return null;
        }
        const modal = overlay?.querySelector('.daily-modal, .custom-routine-hub, .sub-routine-hub, [role="dialog"]') || overlay?.firstElementChild;
        if (!modal) return null;
        let panel = modal.querySelector('.card-conversation-panel');
        if (!panel) {
            panel = document.createElement('section');
            panel.className = 'card-conversation-panel';
            const saveButton = modal.querySelector('.daily-modal-save');
            if (saveButton) saveButton.before(panel); else modal.appendChild(panel);
        }
        panel.dataset.cardConversationKey = cardKey;
        return panel;
    }
    function renderPanel(cardKey, overlayId) {
        const panel = ensurePanel(cardKey, overlayId);
        if (!panel) return;
        const rows = commentsFor(cardKey);
        panel.innerHTML = `
            <button type="button" class="card-conversation-head" data-card-conversation-open="${escapeHtml(cardKey)}">
                <div><strong>💞 ${rows.length ? '함께 남긴 말' : '코멘트 남기기'}</strong><small>${rows.length ? `${rows.length}개의 대화 보기` : '필요할 때만 열기'}</small></div>
                <span>${rows.length ? rows.length : '+'}</span><b aria-hidden="true">열기</b>
            </button>`;
    }

    function ensureConversationDialog() {
        let overlay = document.getElementById('cardConversationDialogOverlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'cardConversationDialogOverlay';
        overlay.className = 'card-conversation-dialog-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<section class="card-conversation-dialog" role="dialog" aria-modal="true"><div class="card-conversation-dialog-content"></div></section>';
        document.body.appendChild(overlay);
        return overlay;
    }

    function renderConversationDialog(cardKey) {
        const overlay = ensureConversationDialog();
        const content = overlay.querySelector('.card-conversation-dialog-content');
        if (!content) return;
        const rows = commentsFor(cardKey);
        content.innerHTML = `
            <header class="card-conversation-dialog-head"><div><strong>💞 함께 남긴 말</strong><small>${escapeHtml(CARD_LABELS[cardKey] || cardKey)} · Sub와 Dom의 코멘트</small></div><button type="button" data-card-conversation-close>닫기</button></header>
            ${rows.length ? `<div class="card-conversation-list">${rows.map((item) => `
                <article class="card-conversation-message role-${item.authorRole === 'dom' ? 'dom' : 'sub'}">
                    <div><strong>${roleLabel(item.authorRole)}</strong><small>${escapeHtml(item.authorName || '')} · ${escapeHtml(formatTime(item.createdAt))}</small>${item.authorUid === currentUser?.uid ? `<button type="button" data-card-comment-delete="${escapeHtml(item.id)}">삭제</button>` : ''}</div>
                    <p>${escapeHtml(item.text).replace(/\n/g,'<br>')}</p>
                </article>`).join('')}</div>` : '<div class="card-conversation-empty">아직 함께 남긴 말이 없습니다.</div>'}
            <form class="card-conversation-form" data-card-comment-form="${escapeHtml(cardKey)}">
                <label><span>${roleLabel(roleValue())}로 코멘트</span><textarea maxlength="500" rows="2" placeholder="이 기록에 마음을 남겨보세요."></textarea></label>
                <button type="submit">남기기</button>
            </form>`;
        const conversationList = content.querySelector('.card-conversation-list');
        if (conversationList) {
            requestAnimationFrame(() => {
                conversationList.scrollTop = conversationList.scrollHeight;
            });
        }
    }

    function openConversationDialog(cardKey) {
        if (!CARD_LABELS[cardKey]) return;
        activeCardKey = cardKey;
        conversationDialogOpen = true;
        const overlay = ensureConversationDialog();
        renderConversationDialog(cardKey);
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        const latest = commentsFor(cardKey).reduce((max,item) => Math.max(max, Number(item.createdAt || 0)), Date.now());
        writeRead(cardKey, latest);
        renderBadges();
    }

    function closeConversationDialog() {
        const overlay = document.getElementById('cardConversationDialogOverlay');
        conversationDialogOpen = false;
        overlay?.classList.remove('is-open');
        overlay?.setAttribute('aria-hidden', 'true');
    }

    function openCardConversation(cardKey, overlayId) {
        if (!CARD_LABELS[cardKey]) return;
        bind();
        activeCardKey = cardKey;
        activeOverlayId = overlayId;
        const shouldOpenFromNotification = notificationOpenCardKey === cardKey;
        notificationOpenCardKey = '';
        const latest = commentsFor(cardKey).reduce((max,item) => Math.max(max, Number(item.createdAt || 0)), Date.now());
        writeRead(cardKey, latest);
        renderPanel(cardKey, overlayId);
        renderBadges();
        if (typeof hmMarkNotificationCardRead === 'function') hmMarkNotificationCardRead(cardKey);
        if (shouldOpenFromNotification) openConversationDialog(cardKey);
    }

    async function submitComment(cardKey, value, button) {
        const message = text(value).slice(0,500);
        const room = roomCode();
        const date = dateValue();
        if (!message || !currentUser || !room || !date || !CARD_LABELS[cardKey]) return;
        button.disabled = true;
        const payload = {
            text: message,
            authorUid: currentUser.uid,
            authorName: text(currentUser.displayName || currentUser.email || roleLabel(roleValue())).slice(0,80),
            authorRole: roleValue(),
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        try {
            await db.ref(`rooms/${room}/cardComments/${date}/${cardKey}`).push(payload);
            if (typeof showSaveStatus === 'function') showSaveStatus('💞 함께 남긴 말 저장 완료');
        } catch (error) {
            if (typeof hmReportError === 'function') hmReportError('cardComments.write', error, '❌ 코멘트 저장 실패');
        } finally { button.disabled = false; }
    }
    async function deleteComment(commentId) {
        if (!activeCardKey || !commentId || !confirm('내 코멘트를 삭제할까요?')) return;
        try {
            await db.ref(`rooms/${roomCode()}/cardComments/${dateValue()}/${activeCardKey}/${commentId}`).remove();
        } catch (error) {
            if (typeof hmReportError === 'function') hmReportError('cardComments.delete', error, '❌ 코멘트 삭제 실패');
        }
    }

    function notificationItems(date) {
        if (date !== dateValue()) return [];
        return Object.keys(CARD_LABELS).flatMap((cardKey) => {
            const unread = unreadFor(cardKey);
            const latest = unread[unread.length - 1];
            if (!latest) return [];
            return [{
                type:'conversation', key:cardKey, date,
                icon:CARD_ICONS[cardKey] || '💬',
                title:`${roleLabel(latest.authorRole)}이 ${CARD_LABELS[cardKey]}에 코멘트를 남겼어요`,
                sub:text(latest.text).slice(0,80), action:'확인',
                signature:`conversation|${date}|${cardKey}|${latest.id}`
            }];
        });
    }
    function openFromNotification(cardKey) {
        notificationOpenCardKey = cardKey;
        if (cardKey === 'promise' && typeof openCustomRoutineHub === 'function') return openCustomRoutineHub();
        if (cardKey === 'subRoutine' && typeof openSubRoutineHub === 'function') return openSubRoutineHub();
        if (cardKey === 'mission' && typeof openMissionModal === 'function') return openMissionModal();
        if (typeof openDailyModal === 'function') return openDailyModal(cardKey);
    }

    async function renderHistoryConversations(date, container) {
        if (!container || !date || !roomCode()) return;
        container.querySelector('.history-card-conversations')?.remove();
        let source = cache;
        if (date !== dateValue()) {
            try {
                const snapshot = await db.ref(`rooms/${roomCode()}/cardComments/${date}`).once('value');
                source = snapshot.val() || {};
            } catch (error) {
                if (typeof hmReportError === 'function') hmReportError('cardComments.history', error, '❌ 기록 대화를 불러오지 못했습니다.');
                return;
            }
        }
        const groups = Object.keys(CARD_LABELS).map((cardKey) => {
            const rows = Object.entries(source?.[cardKey] || {}).map(([id,value]) => ({ id, ...(value || {}) }))
                .filter((item) => text(item.text)).sort((a,b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
            return { cardKey, rows };
        }).filter((group) => group.rows.length);
        if (!groups.length) return;
        const section = document.createElement('section');
        section.className = 'history-card-conversations';
        section.innerHTML = `<h3>💞 함께 남긴 말</h3>${groups.map((group) => `
            <article><strong>${CARD_ICONS[group.cardKey] || '💬'} ${escapeHtml(CARD_LABELS[group.cardKey])}</strong>
            ${group.rows.map((item) => `<p><b>${roleLabel(item.authorRole)}</b><span>${escapeHtml(item.text)}</span><small>${escapeHtml(formatTime(item.createdAt))}</small></p>`).join('')}</article>`).join('')}`;
        const actions = container.querySelector('.history-detail-actions');
        if (actions) actions.before(section); else container.appendChild(section);
    }

    document.addEventListener('submit', (event) => {
        const form = event.target.closest('[data-card-comment-form]');
        if (!form) return;
        event.preventDefault();
        const textarea = form.querySelector('textarea');
        const button = form.querySelector('button[type="submit"]');
        if (!text(textarea?.value)) return;
        submitComment(form.dataset.cardCommentForm, textarea.value, button).then(() => { textarea.value = ''; });
    });
    document.addEventListener('click', (event) => {
        const openButton = event.target.closest('[data-card-conversation-open]');
        if (openButton) { openConversationDialog(openButton.dataset.cardConversationOpen); return; }
        if (event.target.closest('[data-card-conversation-close]')) { closeConversationDialog(); return; }
        if (event.target.classList?.contains('card-conversation-dialog-overlay')) { closeConversationDialog(); return; }
        const button = event.target.closest('[data-card-comment-delete]');
        if (button) deleteComment(button.dataset.cardCommentDelete);
    });
    document.addEventListener('DOMContentLoaded', () => {
        bind(); renderBadges();
        document.getElementById('recordDate')?.addEventListener('change', () => setTimeout(bind,0));
    });
    window.addEventListener('focus', bind);
    setInterval(bind, 1500);

    window.hmOpenCardConversation = openCardConversation;
    window.hmGetConversationNotificationItems = notificationItems;
    window.hmOpenConversationFromNotification = openFromNotification;
    window.hmRenderHistoryConversations = renderHistoryConversations;
})();
