// =========================================================
// HearMe2nite RC2.11~RC2.15 Beta Polish Pack
// - 베타 5인 테스트용 읽기 전용 UX 보강
// - Firebase / Room / History 저장 구조 / AutoSave / displayHistory 원본 직접 수정 없음
// =========================================================
(function(){
    if (window.__hmBetaPackInstalled) return;
    window.__hmBetaPackInstalled = true;

    const $ = (id) => document.getElementById(id);
    const safe = (v) => typeof escapeHtml === 'function' ? escapeHtml(String(v ?? '')) : String(v ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s]));
    const dateLabel = (ymd) => typeof formatHistoryDateLabel === 'function' ? formatHistoryDateLabel(ymd) : ymd;
    const days = () => (window.cachedDaysData || cachedDaysData || {});
    const dayKeys = () => Object.keys(days() || {}).sort();

    function getCurrentRecord(){
        const date = $('recordDate')?.value;
        return date && days()[date] ? days()[date] : null;
    }

    function missionRatio(record){
        const list = Array.isArray(record?.missions) ? record.missions : [];
        if (!list.length) return null;
        const done = list.filter(m => !!m.done).length;
        return { done, total:list.length, pct: Math.round(done / list.length * 100) };
    }

    function getNextAnniversary(){
        try {
            if (typeof hmGetAllAnniversaryItems !== 'function') return null;
            const today = new Date(); today.setHours(0,0,0,0);
            return (hmGetAllAnniversaryItems() || [])
                .filter(item => item && item.date)
                .map(item => ({...item, time: new Date(item.date + 'T00:00:00').getTime()}))
                .filter(item => item.time >= today.getTime())
                .sort((a,b) => a.time - b.time)[0] || null;
        } catch(e) { return null; }
    }

    function buildBetaDashboard(){
        if ($('hmBetaDashboard')) return;
        const anchor = document.querySelector('.room-settings-card');
        if (!anchor) return;
        const box = document.createElement('section');
        box.id = 'hmBetaDashboard';
        box.className = 'hm-beta-dashboard';
        box.innerHTML = `
            <div class="hm-beta-dashboard-head">
                <div><span>Beta Home</span><strong>오늘의 요약</strong></div>
                <button type="button" onclick="hmOpenBetaPanel()">베타 검수</button>
            </div>
            <div class="hm-beta-dashboard-grid">
                <div class="hm-beta-tile"><small>오늘 기록</small><strong id="hmBetaTodayStatus">대기중</strong></div>
                <div class="hm-beta-tile"><small>미션</small><strong id="hmBetaMissionStatus">-</strong></div>
                <div class="hm-beta-tile"><small>다음 기념일</small><strong id="hmBetaNextAnniversary">-</strong></div>
            </div>`;
        anchor.insertAdjacentElement('afterend', box);
    }

    function updateBetaDashboard(){
        buildBetaDashboard();
        const currentDate = $('recordDate')?.value || '';
        const rec = getCurrentRecord();
        const todayStatus = $('hmBetaTodayStatus');
        if (todayStatus) todayStatus.textContent = rec ? '저장됨' : (currentDate ? '작성 중' : '날짜 선택');
        const ratio = missionRatio(rec);
        const missionStatus = $('hmBetaMissionStatus');
        if (missionStatus) missionStatus.textContent = ratio ? `${ratio.done}/${ratio.total} · ${ratio.pct}%` : '기록 없음';
        const next = getNextAnniversary();
        const ann = $('hmBetaNextAnniversary');
        if (ann) ann.textContent = next ? `${next.icon || '💕'} ${next.title || '기념일'}` : '등록 없음';
    }

    function renderMonthlyStats(){
        const target = $('hmBetaHistoryStats');
        if (!target) return;
        const data = days();
        const current = $('recordDate')?.value || dayKeys().slice(-1)[0] || '';
        const ym = current ? current.slice(0,7) : '';
        const monthKeys = dayKeys().filter(k => k.startsWith(ym));
        let missions = 0, done = 0, photos = 0, diary = 0;
        const moods = {};
        monthKeys.forEach(k => {
            const r = data[k] || {};
            if (r.photo) photos++;
            if (r.diary) diary++;
            if (r.moodLabel) moods[r.moodLabel] = (moods[r.moodLabel] || 0) + 1;
            (Array.isArray(r.missions) ? r.missions : []).forEach(m => { missions++; if (m.done) done++; });
        });
        const topMood = Object.keys(moods).sort((a,b)=>moods[b]-moods[a])[0] || '기록 없음';
        const pct = missions ? Math.round(done / missions * 100) : 0;
        target.innerHTML = `
            <div class="hm-beta-history-title"><strong>📊 ${ym || '이번 달'} 베타 통계</strong><span>읽기 전용</span></div>
            <div class="hm-beta-history-grid">
                <div><strong>${monthKeys.length}</strong><small>기록일</small></div>
                <div><strong>${pct}%</strong><small>미션 완료</small></div>
                <div><strong>${photos}</strong><small>사진</small></div>
                <div><strong>${safe(topMood)}</strong><small>주요 기분</small></div>
            </div>`;
    }

    function buildHistoryTools(){
        const modal = document.querySelector('.history-panel-modal');
        const calendar = $('calendarBox');
        if (!modal || !calendar || $('hmBetaHistoryTools')) return;
        const tools = document.createElement('div');
        tools.id = 'hmBetaHistoryTools';
        tools.className = 'hm-beta-history-tools';
        tools.innerHTML = `
            <div id="hmBetaHistoryStats" class="hm-beta-history-stats"></div>
            <div class="hm-beta-search-row">
                <input type="search" id="hmBetaHistorySearch" placeholder="기록 검색: 여행, 마음, 미션..." oninput="hmRenderHistorySearch()">
                <button type="button" onclick="hmExportCurrentHistoryText()">내보내기</button>
            </div>
            <div id="hmBetaTimeline" class="hm-beta-timeline"></div>
            <div id="hmBetaHistorySearchResult" class="hm-beta-search-result"></div>`;
        calendar.insertAdjacentElement('beforebegin', tools);
    }

    window.hmRenderHistorySearch = function(){
        const q = ($('hmBetaHistorySearch')?.value || '').trim().toLowerCase();
        const out = $('hmBetaHistorySearchResult');
        if (!out) return;
        if (!q) { out.innerHTML = ''; return; }
        const rows = dayKeys().reverse().filter(k => JSON.stringify(days()[k] || {}).toLowerCase().includes(q)).slice(0, 20);
        out.innerHTML = rows.length ? rows.map(k => `<button type="button" onclick="selectHistoryDate('${k}')"><strong>${dateLabel(k)}</strong><span>${safe((days()[k]?.diary || days()[k]?.moodLabel || '기록 보기').slice(0, 42))}</span></button>`).join('') : '<div class="hm-beta-empty">검색 결과가 없습니다.</div>';
    };

    function renderTimeline(){
        const out = $('hmBetaTimeline');
        if (!out) return;
        let items = [];
        try { if (typeof hmGetAllAnniversaryItems === 'function') items = hmGetAllAnniversaryItems() || []; } catch(e) {}
        items = items.filter(i => i && i.date).sort((a,b)=>a.date.localeCompare(b.date)).slice(0, 8);
        if (!items.length) { out.innerHTML = ''; return; }
        out.innerHTML = `<div class="hm-beta-timeline-title">🌙 우리의 타임라인</div>` + items.map(i => `<button type="button" onclick="selectHistoryDate('${i.date}')"><span>${i.icon || '💕'}</span><strong>${safe(i.title || '기념일')}</strong><small>${safe(i.date)}</small></button>`).join('');
    }

    window.hmExportCurrentHistoryText = function(){
        const keys = dayKeys();
        if (!keys.length) { if (typeof showToast === 'function') showToast('내보낼 기록이 없습니다.'); return; }
        const text = keys.map(k => {
            const r = days()[k] || {};
            const missions = Array.isArray(r.missions) ? r.missions.map(m => `- ${m.done ? '✅' : '⬜'} ${m.text || '미션'}`).join('\n') : '';
            return `[${k}]\n기분: ${r.moodLabel || ''}\n미션:\n${missions}\n하루: ${r.diary || ''}\n피드백: ${r.replyMessage || ''}`;
        }).join('\n\n---\n\n');
        navigator.clipboard?.writeText(text).then(() => {
            if (typeof showToast === 'function') showToast('기록실 텍스트가 복사되었습니다.');
        }).catch(() => {
            const box = $('resultBox'); if (box) box.value = text;
            if (typeof showToast === 'function') showToast('결과창에 내보내기 내용을 넣었습니다.');
        });
    };

    window.hmOpenBetaPanel = function(){
        let overlay = $('hmBetaPanelOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'hmBetaPanelOverlay';
            overlay.className = 'daily-modal-overlay hm-beta-panel-overlay';
            overlay.onclick = e => { if (e.target.id === 'hmBetaPanelOverlay') hmCloseBetaPanel(); };
            overlay.innerHTML = `<div class="daily-modal hm-beta-panel"><div class="daily-modal-head"><h2>🧪 베타 검수 센터</h2><button type="button" class="modal-close-btn" onclick="hmCloseBetaPanel()">닫기</button></div><div id="hmBetaPanelBody"></div></div>`;
            document.body.appendChild(overlay);
        }
        const checks = [
            ['로그인/방 연결', !!window.activeRoomCode || typeof activeRoomCode !== 'undefined'],
            ['오늘 날짜 입력', !!$('recordDate')?.value],
            ['기록실 데이터 캐시', !!cachedDaysData],
            ['기념일 모듈', typeof hmOpenAnniversarySettings === 'function'],
            ['History Hook', !!window.__hmAnniversaryUnifiedHooksInstalled]
        ];
        $('hmBetaPanelBody').innerHTML = `<div class="hm-beta-check-list">${checks.map(c => `<div><span>${c[1] ? '✅' : '⬜'}</span><strong>${c[0]}</strong></div>`).join('')}</div><p class="hm-beta-note">베타 중 오류가 보이면 이 화면과 어떤 버튼을 눌렀는지만 캡처해서 보내면 됩니다.</p>`;
        if (typeof openModalOverlayById === 'function') openModalOverlayById('hmBetaPanelOverlay'); else overlay.style.display = 'flex';
    };
    window.hmCloseBetaPanel = function(){ if (typeof closeModalOverlayById === 'function') closeModalOverlayById('hmBetaPanelOverlay'); else $('hmBetaPanelOverlay').style.display = 'none'; };

    function afterRender(){
        try { updateBetaDashboard(); } catch(e) { console.warn('[Beta] dashboard skipped', e); }
        try { buildHistoryTools(); renderMonthlyStats(); renderTimeline(); } catch(e) { console.warn('[Beta] history tools skipped', e); }
    }

    document.addEventListener('DOMContentLoaded', () => setTimeout(afterRender, 200));
    document.addEventListener('input', e => { if (e.target && e.target.closest('#appContent')) setTimeout(updateBetaDashboard, 0); }, true);
    document.addEventListener('change', e => { if (e.target && e.target.closest('#appContent')) setTimeout(updateBetaDashboard, 0); }, true);

    const od = window.displayHistory;
    if (typeof od === 'function') {
        window.displayHistory = function(){ const r = od.apply(this, arguments); setTimeout(afterRender, 0); return r; };
    } else {
        const timer = setInterval(() => {
            if (typeof window.displayHistory === 'function') { clearInterval(timer); const fn = window.displayHistory; window.displayHistory = function(){ const r = fn.apply(this, arguments); setTimeout(afterRender, 0); return r; }; }
        }, 200);
        setTimeout(() => clearInterval(timer), 10000);
    }
})();
