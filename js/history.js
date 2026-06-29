// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// history.js - History
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
        if (!date) return;
        if (!(await hmRequireRoomAccess('기록 삭제', roomCode))) { alert('삭제 권한이 없습니다.'); return; }
        if (confirm(`${date} 기록을 서버에서 완전히 삭제할까요?`)) {
            try {
                await db.ref('rooms/' + roomCode + '/days/' + date).remove();
                showSaveStatus('🗑️ 기록 삭제 완료');
            } catch (err) {
                hmReportError('deleteRecord', err, hmIsFirebasePermissionError(err) ? '❌ 삭제 권한 없음' : '❌ 기록 삭제 실패');
            }
        }
    }

    async function copyDirectText(event, date) {
        event.stopPropagation();
        const roomCode = getRoomCodeForData();
        if (!(await hmRequireRoomAccess('기록 복사', roomCode))) { alert('복사 권한이 없습니다.'); return; }
        try {
            const snapshot = await db.ref('rooms/' + roomCode + '/days/' + date).once('value');
            if (snapshot.val()) executeCopy(snapshot.val().fullText);
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
        loadHistoryAnniversaryData();
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
        return record?.photo ? '🖼️' : '📝';
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
        const anniversaryText = historyAnniversaryData?.startDate ? formatAnniversaryLabel(historyAnniversaryData.startDate, date) : '';
        const anniversaryMilestone = historyAnniversaryData?.startDate ? getAnniversaryMilestone(getDaysBetweenInclusive(historyAnniversaryData.startDate, date)) : '';
        const customEvents = getCustomAnniversaryEventsForDate(date);
        const meals = [
            record.mealBreakfast ? `아침: ${record.mealBreakfast}` : '',
            record.mealLunch ? `점심: ${record.mealLunch}` : '',
            record.mealDinner ? `저녁: ${record.mealDinner}` : ''
        ].filter(Boolean).join('\n');
        const dailyBase = [
            record.wakeTime ? `☀️ 기상: ${record.wakeTime}` : '',
            record.sleepTime ? `🌙 취침 예정: ${record.sleepTime}` : '',
            record.water ? `💧 수분: ${record.water}` : '',
            record.weight ? `⚖️ 체중: ${record.weight}` : ''
        ].filter(Boolean).join('\n');
        content.innerHTML = `
            ${record.photo ? `<img src="${record.photo}" class="history-detail-photo" alt="${date} 사진">` : ''}
            ${historyDetailBlock('💕 기념일', [anniversaryText, anniversaryMilestone].filter(Boolean).join(' · '))}
            ${customAnniversaryText ? historyDetailBlock('🎁 둘만의 기념일', customAnniversaryText) : ''}
            ${historyDetailBlock('😊 오늘의 기분', [record.moodLabel, record.moodNote].filter(Boolean).join('\n'))}
            ${historyDetailBlock('🎯 오늘의 미션', missionText)}
            ${historyDetailBlock('☀️ 기본 기록', dailyBase)}
            ${historyDetailBlock('🥗 식사 기록', meals)}
            ${historyDetailBlock('🚶 외출 기록', record.goingOut)}
            ${historyDetailBlock('📝 오늘의 하루', record.diary)}
            ${historyDetailBlock('💌 주인의 피드백', record.replyMessage)}
            ${historyDetailBlock('✨ 보상 / 휴식', [record.dailyChoiceLabel, record.rewardNote].filter(Boolean).join('\n'))}
            <button type="button" class="history-detail-copy" onclick="copyDirectText(event, '${date}')">📋 이 기록 복사하기</button>
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
    let historyAnniversaryData = null;
    let hmHistoryAnniversaryLoadedForRoom = '';
    let hmHistoryAnniversaryLoading = false;

    function renderHistorySummary(daysData) {
        const box = document.getElementById('historySummary');
        if (box) box.innerHTML = '';
    }

/* RC2 v2.6.0 STEP3: removed duplicate earlier `renderCalendar()` implementation; final implementation below is authoritative. */


    function updateHistoryLaunchSub(daysData) {
        const sub = document.getElementById('historyLaunchSub');
        if (!sub) return;
        const dates = Object.keys(daysData || {});
        const photos = Object.values(daysData || {}).filter(record => record && record.photo).length;
        sub.textContent = dates.length ? `총 ${dates.length}일 기록 · 사진 ${photos}장 · 날짜를 눌러 확인` : '캘린더에서 날짜를 선택하면 해당 기록만 보여요.';
    }

    function selectHistoryDate(date) {
        selectedHistoryDate = date;
        const filterInput = document.getElementById('historyFilterDate');
        if (filterInput) filterInput.value = date;
        if (cachedDaysData) displayHistory(cachedDaysData);
    }

    function applyHistoryFilter() {
        const filterInput = document.getElementById('historyFilterDate');
        selectedHistoryDate = filterInput ? filterInput.value : selectedHistoryDate;
        if (cachedDaysData) displayHistory(cachedDaysData);
    }

    function clearHistoryFilter() {
        selectedHistoryDate = '';
        const filterInput = document.getElementById('historyFilterDate');
        if (filterInput) filterInput.value = '';
        if (cachedDaysData) displayHistory(cachedDaysData);
    }

/* RC2 v2.6.0 STEP3: removed duplicate earlier `displayHistory()` implementation; final implementation below is authoritative. */



    /* =========================================================
       RC2 v2.5.7 Chat UI Premium Override
       - 기존 daysData / deleteRecord / openHistoryDetailModal 데이터 흐름 유지
       ========================================================= */

    // =========================================================
    // MODULE: HISTORY / ANNIVERSARY
    // Split-ready target: timeline.js
    // 처음 만난 날을 room meta에 저장하고 캘린더 날짜 선택 시 D+를 계산한다.
    // DB 추가 경로: rooms/{roomCode}/meta/anniversaryStartDate
    // =========================================================
    function parseYmdDate(ymd) {
        if (!ymd || typeof ymd !== 'string') return null;
        const parts = ymd.split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function getDaysBetweenInclusive(startYmd, targetYmd) {
        const start = parseYmdDate(startYmd);
        const target = parseYmdDate(targetYmd);
        if (!start || !target) return null;
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.floor((target - start) / oneDay) + 1;
    }

    function formatAnniversaryLabel(startYmd, targetYmd) {
        const days = getDaysBetweenInclusive(startYmd, targetYmd);
        if (days === null) return '';
        if (days < 1) return `만나기 ${Math.abs(days - 1)}일 전`;
        if (days === 1) return '처음 만난 날';
        return `만난 지 ${days}일`;
    }

    function getAnniversaryMilestone(days) {
        if (!days || days < 1) return '';
        if (days === 1) return '처음 만난 날';
        const milestones = [30, 50, 100, 200, 300, 365, 500, 700, 1000, 1500, 2000];
        if (milestones.includes(days)) return `${days}일 기념일`;
        if (days > 0 && days % 100 === 0) return `${days}일 기념일`;
        if (days > 0 && days % 365 === 0) return `${Math.round(days / 365)}주년`; 
        return '';
    }

    function getNextAnniversaryMilestones(startYmd, targetYmd) {
        const currentDays = getDaysBetweenInclusive(startYmd, targetYmd);
        if (!currentDays || currentDays < 1) return [];
        const base = [30, 50, 100, 200, 300, 365, 500, 700, 1000, 1500, 2000];
        return base.filter(day => day >= currentDays).slice(0, 4);
    }

    async function loadHistoryAnniversaryData() {
        const roomCode = getRoomCodeForData();
        if (!roomCode || !hmIsSafeRoomCode(roomCode) || hmHistoryAnniversaryLoading) return;
        if (hmHistoryAnniversaryLoadedForRoom === roomCode) return;
        hmHistoryAnniversaryLoading = true;
        try {
            const [startSnap, customSnap] = await Promise.all([
                db.ref(`rooms/${roomCode}/meta/anniversaryStartDate`).once('value'),
                db.ref(`rooms/${roomCode}/meta/customAnniversaries`).once('value')
            ]);
            historyAnniversaryData = {
                startDate: startSnap.val() || '',
                customEvents: customSnap.val() || {}
            };
            hmHistoryAnniversaryLoadedForRoom = roomCode;
            if (cachedDaysData) displayHistory(cachedDaysData);
        } catch (err) {
            hmReportError('loadHistoryAnniversaryData', err, '기념일 정보를 불러오지 못했어요.');
        } finally {
            hmHistoryAnniversaryLoading = false;
        }
    }

    async function saveAnniversaryStartDate() {
        const input = document.getElementById('anniversaryStartDate');
        const value = input ? input.value : '';
        const roomCode = getRoomCodeForData();
        if (!value) { alert('처음 만난 날을 선택해 주세요.'); return; }
        if (!(await hmRequireRoomAccess('기념일 저장', roomCode))) { alert('기념일 저장 권한이 없습니다.'); return; }
        try {
            await db.ref(`rooms/${roomCode}/meta/anniversaryStartDate`).set(value);
            historyAnniversaryData = { ...(historyAnniversaryData || {}), startDate: value };
            hmHistoryAnniversaryLoadedForRoom = roomCode;
            showSaveStatus('💕 처음 만난 날 저장 완료');
            if (cachedDaysData) displayHistory(cachedDaysData);
        } catch (err) {
            hmReportError('saveAnniversaryStartDate', err, '기념일 저장에 실패했어요.');
        }
    }


    function getCustomAnniversaryEventsForDate(date) {
        const events = historyAnniversaryData?.customEvents || {};
        return Object.keys(events)
            .map(key => ({ id: key, ...(events[key] || {}) }))
            .filter(event => event.date === date)
            .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'ko'));
    }

    function renderCustomAnniversaryList() {
        const events = historyAnniversaryData?.customEvents || {};
        const items = Object.keys(events)
            .map(id => ({ id, ...(events[id] || {}) }))
            .filter(event => event.date && event.title)
            .sort((a, b) => String(a.date).localeCompare(String(b.date)));
        if (!items.length) {
            return '<div class="anniversary-empty">아직 직접 등록한 기념일이 없습니다. 생일, 첫 여행, 약속한 날처럼 둘만의 날짜를 추가해 보세요.</div>';
        }
        return `<div class="anniversary-custom-list">${items.map(event => `
            <div class="anniversary-custom-item">
                <span class="anniversary-custom-emoji">${escapeHtml(event.emoji || '💕')}</span>
                <span><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(formatHistoryDateLabel(event.date))}</small></span>
                <button type="button" onclick="deleteCustomAnniversary('${escapeHtml(event.id)}')">삭제</button>
            </div>`).join('')}</div>`;
    }

    async function saveCustomAnniversary() {
        const titleInput = document.getElementById('customAnniversaryTitle');
        const dateInput = document.getElementById('customAnniversaryDate');
        const emojiInput = document.getElementById('customAnniversaryEmoji');
        const title = titleInput ? titleInput.value.trim() : '';
        const date = dateInput ? dateInput.value : '';
        const emoji = emojiInput ? emojiInput.value : '💕';
        const roomCode = getRoomCodeForData();
        if (!title) { alert('기념일 이름을 입력해 주세요.'); return; }
        if (!date) { alert('기념일 날짜를 선택해 주세요.'); return; }
        if (!(await hmRequireRoomAccess('기념일 추가', roomCode))) { alert('기념일 추가 권한이 없습니다.'); return; }
        try {
            const id = `event_${Date.now()}`;
            const event = { title, date, emoji, createdAt: Date.now() };
            await db.ref(`rooms/${roomCode}/meta/customAnniversaries/${id}`).set(event);
            historyAnniversaryData = {
                ...(historyAnniversaryData || {}),
                customEvents: { ...((historyAnniversaryData || {}).customEvents || {}), [id]: event }
            };
            if (titleInput) titleInput.value = '';
            showSaveStatus('💕 기념일 추가 완료');
            if (cachedDaysData) displayHistory(cachedDaysData);
        } catch (err) {
            hmReportError('saveCustomAnniversary', err, '기념일 추가에 실패했어요.');
        }
    }

    async function deleteCustomAnniversary(eventId) {
        const roomCode = getRoomCodeForData();
        if (!eventId) return;
        if (!(await hmRequireRoomAccess('기념일 삭제', roomCode))) { alert('기념일 삭제 권한이 없습니다.'); return; }
        if (!confirm('이 기념일을 삭제할까요?')) return;
        try {
            await db.ref(`rooms/${roomCode}/meta/customAnniversaries/${eventId}`).remove();
            if (historyAnniversaryData?.customEvents) delete historyAnniversaryData.customEvents[eventId];
            showSaveStatus('기념일 삭제 완료');
            if (cachedDaysData) displayHistory(cachedDaysData);
        } catch (err) {
            hmReportError('deleteCustomAnniversary', err, '기념일 삭제에 실패했어요.');
        }
    }


    function addDaysToYmd(startYmd, daysToAdd) {
        const date = parseYmdDate(startYmd);
        if (!date) return '';
        date.setDate(date.getDate() + daysToAdd);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function renderUpcomingAnniversaryCards(startYmd, targetYmd) {
        const next = getNextAnniversaryMilestones(startYmd, targetYmd);
        if (!next.length) return '';
        return `<div class="anniversary-upcoming"><div class="anniversary-title">🌷 다가오는 기념일</div>${next.map(day => {
            const ymd = addDaysToYmd(startYmd, day - 1);
            return `<button type="button" class="anniversary-upcoming-item" onclick="selectHistoryDate('${ymd}')"><strong>D+${day}</strong><span>${escapeHtml(formatHistoryDateLabel(ymd))}</span></button>`;
        }).join('')}</div>`;
    }

    function renderAnniversaryBox() {
        const box = document.getElementById('anniversaryBox');
        if (!box) return;
        const startDate = historyAnniversaryData?.startDate || '';
        const targetDate = selectedHistoryDate || document.getElementById('recordDate')?.value || new Date().toISOString().slice(0, 10);
        if (!startDate) {
            box.innerHTML = `
                <div class="anniversary-head">
                    <div>
                        <div class="anniversary-title">💕 처음 만난 날</div>
                        <div class="anniversary-sub">처음 만난 날을 저장하면 캘린더 날짜를 누를 때마다 D+와 100일, 200일 같은 기념일을 자동 계산합니다.</div>
                    </div>
                </div>
                <div class="anniversary-form">
                    <input type="date" id="anniversaryStartDate" aria-label="처음 만난 날 선택">
                    <button type="button" onclick="saveAnniversaryStartDate()">저장</button>
                </div>`;
            return;
        }
        const days = getDaysBetweenInclusive(startDate, targetDate);
        const milestone = getAnniversaryMilestone(days);
        const label = formatAnniversaryLabel(startDate, targetDate);
        const next = getNextAnniversaryMilestones(startDate, targetDate);
        box.innerHTML = `
            <div class="anniversary-head">
                <div>
                    <div class="anniversary-title">💕 우리의 기념일</div>
                    <div class="anniversary-sub">처음 만난 날: ${escapeHtml(formatHistoryDateLabel(startDate))}</div>
                </div>
                <button type="button" class="anniversary-mini-btn" onclick="document.getElementById('anniversaryEditRow').style.display='grid'">수정</button>
            </div>
            <div class="anniversary-result">
                <div class="anniversary-badge">${milestone ? '🎉' : '💕'}</div>
                <div>
                    <span class="anniversary-value">${escapeHtml(formatHistoryDateLabel(targetDate))} · ${escapeHtml(label)}</span>
                    <div class="anniversary-note">${milestone ? `오늘은 ${escapeHtml(milestone)}입니다.` : '캘린더의 다른 날짜를 누르면 그날 기준으로 자동 계산됩니다.'}</div>
                </div>
            </div>
            ${renderUpcomingAnniversaryCards(startDate, targetDate)}
            <div class="anniversary-form" id="anniversaryEditRow" style="display:none;">
                <input type="date" id="anniversaryStartDate" value="${escapeHtml(startDate)}" aria-label="처음 만난 날 수정">
                <button type="button" onclick="saveAnniversaryStartDate()">다시 저장</button>
            </div>
            <div class="anniversary-custom-box">
                <div class="anniversary-title">🎁 둘만의 기념일</div>
                <div class="anniversary-sub">생일, 첫 여행, 약속한 날처럼 캘린더에 함께 표시할 날짜를 추가할 수 있습니다.</div>
                <div class="anniversary-custom-form">
                    <input type="date" id="customAnniversaryDate" aria-label="기념일 날짜">
                    <input type="text" id="customAnniversaryTitle" placeholder="예: 200일 여행, 생일, 첫 만남 장소" maxlength="30" aria-label="기념일 이름">
                    <select id="customAnniversaryEmoji" aria-label="기념일 아이콘">
                        <option value="💕">💕</option><option value="🎂">🎂</option><option value="🎉">🎉</option><option value="✈️">✈️</option><option value="💍">💍</option><option value="⭐">⭐</option>
                    </select>
                    <button type="button" onclick="saveCustomAnniversary()">추가</button>
                </div>
                ${renderCustomAnniversaryList()}
            </div>`;
    }

    // =========================================================
    // MODULE: HISTORY / OVERVIEW STATS
    // Split-ready target: getHistoryOverviewStats
    // =========================================================
    function getHistoryOverviewStats(daysData) {
        const dates = Object.keys(daysData || {}).sort();
        const records = dates.map(date => daysData[date] || {});
        const photos = records.filter(record => record.photo).length;
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
        const stats = getHistoryOverviewStats(daysData || {});
        box.innerHTML = `
            <div class="history-hero-tile"><span class="history-hero-value">${stats.total}</span><span class="history-hero-label">총 기록일</span></div>
            <div class="history-hero-tile"><span class="history-hero-value">${stats.photos}</span><span class="history-hero-label">사진 기록</span></div>
            <div class="history-hero-tile"><span class="history-hero-value">${stats.missionDays}</span><span class="history-hero-label">미션 기록일</span></div>
            <div class="history-hero-tile"><span class="history-hero-value">${escapeHtml(stats.latest)}</span><span class="history-hero-label">최근 기록</span></div>
        `;
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
        const anniversaryStartDate = historyAnniversaryData?.startDate || '';
        let html = `<div class="history-calendar-title-row"><div><strong>📅 ${year}.${String(month+1).padStart(2,'0')} 기록 캘린더</strong><br><span>날짜를 누르면 기록과 D+ 기념일을 함께 확인합니다.</span></div><span>${monthRecords}일 기록</span></div><div class="calendar-grid history-calendar-grid">`;
        html += week.map(w => `<div class="calendar-head">${w}</div>`).join('');
        for (let i = 0; i < first.getDay(); i++) html += '<div class="calendar-day"></div>';
        for (let day = 1; day <= last.getDate(); day++) {
            const ymd = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const rec = (daysData || {})[ymd];
            const dday = anniversaryStartDate ? getDaysBetweenInclusive(anniversaryStartDate, ymd) : null;
            const anniversaryLabel = getAnniversaryMilestone(dday);
            const hasAnniversary = Boolean(anniversaryStartDate && dday && dday >= 1);
            const isMilestone = Boolean(anniversaryLabel);
            const recordIcons = rec ? `${rec.photo ? '📷' : ''}${getHistoryMissionText(rec) ? '🎯' : ''}${rec.mood === 'hard' || rec.mood === 'veryHard' ? '☁️' : ''}` : '';
            const customEvents = getCustomAnniversaryEventsForDate(ymd);
            const customIcon = customEvents.length ? escapeHtml(customEvents[0].emoji || '💕') : '';
            const anniversaryIcon = isMilestone ? '🎉' : (ymd === anniversaryStartDate ? '💕' : '');
            const icons = `${recordIcons}${anniversaryIcon}${customIcon}`;
            html += `<div class="calendar-day ${rec ? 'has-record' : ''} ${hasAnniversary ? 'anniversary-day' : ''} ${isMilestone ? 'anniversary-milestone' : ''} ${ymd === todayYmd ? 'today' : ''} ${ymd === selectedHistoryDate ? 'selected-record' : ''}" onclick="selectHistoryDate('${ymd}')">${day}<span class="calendar-icons">${icons}</span></div>`;
        }
        html += '</div>';
        box.innerHTML = html;
    }

    function renderPhotoThumbs(daysData) {
        const box = document.getElementById('photoThumbs');
        if (!box) return;
        const photos = Object.keys(daysData || {}).sort((a,b)=>new Date(b)-new Date(a)).filter(date => daysData[date]?.photo).slice(0, 12);
        if (!photos.length) {
            box.innerHTML = '<div class="history-photo-empty">📷 아직 사진 기록이 없습니다.</div>';
            return;
        }
        box.innerHTML = `<div class="history-photo-label"><strong>사진 모아보기</strong>최근 사진 ${photos.length}장</div>` + photos.map(date => `<img class="history-thumb" src="${daysData[date].photo}" title="${date}" alt="${date} 사진" onclick="openHistoryDetailModal('${date}')">`).join('');
    }

    function displayHistory(daysData) {
        const historyList = document.getElementById('historyList');
        renderAnniversaryBox();
        renderHistoryHero(daysData || {});
        renderHistorySummary(daysData || {});
        updateHistoryLaunchSub(daysData || {});
        renderCalendar(daysData || {});
        renderPhotoThumbs(daysData || {});
        if (!historyList) return;
        if (!daysData || Object.keys(daysData).length === 0) {
            historyList.innerHTML = '<div class="empty-message">아직 저장된 서버 기록이 없습니다. ✨</div>';
            return;
        }
        if (!selectedHistoryDate) {
            historyList.innerHTML = '<div class="history-selected-hint"><strong>날짜를 선택해 주세요</strong>캘린더에서 기록이 있는 날짜를 누르면<br>그 날의 상세 카드가 이곳에 표시됩니다.</div>';
            return;
        }
        const record = daysData[selectedHistoryDate];
        if (!record) {
            historyList.innerHTML = '<div class="history-selected-hint"><strong>기록이 없습니다</strong>선택한 날짜에는 저장된 기록이 없습니다. 📅</div>';
            return;
        }
        const date = selectedHistoryDate;
        const icon = getHistoryMoodIcon(record);
        const missionText = getHistoryMissionText(record);
        const anniversaryText = historyAnniversaryData?.startDate ? formatAnniversaryLabel(historyAnniversaryData.startDate, date) : '';
        const anniversaryMilestone = historyAnniversaryData?.startDate ? getAnniversaryMilestone(getDaysBetweenInclusive(historyAnniversaryData.startDate, date)) : '';
        const diaryPreview = record.diary ? record.diary.substring(0, 62) : '오늘의 하루 기록을 열어 확인하세요.';
        const chips = [
            record.moodLabel && record.moodLabel !== '기록 없음' ? record.moodLabel : '',
            record.water ? `💧 ${record.water}` : '',
            record.weight ? `⚖️ ${record.weight}` : '',
            missionText ? `🎯 ${missionText}` : '',
            record.photo ? '📷 사진' : '',
            customEvents.length ? `${customEvents[0].emoji || '💕'} ${customEvents[0].title}` : '',
            record.dailyChoiceLabel && record.dailyChoiceLabel !== '기록 없음' ? record.dailyChoiceLabel : ''
        ].map(makeHistoryChip).join('');
        historyList.innerHTML = `
            <button type="button" class="history-day-card history-premium-selected" onclick="openHistoryDetailModal('${date}')">
                <span class="history-day-icon">${icon}</span>
                <span>
                    <span class="history-day-title">${formatHistoryDateLabel(date)}의 기록</span>
                    <span class="history-day-sub">${escapeHtml(diaryPreview)}${record.diary && record.diary.length > 62 ? '...' : ''}</span>
                    <span class="history-day-chips">${chips}</span>
                </span>
                <span class="history-day-actions">
                    <span class="history-card-arrow">›</span>
                    <span class="btn-delete" onclick="deleteRecord(event, '${date}')">삭제</span>
                </span>
            </button>`;
    }

