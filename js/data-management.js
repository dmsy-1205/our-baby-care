// =========================================================
// HearMe2nite v1.0 STEP5.6.1.9.1 - User Request Cancellation
// - Users can submit/cancel and view only their own requests.
// - Firebase admins can review, hold, approve, or reject.
// - Approved leave_room requests can be executed only through one callable Cloud Function.
// =========================================================
(function () {
    const STATUS_LABELS = {
        pending: '🟡 접수됨', reviewing: '🔎 검토 중', approved: '🟢 승인',
        hold: '🟠 보류', rejected: '🔴 거절', canceled: '⚪ 사용자 취소',
        scheduled: '🔵 삭제 예정', processing: '⏳ 처리 중', completed: '✅ 처리 완료', failed: '🔴 처리 실패'
    };
    const REQUEST_TYPES = {
        account: { label: '내 계정 및 개인 정보 삭제', notice: '계정과 개인 프로필 삭제를 요청합니다. 공동 Room 기록은 상대방의 권리를 위해 별도로 검토됩니다.', placeholder: '예: 더 이상 서비스를 사용하지 않아 계정과 개인 정보 삭제를 요청합니다.' },
        leave_room: { label: '현재 Room 연결 해제', notice: '내 계정과 현재 Room의 연결 해제를 요청합니다. Room 기록 자체는 보존됩니다.', placeholder: '예: 현재 상대방과의 Room 연결을 종료하고 싶습니다.' },
        delete_room: { label: 'Room 전체 데이터 삭제', notice: '공동 기록 전체 삭제 요청입니다. 상대방 확인과 추가 검토가 필요하며 즉시 삭제되지 않습니다.', placeholder: '예: 두 사용자가 합의하여 Room의 모든 공동 기록 삭제를 요청합니다.' }
    };
    const OPEN_STATUSES = ['pending', 'reviewing', 'approved', 'hold', 'scheduled', 'processing', 'failed'];
    const CANCELABLE_STATUSES = ['pending', 'reviewing', 'hold'];
    const CANCELABLE_STATUS_TEXT = '접수됨 · 검토 중 · 보류';
    let hmDataAdmin = false;
    let hmAdminRequests = [];
    let hmAdminNotes = {};
    let hmAdminFilter = 'open';

    function getRoomCode() {
        try { if (typeof getRoomCodeForData === 'function') return getRoomCodeForData(); } catch (e) {}
        try { return activeRoomCode || ''; } catch (e) { return ''; }
    }
    function getUser() { try { return currentUser || null; } catch (e) { return null; } }
    function userRequestPath(uid) { return `dataDeleteRequests/${uid}`; }
    function requestItemPath(uid, requestId) { return `${userRequestPath(uid)}/${requestId}`; }
    function adminNotePath(uid, requestId) { return `dataDeleteRequestAdminNotes/${uid}/${requestId}`; }
    function getSelectedRequestType() { return document.querySelector('input[name="deleteRequestType"]:checked')?.value || 'account'; }
    function formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
    function showToastSafe(message) { if (typeof showToast === 'function') showToast(message); else alert(message); }
    function setStatusMessage(message, isError) {
        const el = document.getElementById('dataRequestStatusMessage');
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('error', !!isError);
        el.classList.toggle('ok', !!message && !isError);
    }
    function escapeHtml(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
    function escapeJs(str) { return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
    function isCancelableStatus(status) { return CANCELABLE_STATUSES.includes(status || 'pending'); }
    function statusText(status) { return String(STATUS_LABELS[status] || status || '접수됨').replace(/^[^\s]+\s*/, ''); }

    function updateDeleteRequestTypeNotice() {
        const config = REQUEST_TYPES[getSelectedRequestType()] || REQUEST_TYPES.account;
        const notice = document.getElementById('deleteScopeHelp');
        const reason = document.getElementById('deleteRequestReason');
        if (notice) { notice.textContent = config.notice; notice.classList.toggle('danger', getSelectedRequestType() === 'delete_room'); }
        if (reason) reason.placeholder = config.placeholder;
    }
    function openDataManagementModal() {
        const modal = document.getElementById('dataManagementOverlay');
        if (!modal) return;
        modal.classList.add('show');
        selectDataManagementTab('request');
        updateDeleteRequestTypeNotice();
        loadDataDeleteRequests();
    }
    function closeDataManagementModal() { document.getElementById('dataManagementOverlay')?.classList.remove('show'); }
    function selectDataManagementTab(tabName) {
        const root = document.getElementById('dataManagementOverlay');
        if (!root) return;
        root.querySelectorAll('[data-data-tab]').forEach((tab) => {
            const active = tab.dataset.dataTab === tabName;
            tab.classList.toggle('active', active); tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        root.querySelectorAll('[data-data-panel]').forEach((panel) => {
            const active = panel.dataset.dataPanel === tabName;
            panel.classList.toggle('active', active); panel.hidden = !active;
        });
        if (tabName === 'history') loadDataDeleteRequests();
    }
    async function getMyRequests(uid) {
        const snap = await db.ref(userRequestPath(uid)).once('value');
        const data = snap.val() || {};
        return Object.entries(data).map(([id, item]) => ({ id, ...(item || {}) })).sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
    }
    function renderCurrentRequestSummary(requests) {
        const summary = document.getElementById('dataCurrentRequestSummary');
        const submitBtn = document.getElementById('deleteRequestSubmitBtn');
        if (!summary) return;
        const active = requests.find((item) => OPEN_STATUSES.includes(item.status || 'pending'));
        if (!active) { summary.hidden = true; summary.innerHTML = ''; if (submitBtn) submitBtn.disabled = false; return; }
        const type = REQUEST_TYPES[active.requestType] || { label: active.requestTypeLabel || '데이터 삭제 요청' };
        summary.hidden = false;
        summary.innerHTML = `<div class="data-current-head"><strong>현재 진행 중인 요청</strong><span>${escapeHtml(STATUS_LABELS[active.status || 'pending'] || active.status)}</span></div><p>${escapeHtml(type.label)}</p><small>접수: ${escapeHtml(formatDate(active.requestedAt))}</small><button type="button" class="data-current-link" onclick="selectDataManagementTab('history')">요청 상세 보기</button>`;
        if (submitBtn) submitBtn.disabled = true;
    }
    async function submitDataDeleteRequest() {
        const user = getUser(); const roomCode = getRoomCode();
        const reasonEl = document.getElementById('deleteRequestReason');
        const confirmEl = document.getElementById('deleteRequestConfirm');
        const reason = (reasonEl?.value || '').trim();
        const requestType = getSelectedRequestType();
        const config = REQUEST_TYPES[requestType] || REQUEST_TYPES.account;
        setStatusMessage('', false);
        if (!user) return setStatusMessage('먼저 로그인해 주세요.', true);
        if (!roomCode) return setStatusMessage('먼저 우리의 공간에 연결해 주세요.', true);
        if (reason.length < 10) return setStatusMessage('삭제 요청 사유를 10자 이상 작성해 주세요.', true);
        if (!confirmEl?.checked) return setStatusMessage('삭제 요청 전 확인 문구에 체크해 주세요.', true);
        try {
            const mine = await getMyRequests(user.uid);
            if (mine.some((item) => OPEN_STATUSES.includes(item.status || 'pending'))) {
                setStatusMessage('이미 진행 중인 요청이 있습니다. 요청 내역을 확인해 주세요.', true); selectDataManagementTab('history'); return;
            }
            const ref = db.ref(userRequestPath(user.uid)).push();
            const now = firebase.database.ServerValue.TIMESTAMP;
            await ref.set({
                requestId: ref.key, roomCode, requestedByUid: user.uid,
                requestedByEmail: (user.email || '').toLowerCase(), requestType,
                requestTypeLabel: config.label, partnerConsentRequired: requestType === 'delete_room',
                reason, status: 'pending', adminMessage: '요청이 접수되었습니다. 운영자가 내용을 확인할 예정입니다.',
                requestedAt: now, updatedAt: now, source: 'hearme2nite-user-app', version: 'v1.0-step5.6.1.6-data-admin'
            });
            if (reasonEl) reasonEl.value = '';
            if (confirmEl) confirmEl.checked = false;
            const first = document.querySelector('input[name="deleteRequestType"][value="account"]'); if (first) first.checked = true;
            updateDeleteRequestTypeNotice(); setStatusMessage('요청이 접수되었습니다. 요청 내역에서 상태를 확인할 수 있습니다.', false);
            showToastSafe('데이터 처리 요청이 접수되었습니다.'); selectDataManagementTab('history'); await loadDataDeleteRequests();
        } catch (error) {
            console.warn('[DataManagement] submit failed', error); setStatusMessage('요청 저장 중 오류가 발생했습니다. Firebase Rules를 확인해 주세요.', true);
        }
    }
    async function loadDataDeleteRequests() {
        const list = document.getElementById('dataDeleteRequestList'); if (!list) return;
        const user = getUser();
        if (!user) { list.innerHTML = '<div class="data-empty-state">로그인 후 요청 내역을 확인할 수 있습니다.</div>'; renderCurrentRequestSummary([]); return; }
        list.innerHTML = '<div class="data-empty-state">요청 내역을 불러오는 중입니다.</div>';
        try {
            const requests = await getMyRequests(user.uid); renderCurrentRequestSummary(requests);
            list.innerHTML = requests.length ? requests.map(renderRequestCard).join('') : '<div class="data-empty-state">아직 데이터 처리 요청 내역이 없습니다.</div>';
        } catch (error) {
            console.warn('[DataManagement] load failed', error); renderCurrentRequestSummary([]); list.innerHTML = '<div class="data-empty-state error">요청 내역을 불러오지 못했습니다.</div>';
        }
    }
    function renderRequestCard(item) {
        const status = item.status || 'pending';
        const type = REQUEST_TYPES[item.requestType] || { label: item.requestTypeLabel || '기존 삭제 요청' };
        const partnerNotice = item.requestType === 'delete_room' || item.partnerConsentRequired ? '<div class="data-shared-notice">공동 Room 전체 삭제 요청 · 상대방 확인이 필요할 수 있습니다.</div>' : '';
        const cancelButton = isCancelableStatus(status) ? `<button type="button" class="data-small-action" onclick="cancelDataDeleteRequest('${escapeJs(item.id)}')" aria-label="${escapeHtml(type.label)} 삭제 요청 취소">삭제 요청 취소</button>` : '';
        return `<article class="data-request-card"><div class="data-request-head"><strong>${escapeHtml(STATUS_LABELS[status] || status)}</strong><small>${escapeHtml(formatDate(item.requestedAt))}</small></div><div class="data-request-type">${escapeHtml(type.label)}</div>${partnerNotice}<div class="data-request-body"><div><strong>요청 사유</strong><p>${escapeHtml(item.reason || '-')}</p></div><div><strong>운영자 답변</strong><p>${escapeHtml(item.adminMessage || '운영자 답변을 기다리는 중입니다.')}</p></div></div>${cancelButton}</article>`;
    }
    async function cancelDataDeleteRequest(requestId) {
        const user = getUser();
        if (!user || !requestId) return;
        const confirmed = confirm(`이 데이터 삭제 요청을 취소할까요?\n\n${CANCELABLE_STATUS_TEXT} 상태에서만 직접 취소할 수 있습니다.`);
        if (!confirmed) return;
        try {
            const ref = db.ref(requestItemPath(user.uid, requestId));
            let cancelAllowed = false;
            let currentStatus = '';
            const result = await ref.transaction((item) => {
                currentStatus = item?.status || 'pending';
                if (!item || item.requestedByUid !== user.uid || !isCancelableStatus(currentStatus)) return;
                cancelAllowed = true;
                const now = Date.now();
                return {
                    ...item,
                    requestId: item.requestId || requestId,
                    status: 'canceled',
                    adminMessage: '사용자가 요청을 취소했습니다.',
                    canceledAt: now,
                    updatedAt: now
                };
            }, undefined, false);
            if (!cancelAllowed || !result.committed) {
                const label = statusText(currentStatus);
                alert(`현재 요청 상태는 '${label}'입니다.\n\n${CANCELABLE_STATUS_TEXT} 상태에서만 직접 취소할 수 있습니다. 운영자 답변을 확인하거나 새 요청을 남겨주세요.`);
                await loadDataDeleteRequests();
                return;
            }
            showToastSafe('삭제 요청이 취소되었습니다.');
            await loadDataDeleteRequests();
        } catch (error) {
            console.warn('[DataManagement] cancel failed', error);
            const message = String(error?.message || error || '');
            if (message.includes('permission_denied')) {
                alert(`요청 취소 권한 확인에 실패했습니다.\n\n${CANCELABLE_STATUS_TEXT} 상태라면 잠시 후 다시 시도해 주세요.`);
                await loadDataDeleteRequests();
                return;
            }
            alert('요청 취소 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        }
    }

    function hmIsActiveAdminProfile(profile) {
        return profile === true || Boolean(profile && typeof profile === 'object' && (
            profile.active === true || profile.enabled === true || profile.role === 'admin'
        ));
    }

    async function hmRefreshDataAdminAccess() {
        const user = getUser();
        const button = document.getElementById('dataAdminButton');
        const consoleButton = document.getElementById('adminConsoleButton');
        hmDataAdmin = false;
        if (button) button.hidden = true;
        if (consoleButton) consoleButton.hidden = true;
        if (!user) return false;
        try {
            const snap = await db.ref(`admins/${user.uid}`).once('value');
            hmDataAdmin = hmIsActiveAdminProfile(snap.val());
            if (button) button.hidden = !hmDataAdmin;
            if (consoleButton) consoleButton.hidden = !hmDataAdmin;
            return hmDataAdmin;
        } catch (error) { console.warn('[DataAdmin] access check failed', error); return false; }
    }

    async function hmOpenAdminConsoleApp() {
        try {
            await hmRefreshDataAdminAccess();
        } catch (error) {
            console.warn('[Admin Console] access refresh before launch failed', error);
        }
        const user = getUser();
        try {
            if (user) sessionStorage.setItem('hmAdminLaunch', JSON.stringify({ uid: user.uid, at: Date.now() }));
        } catch (error) {
            console.warn('[Admin Console] launcher marker failed', error);
        }
        window.location.assign('admin.html');
    }
    async function openDataAdminModal() {
        if (!await hmRefreshDataAdminAccess()) return alert('관리자 권한이 없습니다.');
        const modal = document.getElementById('dataAdminOverlay'); if (!modal) return;
        modal.removeAttribute('inert');
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        await loadDataAdminRequests();
        const closeButton = modal.querySelector('.modal-close-btn');
        if (closeButton) closeButton.focus({ preventScroll: true });
    }
    function closeDataAdminModal() {
        const modal = document.getElementById('dataAdminOverlay');
        if (!modal) return;
        const focused = document.activeElement;
        if (focused && modal.contains(focused) && typeof focused.blur === 'function') focused.blur();
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', '');
        const trigger = document.getElementById('dataAdminButton');
        if (trigger && !trigger.hidden) window.setTimeout(() => trigger.focus({ preventScroll: true }), 0);
    }
    function setDataAdminFilter(filter) {
        hmAdminFilter = filter === 'all' ? 'all' : 'open';
        document.querySelectorAll('[data-admin-filter]').forEach((b) => b.classList.toggle('active', b.dataset.adminFilter === hmAdminFilter));
        renderDataAdminRequests();
    }
    async function loadDataAdminRequests() {
        const list = document.getElementById('dataAdminRequestList'); if (!list || !hmDataAdmin) return;
        list.innerHTML = '<div class="data-empty-state">삭제 요청을 불러오는 중입니다.</div>';
        try {
            const [requestSnap, noteSnap] = await Promise.all([
                db.ref('dataDeleteRequests').once('value'),
                db.ref('dataDeleteRequestAdminNotes').once('value')
            ]);
            const root = requestSnap.val() || {};
            hmAdminNotes = noteSnap.val() || {};
            hmAdminRequests = [];
            Object.entries(root).forEach(([uid, requests]) => Object.entries(requests || {}).forEach(([id, item]) => hmAdminRequests.push({ id, ownerUid: uid, ...(item || {}) })));
            hmAdminRequests.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0)); renderDataAdminRequests();
        } catch (error) { console.warn('[DataAdmin] load failed', error); list.innerHTML = '<div class="data-empty-state error">관리 요청을 불러오지 못했습니다. 관리자 Rules를 확인해 주세요.</div>'; }
    }
    function renderDataAdminRequests() {
        const list = document.getElementById('dataAdminRequestList'); const summary = document.getElementById('dataAdminSummary'); if (!list) return;
        const open = hmAdminRequests.filter((r) => OPEN_STATUSES.includes(r.status || 'pending'));
        if (summary) summary.innerHTML = `<strong>전체 ${hmAdminRequests.length}건</strong><span>처리 필요 ${open.length}건</span>`;
        const items = hmAdminFilter === 'all' ? hmAdminRequests : open;
        list.innerHTML = items.length ? items.map(renderDataAdminCard).join('') : '<div class="data-empty-state">표시할 요청이 없습니다.</div>';
    }
    function renderDisconnectExecution(item) {
        if ((item.status || '') !== 'approved' || item.requestType !== 'leave_room') return '';
        return `<section class="data-admin-execution" aria-label="승인된 Room 연결 해제 실행">
            <strong>최종 Room 연결 해제</strong>
            <p>공동 Room 기록은 보존하고, 요청자의 Room 연결 정보만 제거합니다.</p>
            <button type="button" class="data-admin-execute" onclick="executeApprovedRoomDisconnect('${escapeJs(item.ownerUid)}','${escapeJs(item.id)}')">최종 연결 해제 실행</button>
        </section>`;
    }

    function renderDataAdminCard(item) {
        const type = REQUEST_TYPES[item.requestType] || { label: item.requestTypeLabel || '데이터 요청' };
        const status = item.status || 'pending';
        const note = hmAdminNotes?.[item.ownerUid]?.[item.id]?.memo || '';
        const actionButton = (value, label) => `<button class="${status === value ? `is-selected status-${value}` : ''}" onclick="processDataAdminRequest('${escapeJs(item.ownerUid)}','${escapeJs(item.id)}','${value}')" aria-pressed="${status === value ? 'true' : 'false'}">${label}</button>`;
        return `<article class="data-admin-card"><div class="data-request-head"><strong>${escapeHtml(STATUS_LABELS[status] || status)}</strong><small>${escapeHtml(formatDate(item.requestedAt))}</small></div><h3>${escapeHtml(type.label)}</h3><dl><div><dt>사용자</dt><dd>${escapeHtml(item.requestedByEmail || item.requestedByUid || '-')}</dd></div><div><dt>Room</dt><dd>${escapeHtml(item.roomCode || '-')}</dd></div></dl><div class="data-admin-reason"><strong>요청 사유</strong><p>${escapeHtml(item.reason || '-')}</p></div><label>사용자에게 전달할 답변<textarea id="adminMessage_${escapeHtml(item.id)}" rows="3">${escapeHtml(item.adminMessage || '')}</textarea></label><label>관리자 내부 메모<textarea id="adminMemo_${escapeHtml(item.id)}" rows="2" placeholder="사용자에게 보이지 않습니다.">${escapeHtml(note)}</textarea></label><button type="button" class="data-admin-memo-save" onclick="saveDataAdminMemo('${escapeJs(item.ownerUid)}','${escapeJs(item.id)}')">관리자 메모 저장</button><div class="data-admin-actions">${actionButton('reviewing','검토 중')}${actionButton('hold','보류')}${actionButton('approved','승인')}${actionButton('rejected','거절')}</div>${renderDisconnectExecution(item)}</article>`;
    }

    async function saveDataAdminMemo(uid, requestId) {
        if (!hmDataAdmin || !uid || !requestId) return;
        const memo = (document.getElementById(`adminMemo_${requestId}`)?.value || '').trim();
        try {
            const noteRef = db.ref(adminNotePath(uid, requestId));
            if (memo) {
                await noteRef.set({ memo, updatedByUid: getUser().uid, updatedAt: firebase.database.ServerValue.TIMESTAMP });
            } else {
                await noteRef.remove();
            }
            showToastSafe(memo ? '관리자 메모가 저장되었습니다.' : '관리자 메모가 삭제되었습니다.');
            hmAdminNotes[uid] = hmAdminNotes[uid] || {};
            if (memo) hmAdminNotes[uid][requestId] = { memo };
            else delete hmAdminNotes[uid][requestId];
        } catch (error) {
            console.warn('[DataAdmin] memo save failed', error);
            alert('관리자 메모 저장에 실패했습니다. Firebase Rules를 확인해 주세요.');
        }
    }

    async function processDataAdminRequest(uid, requestId, status) {
        if (!hmDataAdmin || !uid || !requestId) return;
        const message = (document.getElementById(`adminMessage_${requestId}`)?.value || '').trim();
        const memo = (document.getElementById(`adminMemo_${requestId}`)?.value || '').trim();
        if (!message) return alert('사용자에게 전달할 답변을 입력해 주세요.');
        const labels = { reviewing: '검토 중', hold: '보류', approved: '승인', rejected: '거절' };
        if (!confirm(`이 요청을 '${labels[status]}' 상태로 변경할까요?`)) return;
        try {
            const updates = {};
            updates[`${requestItemPath(uid, requestId)}/status`] = status;
            updates[`${requestItemPath(uid, requestId)}/adminMessage`] = message;
            updates[`${requestItemPath(uid, requestId)}/reviewedByUid`] = getUser().uid;
            updates[`${requestItemPath(uid, requestId)}/reviewedAt`] = firebase.database.ServerValue.TIMESTAMP;
            updates[`${requestItemPath(uid, requestId)}/updatedAt`] = firebase.database.ServerValue.TIMESTAMP;
            if (memo) updates[adminNotePath(uid, requestId)] = { memo, updatedByUid: getUser().uid, updatedAt: firebase.database.ServerValue.TIMESTAMP };
            else updates[adminNotePath(uid, requestId)] = null;
            await db.ref().update(updates); showToastSafe(`요청이 ${labels[status]} 상태로 변경되었습니다.`); await loadDataAdminRequests();
        } catch (error) { console.warn('[DataAdmin] update failed', error); alert('관리자 처리 저장에 실패했습니다. Firebase Rules를 확인해 주세요.'); }
    }

    async function executeApprovedRoomDisconnect(uid, requestId) {
        if (!hmDataAdmin || !uid || !requestId) return;
        const item = hmAdminRequests.find((request) => request.ownerUid === uid && request.id === requestId);
        if (!item || item.status !== 'approved' || item.requestType !== 'leave_room') {
            return alert('승인된 Room 연결 해제 요청만 실행할 수 있습니다.');
        }
        const typed = window.prompt(`Room ${item.roomCode || '-'} 연결을 최종 해제합니다.\n공동 기록은 보존됩니다.\n계속하려면 DISCONNECT를 입력하세요.`);
        if (typed !== 'DISCONNECT') {
            if (typed !== null) alert('확인 문구가 일치하지 않아 실행하지 않았습니다.');
            return;
        }
        const button = document.activeElement;
        if (button && button.tagName === 'BUTTON') button.disabled = true;
        try {
            if (!firebase.functions) throw new Error('Firebase Functions SDK가 로드되지 않았습니다.');
            const callable = firebase.app().functions('us-central1').httpsCallable('executeApprovedRoomDisconnect');
            const result = await callable({ targetUid: uid, requestId });
            if (!result?.data?.ok) throw new Error('서버에서 완료 결과를 받지 못했습니다.');
            showToastSafe('Room 연결 해제가 완료되었습니다.');
            await loadDataAdminRequests();
        } catch (error) {
            console.warn('[DataAdmin] room disconnect failed', error);
            const message = error?.message || '알 수 없는 오류';
            alert(`Room 연결 해제에 실패했습니다.\n${message}`);
        } finally {
            if (button && button.tagName === 'BUTTON') button.disabled = false;
        }
    }

    window.openDataManagementModal = openDataManagementModal;
    window.closeDataManagementModal = closeDataManagementModal;
    window.selectDataManagementTab = selectDataManagementTab;
    window.updateDeleteRequestTypeNotice = updateDeleteRequestTypeNotice;
    window.submitDataDeleteRequest = submitDataDeleteRequest;
    window.loadDataDeleteRequests = loadDataDeleteRequests;
    window.cancelDataDeleteRequest = cancelDataDeleteRequest;
    window.hmRefreshDataAdminAccess = hmRefreshDataAdminAccess;
    window.hmOpenAdminConsoleApp = hmOpenAdminConsoleApp;
    window.openDataAdminModal = openDataAdminModal;
    window.closeDataAdminModal = closeDataAdminModal;
    window.setDataAdminFilter = setDataAdminFilter;
    window.saveDataAdminMemo = saveDataAdminMemo;
    window.processDataAdminRequest = processDataAdminRequest;
    window.executeApprovedRoomDisconnect = executeApprovedRoomDisconnect;
})();
