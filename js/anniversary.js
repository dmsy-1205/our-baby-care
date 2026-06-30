// =========================================================
// HearMe2nite RC2.10.2 SAFE
// anniversary.js - Compact Anniversary Panel
// - RC2.9.1 정상 History 로딩 구조 보존
// - rooms/{roomCode}/days 경로 변경 없음
// - 처음 만난 날 저장 위치: rooms/{roomCode}/meta/firstMetDate
// =========================================================

let hmAnniversaryState = { firstMetDate: '', isLoaded: false, isFormOpen: false };

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
async function hmLoadAnniversarySettings() {
    const roomCode = typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : '';
    if (!roomCode || !currentUser || !db) return;
    try {
        const snap = await db.ref(`rooms/${roomCode}/meta/firstMetDate`).once('value');
        hmAnniversaryState.firstMetDate = snap.val() || '';
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
        hmAnniversaryState.isFormOpen = false;
        if (typeof showToast === 'function') showToast('처음 만난 날이 저장되었습니다. 💕');
        hmRenderAnniversaryPanel();
    } catch (err) {
        if (typeof hmReportError === 'function') hmReportError('hmSaveFirstMetDate', err, '처음 만난 날 저장 실패');
        else alert('저장 중 오류가 발생했습니다.');
    }
}
function hmToggleAnniversaryForm() {
    hmAnniversaryState.isFormOpen = !hmAnniversaryState.isFormOpen;
    hmRenderAnniversaryPanel();
}
function hmRenderAnniversaryPanel() {
    const box = document.getElementById('anniversaryPanel');
    if (!box) return;
    const firstMetDate = hmAnniversaryState.firstMetDate || '';
    const selectedDate = hmGetSelectedHistoryDateSafe();
    const selectedDday = firstMetDate ? hmCalculateDday(firstMetDate, selectedDate) : null;
    const todayDday = firstMetDate ? hmCalculateDday(firstMetDate, hmGetTodayYmd()) : null;
    const milestones = [100, 200, 300, 365, 500, 700, 1000];
    const upcoming = firstMetDate ? milestones.map(day => ({ day, date: hmMilestoneDate(firstMetDate, day) })).filter(item => item.date >= hmGetTodayYmd()).slice(0, 4) : [];
    const formClass = hmAnniversaryState.isFormOpen || !firstMetDate ? 'anniversary-form is-open' : 'anniversary-form';
    const selectedNote = firstMetDate && selectedDday ? `<div class="anniversary-selected-note">📅 선택한 날짜 <strong>${hmFormatKoreanDate(selectedDate)}</strong>는 만난 지 <strong>D+${selectedDday}</strong>입니다.</div>` : '';
    const todayBox = firstMetDate ? `<div class="anniversary-today"><span class="anniversary-icon">🎉</span><span><div class="anniversary-main">오늘은 만난 지 D+${todayDday}</div><div class="anniversary-caption">처음 만난 날: ${hmFormatKoreanDate(firstMetDate)}</div></span></div>` : `<div class="anniversary-today"><span class="anniversary-icon">💕</span><span><div class="anniversary-main">처음 만난 날을 설정해 주세요</div><div class="anniversary-caption">날짜를 선택하면 캘린더에서 D+를 자동 계산할 수 있어요.</div></span></div>`;
    const upcomingHtml = firstMetDate && upcoming.length ? `<div class="anniversary-upcoming">${upcoming.map(item => `<div class="anniversary-pill"><strong>D+${item.day}</strong><span>${hmFormatKoreanDate(item.date)}</span></div>`).join('')}</div>` : '';
    box.innerHTML = `<div class="anniversary-card"><div class="anniversary-head"><div><div class="anniversary-title">💕 우리의 기념일</div><div class="anniversary-sub">기록실을 방해하지 않도록 아래에 작게 정리했어요. 날짜를 누르면 D+가 자동 계산됩니다.</div></div><button type="button" class="anniversary-toggle-btn" onclick="hmToggleAnniversaryForm()">${firstMetDate ? '수정' : '설정'}</button></div>${selectedNote}${todayBox}<div class="${formClass}"><input type="date" id="firstMetDateInput" value="${escapeHtml(firstMetDate)}" aria-label="처음 만난 날"><button type="button" class="anniversary-save-btn" onclick="hmSaveFirstMetDate()">저장</button></div>${upcomingHtml}</div>`;
}
async function hmRefreshAnniversaryPanel() { await hmLoadAnniversarySettings(); hmRenderAnniversaryPanel(); }
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
})();
