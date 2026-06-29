// =========================================================
// HearMe2nite RC2 v2.8.0 STEP1
// utils.js
// - 여러 모듈에서 공통으로 사용하는 작은 함수 모음
// - UI / Firebase 구조 변경 없음
// =========================================================

// ---------------------------------------------------------
// normalizeEmail
// ---------------------------------------------------------
function normalizeEmail(email) {
        return (email || '').trim().toLowerCase();
    }

// ---------------------------------------------------------
// randomCode
// ---------------------------------------------------------
function randomCode(length = 6) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return Array.from(bytes).map(b => chars[b % chars.length]).join('');
    }

// ---------------------------------------------------------
// randomRoomId
// ---------------------------------------------------------
function randomRoomId() {
        return 'room_' + randomCode(4).toLowerCase() + '_' + Date.now().toString(36) + '_' + randomCode(4).toLowerCase();
    }

// ---------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------
function escapeHtml(text) {
        return String(text || '').replace(/[&<>'"]/g, (ch) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[ch]));
    }

// ---------------------------------------------------------
// hmReportError
// ---------------------------------------------------------
function hmReportError(context, err, userMessage) {
        const detail = err && (err.code || err.message) ? ` (${err.code || err.message})` : '';
        const payload = {
            context,
            code: err && err.code ? err.code : '',
            message: err && err.message ? err.message : String(err || ''),
            at: new Date().toISOString()
        };
        if (window.hmQaState && Array.isArray(window.hmQaState.errors)) {
            window.hmQaState.errors.push(payload);
        }
        console.warn(`[HearMe2nite][${context}]`, err);
        if (userMessage && hmLastErrorMessage !== userMessage) {
            hmLastErrorMessage = userMessage;
            showSaveStatus(userMessage + detail);
            setTimeout(() => { if (hmLastErrorMessage === userMessage) hmLastErrorMessage = ''; }, 2500);
        }
    }

// ---------------------------------------------------------
// hmRequireLoginAndRoom
// ---------------------------------------------------------
function hmRequireLoginAndRoom(actionLabel = '작업') {
        if (!currentUser) { showSaveStatus(`🔒 로그인 후 ${actionLabel}할 수 있습니다.`); return false; }
        if (!getRoomCodeForData()) { showSaveStatus(`🔑 방 연결 후 ${actionLabel}할 수 있습니다.`); return false; }
        return true;
    }

// ---------------------------------------------------------
// hmIsSafeRoomCode
// ---------------------------------------------------------
function hmIsSafeRoomCode(roomCode) {
        return !!roomCode && HM_ROOM_CODE_PATTERN.test(String(roomCode).trim());
    }

// ---------------------------------------------------------
// hmIsFirebasePermissionError
// ---------------------------------------------------------
function hmIsFirebasePermissionError(err) {
        return err && (err.code === 'PERMISSION_DENIED' || String(err.message || '').includes('permission'));
    }

// ---------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------
function formatTimestamp(ts) {
        if (!ts) return '날짜 정보 없음';
        const d = new Date(ts);
        if (Number.isNaN(d.getTime())) return '날짜 정보 없음';
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

// ---------------------------------------------------------
// getTrimmedValue
// ---------------------------------------------------------
function getTrimmedValue(id) {
        return (document.getElementById(id)?.value || '').trim();
    }

// ---------------------------------------------------------
// copyToClipboard
// ---------------------------------------------------------
function copyToClipboard() { executeCopy(document.getElementById('resultBox').value); }

// ---------------------------------------------------------
// executeCopy
// ---------------------------------------------------------
function executeCopy(text) {
        navigator.clipboard.writeText(text).then(() => { showToast(); }).catch(() => {
            const tempBox = document.createElement('textarea');
            tempBox.value = text; document.body.appendChild(tempBox);
            tempBox.select(); document.execCommand('copy');
            document.body.removeChild(tempBox); showToast();
        });
    }

// ---------------------------------------------------------
// showToast
// ---------------------------------------------------------
function showToast() {
        const toast = document.getElementById('toast'); toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }
