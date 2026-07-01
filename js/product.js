
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
            if (!dash || !title || !wrap || title.dataset.hmMoved === '1') return;
            const holder = document.createElement('section');
            holder.id = 'hmTodayPromiseSection';
            holder.className = 'hm-today-promise-section';
            dash.insertAdjacentElement('afterend', holder);
            holder.appendChild(title);
            holder.appendChild(wrap);
            if (toolbar) holder.appendChild(toolbar);
            title.dataset.hmMoved = '1';
        } catch(e) {}
    }
    function getNextAnniversary(){
        try {
            const items = typeof hmGetAllAnniversaryItems === 'function' ? hmGetAllAnniversaryItems() : [];
            const today = new Date(); today.setHours(0,0,0,0);
            return (items || []).filter(i => i && i.date).map(i => ({...i, time: new Date(i.date+'T00:00:00').getTime()}))
                .filter(i => i.time >= today.getTime()).sort((a,b)=>a.time-b.time)[0] || null;
        } catch(e) { return null; }
    }
    function buildDashboard(){
        if (HM_STAGE < 2 || $('hmProductDashboard')) return;
        const anchor = document.querySelector('.room-settings-card'); if (!anchor) return;
        const box = document.createElement('section');
        box.id='hmProductDashboard'; box.className='hm-beta-dashboard';
        box.innerHTML=`<div class="hm-beta-dashboard-head"><div><span>Home</span><strong>오늘의 요약</strong></div></div>
        <div class="hm-beta-dashboard-grid hm-home-summary-grid">
        <div class="hm-beta-tile"><small>오늘 기록</small><strong id="hmProductTodayStatus">대기중</strong></div>
        <div class="hm-beta-tile"><small>수분</small><strong id="hmProductWaterStatus">0ML</strong></div>
        <div class="hm-beta-tile"><small>체중</small><strong id="hmProductWeightStatus">-</strong></div>
        <div class="hm-beta-tile"><small>오늘의 약속</small><strong id="hmProductPromiseStatus">-</strong></div>
        <div class="hm-beta-tile"><small>다음 기념일</small><strong id="hmProductNextAnniversary">-</strong></div></div>`;
        anchor.insertAdjacentElement('afterend', box);
        setTimeout(moveTodayPromiseSection, 0);
    }
    function updateDashboard(){
        if (HM_STAGE < 2) return;
        buildDashboard();
        const rec=getCurrentRecord();
        const todayStatus=$('hmProductTodayStatus'); if(todayStatus) todayStatus.textContent = rec ? '저장됨' : (($('recordDate')?.value||'') ? '작성 중' : '날짜 선택');
        const water=$('hmProductWaterStatus'); if(water) { let w = 0; try { w = Number(window.currentWater || currentWater || 0); } catch(e) { w = 0; } water.textContent = w ? `${w}ML` : '0ML'; }
        const weight=$('hmProductWeightStatus'); if(weight) { const value = (($('weight')?.value || rec?.weight || '') + '').trim(); weight.textContent = value || '-'; }
        const promise=routineRatio(); const promiseStatus=$('hmProductPromiseStatus'); if(promiseStatus) promiseStatus.textContent = promise.total ? `${promise.done}/${promise.total}` : (promise.cards ? '항목 없음' : '등록 없음');
        const next=getNextAnniversary(); const ann=$('hmProductNextAnniversary'); if(ann) ann.textContent = next ? `${next.icon || '💕'} ${next.title || '기념일'}` : '등록 없음';
        moveTodayPromiseSection();
    }
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
        document.documentElement.setAttribute('data-hm-version','0.9.9');
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
