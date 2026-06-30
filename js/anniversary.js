// =========================================================
// HearMe2nite RC2.10.3 SAFE
// anniversary.js - Anniversary Settings Popup
// - RC2.9.1 정상 History 로딩 구조 보존
// - rooms/{roomCode}/days 경로 변경 없음
// - 기념일 저장 위치: rooms/{roomCode}/meta/firstMetDate, rooms/{roomCode}/meta/anniversaries
// =========================================================

let hmAnniversaryState = {
    firstMetDate: '',
    anniversaries: {},
    isLoaded: false,
    isModalOpen: false
};

const HM_ANNIVERSARY_TYPES = [
    { value: 'love', icon: '💕', label: '기념일' },
    { value: 'birthday', icon: '🎂', label: '생일' },
    { value: 'travel', icon: '✈️', label: '여행' },
    { value: 'promise', icon: '💍', label: '약속' },
    { value: 'date', icon: '🌙', label: '데이트' },
    { value: 'special', icon: '🎁', label: '특별한 날' }
];

function hmFormatKoreanDate(ymd) {
    if (!ymd || typeof ymd !== 'string') return '-';
    const parts = ymd.split('-');
    return parts.length === 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : ymd;
}

function hmDateFromYmd(ymd) {
    if (!ymd) return null;
    const date = new Date(`${ymd}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function hmYmdFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function hmCalculateDday(firstMetDate, targetDate) {
    const start = hmDateFromYmd(firstMetDate);
    const target = hmDateFromYmd(targetDate);
    if (!start || !target) return null;
    const diff = Math.floor((target.getTime() - start.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : null;
}

function hmMilestoneDate(firstMetDate, milestone) {
    const start = hmDateFromYmd(firstMetDate);
    if (!start) return '';
    const date = new Date(start);
    date.setDate(date.getDate() + milestone - 1);
    return hmYmdFromDate(date);
}

function hmGetTodayYmd() { return hmYmdFromDate(new Date()); }

function hmGetSelectedHistoryDateSafe() {
    try { if (typeof selectedHistoryDate !== 'undefined' && selectedHistoryDate) return selectedHistoryDate; } catch (err) {}
    const recordDate = document.getElementById('recordDate')?.value;
    return recordDate || hmGetTodayYmd();
}

function hmGetAnniversaryTypeMeta(type) {
    return HM_ANNIVERSARY_TYPES.find(item => item.value === type) || HM_ANNIVERSARY_TYPES[0];
}

function hmGetAnniversaryList() {
    return Object.entries(hmAnniversaryState.anniversaries || {})
        .map(([id, item]) => ({ id, ...(item || {}) }))
        .filter(item => item.date && item.title)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function hmCreateAnniversaryId() {
    return `anniv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function hmCanUseAnniversaryData() {
    const roomCode = typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : '';
    return !!(roomCode && currentUser && db);
}

async function hmLoadAnniversarySettings() {
    const roomCode = typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : '';
    if (!roomCode || !currentUser || !db) return;
    try {
        const snap = await db.ref(`rooms/${roomCode}/meta`).once('value');
        const meta = snap.val() || {};
        hmAnniversaryState.firstMetDate = meta.firstMetDate || '';
        hmAnniversaryState.anniversaries = meta.anniversaries || {};
        hmAnniversaryState.isLoaded = true;
    } catch (err) {
        hmAnniversaryState.isLoaded = true;
        if (typeof hmReportError === 'function') hmReportError('hmLoadAnniversarySettings', err, '기념일 정보를 불러오지 못했습니다.');
    }
}

async function hmSaveFirstMetDate() {
    const input = document.getElementById('firstMetDateInput');
    const firstMetDate = input ? input.value : '';
    if (!firstMetDate) { alert('처음 만난 날을 선택해 주세요.'); return; }
    const roomCode = typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : '';
    if (!roomCode) { alert('공간을 먼저 연결해 주세요.'); return; }
    try {
        if (typeof hmRequireRoomAccess === 'function') {
            const ok = await hmRequireRoomAccess('처음 만난 날 저장', roomCode);
            if (!ok) return;
        }
        await db.ref(`rooms/${roomCode}/meta/firstMetDate`).set(firstMetDate);
        hmAnniversaryState.firstMetDate = firstMetDate;
        if (typeof showToast === 'function') showToast('처음 만난 날이 저장되었습니다. 💕');
        hmRenderAnniversaryPanel();
        hmRenderAnniversaryModal();
    } catch (err) {
        if (typeof hmReportError === 'function') hmReportError('hmSaveFirstMetDate', err, '처음 만난 날 저장 실패');
        else alert('저장 중 오류가 발생했습니다.');
    }
}

async function hmAddCustomAnniversary() {
    const dateInput = document.getElementById('customAnniversaryDate');
    const titleInput = document.getElementById('customAnniversaryTitle');
    const typeInput = document.getElementById('customAnniversaryType');
    const date = dateInput ? dateInput.value : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const type = typeInput ? typeInput.value : 'love';
    if (!date) { alert('기념일 날짜를 선택해 주세요.'); return; }
    if (!title) { alert('기념일 이름을 입력해 주세요.'); return; }
    const roomCode = typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : '';
    if (!roomCode) { alert('공간을 먼저 연결해 주세요.'); return; }
    try {
        if (typeof hmRequireRoomAccess === 'function') {
            const ok = await hmRequireRoomAccess('기념일 추가', roomCode);
            if (!ok) return;
        }
        const id = hmCreateAnniversaryId();
        const item = { date, title, type, createdAt: Date.now(), createdBy: currentUser?.uid || '' };
        await db.ref(`rooms/${roomCode}/meta/anniversaries/${id}`).set(item);
        hmAnniversaryState.anniversaries = { ...(hmAnniversaryState.anniversaries || {}), [id]: item };
        if (dateInput) dateInput.value = '';
        if (titleInput) titleInput.value = '';
        if (typeof showToast === 'function') showToast('기념일이 추가되었습니다. 🎉');
        hmRenderAnniversaryPanel();
        hmRenderAnniversaryModal();
    } catch (err) {
        if (typeof hmReportError === 'function') hmReportError('hmAddCustomAnniversary', err, '기념일 추가 실패');
        else alert('기념일 추가 중 오류가 발생했습니다.');
    }
}

async function hmDeleteCustomAnniversary(id) {
    if (!id) return;
    const okConfirm = confirm('이 기념일을 삭제할까요?');
    if (!okConfirm) return;
    const roomCode = typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : '';
    if (!roomCode) { alert('공간을 먼저 연결해 주세요.'); return; }
    try {
        if (typeof hmRequireRoomAccess === 'function') {
            const ok = await hmRequireRoomAccess('기념일 삭제', roomCode);
            if (!ok) return;
        }
        await db.ref(`rooms/${roomCode}/meta/anniversaries/${id}`).remove();
        if (hmAnniversaryState.anniversaries) delete hmAnniversaryState.anniversaries[id];
        if (typeof showToast === 'function') showToast('기념일이 삭제되었습니다.');
        hmRenderAnniversaryPanel();
        hmRenderAnniversaryModal();
    } catch (err) {
        if (typeof hmReportError === 'function') hmReportError('hmDeleteCustomAnniversary', err, '기념일 삭제 실패');
        else alert('삭제 중 오류가 발생했습니다.');
    }
}

function hmOpenAnniversarySettings() {
    hmAnniversaryState.isModalOpen = true;
    hmEnsureAnniversaryModal();
    hmRenderAnniversaryModal();
    const overlay = document.getElementById('anniversarySettingsOverlay');
    if (overlay) overlay.style.display = 'flex';
    try { document.body.classList.add('modal-open'); } catch (err) {}
}

function hmCloseAnniversarySettings() {
    hmAnniversaryState.isModalOpen = false;
    const overlay = document.getElementById('anniversarySettingsOverlay');
    if (overlay) overlay.style.display = 'none';
    try { document.body.classList.remove('modal-open'); } catch (err) {}
}

function hmEnsureAnniversaryModal() {
    if (document.getElementById('anniversarySettingsOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'anniversarySettingsOverlay';
    overlay.className = 'anniversary-settings-overlay';
    overlay.innerHTML = '<div class="anniversary-settings-modal" id="anniversarySettingsModal"></div>';
    overlay.addEventListener('click', function(event) {
        if (event.target === overlay) hmCloseAnniversarySettings();
    });
    document.body.appendChild(overlay);
}

function hmRenderAnniversaryModal() {
    hmEnsureAnniversaryModal();
    const modal = document.getElementById('anniversarySettingsModal');
    if (!modal) return;
    const firstMetDate = hmAnniversaryState.firstMetDate || '';
    const list = hmGetAnniversaryList();
    const typeOptions = HM_ANNIVERSARY_TYPES.map(item => `<option value="${escapeHtml(item.value)}">${item.icon} ${escapeHtml(item.label)}</option>`).join('');
    const listHtml = list.length ? list.map(item => {
        const meta = hmGetAnniversaryTypeMeta(item.type);
        return `<div class="anniversary-custom-item">
            <div class="anniversary-custom-icon">${meta.icon}</div>
            <div>
                <div class="anniversary-custom-title">${escapeHtml(item.title)}</div>
                <div class="anniversary-custom-date">${hmFormatKoreanDate(item.date)} · ${escapeHtml(meta.label)}</div>
            </div>
            <button type="button" class="anniversary-delete-btn" onclick="hmDeleteCustomAnniversary('${escapeHtml(item.id)}')">삭제</button>
        </div>`;
    }).join('') : '<div class="anniversary-empty-note">아직 직접 등록한 기념일이 없습니다. 생일, 첫 여행, 약속한 날처럼 둘만의 날짜를 추가해 보세요.</div>';

    modal.innerHTML = `
        <div class="anniversary-settings-head">
            <div>
                <div class="anniversary-settings-kicker">MEMORY SETTINGS</div>
                <h2>💕 우리의 기념일 설정</h2>
            </div>
            <button type="button" class="anniversary-modal-close" onclick="hmCloseAnniversarySettings()">닫기</button>
        </div>
        <div class="anniversary-settings-section">
            <div class="anniversary-settings-title">처음 만난 날</div>
            <div class="anniversary-settings-help">이 날짜를 기준으로 D+100, D+200 같은 기념일이 자동 계산됩니다.</div>
            <div class="anniversary-settings-row">
                <input type="date" id="firstMetDateInput" value="${escapeHtml(firstMetDate)}" aria-label="처음 만난 날">
                <button type="button" class="anniversary-primary-btn" onclick="hmSaveFirstMetDate()">저장</button>
            </div>
        </div>
        <div class="anniversary-settings-section">
            <div class="anniversary-settings-title">둘만의 기념일 추가</div>
            <div class="anniversary-settings-help">생일, 여행, 약속한 날처럼 캘린더에 함께 기억할 날짜를 추가할 수 있습니다.</div>
            <div class="anniversary-add-grid">
                <input type="date" id="customAnniversaryDate" aria-label="기념일 날짜">
                <input type="text" id="customAnniversaryTitle" placeholder="예: 200일 여행, 생일, 첫 만남 장소" aria-label="기념일 이름">
                <select id="customAnniversaryType" aria-label="기념일 종류">${typeOptions}</select>
                <button type="button" class="anniversary-primary-btn" onclick="hmAddCustomAnniversary()">추가</button>
            </div>
        </div>
        <div class="anniversary-settings-section">
            <div class="anniversary-settings-title">등록된 기념일</div>
            <div class="anniversary-custom-list">${listHtml}</div>
        </div>`;
}

function hmRenderAnniversaryPanel() {
    const box = document.getElementById('anniversaryPanel');
    if (!box) return;
    const firstMetDate = hmAnniversaryState.firstMetDate || '';
    const selectedDate = hmGetSelectedHistoryDateSafe();
    const selectedDday = firstMetDate ? hmCalculateDday(firstMetDate, selectedDate) : null;
    const todayDday = firstMetDate ? hmCalculateDday(firstMetDate, hmGetTodayYmd()) : null;
    const customCount = hmGetAnniversaryList().length;
    const milestones = [100, 200, 300, 365, 500, 700, 1000];
    const nextMilestone = firstMetDate ? milestones
        .map(day => ({ day, date: hmMilestoneDate(firstMetDate, day) }))
        .find(item => item.date >= hmGetTodayYmd()) : null;
    const selectedNote = firstMetDate && selectedDday ? `<div class="anniversary-selected-note">📅 선택한 날짜 <strong>${hmFormatKoreanDate(selectedDate)}</strong>는 만난 지 <strong>D+${selectedDday}</strong>입니다.</div>` : '';
    const summaryText = firstMetDate
        ? `처음 만난 날: ${hmFormatKoreanDate(firstMetDate)}${nextMilestone ? ` · 다음 D+${nextMilestone.day}: ${hmFormatKoreanDate(nextMilestone.date)}` : ''}`
        : '처음 만난 날을 설정하면 D+가 자동 계산됩니다.';
    const todayBox = firstMetDate
        ? `<div class="anniversary-today compact"><span class="anniversary-icon">🎉</span><span><div class="anniversary-main">오늘은 만난 지 D+${todayDday}</div><div class="anniversary-caption">직접 등록한 기념일 ${customCount}개</div></span></div>`
        : `<div class="anniversary-today compact"><span class="anniversary-icon">💕</span><span><div class="anniversary-main">처음 만난 날을 설정해 주세요</div><div class="anniversary-caption">설정 버튼에서 기념일 종류도 함께 관리할 수 있어요.</div></span></div>`;
    box.innerHTML = `<div class="anniversary-card anniversary-card-compact">
        <div class="anniversary-head">
            <div>
                <div class="anniversary-title">💕 우리의 기념일</div>
                <div class="anniversary-sub">${escapeHtml(summaryText)}</div>
            </div>
            <button type="button" class="anniversary-toggle-btn" onclick="hmOpenAnniversarySettings()">설정</button>
        </div>
        ${selectedNote}${todayBox}
    </div>`;
}

async function hmRefreshAnniversaryPanel() {
    await hmLoadAnniversarySettings();
    hmRenderAnniversaryPanel();
}

(function hmInstallAnniversarySafeHooks(){
    const originalOpenHistoryPanelModal = window.openHistoryPanelModal;
    if (typeof originalOpenHistoryPanelModal === 'function') {
        window.openHistoryPanelModal = function() { originalOpenHistoryPanelModal.apply(this, arguments); hmRefreshAnniversaryPanel(); };
    }
    const originalDisplayHistory = window.displayHistory;
    if (typeof originalDisplayHistory === 'function') {
        window.displayHistory = function(daysData) { originalDisplayHistory.apply(this, arguments); hmRenderAnniversaryPanel(); };
    }
    const originalSelectHistoryDate = window.selectHistoryDate;
    if (typeof originalSelectHistoryDate === 'function') {
        window.selectHistoryDate = function(date) { originalSelectHistoryDate.apply(this, arguments); hmRenderAnniversaryPanel(); };
    }
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && hmAnniversaryState.isModalOpen) hmCloseAnniversarySettings();
    });
})();
