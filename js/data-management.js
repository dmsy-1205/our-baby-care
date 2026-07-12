// =========================================================
// HearMe2nite v1.0 STEP5.6.1.5 - User Data Management
// Request intake and status display only. This module never
// deletes Authentication, Realtime Database, or Storage data.
// =========================================================
(function () {
    const STATUS_LABELS = {
        pending: '🟡 접수됨',
        reviewing: '🔎 검토 중',
        approved: '🟢 승인',
        hold: '🟠 보류',
        rejected: '🔴 거절',
        canceled: '⚪ 사용자 취소',
        scheduled: '🔵 삭제 예정',
        completed: '✅ 처리 완료',
        failed: '🔴 처리 실패'
    };

    const REQUEST_TYPES = {
        account: {
            label: '내 계정 및 개인 정보 삭제',
            notice: '계정과 개인 프로필 삭제를 요청합니다. 공동 Room 기록은 상대방의 권리를 위해 별도로 검토됩니다.',
            placeholder: '예: 더 이상 서비스를 사용하지 않아 계정과 개인 정보 삭제를 요청합니다.'
        },
        leave_room: {
            label: '현재 Room 연결 해제',
            notice: '내 계정과 현재 Room의 연결 해제를 요청합니다. Room 기록 자체는 보존됩니다.',
            placeholder: '예: 현재 상대방과의 Room 연결을 종료하고 싶습니다.'
        },
        delete_room: {
            label: 'Room 전체 데이터 삭제',
            notice: '공동 기록 전체 삭제 요청입니다. 상대방 확인과 추가 검토가 필요하며 즉시 삭제되지 않습니다.',
            placeholder: '예: 두 사용자가 합의하여 Room의 모든 공동 기록 삭제를 요청합니다.'
        }
    };

    const OPEN_STATUSES = ['pending', 'reviewing', 'approved', 'hold', 'scheduled'];

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

    function getSelectedRequestType() {
        return document.querySelector('input[name="deleteRequestType"]:checked')?.value || 'account';
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
        if (typeof showToast === 'function') showToast(message);
        else alert(message);
    }

    function setStatusMessage(message, isError) {
        const el = document.getElementById('dataRequestStatusMessage');
        if (!el) return;
        el.textContent = message || '';
        el.classList.toggle('error', !!isError);
        el.classList.toggle('ok', !!message && !isError);
    }

    function updateDeleteRequestTypeNotice() {
        const type = getSelectedRequestType();
        const config = REQUEST_TYPES[type] || REQUEST_TYPES.account;
        const notice = document.getElementById('deleteScopeHelp');
        const reason = document.getElementById('deleteRequestReason');
        if (notice) {
            notice.textContent = config.notice;
            notice.classList.toggle('danger', type === 'delete_room');
        }
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

    function renderCurrentRequestSummary(requests) {
        const summary = document.getElementById('dataCurrentRequestSummary');
        const submitBtn = document.getElementById('deleteRequestSubmitBtn');
        if (!summary) return;
        const active = requests.find((item) => OPEN_STATUSES.includes(item.status || 'pending'));
        if (!active) {
            summary.hidden = true;
            summary.innerHTML = '';
            if (submitBtn) submitBtn.disabled = false;
            return;
        }
        const type = REQUEST_TYPES[active.requestType] || { label: active.requestTypeLabel || '데이터 삭제 요청' };
        const label = STATUS_LABELS[active.status || 'pending'] || active.status;
        summary.hidden = false;
        summary.innerHTML = `
            <div class="data-current-head"><strong>현재 진행 중인 요청</strong><span>${escapeHtml(label)}</span></div>
            <p>${escapeHtml(type.label)}</p>
            <small>접수: ${escapeHtml(formatDate(active.requestedAt))}</small>
            <button type="button" class="data-current-link" onclick="selectDataManagementTab('history')">요청 상세 보기</button>`;
        if (submitBtn) submitBtn.disabled = true;
    }

    async function submitDataDeleteRequest() {
        const user = getUser();
        const roomCode = getRoomCode();
        const reasonEl = document.getElementById('deleteRequestReason');
        const confirmEl = document.getElementById('deleteRequestConfirm');
        const reason = (reasonEl?.value || '').trim();
        const requestType = getSelectedRequestType();
        const requestConfig = REQUEST_TYPES[requestType] || REQUEST_TYPES.account;

        setStatusMessage('', false);

        if (!user) return setStatusMessage('먼저 로그인해 주세요.', true);
        if (!roomCode) return setStatusMessage('먼저 우리의 공간에 연결해 주세요.', true);
        if (reason.length < 10) return setStatusMessage('삭제 요청 사유를 10자 이상 작성해 주세요.', true);
        if (!confirmEl?.checked) return setStatusMessage('삭제 요청 전 확인 문구에 체크해 주세요.', true);

        try {
            const myRequests = await getMyRequests(roomCode, user.uid);
            if (myRequests.some((item) => OPEN_STATUSES.includes(item.status || 'pending'))) {
                setStatusMessage('이미 진행 중인 요청이 있습니다. 요청 내역을 확인해 주세요.', true);
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
                requestType,
                requestTypeLabel: requestConfig.label,
                partnerConsentRequired: requestType === 'delete_room',
                reason,
                status: 'pending',
                adminMessage: '요청이 접수되었습니다. 운영자가 내용을 확인할 예정입니다.',
                internalMemo: '',
                requestedAt: now,
                updatedAt: now,
                source: 'hearme2nite-user-app',
                version: 'v1.0-step5.6.1.5-data-management'
            });

            if (reasonEl) reasonEl.value = '';
            if (confirmEl) confirmEl.checked = false;
            const firstType = document.querySelector('input[name="deleteRequestType"][value="account"]');
            if (firstType) firstType.checked = true;
            updateDeleteRequestTypeNotice();
            setStatusMessage('요청이 접수되었습니다. 요청 내역에서 상태를 확인할 수 있습니다.', false);
            showToastSafe('데이터 처리 요청이 접수되었습니다.');
            selectDataManagementTab('history');
            await loadDataDeleteRequests();
        } catch (error) {
            console.warn('[DataManagement] delete request failed', error);
            setStatusMessage('요청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', true);
        }
    }

    async function loadDataDeleteRequests() {
        const list = document.getElementById('dataDeleteRequestList');
        if (!list) return;
        const user = getUser();
        const roomCode = getRoomCode();
        if (!user || !roomCode) {
            list.innerHTML = '<div class="data-empty-state">로그인 후 우리의 공간에 연결하면 요청 내역을 확인할 수 있습니다.</div>';
            renderCurrentRequestSummary([]);
            return;
        }

        list.innerHTML = '<div class="data-empty-state">요청 내역을 불러오는 중입니다.</div>';
        try {
            const requests = await getMyRequests(roomCode, user.uid);
            renderCurrentRequestSummary(requests);
            if (!requests.length) {
                list.innerHTML = '<div class="data-empty-state">아직 데이터 처리 요청 내역이 없습니다.</div>';
                return;
            }
            list.innerHTML = requests.map(renderRequestCard).join('');
        } catch (error) {
            console.warn('[DataManagement] load requests failed', error);
            renderCurrentRequestSummary([]);
            list.innerHTML = '<div class="data-empty-state error">요청 내역을 불러오지 못했습니다.</div>';
        }
    }

    function renderRequestCard(item) {
        const status = item.status || 'pending';
        const statusLabel = STATUS_LABELS[status] || status;
        const type = REQUEST_TYPES[item.requestType] || { label: item.requestTypeLabel || '기존 삭제 요청' };
        const adminMessage = item.adminMessage || '운영자 답변을 기다리는 중입니다.';
        const scheduled = item.scheduledDeleteAt ? `<div><strong>처리 예정일</strong><span>${escapeHtml(formatDate(item.scheduledDeleteAt))}</span></div>` : '';
        const partnerNotice = item.requestType === 'delete_room' || item.partnerConsentRequired
            ? '<div class="data-shared-notice">공동 Room 전체 삭제 요청 · 상대방 확인이 필요할 수 있습니다.</div>' : '';
        const cancelButton = ['pending', 'reviewing', 'hold'].includes(status)
            ? `<button type="button" class="data-small-action" onclick="cancelDataDeleteRequest('${escapeJs(item.id)}')">요청 취소</button>` : '';
        return `
            <article class="data-request-card">
                <div class="data-request-head">
                    <strong>${escapeHtml(statusLabel)}</strong>
                    <small>${escapeHtml(formatDate(item.requestedAt))}</small>
                </div>
                <div class="data-request-type">${escapeHtml(type.label)}</div>
                ${partnerNotice}
                <div class="data-request-body">
                    <div><strong>요청 사유</strong><p>${escapeHtml(item.reason || '-')}</p></div>
                    <div><strong>운영자 답변</strong><p>${escapeHtml(adminMessage)}</p></div>
                    ${scheduled}
                </div>
                ${cancelButton}
            </article>`;
    }

    async function cancelDataDeleteRequest(requestId) {
        const user = getUser();
        const roomCode = getRoomCode();
        if (!user || !roomCode || !requestId) return;
        if (!confirm('진행 중인 요청을 취소할까요?')) return;
        try {
            const ref = db.ref(`${requestPath(roomCode)}/${requestId}`);
            const snap = await ref.once('value');
            const item = snap.val();
            if (!item || item.requestedByUid !== user.uid || !['pending', 'reviewing', 'hold'].includes(item.status)) {
                alert('현재 상태에서는 취소할 수 없는 요청입니다.');
                return;
            }
            await ref.update({
                status: 'canceled',
                adminMessage: '사용자가 요청을 취소했습니다.',
                canceledAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            showToastSafe('요청이 취소되었습니다.');
            await loadDataDeleteRequests();
        } catch (error) {
            console.warn('[DataManagement] cancel request failed', error);
            alert('요청 취소 중 오류가 발생했습니다.');
        }
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function escapeJs(str) {
        return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    window.openDataManagementModal = openDataManagementModal;
    window.closeDataManagementModal = closeDataManagementModal;
    window.selectDataManagementTab = selectDataManagementTab;
    window.updateDeleteRequestTypeNotice = updateDeleteRequestTypeNotice;
    window.submitDataDeleteRequest = submitDataDeleteRequest;
    window.loadDataDeleteRequests = loadDataDeleteRequests;
    window.cancelDataDeleteRequest = cancelDataDeleteRequest;
})();
