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
        let html = `<div class="history-calendar-title-row"><div><strong>📅 ${year}.${String(month+1).padStart(2,'0')} 기록 캘린더</strong><br><span>기록이 있는 날짜를 누르면 아래에 카드가 열립니다.</span></div><span>${monthRecords}일 기록</span></div><div class="calendar-grid history-calendar-grid">`;
        html += week.map(w => `<div class="calendar-head">${w}</div>`).join('');
        for (let i = 0; i < first.getDay(); i++) html += '<div class="calendar-day"></div>';
        for (let day = 1; day <= last.getDate(); day++) {
            const ymd = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const rec = (daysData || {})[ymd];
            const icons = rec ? `${rec.photo ? '📷' : ''}${getHistoryMissionText(rec) ? '🎯' : ''}${rec.mood === 'hard' || rec.mood === 'veryHard' ? '☁️' : ''}` : '';
            html += `<div class="calendar-day ${rec ? 'has-record' : ''} ${ymd === todayYmd ? 'today' : ''} ${ymd === selectedHistoryDate ? 'selected-record' : ''}" ${rec ? `onclick="selectHistoryDate('${ymd}')"` : ''}>${day}<span class="calendar-icons">${icons}</span></div>`;
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
        const diaryPreview = record.diary ? record.diary.substring(0, 62) : '오늘의 하루 기록을 열어 확인하세요.';
        const chips = [
            record.moodLabel && record.moodLabel !== '기록 없음' ? record.moodLabel : '',
            record.water ? `💧 ${record.water}` : '',
            record.weight ? `⚖️ ${record.weight}` : '',
            missionText ? `🎯 ${missionText}` : '',
            record.photo ? '📷 사진' : '',
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




function buildHistoryCustomRoutineText(record) {
    const values = record && record.customCardValues ? record.customCardValues : null;
    if (!values || typeof values !== 'object') return '';
    const blocks = [];
    Object.entries(values).forEach(([cardId, itemMap]) => {
        if (!itemMap || typeof itemMap !== 'object') return;
        const cardTitle = (typeof hmCustomCards !== 'undefined' && hmCustomCards?.[cardId]?.title) ? hmCustomCards[cardId].title : '맞춤 루틴';
        const lines = Object.values(itemMap).map(item => {
            if (!item || typeof item !== 'object') return '';
            let value = item.value;
            if (item.type === 'checkbox') value = value === true ? '완료' : '미완료';
            if (value === undefined || value === null || value === '') value = '기록 없음';
            return `${item.label || '항목'}: ${value}`;
        }).filter(Boolean);
        if (lines.length) blocks.push(`🧩 ${cardTitle}\n${lines.join('\n')}`);
    });
    return blocks.join('\n\n');
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
function openHistoryDetailModal(date) {
    const record = cachedDaysData && cachedDaysData[date] ? cachedDaysData[date] : null;
    if (!record) return;
    const title = document.getElementById('historyDetailTitle');
    const content = document.getElementById('historyDetailContent');
    if (!title || !content) return;
    title.innerText = `${getHistoryMoodIcon(record)} ${formatHistoryDateLabel(date)}`;
    const missionText = getHistoryMissionText(record);
    const meals = [record.mealBreakfast ? `아침: ${record.mealBreakfast}` : '', record.mealLunch ? `점심: ${record.mealLunch}` : '', record.mealDinner ? `저녁: ${record.mealDinner}` : ''].filter(Boolean).join('\n');
    const dailyBase = [record.wakeTime ? `☀️ 기상: ${record.wakeTime}` : '', record.sleepTime ? `🌙 취침 예정: ${record.sleepTime}` : '', record.water ? `💧 수분: ${record.water}` : '', record.weight ? `⚖️ 체중: ${record.weight}` : ''].filter(Boolean).join('\n');
    const customRoutineText = buildHistoryCustomRoutineText(record);
    const summaryChips = [record.moodLabel && record.moodLabel !== '기록 없음' ? record.moodLabel : '', missionText ? `🎯 ${missionText}` : '', customRoutineText ? '🧩 맞춤 루틴' : '', record.photo ? '📷 사진 있음' : '', record.dailyChoiceLabel && record.dailyChoiceLabel !== '기록 없음' ? record.dailyChoiceLabel : ''].filter(Boolean).map(makeHistoryChip).join('');
    content.innerHTML = `
        <div class="history-detail-summary-card">
            <div class="history-detail-summary-icon">${getHistoryMoodIcon(record)}</div>
            <div><strong>${formatHistoryDateLabel(date)}의 기록</strong><span>${summaryChips || '저장된 세부 내용을 확인해 주세요.'}</span></div>
        </div>
        ${record.photo ? `<img src="${record.photo}" class="history-detail-photo" alt="${date} 사진">` : ''}
        ${historyDetailBlock('😊 오늘의 기분', [record.moodLabel, record.moodNote].filter(Boolean).join('\n'))}
        ${historyDetailBlock('🎯 오늘의 미션', missionText)}
        ${historyDetailBlock('☀️ 기본 기록', dailyBase)}
        ${historyDetailBlock('🥗 식사 기록', meals)}
        ${historyDetailBlock('🚶 외출 기록', record.goingOut)}
        ${historyDetailBlock('📝 오늘의 하루', record.diary)}
        ${historyDetailBlock('💌 주인의 피드백', record.replyMessage)}
        ${historyDetailBlock('✨ 보상 / 휴식', [record.dailyChoiceLabel, record.rewardNote].filter(Boolean).join('\n'))}
        ${historyDetailBlock('🧩 맞춤 루틴', customRoutineText)}
        <button type="button" class="history-detail-copy" onclick="copyDirectText(event, '${date}')">📋 이 기록 복사하기</button>`;
    openModalOverlayById('historyDetailOverlay');
}
