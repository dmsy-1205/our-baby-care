// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// history.js - History
// RC2.12.1: Calendar-first hotfix. Recent timeline list disabled.
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // MODULE: HISTORY / STATS

    // Split-ready target: calculateHistoryStats

    // =========================================================


    // =========================================================
    // MODULE 08. HISTORY STATS SHARED
    // 분리 후보: history.js 일부
    // 지난 기록실에서 쓰는 통계성 계산 함수다. 렌더링과 분리 가능한 순수 계산 영역이다.
    // =========================================================
    function calculateHistoryStats(daysData) {
        const dates = Object.keys(daysData || {}).sort();
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 6);
        const toYmd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const weekDates = dates.filter(date => date >= toYmd(weekAgo) && date <= toYmd(today));
        let missionDone = 0, missionTotal = 0, hardDays = 0;
        weekDates.forEach((date) => {
            const rec = daysData[date] || {};
            const missions = Array.isArray(rec.missions) ? rec.missions : [];
            missionTotal += missions.length;
            missionDone += missions.filter(m => m.done).length;
            if (rec.mood === 'hard' || rec.mood === 'veryHard') hardDays += 1;
        });
        let streak = 0;
        const dateSet = new Set(dates);
        for (let d = new Date(today); ; d.setDate(d.getDate() - 1)) {
            if (dateSet.has(toYmd(d))) streak += 1;
            else break;
        }
        return {
            weekCount: weekDates.length,
            missionRate: missionTotal ? Math.round((missionDone / missionTotal) * 100) + '%' : '-',
            streak: streak ? `${streak}일` : '-',
            hardDays: `${hardDays}일`
        };
    }

    // =========================================================

    // MODULE: HISTORY / SUMMARY RENDER

    // Split-ready target: renderHistorySummary

    // =========================================================

/* RC2 v2.6.0 STEP3: removed duplicate earlier `renderHistorySummary()` implementation; final implementation below is authoritative. */


    // =========================================================

    // MODULE: HISTORY / CALENDAR RENDER

    // Split-ready target: renderCalendar

    // =========================================================

    // 기록 캘린더 렌더링
    // daysData의 key(YYYY-MM-DD)를 기준으로 기록이 있는 날짜만 활성화한다.
/* RC2 v2.6.0 STEP3: removed duplicate earlier `renderCalendar()` implementation; final implementation below is authoritative. */


    // =========================================================

    // MODULE: HISTORY / PHOTO THUMBS

    // Split-ready target: renderPhotoThumbs

    // =========================================================

    // 기록실 사진 썸네일 렌더링
    // 최신 사진 기록 일부만 가로 썸네일로 노출한다.
/* RC2 v2.6.0 STEP3: removed duplicate earlier `renderPhotoThumbs()` implementation; final implementation below is authoritative. */


    // =========================================================

    // MODULE: HISTORY / DATE SELECT

    // Split-ready target: selectHistoryDate

    // =========================================================

    // 기록실 날짜 선택
    // 캘린더에서 선택한 날짜를 기준으로 하단 기록 카드만 갱신한다.
/* RC2 v2.6.0 STEP3: removed duplicate earlier `selectHistoryDate()` implementation; final implementation below is authoritative. */




    // =========================================================





    // MODULE: HISTORY / DISPLAY RECORDS

    // Split-ready target: displayHistory

    // =========================================================

/* RC2 v2.6.0 STEP3: removed duplicate earlier `displayHistory()` implementation; final implementation below is authoritative. */


/* RC2 v2.6.0 STEP3: removed duplicate earlier `applyHistoryFilter()` implementation; final implementation below is authoritative. */

/* RC2 v2.6.0 STEP3: removed duplicate earlier `clearHistoryFilter()` implementation; final implementation below is authoritative. */

/* RC2 v2.6.0 STEP3: removed duplicate earlier `toggleHistoryItem()` implementation; final implementation below is authoritative. */


    // =========================================================

    // MODULE: HISTORY / DELETE RECORD

    // Split-ready target: deleteRecord

    // =========================================================


    // =========================================================
    // MODULE 15. RECORD ACTIONS / COPY
    // 분리 후보: history.js + clipboard.js 선택
    // 기록 삭제, 결과 생성, 클립보드 복사, 토스트 표시를 담당한다.
    // =========================================================
    async function deleteRecord(event, date) {
        event.stopPropagation();
        const roomCode = getRoomCodeForData();
        const user = auth.currentUser;
        if (!date || !roomCode || !user) return;
        if (!(await hmRequireRoomAccess('기록 삭제', roomCode)) || !canManageRelationshipCards()) { alert('기록 삭제는 관리(Dom) 또는 Room Owner만 가능합니다.'); return; }
        const confirmed = confirm(`${date} 기록을 삭제하시겠습니까?

삭제 사실은 상대방에게 표시되며, 삭제된 원본은 30일 동안 복구할 수 있도록 보관됩니다.`);
        if (!confirmed) return;
        try {
            const [daySnap, adminSnap] = await Promise.all([
                db.ref(`rooms/${roomCode}/days/${date}`).once('value'),
                db.ref(`rooms/${roomCode}/dayAdmin/${date}`).once('value')
            ]);
            if (!daySnap.exists() && !adminSnap.exists()) {
                alert('삭제할 기록을 찾을 수 없습니다. 화면을 새로고침한 뒤 다시 확인해 주세요.');
                return;
            }
            const now = Date.now();
            const archive = {
                recordDate: date,
                action: 'record_deleted',
                reason: 'manual_delete',
                deletedAt: firebase.database.ServerValue.TIMESTAMP,
                deletedAtClient: now,
                expiresAt: now + (30 * 24 * 60 * 60 * 1000),
                deletedByUid: user.uid,
                deletedByEmail: user.email || '',
                deletedByRole: 'dom',
                appVersion: (window.HM_RELEASE && window.HM_RELEASE.appVersion) || 'HearMe2nite',
                originalDay: daySnap.val() || null,
                originalDayAdmin: adminSnap.val() || null,
                restored: false
            };
            const updates = {};
            updates[`rooms/${roomCode}/deletedRecords/${date}`] = archive;
            updates[`rooms/${roomCode}/days/${date}`] = null;
            updates[`rooms/${roomCode}/dayAdmin/${date}`] = null;
            await db.ref().update(updates);
            showSaveStatus('🗑️ 기록 삭제 완료 · 30일 동안 복구 가능');
            if (typeof closeHistoryDetailModal === 'function') closeHistoryDetailModal();
        } catch (err) {
            hmReportError('deleteRecord', err, hmIsFirebasePermissionError(err) ? '❌ 삭제 보관 권한 없음 · Firebase Rules 배포를 확인하세요.' : '❌ 기록 삭제 실패');
        }
    }

    async function copyDirectText(event, date) {
        event.stopPropagation();
        const roomCode = getRoomCodeForData();
        if (!(await hmRequireRoomAccess('기록 복사', roomCode))) { alert('복사 권한이 없습니다.'); return; }
        try {
            const record = await hmLoadMergedDayRecord(roomCode, date);
            if (record) executeCopy(record.fullText);
        } catch (err) {
            hmReportError('copyDirectText', err, hmIsFirebasePermissionError(err) ? '❌ 복사 권한 없음' : '❌ 기록 복사 실패');
        }
    }

    // =========================================================



    // MODULE: HISTORY / PANEL MODAL



    // Split-ready target: openHistoryPanelModal



    // =========================================================



    
    // =========================================================
    // RC2 v2.6.0 STEP2 QA NOTE
    // 아래 History 영역에는 과거 RC 누적 과정에서 동일 이름 함수(displayHistory/renderCalendar 등)가 여러 번 선언되어 있다.
    // 브라우저에서는 마지막 선언이 실제로 적용되므로 이번 STEP2에서는 제거하지 않는다.
    // STEP3에서 기능 검증 후 중복 제거/통합 대상으로 다룬다.
    // RC2 v2.6.0 QA NOTE: duplicate history renderer names
    // ---------------------------------------------------------
    // 이 파일은 기존 RC 단계 누적 과정에서 displayHistory / renderCalendar 등
    // 일부 History 함수명이 뒤쪽에서 재정의되는 구조를 포함한다.
    // JS 동작상 마지막 선언이 최종 적용되므로, STEP 1에서는 기능 보존을 위해
    // 중복 제거를 하지 않는다. STEP 3에서 QA 후 안전하게 통합한다.
    // =========================================================
// 기록실 메인 팝업 열기
// Calendar/사진 썸네일/선택 날짜 카드가 한 패널 안에서 동작한다.

    // =========================================================
    // MODULE 17. HISTORY PANEL / CALENDAR / DETAIL POPUP
    // 분리 후보: history.js
    // 지난 기록실 팝업, 캘린더, 사진 썸네일, 날짜별 상세 팝업을 담당한다.
    // STEP3에서 중복 렌더 함수 정리 완료.
    // =========================================================
function openHistoryPanelModal() {
        openModalOverlayById('historyPanelOverlay');
    }

    function closeHistoryPanelModal() {
        closeModalOverlayById('historyPanelOverlay');
    }

/* RC2 v2.6.0 STEP3: removed duplicate earlier `updateHistoryLaunchSub()` implementation; final implementation below is authoritative. */



    /* =========================================================
       RC2 v2.6.0 STEP3: 중복 함수 정리 완료
       - displayHistory / renderCalendar / renderPhotoThumbs 등 History 중복 선언 제거
       - 브라우저에서 실제 적용되던 '마지막 선언'만 보존
       - Firebase / Room / DB Key / AutoSave / 저장 구조 변경 없음
       - 기존 onclick/API 함수명은 유지하여 HTML 이벤트 연결 보호
       ========================================================= */

    /* =========================================================
       RC2 v2.3.0 History Popup UI Override
       - 저장/삭제/권한/데이터 구조는 기존 함수 재사용
       ========================================================= */
    // =========================================================
    // MODULE: HISTORY / FORMAT HELPERS
    // Split-ready target: formatHistoryDateLabel
    // =========================================================
    function formatHistoryDateLabel(date) {
        if (!date) return '날짜 없음';
        const parts = date.split('-');
        if (parts.length !== 3) return date;
        return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }

    function getHistoryMoodIcon(record) {
        const mood = record?.mood || '';
        if (mood === 'great') return '😊';
        if (mood === 'okay') return '🙂';
        if (mood === 'normal') return '😐';
        if (mood === 'hard') return '😞';
        if (mood === 'veryHard') return '😭';
        return (typeof hmRecordHasMoments === 'function' ? hmRecordHasMoments(record) : !!record?.photo) ? '🖼️' : '📝';
    }

    function getHistoryMissionText(record) {
        if (record?.missionSummary && record.missionSummary !== '기록 없음') return record.missionSummary;
        const missions = Array.isArray(record?.missions) ? record.missions : [];
        if (!missions.length) return '';
        const done = missions.filter(m => m.done).length;
        return `${done}/${missions.length} 완료`;
    }

    function makeHistoryChip(text) {
        return text ? `<span class="history-chip">${escapeHtml(String(text))}</span>` : '';
    }

/* RC2 v2.6.0 STEP3: removed duplicate earlier `displayHistory()` implementation; final implementation below is authoritative. */


    // =========================================================

    // MODULE: HISTORY / DETAIL BLOCK

    // Split-ready target: historyDetailBlock

    // =========================================================

    function historyDetailBlock(title, body) {
        if (!body || body === '기록 없음') return '';
        return `<div class="history-detail-block"><div class="history-detail-block-title">${title}</div><div class="history-detail-block-body">${escapeHtml(String(body))}</div></div>`;
    }

    // =========================================================

    // MODULE: HISTORY / DETAIL MODAL

    // Split-ready target: openHistoryDetailModal

    // =========================================================

    // 기록 상세 팝업 열기
    // 선택한 날짜의 저장 필드를 읽기 전용 상세 카드로 렌더링한다.
    function openHistoryDetailModal(date) {
        const record = cachedDaysData && cachedDaysData[date] ? cachedDaysData[date] : null;
        if (!record) return;
        const overlay = document.getElementById('historyDetailOverlay');
        const title = document.getElementById('historyDetailTitle');
        const content = document.getElementById('historyDetailContent');
        if (!overlay || !title || !content) return;
        title.innerText = `${getHistoryMoodIcon(record)} ${formatHistoryDateLabel(date)}`;
        const missionText = getHistoryMissionText(record);
        const meals = [
            record.mealBreakfast ? `아침: ${record.mealBreakfast}` : '',
            record.mealLunch ? `점심: ${record.mealLunch}` : '',
            record.mealDinner ? `저녁: ${record.mealDinner}` : ''
        ].filter(Boolean).join('\n');
        const dailyBase = [
            record.wakeTime ? `☀️ 기상: ${record.wakeTime}` : '',
            record.sleepTime ? `🌙 취침 예정: ${record.sleepTime}` : '',
            record.water ? `💧 수분: ${record.water}` : '',
            record.exercise ? `🏃 운동: ${record.exercise}` : '',
            record.weight ? `⚖️ 체중: ${record.weight}` : ''
        ].filter(Boolean).join('\n');
        content.innerHTML = `
            ${record.photo ? `<img src="${record.photo}" class="history-detail-photo" alt="${date} 사진">` : ''}
            ${historyDetailBlock('😊 오늘의 기분', [record.moodLabel, record.moodNote].filter(Boolean).join('\n'))}
            ${historyDetailBlock('🎯 오늘의 미션', missionText)}
            ${historyDetailBlock('☀️ 기본 기록', dailyBase)}
            ${historyDetailBlock('🥗 식사 기록', meals)}
            ${historyDetailBlock('🚶 외출 기록', record.goingOut)}
            ${historyDetailBlock('📝 오늘의 하루', record.diary)}
            ${historyDetailBlock('💌 주인의 피드백', record.replyMessage)}
            ${historyDetailBlock('🎁 오늘의 선물', [record.dailyChoiceLabel, record.rewardNote].filter(Boolean).join('\n'))}
            <button type="button" class="history-detail-copy" data-hm-action="copy-history-record" data-hm-value="${date}">📋 이 기록 복사하기</button>
        `;
        openModalOverlayById('historyDetailOverlay');
    }

    function closeHistoryDetailModal() {
        closeModalOverlayById('historyDetailOverlay');
    }

    function toggleHistoryItem(date) {
        openHistoryDetailModal(date);
    }


    /* =========================================================
       RC2 v2.3.0 Role Permissions Override
       - 기록실 팝업 상단 요약 제거
       - 날짜별 전체 리스트 제거
       - 캘린더에서 선택한 날짜 1개만 카드로 표시
       - Firebase / Room / 저장 / 삭제 구조 변경 없음
       ========================================================= */
    let selectedHistoryDate = '';
    let hmHistoryCalendarViewDate = '';

    function hmHistoryGetMergedData() {
        try {
            if (typeof hmMergeAllDaySecurityRecords === 'function') {
                return hmMergeAllDaySecurityRecords(cachedDaysData || {}, cachedDayAdminData || {});
            }
        } catch (err) {
            console.warn('[HearMe2nite][HISTORY] merged cache fallback', err);
        }
        return cachedDaysData || {};
    }
    window.hmHistoryGetMergedData = hmHistoryGetMergedData;

    function hmHistoryTodayYmd() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    function hmHistorySetCalendarViewFromDate(date) {
        const base = date ? new Date(date + 'T00:00:00') : new Date();
        if (Number.isNaN(base.getTime())) return;
        hmHistoryCalendarViewDate = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-01`;
        window.hmHistoryCalendarViewDate = hmHistoryCalendarViewDate;
    }

    function hmHistoryGetCalendarViewBase(daysData) {
        if (!hmHistoryCalendarViewDate) {
            const current = selectedHistoryDate || document.getElementById('recordDate')?.value || hmHistoryTodayYmd();
            hmHistorySetCalendarViewFromDate(current);
        }
        const base = new Date(hmHistoryCalendarViewDate + 'T00:00:00');
        return Number.isNaN(base.getTime()) ? new Date() : base;
    }

    const hmHistoryMonthSyncState = new Map();

    async function hmHistorySyncVisibleMonthFromServer(force) { if (typeof window.hmIsRelationshipDataLocked === 'function' && window.hmIsRelationshipDataLocked()) return false;
        const roomCode = String(typeof activeRoomCode !== 'undefined' ? activeRoomCode || '' : '').trim();
        if (!roomCode || typeof db === 'undefined' || !db) return false;
        const base = hmHistoryGetCalendarViewBase(hmHistoryGetMergedData());
        const year = base.getFullYear();
        const month = String(base.getMonth() + 1).padStart(2, '0');
        const monthKey = `${roomCode}:${year}-${month}`;
        const previous = hmHistoryMonthSyncState.get(monthKey);
        if (!force && (previous === 'pending' || previous === 'done')) return previous === 'done';
        hmHistoryMonthSyncState.set(monthKey, 'pending');
        const startKey = `${year}-${month}-01`;
        const endKey = `${year}-${month}-31`;
        try {
            const [daysSnap, adminSnap] = await Promise.all([
                db.ref(`rooms/${roomCode}/days`).orderByKey().startAt(startKey).endAt(endKey).once('value'),
                db.ref(`rooms/${roomCode}/dayAdmin`).orderByKey().startAt(startKey).endAt(endKey).once('value')
            ]);
            if (roomCode !== activeRoomCode || (typeof window.hmIsRelationshipDataLocked === 'function' && window.hmIsRelationshipDataLocked())) { hmHistoryMonthSyncState.delete(monthKey); return false; }
            const monthDays = daysSnap.val() || {};
            const monthAdmin = adminSnap.val() || {};
            cachedDaysData = cachedDaysData || {};
            cachedDayAdminData = cachedDayAdminData || {};
            Object.assign(cachedDaysData, monthDays);
            Object.assign(cachedDayAdminData, monthAdmin);
            hmHistoryMonthSyncState.set(monthKey, 'done');
            const merged = hmHistoryGetMergedData();
            displayHistory(merged);
            console.info('[HearMe2nite][HISTORY_MONTH_SYNC] 월별 서버 기록 동기화 완료', {
                roomCode,
                month: `${year}-${month}`,
                days: Object.keys(monthDays).length,
                dayAdmin: Object.keys(monthAdmin).length,
                dates: Array.from(new Set([...Object.keys(monthDays), ...Object.keys(monthAdmin)])).sort()
            });
            return true;
        } catch (err) {
            hmHistoryMonthSyncState.delete(monthKey); if (typeof window.hmIsRelationshipDataLocked === 'function' && window.hmIsRelationshipDataLocked()) return false;
            if (typeof hmReportError === 'function') hmReportError('hmHistorySyncVisibleMonthFromServer', err, '❌ 기록실 월별 서버 확인 실패');
            else console.error('[HearMe2nite][HISTORY_MONTH_SYNC]', err);
            return false;
        }
    }
    window.hmHistorySyncVisibleMonthFromServer = hmHistorySyncVisibleMonthFromServer;

    function hmHistoryChangeMonth(delta) {
        const base = hmHistoryGetCalendarViewBase(cachedDaysData || {});
        base.setMonth(base.getMonth() + Number(delta || 0));
        hmHistorySetCalendarViewFromDate(`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-01`);
        if (cachedDaysData || cachedDayAdminData) displayHistory(hmHistoryGetMergedData());
        hmHistorySyncVisibleMonthFromServer(false);
    }

    function hmHistoryGoToday() {
        hmHistorySetCalendarViewFromDate(hmHistoryTodayYmd());
        selectedHistoryDate = hmHistoryTodayYmd();
        if (cachedDaysData || cachedDayAdminData) displayHistory(hmHistoryGetMergedData());
    }

    window.hmHistoryChangeMonth = hmHistoryChangeMonth;
    window.hmHistoryGoToday = hmHistoryGoToday;

    function renderHistorySummary(daysData) {
        const box = document.getElementById('historySummary');
        if (box) box.innerHTML = '';
    }

/* RC2 v2.6.0 STEP3: removed duplicate earlier `renderCalendar()` implementation; final implementation below is authoritative. */


    function updateHistoryLaunchSub(daysData) {
        const sub = document.getElementById('historyLaunchSub');
        if (!sub) return;
        const dates = Object.keys(daysData || {});
        const photos = Object.values(daysData || {}).reduce((sum, record) => sum + (typeof hmRecordMomentCount === 'function' ? hmRecordMomentCount(record) : (record?.photo ? 1 : 0)), 0);
        sub.textContent = dates.length ? `총 ${dates.length}일 기록 · 사진 ${photos}장 · 날짜를 눌러 확인` : '캘린더에서 날짜를 선택하면 해당 기록만 보여요.';
    }

    function selectHistoryDate(date) {
        selectedHistoryDate = date;
        hmHistorySetCalendarViewFromDate(date);
        const filterInput = document.getElementById('historyFilterDate');
        if (filterInput) filterInput.value = date;
        if (cachedDaysData || cachedDayAdminData) displayHistory(hmHistoryGetMergedData());
        // RC2.12.2: 캘린더 날짜를 누르면 하단 카드 경유 없이 바로 하루 기록 팝업을 연다.
        setTimeout(() => openHistoryDetailModal(date), 0);
    }

    function applyHistoryFilter() {
        const filterInput = document.getElementById('historyFilterDate');
        selectedHistoryDate = filterInput ? filterInput.value : selectedHistoryDate;
        if (cachedDaysData || cachedDayAdminData) displayHistory(hmHistoryGetMergedData());
    }

    function clearHistoryFilter() {
        selectedHistoryDate = '';
        const filterInput = document.getElementById('historyFilterDate');
        if (filterInput) filterInput.value = '';
        if (cachedDaysData || cachedDayAdminData) displayHistory(hmHistoryGetMergedData());
    }

/* RC2 v2.6.0 STEP3: removed duplicate earlier `displayHistory()` implementation; final implementation below is authoritative. */



    /* =========================================================
       RC2 v2.5.7 Chat UI Premium Override
       - 기존 daysData / deleteRecord / openHistoryDetailModal 데이터 흐름 유지
       ========================================================= */
    // =========================================================
    // MODULE: HISTORY / OVERVIEW STATS
    // Split-ready target: getHistoryOverviewStats
    // =========================================================
    function getHistoryOverviewStats(daysData) {
        const dates = Object.keys(daysData || {}).sort();
        const records = dates.map(date => daysData[date] || {});
        const photos = records.reduce((sum, record) => sum + (typeof hmRecordMomentCount === 'function' ? hmRecordMomentCount(record) : (record?.photo ? 1 : 0)), 0);
        const missionDays = records.filter(record => getHistoryMissionText(record)).length;
        const latest = dates.length ? formatHistoryDateLabel(dates[dates.length - 1]) : '-';
        return { total: dates.length, photos, missionDays, latest };
    }

    // =========================================================

    // MODULE: HISTORY / HERO RENDER

    // Split-ready target: renderHistoryHero

    // =========================================================

    // 기록실 상단 요약 렌더링
    // 총 기록일/사진/미션/최근 기록 정보를 카드로 보여준다.
    function renderHistoryHero(daysData) {
        const box = document.getElementById('historyHero');
        if (!box) return;
        // RC2.15: 기록실 하단 통계 카드는 삭제한다. 데이터 계산 함수는 호환을 위해 남겨두되 화면에는 출력하지 않는다.
        box.innerHTML = '';
        box.style.display = 'none';
    }

    function renderCalendar(daysData) {
        const box = document.getElementById('calendarBox');
        if (!box) return;
        box.classList.add('history-calendar-premium');
        const current = selectedHistoryDate || document.getElementById('recordDate')?.value || '';
        const base = current ? new Date(current + 'T00:00:00') : new Date();
        const year = base.getFullYear();
        const month = base.getMonth();
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const today = new Date();
        const todayYmd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        const week = ['일','월','화','수','목','금','토'];
        const monthRecords = Object.keys(daysData || {}).filter(date => date.startsWith(`${year}-${String(month+1).padStart(2,'0')}-`)).length;
        let html = `<div class="history-calendar-title-row"><div><strong>📅 ${year}.${String(month+1).padStart(2,'0')} 기록 캘린더</strong><br><span>기록이 있는 날짜를 누르면 아래에 카드가 열립니다.</span></div><span>${monthRecords}일 기록</span></div><div class="calendar-grid history-calendar-grid">`;
        html += week.map(w => `<div class="calendar-head">${w}</div>`).join('');
        for (let i = 0; i < first.getDay(); i++) html += '<div class="calendar-day"></div>';
        for (let day = 1; day <= last.getDate(); day++) {
            const ymd = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const rec = (daysData || {})[ymd];
            const icons = rec ? `${(typeof hmRecordHasMoments === 'function' ? hmRecordHasMoments(rec) : !!rec.photo) ? '📷' : ''}${getHistoryMissionText(rec) ? '🎯' : ''}${rec.mood === 'hard' || rec.mood === 'veryHard' ? '☁️' : ''}` : '';
            html += `<div class="calendar-day ${rec ? 'has-record' : ''} ${ymd === todayYmd ? 'today' : ''} ${ymd === selectedHistoryDate ? 'selected-record' : ''}" ${rec ? `data-hm-action="select-history-date" data-hm-value="${ymd}"` : ''}>${day}<span class="calendar-icons">${icons}</span></div>`;
        }
        html += '</div>';
        box.innerHTML = html;
    }

    function hmHistoryPhotoCountText(record) {
        const count = typeof hmRecordMomentCount === 'function' ? hmRecordMomentCount(record) : (record?.photo ? 1 : 0);
        return count ? `사진 ${count}장` : '사진 없음';
    }

    let hmHistoryGalleryDates = [];
    let hmHistoryGalleryVisibleCount = 9;

    function hmGetHistoryPhotoItems(daysData) {
        return Object.keys(daysData || {})
            .sort((a, b) => new Date(b) - new Date(a))
            .flatMap(date => {
                const record = daysData[date] || {};
                const moments = typeof hmGetRecordMoments === 'function'
                    ? hmGetRecordMoments(record)
                    : (record.photo ? [{ id:'legacy-photo', dataUrl:record.photo }] : []);
                return moments.slice().reverse().map(moment => ({
                    date,
                    id: moment.id,
                    src: moment.url || moment.dataUrl || ''
                }));
            })
            .filter(item => item.src);
    }

    function ensureHistoryPhotoGalleryModal() {
        let overlay = document.getElementById('historyPhotoGalleryOverlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'historyPhotoGalleryOverlay';
        overlay.className = 'daily-modal-overlay history-photo-gallery-overlay';
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('inert', '');
        overlay.innerHTML = `
            <div class="daily-modal history-photo-gallery-modal" role="dialog" aria-modal="true" aria-labelledby="historyPhotoGalleryTitle">
                <div class="daily-modal-head">
                    <div><h2 id="historyPhotoGalleryTitle">📷 사진 모아보기</h2><small id="historyPhotoGalleryCount"></small></div>
                    <button type="button" class="modal-close-btn" data-hm-action="close-history-photo-gallery">닫기</button>
                </div>
                <div id="historyPhotoGalleryGrid" class="history-photo-modal-grid"></div>
                <button type="button" id="historyPhotoGalleryMore" class="history-photo-more-btn" data-hm-action="load-more-history-photos">사진 9장 더 보기</button>
            </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', event => {
            if (event.target === overlay) closeHistoryPhotoGallery();
        });
        return overlay;
    }

    function renderHistoryPhotoGalleryModal() {
        const overlay = ensureHistoryPhotoGalleryModal();
        const grid = overlay.querySelector('#historyPhotoGalleryGrid');
        const count = overlay.querySelector('#historyPhotoGalleryCount');
        const more = overlay.querySelector('#historyPhotoGalleryMore');
        const visibleDates = hmHistoryGalleryDates.slice(0, hmHistoryGalleryVisibleCount);
        if (count) count.textContent = `전체 ${hmHistoryGalleryDates.length}장 · 최신순`;
        if (grid) {
            grid.innerHTML = visibleDates.map(item => {
                return `<button type="button" class="history-photo-modal-item" data-hm-action="open-history-photo-detail" data-hm-value="${item.date}" aria-label="${escapeHtml(formatHistoryDateLabel(item.date))} 사진 기록 열기">
                    <img src="${escapeHtml(item.src)}" alt="${escapeHtml(formatHistoryDateLabel(item.date))} 사진" loading="lazy">
                    <span>${escapeHtml(formatHistoryDateLabel(item.date))}</span>
                </button>`;
            }).join('');
        }
        if (more) {
            const remaining = hmHistoryGalleryDates.length - visibleDates.length;
            more.hidden = remaining <= 0;
            more.textContent = remaining > 0 ? `사진 ${Math.min(9, remaining)}장 더 보기` : '';
        }
    }

    function openHistoryPhotoGallery() {
        hmHistoryGalleryDates = hmGetHistoryPhotoItems(window.cachedDaysData || cachedDaysData || {});
        hmHistoryGalleryVisibleCount = 9;
        renderHistoryPhotoGalleryModal();
        if (typeof openModalOverlayById === 'function') openModalOverlayById('historyPhotoGalleryOverlay');
        else {
            const overlay = ensureHistoryPhotoGalleryModal();
            overlay.removeAttribute('inert');
            overlay.style.display = 'flex';
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeHistoryPhotoGallery() {
        if (typeof closeModalOverlayById === 'function') closeModalOverlayById('historyPhotoGalleryOverlay');
        else {
            const overlay = document.getElementById('historyPhotoGalleryOverlay');
            if (overlay) { if (overlay.contains(document.activeElement) && document.activeElement.blur) document.activeElement.blur(); overlay.style.display = 'none'; overlay.setAttribute('inert', ''); overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('inert', ''); }
        }
    }

    function loadMoreHistoryPhotos() {
        hmHistoryGalleryVisibleCount += 9;
        renderHistoryPhotoGalleryModal();
    }

    window.openHistoryPhotoGallery = openHistoryPhotoGallery;
    window.closeHistoryPhotoGallery = closeHistoryPhotoGallery;
    window.loadMoreHistoryPhotos = loadMoreHistoryPhotos;

    function renderPhotoThumbs(daysData) {
        const box = document.getElementById('photoThumbs');
        if (!box) return;
        const photos = hmGetHistoryPhotoItems(daysData);
        if (!photos.length) {
            box.innerHTML = `
                <button type="button" class="history-gallery-card history-gallery-card-empty" data-hm-action="open-history-photo-gallery" aria-label="사진 모아보기 열기">
                    <span class="history-gallery-mini-previews"><span class="history-gallery-empty-icon">📷</span></span>
                    <span class="history-gallery-card-copy"><strong>사진 모아보기</strong><small>저장된 사진 기록이 아직 없습니다.</small></span>
                    <span class="history-gallery-card-count">0장 <b>›</b></span>
                </button>`;
            return;
        }
        const previewDates = photos.slice(0, 3);
        const previewHtml = previewDates.map((item, index) => {
            const src = item.src || '';
            const extra = index === 2 && photos.length > 3 ? `<span class="history-gallery-more">+${photos.length - 2}</span>` : '';
            return `<span class="history-gallery-mini-thumb">${src ? `<img src="${escapeHtml(src)}" alt="${item.date} 사진 미리보기">` : '📷'}${extra}</span>`;
        }).join('');
        box.innerHTML = `
            <button type="button" class="history-gallery-card" data-hm-action="open-history-photo-gallery" aria-label="사진 ${photos.length}장 모아보기 열기">
                <span class="history-gallery-mini-previews">${previewHtml}</span>
                <span class="history-gallery-card-copy"><strong>📷 사진 모아보기</strong><small>최근 사진 3장을 미리 보고 전체 사진을 열어요.</small></span>
                <span class="history-gallery-card-count">${photos.length}장 <b>›</b></span>
            </button>`;
    }

    function displayHistory(daysData) {
    const historyList = document.getElementById('historyList');
    renderHistoryHero(daysData || {});
    renderHistorySummary(daysData || {});
    updateHistoryLaunchSub(daysData || {});
    renderCalendar(daysData || {});
    renderHistoryTimeline(daysData || {});
    renderPhotoThumbs(daysData || {});
    if (!historyList) return;
    if (!daysData || Object.keys(daysData).length === 0) {
        historyList.innerHTML = '<div class="empty-message">아직 저장된 서버 기록이 없습니다. ✨</div>';
        return;
    }
    const filtered = hmHistoryFilteredDates(daysData || {});
    if (!selectedHistoryDate) {
        const recordDate = document.getElementById('recordDate')?.value || '';
        selectedHistoryDate = filtered.includes(recordDate) ? recordDate : (filtered[0] || '');
        if (selectedHistoryDate && !hmHistoryCalendarViewDate) hmHistorySetCalendarViewFromDate(selectedHistoryDate);
    }
    if (selectedHistoryDate && !filtered.includes(selectedHistoryDate) && filtered.length) selectedHistoryDate = filtered[0];
    if (!filtered.length) {
        historyList.innerHTML = '<div class="history-selected-hint"><strong>검색 결과가 없습니다</strong>검색어 또는 필터를 초기화해 주세요.</div>';
        return;
    }

    const selectedRecord = selectedHistoryDate ? daysData[selectedHistoryDate] : null;
    const selectedCard = selectedRecord ? (() => {
        const missionText = getHistoryMissionText(selectedRecord);
        const diaryPreview = hmHistoryTimelinePreview(selectedRecord);
        const chips = hmHistorySummaryChips(selectedRecord);
        return `<button type="button" class="history-day-card history-premium-selected history-selected-record-card" data-hm-action="open-history-detail" data-hm-value="${selectedHistoryDate}">
            <span class="history-day-icon">${getHistoryMoodIcon(selectedRecord)}</span>
            <span class="history-day-main">
                <span class="history-day-title">${formatHistoryDateLabel(selectedHistoryDate)}의 기록</span>
                <span class="history-day-sub">${escapeHtml(diaryPreview)}${diaryPreview.length >= 78 ? '...' : ''}</span>
                <span class="history-day-chips">${chips}</span>
            </span>
            <span class="history-day-actions">
                <span class="history-card-arrow">›</span>
                <span class="btn-delete" data-hm-action="delete-history-record" data-hm-value="${selectedHistoryDate}">삭제</span>
            </span>
        </button>`;
    })() : '<div class="history-selected-hint"><strong>기록이 없습니다</strong>선택한 날짜에는 저장된 기록이 없습니다. 📅</div>';

    const recentCards = filtered.slice(0, 10).map(date => {
        const record = daysData[date] || {};
        const isSelected = date === selectedHistoryDate;
        const preview = hmHistoryTimelinePreview(record);
        const chips = hmHistorySummaryChips(record);
        return `<button type="button" class="history-story-row ${isSelected ? 'is-selected' : ''}" data-hm-action="select-history-date" data-hm-value="${date}">
            <span class="history-story-date"><strong>${String(new Date(date + 'T00:00:00').getDate()).padStart(2,'0')}</strong><small>${formatHistoryDateLabel(date).replace(/^\d+년\s*/, '')}</small></span>
            <span class="history-story-body"><strong>${getHistoryMoodIcon(record)} ${(typeof hmRecordHasMoments === 'function' ? hmRecordHasMoments(record) : !!record.photo) ? '사진과 함께한 기록' : '하루 기록'}</strong><small>${escapeHtml(preview)}${preview.length >= 78 ? '...' : ''}</small><em>${chips || '저장된 기록'}</em></span>
            <span class="history-story-arrow">›</span>
        </button>`;
    }).join('');

    historyList.innerHTML = `
        <section class="history-selected-record-section">
            <div class="history-section-headline">
                <div><strong>📝 선택한 날짜의 기록</strong><span>날짜를 누르면 하루 기록 팝업이 열립니다.</span></div>
            </div>
            ${selectedCard}
        </section>
        <section class="history-story-section">
            <div class="history-section-headline">
                <div><strong>📖 하루 기록</strong><span>최근 기록을 날짜별 카드로 정리했어요.</span></div>
            </div>
            <div class="history-story-list">${recentCards}</div>
        </section>`;
}




function buildHistorySubRoutineText(record) {
    const snapshot = Array.isArray(record?.subRoutineSnapshot) ? record.subRoutineSnapshot : [];
    if (!snapshot.length) return '';
    return snapshot.map(item => `${item.title || '나의 루틴'}: ${item.done === true ? '완료' : '미완료'}${item.scheduleLabel ? ` (${item.scheduleLabel})` : ''}`).join('\n');
}

function buildHistoryCustomRoutineText(record) {
    const values = record && record.customCardValues ? record.customCardValues : null;
    if (!values || typeof values !== 'object') return '';
    const blocks = [];
    Object.entries(values).forEach(([cardId, itemMap]) => {
        if (!itemMap || typeof itemMap !== 'object') return;
        const itemRows = Object.values(itemMap).filter(item => item && typeof item === 'object');
        const savedTitle = itemRows.find(item => item.cardTitle)?.cardTitle || '';
        const cardTitle = (typeof hmCustomCards !== 'undefined' && hmCustomCards?.[cardId]?.title) ? hmCustomCards[cardId].title : (savedTitle || '오늘의 약속');
        const lines = itemRows
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
            .map(item => {
                let value = item.value;
                if (item.type === 'checkbox') value = value === true ? '완료' : '미완료';
                if (value === undefined || value === null || value === '') value = '기록 없음';
                return `${item.label || '항목'}: ${value}`;
            }).filter(Boolean);
        if (lines.length) blocks.push(`🧩 ${cardTitle}\n${lines.join('\n')}`);
    });
    return blocks.join('\n\n');
}


// STEP6.2.9: 과거 날짜에 저장된 스냅샷만 사용해 요약 완료 수를 계산한다.
// 현재 카드/루틴 정의를 다시 읽지 않으므로 이후 설정 변경이 과거 기록 수치에 영향을 주지 않는다.
function getHistoryPromiseCompletion(record) {
    const values = record && record.customCardValues ? record.customCardValues : null;
    if (!values || typeof values !== 'object') return { done: 0, total: 0 };
    let done = 0;
    let total = 0;
    Object.values(values).forEach(itemMap => {
        if (!itemMap || typeof itemMap !== 'object') return;
        Object.values(itemMap).forEach(item => {
            if (!item || typeof item !== 'object') return;
            total += 1;
            if (item.type === 'checkbox') {
                if (item.value === true) done += 1;
                return;
            }
            if (item.value !== undefined && item.value !== null && String(item.value).trim() !== '') done += 1;
        });
    });
    return { done, total };
}

function getHistorySubRoutineCompletion(record) {
    const snapshot = Array.isArray(record?.subRoutineSnapshot) ? record.subRoutineSnapshot : [];
    const rows = snapshot.filter(item => item && typeof item === 'object');
    return {
        done: rows.filter(item => item.done === true).length,
        total: rows.length
    };
}

/* v0.9.23 History Detail Polish - UI only override, data structure preserved */
function hmHistoryValueText(value) {
    if (!value || value === '기록 없음') return '';
    return escapeHtml(String(value));
}
function historyDetailBlock(title, body) {
    if (!body || body === '기록 없음') return '';
    return `<section class="history-detail-block history-detail-polished-block"><div class="history-detail-block-title">${title}</div><div class="history-detail-block-body">${escapeHtml(String(body))}</div></section>`;
}
function historyMealDetailBlock(record, mealMoments) {
    const labels = { breakfast: '아침', lunch: '점심', dinner: '저녁' };
    const values = {
        breakfast: record?.mealBreakfast,
        lunch: record?.mealLunch,
        dinner: record?.mealDinner
    };
    const rows = Object.keys(labels).map((mealType) => {
        const photo = mealMoments.find((item) => item.mealType === mealType);
        const text = values[mealType] && values[mealType] !== '기록 없음' ? String(values[mealType]) : '';
        if (!photo && !text) return '';
        const src = photo ? escapeHtml(photo.url || photo.dataUrl || '') : '';
        return `<div class="history-meal-row${photo ? ' has-photo' : ''}">
            <div class="history-meal-copy"><strong>${labels[mealType]}</strong><span>${escapeHtml(text || '내용 기록 없음')}</span></div>
            ${photo ? `<img src="${src}" alt="${labels[mealType]} 식사 사진" loading="lazy">` : ''}
        </div>`;
    }).filter(Boolean).join('');
    if (!rows) return '';
    return `<section class="history-detail-block history-detail-polished-block history-meal-block"><div class="history-detail-block-title">🥗 식사 기록</div><div class="history-meal-list">${rows}</div></section>`;
}
async function openHistoryDetailModal(date) {
    const mergedCache = hmHistoryGetMergedData();
    let record = mergedCache && mergedCache[date] ? mergedCache[date] : null;
    const roomCode = getRoomCodeForData();

    // STEP5.10.11.3: Firebase에 날짜가 존재하지만 로컬 캐시/병합 타이밍 때문에
    // 기록실에서 보이지 않는 경우 해당 날짜를 서버에서 직접 다시 읽는다.
    if (roomCode && (!record || typeof record !== 'object')) {
        try {
            const [daySnap, adminSnap] = await Promise.all([
                db.ref(`rooms/${roomCode}/days/${date}`).once('value'),
                db.ref(`rooms/${roomCode}/dayAdmin/${date}`).once('value')
            ]);
            const publicDay = daySnap.val() || {};
            const adminDay = adminSnap.val() || {};
            if (daySnap.exists() || adminSnap.exists()) {
                record = typeof hmMergeDaySecurityRecord === 'function'
                    ? hmMergeDaySecurityRecord(publicDay, adminDay)
                    : Object.assign({}, publicDay, adminDay);
                cachedDaysData = cachedDaysData || {};
                cachedDayAdminData = cachedDayAdminData || {};
                if (daySnap.exists()) cachedDaysData[date] = publicDay;
                if (adminSnap.exists()) cachedDayAdminData[date] = adminDay;
                console.info('[HearMe2nite][HISTORY_RECOVERY] 서버 기록 직접 복구 표시', {
                    roomCode,
                    date,
                    hasDay: daySnap.exists(),
                    hasDayAdmin: adminSnap.exists()
                });
                displayHistory(hmHistoryGetMergedData());
            }
        } catch (err) {
            console.warn('[HearMe2nite][HISTORY_RECOVERY] 날짜 직접 조회 실패', { roomCode, date, err });
        }
    }

    if ((!record || !Array.isArray(record.subRoutineSnapshot) || !record.subRoutineSnapshot.length) && roomCode && typeof hmLoadMergedDayRecord === 'function') {
        try {
            const merged = await hmLoadMergedDayRecord(roomCode, date);
            if (merged && Object.keys(merged).length) record = Object.assign({}, record || {}, merged);
        } catch (err) {
            console.warn('openHistoryDetailModal.subRoutine', err);
        }
    }
    if (!record || !Object.keys(record).length) {
        if (typeof showToast === 'function') showToast('해당 날짜 기록을 서버에서 찾지 못했습니다.');
        console.warn('[HearMe2nite][HISTORY] 기록 없음', { roomCode, date });
        return;
    }
    const title = document.getElementById('historyDetailTitle');
    const content = document.getElementById('historyDetailContent');
    if (!title || !content) return;
    title.innerText = `${getHistoryMoodIcon(record)} ${formatHistoryDateLabel(date)}`;
    const meals = [record.mealBreakfast ? `아침: ${record.mealBreakfast}` : '', record.mealLunch ? `점심: ${record.mealLunch}` : '', record.mealDinner ? `저녁: ${record.mealDinner}` : ''].filter(Boolean).join('\n');
    const customRoutineText = buildHistoryCustomRoutineText(record);
    const subRoutineText = buildHistorySubRoutineText(record);
    const promiseCompletion = getHistoryPromiseCompletion(record);
    const routineCompletion = getHistorySubRoutineCompletion(record);
    const summaryItems = [
        record.moodLabel && record.moodLabel !== '기록 없음' ? record.moodLabel : '',
        promiseCompletion.total > 0 ? `💜 약속 ${promiseCompletion.done}/${promiseCompletion.total}` : '',
        routineCompletion.total > 0 ? `🌱 루틴 ${routineCompletion.done}/${routineCompletion.total}` : ''
    ].filter(Boolean).slice(0, 3);
    if (summaryItems.length < 3 && record.dailyChoiceLabel && record.dailyChoiceLabel !== '기록 없음') {
        summaryItems.push(record.dailyChoiceLabel);
    }
    const detailMoments = typeof hmGetRecordMoments === 'function' ? hmGetRecordMoments(record) : (record.photo ? [{ dataUrl:record.photo }] : []);
    const mealMoments = detailMoments.filter((item) => item.mealType);
    const ordinaryMoments = detailMoments.filter((item) => !item.mealType);
    if (summaryItems.length < 3 && ordinaryMoments.length) summaryItems.push(`📷 사진 ${ordinaryMoments.length}장`);
    else if (summaryItems.length < 3 && mealMoments.length) summaryItems.push(`🥗 식사 사진 ${mealMoments.length}장`);
    const summaryChips = summaryItems.slice(0, 3).map(makeHistoryChip).join('');
    content.innerHTML = `
        <div class="history-detail-summary-card">
            <div class="history-detail-summary-icon">${getHistoryMoodIcon(record)}</div>
            <div><strong>하루 한눈에 보기</strong><span>${summaryChips || '저장된 세부 내용을 확인해 주세요.'}</span></div>
        </div>
        ${ordinaryMoments.length ? `<div class="history-detail-moments">${ordinaryMoments.map((item, index) => `<img src="${escapeHtml(item.url || item.dataUrl || '')}" class="history-detail-photo" alt="${date} 일상 사진 ${index + 1}">`).join('')}</div>` : ''}
        ${historyDetailBlock('💜 오늘의 약속', customRoutineText)}
        ${historyDetailBlock('🌱 나의 루틴', subRoutineText)}
        ${historyDetailBlock('😊 오늘의 기분', [record.moodLabel, record.moodNote].filter(Boolean).join('\n'))}
        ${historyDetailBlock('⚖️ 체중', record.weight)}
        ${historyDetailBlock('🏃 오늘의 운동', record.exercise)}
        ${historyDetailBlock('💧 오늘의 수분', record.water)}
        ${historyDetailBlock('☀️ 기상 시간', record.wakeTime)}
        ${historyMealDetailBlock(record, mealMoments) || historyDetailBlock('🥗 식사 기록', meals)}
        ${historyDetailBlock('🚶 외출 기록', record.goingOut)}
        ${historyDetailBlock('🌙 취침 예정', record.sleepTime)}
        ${historyDetailBlock('📝 오늘의 하루', record.diary)}
        ${historyDetailBlock('💌 주인의 피드백', record.replyMessage)}
        ${historyDetailBlock('🎁 오늘의 선물', [record.dailyChoiceLabel, record.rewardNote].filter(Boolean).join('\n'))}
        <div class="history-detail-actions">
            <button type="button" class="history-detail-copy" data-hm-action="copy-history-record" data-hm-value="${date}">📋 이 기록 복사하기</button>
            <button type="button" class="history-detail-delete" data-hm-action="delete-history-record" data-hm-value="${date}">삭제</button>
        </div>`;
    if (typeof hmRenderHistoryConversations === 'function') hmRenderHistoryConversations(date, content);
    openModalOverlayById('historyDetailOverlay');
}

/* =========================================================
   HearMe2nite RC2.12 History 2.0 Stable Sprint
   - Firebase 저장 구조 변경 없음
   - 기존 days/{date} 기록을 날짜별 통합 타임라인으로 보강
   - 검색/필터는 클라이언트 렌더링만 수행
   ========================================================= */
let hmHistorySearchText = '';
let hmHistoryTypeFilter = 'all';

function hmHistoryRecordHasRoutine(record) {
    return !!(record && ((record.customCardValues && Object.keys(record.customCardValues || {}).length) || (Array.isArray(record.subRoutineSnapshot) && record.subRoutineSnapshot.length)));
}

function hmHistoryRecordText(record) {
    if (!record) return '';
    const customText = typeof buildHistoryCustomRoutineText === 'function' ? buildHistoryCustomRoutineText(record) : '';
    const parts = [
        record.date, record.wakeTime, record.water, record.exercise, record.weight,
        record.mealBreakfast, record.mealLunch, record.mealDinner,
        record.goingOut, record.sleepTime, record.diary, record.replyMessage,
        record.moodLabel, record.moodNote, record.missionSummary,
        record.dailyChoiceLabel, record.rewardNote, customText
    ];
    if (Array.isArray(record.missions)) {
        record.missions.forEach(m => parts.push(m && (m.title || m.text || m.label || m.memo)));
    }
    return parts.filter(Boolean).join(' ').toLowerCase();
}

function hmHistoryMatchesFilter(date, record) {
    const query = (hmHistorySearchText || '').trim().toLowerCase();
    if (query && !hmHistoryRecordText(record).includes(query) && !String(date || '').includes(query)) return false;
    if (hmHistoryTypeFilter === 'routine') return hmHistoryRecordHasRoutine(record);
    if (hmHistoryTypeFilter === 'mission') return !!getHistoryMissionText(record);
    if (hmHistoryTypeFilter === 'photo') return typeof hmRecordHasMoments === 'function' ? hmRecordHasMoments(record) : !!record?.photo;
    if (hmHistoryTypeFilter === 'mood') return !!(record?.moodLabel && record.moodLabel !== '기록 없음');
    return true;
}

function hmHistoryFilteredDates(daysData) {
    return Object.keys(daysData || {})
        .filter(date => hmHistoryMatchesFilter(date, daysData[date]))
        .sort((a, b) => new Date(b) - new Date(a));
}

function hmHistoryApplySearch() {
    const input = document.getElementById('historySearchInput');
    const select = document.getElementById('historyTypeFilter');
    hmHistorySearchText = input ? input.value : '';
    hmHistoryTypeFilter = select ? select.value : 'all';
    if (cachedDaysData || cachedDayAdminData) displayHistory(hmHistoryGetMergedData());
}

function hmHistoryClearSearch() {
    hmHistorySearchText = '';
    hmHistoryTypeFilter = 'all';
    const input = document.getElementById('historySearchInput');
    const select = document.getElementById('historyTypeFilter');
    if (input) input.value = '';
    if (select) select.value = 'all';
    if (cachedDaysData || cachedDayAdminData) displayHistory(hmHistoryGetMergedData());
}

function hmHistorySummaryChips(record) {
    const missionText = getHistoryMissionText(record);
    return [
        record?.moodLabel && record.moodLabel !== '기록 없음' ? record.moodLabel : '',
        record?.water ? `💧 ${record.water}` : '',
        record?.exercise ? `🏃 ${record.exercise}` : '',
        record?.weight ? `⚖️ ${record.weight}` : '',
        missionText ? `🎯 ${missionText}` : '',
        hmHistoryRecordHasRoutine(record) ? '💜 오늘의 약속' : '',
        (typeof hmRecordHasMoments === 'function' ? hmRecordHasMoments(record) : !!record?.photo) ? '📷 사진' : '',
        record?.dailyChoiceLabel && record.dailyChoiceLabel !== '기록 없음' ? record.dailyChoiceLabel : ''
    ].filter(Boolean).map(makeHistoryChip).join('');
}

function hmHistoryTimelinePreview(record) {
    if (!record) return '저장된 기록을 열어 확인하세요.';
    const diary = record.diary && record.diary !== '기록 없음' ? String(record.diary) : '';
    const routine = hmHistoryRecordHasRoutine(record) ? '오늘의 약속 포함' : '';
    const meal = [record.mealBreakfast, record.mealLunch, record.mealDinner].filter(v => v && v !== '기록 없음').length ? '식사 기록 포함' : '';
    return (diary || [routine, meal, getHistoryMissionText(record)].filter(Boolean).join(' · ') || '저장된 기록을 열어 확인하세요.').slice(0, 78);
}

function renderHistoryTimeline(daysData) {
    // RC2.12.1: 기록 목록이 캘린더 위로 길게 나열되지 않도록 비활성화.
    // History Center의 기준 UX는 “캘린더 먼저 → 선택 날짜 1건 표시”이다.
    const box = document.getElementById('historyTimeline');
    if (box) box.innerHTML = '';
}

function renderCalendar(daysData) {
    const box = document.getElementById('calendarBox');
    if (!box) return;
    box.classList.add('history-calendar-premium');
    const filtered = hmHistoryFilteredDates(daysData || {});
    const visibleSet = new Set(filtered);
    const base = hmHistoryGetCalendarViewBase(daysData || {});
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const today = new Date();
    const todayYmd = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const week = ['일','월','화','수','목','금','토'];
    const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}-`;
    const monthRecords = filtered.filter(date => date.startsWith(monthPrefix)).length;
    let html = `<div class="history-calendar-title-row history-calendar-nav-row">
        <button type="button" class="history-month-nav-btn" data-hm-action="change-history-month" data-hm-value="-1" aria-label="이전 달">‹</button>
        <div class="history-calendar-current-month">
            <div class="history-calendar-month-line">
                <strong>📅 ${year}년 ${String(month+1).padStart(2,'0')}월</strong>
                ${typeof window.hmGetTogetherDayBadgeHtml === 'function' ? window.hmGetTogetherDayBadgeHtml() : ''}
            </div>
            <span>달을 넘기며 기록과 기념일을 확인하세요.</span>
        </div>
        <button type="button" class="history-month-nav-btn" data-hm-action="change-history-month" data-hm-value="1" aria-label="다음 달">›</button>
        <button type="button" class="history-today-btn" data-hm-action="history-go-today">오늘</button>
        <span class="history-month-count">${monthRecords}일 기록</span>
    </div><div class="calendar-grid history-calendar-grid">`;
    html += week.map(w => `<div class="calendar-head">${w}</div>`).join('');
    for (let i = 0; i < first.getDay(); i++) html += '<div class="calendar-day empty-day" aria-hidden="true"></div>';
    for (let day = 1; day <= last.getDate(); day++) {
        const ymd = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const rec = (daysData || {})[ymd];
        const visible = rec && visibleSet.has(ymd);
        const icons = visible ? `${(typeof hmRecordHasMoments === 'function' ? hmRecordHasMoments(rec) : !!rec.photo) ? '📷' : ''}${getHistoryMissionText(rec) ? '🎯' : ''}${hmHistoryRecordHasRoutine(rec) ? '🧩' : ''}${rec.mood === 'hard' || rec.mood === 'veryHard' ? '☁️' : ''}` : '';
        const clickable = visible ? `data-hm-action="select-history-date" data-hm-value="${ymd}"` : '';
        html += `<div class="calendar-day ${visible ? 'has-record' : ''} ${ymd === todayYmd ? 'today' : ''} ${ymd === selectedHistoryDate ? 'selected-record' : ''}" ${clickable}>${day}<span class="calendar-icons">${icons}</span></div>`;
    }
    html += '</div>';
    box.innerHTML = html;
    // STEP5.10.13: 캘린더는 전체 Room 캐시만 신뢰하지 않고 현재 표시 월을 서버에서 직접 대조한다.
    // 데이터가 Firebase에 있지만 캐시에서 누락된 날짜도 자동으로 복원 표시한다.
    setTimeout(() => hmHistorySyncVisibleMonthFromServer(false), 0);
}
function displayHistory(daysData) {
    const historyList = document.getElementById('historyList');
    renderHistoryHero(daysData || {});
    renderHistorySummary(daysData || {});
    updateHistoryLaunchSub(daysData || {});
    renderCalendar(daysData || {});
    renderHistoryTimeline(daysData || {});
    renderPhotoThumbs(daysData || {});
    if (!historyList) return;
    if (!daysData || Object.keys(daysData).length === 0) {
        historyList.innerHTML = '<div class="empty-message">아직 저장된 서버 기록이 없습니다. ✨</div>';
        return;
    }
    const filtered = hmHistoryFilteredDates(daysData || {});
    if (!selectedHistoryDate) {
        const recordDate = document.getElementById('recordDate')?.value || '';
        selectedHistoryDate = filtered.includes(recordDate) ? recordDate : (filtered[0] || '');
        if (selectedHistoryDate && !hmHistoryCalendarViewDate) hmHistorySetCalendarViewFromDate(selectedHistoryDate);
    }
    if (selectedHistoryDate && !filtered.includes(selectedHistoryDate) && filtered.length) selectedHistoryDate = filtered[0];
    if (!filtered.length) {
        historyList.innerHTML = '<div class="history-selected-hint"><strong>검색 결과가 없습니다</strong>검색어 또는 필터를 초기화해 주세요.</div>';
        return;
    }
    const record = daysData[selectedHistoryDate];
    if (!record) {
        historyList.innerHTML = '<div class="history-selected-hint"><strong>기록이 없습니다</strong>선택한 날짜에는 저장된 기록이 없습니다. 📅</div>';
        return;
    }
    historyList.innerHTML = '';
}


// =========================================================
// STEP5.10.11 RECORD DELETION AUDIT MANAGEMENT
// - Keeps a 30-day recoverable snapshot under deletedRecords.
// - Shows deletion history to both Room members.
// - Allows Dom/Owner to restore while preserving the audit entry.
// =========================================================
(function () {
    let deletionRoomCode = '';
    let deletionRef = null;
    let deletionItems = {};
    let deletionFilter = 'all';

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
    }
    function fmt(ts) {
        const n = Number(ts || 0);
        if (!n) return '시간 확인 중';
        return new Date(n).toLocaleString('ko-KR', {year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});
    }
    function currentUid() {
        const u = auth.currentUser;
        return u ? u.uid : '';
    }
    function canRestore() {
        try { return typeof canManageRelationshipCards === 'function' && canManageRelationshipCards(); }
        catch (_) { return false; }
    }
    function unseen(item) {
        const uid = currentUid();
        return uid && !(item.seenBy && item.seenBy[uid]);
    }
    function daysRemaining(item) {
        const ms = Number(item.expiresAt || 0) - Date.now();
        return Math.max(0, Math.ceil(ms / 86400000));
    }
    function actorLabel(item) {
        const email = String(item.deletedByEmail || '').trim();
        return email ? `관리(Dom) · ${email}` : '관리(Dom)';
    }
    function itemStatus(item) {
        if (item.restored === true) return 'restored';
        if (Number(item.expiresAt || 0) < Date.now()) return 'expired';
        return 'active';
    }
    function render() {
        const allItems = Object.values(deletionItems || {}).filter(Boolean).sort((a,b) => Number(b.deletedAtClient || b.deletedAt || 0) - Number(a.deletedAtClient || a.deletedAt || 0));
        const active = allItems.filter((item) => itemStatus(item) === 'active');
        const unseenCount = active.filter(unseen).length;
        const home = document.getElementById('recordDeletionNoticeHome');
        const panel = document.getElementById('recordDeletionNoticeHistory');
        if (home) {
            if (!active.length || !unseenCount) home.hidden = true;
            else {
                home.hidden = false;
                home.innerHTML = `<button type="button" class="record-deletion-home-button" data-hm-action="open-history-panel"><span>🗑️</span><span><strong>삭제된 기록 ${unseenCount}건을 확인해 주세요</strong><small>삭제 날짜·삭제자·시간을 기록실에서 확인할 수 있습니다.</small></span><span>›</span></button>`;
            }
        }
        if (!panel) return;
        if (!allItems.length) { panel.hidden = true; panel.innerHTML = ''; const modalContent=document.getElementById('recordDeletionModalContent'); if(modalContent) modalContent.innerHTML=''; return; }
        const counts = {
            all: allItems.length,
            active: allItems.filter((item) => itemStatus(item) === 'active').length,
            restored: allItems.filter((item) => itemStatus(item) === 'restored').length,
            expired: allItems.filter((item) => itemStatus(item) === 'expired').length
        };
        const items = deletionFilter === 'all' ? allItems : allItems.filter((item) => itemStatus(item) === deletionFilter);
        panel.hidden = false;
        panel.innerHTML = `<button type="button" class="record-deletion-compact-card ${unseenCount ? 'has-unseen' : ''}" data-hm-action="open-deleted-records">
            <span class="record-deletion-compact-icon">🗑️</span>
            <span class="record-deletion-compact-copy"><strong>삭제된 기록 ${counts.all}건</strong><small>${counts.active}건 복구 가능${unseenCount ? ` · ${unseenCount}건 미확인` : ''}</small></span>
            <span class="record-deletion-compact-arrow">›</span>
        </button>`;
        const modalContent = document.getElementById('recordDeletionModalContent');
        if (modalContent) modalContent.innerHTML = `<section class="record-deletion-panel record-deletion-panel-modal">
            <div class="record-deletion-head"><div><strong>삭제 기록 관리</strong><small>삭제·확인·복구 이력은 데이터 손실 원인을 확인하기 위해 보존됩니다.</small></div></div>
            <div class="record-deletion-summary">
                <span><strong>${counts.active}</strong><small>복구 가능</small></span>
                <span><strong>${counts.restored}</strong><small>복구 완료</small></span>
                <span><strong>${counts.expired}</strong><small>기간 만료</small></span>
                <span><strong>${unseenCount}</strong><small>미확인</small></span>
            </div>
            <div class="record-deletion-filters" role="tablist" aria-label="삭제 기록 상태 필터">
                ${[['all','전체',counts.all],['active','복구 가능',counts.active],['restored','복구 완료',counts.restored],['expired','기간 만료',counts.expired]].map(([key,label,count]) => `<button type="button" class="${deletionFilter===key?'active':''}" data-hm-action="set-deleted-record-filter" data-hm-value="${key}">${label} ${count}</button>`).join('')}
            </div>
            <div class="record-deletion-list">${items.length ? items.map((item) => {
                const status = itemStatus(item);
                const isRestored = status === 'restored';
                const isExpired = status === 'expired';
                const showRestore = status === 'active' && canRestore();
                const remaining = daysRemaining(item);
                const seenCount = item.seenBy ? Object.keys(item.seenBy).length : 0;
                const statusText = isRestored ? '복구 완료' : (isExpired ? '복구 기간 만료' : `복구 가능 · ${remaining}일 남음`);
                return `<article class="record-deletion-item ${unseen(item)?'is-unseen':''} ${isRestored?'is-restored':''} ${isExpired?'is-expired':''}">
                    <div class="record-deletion-main"><div class="record-deletion-title"><strong>${esc(item.recordDate || '날짜 미상')} 기록</strong><span class="record-deletion-status ${status}">${statusText}</span></div>
                    <small>삭제: ${fmt(item.deletedAtClient || item.deletedAt)}</small><small>삭제자: ${esc(actorLabel(item))}</small>
                    <small>사유: 수동 삭제 · 버전 ${esc(item.appVersion || '확인 불가')}</small>
                    ${isRestored?`<small>복구: ${fmt(item.restoredAtClient || item.restoredAt)} · ${esc(item.restoredByEmail || item.restoredByUid || 'Dom')}</small>`:''}
                    <small>Room 확인 기록: ${seenCount}명</small></div>
                    <div class="record-deletion-actions">${unseen(item)?`<button type="button" data-hm-action="acknowledge-deleted-record" data-hm-value="${esc(item.recordDate)}">확인</button>`:''}${showRestore?`<button type="button" class="restore" data-hm-action="restore-deleted-record" data-hm-value="${esc(item.recordDate)}">복구</button>`:''}</div>
                </article>`;
            }).join('') : '<div class="record-deletion-empty">선택한 상태의 삭제 기록이 없습니다.</div>'}</div>
        </section>`;
    }
    window.openDeletedRecordsModal = function () {
        const overlay = document.getElementById('recordDeletionModalOverlay');
        if (!overlay) return;
        overlay.hidden = false; overlay.style.display = 'flex'; overlay.removeAttribute('inert');
        document.body.classList.add('modal-open');
    };
    window.closeDeletedRecordsModal = function () {
        const overlay = document.getElementById('recordDeletionModalOverlay');
        if (!overlay) return;
        overlay.hidden = true; overlay.style.display = 'none'; overlay.setAttribute('inert','');
        document.body.classList.remove('modal-open');
    };
    window.hmSetDeletedRecordFilter = function (filter) {
        deletionFilter = ['all','active','restored','expired'].includes(filter) ? filter : 'all';
        render();
    };
    function detach() {
        if (deletionRef) deletionRef.off();
        deletionRef = null; deletionRoomCode = ''; deletionItems = {};
        render();
    }
    function attach() {
        if (typeof auth === 'undefined' || typeof db === 'undefined') return;
        const user = auth.currentUser;
        const room = (typeof getRoomCodeForData === 'function' && getRoomCodeForData()) || '';
        if (!user || !room) { if (deletionRef) detach(); return; }
        if (room === deletionRoomCode && deletionRef) return;
        detach();
        deletionRoomCode = room;
        deletionRef = db.ref(`rooms/${room}/deletedRecords`);
        deletionRef.on('value', (snap) => { deletionItems = snap.val() || {}; render(); }, (err) => {
            if (!(typeof hmIsFirebasePermissionError === 'function' && hmIsFirebasePermissionError(err))) console.warn('[DeletedRecords]', err);
        });
    }
    window.hmAcknowledgeDeletedRecord = async function (date) {
        const uid = currentUid();
        if (!uid || !deletionRoomCode || !date) return;
        try {
            await db.ref(`rooms/${deletionRoomCode}/deletedRecords/${date}/seenBy/${uid}`).set(firebase.database.ServerValue.TIMESTAMP);
        } catch (err) { hmReportError('hmAcknowledgeDeletedRecord', err, '삭제 알림 확인 저장 실패'); }
    };
    window.hmRestoreDeletedRecord = async function (date) {
        if (!canRestore() || !deletionRoomCode || !date) return;
        if (!confirm(`${date} 삭제 기록을 원래 위치로 복구하시겠습니까?\n\n삭제 이력은 감사 기록으로 계속 보존됩니다.`)) return;

        const user = auth.currentUser;
        if (!user) return alert('로그인 상태를 다시 확인해 주세요.');

        const room = deletionRoomCode;
        const archiveRef = db.ref(`rooms/${room}/deletedRecords/${date}`);
        const dayRef = db.ref(`rooms/${room}/days/${date}`);
        const adminRef = db.ref(`rooms/${room}/dayAdmin/${date}`);
        let restoreMarkerWritten = false;
        let dayRestored = false;
        let adminRestored = false;

        try {
            const snap = await archiveRef.once('value');
            const item = snap.val();
            if (!item || item.restored === true) return alert('복구할 기록이 없거나 이미 복구되었습니다.');
            if (Number(item.expiresAt || 0) < Date.now()) return alert('30일 복구 기간이 지났습니다. 관리자 백업을 확인해 주세요.');
            if (!item.originalDay && !item.originalDayAdmin) return alert('복구할 원본 데이터가 없습니다.');

            const [currentDaySnap, currentAdminSnap] = await Promise.all([
                dayRef.once('value'),
                adminRef.once('value')
            ]);
            if (currentDaySnap.exists() || currentAdminSnap.exists()) {
                return alert('같은 날짜에 현재 기록이 이미 존재합니다. 기존 기록을 보호하기 위해 복구를 중단했습니다.');
            }

            await archiveRef.update({
                restoreInProgressBy: user.uid,
                restoreInProgressAt: firebase.database.ServerValue.TIMESTAMP
            });
            restoreMarkerWritten = true;

            // Do not combine the restore and audit updates at database root.
            // RTDB evaluates a root multi-location update as one operation, which can
            // invalidate the temporary restore marker before the day write is checked.
            if (item.originalDay) {
                const restoredDay = Object.assign({}, item.originalDay, {
                    date,
                    updatedBy: user.uid,
                    updatedByEmail: user.email || '',
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                await dayRef.set(restoredDay);
                dayRestored = true;
            }

            if (item.originalDayAdmin) {
                const restoredAdmin = Object.assign({}, item.originalDayAdmin, {
                    updatedBy: user.uid,
                    updatedByEmail: user.email || '',
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                await adminRef.set(restoredAdmin);
                adminRestored = true;
            }

            await archiveRef.update({
                restored: true,
                restoredAt: firebase.database.ServerValue.TIMESTAMP,
                restoredAtClient: Date.now(),
                restoredByUid: user.uid,
                restoredByEmail: user.email || '',
                restoreInProgressBy: null,
                restoreInProgressAt: null
            });
            restoreMarkerWritten = false;

            showSaveStatus('♻️ 삭제 기록 복구 완료');
            console.info('[HearMe2nite][RECORD_RESTORE] 순차 복구 완료', {
                roomCode: room,
                date,
                restoredDay: dayRestored,
                restoredDayAdmin: adminRestored
            });
        } catch (err) {
            // Roll back a partial restore. The archive remains untouched and can be retried.
            try {
                const rollbackTasks = [];
                if (dayRestored) rollbackTasks.push(dayRef.remove());
                if (adminRestored) rollbackTasks.push(adminRef.remove());
                if (rollbackTasks.length) await Promise.all(rollbackTasks);
            } catch (rollbackErr) {
                console.error('[HearMe2nite][RECORD_RESTORE_ROLLBACK]', rollbackErr);
            }

            if (restoreMarkerWritten) {
                try {
                    await archiveRef.update({ restoreInProgressBy: null, restoreInProgressAt: null });
                } catch (_) {}
            }
            hmReportError('hmRestoreDeletedRecord', err, hmIsFirebasePermissionError(err)
                ? '❌ 기록 복구 권한 없음 · 최신 Firebase Rules와 배포 상태를 확인해 주세요'
                : '❌ 기록 복구 실패');
        }
    };
    auth.onAuthStateChanged(() => setTimeout(attach, 300));
    setInterval(attach, 2500);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) attach(); });
})();
