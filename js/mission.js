// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// mission.js - Mission
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // MODULE: MISSION / COMPACT UI



    // Split-ready target: updateMissionCompactUI



    // =========================================================




    // =========================================================
    // MODULE 09. MISSION
    // 분리 후보: mission.js
    // 오늘의 미션, 미션함, 미션 권한, 달성률, 미션 리포트 문구를 담당한다.
    // Mission 저장 배열 구조는 기존 데이터 호환 때문에 변경 금지.
    // =========================================================
    function updateMissionCompactUI() {
        const missions = collectMissions();
        const total = missions.length;
        const done = missions.filter(m => m.done).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const title = document.getElementById('missionCompactTitle');
        const sub = document.getElementById('missionCompactSub');
        const bar = document.getElementById('missionProgressBar');
        if (title) title.innerText = total ? `오늘 미션 ${done}/${total} 완료` : '오늘 미션 0개';
        if (sub) {
            if (total) sub.innerText = canManageRelationshipCards() ? `${pct}% 진행 중 · 관리(Dom)는 미션을 수정할 수 있어요.` : `${pct}% 진행 중 · 기록(Sub)은 완료 체크만 할 수 있어요.`;
            else sub.innerText = canManageRelationshipCards() ? '관리(Dom)가 오늘의 약속을 정해 주세요.' : '관리(Dom)가 미션을 작성하면 여기서 확인할 수 있어요.';
        }
        if (bar) bar.style.width = `${pct}%`;
    }

    // =========================================================

    // MODULE: MISSION / MODAL

    // Split-ready target: openMissionModal

    // =========================================================

    // 미션 팝업 열기
    // 현재 역할 권한을 반영한 뒤 미션 라이브러리를 로드한다.
    function openMissionModal() {
        openModalOverlayById('missionModalOverlay');
        updateMissionCompactUI();
        updateOwnerOnlySections();
        loadMissionLibrary();
        updateMissionAccessControls();
    }

    function closeMissionModal() {
        closeModalOverlayById('missionModalOverlay');
        updateMissionCompactUI();
    }


    // =========================================================


    // MODULE: MISSION / ROLE ACCESS


    // Split-ready target: updateMissionAccessControls


    // =========================================================


    function updateMissionAccessControls() {
        const canManage = canManageRelationshipCards();
        const roleNote = document.getElementById('missionRoleNote');
        if (roleNote) {
            roleNote.innerHTML = canManage
                ? '<strong>관리(Dom) 모드</strong><br>오늘의 미션을 작성하고 수정할 수 있어요. 기록(Sub)은 체크만 할 수 있습니다.'
                : '<strong>기록(Sub) 모드</strong><br>관리(Dom)가 작성한 미션은 수정할 수 없고, 완료 체크만 할 수 있어요.';
        }
        for (let i = 1; i <= 5; i++) {
            const textEl = document.getElementById(`missionText${i}`);
            const doneEl = document.getElementById(`missionDone${i}`);
            if (textEl) {
                textEl.disabled = !canManage;
                textEl.classList.toggle('mission-text-locked', !canManage);
                textEl.placeholder = canManage ? textEl.getAttribute('data-dom-placeholder') || textEl.placeholder : '관리(Dom)가 작성하는 영역입니다.';
                if (canManage && !textEl.getAttribute('data-dom-placeholder')) textEl.setAttribute('data-dom-placeholder', textEl.placeholder);
            }
            if (doneEl) doneEl.disabled = false;
            const clearEl = document.getElementById(`missionClear${i}`);
            if (clearEl) {
                clearEl.disabled = !canManage;
                clearEl.title = canManage ? '이 미션 칸을 비웁니다.' : '관리(Dom)만 미션을 삭제할 수 있어요.';
            }
        }
        document.querySelectorAll('.mission-chip').forEach((btn) => {
            btn.disabled = !canManage;
            btn.title = canManage ? '' : '관리(Dom)만 미션을 추가하거나 수정할 수 있어요.';
        });
        const libInput = document.getElementById('missionLibraryInput');
        if (libInput) libInput.disabled = !canManage;
    }

    // =========================================================

    // MODULE: MISSION / FIELD CHANGE

    // Split-ready target: handleMissionChanged

    // =========================================================

    // 미션 변경 처리
    // 체크/텍스트 변경 시 미션 요약과 자동저장을 연결한다.
    function handleMissionChanged(saveNow) {
        updateMissionAccessControls();
        updateMissionCompactUI();
        if (saveNow) triggerAutoSave('mission');
        else triggerAutoSave('mission');
    }

    function sanitizeMissionText(text) {
        return String(text || '').replace(/[\n\r\t]+/g, ' ').trim().slice(0, 80);
    }

    function jsStringLiteral(value) {
        return JSON.stringify(String(value || ''));
    }

    // =========================================================

    // MODULE: MISSION / LIBRARY LOAD

    // Split-ready target: loadMissionLibrary

    // =========================================================

    // 개인 미션 라이브러리 로드
    // 사용자 UID 하위에 저장된 자주 쓰는 미션을 불러온다.
    async function loadMissionLibrary() {
        const box = document.getElementById('missionLibraryList');
        if (!box) return;
        if (!currentUser || !activeRoomCode) {
            box.innerHTML = '<div class="empty-message">방에 연결되면 주인의 미션함을 사용할 수 있습니다.</div>';
            return;
        }
        try {
            const snap = await db.ref(`rooms/${activeRoomCode}/missionLibrary`).once('value');
            missionLibraryCache = snap.val() || {};
            renderMissionLibrary();
        } catch (err) {
            console.error(err);
            box.innerHTML = '<div class="empty-message">미션함을 불러오지 못했습니다. Firebase Rules를 확인해 주세요.</div>';
        }
    }

    // =========================================================

    // MODULE: MISSION / LIBRARY RENDER

    // Split-ready target: renderMissionLibrary

    // =========================================================

    function renderMissionLibrary() {
        const box = document.getElementById('missionLibraryList');
        if (!box) return;
        const items = Object.keys(missionLibraryCache || {}).map((id) => ({
            id,
            ...(missionLibraryCache[id] || {})
        })).filter(item => sanitizeMissionText(item.text));

        items.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
        if (items.length === 0) {
            box.innerHTML = '<div class="empty-message">아직 저장된 커스텀 미션이 없습니다. 관리(Dom)가 자주 쓰는 미션을 저장해두면 여기에 표시됩니다.</div>';
            updateMissionAccessControls();
            return;
        }

        box.innerHTML = items.map((item) => {
            const cleanText = sanitizeMissionText(item.text);
            const safeText = escapeHtml(cleanText);
            const deleteBtn = canManageRelationshipCards()
                ? `<button type="button" class="mission-mini-btn delete" onclick="deleteMissionFromLibrary('${item.id}')">삭제</button>`
                : '';
            return `
                <div class="mission-library-item">
                    <div class="mission-library-text">⭐ ${safeText}</div>
                    <button type="button" class="mission-mini-btn" onclick='addMissionTemplate(${jsStringLiteral(cleanText)})'>추가</button>
                    ${deleteBtn}
                </div>
            `;
        }).join('');
        updateMissionAccessControls();
    }

    // =========================================================

    // MODULE: MISSION / LIBRARY SAVE

    // Split-ready target: saveMissionToLibrary

    // =========================================================

    async function saveMissionToLibrary() {
        const input = document.getElementById('missionLibraryInput');
        const text = sanitizeMissionText(input?.value || '');
        if (!currentUser || !activeRoomCode) { alert('먼저 방에 연결해 주세요.'); return; }
        if (!canManageRelationshipCards()) { alert('주인의 미션함은 관리(Dom)만 저장할 수 있습니다.'); return; }
        if (!text) { alert('저장할 미션을 입력해 주세요.'); return; }
        try {
            const ref = db.ref(`rooms/${activeRoomCode}/missionLibrary`).push();
            await ref.set({
                text,
                createdBy: currentUser.uid,
                createdByEmail: currentUser.email,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            if (input) input.value = '';
            showSaveStatus('👑 미션함 저장 완료');
            await loadMissionLibrary();
        } catch (err) {
            console.error(err);
            alert('미션함 저장에 실패했습니다. Firebase Rules를 확인해 주세요.');
            showSaveStatus('❌ 미션함 저장 실패');
        }
    }

    async function deleteMissionFromLibrary(missionId) {
        if (!currentUser || !activeRoomCode || !canManageRelationshipCards()) return;
        const ok = confirm('이 미션을 주인의 미션함에서 삭제할까요? 오늘의 미션에 이미 추가된 내용은 삭제되지 않습니다.');
        if (!ok) return;
        try {
            await db.ref(`rooms/${activeRoomCode}/missionLibrary/${missionId}`).remove();
            showSaveStatus('👑 미션함 삭제 완료');
            await loadMissionLibrary();
        } catch (err) {
            console.error(err);
            alert('미션 삭제에 실패했습니다.');
            showSaveStatus('❌ 미션함 삭제 실패');
        }
    }

    // =========================================================

    // MODULE: MISSION / TEMPLATE

    // Split-ready target: addMissionTemplate

    // =========================================================

    function clearMissionRow(index) {
        if (!canManageRelationshipCards()) {
            alert('오늘의 미션 삭제는 관리(Dom)만 할 수 있습니다. 기록(Sub)은 완료 체크만 가능합니다.');
            updateMissionAccessControls();
            return;
        }
        const textEl = document.getElementById(`missionText${index}`);
        const doneEl = document.getElementById(`missionDone${index}`);
        if (!textEl && !doneEl) return;
        const hasValue = !!(textEl?.value || '').trim() || !!doneEl?.checked;
        if (!hasValue) return;
        if (textEl) textEl.value = '';
        if (doneEl) doneEl.checked = false;
        showSaveStatus('🗑️ 미션 삭제 완료');
        handleMissionChanged(true);
    }

    function addMissionTemplate(text) {
        if (!canManageRelationshipCards()) {
            alert('오늘의 미션은 관리(Dom)만 작성하거나 수정할 수 있습니다. 기록(Sub)은 완료 체크만 가능합니다.');
            updateMissionAccessControls();
            return;
        }
        for (let i = 1; i <= 5; i++) {
            const textEl = document.getElementById(`missionText${i}`);
            const doneEl = document.getElementById(`missionDone${i}`);
            if (textEl && !textEl.value.trim()) {
                textEl.value = text;
                if (doneEl) doneEl.checked = false;
                handleMissionChanged(false);
                return;
            }
        }
        alert('미션 칸이 모두 사용 중입니다. 필요 없는 미션을 비우고 다시 추가해 주세요.');
    }

    function addRandomMission() {
        if (!canManageRelationshipCards()) {
            alert('추천 미션 추가는 관리(Dom)만 사용할 수 있습니다.');
            updateMissionAccessControls();
            return;
        }
        const items = [
            '오늘 가장 솔직했던 마음을 주인에게 한 줄로 보고하기',
            '오늘의 셀카 한 장 남기기',
            '지정된 호칭으로 하루 마무리 보고하기',
            '오늘의 복장 인증 남기기',
            '주인이 정한 시간에 짧게 체크인하기',
            '프라이빗한 해피타임 갖고 느낀 점 한 줄 남기기',
            '오늘 주인에게 듣고 싶은 말 하나 적기',
            '오늘 지킨 약속 하나와 어려웠던 점 하나 적기'
        ];
        const text = items[Math.floor(Math.random() * items.length)];
        addMissionTemplate(text);
    }

    // =========================================================

    // MODULE: MISSION / COLLECT DATA

    // Split-ready target: collectMissions

    // =========================================================

    // 화면의 미션 입력값 수집
    // 저장 데이터의 missions 배열 생성 기준 함수이므로 필드명 변경 금지.
    function collectMissions() {
        const missions = [];
        for (let i = 1; i <= 5; i++) {
            const textEl = document.getElementById(`missionText${i}`);
            const doneEl = document.getElementById(`missionDone${i}`);
            const text = (textEl?.value || '').trim();
            const done = !!doneEl?.checked;
            if (text || done) {
                missions.push({ text: text || `미션 ${i}`, done });
            }
        }
        return missions;
    }

    function renderMissions(missions) {
        const list = Array.isArray(missions) ? missions : [];
        for (let i = 1; i <= 5; i++) {
            const item = list[i - 1] || {};
            const textEl = document.getElementById(`missionText${i}`);
            const doneEl = document.getElementById(`missionDone${i}`);
            if (textEl && document.activeElement !== textEl) textEl.value = item.text || '';
            if (doneEl) doneEl.checked = !!item.done;
        }
        updateMissionCompactUI();
    }

    function getMissionSummary(missions) {
        if (!Array.isArray(missions) || missions.length === 0) return '기록 없음';
        const doneCount = missions.filter(m => m.done).length;
        return `${doneCount}/${missions.length} 완료`;
    }

    function getMissionReportText(missions) {
        if (!Array.isArray(missions) || missions.length === 0) return '기록 없음';
        return missions.map((m) => `  - ${m.done ? '✅' : '⬜'} ${m.text || '미션'}`).join('\n');
    }

    // =========================================================

    // MODULE: MISSION / RESET UI

    // Split-ready target: clearMissionAndMoodUI

    // =========================================================

    function clearMissionAndMoodUI() {
        renderMissions([]);
        selectedMood = '';
        updateMoodUI();
        const moodNote = document.getElementById('moodNote');
        if (moodNote && document.activeElement !== moodNote) moodNote.value = '';
        updateMissionCompactUI();
    }


    // =========================================================



