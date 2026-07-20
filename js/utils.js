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

// Escape a value embedded in a single-quoted JavaScript string inside HTML.
function hmEscapeInlineJs(text) {
        return String(text || '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
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
function copyToClipboard() {
        const resultBox = document.getElementById('resultBox');
        const text = resultBox ? resultBox.value : '';

        if (!text) {
            alert('복사할 기록 결과가 없습니다.');
            return;
        }

        executeCopy(text, () => {
            // 복사 완료 안내가 사용자에게 보인 뒤 결과 패널만 닫는다.
            // 다른 기록/기념일/방 모달의 닫기 상태에는 영향을 주지 않는다.
            window.setTimeout(() => {
                const resultContainer = document.getElementById('resultContainer');
                if (resultContainer) resultContainer.style.display = 'none';
            }, 700);
        });
    }

// ---------------------------------------------------------
// executeCopy
// ---------------------------------------------------------
function executeCopy(text, onSuccess) {
        const handleSuccess = () => {
            showToast();
            if (typeof onSuccess === 'function') onSuccess();
        };

        const fallbackCopy = () => {
            const tempBox = document.createElement('textarea');
            tempBox.value = text;
            tempBox.setAttribute('readonly', '');
            tempBox.style.position = 'fixed';
            tempBox.style.opacity = '0';
            document.body.appendChild(tempBox);
            tempBox.select();
            tempBox.setSelectionRange(0, tempBox.value.length);

            let copied = false;
            try {
                copied = document.execCommand('copy');
            } finally {
                document.body.removeChild(tempBox);
            }

            if (!copied) throw new Error('clipboard fallback failed');
            handleSuccess();
        };

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            return navigator.clipboard.writeText(text)
                .then(handleSuccess)
                .catch(() => fallbackCopy());
        }

        try {
            fallbackCopy();
            return Promise.resolve();
        } catch (error) {
            alert('결과를 복사하지 못했습니다. 다시 시도해 주세요.');
            return Promise.reject(error);
        }
    }

// ---------------------------------------------------------
// showToast
// ---------------------------------------------------------
function showToast(message) {
        const toast = document.getElementById('toast');
        if (!toast) return;
        if (!toast.dataset.defaultText) toast.dataset.defaultText = toast.textContent || '알림';
        toast.textContent = message || toast.dataset.defaultText;
        toast.style.display = 'block';
        clearTimeout(toast._hmToastTimer);
        toast._hmToastTimer = setTimeout(() => {
            toast.style.display = 'none';
            toast.textContent = toast.dataset.defaultText;
        }, 2000);
    }
