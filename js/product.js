
// HearMe2nite v0.9.9 Product Polish Pack
// 사용자에게 보이는 베타/검수 메뉴는 제거하고, 읽기 전용 보강 기능만 단계별 적용.
(function(){
    if (window.__hmProductPolishInstalled) return;
    window.__hmProductPolishInstalled = true;
    const HM_STAGE = 9;
    const HM_HISTORY_TOOLS_ENABLED = false; // v0.9.21: 기록실 상단 통계/검색/타임라인 제거
    const $ = id => document.getElementById(id);
    const safe = v => String(v == null ? '' : v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
    function days(){ try { return window.cachedDaysData || cachedDaysData || {}; } catch(e) { return {}; } }
    function dayKeys(){ return Object.keys(days()).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort(); }
    function getCurrentRecord(){ const d = $('recordDate')?.value || ''; return d ? days()[d] : null; }
    function cleanNumberText(value, fallback='-'){
        const raw = String(value == null ? '' : value).trim();
        if (!raw || raw === '기록 없음') return fallback;
        const match = raw.match(/[0-9]+(?:\.[0-9]+)?/);
        return match ? match[0] : raw.replace(/ml|ML|kg|KG|㎏/g,'').trim() || fallback;
    }
    function formatRecentUpdate(rec){
        const ts = rec && (rec.updatedAt || rec.createdAt || rec.timestamp);
        if (!ts) return '-';
        const d = new Date(Number(ts));
        if (Number.isNaN(d.getTime())) return '-';
        const hh = String(d.getHours()).padStart(2,'0');
        const mm = String(d.getMinutes()).padStart(2,'0');
        return `${hh}:${mm}`;
    }
    function dateLabel(k){ try { const [y,m,d]=k.split('-'); return `${Number(m)}월 ${Number(d)}일`; } catch(e){ return k; } }
    function missionRatio(rec){
        const arr = rec && Array.isArray(rec.missions) ? rec.missions : [];
        if (!arr.length) return null;
        const done = arr.filter(m => m && m.done).length;
        return { done, total: arr.length, pct: Math.round(done / arr.length * 100) };
    }
    function routineRatio(){
        try {
            const cards = (typeof hmCustomCardRows === 'function') ? hmCustomCardRows(false) : [];
            let total = 0; let done = 0;
            cards.forEach(card => {
                const items = (typeof hmCustomItemRows === 'function') ? hmCustomItemRows(card) : [];
                items.forEach(item => {
                    total += 1;
                    const saved = (window.hmCustomValues || hmCustomValues || {})?.[card.id]?.[item.id];
                    if (!saved) return;
                    if (item.type === 'checkbox') { if (saved.value === true) done += 1; return; }
                    if (saved.value !== undefined && saved.value !== null && String(saved.value).trim() !== '') done += 1;
                });
            });
            return { cards: cards.length, done, total, pct: total ? Math.round(done / total * 100) : 0 };
        } catch(e) { return { cards: 0, done: 0, total: 0, pct: 0 }; }
    }
    function moveTodayPromiseSection(){
        try {
            const dash = $('hmProductDashboard');
            const title = $('customRoutineHomeTitle');
            const wrap = document.querySelector('.custom-routine-home-wrap');
            const toolbar = $('customRoutineToolbar');
            const routineList = $('customRoutineList');
            if (!dash || !title || !wrap) return;
            const chatCard = $('chatLaunchCard');
            if (chatCard && chatCard.previousElementSibling !== dash) dash.insertAdjacentElement('afterend', chatCard);
            let holder = $('hmTodayPromiseSection');
            if (!holder) {
                holder = document.createElement('section');
                holder.id = 'hmTodayPromiseSection';
                holder.className = 'hm-today-promise-section';
                (chatCard || dash).insertAdjacentElement('afterend', holder);
            } else if (holder.previousElementSibling !== (chatCard || dash)) {
                (chatCard || dash).insertAdjacentElement('afterend', holder);
            }
            // RC2.14.4: title만 이동되고 본문 카드가 남거나 숨는 상태를 방지한다.
            if (title.parentNode !== holder) holder.appendChild(title);
            if (wrap.parentNode !== holder) holder.appendChild(wrap);
            wrap.hidden = false;
            wrap.removeAttribute('aria-hidden');
            wrap.style.display = '';
            const hub = $('customRoutineHubCard');
            if (hub) { hub.style.display = ''; hub.hidden = false; hub.removeAttribute('aria-hidden'); }
            // STEP5.6.3.6: 생성된 미션/주간 루틴은 메인 카드 바로 아래의 독립 카드 목록으로 표시한다.
            if (routineList && routineList.parentNode !== holder) holder.appendChild(routineList);
            if (toolbar && toolbar.parentNode !== holder) holder.appendChild(toolbar);
            const subRoutineSection = $('subRoutineSection');
            if (subRoutineSection && subRoutineSection.parentNode !== holder) holder.appendChild(subRoutineSection);
            title.dataset.hmMoved = '1';
        } catch(e) {}
    }
    function getTogetherDay(){
        try {
            if (typeof window.hmGetTogetherDayCount === 'function') return window.hmGetTogetherDayCount();
            return null;
        } catch(e) { return null; }
    }
    const HM_HOME_STAT_ITEMS = [
        { key:'promise', icon:'💜', label:'오늘의 약속', mode:'ratio' },
        { key:'subRoutine', icon:'🌱', label:'나의 루틴', mode:'ratio' },
        { key:'mood', icon:'😊', label:'오늘의 기분', mode:'mood' },
        { key:'weight', icon:'⚖️', label:'체중', mode:'number' },
        { key:'exercise', icon:'🏃', label:'오늘의 운동', mode:'check' },
        { key:'water', icon:'💧', label:'오늘의 수분', mode:'sum' },
        { key:'wake', icon:'☀️', label:'기상 시간', mode:'time' },
        { key:'meal', icon:'🥗', label:'식사 기록', mode:'meal' },
        { key:'outing', icon:'🚶‍♀️', label:'외출 기록', mode:'check' },
        { key:'sleep', icon:'🌙', label:'취침 예정', mode:'time' },
        { key:'diary', icon:'📝', label:'오늘의 하루', mode:'check' }
    ];
    let hmHomeStatsActiveKey = 'promise';
    let hmHomeStatsPeriod = 'week';
    let hmHomeStatsCalendarOpen = false;
    function hmHomeStatsItem(key){ return HM_HOME_STAT_ITEMS.find(item => item.key === key) || HM_HOME_STAT_ITEMS[0]; }
    function hmHomeStatIsFilled(value){
        const text = String(value == null ? '' : value).trim();
        return !!text && text !== '기록 없음' && text !== '-';
    }
    function hmHomeStatNumber(value){
        const match = String(value == null ? '' : value).replace(/,/g,'').match(/[0-9]+(?:\.[0-9]+)?/);
        return match ? Number(match[0]) : 0;
    }
    function hmHomeStatDateObj(key){ const [y,m,d]=String(key||'').split('-').map(Number); return new Date(y || 2000, (m || 1) - 1, d || 1, 12); }
    function hmHomeStatDateKey(date){ return date.toISOString().slice(0,10); }
    function hmHomeStatAddDays(date, offset){ return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12); }
    function hmHomeStatsAnchorDate(){ return $('recordDate')?.value || dayKeys().slice(-1)[0] || new Date().toISOString().slice(0,10); }
    function hmHomeStatsPeriodKeys(period=hmHomeStatsPeriod){
        const anchor = hmHomeStatDateObj(hmHomeStatsAnchorDate());
        if (period === 'month') {
            return Array.from({length:30}, (_,i)=>hmHomeStatDateKey(hmHomeStatAddDays(anchor, i - 29)));
        }
        return Array.from({length:7}, (_,i)=>hmHomeStatDateKey(hmHomeStatAddDays(anchor, i - 6)));
    }
    function hmHomeStatsRecordValue(item, rec){
        if (!rec) return { hit:false, value:0, total:0, done:0, label:'-' };
        if (item.key === 'promise') {
            const values = rec.customCardValues && typeof rec.customCardValues === 'object' ? rec.customCardValues : {};
            let total = 0, done = 0;
            Object.values(values).forEach(card => Object.values(card || {}).forEach(saved => {
                total += 1;
                const v = saved && Object.prototype.hasOwnProperty.call(saved, 'value') ? saved.value : saved;
                if (v === true || hmHomeStatIsFilled(v)) done += 1;
            }));
            return { hit:total > 0, total, done, value:done, label:total ? `${done}/${total}` : '-' };
        }
        if (item.key === 'subRoutine') {
            const rows = Array.isArray(rec.subRoutineSnapshot) ? rec.subRoutineSnapshot : [];
            const done = rows.filter(r => r && r.done === true).length;
            return { hit:rows.length > 0, total:rows.length, done, value:done, label:rows.length ? `${done}/${rows.length}` : '-' };
        }
        if (item.key === 'mood') {
            const label = rec.moodLabel || rec.mood || '';
            return { hit:hmHomeStatIsFilled(label), value:1, label:label || '-' };
        }
        if (item.key === 'weight') {
            const value = hmHomeStatNumber(rec.weight);
            return { hit:value > 0, value, label:value ? `${value}kg` : '-' };
        }
        if (item.key === 'exercise') return { hit:hmHomeStatIsFilled(rec.exercise), value:hmHomeStatIsFilled(rec.exercise) ? 1 : 0, label:hmHomeStatIsFilled(rec.exercise) ? '완료' : '-' };
        if (item.key === 'water') {
            const value = hmHomeStatNumber(rec.water);
            return { hit:value > 0, value, label:value ? `${value}ml` : '-' };
        }
        if (item.key === 'wake') return { hit:hmHomeStatIsFilled(rec.wakeTime), value:1, label:rec.wakeTime || '-' };
        if (item.key === 'meal') {
            const done = ['mealBreakfast','mealLunch','mealDinner'].filter(id => hmHomeStatIsFilled(rec[id])).length;
            return { hit:done > 0, total:3, done, value:done, label:done ? `${done}/3` : '-' };
        }
        if (item.key === 'outing') return { hit:hmHomeStatIsFilled(rec.goingOut) || !!rec.photo, value:(hmHomeStatIsFilled(rec.goingOut) || !!rec.photo) ? 1 : 0, label:(hmHomeStatIsFilled(rec.goingOut) || !!rec.photo) ? '기록' : '-' };
        if (item.key === 'sleep') return { hit:hmHomeStatIsFilled(rec.sleepTime), value:1, label:rec.sleepTime || '-' };
        if (item.key === 'diary') return { hit:hmHomeStatIsFilled(rec.diary), value:hmHomeStatIsFilled(rec.diary) ? 1 : 0, label:hmHomeStatIsFilled(rec.diary) ? '작성' : '-' };
        return { hit:false, value:0, label:'-' };
    }
    function hmHomeStatsSummary(item, keys){
        const rows = keys.map(key => ({ key, rec: days()[key] || null })).map(row => ({ ...row, stat: hmHomeStatsRecordValue(item, row.rec) }));
        const hitRows = rows.filter(row => row.stat.hit);
        if (item.mode === 'ratio' || item.mode === 'meal') {
            const total = rows.reduce((sum,row)=>sum + Number(row.stat.total || 0), 0);
            const done = rows.reduce((sum,row)=>sum + Number(row.stat.done || 0), 0);
            return { rows, main: total ? `${Math.round(done / total * 100)}%` : '-', sub: total ? `${done}/${total} 완료` : '기록 없음', hit: hitRows.length };
        }
        if (item.key === 'weight') {
            const nums = hitRows.map(row => ({ key:row.key, value:row.stat.value })).filter(row => row.value > 0);
            const first = nums[0]?.value || 0, last = nums[nums.length - 1]?.value || 0;
            const diff = nums.length >= 2 ? Math.round((last - first) * 10) / 10 : 0;
            return { rows, main: nums.length ? `${last}kg` : '-', sub: nums.length >= 2 ? `변화 ${diff > 0 ? '+' : ''}${diff}kg` : `${nums.length}일 기록`, hit: nums.length };
        }
        if (item.key === 'water') {
            const total = hitRows.reduce((sum,row)=>sum + Number(row.stat.value || 0), 0);
            const avg = hitRows.length ? Math.round(total / hitRows.length) : 0;
            return { rows, main: total ? `${total}ml` : '-', sub: hitRows.length ? `평균 ${avg}ml · ${hitRows.length}일` : '기록 없음', hit: hitRows.length };
        }
        if (item.mode === 'time') {
            return { rows, main: hitRows.length ? `${hitRows.length}일` : '-', sub: hitRows.length ? `최근 ${hitRows[hitRows.length - 1].stat.label}` : '기록 없음', hit: hitRows.length };
        }
        if (item.key === 'mood') {
            const counts = {};
            hitRows.forEach(row => { counts[row.stat.label] = (counts[row.stat.label] || 0) + 1; });
            const top = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0] || '-';
            return { rows, main: top, sub: hitRows.length ? `${hitRows.length}일 선택` : '기록 없음', hit: hitRows.length };
        }
        return { rows, main: `${hitRows.length}/${keys.length}`, sub: hitRows.length ? `${hitRows.length}일 기록` : '기록 없음', hit: hitRows.length };
    }
    function buildHomeStatsCard(){
        if ($('hmHomeStatsCard')) return;
        const box = document.createElement('section');
        box.id = 'hmHomeStatsCard';
        box.className = 'hm-beta-dashboard hm-home-stats-card';
        box.setAttribute('role','button');
        box.setAttribute('tabindex','0');
        box.setAttribute('aria-label','기록 통계 자세히 보기');
        box.innerHTML = `<div class="hm-summary-strip-head"><strong>기록 통계</strong><small>눌러서 자세히 보기</small></div><div class="hm-summary-strip" aria-label="기록 통계"><div class="hm-summary-dot"><b>📊</b><span id="hmHomeStatMini_overview">통계</span></div><div class="hm-summary-dot"><b>💜</b><span id="hmHomeStatMini_promise">-</span></div><div class="hm-summary-dot"><b>🌱</b><span id="hmHomeStatMini_subRoutine">-</span></div><div class="hm-summary-dot"><b>📝</b><span id="hmHomeStatMini_diary">-</span></div><div class="hm-summary-dot"><b>💧</b><span id="hmHomeStatMini_water">-</span></div></div>`;
        box.addEventListener('click', () => window.hmOpenHomeStatsModal('promise'));
        box.addEventListener('keydown', event => { if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.hmOpenHomeStatsModal('promise'); } });
        const recordDateInput = $('recordDate');
        const recordDateGroup = recordDateInput ? recordDateInput.closest('.input-group') : null;
        const dashboard = $('hmProductDashboard');
        if (recordDateGroup) recordDateGroup.insertAdjacentElement('afterend', box);
        else if (dashboard) dashboard.insertAdjacentElement('beforebegin', box);
        else document.querySelector('.room-settings-card')?.insertAdjacentElement('afterend', box);
    }
    function ensureHomeStatsModal(){
        let overlay = $('hmHomeStatsOverlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'hmHomeStatsOverlay';
        overlay.className = 'daily-modal-overlay hm-home-stats-overlay';
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden','true');
        overlay.setAttribute('inert','');
        overlay.innerHTML = `<div class="daily-modal hm-home-stats-modal" role="dialog" aria-modal="true" aria-labelledby="hmHomeStatsTitle"><div class="daily-modal-head"><h2 id="hmHomeStatsTitle">📊 기록 통계</h2><button type="button" class="modal-close-btn" onclick="hmCloseHomeStatsModal()">닫기</button></div><div class="hm-home-stats-menu">${HM_HOME_STAT_ITEMS.map(item => `<button type="button" data-home-stat="${item.key}" onclick="hmOpenHomeStatsModal('${item.key}')"><b>${item.icon}</b><span>${item.label}</span><small id="hmHomeStatMini_${item.key}">-</small></button>`).join('')}</div><div class="hm-home-stats-period"><button type="button" data-stat-period="week" onclick="hmSetHomeStatsPeriod('week')">주간</button><button type="button" data-stat-period="month" onclick="hmSetHomeStatsPeriod('month')">한 달</button></div><div id="hmHomeStatsModalBody" class="hm-home-stats-modal-body"></div></div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', event => { if (event.target === overlay) window.hmCloseHomeStatsModal(); });
        return overlay;
    }
    function renderHomeStatsModal(){
        const item = hmHomeStatsItem(hmHomeStatsActiveKey);
        const keys = hmHomeStatsPeriodKeys();
        const stats = hmHomeStatsSummary(item, keys);
        const body = $('hmHomeStatsModalBody') || ensureHomeStatsModal().querySelector('#hmHomeStatsModalBody');
        document.querySelectorAll('[data-stat-period]').forEach(btn => { const active = btn.dataset.statPeriod === hmHomeStatsPeriod; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', active ? 'true' : 'false'); });
        document.querySelectorAll('[data-home-stat]').forEach(btn => btn.classList.toggle('active', btn.dataset.homeStat === item.key));
        const calendar = stats.rows.map(row => {
            const day = Number(row.key.slice(-2));
            const state = row.stat.hit ? 'has-stat' : 'empty-stat';
            return `<div class="hm-home-stats-day ${state}"><span>${day}</span><b>${item.icon}</b><small>${safe(row.stat.label)}</small></div>`;
        }).join('');
        if (body) body.innerHTML = `<section class="hm-home-stats-hero"><div class="hm-home-stats-hero-icon">${item.icon}</div><div><strong>${safe(item.label)}</strong><span>${hmHomeStatsPeriod === 'week' ? '최근 7일' : '최근 30일'} 기준</span></div><em>${safe(stats.main)}</em></section><div class="hm-home-stats-metrics"><div><strong>${safe(stats.main)}</strong><small>대표 값</small></div><div><strong>${safe(stats.sub)}</strong><small>요약</small></div><div><strong>${stats.hit}일</strong><small>기록된 날</small></div></div><button type="button" class="hm-home-stats-calendar-toggle" onclick="hmToggleHomeStatsCalendar()" aria-expanded="${hmHomeStatsCalendarOpen ? 'true' : 'false'}">${hmHomeStatsCalendarOpen ? '날짜별 보기 접기' : '날짜별 보기 펼치기'}</button><div class="hm-home-stats-calendar ${hmHomeStatsPeriod === 'month' ? 'is-month' : 'is-week'} ${hmHomeStatsCalendarOpen ? 'is-open' : 'is-collapsed'}" ${hmHomeStatsCalendarOpen ? '' : 'hidden'}>${calendar}</div><p class="hm-home-stats-note">기존 기록을 읽어서 표시하며, 이 통계 화면에서는 데이터를 저장하거나 변경하지 않습니다.</p>`;
    }
    function updateHomeStatsCard(){
        buildHomeStatsCard();
        const weekKeys = hmHomeStatsPeriodKeys('week');
        HM_HOME_STAT_ITEMS.forEach(item => {
            const target = $(`hmHomeStatMini_${item.key}`);
            if (!target) return;
            const stats = hmHomeStatsSummary(item, weekKeys);
            target.textContent = stats.main;
        });
    }
    window.hmOpenHomeStatsModal = function(key){ hmHomeStatsActiveKey = key || hmHomeStatsActiveKey; const overlay = ensureHomeStatsModal(); if (overlay.getAttribute('aria-hidden') !== 'false') hmHomeStatsCalendarOpen = false; renderHomeStatsModal(); if (typeof openModalOverlayById === 'function') openModalOverlayById('hmHomeStatsOverlay'); else { overlay.removeAttribute('inert'); overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden','false'); } };
    window.hmCloseHomeStatsModal = function(){ if (typeof closeModalOverlayById === 'function') closeModalOverlayById('hmHomeStatsOverlay'); else { const overlay=$('hmHomeStatsOverlay'); if(overlay) overlay.style.display='none'; } };
    window.hmSetHomeStatsPeriod = function(period){ hmHomeStatsPeriod = period === 'month' ? 'month' : 'week'; renderHomeStatsModal(); };
    window.hmToggleHomeStatsCalendar = function(){ hmHomeStatsCalendarOpen = !hmHomeStatsCalendarOpen; renderHomeStatsModal(); };
    function buildDashboard(){
        if (HM_STAGE < 2 || $('hmProductDashboard')) return;
        const anchor = document.querySelector('.room-settings-card'); if (!anchor) return;
        const box = document.createElement('section');
        box.id='hmProductDashboard'; box.className='hm-beta-dashboard';
        box.setAttribute('role','button');
        box.setAttribute('tabindex','0');
        box.setAttribute('aria-label','오늘의 요약 자세히 보기');
        box.innerHTML=`<div class="hm-summary-strip-head"><strong>오늘의 요약</strong><small>눌러서 자세히 보기</small></div>
        <div class="hm-summary-strip" aria-label="오늘의 요약">
        <div class="hm-summary-dot"><b>📝</b><span id="hmProductTodayStatus">작성</span></div>
        <div class="hm-summary-dot"><b>💧</b><span id="hmProductWaterStatus">0</span></div>
        <div class="hm-summary-dot"><b>⚖️</b><span id="hmProductWeightStatus">-</span></div>
        <div class="hm-summary-dot"><b>💜</b><span id="hmProductPromiseStatus">-</span></div>
        <div class="hm-summary-dot" id="hmProductTogetherItem" hidden><b>💕</b><span id="hmProductTogetherDay">-</span></div></div>`;
        box.addEventListener('click', openHomeSummaryModal);
        box.addEventListener('keydown', (event)=>{ if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openHomeSummaryModal(); } });
        // STEP5.6.2.0: 기록 날짜를 '우리의 공간'과 '오늘의 요약' 사이에 고정합니다.
        const recordDateInput = $('recordDate');
        const recordDateGroup = recordDateInput ? recordDateInput.closest('.input-group') : null;
        if (recordDateGroup) {
            anchor.insertAdjacentElement('afterend', recordDateGroup);
            buildHomeStatsCard();
            const statsCard = $('hmHomeStatsCard');
            if (statsCard) statsCard.insertAdjacentElement('afterend', box);
            else recordDateGroup.insertAdjacentElement('afterend', box);
        } else {
            anchor.insertAdjacentElement('afterend', box);
        }
        setTimeout(moveTodayPromiseSection, 0);
    }
    function updateDashboard(){
        if (HM_STAGE < 2) return;
        buildDashboard();
        const rec=getCurrentRecord();
        const todayStatus=$('hmProductTodayStatus'); if(todayStatus) todayStatus.textContent = rec ? '✔' : (($('recordDate')?.value||'') ? '작성' : '-');
        const water=$('hmProductWaterStatus'); if(water) { let w = 0; try { w = Number(window.currentWater || currentWater || 0); } catch(e) { w = 0; } water.textContent = w ? String(w) : '0'; }
        const weight=$('hmProductWeightStatus'); if(weight) { const value = cleanNumberText($('weight')?.value || rec?.weight || '', '-'); weight.textContent = value; }
        const promise=routineRatio(); const promiseStatus=$('hmProductPromiseStatus'); if(promiseStatus) promiseStatus.textContent = promise.total ? `${promise.done}/${promise.total}` : '-';
        const togetherDay = getTogetherDay();
        const togetherItem = $('hmProductTogetherItem');
        const togetherValue = $('hmProductTogetherDay');
        if (togetherItem) togetherItem.hidden = !togetherDay;
        if (togetherValue) togetherValue.textContent = togetherDay ? `${togetherDay}일` : '-';
        updateHomeStatsCard();
        moveTodayPromiseSection();
    }

    function ensureHomeSummaryModal(){
        let overlay = $('hmHomeSummaryOverlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'hmHomeSummaryOverlay';
        overlay.className = 'daily-modal-overlay hm-home-summary-overlay';
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden','true');
        overlay.setAttribute('inert', '');
        overlay.innerHTML = `<div class="daily-modal hm-home-summary-modal" role="dialog" aria-modal="true" aria-labelledby="hmHomeSummaryTitle">
            <div class="daily-modal-head">
                <h2 id="hmHomeSummaryTitle">오늘의 요약</h2>
                <button type="button" class="modal-close-btn" onclick="hmCloseHomeSummaryModal()">닫기</button>
            </div>
            <div id="hmHomeSummaryModalBody" class="hm-home-summary-modal-body"></div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (event)=>{ if(event.target === overlay) hmCloseHomeSummaryModal(); });
        return overlay;
    }
    function summaryRow(icon, label, value, sub){
        return `<div class="hm-summary-modal-row"><div class="hm-summary-modal-icon">${icon}</div><div><strong>${safe(label)}</strong>${sub ? `<small>${safe(sub)}</small>` : ''}</div><b>${safe(value)}</b></div>`;
    }
    function openHomeSummaryModal(){
        const rec = getCurrentRecord();
        let w = 0; try { w = Number(window.currentWater || currentWater || 0); } catch(e) { w = 0; }
        const weightValue = cleanNumberText($('weight')?.value || rec?.weight || '', '-');
        const promise = routineRatio();
        const togetherDay = getTogetherDay();
        const body = $('hmHomeSummaryModalBody') || ensureHomeSummaryModal().querySelector('#hmHomeSummaryModalBody');
        if (body) {
            body.innerHTML = [
                summaryRow('📝','오늘 기록', rec ? '작성 완료' : '작성 전', $('recordDate')?.value || ''),
                summaryRow('💧','수분', w ? `${w} ml` : '0 ml', '오늘 누적'),
                summaryRow('⚖️','체중', weightValue === '-' ? '-' : `${weightValue} kg`, '오늘 기록'),
                summaryRow('💜','오늘의 약속', promise.total ? `${promise.done} / ${promise.total} 완료` : '등록 없음', promise.cards ? `${promise.cards}개 약속` : '관리 버튼으로 약속을 만들 수 있어요'),
                togetherDay ? summaryRow('💕','함께한 지', `${togetherDay}일`, '대표 기념일 기준') : '',
                `<div class="hm-summary-modal-updated">최근 업데이트 <strong>${safe(formatRecentUpdate(rec))}</strong></div>`
            ].join('');
        }
        if (typeof openModalOverlayById === 'function') openModalOverlayById('hmHomeSummaryOverlay');
        else { const overlay = ensureHomeSummaryModal(); overlay.removeAttribute('inert'); overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden','false'); }
    }
    window.hmOpenHomeSummaryModal = openHomeSummaryModal;
    window.hmCloseHomeSummaryModal = function(){ if (typeof closeModalOverlayById === 'function') closeModalOverlayById('hmHomeSummaryOverlay'); else { const overlay=$('hmHomeSummaryOverlay'); if(overlay) overlay.style.display='none'; } };

    function renderMonthlyStats(){
        if (!HM_HISTORY_TOOLS_ENABLED || HM_STAGE < 3) return;
        const target=$('hmProductHistoryStats'); if(!target) return;
        const current=$('recordDate')?.value || dayKeys().slice(-1)[0] || ''; const ym=current ? current.slice(0,7) : '';
        const monthKeys=dayKeys().filter(k=>k.startsWith(ym)); let missions=0, done=0, photos=0; const moods={};
        monthKeys.forEach(k=>{ const r=days()[k]||{}; if(r.photo) photos++; if(r.moodLabel) moods[r.moodLabel]=(moods[r.moodLabel]||0)+1; (Array.isArray(r.missions)?r.missions:[]).forEach(m=>{missions++; if(m.done) done++;}); });
        const topMood=Object.keys(moods).sort((a,b)=>moods[b]-moods[a])[0] || '기록 없음'; const pct=missions?Math.round(done/missions*100):0;
        target.innerHTML=`<div class="hm-beta-history-title"><strong>📊 ${ym || '이번 달'} 통계</strong><span>읽기 전용</span></div><div class="hm-beta-history-grid"><div><strong>${monthKeys.length}</strong><small>기록일</small></div><div><strong>${pct}%</strong><small>미션 완료</small></div><div><strong>${photos}</strong><small>사진</small></div><div><strong>${safe(topMood)}</strong><small>주요 기분</small></div></div>`;
    }
    function buildHistoryTools(){
        if (!HM_HISTORY_TOOLS_ENABLED || HM_STAGE < 3) {
            const old = $('hmProductHistoryTools');
            if (old) old.remove();
            return;
        }
        const modal=document.querySelector('.history-panel-modal'); const calendar=$('calendarBox'); if(!modal || !calendar || $('hmProductHistoryTools')) return;
        const tools=document.createElement('div'); tools.id='hmProductHistoryTools'; tools.className='hm-beta-history-tools';
        let html='<div id="hmProductHistoryStats" class="hm-beta-history-stats"></div>';
        if (HM_STAGE >= 4) html += `<div class="hm-beta-search-row"><input type="search" id="hmProductHistorySearch" placeholder="기록 검색: 여행, 마음, 미션..." oninput="hmRenderHistorySearch()"><button type="button" onclick="hmExportCurrentHistoryText()">내보내기</button></div><div id="hmProductHistorySearchResult" class="hm-beta-search-result"></div>`;
        if (HM_STAGE >= 5) html += '<div id="hmProductTimeline" class="hm-beta-timeline"></div>';
        tools.innerHTML=html; calendar.insertAdjacentElement('beforebegin', tools);
    }
    window.hmRenderHistorySearch=function(){
        if (!HM_HISTORY_TOOLS_ENABLED || HM_STAGE < 4) return;
        const q=($('hmProductHistorySearch')?.value||'').trim().toLowerCase(); const out=$('hmProductHistorySearchResult'); if(!out) return; if(!q){out.innerHTML='';return;}
        const rows=dayKeys().reverse().filter(k=>JSON.stringify(days()[k]||{}).toLowerCase().includes(q)).slice(0,20);
        out.innerHTML=rows.length ? rows.map(k=>`<button type="button" onclick="selectHistoryDate('${k}')"><strong>${dateLabel(k)}</strong><span>${safe(((days()[k]||{}).diary || (days()[k]||{}).moodLabel || '기록 보기').slice(0,42))}</span></button>`).join('') : '<div class="hm-beta-empty">검색 결과가 없습니다.</div>';
    };
    function renderTimeline(){
        if (!HM_HISTORY_TOOLS_ENABLED || HM_STAGE < 5) return;
        const out=$('hmProductTimeline'); if(!out) return; let items=[]; try{ if(typeof hmGetAllAnniversaryItems==='function') items=hmGetAllAnniversaryItems()||[]; }catch(e){}
        items=items.filter(i=>i&&i.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8); if(!items.length){out.innerHTML='';return;}
        out.innerHTML=`<div class="hm-beta-timeline-title">🌙 우리의 타임라인</div>` + items.map(i=>`<button type="button" onclick="selectHistoryDate('${i.date}')"><span>${i.icon || '💕'}</span><strong>${safe(i.title || '기념일')}</strong><small>${safe(i.date)}</small></button>`).join('');
    }
    window.hmExportCurrentHistoryText=function(){
        if (!HM_HISTORY_TOOLS_ENABLED || HM_STAGE < 4) return;
        const keys=dayKeys(); if(!keys.length){ if(typeof showToast==='function') showToast('내보낼 기록이 없습니다.'); return; }
        const text=keys.map(k=>{ const r=days()[k]||{}; const missions=Array.isArray(r.missions)?r.missions.map(m=>`- ${m.done?'✅':'⬜'} ${m.text||'미션'}`).join('\n'):''; return `[${k}]\n기분: ${r.moodLabel||''}\n미션:\n${missions}\n하루: ${r.diary||''}\n피드백: ${r.replyMessage||''}`; }).join('\n\n---\n\n');
        navigator.clipboard?.writeText(text).then(()=>{ if(typeof showToast==='function') showToast('기록실 텍스트가 복사되었습니다.'); }).catch(()=>{ const box=$('resultBox'); if(box) box.value=text; if(typeof showToast==='function') showToast('결과창에 내보내기 내용을 넣었습니다.'); });
    };
    function applyPolish(){
        document.documentElement.setAttribute('data-hm-version', typeof HM_APP_VERSION === 'string' ? HM_APP_VERSION : 'unknown');
        if (HM_STAGE >= 7) document.body.classList.add('hm-accessibility-polish');
        updateDashboard();
        moveTodayPromiseSection();
        const oldHistoryTools = $('hmProductHistoryTools');
        if (oldHistoryTools) oldHistoryTools.remove();
        if (HM_HISTORY_TOOLS_ENABLED) { buildHistoryTools(); renderMonthlyStats(); renderTimeline(); }
    }
    window.hmUpdateHomeSummary = updateDashboard;
    document.addEventListener('DOMContentLoaded',()=>setTimeout(applyPolish,200));
    document.addEventListener('input',e=>{ if(e.target && e.target.closest('#appContent')) setTimeout(updateDashboard,0); },true);
    document.addEventListener('change',e=>{ if(e.target && e.target.closest('#appContent')) setTimeout(updateDashboard,0); },true);
    const od=window.displayHistory;
    if(typeof od==='function') window.displayHistory=function(){ const r=od.apply(this,arguments); setTimeout(applyPolish,0); return r; };
    else { const timer=setInterval(()=>{ if(typeof window.displayHistory==='function'){ clearInterval(timer); const fn=window.displayHistory; window.displayHistory=function(){ const r=fn.apply(this,arguments); setTimeout(applyPolish,0); return r; }; }},200); setTimeout(()=>clearInterval(timer),10000); }
})();
