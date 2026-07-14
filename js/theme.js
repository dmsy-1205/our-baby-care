// =========================================================
// HearMe2nite v1.0 STEP5.8.2
// theme.js - 개인 테마 + Room 공용 테마 실시간 동기화
// =========================================================

const HM_THEME_DEFAULT = 'lavender';
const HM_THEME_NAMES = Object.freeze({
    lavender: '라벤더', blossom: '블라썸', ocean: '오션',
    forest: '포레스트', cream: '크림', midnight: '미드나이트'
});

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

function hmNormalizeTheme(value) {
    const theme = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(HM_THEME_NAMES, theme) ? theme : HM_THEME_DEFAULT;
}
function hmThemeStorageKey(uid) { return `hm_theme_${uid || 'guest'}`; }
function hmApplyTheme(theme, rememberLast = true) {
    const safeTheme = hmNormalizeTheme(theme);
    document.documentElement.setAttribute('data-hm-theme', safeTheme);
    hmCurrentTheme = safeTheme;
    if (rememberLast) { try { localStorage.setItem('hm_theme_last', safeTheme); } catch (e) { console.warn('[Theme] 마지막 테마 저장 실패', e); } }
    return safeTheme;
}
function hmReadLocalTheme(uid) {
    try { return hmNormalizeTheme(localStorage.getItem(hmThemeStorageKey(uid)) || localStorage.getItem('hm_theme_last')); }
    catch (e) { return HM_THEME_DEFAULT; }
}
function hmWriteLocalTheme(uid, theme) {
    try {
        localStorage.setItem(hmThemeStorageKey(uid), hmNormalizeTheme(theme));
        localStorage.setItem('hm_theme_last', hmNormalizeTheme(theme));
    } catch (e) { console.warn('[Theme] 브라우저 저장 실패', e); }
}
function hmCanManageSharedTheme() {
    return !!currentUser && !!activeRoomCode && (activeRoomRole === 'owner' || activeRelationshipRole === 'dom');
}
function hmEffectiveTheme() { return hmSharedThemeEnabled && activeRoomCode ? hmSharedTheme : hmPersonalTheme; }
function hmApplyEffectiveTheme() { return hmApplyTheme(hmEffectiveTheme()); }

async function loadUserTheme() {
    if (!currentUser) {
        hmPersonalTheme = hmReadLocalTheme('guest');
        hmApplyTheme(hmPersonalTheme);
        return hmCurrentTheme;
    }
    hmPersonalTheme = hmReadLocalTheme(currentUser.uid);
    hmApplyTheme(hmPersonalTheme);
    try {
        const snap = await db.ref(`users/${currentUser.uid}/preferences/theme`).once('value');
        const remoteValue = snap.val();
        if (remoteValue && Object.prototype.hasOwnProperty.call(HM_THEME_NAMES, String(remoteValue))) {
            hmPersonalTheme = hmNormalizeTheme(remoteValue);
            hmWriteLocalTheme(currentUser.uid, hmPersonalTheme);
            if (!hmSharedThemeEnabled) hmApplyTheme(hmPersonalTheme);
        }
    } catch (err) {
        hmReportError('loadUserTheme', err, hmIsFirebasePermissionError(err) ? '개인 테마 읽기 권한을 확인해 주세요.' : '저장된 개인 테마를 불러오지 못했습니다.');
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
        hmSharedTheme = hmNormalizeTheme(value.theme);
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
        if (!activeRoomCode) notice.textContent = '공용 테마는 공간에 연결된 뒤 사용할 수 있습니다.';
        else if (hmSharedThemeEnabled && !canManage) notice.textContent = `현재 ${HM_THEME_NAMES[hmSharedTheme]} 공용 테마가 적용 중입니다. 공용 테마는 관리(Dom)만 변경할 수 있습니다.`;
        else if (canManage) notice.textContent = '공용 테마를 저장하면 이 공간의 Dom과 Sub 화면에 실시간으로 함께 적용됩니다.';
        else notice.textContent = '개인 테마는 내 화면에만 적용됩니다.';
    }
    if (saveBtn) {
        saveBtn.disabled = hmThemeModePreview === 'shared' && !canManage;
        saveBtn.textContent = hmThemeModePreview === 'shared' ? '우리의 테마 저장' : '개인 테마 저장';
    }
    hmRefreshThemeOptions();
}
function hmRefreshThemeModalState() {
    const overlay = document.getElementById('themeOverlay');
    if (!overlay || overlay.style.display === 'none' || overlay.getAttribute('aria-hidden') === 'true') return;
    hmThemeModePreview = hmSharedThemeEnabled ? 'shared' : 'personal';
    hmThemePreview = hmSharedThemeEnabled ? hmSharedTheme : hmPersonalTheme;
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
    hmThemeModePreview = hmSharedThemeEnabled ? 'shared' : 'personal';
    hmThemePreview = hmSharedThemeEnabled ? hmSharedTheme : hmPersonalTheme;
    hmThemeSavedInModal = false;
    if (status) {
        status.textContent = hmSharedThemeEnabled
            ? `현재 ${HM_THEME_NAMES[hmSharedTheme]} 공용 테마를 함께 사용 중입니다.`
            : `현재 ${HM_THEME_NAMES[hmPersonalTheme]} 개인 테마를 사용 중입니다.`;
        status.className = 'hm-theme-status';
    }
    hmRefreshThemeModeUI();
    if (typeof openModalOverlayById === 'function') openModalOverlayById('themeOverlay');
    else { overlay.removeAttribute('inert'); overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden', 'false'); }
}
function closeThemeModal() {
    const overlay = document.getElementById('themeOverlay');
    if (!overlay) return;
    if (!hmThemeSavedInModal) hmApplyTheme(hmThemeBeforePreview);
    if (typeof closeModalOverlayById === 'function') closeModalOverlayById('themeOverlay');
    else { if (overlay.contains(document.activeElement)) document.activeElement.blur(); overlay.style.display = 'none'; overlay.setAttribute('inert', ''); overlay.setAttribute('aria-hidden', 'true'); }
}
function previewPersonalTheme(theme) {
    if (hmThemeModePreview === 'shared' && !hmCanManageSharedTheme()) return;
    hmThemePreview = hmApplyTheme(theme, false);
    hmRefreshThemeOptions();
    const status = document.getElementById('themeStatus');
    if (status) {
        const target = hmThemeModePreview === 'shared' ? '우리의 공용 테마' : '내 개인 테마';
        status.textContent = `${HM_THEME_NAMES[hmThemePreview]} 테마를 미리 보고 있습니다. 저장하면 ${target}로 적용됩니다.`;
        status.className = 'hm-theme-status';
    }
}
async function hmSavePersonalThemeValue(selected) {
    await db.ref(`users/${currentUser.uid}/preferences`).update({ theme: selected, updatedAt: firebase.database.ServerValue.TIMESTAMP });
    hmPersonalTheme = selected;
    hmWriteLocalTheme(currentUser.uid, selected);
}
async function savePersonalTheme() {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const button = document.getElementById('themeSaveBtn');
    const status = document.getElementById('themeStatus');
    const selected = hmNormalizeTheme(hmThemePreview);
    try {
        if (button) button.disabled = true;
        if (hmThemeModePreview === 'shared') {
            if (!hmCanManageSharedTheme()) throw new Error('공용 테마는 관리(Dom)만 변경할 수 있습니다.');
            await db.ref(`rooms/${activeRoomCode}/themeSettings`).set({
                enabled: true, theme: selected, updatedByUid: currentUser.uid,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            hmSharedThemeEnabled = true;
            hmSharedTheme = selected;
            if (status) { status.textContent = `${HM_THEME_NAMES[selected]} 테마가 이 공간의 공용 테마로 저장되었습니다.`; status.className = 'hm-theme-status success'; }
            showSaveStatus('🎨 우리의 테마 저장 완료');
        } else {
            await hmSavePersonalThemeValue(selected);
            if (hmCanManageSharedTheme() && hmSharedThemeEnabled) {
                await db.ref(`rooms/${activeRoomCode}/themeSettings`).update({ enabled: false, updatedByUid: currentUser.uid, updatedAt: firebase.database.ServerValue.TIMESTAMP });
                hmSharedThemeEnabled = false;
            }
            hmApplyTheme(selected);
            if (status) { status.textContent = `${HM_THEME_NAMES[selected]} 테마가 내 개인 테마로 저장되었습니다.`; status.className = 'hm-theme-status success'; }
            showSaveStatus('🎨 개인 테마 저장 완료');
        }
        hmThemeBeforePreview = selected;
        hmThemeSavedInModal = true;
    } catch (err) {
        hmReportError('savePersonalTheme', err, hmIsFirebasePermissionError(err) ? '테마 저장 권한이 없습니다. Database Rules 배포 상태를 확인해 주세요.' : (err.message || '테마 저장에 실패했습니다.'));
        if (status) { status.textContent = err.message || '테마를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'; status.className = 'hm-theme-status error'; }
    } finally { hmRefreshThemeModeUI(); }
}
