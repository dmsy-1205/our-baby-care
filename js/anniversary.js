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

function hmGetRelativeDayLabel(ymd) {
    const target = hmDateFromYmd(ymd);
    const today = hmDateFromYmd(hmGetTodayYmd());
    if (!target || !today) return '';
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return '오늘';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
}


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
    // RC2.15: 자동 D+ 계산 기념일은 화면에서 사용하지 않는다. 기존 데이터는 보존하지만 새 UI에는 직접 등록한 기념일만 표시한다.
    return [];
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
    return hmGetAnniversaryList()
        .filter(item => item.date === date)
        .map(item => {
            const meta = hmGetAnniversaryTypeMeta(item.type);
            return { id: item.id, date: item.date, title: item.title, icon: meta.icon, type: item.type, source: 'custom' };
        });
}

function hmUniqueCalendarIcons(items) {
    const icons = [];
    (items || []).forEach(item => {
        if (item && item.icon && !icons.includes(item.icon)) icons.push(item.icon);
    });
    return icons.slice(0, 3).join('');
}

function hmGetCalendarBaseYearMonth() {
    const current = window.hmHistoryCalendarViewDate || hmGetSelectedHistoryDateSafe();
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
    }).join('') : '<div class="anniversary-empty-note">아직 등록한 기념일이 없습니다. 생일, 여행, 데이트, 휴가처럼 캘린더에 표시할 날짜를 추가해 보세요.</div>';

    modal.innerHTML = `
        <div class="anniversary-settings-head anniversary-settings-hero">
            <div>
                <div class="anniversary-settings-kicker">OUR DAYS</div>
                <h2>우리의 기념일</h2>
                <p>둘만의 날짜를 등록하면 기록실 캘린더에 작은 아이콘으로 표시됩니다.</p>
            </div>
            <button type="button" class="anniversary-modal-close" onclick="hmCloseAnniversarySettings()" aria-label="기념일 설정 닫기">×</button>
        </div>
        <div class="anniversary-settings-section anniversary-feature-card">
            <div class="anniversary-section-label"><span>🎉</span><strong>기념일 추가</strong></div>
            <div class="anniversary-settings-help">생일, 여행, 데이트, 휴가, 약속한 날처럼 함께 기억할 날짜를 자유롭게 등록하세요.</div>
            <input type="hidden" id="customAnniversaryType" value="love">
            <div class="anniversary-type-grid">${typeChips}</div>
            <div class="anniversary-add-grid">
                <label class="anniversary-field"><span>날짜</span><input type="date" id="customAnniversaryDate" aria-label="기념일 날짜"></label>
                <label class="anniversary-field anniversary-field-title"><span>이름</span><input type="text" id="customAnniversaryTitle" placeholder="예: 생일, 첫 여행, 데이트, 휴가" aria-label="기념일 이름"></label>
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
    const list = hmGetAnniversaryList();
    const today = hmGetTodayYmd();
    const ordered = [...list].sort((a, b) => {
        const aFuture = String(a.date) >= today ? 0 : 1;
        const bFuture = String(b.date) >= today ? 0 : 1;
        if (aFuture !== bFuture) return aFuture - bFuture;
        return aFuture === 0 ? String(a.date).localeCompare(String(b.date)) : String(b.date).localeCompare(String(a.date));
    });
    const listHtml = ordered.length
        ? `<div class="anniversary-panel-list">${ordered.map(item => {
            const meta = hmGetAnniversaryTypeMeta(item.type);
            const relative = hmGetRelativeDayLabel(item.date);
            return `<div class="anniversary-panel-item">
                <div class="anniversary-panel-icon">${meta.icon}</div>
                <div class="anniversary-panel-body">
                    <div class="anniversary-panel-title">${escapeHtml(item.title)}</div>
                    <div class="anniversary-panel-date">${hmFormatKoreanDate(item.date)} · ${escapeHtml(meta.label)}</div>
                </div>
                <div class="anniversary-panel-dday">${escapeHtml(relative)}</div>
            </div>`;
        }).join('')}</div>`
        : `<div class="anniversary-empty-panel">
            <div class="anniversary-panel-icon">📌</div>
            <div>
                <div class="anniversary-panel-title">아직 등록된 기념일이 없습니다</div>
                <div class="anniversary-panel-date">생일, 여행, 데이트, 휴가처럼 기억하고 싶은 날짜를 추가해 보세요.</div>
            </div>
        </div>`;
    box.innerHTML = `<div class="anniversary-card anniversary-card-compact">
        <div class="anniversary-head">
            <div>
                <div class="anniversary-title">💕 우리의 기념일</div>
                <div class="anniversary-sub">등록한 기념일은 캘린더에도 함께 표시됩니다.</div>
            </div>
            <button type="button" class="anniversary-toggle-btn" onclick="hmOpenAnniversarySettings()">등록/관리</button>
        </div>
        ${listHtml}
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
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    const selectedDate = hmGetSelectedHistoryDateSafe();
    if (!selectedDate) return;

    const oldDetail = historyList.querySelector('.anniversary-selected-detail-card');
    if (oldDetail) oldDetail.remove();

    const items = hmGetAnniversariesForDate(selectedDate);
    if (!items.length) return;

    const card = document.createElement('div');
    card.className = 'anniversary-selected-detail-card';

    const itemHtml = items.map(item => `<div class="anniversary-selected-detail-item">
            <span class="anniversary-selected-detail-icon">${item.icon || '💕'}</span>
            <span>
                <strong>${escapeHtml(item.title || '기념일')}</strong>
                <small>직접 등록</small>
            </span>
        </div>`).join('');

    card.innerHTML = `
        <div class="anniversary-selected-detail-head">
            <span>🎉</span>
            <div>
                <strong>${hmFormatKoreanDate(selectedDate)}의 기념일</strong>
                <small>선택한 날짜의 기록과 함께 표시됩니다.</small>
            </div>
        </div>
        <div class="anniversary-selected-detail-list">${itemHtml}</div>
    `;

    historyList.appendChild(card);
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
