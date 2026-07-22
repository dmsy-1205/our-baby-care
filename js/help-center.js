// =========================================================
// HearMe2nite RC2.18 UX Help Center
// Card guide / FAQ accordion / Search / Random tips
// No Firebase, Room, History, Presence structure changes
// =========================================================
(function () {
    const SUPPORT_STATUS_LABELS = {
        received: '접수됨',
        reviewing: '확인 중',
        waiting_user: '추가 정보 필요',
        resolved: '답변 완료',
        closed: '종료'
    };
    const SUPPORT_CATEGORY_LABELS = {
        usage: '앱 사용 문의',
        data_error: '데이터 오류',
        account_room: '계정·Room 문의',
        report: '신고·안전',
        suggestion: '기능 제안'
    };
    let supportLoading = false;
    let supportNotificationRef = null;
    let supportNotificationInitialLoad = true;
    const HELP_TIPS = [
        '매일 한 줄이라도 기록을 남겨보세요.',
        '커스텀 미션은 “물 2L 마시기”처럼 짧고 구체적으로 쓰면 좋아요.',
        '첫 만남, 첫 여행, 첫 데이트도 기념일로 남겨보세요.',
        '운동은 거창하지 않아도 괜찮아요. 산책도 충분히 좋은 기록입니다.',
        '기록실에서 날짜를 눌러 지난 추억을 다시 확인해 보세요.',
        '오늘의 약속에는 잊으면 안 되는 일정만 간단히 적어보세요.',
        '피드백은 칭찬을 먼저 쓰면 더 따뜻하게 전달됩니다.',
        '사진을 함께 남기면 기록실을 열었을 때 추억이 더 선명해져요.'
    ];

    function getRoot() {
        return document.getElementById('guideModal');
    }

    function selectHelpTab(tabName) {
        const root = getRoot();
        if (!root || !tabName) return;

        const tabs = root.querySelectorAll('[data-help-tab]');
        const panels = root.querySelectorAll('[data-help-panel]');

        tabs.forEach((tab) => {
            const active = tab.dataset.helpTab === tabName;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        panels.forEach((panel) => {
            const active = panel.dataset.helpPanel === tabName;
            panel.classList.toggle('active', active);
            panel.hidden = !active;
        });

        const results = document.getElementById('helpSearchResults');
        if (results) {
            results.hidden = true;
            results.innerHTML = '';
        }

        if (tabName === 'support') {
            loadSupportTickets();
            markSupportNotificationsRead();
        }
    }

    function showRandomHelpTip() {
        const target = document.getElementById('helpRandomTip');
        if (!target) return;
        const index = Math.floor(Math.random() * HELP_TIPS.length);
        target.textContent = HELP_TIPS[index];
    }

    function toggleHelpFaq(button) {
        if (!button) return;
        const answer = button.nextElementSibling;
        const expanded = button.classList.toggle('open');
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (answer) answer.classList.toggle('open', expanded);
    }

    function searchHelpCenter(query) {
        const root = getRoot();
        const results = document.getElementById('helpSearchResults');
        if (!root || !results) return;

        const q = (query || '').trim().toLowerCase();
        if (!q) {
            results.hidden = true;
            results.innerHTML = '';
            return;
        }

        const cards = Array.from(root.querySelectorAll('[data-help-keywords]'));
        const matched = cards.filter((card) => {
            const haystack = `${card.textContent || ''} ${card.dataset.helpKeywords || ''}`.toLowerCase();
            return haystack.includes(q);
        }).slice(0, 6);

        if (!matched.length) {
            results.innerHTML = '<div class="help-empty-result">검색 결과가 없어요. “운동”, “미션”, “기념일”, “기록실”처럼 입력해 보세요.</div>';
            results.hidden = false;
            return;
        }

        results.innerHTML = matched.map((card) => {
            const title = card.querySelector('h3, .faq-question, strong')?.textContent?.replace('⌄', '').trim() || '사용 가이드';
            const text = (card.querySelector('p, .faq-answer, .help-tip')?.textContent || card.textContent || '').replace(/\s+/g, ' ').trim();
            return `<button type="button" class="help-result-card" data-hm-action="open-help-search-match" data-hm-value="${card.closest('[data-help-panel]')?.dataset.helpPanel || 'home'}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text.slice(0, 80))}</span></button>`;
        }).join('');
        results.hidden = false;
    }

    function openHelpSearchMatch(panelName) {
        selectHelpTab(panelName || 'home');
        const input = document.getElementById('helpSearchInput');
        if (input) input.value = '';
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function supportUser() {
        try { return currentUser || null; } catch (error) { return null; }
    }

    function supportDatabase() {
        try { return db || null; } catch (error) { return null; }
    }

    function supportRoomCode() {
        try { return String(activeRoomCode || ''); } catch (error) { return ''; }
    }

    function formatSupportDate(value) {
        const timestamp = Number(value || 0);
        if (!timestamp) return '시간 확인 중';
        return new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(timestamp));
    }

    function renderSupportReply(reply) {
        return `<div class="help-support-reply"><strong>고객센터 답변</strong><p>${escapeHtml(reply.message || '')}</p><small>${escapeHtml(formatSupportDate(reply.createdAt))}</small></div>`;
    }

    function renderSupportUserMessage(message) {
        return `<div class="help-support-user-message"><strong>내 추가 답변</strong><p>${escapeHtml(message.message || '')}</p><small>${escapeHtml(formatSupportDate(message.createdAt))}</small></div>`;
    }

    function renderSupportTicket(ticket, replies, userMessages, rating) {
        const status = ticket.status || 'received';
        const canFollowUp = status !== 'closed';
        const canRate = ['resolved', 'closed'].includes(status) && !rating;
        return `<article class="help-support-ticket">
            <div class="help-support-ticket-head"><strong>${escapeHtml(ticket.title || '문의')}</strong><span data-status="${escapeHtml(status)}">${escapeHtml(SUPPORT_STATUS_LABELS[status] || status)}</span></div>
            <div class="help-support-ticket-meta"><span>${escapeHtml(SUPPORT_CATEGORY_LABELS[ticket.category] || ticket.category || '일반 문의')}</span><span>${escapeHtml(formatSupportDate(ticket.createdAt))}</span></div>
            <p>${escapeHtml(ticket.message || '')}</p>
            ${replies.length ? `<div class="help-support-replies">${replies.map(renderSupportReply).join('')}</div>` : '<small class="help-support-waiting">답변을 준비하고 있습니다.</small>'}
            ${userMessages.length ? `<div class="help-support-user-messages">${userMessages.map(renderSupportUserMessage).join('')}</div>` : ''}
            ${canFollowUp ? `<form class="help-support-followup" data-hm-submit="support-followup" data-hm-value="${escapeHtml(ticket.id)}"><textarea maxlength="1000" rows="3" placeholder="추가로 전달할 내용을 적어주세요" required></textarea><button type="submit">추가 답변 보내기</button></form>` : ''}
            ${rating ? `<div class="help-support-rating-done"><strong>만족도 ${Number(rating.score || 0)}점</strong><span>${escapeHtml(rating.comment || '평가해 주셔서 감사합니다.')}</span></div>` : ''}
            ${canRate ? `<form class="help-support-rating" data-hm-submit="support-rating" data-hm-value="${escapeHtml(ticket.id)}"><strong>이번 답변은 도움이 되었나요?</strong><select required><option value="">점수 선택</option><option value="5">5점 · 매우 만족</option><option value="4">4점 · 만족</option><option value="3">3점 · 보통</option><option value="2">2점 · 아쉬움</option><option value="1">1점 · 불만족</option></select><input maxlength="300" placeholder="선택 사항: 의견을 남겨주세요"><button type="submit">평가 보내기</button></form>` : ''}
        </article>`;
    }

    async function loadSupportTickets(force) {
        const list = document.getElementById('supportTicketList');
        const user = supportUser();
        const database = supportDatabase();
        if (!list) return;
        if (!user || !database) {
            list.innerHTML = '<p class="help-support-empty">로그인 후 문의를 보내고 답변을 확인할 수 있습니다.</p>';
            return;
        }
        if (supportLoading && !force) return;
        supportLoading = true;
        list.innerHTML = '<p class="help-support-empty">문의 내역을 불러오는 중입니다.</p>';
        try {
            const [ticketSnapshot, replySnapshot, messageSnapshot, ratingSnapshot] = await Promise.all([
                database.ref(`supportTickets/${user.uid}`).once('value'),
                database.ref(`supportReplies/${user.uid}`).once('value'),
                database.ref(`supportUserMessages/${user.uid}`).once('value'),
                database.ref(`supportRatings/${user.uid}`).once('value')
            ]);
            const ticketRoot = ticketSnapshot.val() || {};
            const replyRoot = replySnapshot.val() || {};
            const messageRoot = messageSnapshot.val() || {};
            const ratingRoot = ratingSnapshot.val() || {};
            const tickets = Object.entries(ticketRoot)
                .map(([id, value]) => ({ id, ...(value || {}) }))
                .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
            list.innerHTML = tickets.length ? tickets.map((ticket) => {
                const replies = Object.values(replyRoot[ticket.id] || {}).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
                const userMessages = Object.values(messageRoot[ticket.id] || {}).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
                return renderSupportTicket(ticket, replies, userMessages, ratingRoot[ticket.id] || null);
            }).join('') : '<p class="help-support-empty">아직 접수한 문의가 없습니다.</p>';
        } catch (error) {
            console.error('[Support Center] load failed', error);
            list.innerHTML = '<p class="help-support-empty">문의 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
        } finally {
            supportLoading = false;
        }
    }

    async function submitSupportTicket(event) {
        if (event) event.preventDefault();
        const user = supportUser();
        const database = supportDatabase();
        if (!user || !database) {
            alert('로그인 후 문의를 보낼 수 있습니다.');
            return false;
        }

        const category = document.getElementById('supportCategory')?.value || 'usage';
        const title = String(document.getElementById('supportTitle')?.value || '').trim();
        const message = String(document.getElementById('supportMessage')?.value || '').trim();
        if (title.length < 2 || message.length < 10) {
            alert('제목은 2자 이상, 문의 내용은 10자 이상 적어주세요.');
            return false;
        }

        const button = document.getElementById('supportSubmitButton');
        if (button) button.disabled = true;
        try {
            const ref = database.ref(`supportTickets/${user.uid}`).push();
            await ref.set({
                ticketId: ref.key,
                ownerUid: user.uid,
                ownerEmail: user.email || '',
                category,
                title: title.slice(0, 80),
                message: message.slice(0, 2000),
                status: 'received',
                priority: 'normal',
                roomCode: supportRoomCode(),
                appVersion: document.querySelector('[data-hm-release-version]')?.textContent?.trim() || '',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            document.getElementById('supportTicketForm')?.reset();
            alert('문의가 접수되었습니다. 이 화면에서 답변 상태를 확인할 수 있습니다.');
            await loadSupportTickets(true);
        } catch (error) {
            console.error('[Support Center] submit failed', error);
            alert('문의를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            if (button) button.disabled = false;
        }
        return false;
    }

    async function submitSupportFollowUp(event, ticketId) {
        event.preventDefault();
        const user = supportUser();
        const database = supportDatabase();
        const form = event.currentTarget;
        const message = String(form.querySelector('textarea')?.value || '').trim();
        if (!user || !database || !ticketId || message.length < 2) return false;
        const button = form.querySelector('button');
        if (button) button.disabled = true;
        try {
            const ref = database.ref(`supportUserMessages/${user.uid}/${ticketId}`).push();
            await ref.set({ messageId: ref.key, ticketId, ownerUid: user.uid, message: message.slice(0, 1000), createdAt: firebase.database.ServerValue.TIMESTAMP });
            form.reset();
            if (typeof showToast === 'function') showToast('📨 추가 답변을 보냈습니다.');
            await loadSupportTickets(true);
        } catch (error) {
            console.error('[Support Center] follow-up failed', error);
            alert('추가 답변을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally { if (button) button.disabled = false; }
        return false;
    }

    async function submitSupportRating(event, ticketId) {
        event.preventDefault();
        const user = supportUser();
        const database = supportDatabase();
        const form = event.currentTarget;
        const score = Number(form.querySelector('select')?.value || 0);
        const comment = String(form.querySelector('input')?.value || '').trim().slice(0, 300);
        if (!user || !database || !ticketId || score < 1 || score > 5) return false;
        const button = form.querySelector('button');
        if (button) button.disabled = true;
        try {
            await database.ref(`supportRatings/${user.uid}/${ticketId}`).set({ ticketId, ownerUid: user.uid, score, comment, createdAt: firebase.database.ServerValue.TIMESTAMP });
            if (typeof showToast === 'function') showToast('💜 만족도 평가를 남겼습니다.');
            await loadSupportTickets(true);
        } catch (error) {
            console.error('[Support Center] rating failed', error);
            alert('평가를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        } finally { if (button) button.disabled = false; }
        return false;
    }

    function renderSupportNotificationBadge(value) {
        const badge = document.getElementById('supportUnreadBadge');
        if (!badge) return;
        const unread = Object.values(value || {}).filter((item) => item && !Number(item.readAt || 0));
        badge.textContent = String(unread.length);
        badge.hidden = unread.length === 0;
        badge.closest('[data-help-tab]')?.classList.toggle('has-support-unread', unread.length > 0);
        if (!supportNotificationInitialLoad && unread.length && typeof showToast === 'function') {
            showToast(`📨 고객센터 새 답변 ${unread.length}건이 도착했습니다.`);
        }
        supportNotificationInitialLoad = false;
    }

    function stopSupportNotificationWatcher() {
        if (supportNotificationRef) supportNotificationRef.off();
        supportNotificationRef = null;
        renderSupportNotificationBadge({});
        supportNotificationInitialLoad = true;
    }

    function startSupportNotificationWatcher(user) {
        stopSupportNotificationWatcher();
        const database = supportDatabase();
        if (!user || !database) return;
        supportNotificationRef = database.ref(`supportNotifications/${user.uid}`);
        supportNotificationRef.on('value', (snapshot) => renderSupportNotificationBadge(snapshot.val()), (error) => {
            console.warn('[Support Center] notification watcher failed', error);
        });
    }

    async function markSupportNotificationsRead() {
        const user = supportUser();
        const database = supportDatabase();
        if (!user || !database) return;
        try {
            const snapshot = await database.ref(`supportNotifications/${user.uid}`).once('value');
            const updates = {};
            snapshot.forEach((child) => {
                if (!Number(child.child('readAt').val() || 0)) updates[`${child.key}/readAt`] = firebase.database.ServerValue.TIMESTAMP;
            });
            if (Object.keys(updates).length) await database.ref(`supportNotifications/${user.uid}`).update(updates);
        } catch (error) {
            console.warn('[Support Center] notification read failed', error);
        }
    }

    function resetHelpCenter() {
        if (typeof window.hmRenderReleaseInfo === 'function') window.hmRenderReleaseInfo();
        const input = document.getElementById('helpSearchInput');
        if (input) input.value = '';
        selectHelpTab('home');
        showRandomHelpTip();
    }

    window.selectHelpTab = selectHelpTab;
    window.resetHelpCenter = resetHelpCenter;
    window.searchHelpCenter = searchHelpCenter;
    window.toggleHelpFaq = toggleHelpFaq;
    window.showRandomHelpTip = showRandomHelpTip;
    window.openHelpSearchMatch = openHelpSearchMatch;
    window.loadSupportTickets = loadSupportTickets;
    window.submitSupportTicket = submitSupportTicket;
    window.submitSupportFollowUp = submitSupportFollowUp;
    window.submitSupportRating = submitSupportRating;
    window.markSupportNotificationsRead = markSupportNotificationsRead;

    document.addEventListener('DOMContentLoaded', () => {
        resetHelpCenter();
        try { babyAuth.onAuthStateChanged(startSupportNotificationWatcher); } catch (error) { console.warn(error); }
    });
})();
