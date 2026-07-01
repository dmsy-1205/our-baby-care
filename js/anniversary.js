// =========================================================
// HearMe2nite RC2.10.12 SAFE
// anniversary.js - Anniversary Calendar Icon Markers
// - RC2.9.1 정상 History 로딩 구조 보존
// - rooms/{roomCode}/days 경로 변경 없음
// - 기념일 저장 위치: rooms/{roomCode}/meta/firstMetDate, rooms/{roomCode}/meta/anniversaries
// - 자동 D+ 기념일은 DB 저장 없이 firstMetDate 기준으로 계산만 수행
// - 기록실 렌더링(displayHistory/renderCalendar)은 수정하지 않고 DOM 후처리로 캘린더 아이콘만 표시
// =========================================================

let hmAnniversaryState = {
    firstMetDate: '',
    anniversaries: {},
    isLoaded: false,
    isModalOpen: false
};

const HM_ANNIVERSARY_TYPES = [
    { value: 'love', icon: '❤️', label: '기념일' },
    { value: 'birthday', icon: '🎂', label: '생일' },
    { value: 'travel', icon: '✈️', label: '여행' },
    { value: 'promise', icon: '💍', label: '약속' },
    { value: 'celebration', icon: '🎉', label: '축하' },
    { value: 'photo', icon: '📷', label: '추억' },
    { value: 'flower', icon: '🌸', label: '기타' }
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
    const legacyMap = { date: { value: 'date', icon: '📷', label: '데이트' }, special: { value: 'special', icon: '🎉', label: '특별한 날' } };
    return HM_ANNIVERSARY_TYPES.find(item => item.value === type) || legacyMap[type] || HM_ANNIVERSARY_TYPES[0];
}

function hmSetCustomAnniversaryType(type) {
    const input = document.getElementById('customAnniversaryType');
    if (input) input.value = type || 'love';
    document.querySelectorAll('.anniversary-type-chip').forEach(function(chip) {
        chip.classList.toggle('is-selected', chip.dataset.type === type);
    });
}


function hmGetAutoMilestones(firstMetDate) {
    const milestones = [100, 200, 300, 365, 500];
    if (!firstMetDate) return [];
    return milestones
        .map(day => ({
            id: `auto_d_${day}`,
            day,
            date: hmMilestoneDate(firstMetDate, day),
            title: `D+${day}`,
            type: 'auto',
            icon: day === 365 ? '💍' : '❤️'
        }))
        .filter(item => item.date);
}

function hmGetNextAutoMilestone(firstMetDate, baseDate) {
    if (!firstMetDate) return null;
    const today = baseDate || hmGetTodayYmd();
    return hmGetAutoMilestones(firstMetDate).find(item => item.date >= today) || null;
}

function hmGetAutoMilestonesForDate(date) {
    if (!date || !hmAnniversaryState.firstMetDate) return [];
    return hmGetAutoMilestones(hmAnniversaryState.firstMetDate).filter(item => item.date === date);
}

function hmGetAnniversaryList() {
    return Object.entries(hmAnniversaryState.anniversaries || {})
        .map(([id, item]) => ({ id, ...(item || {}) }))
        .filter(item => item.date && item.title)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}


function hmGetAnniversariesForDate(date) {
    if (!date) return [];
    const customItems = hmGetAnniversaryList()
        .filter(item => item.date === date)
        .map(item => {
            const meta = hmGetAnniversaryTypeMeta(item.type);
            return { id: item.id, date: item.date, title: item.title, icon: meta.icon, type: item.type, source: 'custom' };
        });
    const autoItems = hmGetAutoMilestonesForDate(date).map(item => ({ ...item, source: 'auto' }));
    const firstMetItem = hmAnniversaryState.firstMetDate === date
        ? [{ id: 'first_met_date', date, title: '처음 만난 날', icon: '❤️', type: 'firstMet', source: 'firstMet' }]
        : [];
    return [...firstMetItem, ...customItems, ...autoItems];
}

function hmUniqueCalendarIcons(items) {
    const icons = [];
    (items || []).forEach(item => {
        if (item && item.icon && !icons.includes(item.icon)) icons.push(item.icon);
    });
    return icons.slice(0, 3).join('');
}

function hmGetCalendarBaseYearMonth() {
    const current = hmGetSelectedHistoryDateSafe();
    const base = hmDateFromYmd(current) || new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
}

function hmRenderAnniversaryCalendarMarkers() {
    const grid = document.querySelector('#calendarBox .history-calendar-grid');
    if (!grid) return;
    const { year, month } = hmGetCalendarBaseYearMonth();
    const dayCells = Array.from(grid.querySelectorAll('.calendar-day'));
    if (!dayCells.length) return;
    dayCells.forEach(cell => {
        const oldMarker = cell.querySelector('.anniversary-calendar-icons');
        if (oldMarker) oldMarker.remove();
        cell.classList.remove('has-anniversary');
        cell.removeAttribute('data-anniversary-title');

        const dayText = (cell.childNodes[0]?.textContent || cell.textContent || '').trim();
        const day = Number((dayText.match(/^\d{1,2}/) || [])[0]);
        if (!day) return;

        const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const items = hmGetAnniversariesForDate(ymd);
        if (!items.length) return;

        const marker = document.createElement('span');
        marker.className = 'anniversary-calendar-icons';
        marker.textContent = hmUniqueCalendarIcons(items);
        marker.setAttribute('aria-label', items.map(item => item.title).join(', '));
        cell.appendChild(marker);
        cell.classList.add('has-anniversary');
        cell.dataset.anniversaryTitle = items.map(item => item.title).join(', ');
    });
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
        hmRenderAnniversaryCalendarMarkers();
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
        hmRenderAnniversaryCalendarMarkers();
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
        hmRenderAnniversaryCalendarMarkers();
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
    const typeChips = HM_ANNIVERSARY_TYPES.map((item, index) => `<button type="button" class="anniversary-type-chip${index === 0 ? ' is-selected' : ''}" data-type="${escapeHtml(item.value)}" onclick="hmSetCustomAnniversaryType('${escapeHtml(item.value)}')" aria-label="${escapeHtml(item.label)} 선택"><span>${item.icon}</span><small>${escapeHtml(item.label)}</small></button>`).join('');
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
    const autoMilestones = hmGetAutoMilestones(firstMetDate);
    const autoListHtml = autoMilestones.length ? autoMilestones.map(item => `<div class="anniversary-auto-item">
            <span class="anniversary-auto-icon">${item.icon}</span>
            <span><strong>${item.title}</strong><small>${hmFormatKoreanDate(item.date)}</small></span>
        </div>`).join('') : '<div class="anniversary-empty-note">처음 만난 날을 저장하면 D+100, D+200, D+300, D+365, D+500이 자동 계산됩니다.</div>';

    modal.innerHTML = `
        <div class="anniversary-settings-head anniversary-settings-hero">
            <div>
                <div class="anniversary-settings-kicker">MEMORY SETTINGS</div>
                <h2>우리의 기념일 설정</h2>
                <p>둘만의 날짜를 예쁘게 정리해 두면 기록실에서 함께 확인할 수 있어요.</p>
            </div>
            <button type="button" class="anniversary-modal-close" onclick="hmCloseAnniversarySettings()" aria-label="기념일 설정 닫기">×</button>
        </div>
        <div class="anniversary-settings-section anniversary-feature-card">
            <div class="anniversary-section-label"><span>❤️</span><strong>처음 만난 날</strong></div>
            <div class="anniversary-settings-help">이 날짜를 기준으로 D+100, D+200 같은 기념일이 자동 계산됩니다.</div>
            <div class="anniversary-settings-row">
                <label class="anniversary-field"><span>날짜</span><input type="date" id="firstMetDateInput" value="${escapeHtml(firstMetDate)}" aria-label="처음 만난 날"></label>
                <button type="button" class="anniversary-primary-btn" onclick="hmSaveFirstMetDate()">저장</button>
            </div>
        </div>
        <div class="anniversary-settings-section anniversary-feature-card anniversary-auto-card">
            <div class="anniversary-section-label"><span>✨</span><strong>자동 계산 기념일</strong></div>
            <div class="anniversary-settings-help">처음 만난 날 기준으로 자동 표시됩니다. 별도 저장 없이 날짜가 바뀌어도 안전하게 다시 계산됩니다.</div>
            <div class="anniversary-auto-list">${autoListHtml}</div>
        </div>
        <div class="anniversary-settings-section anniversary-feature-card">
            <div class="anniversary-section-label"><span>🎉</span><strong>둘만의 기념일 추가</strong></div>
            <div class="anniversary-settings-help">생일, 여행, 약속한 날처럼 캘린더에 함께 기억할 날짜를 추가할 수 있습니다.</div>
            <input type="hidden" id="customAnniversaryType" value="love">
            <div class="anniversary-type-grid">${typeChips}</div>
            <div class="anniversary-add-grid">
                <label class="anniversary-field"><span>날짜</span><input type="date" id="customAnniversaryDate" aria-label="기념일 날짜"></label>
                <label class="anniversary-field anniversary-field-title"><span>이름</span><input type="text" id="customAnniversaryTitle" placeholder="예: 200일 여행, 첫 생일, 약속한 날" aria-label="기념일 이름"></label>
                <button type="button" class="anniversary-primary-btn anniversary-add-btn" onclick="hmAddCustomAnniversary()">추가</button>
            </div>
        </div>
        <div class="anniversary-settings-section anniversary-list-card">
            <div class="anniversary-section-label"><span>📌</span><strong>등록된 기념일</strong></div>
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
    const autoMilestones = hmGetAutoMilestones(firstMetDate);
    const nextMilestone = hmGetNextAutoMilestone(firstMetDate);
    const selectedAutoMilestones = hmGetAutoMilestonesForDate(selectedDate);
    const selectedAutoText = selectedAutoMilestones.length ? ` · 자동 기념일 <strong>${selectedAutoMilestones.map(item => item.title).join(', ')}</strong>` : '';
    const selectedNote = firstMetDate && selectedDday ? `<div class="anniversary-selected-note">📅 선택한 날짜 <strong>${hmFormatKoreanDate(selectedDate)}</strong>는 만난 지 <strong>D+${selectedDday}</strong>입니다${selectedAutoText}.</div>` : '';
    const summaryText = firstMetDate
        ? `처음 만난 날: ${hmFormatKoreanDate(firstMetDate)}${nextMilestone ? ` · 다음 D+${nextMilestone.day}: ${hmFormatKoreanDate(nextMilestone.date)}` : ''}`
        : '처음 만난 날을 설정하면 D+가 자동 계산됩니다.';
    const autoPreview = firstMetDate ? `<div class="anniversary-auto-preview">${autoMilestones.map(item => `<span>${item.icon} ${item.title} <b>${hmFormatKoreanDate(item.date)}</b></span>`).join('')}</div>` : '';
    const todayBox = firstMetDate
        ? `<div class="anniversary-today compact"><span class="anniversary-icon">🎉</span><span><div class="anniversary-main">오늘은 만난 지 D+${todayDday}</div><div class="anniversary-caption">자동 기념일 5개 · 직접 등록한 기념일 ${customCount}개</div></span></div>`
        : `<div class="anniversary-today compact"><span class="anniversary-icon">💕</span><span><div class="anniversary-main">처음 만난 날을 설정해 주세요</div><div class="anniversary-caption">설정 버튼에서 기념일 종류도 함께 관리할 수 있어요.</div></span></div>`;
    box.innerHTML = `<div class="anniversary-card anniversary-card-compact">
        <div class="anniversary-head">
            <div>
                <div class="anniversary-title">💕 우리의 기념일</div>
                <div class="anniversary-sub">${escapeHtml(summaryText)}</div>
            </div>
            <button type="button" class="anniversary-toggle-btn" onclick="hmOpenAnniversarySettings()">설정</button>
        </div>
        ${selectedNote}${todayBox}${autoPreview}
    </div>`;
}

async function hmRefreshAnniversaryPanel() {
    await hmLoadAnniversarySettings();
    hmRenderAnniversaryPanel();
}

// =========================================================
// HearMe2nite RC2.10.9 SAFE
// Anniversary Date Detail Bridge + Open Modal Stabilization
// - History Render(displayHistory) 원본 수정 없음
// - 캘린더 DOM 후처리로 기념일 날짜도 선택 가능하게 보강
// - 선택 날짜의 기존 기록 아래에 기념일 요약 카드를 독립 append
// =========================================================
function hmRenderSelectedDateAnniversaryDetail() {
    // RC2.15.1: 선택 날짜의 기념일 안내 카드는 기록실 상단을 중복으로 차지하여 제거한다.
    // 기념일/일정 정보는 우리의 기념일 패널과 캘린더 아이콘에서만 보여준다.
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    const oldDetail = historyList.querySelector('.anniversary-selected-detail-card');
    if (oldDetail) oldDetail.remove();
}


function hmEnableAnniversaryCalendarDateClicks() {
    const grid = document.querySelector('#calendarBox .history-calendar-grid');
    if (!grid) return;
    const { year, month } = hmGetCalendarBaseYearMonth();
    const dayCells = Array.from(grid.querySelectorAll('.calendar-day'));
    dayCells.forEach(cell => {
        const dayText = (cell.childNodes[0]?.textContent || cell.textContent || '').trim();
        const day = Number((dayText.match(/^\d{1,2}/) || [])[0]);
        if (!day) return;
        const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const items = hmGetAnniversariesForDate(ymd);
        if (!items.length) return;
        cell.classList.add('anniversary-clickable-date');
        cell.setAttribute('title', items.map(item => item.title).join(', '));
        if (!cell.getAttribute('onclick')) {
            cell.setAttribute('onclick', `selectHistoryDate('${ymd}')`);
        }
    });
}


// =========================================================
// HearMe2nite RC2.10.10 SAFE
// Unified Anniversary Hooks
// - 중복 래핑 방지
// - History Render 원본 직접 수정 없음
// - displayHistory/selectHistoryDate/openHistoryPanelModal 후처리만 수행
// =========================================================
function hmAfterHistoryRenderSafe() {
    try { hmRenderAnniversaryPanel(); } catch (err) { console.warn('[Anniversary] panel render skipped', err); }
    try { hmRenderAnniversaryCalendarMarkers(); } catch (err) { console.warn('[Anniversary] calendar markers skipped', err); }
    try { hmEnableAnniversaryCalendarDateClicks(); } catch (err) { console.warn('[Anniversary] date clicks skipped', err); }
    try { hmRenderSelectedDateAnniversaryDetail(); } catch (err) { console.warn('[Anniversary] detail render skipped', err); }
}

(function hmInstallUnifiedAnniversaryHooks(){
    if (window.__hmAnniversaryUnifiedHooksInstalled) return;
    window.__hmAnniversaryUnifiedHooksInstalled = true;

    const originalOpenHistoryPanelModal = window.openHistoryPanelModal;
    if (typeof originalOpenHistoryPanelModal === 'function') {
        window.openHistoryPanelModal = function() {
            const result = originalOpenHistoryPanelModal.apply(this, arguments);
            hmRefreshAnniversaryPanel().finally(function() {
                setTimeout(hmAfterHistoryRenderSafe, 0);
            });
            return result;
        };
    }

    const originalDisplayHistory = window.displayHistory;
    if (typeof originalDisplayHistory === 'function') {
        window.displayHistory = function(daysData) {
            const result = originalDisplayHistory.apply(this, arguments);
            hmAfterHistoryRenderSafe();
            return result;
        };
    }

    const originalSelectHistoryDate = window.selectHistoryDate;
    if (typeof originalSelectHistoryDate === 'function') {
        window.selectHistoryDate = function(date) {
            const result = originalSelectHistoryDate.apply(this, arguments);
            hmAfterHistoryRenderSafe();
            return result;
        };
    }

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && hmAnniversaryState.isModalOpen) hmCloseAnniversarySettings();
    });
})();


// =========================================================
// HearMe2nite RC2.10.11 SAFE
// Anniversary Regression Self Check Helper
// - 사용자 데이터/DB를 변경하지 않는 읽기 전용 콘솔 QA 함수
// =========================================================
window.hmAnniversaryRegressionCheck = function() {
    const result = {
        overlayReady: !!document.getElementById('anniversarySettingsOverlay'),
        panelReady: !!document.getElementById('anniversaryPanel'),
        firstMetDateLoaded: !!hmAnniversaryState.firstMetDate,
        customAnniversaryCount: hmGetAnniversaryList().length,
        autoMilestoneCount: hmGetAutoMilestones(hmAnniversaryState.firstMetDate).length,
        hooksInstalled: !!window.__hmAnniversaryUnifiedHooksInstalled,
        selectedDate: hmGetSelectedHistoryDateSafe()
    };
    console.table(result);
    return result;
};
