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
    isModalOpen: false,
    isPanelOpen: false
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

// RC2.17.2: 기념일은 "다가오는 순서"로 보여준다.
// 생일/기념일처럼 과거 날짜도 올해 또는 다음 해의 같은 월/일 기준으로 D-day를 계산한다.
function hmGetUpcomingOccurrence(ymd) {
    const original = hmDateFromYmd(ymd);
    const today = hmDateFromYmd(hmGetTodayYmd());
    if (!original || !today) return null;

    // 미래의 1회성 일정은 원래 날짜를 그대로 사용한다.
    if (original.getTime() >= today.getTime()) return original;

    // 과거에 등록된 생일/기념일은 매년 돌아오는 날짜로 계산한다.
    let next = new Date(today.getFullYear(), original.getMonth(), original.getDate());
    if (next.getTime() < today.getTime()) {
        next = new Date(today.getFullYear() + 1, original.getMonth(), original.getDate());
    }
    return next;
}

function hmGetUpcomingDayInfo(ymd) {
    const next = hmGetUpcomingOccurrence(ymd);
    const today = hmDateFromYmd(hmGetTodayYmd());
    if (!next || !today) return { diff: 999999, label: '', date: null };
    const diff = Math.round((next.getTime() - today.getTime()) / 86400000);
    return {
        diff,
        label: diff === 0 ? '오늘' : `D-${diff}`,
        date: next
    };
}

function hmSortAnniversariesByUpcoming(list) {
    return [...(list || [])].sort((a, b) => {
        const ad = hmGetUpcomingDayInfo(a.date).diff;
        const bd = hmGetUpcomingDayInfo(b.date).diff;
        if (ad !== bd) return ad - bd;
        return String(a.title || '').localeCompare(String(b.title || ''));
    });
}

function hmGetTogetherDayCount() {
    if (!hmAnniversaryState.firstMetDate) return null;
    const start = hmDateFromYmd(hmAnniversaryState.firstMetDate);
    const today = hmDateFromYmd(hmGetTodayYmd());
    if (!start || !today) return null;
    const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    return diff > 0 ? diff : null;
}

function hmGetTogetherDayBadgeHtml() {
    const day = hmGetTogetherDayCount();
    if (!day) return '';
    return `<span class="history-together-day-badge" title="대표 기념일 기준">💕 함께한 지 ${day}일</span>`;
}
window.hmGetTogetherDayBadgeHtml = hmGetTogetherDayBadgeHtml;
window.hmGetTogetherDayCount = hmGetTogetherDayCount;

function hmSyncHomeSummary() {
    try {
        if (typeof window.hmUpdateHomeSummary === 'function') {
            window.hmUpdateHomeSummary();
            return;
        }
        setTimeout(() => {
            try { if (typeof window.hmUpdateHomeSummary === 'function') window.hmUpdateHomeSummary(); } catch (err) {}
        }, 0);
    } catch (err) {}
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


function hmRenderTogetherDayBadgeInCalendar() {
    const monthLine = document.querySelector('#calendarBox .history-calendar-month-line');
    const currentMonth = document.querySelector('#calendarBox .history-calendar-current-month');
    const target = monthLine || currentMonth;
    if (!target) return;
    const old = target.querySelector('.history-together-day-badge');
    if (old) old.remove();
    const html = hmGetTogetherDayBadgeHtml();
    if (!html) return;
    const wrap = document.createElement('span');
    wrap.innerHTML = html;
    target.appendChild(wrap.firstElementChild);
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
        hmSyncHomeSummary();
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
        hmSyncHomeSummary();
    } catch (err) {
        if (typeof hmReportError === 'function') hmReportError('hmSaveFirstMetDate', err, '처음 만난 날 저장 실패');
        else alert('저장 중 오류가 발생했습니다.');
    }
}

async function hmAddCustomAnniversary() {
    const dateInput = document.getElementById('customAnniversaryDate');
    const titleInput = document.getElementById('customAnniversaryTitle');
    const typeInput = document.getElementById('customAnniversaryType');
    const mainInput = document.getElementById('customAnniversaryMainDate');
    const date = dateInput ? dateInput.value : '';
    const title = titleInput ? titleInput.value.trim() : '';
    const type = typeInput ? typeInput.value : 'love';
    const useAsMainDate = !!(mainInput && mainInput.checked);
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
        const item = { date, title, type, createdAt: Date.now(), createdBy: currentUser?.uid || '', isMainDate: useAsMainDate };
        const updates = {};
        updates[`rooms/${roomCode}/meta/anniversaries/${id}`] = item;
        if (useAsMainDate) updates[`rooms/${roomCode}/meta/firstMetDate`] = date;
        await db.ref().update(updates);
        hmAnniversaryState.anniversaries = { ...(hmAnniversaryState.anniversaries || {}), [id]: item };
        if (useAsMainDate) hmAnniversaryState.firstMetDate = date;
        if (dateInput) dateInput.value = '';
        if (titleInput) titleInput.value = '';
        if (mainInput) mainInput.checked = false;
        if (typeof showToast === 'function') showToast('기념일이 추가되었습니다. 🎉');
        hmRenderAnniversaryPanel();
        hmRenderAnniversaryModal();
        hmRenderAnniversaryCalendarMarkers();
        hmSyncHomeSummary();
    } catch (err) {
        if (typeof hmReportError === 'function') hmReportError('hmAddCustomAnniversary', err, '기념일 추가 실패');
        else alert('기념일 추가 중 오류가 발생했습니다.');
    }
}


async function hmSetFirstMetFromAnniversary(id) {
    const item = (hmAnniversaryState.anniversaries || {})[id];
    if (!item || !item.date) return;
    const okConfirm = confirm('이 날짜를 함께한 날 계산 기준으로 지정할까요?');
    if (!okConfirm) return;
    const roomCode = typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : '';
    if (!roomCode) { alert('공간을 먼저 연결해 주세요.'); return; }
    try {
        if (typeof hmRequireRoomAccess === 'function') {
            const ok = await hmRequireRoomAccess('대표 기념일 지정', roomCode);
            if (!ok) return;
        }
        await db.ref(`rooms/${roomCode}/meta/firstMetDate`).set(item.date);
        hmAnniversaryState.firstMetDate = item.date;
        if (typeof showToast === 'function') showToast('함께한 날짜 기준으로 지정되었습니다. 💕');
        hmRenderAnniversaryPanel();
        hmRenderAnniversaryModal();
        try { if (typeof renderCalendar === 'function') renderCalendar(window.cachedDaysData || {}); } catch (e) {}
        hmRenderAnniversaryCalendarMarkers();
        hmSyncHomeSummary();
    } catch (err) {
        if (typeof hmReportError === 'function') hmReportError('hmSetFirstMetFromAnniversary', err, '대표 기념일 지정 실패');
        else alert('대표 기념일 지정 중 오류가 발생했습니다.');
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

let hmAnniversaryBodyScrollY = 0;
let hmAnniversaryCloseGuardUntil = 0;

function hmOpenAnniversarySettings() {
    // STEP6.2.3: Prevent the delayed synthetic mobile click from reopening
    // the modal immediately after the close button hides the overlay.
    if (Date.now() < hmAnniversaryCloseGuardUntil) return;
    hmAnniversaryState.isModalOpen = true;
    hmEnsureAnniversaryModal();
    hmRenderAnniversaryModal();
    const overlay = document.getElementById('anniversarySettingsOverlay');
    hmAnniversaryBodyScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    try {
        document.body.style.top = `-${hmAnniversaryBodyScrollY}px`;
        document.body.classList.add('modal-open', 'anniversary-modal-open');
    } catch (err) {}
    if (overlay) {
        overlay.hidden = false;
        overlay.style.removeProperty('display');
        overlay.classList.add('is-open');
        overlay.scrollTop = 0;
    }
}

function hmCloseAnniversarySettings() {
    hmAnniversaryCloseGuardUntil = Date.now() + 900;
    hmAnniversaryState.isModalOpen = false;
    const overlay = document.getElementById('anniversarySettingsOverlay');
    if (overlay) {
        overlay.classList.remove('is-open');
        overlay.hidden = true;
        overlay.style.removeProperty('display');
        overlay.scrollTop = 0;
    }
    try {
        document.body.classList.remove('modal-open', 'anniversary-modal-open');
        document.body.style.top = '';
        window.scrollTo(0, hmAnniversaryBodyScrollY || 0);
    } catch (err) {}
}


function hmEnsureAnniversaryModal() {
    if (document.getElementById('anniversarySettingsOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'anniversarySettingsOverlay';
    overlay.className = 'anniversary-settings-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<div class="anniversary-settings-modal" id="anniversarySettingsModal"></div>';
    overlay.addEventListener('click', function(event) {
        if (event.target === overlay) hmCloseAnniversarySettings();
    });
    // Keep mobile vertical gestures inside this top-level overlay.
    overlay.addEventListener('touchmove', function(event) {
        event.stopPropagation();
    }, { passive: true });
    document.body.appendChild(overlay);
}

function hmRenderAnniversaryModal() {
    hmEnsureAnniversaryModal();
    const modal = document.getElementById('anniversarySettingsModal');
    if (!modal) return;
    const list = hmSortAnniversariesByUpcoming(hmGetAnniversaryList());
    const typeChips = HM_ANNIVERSARY_TYPES.map((item, index) => `<button type="button" class="anniversary-type-chip${index === 0 ? ' is-selected' : ''}" data-type="${escapeHtml(item.value)}" data-hm-action="set-anniversary-type" data-hm-value="${escapeHtml(item.value)}" aria-label="${escapeHtml(item.label)} 선택"><span>${item.icon}</span><small>${escapeHtml(item.label)}</small></button>`).join('');
    const listHtml = list.length ? list.map(item => {
        const meta = hmGetAnniversaryTypeMeta(item.type);
        const upcoming = hmGetUpcomingDayInfo(item.date);
        const isMain = hmAnniversaryState.firstMetDate === item.date;
        return `<div class="anniversary-custom-item">
            <div class="anniversary-custom-icon">${meta.icon}</div>
            <div class="anniversary-custom-main">
                <div class="anniversary-custom-title">${escapeHtml(item.title)}${isMain ? ' <span class="anniversary-main-badge">대표</span>' : ''}</div>
                <div class="anniversary-custom-date">${hmFormatKoreanDate(item.date)} · ${escapeHtml(meta.label)} · ${escapeHtml(upcoming.label)}</div>
            </div>
            <div class="anniversary-custom-actions">
                <button type="button" class="anniversary-main-btn" data-hm-action="set-main-anniversary" data-hm-value="${escapeHtml(item.id)}">대표</button>
                <button type="button" class="anniversary-delete-btn" data-hm-action="delete-anniversary" data-hm-value="${escapeHtml(item.id)}">삭제</button>
            </div>
        </div>`;
    }).join('') : '<div class="anniversary-empty-note">아직 등록한 기념일이 없습니다. 생일, 여행, 데이트, 휴가처럼 캘린더에 표시할 날짜를 추가해 보세요.</div>';

    modal.innerHTML = `
        <div class="anniversary-settings-head anniversary-settings-hero">
            <div>
                <div class="anniversary-settings-kicker">OUR DAYS</div>
                <h2>우리의 기념일</h2>
                <p>둘만의 날짜를 등록하면 기록실 캘린더에 작은 아이콘으로 표시됩니다.</p>
            </div>
            <button type="button" class="anniversary-modal-close" id="anniversaryModalCloseButton" aria-label="기념일 설정 닫기">×</button>
        </div>
        <div class="anniversary-settings-section anniversary-feature-card">
            <div class="anniversary-section-label"><span>🎉</span><strong>기념일 추가</strong></div>
            <div class="anniversary-settings-help">생일, 여행, 데이트, 휴가, 약속한 날처럼 함께 기억할 날짜를 자유롭게 등록하세요.</div>
            <input type="hidden" id="customAnniversaryType" value="love">
            <div class="anniversary-type-grid">${typeChips}</div>
            <div class="anniversary-add-grid">
                <label class="anniversary-field"><span>날짜</span><input type="date" id="customAnniversaryDate" aria-label="기념일 날짜"></label>
                <label class="anniversary-field anniversary-field-title"><span>이름</span><input type="text" id="customAnniversaryTitle" placeholder="예: 생일, 첫 여행, 데이트, 휴가" aria-label="기념일 이름"></label>
                <button type="button" class="anniversary-primary-btn anniversary-add-btn" data-hm-action="add-anniversary">추가</button>
            </div>
            <label class="anniversary-main-date-check"><input type="checkbox" id="customAnniversaryMainDate"> 이 날짜를 함께한 날 계산 기준으로 사용</label>
        </div>
        <div class="anniversary-settings-section anniversary-list-card">
            <div class="anniversary-section-label"><span>📌</span><strong>등록된 기념일</strong></div>
            <div class="anniversary-custom-list">${listHtml}</div>
        </div>`;

    // STEP6.2.3: Use one activation path and block mobile click-through.
    // The previous pointerup + click combination could close the overlay and then
    // let the delayed synthetic click hit the underlying “관리” button, reopening it.
    const closeButton = document.getElementById('anniversaryModalCloseButton');
    if (closeButton) {
        closeButton.addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
            hmCloseAnniversarySettings();
        }, { capture: true });
    }
}
function hmRenderAnniversaryPanel() {
    const box = document.getElementById('anniversaryPanel');
    if (!box) return;
    const ordered = hmSortAnniversariesByUpcoming(hmGetAnniversaryList());
    const preview = ordered.slice(0, 3);
    const hiddenCount = Math.max(ordered.length - preview.length, 0);
    const isOpen = !!hmAnniversaryState.isPanelOpen;
    const nearest = preview[0];
    const nearestSummary = nearest
        ? `${hmGetAnniversaryTypeMeta(nearest.type).icon} ${escapeHtml(nearest.title)} · ${escapeHtml(hmGetUpcomingDayInfo(nearest.date).label)}`
        : '등록된 기념일이 없습니다';
    const listHtml = ordered.length
        ? `<div class="anniversary-panel-list anniversary-panel-preview-list">${preview.map(item => {
            const meta = hmGetAnniversaryTypeMeta(item.type);
            const relative = hmGetUpcomingDayInfo(item.date).label;
            return `<div class="anniversary-panel-item">
                <div class="anniversary-panel-icon">${meta.icon}</div>
                <div class="anniversary-panel-body">
                    <div class="anniversary-panel-title">${escapeHtml(item.title)}</div>
                    <div class="anniversary-panel-date">${hmFormatKoreanDate(item.date)} · ${escapeHtml(meta.label)}</div>
                </div>
                <div class="anniversary-panel-dday">${escapeHtml(relative)}</div>
            </div>`;
        }).join('')}${hiddenCount ? `<button type="button" class="anniversary-more-btn" data-hm-action="open-anniversary-settings">+ ${hiddenCount}개의 기념일 더 보기</button>` : ''}</div>`
        : `<div class="anniversary-empty-panel">
            <div class="anniversary-panel-icon">📌</div>
            <div>
                <div class="anniversary-panel-title">아직 등록된 기념일이 없습니다</div>
                <div class="anniversary-panel-date">생일, 여행, 데이트, 휴가처럼 기억하고 싶은 날짜를 추가해 보세요.</div>
            </div>
        </div>`;
    box.innerHTML = `<div class="anniversary-card anniversary-card-compact ${isOpen ? 'is-open' : 'is-collapsed'}">
        <div class="anniversary-head">
            <div>
                <div class="anniversary-title">💕 우리의 기념일</div>
                <div class="anniversary-sub">${isOpen ? '다가오는 순서로 최대 3개만 보여주고, 캘린더에도 함께 표시됩니다.' : nearestSummary}</div>
            </div>
            <div class="anniversary-panel-actions">
                <button type="button" class="anniversary-toggle-btn anniversary-fold-btn" data-hm-action="toggle-anniversary-panel" aria-expanded="${isOpen ? 'true' : 'false'}">${isOpen ? '접기' : '펼치기'}</button>
                <button type="button" class="anniversary-toggle-btn" data-hm-action="open-anniversary-settings">관리</button>
            </div>
        </div>
        <div class="anniversary-panel-collapsible" ${isOpen ? '' : 'hidden'}>${listHtml}</div>
    </div>`;
}

window.hmToggleAnniversaryPanel = function() {
    hmAnniversaryState.isPanelOpen = !hmAnniversaryState.isPanelOpen;
    hmRenderAnniversaryPanel();
};
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
    try { hmRenderTogetherDayBadgeInCalendar(); } catch (err) { console.warn('[Anniversary] together day skipped', err); }
    try { hmRenderAnniversaryCalendarMarkers(); } catch (err) { console.warn('[Anniversary] calendar markers skipped', err); }
    try { hmEnableAnniversaryCalendarDateClicks(); } catch (err) { console.warn('[Anniversary] date clicks skipped', err); }
    try { hmRenderSelectedDateAnniversaryDetail(); } catch (err) { console.warn('[Anniversary] detail render skipped', err); }
}

(function hmInstallUnifiedAnniversaryHooks(){
    if (window.__hmAnniversaryUnifiedHooksInstalled) return;
    window.__hmAnniversaryUnifiedHooksInstalled = true;

    // STEP5.6.3.6: 초기 대표 기념일 로딩은 autosave.js의
    // connectAndListenFirebase 내부에서 직접 수행한다.
    // 이 파일 로드 시점에는 connectAndListenFirebase가 아직 선언되지 않아
    // 함수 래핑 방식이 적용되지 않는 문제를 제거했다.

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
