// =========================================================
// HearMe2nite v1.0 STEP5.8.0
// theme.js - 개인 테마 선택 / Firebase 저장
// Room 데이터와 공용 테마는 이번 단계에서 변경하지 않는다.
// =========================================================

const HM_THEME_DEFAULT = 'lavender';
const HM_THEME_NAMES = Object.freeze({
    lavender: '라벤더',
    blossom: '블라썸',
    ocean: '오션',
    forest: '포레스트',
    cream: '크림',
    midnight: '미드나이트'
});

let hmCurrentTheme = HM_THEME_DEFAULT;
let hmThemeBeforePreview = HM_THEME_DEFAULT;
let hmThemePreview = HM_THEME_DEFAULT;
let hmThemeSavedInModal = false;

function hmNormalizeTheme(value) {
    const theme = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(HM_THEME_NAMES, theme) ? theme : HM_THEME_DEFAULT;
}

function hmThemeStorageKey(uid) {
    return `hm_theme_${uid || 'guest'}`;
}

function hmApplyTheme(theme, rememberLast = true) {
    const safeTheme = hmNormalizeTheme(theme);
    document.documentElement.setAttribute('data-hm-theme', safeTheme);
    hmCurrentTheme = safeTheme;
    if (rememberLast) {
        try { localStorage.setItem('hm_theme_last', safeTheme); } catch (e) { console.warn('[Theme] 마지막 테마 저장 실패', e); }
    }
    return safeTheme;
}

function hmReadLocalTheme(uid) {
    try {
        return hmNormalizeTheme(localStorage.getItem(hmThemeStorageKey(uid)) || localStorage.getItem('hm_theme_last'));
    } catch (e) {
        return HM_THEME_DEFAULT;
    }
}

function hmWriteLocalTheme(uid, theme) {
    try {
        localStorage.setItem(hmThemeStorageKey(uid), hmNormalizeTheme(theme));
        localStorage.setItem('hm_theme_last', hmNormalizeTheme(theme));
    } catch (e) { console.warn('[Theme] 브라우저 저장 실패', e); }
}

async function loadUserTheme() {
    if (!currentUser) {
        hmApplyTheme(hmReadLocalTheme('guest'));
        return hmCurrentTheme;
    }

    const localTheme = hmReadLocalTheme(currentUser.uid);
    hmApplyTheme(localTheme);

    try {
        const snap = await db.ref(`users/${currentUser.uid}/preferences/theme`).once('value');
        const remoteValue = snap.val();
        if (remoteValue && Object.prototype.hasOwnProperty.call(HM_THEME_NAMES, String(remoteValue))) {
            const remoteTheme = hmNormalizeTheme(remoteValue);
            hmWriteLocalTheme(currentUser.uid, remoteTheme);
            hmApplyTheme(remoteTheme);
        }
    } catch (err) {
        hmReportError('loadUserTheme', err, hmIsFirebasePermissionError(err) ? '개인 테마 읽기 권한을 확인해 주세요.' : '저장된 개인 테마를 불러오지 못했습니다.');
    }
    return hmCurrentTheme;
}

function hmRefreshThemeOptions() {
    document.querySelectorAll('.hm-theme-option').forEach((button) => {
        const selected = button.dataset.theme === hmThemePreview;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-checked', selected ? 'true' : 'false');
    });
}

function openThemeModal() {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const overlay = document.getElementById('themeOverlay');
    const status = document.getElementById('themeStatus');
    if (!overlay) return;
    hmThemeBeforePreview = hmCurrentTheme;
    hmThemePreview = hmCurrentTheme;
    hmThemeSavedInModal = false;
    if (status) { status.textContent = `현재 ${HM_THEME_NAMES[hmCurrentTheme]} 테마를 사용 중입니다.`; status.className = 'hm-theme-status'; }
    hmRefreshThemeOptions();
    if (typeof openModalOverlayById === 'function') openModalOverlayById('themeOverlay');
    else {
        overlay.removeAttribute('inert');
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }
}

function closeThemeModal() {
    const overlay = document.getElementById('themeOverlay');
    if (!overlay) return;
    if (!hmThemeSavedInModal) hmApplyTheme(hmThemeBeforePreview);
    if (typeof closeModalOverlayById === 'function') closeModalOverlayById('themeOverlay');
    else {
        if (overlay.contains(document.activeElement)) document.activeElement.blur();
        overlay.style.display = 'none';
        overlay.setAttribute('inert', '');
        overlay.setAttribute('aria-hidden', 'true');
    }
}

function previewPersonalTheme(theme) {
    hmThemePreview = hmApplyTheme(theme, false);
    hmRefreshThemeOptions();
    const status = document.getElementById('themeStatus');
    if (status) { status.textContent = `${HM_THEME_NAMES[hmThemePreview]} 테마를 미리 보고 있습니다. 저장해야 다음 접속에도 유지됩니다.`; status.className = 'hm-theme-status'; }
}

async function savePersonalTheme() {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const button = document.getElementById('themeSaveBtn');
    const status = document.getElementById('themeStatus');
    const selected = hmNormalizeTheme(hmThemePreview);
    try {
        if (button) button.disabled = true;
        await db.ref(`users/${currentUser.uid}/preferences`).update({
            theme: selected,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        hmWriteLocalTheme(currentUser.uid, selected);
        hmApplyTheme(selected);
        hmThemeBeforePreview = selected;
        hmThemeSavedInModal = true;
        if (status) { status.textContent = `${HM_THEME_NAMES[selected]} 테마가 내 개인 테마로 저장되었습니다.`; status.className = 'hm-theme-status success'; }
        showSaveStatus('🎨 개인 테마 저장 완료');
    } catch (err) {
        hmReportError('savePersonalTheme', err, hmIsFirebasePermissionError(err) ? '개인 테마 저장 권한이 없습니다. Database Rules 배포 상태를 확인해 주세요.' : '개인 테마 저장에 실패했습니다.');
        if (status) { status.textContent = '테마를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'; status.className = 'hm-theme-status error'; }
    } finally {
        if (button) button.disabled = false;
    }
}
