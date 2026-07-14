// =========================================================
// HearMe2nite v1.0 STEP5.8.4
// theme.js - 개인/공용 색상 테마 + 개인 화면 표시 방식
// =========================================================

const HM_THEME_DEFAULT = 'lavender';
const HM_THEME_NAMES = Object.freeze({
    lavender: '라벤더', blossom: '블라썸', ocean: '오션',
    forest: '포레스트', cream: '크림'
});
const HM_DISPLAY_DEFAULT = 'system';
const HM_DISPLAY_NAMES = Object.freeze({ light: '라이트', dark: '다크', system: '시스템' });

let hmCurrentTheme = HM_THEME_DEFAULT;
let hmPersonalTheme = HM_THEME_DEFAULT;
let hmThemeBeforePreview = HM_THEME_DEFAULT;
let hmThemePreview = HM_THEME_DEFAULT;
let hmThemeSavedInModal = false;
let hmThemeModePreview = 'personal';
let hmSharedThemeEnabled = false;
let hmSharedTheme = HM_THEME_DEFAULT;
let hmSharedThemeRef = null;
let hmSharedThemeRoomCode = '';
let hmDisplayMode = HM_DISPLAY_DEFAULT;
let hmDisplayBeforePreview = HM_DISPLAY_DEFAULT;
let hmDisplayPreview = HM_DISPLAY_DEFAULT;
let hmSystemDisplayQuery = null;

function hmNormalizeTheme(value) {
    const theme = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(HM_THEME_NAMES, theme) ? theme : HM_THEME_DEFAULT;
}
function hmNormalizeDisplayMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(HM_DISPLAY_NAMES, mode) ? mode : HM_DISPLAY_DEFAULT;
}
function hmThemeStorageKey(uid) { return `hm_theme_${uid || 'guest'}`; }
function hmDisplayStorageKey(uid) { return `hm_display_mode_${uid || 'guest'}`; }
function hmResolveDisplayMode(mode) {
    const safe = hmNormalizeDisplayMode(mode);
    if (safe !== 'system') return safe;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function hmApplyTheme(theme, rememberLast = true) {
    const safeTheme = hmNormalizeTheme(theme);
    document.documentElement.setAttribute('data-hm-theme', safeTheme);
    hmCurrentTheme = safeTheme;
    if (rememberLast) { try { localStorage.setItem('hm_theme_last', safeTheme); } catch (e) { console.warn('[Theme] 마지막 테마 저장 실패', e); } }
    return safeTheme;
}
function hmApplyDisplayMode(mode, rememberLast = true) {
    const safeMode = hmNormalizeDisplayMode(mode);
    document.documentElement.setAttribute('data-hm-display-mode', safeMode);
    document.documentElement.setAttribute('data-hm-display', hmResolveDisplayMode(safeMode));
    if (rememberLast) { try { localStorage.setItem('hm_display_mode_last', safeMode); } catch (e) { console.warn('[Theme] 표시 방식 저장 실패', e); } }
    return safeMode;
}
function hmReadLocalTheme(uid) {
    try {
        const stored = localStorage.getItem(hmThemeStorageKey(uid)) || localStorage.getItem('hm_theme_last');
        if (stored === 'midnight') return HM_THEME_DEFAULT;
        return hmNormalizeTheme(stored);
    } catch (e) { return HM_THEME_DEFAULT; }
}
function hmReadLocalDisplayMode(uid) {
    try {
        const oldTheme = localStorage.getItem(hmThemeStorageKey(uid)) || localStorage.getItem('hm_theme_last');
        const stored = localStorage.getItem(hmDisplayStorageKey(uid)) || localStorage.getItem('hm_display_mode_last');
        return oldTheme === 'midnight' && !stored ? 'dark' : hmNormalizeDisplayMode(stored);
    } catch (e) { return HM_DISPLAY_DEFAULT; }
}
function hmWriteLocalTheme(uid, theme) {
    try {
        localStorage.setItem(hmThemeStorageKey(uid), hmNormalizeTheme(theme));
        localStorage.setItem('hm_theme_last', hmNormalizeTheme(theme));
    } catch (e) { console.warn('[Theme] 브라우저 저장 실패', e); }
}
function hmWriteLocalDisplayMode(uid, mode) {
    try {
        localStorage.setItem(hmDisplayStorageKey(uid), hmNormalizeDisplayMode(mode));
        localStorage.setItem('hm_display_mode_last', hmNormalizeDisplayMode(mode));
    } catch (e) { console.warn('[Theme] 표시 방식 브라우저 저장 실패', e); }
}
function hmCanManageSharedTheme() {
    return !!currentUser && !!activeRoomCode && (activeRoomRole === 'owner' || activeRelationshipRole === 'dom');
}
function hmEffectiveTheme() { return hmSharedThemeEnabled && activeRoomCode ? hmSharedTheme : hmPersonalTheme; }
function hmApplyEffectiveTheme() { return hmApplyTheme(hmEffectiveTheme()); }

function hmInitSystemDisplayListener() {
    if (!window.matchMedia || hmSystemDisplayQuery) return;
    hmSystemDisplayQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
        if (hmDisplayPreview === 'system' || hmDisplayMode === 'system') {
            document.documentElement.setAttribute('data-hm-display', hmResolveDisplayMode('system'));
        }
    };
    if (hmSystemDisplayQuery.addEventListener) hmSystemDisplayQuery.addEventListener('change', handler);
    else if (hmSystemDisplayQuery.addListener) hmSystemDisplayQuery.addListener(handler);
}

async function loadUserTheme() {
    const uid = currentUser ? currentUser.uid : 'guest';
    hmPersonalTheme = hmReadLocalTheme(uid);
    hmDisplayMode = hmReadLocalDisplayMode(uid);
    hmDisplayPreview = hmDisplayMode;
    hmApplyTheme(hmPersonalTheme);
    hmApplyDisplayMode(hmDisplayMode);
    hmInitSystemDisplayListener();
    if (!currentUser) return hmCurrentTheme;
    try {
        const snap = await db.ref(`users/${currentUser.uid}/preferences`).once('value');
        const value = snap.val() || {};
        const wasLegacyMidnight = value.theme === 'midnight';
        if (value.theme && (wasLegacyMidnight || Object.prototype.hasOwnProperty.call(HM_THEME_NAMES, String(value.theme)))) {
            hmPersonalTheme = wasLegacyMidnight ? HM_THEME_DEFAULT : hmNormalizeTheme(value.theme);
            hmWriteLocalTheme(currentUser.uid, hmPersonalTheme);
            if (!hmSharedThemeEnabled) hmApplyTheme(hmPersonalTheme);
        }
        hmDisplayMode = wasLegacyMidnight && !value.displayMode ? 'dark' : hmNormalizeDisplayMode(value.displayMode);
        hmDisplayPreview = hmDisplayMode;
        hmWriteLocalDisplayMode(currentUser.uid, hmDisplayMode);
        hmApplyDisplayMode(hmDisplayMode);
        if (wasLegacyMidnight) {
            db.ref(`users/${currentUser.uid}/preferences`).update({
                theme: HM_THEME_DEFAULT, displayMode: hmDisplayMode,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});
        }
    } catch (err) {
        hmReportError('loadUserTheme', err, hmIsFirebasePermissionError(err) ? '테마 설정 읽기 권한을 확인해 주세요.' : '저장된 테마 설정을 불러오지 못했습니다.');
    }
    return hmCurrentTheme;
}

function hmStopSharedThemeListener() {
    if (hmSharedThemeRef) hmSharedThemeRef.off();
    hmSharedThemeRef = null;
    hmSharedThemeRoomCode = '';
}
function hmListenSharedThemeForActiveRoom() {
    hmStopSharedThemeListener();
    if (!currentUser || !activeRoomCode) {
        hmSharedThemeEnabled = false;
        hmSharedTheme = HM_THEME_DEFAULT;
        hmApplyTheme(hmPersonalTheme);
        return;
    }
    hmSharedThemeRoomCode = activeRoomCode;
    hmSharedThemeRef = db.ref(`rooms/${activeRoomCode}/themeSettings`);
    hmSharedThemeRef.on('value', (snap) => {
        if (hmSharedThemeRoomCode !== activeRoomCode) return;
        const value = snap.val() || {};
        hmSharedThemeEnabled = value.enabled === true;
        hmSharedTheme = value.theme === 'midnight' ? HM_THEME_DEFAULT : hmNormalizeTheme(value.theme);
        hmApplyEffectiveTheme();
        hmRefreshThemeModalState();
    }, (err) => {
        console.warn('[Theme] 공용 테마 listener 오류', err);
        hmSharedThemeEnabled = false;
        hmApplyTheme(hmPersonalTheme);
    });
}
function hmRefreshThemeForActiveRoom() { hmListenSharedThemeForActiveRoom(); }

function hmRefreshThemeOptions() {
    document.querySelectorAll('.hm-theme-option').forEach((button) => {
        const selected = button.dataset.theme === hmThemePreview;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
        button.disabled = hmThemeModePreview === 'shared' && !hmCanManageSharedTheme();
    });
}
function hmRefreshDisplayOptions() {
    document.querySelectorAll('.hm-display-mode-option').forEach((button) => {
        const selected = button.dataset.displayMode === hmDisplayPreview;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
}
function hmRefreshThemeModeUI() {
    document.querySelectorAll('[data-theme-mode]').forEach((button) => {
        const selected = button.dataset.themeMode === hmThemeModePreview;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
    const sharedBtn = document.querySelector('[data-theme-mode="shared"]');
    const personalBtn = document.querySelector('[data-theme-mode="personal"]');
    const notice = document.getElementById('themeModeNotice');
    const saveBtn = document.getElementById('themeSaveBtn');
    const canManage = hmCanManageSharedTheme();
    if (sharedBtn) sharedBtn.disabled = !activeRoomCode || (!canManage && !hmSharedThemeEnabled);
    if (personalBtn) personalBtn.disabled = hmSharedThemeEnabled && !canManage;
    if (notice) {
        if (!activeRoomCode) notice.textContent = '공용 색상 테마는 공간에 연결된 뒤 사용할 수 있습니다. 화면 표시 방식은 언제든 개인별로 선택할 수 있습니다.';
        else if (hmSharedThemeEnabled && !canManage) notice.textContent = `현재 ${HM_THEME_NAMES[hmSharedTheme]} 공용 테마가 적용 중입니다. 공용 색상은 관리(Dom)만 변경할 수 있으며, 라이트·다크 설정은 내 화면에만 적용됩니다.`;
        else if (canManage) notice.textContent = '공용 색상 테마는 두 사람에게 함께 적용됩니다. 라이트·다크 표시 방식은 각 사용자에게만 저장됩니다.';
        else notice.textContent = '개인 색상 테마와 화면 표시 방식은 내 화면에만 적용됩니다.';
    }
    if (saveBtn) {
        saveBtn.disabled = hmThemeModePreview === 'shared' && !canManage;
        saveBtn.textContent = hmThemeModePreview === 'shared' ? '우리의 테마와 내 화면 설정 저장' : '개인 테마와 화면 설정 저장';
    }
    hmRefreshThemeOptions();
    hmRefreshDisplayOptions();
}
function hmRefreshThemeModalState() {
    const overlay = document.getElementById('themeOverlay');
    if (!overlay || overlay.style.display === 'none' || overlay.getAttribute('aria-hidden') === 'true') return;
    hmThemeModePreview = hmSharedThemeEnabled ? 'shared' : 'personal';
    hmThemePreview = hmSharedThemeEnabled ? hmSharedTheme : hmPersonalTheme;
    hmDisplayPreview = hmDisplayMode;
    hmRefreshThemeModeUI();
}

function selectThemeMode(mode) {
    if (mode === 'shared') {
        if (!activeRoomCode) { alert('먼저 공간에 연결해 주세요.'); return; }
        if (!hmCanManageSharedTheme() && !hmSharedThemeEnabled) { alert('공용 테마는 관리(Dom)만 설정할 수 있습니다.'); return; }
        hmThemeModePreview = 'shared';
        hmThemePreview = hmSharedThemeEnabled ? hmSharedTheme : hmPersonalTheme;
    } else {
        if (hmSharedThemeEnabled && !hmCanManageSharedTheme()) { alert('현재 공간은 우리의 공용 테마를 사용 중입니다. 공용 테마 해제는 관리(Dom)만 할 수 있습니다.'); return; }
        hmThemeModePreview = 'personal';
        hmThemePreview = hmPersonalTheme;
    }
    hmApplyTheme(hmThemePreview, false);
    hmRefreshThemeModeUI();
}
function openThemeModal() {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const overlay = document.getElementById('themeOverlay');
    const status = document.getElementById('themeStatus');
    if (!overlay) return;
    hmThemeBeforePreview = hmCurrentTheme;
    hmDisplayBeforePreview = hmDisplayMode;
    hmThemeModePreview = hmSharedThemeEnabled ? 'shared' : 'personal';
    hmThemePreview = hmSharedThemeEnabled ? hmSharedTheme : hmPersonalTheme;
    hmDisplayPreview = hmDisplayMode;
    hmThemeSavedInModal = false;
    if (status) {
        status.textContent = `${hmSharedThemeEnabled ? HM_THEME_NAMES[hmSharedTheme] + ' 공용' : HM_THEME_NAMES[hmPersonalTheme] + ' 개인'} 테마 · ${HM_DISPLAY_NAMES[hmDisplayMode]} 표시 방식을 사용 중입니다.`;
        status.className = 'hm-theme-status';
    }
    hmRefreshThemeModeUI();
    if (typeof openModalOverlayById === 'function') openModalOverlayById('themeOverlay');
    else { overlay.removeAttribute('inert'); overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden', 'false'); }
}
function closeThemeModal() {
    const overlay = document.getElementById('themeOverlay');
    if (!overlay) return;
    if (!hmThemeSavedInModal) {
        hmApplyTheme(hmThemeBeforePreview);
        hmApplyDisplayMode(hmDisplayBeforePreview);
    }
    if (typeof closeModalOverlayById === 'function') closeModalOverlayById('themeOverlay');
    else { if (overlay.contains(document.activeElement)) document.activeElement.blur(); overlay.style.display = 'none'; overlay.setAttribute('inert', ''); overlay.setAttribute('aria-hidden', 'true'); }
}
function previewPersonalTheme(theme) {
    if (hmThemeModePreview === 'shared' && !hmCanManageSharedTheme()) return;
    hmThemePreview = hmApplyTheme(theme, false);
    hmRefreshThemeOptions();
    const status = document.getElementById('themeStatus');
    if (status) {
        const target = hmThemeModePreview === 'shared' ? '우리의 공용 색상 테마' : '내 개인 색상 테마';
        status.textContent = `${HM_THEME_NAMES[hmThemePreview]}를 미리 보고 있습니다. 저장하면 ${target}로 적용됩니다.`;
        status.className = 'hm-theme-status';
    }
}
function previewDisplayMode(mode) {
    hmDisplayPreview = hmApplyDisplayMode(mode, false);
    hmRefreshDisplayOptions();
    const status = document.getElementById('themeStatus');
    if (status) {
        status.textContent = `${HM_DISPLAY_NAMES[hmDisplayPreview]} 화면을 미리 보고 있습니다. 화면 표시 방식은 상대방과 동기화되지 않고 내 계정에만 저장됩니다.`;
        status.className = 'hm-theme-status';
    }
}
async function hmSavePersonalPreferences(selectedTheme, selectedDisplayMode, saveTheme = true) {
    const updateValue = {
        displayMode: selectedDisplayMode,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };
    if (saveTheme) updateValue.theme = selectedTheme;
    await db.ref(`users/${currentUser.uid}/preferences`).update(updateValue);
    if (saveTheme) {
        hmPersonalTheme = selectedTheme;
        hmWriteLocalTheme(currentUser.uid, selectedTheme);
    }
    hmDisplayMode = selectedDisplayMode;
    hmWriteLocalDisplayMode(currentUser.uid, selectedDisplayMode);
}
async function savePersonalTheme() {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const button = document.getElementById('themeSaveBtn');
    const status = document.getElementById('themeStatus');
    const selected = hmNormalizeTheme(hmThemePreview);
    const selectedDisplay = hmNormalizeDisplayMode(hmDisplayPreview);
    try {
        if (button) button.disabled = true;
        const isSharedSave = hmThemeModePreview === 'shared';
        await hmSavePersonalPreferences(selected, selectedDisplay, !isSharedSave);
        if (isSharedSave) {
            if (!hmCanManageSharedTheme()) throw new Error('공용 테마는 관리(Dom)만 변경할 수 있습니다.');
            await db.ref(`rooms/${activeRoomCode}/themeSettings`).set({
                enabled: true, theme: selected, updatedByUid: currentUser.uid,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            hmSharedThemeEnabled = true;
            hmSharedTheme = selected;
            if (status) { status.textContent = `${HM_THEME_NAMES[selected]} 공용 테마와 ${HM_DISPLAY_NAMES[selectedDisplay]} 개인 화면 설정을 저장했습니다.`; status.className = 'hm-theme-status success'; }
            showSaveStatus('🎨 우리의 테마 저장 완료');
        } else {
            if (hmCanManageSharedTheme() && hmSharedThemeEnabled) {
                await db.ref(`rooms/${activeRoomCode}/themeSettings`).update({ enabled: false, updatedByUid: currentUser.uid, updatedAt: firebase.database.ServerValue.TIMESTAMP });
                hmSharedThemeEnabled = false;
            }
            hmApplyTheme(selected);
            if (status) { status.textContent = `${HM_THEME_NAMES[selected]} 개인 테마와 ${HM_DISPLAY_NAMES[selectedDisplay]} 화면 설정을 저장했습니다.`; status.className = 'hm-theme-status success'; }
            showSaveStatus('🎨 개인 화면 설정 저장 완료');
        }
        hmApplyDisplayMode(selectedDisplay);
        hmThemeBeforePreview = hmEffectiveTheme();
        hmDisplayBeforePreview = selectedDisplay;
        hmThemeSavedInModal = true;
    } catch (err) {
        hmReportError('savePersonalTheme', err, hmIsFirebasePermissionError(err) ? '테마 저장 권한이 없습니다. Database Rules 배포 상태를 확인해 주세요.' : (err.message || '테마 저장에 실패했습니다.'));
        if (status) { status.textContent = err.message || '테마를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'; status.className = 'hm-theme-status error'; }
    } finally { hmRefreshThemeModeUI(); }
}
