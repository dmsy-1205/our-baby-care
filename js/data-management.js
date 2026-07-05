// =========================================================
// HearMe2nite v1.1 STEP1 - User Data Rights
// Data Management Center / Delete Request Only
// IMPORTANT: This module does NOT delete server data.
// - User can submit a delete request.
// - User can view request status and admin message.
// - Admin approval / actual deletion will be handled in HearU2nite Platform later.
// =========================================================
(function () {
    const STATUS_LABELS = {
        pending: '🟡 검토 중',
        approved: '🟢 승인',
        hold: '🟠 보류',
        rejected: '🟠 보류',
        canceled: '⚪ 취소됨',
        scheduled: '🔵 삭제 예정',
        completed: '✅ 삭제 완료'
    };

    function getRoomCode() {
        try {
            if (typeof getRoomCodeForData === 'function') return getRoomCodeForData();
        } catch (e) {}
        try { return activeRoomCode || ''; } catch (e) { return ''; }
    }

    function getUser() {
        try { return currentUser || null; } catch (e) { return null; }
    }

    function requestPath(roomCode) {
        return `rooms/${roomCode}/dataManagement/deleteRequests`;
    }

    function formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('ko-KR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function showToastSafe(message) {
        if (typeof showToast === 'function') {
            showToast(message);
        } else {
            alert(message);
        }
    }

    function setStatusMessage(message, isError) {
        const el = document.getElementById('dataRequestStatusMessage');
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('error', !!isError);
        el.classList.toggle('ok', !!message && !isError);
    }

    function openDataManagementModal() {
        const modal = document.getElementById('dataManagementOverlay');
        if (!modal) return;
        modal.classList.add('show');
        selectDataManagementTab('request');
        loadDataDeleteRequests();
    }

    function closeDataManagementModal() {
        const modal = document.getElementById('dataManagementOverlay');
        if (modal) modal.classList.remove('show');
    }

    function selectDataManagementTab(tabName) {
        const root = document.getElementById('dataManagementOverlay');
        if (!root) return;
        root.querySelectorAll('[data-data-tab]').forEach((tab) => {
            const active = tab.dataset.dataTab === tabName;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        root.querySelectorAll('[data-data-panel]').forEach((panel) => {
            const active = panel.dataset.dataPanel === tabName;
            panel.classList.toggle('active', active);
            panel.hidden = !active;
        });
        if (tabName === 'history') loadDataDeleteRequests();
    }

    async function getMyRequests(roomCode, uid) {
        const snap = await db.ref(requestPath(roomCode)).once('value');
        const data = snap.val() || {};
        return Object.entries(data)
            .map(([id, item]) => ({ id, ...(item || {}) }))
            .filter((item) => item.requestedByUid === uid)
            .sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
    }

    async function submitDataDeleteRequest() {
        const user = getUser();
        const roomCode = getRoomCode();
        const reasonEl = document.getElementById('deleteRequestReason');
        const confirmEl = document.getElementById('deleteRequestConfirm');
        const reason = (reasonEl?.value || '').trim();

        setStatusMessage('', false);

        if (!user) {
            setStatusMessage('먼저 로그인해 주세요.', true);
            return;
        }
        if (!roomCode) {
            setStatusMessage('먼저 우리의 공간에 연결해 주세요.', true);
            return;
        }
        if (reason.length < 10) {
            setStatusMessage('삭제 요청 사유를 10자 이상 작성해 주세요.', true);
            return;
        }
        if (!confirmEl?.checked) {
            setStatusMessage('삭제 요청 전 확인 문구에 체크해 주세요.', true);
            return;
        }

        try {
            const myRequests = await getMyRequests(roomCode, user.uid);
            const hasOpenRequest = myRequests.some((item) => ['pending', 'approved', 'scheduled'].includes(item.status));
            if (hasOpenRequest) {
                setStatusMessage('이미 검토 중이거나 승인된 삭제 요청이 있습니다. 요청 내역을 확인해 주세요.', true);
                selectDataManagementTab('history');
                return;
            }

            const ref = db.ref(requestPath(roomCode)).push();
            const now = firebase.database.ServerValue.TIMESTAMP;
            await ref.set({
                requestId: ref.key,
                roomCode,
                requestedByUid: user.uid,
                requestedByEmail: (user.email || '').toLowerCase(),
                reason,
                status: 'pending',
                adminMessage: '삭제 요청이 접수되었습니다. 관리자가 검토 중입니다.',
                internalMemo: '',
                requestedAt: now,
                updatedAt: now,
                source: 'hearme2nite-user-app',
                version: 'v1.1-step1-data-management-request-only'
            });

            if (reasonEl) reasonEl.value = '';
            if (confirmEl) confirmEl.checked = false;
            setStatusMessage('삭제 요청이 접수되었습니다. 요청 내역에서 상태를 확인할 수 있습니다.', false);
            showToastSafe('삭제 요청이 접수되었습니다.');
            selectDataManagementTab('history');
            await loadDataDeleteRequests();
        } catch (error) {
            console.warn('[DataManagement] delete request failed', error);
            setStatusMessage('삭제 요청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', true);
        }
    }

    async function loadDataDeleteRequests() {
        const list = document.getElementById('dataDeleteRequestList');
        if (!list) return;
        const user = getUser();
        const roomCode = getRoomCode();
        if (!user || !roomCode) {
            list.innerHTML = '<div class="data-empty-state">로그인 후 우리의 공간에 연결하면 요청 내역을 확인할 수 있습니다.</div>';
            return;
        }

        list.innerHTML = '<div class="data-empty-state">요청 내역을 불러오는 중입니다.</div>';
        try {
            const requests = await getMyRequests(roomCode, user.uid);
            if (!requests.length) {
                list.innerHTML = '<div class="data-empty-state">아직 삭제 요청 내역이 없습니다.</div>';
                return;
            }
            list.innerHTML = requests.map(renderRequestCard).join('');
        } catch (error) {
            console.warn('[DataManagement] load requests failed', error);
            list.innerHTML = '<div class="data-empty-state error">요청 내역을 불러오지 못했습니다.</div>';
        }
    }

    function renderRequestCard(item) {
        const status = item.status || 'pending';
        const statusLabel = STATUS_LABELS[status] || status;
        const adminMessage = item.adminMessage || '관리자 답변을 기다리는 중입니다.';
        const scheduled = item.scheduledDeleteAt ? `<div><strong>삭제 예정일</strong><span>${escapeHtml(formatDate(item.scheduledDeleteAt))}</span></div>` : '';
        const cancelButton = status === 'pending'
            ? `<button type="button" class="data-small-action" onclick="cancelDataDeleteRequest('${escapeJs(item.id)}')">요청 취소</button>`
            : '';
        return `
            <article class="data-request-card">
                <div class="data-request-head">
                    <strong>${escapeHtml(statusLabel)}</strong>
                    <small>${escapeHtml(formatDate(item.requestedAt))}</small>
                </div>
                <div class="data-request-body">
                    <div><strong>요청 사유</strong><p>${escapeHtml(item.reason || '-')}</p></div>
                    <div><strong>관리자 답변</strong><p>${escapeHtml(adminMessage)}</p></div>
                    ${scheduled}
                </div>
                ${cancelButton}
            </article>`;
    }

    async function cancelDataDeleteRequest(requestId) {
        const user = getUser();
        const roomCode = getRoomCode();
        if (!user || !roomCode || !requestId) return;
        const ok = confirm('검토 중인 삭제 요청을 취소할까요?');
        if (!ok) return;
        try {
            const ref = db.ref(`${requestPath(roomCode)}/${requestId}`);
            const snap = await ref.once('value');
            const item = snap.val();
            if (!item || item.requestedByUid !== user.uid || item.status !== 'pending') {
                alert('취소할 수 없는 요청입니다.');
                return;
            }
            await ref.update({
                status: 'canceled',
                adminMessage: '사용자가 삭제 요청을 취소했습니다.',
                canceledAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            showToastSafe('삭제 요청이 취소되었습니다.');
            await loadDataDeleteRequests();
        } catch (error) {
            console.warn('[DataManagement] cancel request failed', error);
            alert('요청 취소 중 오류가 발생했습니다.');
        }
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeJs(str) {
        return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    window.openDataManagementModal = openDataManagementModal;
    window.closeDataManagementModal = closeDataManagementModal;
    window.selectDataManagementTab = selectDataManagementTab;
    window.submitDataDeleteRequest = submitDataDeleteRequest;
    window.loadDataDeleteRequests = loadDataDeleteRequests;
    window.cancelDataDeleteRequest = cancelDataDeleteRequest;
})();
