// =========================================================
// HearMe2nite RC2.11 STEP16
// custom-routine.js - Custom Routine Card MVP
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

function hmCustomCardRows(includeInactive = false) {
    return Object.entries(hmCustomCards || {})
        .map(([id, card]) => ({ id, ...(card || {}) }))
        .filter(card => includeInactive || card.active !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || '').localeCompare(String(b.title || '')));
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
        hmReportError('hmStartCustomRoutineCards', err, hmIsFirebasePermissionError(err) ? '❌ 맞춤 루틴 읽기 권한 없음' : '❌ 맞춤 루틴 불러오기 실패');
    });
}

function hmStopCustomRoutineCards() {
    if (hmCustomCardsRef) hmCustomCardsRef.off();
    hmCustomCardsRef = null;
    hmCustomCards = {};
    hmCustomValues = {};
    renderCustomRoutineCards();
    renderCustomRoutineManager();
}

function hmSetCustomRoutineValues(values = {}) {
    hmCustomValues = values && typeof values === 'object' ? values : {};
    renderCustomRoutineCards();
    if (hmCustomActiveInputCardId) renderCustomRoutineInput(hmCustomActiveInputCardId);
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
        if (lines.length) blocks.push(`🧩 ${card.title || '맞춤 루틴'}\n${lines.join('\n')}`);
    });
    return blocks.length ? `\n\n${blocks.join('\n\n')}` : '';
}

function renderCustomRoutineCards() {
    const list = document.getElementById('customRoutineList');
    const countText = document.getElementById('customRoutineCountText');
    const toolbar = document.getElementById('customRoutineToolbar');
    const manageBtn = document.getElementById('customRoutineManageBtn');
    const rows = hmCustomCardRows(false);
    const canManage = typeof canManageRelationshipCards === 'function' && canManageRelationshipCards();

    if (countText) countText.innerText = `${rows.length}/${HM_CUSTOM_MAX_CARDS} · ${canManage ? '관리(Dom)가 설계' : '기록(Sub)은 입력만 가능'}`;
    if (toolbar) toolbar.style.display = canManage ? 'flex' : (rows.length ? 'none' : 'flex');
    if (manageBtn) {
        manageBtn.style.display = canManage ? '' : 'none';
        manageBtn.disabled = !canManage;
    }
    if (!list) return;

    if (!getRoomCodeForData()) {
        list.innerHTML = '<div class="custom-routine-empty">공간을 만들거나 연결하면 맞춤 루틴을 사용할 수 있어요.</div>';
        return;
    }
    if (!rows.length) {
        list.innerHTML = canManage
            ? '<div class="custom-routine-empty">아직 맞춤 루틴이 없습니다. 관리 버튼으로 첫 카드를 만들어 보세요.</div>'
            : '<div class="custom-routine-empty">관리(Dom)가 맞춤 루틴을 만들면 이곳에 표시됩니다.</div>';
        return;
    }

    list.innerHTML = rows.map(card => {
        const items = hmCustomItemRows(card);
        const doneCount = items.filter(item => {
            const saved = hmCustomValues?.[card.id]?.[item.id];
            if (!saved) return false;
            if (item.type === 'checkbox') return saved.value === true;
            return saved.value !== undefined && saved.value !== null && String(saved.value).trim() !== '';
        }).length;
        const sub = items.length ? `${doneCount}/${items.length} 입력 완료` : '항목이 없습니다.';
        return `
            <div class="input-group custom-routine-card-wrap">
                <button type="button" class="daily-card custom-routine-card" onclick="openCustomRoutineInput('${escapeHtml(card.id)}')">
                    <span class="daily-card-icon">${escapeHtml(card.icon || '🧩')}</span>
                    <span>
                        <span class="daily-card-title">${escapeHtml(card.title || '맞춤 루틴')}</span>
                        <span class="daily-card-sub">${escapeHtml(card.description || sub)} · ${escapeHtml(sub)}</span>
                    </span>
                    <span class="daily-card-arrow">›</span>
                </button>
            </div>`;
    }).join('');
}

function openCustomRoutineManager() {
    if (!canManageRelationshipCards()) {
        alert('맞춤 루틴 관리는 관리(Dom)만 사용할 수 있습니다.');
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
    renderCustomRoutineDraftItems();
}

function fillCustomRoutineTemplate(type = 'blank') {
    const title = document.getElementById('customCardTitleInput');
    const desc = document.getElementById('customCardDescInput');
    const templates = {
        blank: { title: '', desc: '', items: [] },
        mission: { title: '오늘의 미션', desc: '주인님이 바라는 오늘의 약속', items: [
            ['미션 완료', 'checkbox', ''], ['인증 메모', 'text', '어떻게 했는지 적기'], ['주인님께 한마디', 'text', '']
        ] },
        checklist: { title: '약속 체크', desc: '하루 약속을 체크합니다', items: [
            ['물 마시기', 'checkbox', ''], ['운동하기', 'checkbox', ''], ['정리하기', 'checkbox', ''], ['보고하기', 'checkbox', '']
        ] },
        routine: { title: '생활 루틴', desc: '정해진 일과를 기록합니다', items: [
            ['시작 시간', 'time', ''], ['완료 여부', 'checkbox', ''], ['점수', 'number', '1~10'], ['메모', 'text', '']
        ] }
    };
    const tpl = templates[type] || templates.blank;
    if (title) title.value = tpl.title;
    if (desc) desc.value = tpl.desc;
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
        managerList.innerHTML = '<div class="custom-routine-empty">등록된 맞춤 루틴 카드가 없습니다.</div>';
        return;
    }
    managerList.innerHTML = rows.map(card => {
        const items = hmCustomItemRows(card);
        return `
            <article class="custom-routine-manager-item ${card.active === false ? 'is-inactive' : ''}">
                <div>
                    <strong>${escapeHtml(card.title || '맞춤 루틴')}</strong>
                    <small>${escapeHtml(card.description || '설명 없음')} · 항목 ${items.length}/${HM_CUSTOM_MAX_ITEMS}</small>
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
    hmCustomDraftItems = hmCustomItemRows(card).map(item => ({ ...item }));
    renderCustomRoutineDraftItems();
}

async function saveCustomRoutineCard() {
    if (!canManageRelationshipCards()) return alert('맞춤 루틴 관리는 관리(Dom)만 사용할 수 있습니다.');
    const roomCode = getRoomCodeForData();
    if (!roomCode || !hmIsSafeRoomCode(roomCode)) return alert('공간 연결 후 사용할 수 있습니다.');
    if (!(await hmRequireRoomAccess('맞춤 루틴 저장', roomCode))) return;

    syncCustomRoutineDraftFromDom();
    const activeCount = hmCustomCardRows(false).length;
    const isNew = !hmCustomEditingCardId;
    if (isNew && activeCount >= HM_CUSTOM_MAX_CARDS) return alert(`맞춤 루틴 카드는 최대 ${HM_CUSTOM_MAX_CARDS}개까지 가능합니다.`);

    const title = hmCustomSafeText(document.getElementById('customCardTitleInput')?.value, HM_CUSTOM_CARD_TITLE_MAX);
    const description = hmCustomSafeText(document.getElementById('customCardDescInput')?.value, HM_CUSTOM_CARD_DESC_MAX);
    if (!title) return alert('카드 이름을 입력해 주세요.');
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
        icon: prev.icon || '🧩',
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
        showSaveStatus('🧩 맞춤 루틴 저장 완료');
    } catch (err) {
        hmReportError('saveCustomRoutineCard', err, hmIsFirebasePermissionError(err) ? '❌ 맞춤 루틴 저장 권한 없음' : '❌ 맞춤 루틴 저장 실패');
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
        hmReportError('toggleCustomRoutineCard', err, '❌ 맞춤 루틴 상태 변경 실패');
    }
}

async function deleteCustomRoutineCard(cardId) {
    if (!canManageRelationshipCards()) return;
    const roomCode = getRoomCodeForData();
    if (!roomCode || !cardId) return;
    if (!confirm('이 맞춤 루틴 카드를 삭제할까요? 기존 날짜 기록값은 보존되지만 홈에서는 사라집니다.')) return;
    try {
        await db.ref(`rooms/${roomCode}/customCards/${cardId}`).remove();
        if (hmCustomEditingCardId === cardId) resetCustomRoutineEditor();
    } catch (err) {
        hmReportError('deleteCustomRoutineCard', err, '❌ 맞춤 루틴 삭제 실패');
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
    if (title) title.innerText = `🧩 ${card.title || '맞춤 루틴'}`;
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
        const el = body.querySelector(`[data-custom-item="${CSS.escape(item.id)}"]`);
        if (!el) return;
        const value = item.type === 'checkbox' ? el.checked : el.value;
        if (item.required && item.type !== 'checkbox' && !String(value || '').trim()) requiredMissing.push(item.label || '항목');
        next[cardId][item.id] = {
            value,
            label: item.label || '',
            type: item.type || 'text',
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
    showSaveStatus('🧩 맞춤 루틴 입력 저장 중...');
}
