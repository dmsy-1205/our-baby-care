
// HearMe2nite v0.9.9 Product Polish Pack
// 사용자에게 보이는 베타/검수 메뉴는 제거하고, 읽기 전용 보강 기능만 단계별 적용.
(function(){
    if (window.__hmProductPolishInstalled) return;
    window.__hmProductPolishInstalled = true;
    const HM_STAGE = 9;
    const HM_HISTORY_TOOLS_ENABLED = false; // v0.9.21: 기록실 상단 통계/검색/타임라인 제거
    const $ = id => document.getElementById(id);
    const safe = v => String(v == null ? '' : v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
    let hmHomeStatsLatestDaysData = null;
    function hmHomeStatsHasRecords(value){ return !!value && typeof value === 'object' && Object.keys(value).some(k => /^\d{4}-\d{2}-\d{2}$/.test(k)); }
    function days(){
        try {
            if (typeof window.hmHistoryGetMergedData === 'function') {
                const merged = window.hmHistoryGetMergedData();
                if (hmHomeStatsHasRecords(merged)) return merged;
            }
        } catch(e) {}
        try { if (hmHomeStatsHasRecords(window.cachedDaysData)) return window.cachedDaysData; } catch(e) {}
        try { if (hmHomeStatsHasRecords(cachedDaysData)) return cachedDaysData; } catch(e) {}
        if (hmHomeStatsHasRecords(hmHomeStatsLatestDaysData)) return hmHomeStatsLatestDaysData;
        return {};
    }
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
            syncHomeTopOrder();
            let holder = $('hmTodayPromiseSection');
            if (!holder) {
                holder = document.createElement('section');
                holder.id = 'hmTodayPromiseSection';
                holder.className = 'hm-today-promise-section';
                dash.insertAdjacentElement('afterend', holder);
            } else if (holder.previousElementSibling !== dash) {
                dash.insertAdjacentElement('afterend', holder);
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
    const HM_SUMMARY_DEFAULTS = ['today','water','weight','promise'];
    const HM_SUMMARY_CATALOG = [
        {key:'today',icon:'📝',label:'오늘 기록'}, {key:'water',icon:'💧',label:'수분'},
        {key:'weight',icon:'⚖️',label:'체중'}, {key:'promise',icon:'💜',label:'오늘의 약속'},
        {key:'mood',icon:'😊',label:'오늘의 기분'}, {key:'exercise',icon:'🏃',label:'오늘의 운동'},
        {key:'meal',icon:'🥗',label:'식사 기록'}, {key:'mealPhotos',icon:'📷',label:'식사 사진'},
        {key:'wake',icon:'☀️',label:'기상 시간'}, {key:'sleep',icon:'🌙',label:'취침 예정'},
        {key:'diary',icon:'✍️',label:'오늘의 하루'}, {key:'moments',icon:'🖼️',label:'오늘의 순간'}
    ];
    let hmSummaryItems = HM_SUMMARY_DEFAULTS.slice();
    let hmSummaryDraft = HM_SUMMARY_DEFAULTS.slice();
    let hmSummaryLoadedUid = '';
    function hmSummaryNormalize(value){
        const allowed = new Set(HM_SUMMARY_CATALOG.map(item=>item.key));
        const rows = Array.isArray(value) ? value.filter((key,index,arr)=>allowed.has(key) && arr.indexOf(key)===index).slice(0,4) : [];
        HM_SUMMARY_DEFAULTS.concat(HM_SUMMARY_CATALOG.map(item=>item.key)).forEach(key=>{ if(rows.length<4 && allowed.has(key) && !rows.includes(key)) rows.push(key); });
        return rows.slice(0,4);
    }
    function hmSummaryStorageKey(uid){ return `hm_home_summary_items_${uid || 'guest'}`; }
    function hmSummaryReadLocal(uid){ try { return hmSummaryNormalize(JSON.parse(localStorage.getItem(hmSummaryStorageKey(uid)) || 'null')); } catch(e){ return HM_SUMMARY_DEFAULTS.slice(); } }
    function hmSummaryWriteLocal(uid,items){ try { localStorage.setItem(hmSummaryStorageKey(uid),JSON.stringify(items)); } catch(e){} }
    function hmSummaryLoadForUser(){
        const uid = (typeof currentUser !== 'undefined' && currentUser?.uid) || 'guest';
        if (hmSummaryLoadedUid === uid) return;
        hmSummaryLoadedUid = uid;
        hmSummaryItems = hmSummaryReadLocal(uid);
        if (uid === 'guest' || typeof db === 'undefined') return;
        db.ref(`users/${uid}/preferences/homeSummaryItems`).once('value').then(snap=>{
            if (((typeof currentUser !== 'undefined' && currentUser?.uid) || 'guest') !== uid) return;
            const remote = snap.val();
            if (Array.isArray(remote) && remote.length) { hmSummaryItems=hmSummaryNormalize(remote); hmSummaryWriteLocal(uid,hmSummaryItems); updateDashboard(); }
        }).catch(()=>{});
    }
    function hmSummaryMomentRows(rec){ try { return typeof window.hmGetRecordMoments==='function' ? window.hmGetRecordMoments(rec||{}) : []; } catch(e){ return []; } }
    function hmSummaryMetric(key,rec){
        let w=0; try { w=Number(window.currentWater || currentWater || rec?.water || 0); } catch(e){ w=Number(rec?.water||0); }
        const promise=routineRatio(), moments=hmSummaryMomentRows(rec), together=getTogetherDay();
        const meals=[rec?.mealBreakfast,rec?.mealLunch,rec?.mealDinner].filter(v=>hmHomeStatIsFilled(v)).length;
        const weight=cleanNumberText($('weight')?.value||rec?.weight||'','-');
        const map={
            today:{short:rec?'✔':'-',value:rec?'작성 완료':'작성 전',sub:$('recordDate')?.value||''},
            water:{short:String(w||0),value:`${w||0} ml`,sub:'오늘 누적'}, weight:{short:weight,value:weight==='-'?'-':`${weight} kg`,sub:'오늘 기록'},
            promise:{short:promise.total?`${promise.done}/${promise.total}`:'-',value:promise.total?`${promise.done} / ${promise.total} 완료`:'등록 없음',sub:promise.cards?`${promise.cards}개 약속`:'등록된 약속이 없어요'},
            mood:{short:rec?.moodLabel||'-',value:rec?.moodLabel||'기록 없음',sub:'오늘의 기분'},
            exercise:{short:hmHomeStatIsFilled(rec?.exercise)?'✔':'-',value:hmHomeStatIsFilled(rec?.exercise)?String(rec.exercise):'기록 없음',sub:'오늘의 운동'},
            meal:{short:`${meals}/3`,value:`${meals} / 3 기록`,sub:'아침 · 점심 · 저녁'},
            mealPhotos:{short:`${moments.filter(x=>x.mealType).length}장`,value:`${moments.filter(x=>x.mealType).length}장`,sub:'저장된 식사 사진'},
            wake:{short:rec?.wakeTime||'-',value:rec?.wakeTime||'기록 없음',sub:'기상 시간'}, sleep:{short:rec?.sleepTime||'-',value:rec?.sleepTime||'기록 없음',sub:'취침 예정'},
            diary:{short:hmHomeStatIsFilled(rec?.diary)?'✔':'-',value:hmHomeStatIsFilled(rec?.diary)?'작성 완료':'작성 전',sub:'오늘의 하루'},
            moments:{short:`${moments.filter(x=>!x.mealType).length}장`,value:`${moments.filter(x=>!x.mealType).length}장`,sub:'오늘의 순간'},
            together:{short:together?`${together}일`:'-',value:together?`${together}일`:'기준일 없음',sub:'대표 기념일 기준'}
        };
        return map[key] || {short:'-',value:'-',sub:''};
    }
    function hmSummaryRenderStrip(rec){ const custom=hmSummaryItems.map(key=>{ const item=HM_SUMMARY_CATALOG.find(x=>x.key===key), metric=hmSummaryMetric(key,rec); return item?`<div class="hm-summary-dot" title="${safe(item.label)}"><b>${item.icon}</b><span>${safe(metric.short)}</span></div>`:''; }).join(''); const together=getTogetherDay(); return custom+(together?`<div class="hm-summary-dot hm-summary-together-fixed" title="함께한 지"><b>💕</b><span>${together}일</span></div>`:''); }
    const HM_HOME_STAT_ITEMS = [
        { key:'promise', icon:'💜', label:'오늘의 약속', mode:'ratio' },
        { key:'subRoutine', icon:'🌱', label:'나의 루틴', mode:'ratio' },
        { key:'mood', icon:'😊', label:'오늘의 기분', mode:'mood' },
        { key:'weight', icon:'⚖️', label:'체중', mode:'number' },
        { key:'exercise', icon:'🏃', label:'오늘의 운동', mode:'check' },
        { key:'water', icon:'💧', label:'오늘의 수분', mode:'sum' },
        { key:'wake', icon:'☀️', label:'기상 시간', mode:'time' },
        { key:'meal', icon:'🥗', label:'식사 기록', mode:'meal' },
        { key:'outing', icon:'📷', label:'오늘의 순간', mode:'check' },
        { key:'sleep', icon:'🌙', label:'취침 예정', mode:'time' },
        { key:'diary', icon:'📝', label:'오늘의 하루', mode:'check' }
    ];
    let hmHomeStatsActiveKey = 'promise';
    let hmHomeStatsPeriod = 'week';
    let hmHomeStatsCalendarOpen = false;
    let hmHomeStatsGraphOpen = false;
    function hmHomeStatsItem(key){ return HM_HOME_STAT_ITEMS.find(item => item.key === key) || HM_HOME_STAT_ITEMS[0]; }
    function hmHomeStatIsFilled(value){
        const text = String(value == null ? '' : value).trim();
        return !!text && text !== '기록 없음' && text !== '-';
    }
    function hmHomeMealIsFilled(value, mealName){
        const text = String(value == null ? '' : value).trim();
        if (!text || text === '-' || text === '기록 없음') return false;
        const compact = text.replace(/\s+/g, '');
        const emptyWords = ['기록없음','없음','미입력','입력없음','안먹음','안 먹음'.replace(/\s+/g,''),'패스','skip'];
        if (emptyWords.includes(compact.toLowerCase())) return false;
        if (mealName && compact === `${mealName}기록`) return false;
        if (/^(아침|점심|저녁)?기록(없음)?$/.test(compact)) return false;
        return true;
    }
    function hmHomeStatNumber(value){
        const match = String(value == null ? '' : value).replace(/,/g,'').match(/[0-9]+(?:\.[0-9]+)?/);
        return match ? Number(match[0]) : 0;
    }
    function hmHomeStatDateObj(key){ const [y,m,d]=String(key||'').split('-').map(Number); return new Date(y || 2000, (m || 1) - 1, d || 1, 12); }
    function hmHomeStatDateKey(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
    function hmHomeStatAddDays(date, offset){ return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12); }
    function hmHomeStatsAnchorDate(){ return $('recordDate')?.value || dayKeys().slice(-1)[0] || hmHomeStatDateKey(new Date()); }
    function hmHomeStatsPeriodKeys(period=hmHomeStatsPeriod){
        const anchor = hmHomeStatDateObj(hmHomeStatsAnchorDate());
        if (period === 'month') {
            const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
            // 선택 날짜 이후의 미래 날짜는 달성률 분모에 포함하지 않는다.
            const total = anchor.getDate();
            return Array.from({length:total}, (_,i)=>hmHomeStatDateKey(hmHomeStatAddDays(first, i)));
        }
        // 주간 통계는 달력의 월~일 묶음이 아니라 선택 날짜까지의 최근 7일을
        // 연속해서 보여준다. 날짜를 하루 옮기면 통계 구간도 하루씩 이동한다.
        const first = hmHomeStatAddDays(anchor, -6);
        return Array.from({length:7}, (_,i)=>hmHomeStatDateKey(hmHomeStatAddDays(first, i)));
    }
    function hmHomeStatsPreviousKeys(period=hmHomeStatsPeriod){
        const current = hmHomeStatsPeriodKeys(period);
        if (!current.length) return [];
        if (period === 'week') {
            const first = hmHomeStatDateObj(current[0]);
            return Array.from({length:7}, (_,i)=>hmHomeStatDateKey(hmHomeStatAddDays(first, i - 7)));
        }
        const anchor = hmHomeStatDateObj(hmHomeStatsAnchorDate());
        const previousFirst = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1, 12);
        const previousLastDay = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 12).getDate();
        const total = Math.min(anchor.getDate(), previousLastDay);
        return Array.from({length:total}, (_,i)=>hmHomeStatDateKey(hmHomeStatAddDays(previousFirst, i)));
    }
    function hmHomeRecordMoments(rec){
        const source = rec?.moments;
        if (!source || typeof source !== 'object') return [];
        return Object.values(source).filter(item => item && typeof item === 'object' && (item.url || item.dataUrl));
    }
    function hmHomeStatsPeriodLabel(period=hmHomeStatsPeriod){
        const anchor = hmHomeStatDateObj(hmHomeStatsAnchorDate());
        if (period === 'month') return `${anchor.getFullYear()}.${String(anchor.getMonth() + 1).padStart(2,'0')} 선택한 달 기준`;
        const keys = hmHomeStatsPeriodKeys('week');
        return `${keys[0].slice(5).replace('-','.')}~${keys[6].slice(5).replace('-','.')} 선택 주간 기준`;
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
            const mealMap = [
                { id:'mealBreakfast', name:'아침' },
                { id:'mealLunch', name:'점심' },
                { id:'mealDinner', name:'저녁' }
            ];
            const momentRows = hmHomeRecordMoments(rec);
            const meals = mealMap.map(meal => hmHomeMealIsFilled(rec[meal.id], meal.name) || momentRows.some(moment => moment.mealType === meal.id.replace('meal','').toLowerCase()));
            const done = meals.filter(Boolean).length;
            const photoCount = momentRows.filter(moment => ['breakfast','lunch','dinner'].includes(moment.mealType)).length;
            return { hit:done > 0, total:3, done, value:done, meals, photoCount, label:done ? `${done}/3` : '-' };
        }
        if (item.key === 'outing') { const hasMoment = hmHomeRecordMoments(rec).some(moment => !moment.mealType) || !!rec.photo; return { hit:hmHomeStatIsFilled(rec.goingOut) || hasMoment, value:(hmHomeStatIsFilled(rec.goingOut) || hasMoment) ? 1 : 0, label:(hmHomeStatIsFilled(rec.goingOut) || hasMoment) ? '기록' : '-' }; }
        if (item.key === 'sleep') return { hit:hmHomeStatIsFilled(rec.sleepTime), value:1, label:rec.sleepTime || '-' };
        if (item.key === 'diary') return { hit:hmHomeStatIsFilled(rec.diary), value:hmHomeStatIsFilled(rec.diary) ? 1 : 0, label:hmHomeStatIsFilled(rec.diary) ? '작성' : '-' };
        return { hit:false, value:0, label:'-' };
    }
    function hmHomeStatsSummary(item, keys){
        const rows = keys.map(key => ({ key, rec: days()[key] || null })).map(row => ({ ...row, stat: hmHomeStatsRecordValue(item, row.rec) }));
        const hitRows = rows.filter(row => row.stat.hit);
        if (item.mode === 'ratio' || item.mode === 'meal') {
            const expectedDailyTotal = item.mode === 'meal' ? 3 : 0;
            if (item.mode === 'meal') {
                rows.forEach(row => {
                    const dayTotal = Number(row.stat.total || 0);
                    if (!dayTotal) row.stat = { ...row.stat, total: expectedDailyTotal, done: 0, value: 0, meals: item.mode === 'meal' ? [false,false,false] : row.stat.meals, label: '-' };
                });
            }
            // 약속과 루틴은 그 날짜에 실제로 예정된 항목만 분모로 사용한다.
            // 식사는 선택 날짜까지 하루 세 끼를 기준으로 한다.
            const total = item.mode === 'meal' ? expectedDailyTotal * rows.length : rows.reduce((sum,row)=>sum + Number(row.stat.total || 0), 0);
            const done = rows.reduce((sum,row)=>sum + Number(row.stat.done || 0), 0);
            return { rows, main: total ? `${Math.round(done / total * 100)}%` : '-', sub: total ? `${done}/${total} 완료` : '기록 없음', hit: hitRows.length, total, done, rate:total ? Math.round(done / total * 100) : 0, photoCount:rows.reduce((sum,row)=>sum + Number(row.stat.photoCount || 0),0) };
        }
        if (item.key === 'weight') {
            const nums = hitRows.map(row => ({ key:row.key, value:row.stat.value })).filter(row => row.value > 0);
            const first = nums[0]?.value || 0, last = nums[nums.length - 1]?.value || 0;
            const diff = nums.length >= 2 ? Math.round((last - first) * 10) / 10 : 0;
            return { rows, main: nums.length ? `${last}kg` : '-', sub: nums.length >= 2 ? `변화 ${diff > 0 ? '+' : ''}${diff}kg` : `${nums.length}일 기록`, hit: nums.length, first, last, diff };
        }
        if (item.key === 'water') {
            const total = hitRows.reduce((sum,row)=>sum + Number(row.stat.value || 0), 0);
            const avg = hitRows.length ? Math.round(total / hitRows.length) : 0;
            return { rows, main: avg ? `${avg}ml` : '-', sub: hitRows.length ? `총 ${total}ml · ${hitRows.length}일 기록` : '기록 없음', hit: hitRows.length, total, avg, goalDays:hitRows.filter(row=>Number(row.stat.value||0)>=2000).length };
        }
        if (item.mode === 'time') {
            const minutes = hitRows.map(row=>hmHomeStatsTimeMinutes(row.stat.label,item.key)).filter(Number.isFinite);
            const avgMinutes = minutes.length ? Math.round(minutes.reduce((sum,value)=>sum+value,0)/minutes.length) : null;
            const spread = minutes.length > 1 ? Math.max(...minutes)-Math.min(...minutes) : 0;
            return { rows, main: avgMinutes == null ? '-' : hmHomeStatsFormatTimeMinutes(avgMinutes), sub: minutes.length ? `변동 ${Math.floor(spread/60)}시간 ${spread%60}분` : '기록 없음', hit: hitRows.length, avgMinutes, spread };
        }
        if (item.key === 'mood') {
            const counts = {};
            hitRows.forEach(row => { counts[row.stat.label] = (counts[row.stat.label] || 0) + 1; });
            const top = Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0] || '-';
            return { rows, main: top, sub: hitRows.length ? `${hitRows.length}일 선택` : '기록 없음', hit: hitRows.length, counts };
        }
        return { rows, main: `${hitRows.length}/${keys.length}`, sub: hitRows.length ? `${hitRows.length}일 기록` : '기록 없음', hit: hitRows.length, rate:keys.length ? Math.round(hitRows.length/keys.length*100) : 0 };
    }
    function hmHomeStatsStreak(rows){
        let best = 0, current = 0;
        (rows || []).forEach(row => { current = row.stat.hit ? current + 1 : 0; best = Math.max(best,current); });
        return best;
    }
    function hmHomeStatsComparison(item, stats, previous){
        if (!previous) return '이전 기간 비교 기록 없음';
        if (item.mode === 'ratio' || item.mode === 'meal') {
            if (!Number(stats.total||0) && !Number(previous.total||0)) return '이전 기간 비교 기록 없음';
            const diff = Number(stats.rate||0)-Number(previous.rate||0);
            return diff === 0 ? '이전 기간과 같아요' : `이전 기간보다 ${diff>0?'+':''}${diff}%p`;
        }
        if (item.key === 'weight') {
            if (!stats.last || !previous.last) return '이전 기간 비교 기록 없음';
            const diff = Math.round((stats.last-previous.last)*10)/10;
            return `이전 기간 마지막 기록보다 ${diff>0?'+':''}${diff}kg`;
        }
        if (item.key === 'water') {
            if (!Number(stats.avg||0) && !Number(previous.avg||0)) return '이전 기간 비교 기록 없음';
            const diff = Number(stats.avg||0)-Number(previous.avg||0);
            return diff === 0 ? '이전 기간과 같아요' : `하루 평균 ${diff>0?'+':''}${diff}ml`;
        }
        if (item.mode === 'time') {
            if (!Number.isFinite(stats.avgMinutes) || !Number.isFinite(previous.avgMinutes)) return '이전 기간 비교 기록 없음';
            const diff = stats.avgMinutes-previous.avgMinutes;
            return diff === 0 ? '이전 기간과 같은 평균 시간' : `평균 ${Math.abs(diff)}분 ${diff>0?'늦어짐':'빨라짐'}`;
        }
        if (item.key === 'mood') return previous.main && previous.main !== '-' ? `이전 기간 대표 기분: ${previous.main}` : '이전 기간 비교 기록 없음';
        if (!Number(stats.hit||0) && !Number(previous.hit||0)) return '이전 기간 비교 기록 없음';
        const diff = Number(stats.hit||0)-Number(previous.hit||0);
        return diff === 0 ? '이전 기간과 같은 기록일' : `기록일 ${diff>0?'+':''}${diff}일`;
    }
    function hmHomeStatsMetricModel(item, stats, previous){
        const streak = hmHomeStatsStreak(stats.rows);
        if (item.mode === 'ratio') return [
            ['달성률', stats.main], ['완료 / 예정', `${stats.done||0} / ${stats.total||0}`], ['연속 달성', `${streak}일`]
        ];
        if (item.key === 'meal') {
            const counts=[0,1,2].map(index=>(stats.rows||[]).filter(row=>row.stat.meals?.[index]).length);
            return [['식사 기록률',stats.main],['아침 · 점심 · 저녁',`${counts[0]} · ${counts[1]} · ${counts[2]}일`],['식사 사진',`${stats.photoCount||0}장`]];
        }
        if (item.key === 'mood') return [['가장 많았던 기분',stats.main],['기분 기록',`${stats.hit}일`],['기분 종류',`${Object.keys(stats.counts||{}).length}가지`]];
        if (item.key === 'weight') return [['최근 체중',stats.main],['기간 변화',stats.hit>1?`${stats.diff>0?'+':''}${stats.diff}kg`:'비교 기록 부족'],['측정일',`${stats.hit}일`]];
        if (item.key === 'water') return [['하루 평균',stats.main],['2L 달성',`${stats.goalDays||0}일`],['기록일',`${stats.hit}일`]];
        if (item.mode === 'time') return [['평균 시간',stats.main],['시간 변동',stats.sub],['기록일',`${stats.hit}일`]];
        const label = item.key === 'exercise' ? '운동한 날' : item.key === 'outing' ? '순간을 남긴 날' : '하루를 작성한 날';
        return [[label,`${stats.hit}일`],['기간 기록률',`${stats.rate||0}%`],['연속 기록',`${streak}일`]];
    }
    function hmHomeStatsWeeklyGroups(rows){
        const groups=[];
        (rows||[]).forEach((row,index)=>{
            const groupIndex=Math.floor(index/7);
            if(!groups[groupIndex]) groups[groupIndex]={label:`${groupIndex+1}주`,rows:[]};
            groups[groupIndex].rows.push(row);
        });
        return groups;
    }
    function hmHomeStatsMonthlyOverview(item, stats){
        const groups=hmHomeStatsWeeklyGroups(stats.rows);
        const values=groups.map(group=>{
            if(item.mode==='ratio'||item.key==='meal'){
                const total=group.rows.reduce((sum,row)=>sum+Number(row.stat.total||0),0);
                const done=group.rows.reduce((sum,row)=>sum+Number(row.stat.done||0),0);
                return total?Math.round(done/total*100):0;
            }
            return group.rows.filter(row=>row.stat.hit).length;
        });
        const max=Math.max(...values,item.mode==='ratio'||item.key==='meal'?100:7,1);
        const bars=groups.map((group,index)=>`<div class="hm-flow-week-bar"><b>${group.label}</b><i><em style="width:${Math.round(values[index]/max*100)}%"></em></i><span>${values[index]}${item.mode==='ratio'||item.key==='meal'?'%':'일'}</span></div>`).join('');
        return `<section class="hm-home-stats-graph hm-flow-chart hm-flow-weekly-overview"><div><strong>주차별 변화</strong><span>${item.mode==='ratio'||item.key==='meal'?'달성률':'기록일'}</span></div><div class="hm-flow-week-bars">${bars}</div></section>`;
    }
    function hmHomeStatsTimeMinutes(value, itemKey){
        const text = String(value || '');
        const match = text.match(/(\d{1,2})\s*(?::|시|\.)?\s*(\d{1,2})?/);
        if (!match) return null;
        let hour = Math.max(0, Math.min(23, Number(match[1] || 0)));
        const minute = Math.max(0, Math.min(59, Number(match[2] || 0)));
        if (hour <= 12) {
            if (/(오후|밤)/.test(text)) hour = hour === 12 ? 12 : hour + 12;
            else if (/(오전|새벽|아침)/.test(text)) hour = hour === 12 ? 0 : hour;
            else if (itemKey === 'sleep' && hour >= 7 && hour <= 11) hour += 12;
        }
        const minutes = hour * 60 + minute;
        return itemKey === 'sleep' && minutes < 720 ? minutes + 1440 : minutes;
    }
    function hmHomeStatsFormatTimeMinutes(value){
        if (!Number.isFinite(value)) return '-';
        const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
        const hh = String(Math.floor(normalized / 60)).padStart(2,'0');
        const mm = String(normalized % 60).padStart(2,'0');
        return `${hh}:${mm}`;
    }
    function hmHomeStatsGraphValue(item, row){
        const stat = row?.stat || {};
        if (item.mode === 'ratio' || item.mode === 'meal') {
            const total = Number(stat.total || 0);
            return total ? Math.round(Number(stat.done || 0) / total * 100) : null;
        }
        if (!stat.hit) return null;
        if (item.key === 'weight' || item.key === 'water') return Number(stat.value || 0) || null;
        if (item.mode === 'time') return hmHomeStatsTimeMinutes(stat.label, item.key);
        if (item.key === 'mood') return stat.hit ? 1 : null;
        return stat.hit ? Number(stat.value || 1) : null;
    }
    function hmHomeStatsGraphUnit(item){
        if (item.mode === 'ratio' || item.mode === 'meal') return '%';
        if (item.key === 'weight') return 'kg';
        if (item.key === 'water') return 'ml';
        if (item.mode === 'time') return '시각';
        return '기록';
    }
    function hmHomeStatsChartTitle(item){
        if (item.mode === 'ratio') return '달성 흐름';
        if (item.key === 'mood') return '기분 분포';
        if (item.key === 'water') return '섭취 흐름';
        if (item.mode === 'time' || item.key === 'weight') return '변화 흐름';
        if (item.key === 'meal') return '식사 패턴';
        return '기록 패턴';
    }
    function hmHomeStatsDayLabel(row, index, total){
        if (hmHomeStatsPeriod === 'week' || index === 0 || index === total - 1) return Number(row.key.slice(-2));
        return '';
    }
    function hmHomeStatsMonthBlankCells(rows){
        if (hmHomeStatsPeriod !== 'month' || !rows.length) return '';
        const firstDate = hmHomeStatDateObj(rows[0].key);
        const blanks = (firstDate.getDay() + 6) % 7;
        return Array.from({length:blanks}, () => '<div class="hm-flow-month-cell is-blank" aria-hidden="true"></div>').join('');
    }
    function hmHomeStatsMonthWeekdays(){
        return '<div class="hm-flow-month-weekdays" aria-hidden="true"><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span><span>일</span></div>';
    }
    function hmHomeStatsEmptyChart(item, message){
        return `<section class="hm-home-stats-graph is-empty"><div><strong>${safe(hmHomeStatsChartTitle(item))}</strong><span>${safe(hmHomeStatsGraphUnit(item))}</span></div><p>${safe(message || '그래프를 보려면 같은 기간에 2일 이상 기록이 필요해요.')}</p></section>`;
    }
    function hmHomeStatsNiceGuides(values, unit, options={}){
        const valid = values.filter(value => Number.isFinite(value));
        if (!valid.length) return [];
        let min = Math.min(...valid), max = Math.max(...valid);
        if (options.floor != null) min = Math.min(min, options.floor);
        if (options.ceil != null) max = Math.max(max, options.ceil);
        if (min === max) {
            const bump = options.bump || (unit === 'kg' ? 1 : unit === 'ml' ? 500 : 60);
            min -= bump;
            max += bump;
        }
        let step = options.step;
        if (!step) {
            const range = Math.max(1, max - min);
            if (unit === 'kg') step = range <= 3 ? 0.5 : range <= 8 ? 1 : 2;
            else if (unit === 'ml') step = 500;
            else step = range <= 180 ? 30 : 60;
        }
        const low = Math.floor(min / step) * step;
        const high = Math.ceil(max / step) * step;
        const mid = Math.round(((low + high) / 2) / step) * step;
        return [low, mid, high].filter((value, index, arr) => arr.indexOf(value) === index).map(value => ({
            value,
            label: unit === '시각' ? hmHomeStatsFormatTimeMinutes(value) : `${value}${unit}`
        }));
    }
    function hmHomeStatsChartRange(values, guides){
        const valid = values.filter(value => Number.isFinite(value));
        const guideValues = (guides || []).map(g => g.value).filter(Number.isFinite);
        let min = Math.min(...valid, ...guideValues);
        let max = Math.max(...valid, ...guideValues);
        if (min === max) { min -= 1; max += 1; }
        const pad = (max - min) * 0.06;
        return { min:min - pad, max:max + pad };
    }
    function hmHomeStatsLinearChartHtml(item, stats, options={}){
        const rows = stats.rows || [];
        const values = rows.map(row => hmHomeStatsGraphValue(item, row));
        const valid = values.filter(value => Number.isFinite(value));
        if (valid.length < 2) return hmHomeStatsEmptyChart(item);
        const guidesData = options.guides || hmHomeStatsNiceGuides(valid, hmHomeStatsGraphUnit(item));
        const { min, max } = hmHomeStatsChartRange(valid, guidesData);
        const width = 430, height = 158, left = 40, right = 6, top = 12, bottom = 24;
        const plotW = width - left - right;
        const plotH = height - top - bottom;
        const yFor = value => top + plotH - ((value - min) / (max - min)) * plotH;
        const xFor = index => rows.length <= 1 ? left + plotW / 2 : left + (plotW * index / (rows.length - 1));
        const points = values.map((value, index) => Number.isFinite(value) ? { x:xFor(index), y:yFor(value), value, key:rows[index].key } : null);
        let path = '';
        let drawing = false;
        points.forEach(point => {
            if (!point) { drawing = false; return; }
            path += `${drawing ? ' L' : ' M'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
            drawing = true;
        });
        const guides = guidesData.map(guide => {
            if (!Number.isFinite(guide.value)) return '';
            const y = yFor(guide.value);
            return `<g class="hm-flow-guide"><line x1="${left}" y1="${y.toFixed(1)}" x2="${width - right}" y2="${y.toFixed(1)}"></line><text x="2" y="${(y + 3).toFixed(1)}">${safe(guide.label)}</text></g>`;
        }).join('');
        const dots = points.filter(Boolean).map(point => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="4.2"></circle>${item.mode === 'time' ? `<text class="hm-flow-point-label" x="${point.x.toFixed(1)}" y="${Math.max(10,point.y-8).toFixed(1)}">${hmHomeStatsFormatTimeMinutes(point.value)}</text>` : ''}`).join('');
        const labels = rows.map((row, index) => {
            const label = hmHomeStatsDayLabel(row, index, rows.length);
            return label ? `<text class="hm-flow-x-label" x="${xFor(index).toFixed(1)}" y="152">${label}</text>` : '';
        }).join('');
        return `<section class="hm-home-stats-graph hm-flow-chart is-line"><div><strong>${safe(hmHomeStatsChartTitle(item))}</strong><span>${safe(hmHomeStatsGraphUnit(item))}</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${safe(item.label)} ${safe(hmHomeStatsChartTitle(item))}">${guides}<line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line><line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line><path d="${path}"></path>${dots}<g>${labels}</g></svg></section>`;
    }
    function hmHomeStatsBarsHtml(item, stats, options={}){
        const rows = stats.rows || [];
        const values = rows.map(row => hmHomeStatsGraphValue(item, row));
        const valid = values.filter(value => Number.isFinite(value));
        if (!valid.length) return hmHomeStatsEmptyChart(item, '표시할 기록이 아직 없어요.');
        const guidesData = options.guides || [];
        const maxBase = Math.max(...valid, ...guidesData.map(g => g.value || 0), options.max || 0, 1);
        const width = 430, height = 148, left = 40, right = 6, top = 10, bottom = 24;
        const plotW = width - left - right;
        const plotH = height - top - bottom;
        const xStep = rows.length <= 1 ? plotW : plotW / rows.length;
        const barW = Math.max(2.5, Math.min(12, xStep * .58));
        const guides = guidesData.map(g => {
            const y = top + plotH - (Math.max(0, Math.min(maxBase, g.value)) / maxBase) * plotH;
            return `<g class="hm-flow-guide"><line x1="${left}" y1="${y.toFixed(1)}" x2="${width - right}" y2="${y.toFixed(1)}"></line><text x="2" y="${(y + 3).toFixed(1)}">${safe(g.label)}</text></g>`;
        }).join('');
        const bars = rows.map((row, index) => {
            const value = values[index];
            const x = rows.length <= 1 ? left + plotW / 2 - barW / 2 : left + index * xStep + (xStep - barW) / 2;
            const h = Number.isFinite(value) ? Math.max(3, (Math.min(value, maxBase) / maxBase) * plotH) : 2;
            const y = top + plotH - h;
            return `<rect class="${Number.isFinite(value) ? 'has-value' : 'is-empty'}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3"></rect>`;
        }).join('');
        const labels = rows.map((row, index) => {
            const label = hmHomeStatsDayLabel(row, index, rows.length);
            if (!label) return '';
            const x = rows.length <= 1 ? left + plotW / 2 : left + index * xStep + xStep / 2;
            return `<text class="hm-flow-x-label" x="${x.toFixed(1)}" y="142">${label}</text>`;
        }).join('');
        return `<section class="hm-home-stats-graph hm-flow-chart is-bars"><div><strong>${safe(hmHomeStatsChartTitle(item))}</strong><span>${safe(hmHomeStatsGraphUnit(item))}</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${safe(item.label)} ${safe(hmHomeStatsChartTitle(item))}">${guides}<line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line><line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>${bars}<g>${labels}</g></svg></section>`;
    }
    function hmHomeStatsRatioHtml(item, stats){
        const rows = stats.rows || [];
        const totalDone = rows.reduce((sum,row)=>sum + Number(row.stat.done || 0), 0);
        const totalGoal = rows.reduce((sum,row)=>sum + Number(row.stat.total || 0), 0);
        const pct = totalGoal ? Math.round(totalDone / totalGoal * 100) : 0;
        if (hmHomeStatsPeriod === 'month') {
            return hmHomeStatsMonthlyOverview(item, stats);
        }
        const width = 430, height = 126, left = 40, right = 6, top = 10, bottom = 22;
        const plotW = width - left - right;
        const plotH = height - top - bottom;
        const xStep = rows.length <= 1 ? plotW : plotW / rows.length;
        const barW = Math.max(2.5, Math.min(12, xStep * .58));
        const guides = [0, 50, 100].map(value => {
            const y = top + plotH - (value / 100) * plotH;
            return `<g class="hm-flow-guide"><line x1="${left}" y1="${y.toFixed(1)}" x2="${width - right}" y2="${y.toFixed(1)}"></line><text x="2" y="${(y + 3).toFixed(1)}">${value}%</text></g>`;
        }).join('');
        const bars = rows.map((row, index) => {
            const total = Number(row.stat.total || 0);
            const done = Number(row.stat.done || 0);
            const dayPct = total ? Math.round(done / total * 100) : 0;
            const x = rows.length <= 1 ? left + plotW / 2 - barW / 2 : left + index * xStep + (xStep - barW) / 2;
            const h = total ? Math.max(3, (dayPct / 100) * plotH) : 2;
            const y = top + plotH - h;
            return `<rect class="${total ? 'has-value' : 'is-empty'}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3"></rect>`;
        }).join('');
        const labels = rows.map((row, index) => {
            const label = hmHomeStatsDayLabel(row, index, rows.length);
            if (!label) return '';
            const x = rows.length <= 1 ? left + plotW / 2 : left + index * xStep + xStep / 2;
            return `<text class="hm-flow-x-label" x="${x.toFixed(1)}" y="120">${label}</text>`;
        }).join('');
        return `<section class="hm-home-stats-graph hm-flow-chart is-ratio"><div><strong>${safe(hmHomeStatsChartTitle(item))}</strong><span>%</span></div><div class="hm-flow-progress"><i style="width:${pct}%"></i><b>${pct}%</b><small>${totalDone}/${totalGoal || 0} 완료</small></div><svg class="hm-flow-ratio-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safe(item.label)} 날짜별 달성률">${guides}<line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line><line x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>${bars}<g>${labels}</g></svg></section>`;
    }
    function hmHomeStatsMoodHtml(item, stats){
        const rows = stats.rows || [];
        const counts = {};
        rows.forEach(row => { if (row.stat.hit) counts[row.stat.label] = (counts[row.stat.label] || 0) + 1; });
        const labels = ['아주 좋음','좋음','괜찮음','보통','힘듦','나쁨'];
        const allLabels = [...labels, ...Object.keys(counts).filter(label => !labels.includes(label))].filter(label => counts[label]);
        if (!allLabels.length) return hmHomeStatsEmptyChart(item, '선택된 기간에 기분 기록이 없어요.');
        const max = Math.max(...Object.values(counts), 1);
        const rowsHtml = allLabels.map(label => `<div class="hm-flow-mood-row"><b>${safe(label)}</b><i><em style="width:${Math.round((counts[label] || 0) / max * 100)}%"></em></i><span>${counts[label] || 0}일</span></div>`).join('');
        return `<section class="hm-home-stats-graph hm-flow-chart is-mood"><div><strong>${safe(hmHomeStatsChartTitle(item))}</strong><span>선택</span></div><div class="hm-flow-mood">${rowsHtml}</div></section>`;
    }
    function hmHomeStatsCheckHtml(item, stats){
        const rows = stats.rows || [];
        if (hmHomeStatsPeriod === 'month') {
            return hmHomeStatsMonthlyOverview(item, stats);
        }
        const dots = rows.map((row, index) => `<div class="hm-flow-dot ${row.stat.hit ? 'is-on' : 'is-off'}"><b>${row.stat.hit ? item.icon : '·'}</b><small>${hmHomeStatsPeriod === 'month' ? Number(row.key.slice(-2)) : hmHomeStatsDayLabel(row, index, rows.length)}</small></div>`).join('');
        return `<section class="hm-home-stats-graph hm-flow-chart is-check"><div><strong>${safe(hmHomeStatsChartTitle(item))}</strong><span>기록</span></div><div class="hm-flow-dots ${hmHomeStatsPeriod === 'month' ? 'is-month' : 'is-week'}">${dots}</div></section>`;
    }
    function hmHomeStatsMealHtml(item, stats){
        const rows = stats.rows || [];
        if (hmHomeStatsPeriod === 'month') {
            return hmHomeStatsMonthlyOverview(item, stats);
        }
        const bars = rows.map((row, index) => {
            const meals = Array.isArray(row.stat.meals) ? row.stat.meals : [false,false,false];
            return `<div class="hm-flow-meal-day"><div><i class="${meals[0] ? 'on' : ''}"></i><i class="${meals[1] ? 'on' : ''}"></i><i class="${meals[2] ? 'on' : ''}"></i></div><small>${hmHomeStatsPeriod === 'month' ? Number(row.key.slice(-2)) : hmHomeStatsDayLabel(row, index, rows.length)}</small></div>`;
        }).join('');
        return `<section class="hm-home-stats-graph hm-flow-chart is-meal"><div><strong>${safe(hmHomeStatsChartTitle(item))}</strong><span>아침·점심·저녁</span></div><div class="hm-flow-meals ${hmHomeStatsPeriod === 'month' ? 'is-month' : 'is-week'}">${bars}</div></section>`;
    }
    function hmHomeStatsGraphHtml(item, stats){
        if (item.mode === 'ratio') return hmHomeStatsRatioHtml(item, stats);
        if (item.key === 'mood') return hmHomeStatsMoodHtml(item, stats);
        if (item.key === 'weight') return hmHomeStatsLinearChartHtml(item, stats);
        if (item.key === 'water') return hmHomeStatsBarsHtml(item, stats, { guides:[{value:500,label:'500'},{value:1000,label:'1000'},{value:1500,label:'1500'},{value:2000,label:'2000'},{value:2500,label:'2500'}], max:2500 });
        if (item.key === 'wake') return hmHomeStatsLinearChartHtml(item, stats);
        if (item.key === 'sleep') return hmHomeStatsLinearChartHtml(item, stats);
        if (item.key === 'meal') return hmHomeStatsMealHtml(item, stats);
        return hmHomeStatsCheckHtml(item, stats);
    }
    function syncHomeTopOrder(){
        const roomEmpty = $('roomEmptyState');
        const roomCard = document.querySelector('.room-settings-card');
        const chatCard = $('chatLaunchCard');
        const recordDateInput = $('recordDate');
        const recordDateGroup = recordDateInput ? recordDateInput.closest('.input-group') : null;
        const notificationBar = $('hmNotificationBar');

        if (chatCard) {
            const chatAnchor = roomEmpty || roomCard;
            if (chatAnchor && chatCard.previousElementSibling !== chatAnchor) {
                chatAnchor.insertAdjacentElement('afterend', chatCard);
            }
        }
        if (recordDateGroup) {
            const dateAnchor = chatCard || roomEmpty || roomCard;
            if (dateAnchor && recordDateGroup.previousElementSibling !== dateAnchor) {
                dateAnchor.insertAdjacentElement('afterend', recordDateGroup);
            }
        }
        if (notificationBar) {
            const noticeAnchor = recordDateGroup || chatCard || roomEmpty || roomCard;
            if (noticeAnchor && notificationBar.previousElementSibling !== noticeAnchor) {
                noticeAnchor.insertAdjacentElement('afterend', notificationBar);
            }
        }

        return { roomCard, chatCard, recordDateGroup, notificationBar };
    }
    function buildHomeStatsCard(){
        let box = $('hmHomeStatsCard');
        if (!box) {
            box = document.createElement('section');
            box.id = 'hmHomeStatsCard';
            box.className = 'hm-beta-dashboard hm-home-stats-card';
            box.setAttribute('role','button');
            box.setAttribute('tabindex','0');
            box.setAttribute('aria-label','우리의 흐름 자세히 보기');
            box.innerHTML = `<div class="hm-summary-strip-head"><strong>우리의 흐름</strong><small>눌러서 자세히 보기</small></div><div class="hm-summary-strip" aria-label="우리의 흐름"><div class="hm-summary-dot"><b>📈</b><span id="hmHomeStatMini_overview">흐름</span></div><div class="hm-summary-dot"><b>💜</b><span id="hmHomeStatMini_promise">-</span></div><div class="hm-summary-dot"><b>🌱</b><span id="hmHomeStatMini_subRoutine">-</span></div><div class="hm-summary-dot"><b>📝</b><span id="hmHomeStatMini_diary">-</span></div><div class="hm-summary-dot"><b>💧</b><span id="hmHomeStatMini_water">-</span></div></div>`;
            box.addEventListener('click', () => window.hmOpenHomeStatsModal('promise'));
            box.addEventListener('keydown', event => { if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.hmOpenHomeStatsModal('promise'); } });
        }
        const topOrder = syncHomeTopOrder();
        const dashboard = $('hmProductDashboard');
        if (topOrder.notificationBar) topOrder.notificationBar.insertAdjacentElement('afterend', box);
        else if (topOrder.recordDateGroup) topOrder.recordDateGroup.insertAdjacentElement('afterend', box);
        else if (dashboard) dashboard.insertAdjacentElement('beforebegin', box);
        else topOrder.roomCard?.insertAdjacentElement('afterend', box);
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
        overlay.innerHTML = `<div class="daily-modal hm-home-stats-modal" role="dialog" aria-modal="true" aria-labelledby="hmHomeStatsTitle"><div class="daily-modal-head"><h2 id="hmHomeStatsTitle">📈 우리의 흐름</h2><button type="button" class="modal-close-btn" data-hm-action="close-home-stats">닫기</button></div><div class="hm-home-stats-menu">${HM_HOME_STAT_ITEMS.map(item => `<button type="button" data-home-stat="${item.key}" data-hm-action="open-home-stats" data-hm-value="${item.key}"><b>${item.icon}</b><span>${item.label}</span></button>`).join('')}</div><div class="hm-home-stats-period"><button type="button" data-stat-period="week" data-hm-action="set-home-stats-period" data-hm-value="week">주간</button><button type="button" data-stat-period="month" data-hm-action="set-home-stats-period" data-hm-value="month">한 달</button></div><div id="hmHomeStatsModalBody" class="hm-home-stats-modal-body"></div></div>`;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', event => { if (event.target === overlay) window.hmCloseHomeStatsModal(); });
        return overlay;
    }
    function renderHomeStatsModal(){
        const item = hmHomeStatsItem(hmHomeStatsActiveKey);
        const keys = hmHomeStatsPeriodKeys();
        const stats = hmHomeStatsSummary(item, keys);
        const previousStats = hmHomeStatsSummary(item, hmHomeStatsPreviousKeys());
        const body = $('hmHomeStatsModalBody') || ensureHomeStatsModal().querySelector('#hmHomeStatsModalBody');
        document.querySelectorAll('[data-stat-period]').forEach(btn => { const active = btn.dataset.statPeriod === hmHomeStatsPeriod; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed', active ? 'true' : 'false'); });
        document.querySelectorAll('[data-home-stat]').forEach(btn => btn.classList.toggle('active', btn.dataset.homeStat === item.key));
        const menu = ensureHomeStatsModal().querySelector('.hm-home-stats-menu');
        const activeMenu = menu?.querySelector(`[data-home-stat="${item.key}"]`);
        if (menu && activeMenu) activeMenu.scrollIntoView({ behavior:'smooth', inline:'center', block:'nearest' });
        const calendar = stats.rows.map(row => {
            const day = Number(row.key.slice(-2));
            const state = row.stat.hit ? 'has-stat' : 'empty-stat';
            return `<div class="hm-home-stats-day ${state}"><span>${day}</span><b>${item.icon}</b><small>${safe(row.stat.label)}</small></div>`;
        }).join('');
        const metricHtml = hmHomeStatsMetricModel(item,stats,previousStats).map(metric=>`<div><small>${safe(metric[0])}</small><strong>${safe(metric[1])}</strong></div>`).join('');
        const comparison = hmHomeStatsComparison(item,stats,previousStats);
        if (body) body.innerHTML = `<section class="hm-home-stats-hero"><div class="hm-home-stats-hero-icon">${item.icon}</div><div><strong>${safe(item.label)}</strong><span>${safe(hmHomeStatsPeriodLabel())}</span></div><em>${safe(stats.main)}</em></section><div class="hm-home-stats-metrics hm-home-stats-metrics-v2">${metricHtml}</div><div class="hm-home-stats-comparison"><b>↗</b><span>${safe(comparison)}</span></div><button type="button" class="hm-home-stats-graph-toggle" data-hm-action="toggle-home-stats-graph" aria-expanded="${hmHomeStatsGraphOpen ? 'true' : 'false'}">${hmHomeStatsGraphOpen ? '통계 흐름 접기' : '통계 흐름 보기'}</button><div ${hmHomeStatsGraphOpen ? '' : 'hidden'}>${hmHomeStatsGraphHtml(item, stats)}</div><button type="button" class="hm-home-stats-calendar-toggle" data-hm-action="toggle-home-stats-calendar" aria-expanded="${hmHomeStatsCalendarOpen ? 'true' : 'false'}">${hmHomeStatsCalendarOpen ? '날짜별 기록 접기' : '날짜별 기록 보기'}</button><div class="hm-home-stats-calendar ${hmHomeStatsPeriod === 'month' ? 'is-month' : 'is-week'} ${hmHomeStatsCalendarOpen ? 'is-open' : 'is-collapsed'}" ${hmHomeStatsCalendarOpen ? '' : 'hidden'}>${calendar}</div><p class="hm-home-stats-note">통계는 선택 날짜까지의 기록만 계산합니다. 날짜별 기록을 누르면 해당 날짜 내용을 확인할 수 있습니다.</p>`;
    }
    function hmHomeStatsModalIsOpen(){
        const overlay = $('hmHomeStatsOverlay');
        return !!overlay && overlay.getAttribute('aria-hidden') === 'false';
    }
    function hmRefreshHomeStatsModalSoon(){
        [120, 420, 900, 1600].forEach(delay => setTimeout(() => {
            if (hmHomeStatsModalIsOpen()) renderHomeStatsModal();
        }, delay));
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
    window.hmOpenHomeStatsModal = function(key){ hmHomeStatsActiveKey = key || hmHomeStatsActiveKey; const overlay = ensureHomeStatsModal(); if (overlay.getAttribute('aria-hidden') !== 'false') { hmHomeStatsCalendarOpen = false; hmHomeStatsGraphOpen = false; } renderHomeStatsModal(); if (typeof openModalOverlayById === 'function') openModalOverlayById('hmHomeStatsOverlay'); else { overlay.removeAttribute('inert'); overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden','false'); } hmRefreshHomeStatsModalSoon(); };
    window.hmCloseHomeStatsModal = function(){ if (typeof closeModalOverlayById === 'function') closeModalOverlayById('hmHomeStatsOverlay'); else { const overlay=$('hmHomeStatsOverlay'); if(overlay) overlay.style.display='none'; } };
    window.hmSetHomeStatsPeriod = function(period){ hmHomeStatsPeriod = period === 'month' ? 'month' : 'week'; renderHomeStatsModal(); };
    window.hmToggleHomeStatsCalendar = function(){ hmHomeStatsCalendarOpen = !hmHomeStatsCalendarOpen; renderHomeStatsModal(); };
    window.hmToggleHomeStatsGraph = function(){ hmHomeStatsGraphOpen = !hmHomeStatsGraphOpen; renderHomeStatsModal(); };
    function buildDashboard(){
        if (HM_STAGE < 2 || $('hmProductDashboard')) return;
        const anchor = document.querySelector('.room-settings-card'); if (!anchor) return;
        const box = document.createElement('section');
        box.id='hmProductDashboard'; box.className='hm-beta-dashboard';
        box.setAttribute('role','button');
        box.setAttribute('tabindex','0');
        box.setAttribute('aria-label','오늘의 요약 자세히 보기');
        box.innerHTML=`<div class="hm-summary-strip-head"><strong>오늘의 요약</strong><small>눌러서 자세히 보기</small></div><div class="hm-summary-strip" id="hmCustomSummaryStrip" aria-label="오늘의 요약"></div>`;
        box.addEventListener('click', openHomeSummaryModal);
        box.addEventListener('keydown', (event)=>{ if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openHomeSummaryModal(); } });
        const topOrder = syncHomeTopOrder();
        buildHomeStatsCard();
        const statsCard = $('hmHomeStatsCard');
        if (statsCard) statsCard.insertAdjacentElement('afterend', box);
        else if (topOrder.notificationBar) topOrder.notificationBar.insertAdjacentElement('afterend', box);
        else if (topOrder.recordDateGroup) topOrder.recordDateGroup.insertAdjacentElement('afterend', box);
        else anchor.insertAdjacentElement('afterend', box);
        syncHomeTopOrder();
        setTimeout(moveTodayPromiseSection, 0);
    }
    function updateDashboard(){
        if (HM_STAGE < 2) return;
        hmSummaryLoadForUser();
        buildDashboard();
        const rec=getCurrentRecord();
        const strip=$('hmCustomSummaryStrip'); if(strip) strip.innerHTML=hmSummaryRenderStrip(rec);
        updateHomeStatsCard();
        const statsCard = $('hmHomeStatsCard');
        const dashboard = $('hmProductDashboard');
        if (statsCard && dashboard && dashboard.previousElementSibling !== statsCard) {
            statsCard.insertAdjacentElement('afterend', dashboard);
        }
        syncHomeTopOrder();
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
                <div class="hm-summary-head-actions"><button type="button" class="hm-summary-settings-btn" data-hm-action="toggle-summary-settings">⚙ 설정</button><button type="button" class="modal-close-btn" data-hm-action="close-home-summary">닫기</button></div>
            </div>
            <div id="hmHomeSummaryModalBody" class="hm-home-summary-modal-body"></div>
            <div id="hmHomeSummarySettings" class="hm-home-summary-settings" hidden></div>
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
        const body = $('hmHomeSummaryModalBody') || ensureHomeSummaryModal().querySelector('#hmHomeSummaryModalBody');
        if (body) {
            const together=getTogetherDay();
            body.innerHTML = hmSummaryItems.map(key=>{ const item=HM_SUMMARY_CATALOG.find(x=>x.key===key), metric=hmSummaryMetric(key,rec); return item?summaryRow(item.icon,item.label,metric.value,metric.sub):''; }).join('') + (together?summaryRow('💕','함께한 지',`${together}일`,'대표 기념일 기준'):'') + `<div class="hm-summary-modal-updated">최근 업데이트 <strong>${safe(formatRecentUpdate(rec))}</strong></div>`;
        }
        const settings=$('hmHomeSummarySettings'); if(settings){ settings.hidden=true; settings.innerHTML=''; }
        if(body) body.hidden=false;
        if (typeof openModalOverlayById === 'function') openModalOverlayById('hmHomeSummaryOverlay');
        else { const overlay = ensureHomeSummaryModal(); overlay.removeAttribute('inert'); overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden','false'); }
    }
    window.hmOpenHomeSummaryModal = openHomeSummaryModal;
    window.hmCloseHomeSummaryModal = function(){ if (typeof closeModalOverlayById === 'function') closeModalOverlayById('hmHomeSummaryOverlay'); else { const overlay=$('hmHomeSummaryOverlay'); if(overlay) overlay.style.display='none'; } };
    function hmRenderSummarySettings(){
        const panel=$('hmHomeSummarySettings'); if(!panel) return;
        const rows=HM_SUMMARY_CATALOG.map(item=>{ const index=hmSummaryDraft.indexOf(item.key), selected=index>=0; return `<div class="hm-summary-setting-row${selected?' is-selected':''}"><label><input type="checkbox" ${selected?'checked':''} data-hm-change="toggle-summary-item" data-hm-value="${item.key}"><span>${item.icon}</span><strong>${safe(item.label)}</strong></label><div>${selected?`<button type="button" data-hm-action="move-summary-item" data-hm-value="${item.key}" data-hm-number="-1" aria-label="${safe(item.label)} 위로">↑</button><button type="button" data-hm-action="move-summary-item" data-hm-value="${item.key}" data-hm-number="1" aria-label="${safe(item.label)} 아래로">↓</button>`:''}</div></div>`; }).join('');
        panel.innerHTML=`<div class="hm-summary-settings-note"><strong>홈에 표시할 4개 기록 항목</strong><span>${hmSummaryDraft.length}/4 선택 · 함께한 날은 별도로 항상 표시됩니다.</span></div><div class="hm-summary-setting-list">${rows}</div><button type="button" class="daily-modal-save" data-hm-action="save-summary-settings" ${hmSummaryDraft.length!==4?'disabled':''}>요약 설정 저장</button>`;
    }
    window.hmToggleSummarySettings=function(){ const body=$('hmHomeSummaryModalBody'),panel=$('hmHomeSummarySettings'); if(!body||!panel)return; const opening=panel.hidden; if(opening){hmSummaryDraft=hmSummaryItems.slice();hmRenderSummarySettings();} panel.hidden=!opening;body.hidden=opening; };
    window.hmToggleSummaryItem=function(key,checked){ if(checked){ if(hmSummaryDraft.length>=4){alert('홈 요약은 최대 4개까지 선택할 수 있습니다.');hmRenderSummarySettings();return;} if(!hmSummaryDraft.includes(key))hmSummaryDraft.push(key); }else hmSummaryDraft=hmSummaryDraft.filter(x=>x!==key); hmRenderSummarySettings(); };
    window.hmMoveSummaryItem=function(key,direction){ const index=hmSummaryDraft.indexOf(key),next=index+Number(direction); if(index<0||next<0||next>=hmSummaryDraft.length)return; [hmSummaryDraft[index],hmSummaryDraft[next]]=[hmSummaryDraft[next],hmSummaryDraft[index]];hmRenderSummarySettings(); };
    window.hmSaveSummarySettings=async function(){
        if(hmSummaryDraft.length!==4)return alert('홈에 표시할 항목을 4개 선택해 주세요.');
        hmSummaryItems=hmSummaryNormalize(hmSummaryDraft); const uid=(typeof currentUser!=='undefined'&&currentUser?.uid)||'guest'; hmSummaryWriteLocal(uid,hmSummaryItems);
        if(uid!=='guest'&&typeof db!=='undefined'){ try{await db.ref(`users/${uid}/preferences`).update({homeSummaryItems:hmSummaryItems});}catch(e){} }
        updateDashboard(); openHomeSummaryModal(); if(typeof showSaveStatus==='function')showSaveStatus('⚙ 오늘의 요약 설정 저장 완료');
    };

    function renderMonthlyStats(){
        if (!HM_HISTORY_TOOLS_ENABLED || HM_STAGE < 3) return;
        const target=$('hmProductHistoryStats'); if(!target) return;
        const current=$('recordDate')?.value || dayKeys().slice(-1)[0] || ''; const ym=current ? current.slice(0,7) : '';
        const monthKeys=dayKeys().filter(k=>k.startsWith(ym)); let missions=0, done=0, photos=0; const moods={};
        monthKeys.forEach(k=>{ const r=days()[k]||{}; photos += typeof hmRecordMomentCount === 'function' ? hmRecordMomentCount(r) : (r.photo ? 1 : 0); if(r.moodLabel) moods[r.moodLabel]=(moods[r.moodLabel]||0)+1; (Array.isArray(r.missions)?r.missions:[]).forEach(m=>{missions++; if(m.done) done++;}); });
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
        if (HM_STAGE >= 4) html += `<div class="hm-beta-search-row"><input type="search" id="hmProductHistorySearch" placeholder="기록 검색: 여행, 마음, 미션..." data-hm-input="product-history-search"><button type="button" data-hm-action="export-current-history">내보내기</button></div><div id="hmProductHistorySearchResult" class="hm-beta-search-result"></div>`;
        if (HM_STAGE >= 5) html += '<div id="hmProductTimeline" class="hm-beta-timeline"></div>';
        tools.innerHTML=html; calendar.insertAdjacentElement('beforebegin', tools);
    }
    window.hmRenderHistorySearch=function(){
        if (!HM_HISTORY_TOOLS_ENABLED || HM_STAGE < 4) return;
        const q=($('hmProductHistorySearch')?.value||'').trim().toLowerCase(); const out=$('hmProductHistorySearchResult'); if(!out) return; if(!q){out.innerHTML='';return;}
        const rows=dayKeys().reverse().filter(k=>JSON.stringify(days()[k]||{}).toLowerCase().includes(q)).slice(0,20);
        out.innerHTML=rows.length ? rows.map(k=>`<button type="button" data-hm-action="select-history-date" data-hm-value="${k}"><strong>${dateLabel(k)}</strong><span>${safe(((days()[k]||{}).diary || (days()[k]||{}).moodLabel || '기록 보기').slice(0,42))}</span></button>`).join('') : '<div class="hm-beta-empty">검색 결과가 없습니다.</div>';
    };
    function renderTimeline(){
        if (!HM_HISTORY_TOOLS_ENABLED || HM_STAGE < 5) return;
        const out=$('hmProductTimeline'); if(!out) return; let items=[]; try{ if(typeof hmGetAllAnniversaryItems==='function') items=hmGetAllAnniversaryItems()||[]; }catch(e){}
        items=items.filter(i=>i&&i.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8); if(!items.length){out.innerHTML='';return;}
        out.innerHTML=`<div class="hm-beta-timeline-title">🌙 우리의 타임라인</div>` + items.map(i=>`<button type="button" data-hm-action="select-history-date" data-hm-value="${i.date}"><span>${i.icon || '💕'}</span><strong>${safe(i.title || '기념일')}</strong><small>${safe(i.date)}</small></button>`).join('');
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
    if(typeof od==='function') window.displayHistory=function(daysData){ hmHomeStatsLatestDaysData = daysData || hmHomeStatsLatestDaysData; const r=od.apply(this,arguments); setTimeout(applyPolish,0); setTimeout(()=>{ if(hmHomeStatsModalIsOpen()) renderHomeStatsModal(); },0); return r; };
    else { const timer=setInterval(()=>{ if(typeof window.displayHistory==='function'){ clearInterval(timer); const fn=window.displayHistory; window.displayHistory=function(daysData){ hmHomeStatsLatestDaysData = daysData || hmHomeStatsLatestDaysData; const r=fn.apply(this,arguments); setTimeout(applyPolish,0); setTimeout(()=>{ if(hmHomeStatsModalIsOpen()) renderHomeStatsModal(); },0); return r; }; }},200); setTimeout(()=>clearInterval(timer),10000); }
})();
