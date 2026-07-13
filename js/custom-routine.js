// =========================================================
// HearMe2nite RC2.11.4 STEP17
// custom-routine.js - Custom Routine Hub Data Safety Hotfix
// - 기본 카드/기존 days 구조는 유지한다.
// - 카드 정의: rooms/{roomCode}/customCards/{cardId}
// - 날짜별 입력값: rooms/{roomCode}/days/{date}/customCardValues
// =========================================================

const HM_CUSTOM_MAX_CARDS = 5;
const HM_CUSTOM_MAX_ITEMS = 7;
const HM_CUSTOM_CARD_TITLE_MAX = 20;
const HM_CUSTOM_CARD_DESC_MAX = 60;
const HM_CUSTOM_ITEM_LABEL_MAX = 24;
const HM_CUSTOM_ALLOWED_TYPES = ['text', 'checkbox', 'number', 'time'];

let hmCustomCardsRef = null;
let hmCustomCards = {};
let hmCustomValues = {};
let hmCustomEditingCardId = '';
let hmCustomActiveInputCardId = '';
let hmCustomDraftItems = [];

const HM_CUSTOM_DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function hmCustomSelectedDate() {
    const raw = document.getElementById('recordDate')?.value || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [y, m, d] = raw.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date();
}

function hmCustomCardKind(card) {
    return card?.kind === 'weekly' ? 'weekly' : 'mission';
}

function hmCustomCardWeekdays(card) {
    const days = Array.isArray(card?.weekdays) ? card.weekdays : [];
    return days.map(Number).filter(day => day >= 0 && day <= 6);
}

function hmCustomAppliesToday(card) {
    if (hmCustomCardKind(card) !== 'weekly') return true;
    const weekdays = hmCustomCardWeekdays(card);
    return weekdays.includes(hmCustomSelectedDate().getDay());
}

function hmCustomScheduleLabel(card) {
    if (hmCustomCardKind(card) !== 'weekly') return '오늘의 미션';
    const weekdays = hmCustomCardWeekdays(card);
    if (weekdays.length === 7) return '매일';
    return weekdays.length ? weekdays.map(day => HM_CUSTOM_DAY_LABELS[day]).join('·') : '요일 미지정';
}

function updateCustomRoutineScheduleUi() {
    const kind = document.querySelector('input[name="customRoutineKind"]:checked')?.value || 'mission';
    const box = document.getElementById('customRoutineWeekdayBox');
    if (box) box.hidden = kind !== 'weekly';
}

function selectAllCustomRoutineDays() {
    document.querySelectorAll('[data-custom-weekday]').forEach(input => { input.checked = true; });
}

function hmResetCustomRoutineSchedule() {
    const mission = document.querySelector('input[name="customRoutineKind"][value="mission"]');
    if (mission) mission.checked = true;
    document.querySelectorAll('[data-custom-weekday]').forEach(input => { input.checked = false; });
    updateCustomRoutineScheduleUi();
}

function hmCustomCardRows(includeInactive = false, includeDeleted = false) {
    return Object.entries(hmCustomCards || {})
        .map(([id, card]) => ({ id, ...(card || {}) }))
        .filter(card => includeDeleted || card.deleted !== true)
        // STEP5.6.3.5: 과거에 자동 생성된 의미 없는 '약속 체크' 카드는 화면에서 제외한다.
        // Firebase 원본은 삭제하지 않아 기존 사용자 데이터 호환성을 유지한다.
        .filter(card => String(card.title || '').trim() !== '약속 체크')
        .filter(card => includeInactive || card.active !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || '').localeCompare(String(b.title || '')));
}

function hmCustomCssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(String(value));
    return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function hmCustomItemRows(card) {
    return Object.entries(card?.items || {})
        .map(([id, item]) => ({ id, ...(item || {}) }))
        .filter(item => item.active !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function hmCustomSafeText(value, max = 120) {
    return String(value || '').trim().slice(0, max);
}

function hmCustomId(prefix = 'custom') {
    return `${prefix}_${Date.now().toString(36)}_${randomCode(4).toLowerCase()}`;
}

function hmStartCustomRoutineCards(roomCode) {
    if (hmCustomCardsRef) hmCustomCardsRef.off();
    hmCustomCardsRef = null;
    hmCustomCards = {};
    hmCustomValues = {};
    hmCustomEditingCardId = '';
    hmCustomActiveInputCardId = '';
    if (!roomCode || !hmIsSafeRoomCode(roomCode)) {
        renderCustomRoutineCards();
        renderCustomRoutineManager();
        return;
    }
    hmCustomCardsRef = db.ref(`rooms/${roomCode}/customCards`);
    hmCustomCardsRef.on('value', (snapshot) => {
        hmCustomCards = snapshot.val() || {};
        renderCustomRoutineCards();
        renderCustomRoutineManager();
    }, (err) => {
        hmReportError('hmStartCustomRoutineCards', err, hmIsFirebasePermissionError(err) ? '❌ 오늘의 약속 읽기 권한 없음' : '❌ 오늘의 약속 불러오기 실패');
    });
}

function hmStopCustomRoutineCards() {
    if (hmCustomCardsRef) hmCustomCardsRef.off();
    hmCustomCardsRef = null;
    hmCustomCards = {};
    hmCustomValues = {};
    renderCustomRoutineCards();
    renderCustomRoutineManager();
    renderCustomRoutineHub();
    if (typeof window.hmUpdateHomeSummary === 'function') setTimeout(window.hmUpdateHomeSummary, 0);
}

function hmSetCustomRoutineValues(values = {}) {
    hmCustomValues = values && typeof values === 'object' ? values : {};
    renderCustomRoutineCards();
    if (hmCustomActiveInputCardId) renderCustomRoutineInput(hmCustomActiveInputCardId);
    if (typeof window.hmUpdateHomeSummary === 'function') setTimeout(window.hmUpdateHomeSummary, 0);
}

function hmCollectCustomRoutineValues() {
    return hmCustomValues || {};
}

function hmBuildCustomRoutineReportText() {
    const rows = hmCustomCardRows(false);
    if (!rows.length) return '';
    const blocks = [];
    rows.forEach(card => {
        const items = hmCustomItemRows(card);
        if (!items.length) return;
        const lines = [];
        items.forEach(item => {
            const saved = hmCustomValues?.[card.id]?.[item.id] || {};
            let value = saved.value;
            if (item.type === 'checkbox') value = value === true ? '완료' : '미완료';
            if (value === undefined || value === null || value === '') value = '기록 없음';
            lines.push(`  - ${item.label || '항목'}: ${value}`);
        });
        if (lines.length) blocks.push(`💜 ${card.title || '오늘의 약속'}\n${lines.join('\n')}`);
    });
    return blocks.length ? `\n\n${blocks.join('\n\n')}` : '';
}

function renderCustomRoutineCards() {
    const list = document.getElementById('customRoutineList');
    const countText = document.getElementById('customRoutineCountText');
    const toolbar = document.getElementById('customRoutineToolbar');
    const manageBtn = document.getElementById('customRoutineManageBtn');
    const hubSub = document.getElementById('customRoutineHubSub');
    const hubCard = document.getElementById('customRoutineHubCard');
    const allRows = hmCustomCardRows(false);
    const rows = allRows.filter(hmCustomAppliesToday);
    const canManage = typeof canManageRelationshipCards === 'function' && canManageRelationshipCards();

    const totalItems = rows.reduce((sum, card) => sum + hmCustomItemRows(card).length, 0);
    const doneItems = rows.reduce((sum, card) => sum + hmCustomItemRows(card).filter(item => {
        const saved = hmCustomValues?.[card.id]?.[item.id];
        if (!saved) return false;
        if (item.type === 'checkbox') return saved.value === true;
        return saved.value !== undefined && saved.value !== null && String(saved.value).trim() !== '';
    }).length, 0);

    if (countText) countText.innerText = `${rows.length}개 오늘 · 전체 ${allRows.length}/${HM_CUSTOM_MAX_CARDS} · ${canManage ? '관리(Dom)가 설계' : '기록(Sub)은 입력만 가능'}`;
    if (toolbar) toolbar.style.display = canManage ? 'flex' : 'none';
    if (manageBtn) {
        manageBtn.style.display = canManage ? '' : 'none';
        manageBtn.disabled = !canManage;
    }
    if (hubCard) hubCard.disabled = !getRoomCodeForData();
    if (hubSub) {
        if (!getRoomCodeForData()) hubSub.innerText = '공간을 만들거나 연결하면 오늘의 약속을 사용할 수 있어요.';
        else if (!rows.length) hubSub.innerText = canManage ? '관리 버튼으로 첫 약속을 만들어 보세요.' : '관리(Dom)가 오늘의 약속을 만들면 표시됩니다.';
        else hubSub.innerText = `${rows.length}개 약속 · ${totalItems ? `${doneItems}/${totalItems} 입력 완료` : '항목 없음'}`;
    }

    // STEP5.6.3.2: 메인 카드 아래에는 선택 날짜에 해당하는 미션과 주간 루틴을 카드형으로 표시한다.
    if (list) {
        const todayRows = rows.filter(hmCustomAppliesToday);
        list.hidden = false;
        list.setAttribute('aria-hidden', 'false');
        list.innerHTML = todayRows.length ? todayRows.map(card => {
            const items = hmCustomItemRows(card);
            const doneCount = items.filter(item => {
                const saved = hmCustomValues?.[card.id]?.[item.id];
                if (!saved) return false;
                if (item.type === 'checkbox') return saved.value === true;
                return saved.value !== undefined && saved.value !== null && String(saved.value).trim() !== '';
            }).length;
            const complete = items.length > 0 && doneCount === items.length;
            return `<button type="button" class="custom-routine-home-item ${complete ? 'is-complete' : ''}" onclick="openCustomRoutineInput('${escapeHtml(card.id)}')">
                <span class="custom-routine-home-icon">${escapeHtml(card.icon || (hmCustomCardKind(card) === 'weekly' ? '🔁' : '📌'))}</span>
                <span class="custom-routine-home-text"><strong>${escapeHtml(card.title || '오늘의 약속')}</strong><small>${escapeHtml(hmCustomScheduleLabel(card))} · ${items.length ? `${doneCount}/${items.length} 완료` : '항목 없음'}</small></span>
                <span class="custom-routine-home-check">${complete ? '✓' : '○'}</span>
            </button>`;
        }).join('') : '<div class="custom-routine-home-empty">선택한 날짜에 해당하는 약속이 없습니다.</div>';
    }
    renderCustomRoutineHub();
}

function renderCustomRoutineHub() {
    const box = document.getElementById('customRoutineHubList');
    const actions = document.getElementById('customRoutineHubActions');
    const rows = hmCustomCardRows(false);
    const canManage = typeof canManageRelationshipCards === 'function' && canManageRelationshipCards();
    if (actions) actions.style.display = canManage ? 'flex' : 'none';
    if (!box) return;
    if (!getRoomCodeForData()) {
        box.innerHTML = '<div class="custom-routine-empty">공간을 먼저 연결해 주세요.</div>';
        return;
    }
    if (!rows.length) {
        box.innerHTML = canManage
            ? '<div class="custom-routine-empty">아직 오늘의 약속이 없습니다. 관리 화면에서 첫 약속을 만들어 주세요.</div>'
            : '<div class="custom-routine-empty">관리(Dom)가 오늘의 약속을 만들면 이곳에 표시됩니다.</div>';
        return;
    }
    box.innerHTML = rows.map(card => {
        const items = hmCustomItemRows(card);
        const doneCount = items.filter(item => {
            const saved = hmCustomValues?.[card.id]?.[item.id];
            if (!saved) return false;
            if (item.type === 'checkbox') return saved.value === true;
            return saved.value !== undefined && saved.value !== null && String(saved.value).trim() !== '';
        }).length;
        const sub = items.length ? `${doneCount}/${items.length} 입력 완료` : '항목이 없습니다.';
        return `<button type="button" class="custom-routine-hub-row" onclick="openCustomRoutineInput('${escapeHtml(card.id)}')">
            <span class="custom-routine-hub-icon">${escapeHtml(card.icon || '💜')}</span>
            <span class="custom-routine-hub-text"><strong>${escapeHtml(card.title || '오늘의 약속')}</strong><small>${escapeHtml(hmCustomScheduleLabel(card))} · ${escapeHtml(card.description || sub)} · ${escapeHtml(sub)}</small></span>
            <span class="custom-routine-hub-arrow">›</span>
        </button>`;
    }).join('');
}

function openCustomRoutineHub() {
    if (!getRoomCodeForData()) {
        alert('공간을 먼저 만들거나 연결해 주세요.');
        return;
    }
    renderCustomRoutineHub();
    openModalOverlayById('customRoutineHubOverlay');
}

function closeCustomRoutineHub() {
    closeModalOverlayById('customRoutineHubOverlay');
}

function openCustomRoutineManager() {
    if (!canManageRelationshipCards()) {
        alert('오늘의 약속 관리는 관리(Dom)만 사용할 수 있습니다.');
        return;
    }
    renderCustomRoutineManager();
    openModalOverlayById('customRoutineManagerOverlay');
}

function closeCustomRoutineManager() {
    closeModalOverlayById('customRoutineManagerOverlay');
}

function resetCustomRoutineEditor() {
    hmCustomEditingCardId = '';
    hmCustomDraftItems = [];
    const title = document.getElementById('customCardTitleInput');
    const desc = document.getElementById('customCardDescInput');
    if (title) title.value = '';
    if (desc) desc.value = '';
    hmResetCustomRoutineSchedule();
    renderCustomRoutineDraftItems();
}

function fillCustomRoutineTemplate(type = 'blank') {
    const title = document.getElementById('customCardTitleInput');
    const desc = document.getElementById('customCardDescInput');
    const templates = {
        blank: { title: '', desc: '', items: [] },
        mission: { title: '오늘의 약속', desc: '주인님이 바라는 오늘의 약속', items: [
            ['미션 완료', 'checkbox', ''], ['인증 메모', 'text', '어떻게 했는지 적기'], ['주인님께 한마디', 'text', '']
        ] },
        routine: { title: '생활 루틴', desc: '정해진 일과를 기록합니다', items: [
            ['시작 시간', 'time', ''], ['완료 여부', 'checkbox', ''], ['점수', 'number', '1~10'], ['메모', 'text', '']
        ] },
        free: { title: '자유형', desc: '자유롭게 적고 저장합니다', items: [
            ['내용', 'text', '오늘의 기록을 적어 주세요']
        ] }
    };
    const tpl = templates[type] || templates.blank;
    if (title) title.value = tpl.title;
    if (desc) desc.value = tpl.desc;
    const kindValue = type === 'routine' ? 'weekly' : 'mission';
    const kindInput = document.querySelector(`input[name="customRoutineKind"][value="${kindValue}"]`);
    if (kindInput) kindInput.checked = true;
    document.querySelectorAll('[data-custom-weekday]').forEach(input => { input.checked = kindValue === 'weekly'; });
    updateCustomRoutineScheduleUi();
    hmCustomDraftItems = tpl.items.map((row, idx) => ({ id: hmCustomId('draft'), label: row[0], type: row[1], placeholder: row[2], required: false, order: idx + 1, active: true }));
    renderCustomRoutineDraftItems();
}

function addCustomRoutineDraftItem() {
    syncCustomRoutineDraftFromDom();
    if (hmCustomDraftItems.length >= HM_CUSTOM_MAX_ITEMS) {
        alert(`카드 안 항목은 최대 ${HM_CUSTOM_MAX_ITEMS}개까지 가능합니다.`);
        return;
    }
    hmCustomDraftItems.push({ id: hmCustomId('draft'), label: '', type: 'text', placeholder: '', required: false, order: hmCustomDraftItems.length + 1, active: true });
    renderCustomRoutineDraftItems();
}

function removeCustomRoutineDraftItem(id) {
    syncCustomRoutineDraftFromDom();
    hmCustomDraftItems = hmCustomDraftItems.filter(item => item.id !== id).map((item, idx) => ({ ...item, order: idx + 1 }));
    renderCustomRoutineDraftItems();
}

function syncCustomRoutineDraftFromDom() {
    const box = document.getElementById('customRoutineDraftItems');
    if (!box) return;
    hmCustomDraftItems = Array.from(box.querySelectorAll('[data-draft-id]')).map((row, idx) => {
        const id = row.dataset.draftId;
        const label = row.querySelector('[data-draft-field="label"]')?.value || '';
        const type = row.querySelector('[data-draft-field="type"]')?.value || 'text';
        const placeholder = row.querySelector('[data-draft-field="placeholder"]')?.value || '';
        const required = row.querySelector('[data-draft-field="required"]')?.checked || false;
        return { id, label: hmCustomSafeText(label, HM_CUSTOM_ITEM_LABEL_MAX), type: HM_CUSTOM_ALLOWED_TYPES.includes(type) ? type : 'text', placeholder: hmCustomSafeText(placeholder, 40), required, order: idx + 1, active: true };
    });
}

function renderCustomRoutineDraftItems() {
    const box = document.getElementById('customRoutineDraftItems');
    if (!box) return;
    if (!hmCustomDraftItems.length) {
        box.innerHTML = '<div class="custom-routine-empty small">항목 추가 버튼으로 카드 안 메뉴를 만들어 주세요.</div>';
        return;
    }
    box.innerHTML = hmCustomDraftItems.map((item, idx) => `
        <div class="custom-routine-draft-row" data-draft-id="${escapeHtml(item.id)}">
            <span class="custom-routine-drag-no">${idx + 1}</span>
            <input type="text" data-draft-field="label" maxlength="${HM_CUSTOM_ITEM_LABEL_MAX}" placeholder="항목 이름" value="${escapeHtml(item.label || '')}">
            <select data-draft-field="type">
                <option value="text" ${item.type === 'text' ? 'selected' : ''}>텍스트</option>
                <option value="checkbox" ${item.type === 'checkbox' ? 'selected' : ''}>체크</option>
                <option value="number" ${item.type === 'number' ? 'selected' : ''}>숫자</option>
                <option value="time" ${item.type === 'time' ? 'selected' : ''}>시간</option>
            </select>
            <input type="text" data-draft-field="placeholder" maxlength="40" placeholder="안내 문구" value="${escapeHtml(item.placeholder || '')}">
            <label class="custom-routine-required"><input type="checkbox" data-draft-field="required" ${item.required ? 'checked' : ''}>필수</label>
            <button type="button" class="custom-routine-mini-danger" onclick="removeCustomRoutineDraftItem('${escapeHtml(item.id)}')">삭제</button>
        </div>
    `).join('');
}

function renderCustomRoutineManager() {
    const limit = document.getElementById('customRoutineManagerLimit');
    const managerList = document.getElementById('customRoutineManagerList');
    const rows = hmCustomCardRows(true);
    const activeRows = rows.filter(card => card.active !== false);
    if (limit) limit.innerText = `카드 ${activeRows.length}/${HM_CUSTOM_MAX_CARDS} · 카드당 항목 ${HM_CUSTOM_MAX_ITEMS}개까지`;
    renderCustomRoutineDraftItems();
    if (!managerList) return;
    if (!rows.length) {
        managerList.innerHTML = '<div class="custom-routine-empty">등록된 오늘의 약속 카드가 없습니다.</div>';
        return;
    }
    managerList.innerHTML = rows.map(card => {
        const items = hmCustomItemRows(card);
        return `
            <article class="custom-routine-manager-item ${card.active === false ? 'is-inactive' : ''}">
                <div>
                    <strong>${escapeHtml(card.title || '오늘의 약속')}</strong>
                    <small>${escapeHtml(card.description || '설명 없음')} · ${escapeHtml(hmCustomScheduleLabel(card))} · 항목 ${items.length}/${HM_CUSTOM_MAX_ITEMS}</small>
                </div>
                <div class="custom-routine-manager-actions">
                    <button type="button" onclick="editCustomRoutineCard('${escapeHtml(card.id)}')">수정</button>
                    <button type="button" onclick="toggleCustomRoutineCard('${escapeHtml(card.id)}')">${card.active === false ? '복구' : '숨김'}</button>
                    <button type="button" class="custom-routine-mini-danger" onclick="deleteCustomRoutineCard('${escapeHtml(card.id)}')">삭제</button>
                </div>
            </article>`;
    }).join('');
}

function editCustomRoutineCard(cardId) {
    const card = hmCustomCards?.[cardId];
    if (!card) return;
    hmCustomEditingCardId = cardId;
    const title = document.getElementById('customCardTitleInput');
    const desc = document.getElementById('customCardDescInput');
    if (title) title.value = card.title || '';
    if (desc) desc.value = card.description || '';
    const kind = hmCustomCardKind(card);
    const kindInput = document.querySelector(`input[name="customRoutineKind"][value="${kind}"]`);
    if (kindInput) kindInput.checked = true;
    const weekdays = hmCustomCardWeekdays(card);
    document.querySelectorAll('[data-custom-weekday]').forEach(input => { input.checked = weekdays.includes(Number(input.value)); });
    updateCustomRoutineScheduleUi();
    hmCustomDraftItems = hmCustomItemRows(card).map(item => ({ ...item }));
    renderCustomRoutineDraftItems();
}

async function saveCustomRoutineCard() {
    if (!canManageRelationshipCards()) return alert('오늘의 약속 관리는 관리(Dom)만 사용할 수 있습니다.');
    const roomCode = getRoomCodeForData();
    if (!roomCode || !hmIsSafeRoomCode(roomCode)) return alert('공간 연결 후 사용할 수 있습니다.');
    if (!(await hmRequireRoomAccess('오늘의 약속 저장', roomCode))) return;

    syncCustomRoutineDraftFromDom();
    const activeCount = hmCustomCardRows(false).length;
    const isNew = !hmCustomEditingCardId;
    if (isNew && activeCount >= HM_CUSTOM_MAX_CARDS) return alert(`오늘의 약속 카드는 최대 ${HM_CUSTOM_MAX_CARDS}개까지 가능합니다.`);

    const title = hmCustomSafeText(document.getElementById('customCardTitleInput')?.value, HM_CUSTOM_CARD_TITLE_MAX);
    const description = hmCustomSafeText(document.getElementById('customCardDescInput')?.value, HM_CUSTOM_CARD_DESC_MAX);
    const kind = document.querySelector('input[name="customRoutineKind"]:checked')?.value === 'weekly' ? 'weekly' : 'mission';
    const weekdays = Array.from(document.querySelectorAll('[data-custom-weekday]:checked')).map(input => Number(input.value)).sort((a, b) => a - b);
    if (!title) return alert('카드 이름을 입력해 주세요.');
    if (kind === 'weekly' && !weekdays.length) return alert('주간 루틴의 반복 요일을 1개 이상 선택해 주세요.');
    const cleanItems = hmCustomDraftItems
        .filter(item => item.label)
        .slice(0, HM_CUSTOM_MAX_ITEMS)
        .map((item, idx) => ({ ...item, order: idx + 1, active: true }));
    if (!cleanItems.length) return alert('카드 안 항목을 1개 이상 추가해 주세요.');

    const cardId = hmCustomEditingCardId || hmCustomId('card');
    const items = {};
    cleanItems.forEach((item, idx) => {
        const itemId = item.id && !item.id.startsWith('draft_') ? item.id : hmCustomId('item');
        items[itemId] = {
            label: hmCustomSafeText(item.label, HM_CUSTOM_ITEM_LABEL_MAX),
            type: HM_CUSTOM_ALLOWED_TYPES.includes(item.type) ? item.type : 'text',
            placeholder: hmCustomSafeText(item.placeholder, 40),
            required: item.required === true,
            order: idx + 1,
            active: true
        };
    });

    const prev = hmCustomCards?.[cardId] || {};
    const payload = {
        title,
        description,
        icon: prev.icon || (kind === 'weekly' ? '🔁' : '📌'),
        kind,
        weekdays: kind === 'weekly' ? weekdays : [],
        order: prev.order || (activeCount + 1),
        active: true,
        items,
        createdBy: prev.createdBy || currentUser?.uid || '',
        createdAt: prev.createdAt || firebase.database.ServerValue.TIMESTAMP,
        updatedBy: currentUser?.uid || '',
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    try {
        await db.ref(`rooms/${roomCode}/customCards/${cardId}`).set(payload);
        resetCustomRoutineEditor();
        showSaveStatus('💜 오늘의 약속 저장 완료');
    } catch (err) {
        hmReportError('saveCustomRoutineCard', err, hmIsFirebasePermissionError(err) ? '❌ 오늘의 약속 저장 권한 없음' : '❌ 오늘의 약속 저장 실패');
    }
}

async function toggleCustomRoutineCard(cardId) {
    if (!canManageRelationshipCards()) return;
    const roomCode = getRoomCodeForData();
    const card = hmCustomCards?.[cardId];
    if (!roomCode || !card) return;
    try {
        await db.ref(`rooms/${roomCode}/customCards/${cardId}`).update({ active: card.active === false, updatedBy: currentUser?.uid || '', updatedAt: firebase.database.ServerValue.TIMESTAMP });
    } catch (err) {
        hmReportError('toggleCustomRoutineCard', err, '❌ 오늘의 약속 상태 변경 실패');
    }
}

async function deleteCustomRoutineCard(cardId) {
    if (!canManageRelationshipCards()) return;
    const roomCode = getRoomCodeForData();
    if (!roomCode || !cardId) return;
    if (!confirm('이 오늘의 약속 카드를 삭제할까요? 기존 날짜 기록과 카드 제목은 보존되고, 홈/관리 목록에서만 사라집니다.')) return;
    try {
        await db.ref(`rooms/${roomCode}/customCards/${cardId}`).update({
            active: false,
            deleted: true,
            deletedBy: currentUser?.uid || '',
            deletedAt: firebase.database.ServerValue.TIMESTAMP,
            updatedBy: currentUser?.uid || '',
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        if (hmCustomEditingCardId === cardId) resetCustomRoutineEditor();
        showSaveStatus('💜 오늘의 약속 삭제 완료');
    } catch (err) {
        hmReportError('deleteCustomRoutineCard', err, '❌ 오늘의 약속 삭제 실패');
    }
}

function openCustomRoutineInput(cardId) {
    const card = hmCustomCards?.[cardId];
    if (!card || card.active === false) return;
    hmCustomActiveInputCardId = cardId;
    renderCustomRoutineInput(cardId);
    openModalOverlayById('customRoutineInputOverlay');
}

function closeCustomRoutineInput() {
    closeModalOverlayById('customRoutineInputOverlay');
    hmCustomActiveInputCardId = '';
    renderCustomRoutineCards();
}

function renderCustomRoutineInput(cardId) {
    const card = hmCustomCards?.[cardId];
    const title = document.getElementById('customRoutineInputTitle');
    const desc = document.getElementById('customRoutineInputDesc');
    const body = document.getElementById('customRoutineInputBody');
    if (!card || !body) return;
    if (title) title.innerText = `💜 ${card.title || '오늘의 약속'}`;
    if (desc) desc.innerText = card.description || '오늘의 기록을 남겨 주세요.';
    const items = hmCustomItemRows(card);
    if (!items.length) {
        body.innerHTML = '<div class="custom-routine-empty">이 카드에는 아직 항목이 없습니다.</div>';
        return;
    }
    body.innerHTML = items.map(item => {
        const saved = hmCustomValues?.[cardId]?.[item.id] || {};
        const value = saved.value;
        if (item.type === 'checkbox') {
            return `<label class="custom-routine-check-line"><input type="checkbox" data-custom-card="${escapeHtml(cardId)}" data-custom-item="${escapeHtml(item.id)}" ${value === true ? 'checked' : ''}> <span>${escapeHtml(item.label || '항목')}</span></label>`;
        }
        const inputType = item.type === 'number' ? 'number' : item.type === 'time' ? 'time' : 'text';
        return `<label class="custom-routine-input-line"><span>${escapeHtml(item.label || '항목')}${item.required ? ' *' : ''}</span><input type="${inputType}" data-custom-card="${escapeHtml(cardId)}" data-custom-item="${escapeHtml(item.id)}" placeholder="${escapeHtml(item.placeholder || '')}" value="${escapeHtml(value || '')}"></label>`;
    }).join('');
}

function saveCustomRoutineInput() {
    const cardId = hmCustomActiveInputCardId;
    const card = hmCustomCards?.[cardId];
    const body = document.getElementById('customRoutineInputBody');
    if (!cardId || !card || !body) return;
    const next = { ...(hmCustomValues || {}) };
    next[cardId] = { ...(next[cardId] || {}) };
    const requiredMissing = [];
    hmCustomItemRows(card).forEach(item => {
        const el = body.querySelector(`[data-custom-item="${hmCustomCssEscape(item.id)}"]`);
        if (!el) return;
        const value = item.type === 'checkbox' ? el.checked : el.value;
        if (item.required && item.type !== 'checkbox' && !String(value || '').trim()) requiredMissing.push(item.label || '항목');
        next[cardId][item.id] = {
            value,
            label: item.label || '',
            type: item.type || 'text',
            order: Number(item.order || 0),
            cardTitle: card.title || '오늘의 약속',
            cardDescription: card.description || '',
            updatedBy: currentUser?.uid || '',
            updatedAt: Date.now()
        };
    });
    if (requiredMissing.length) {
        alert(`필수 항목을 입력해 주세요: ${requiredMissing.join(', ')}`);
        return;
    }
    hmCustomValues = next;
    renderCustomRoutineCards();
    triggerAutoSave('custom-routine');
    closeCustomRoutineInput();
    showSaveStatus('💜 오늘의 약속 입력 저장 중...');
}

window.updateCustomRoutineScheduleUi = updateCustomRoutineScheduleUi;
window.selectAllCustomRoutineDays = selectAllCustomRoutineDays;
