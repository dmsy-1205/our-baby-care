// =========================================================
// HearMe2nite v1.0 STEP5.6.1
// profile.js - 사용자 닉네임 / 채팅 이름 고정
// 기존 UID, Room, 메시지 경로를 변경하지 않는다.
// =========================================================

let hmCurrentNickname = '';

function hmNicknameFallback(user) {
    const email = user && user.email ? String(user.email) : '';
    const local = email.split('@')[0].trim();
    return local || '나';
}

function hmNormalizeNickname(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function hmIsValidNickname(value) {
    const nickname = hmNormalizeNickname(value);
    if (nickname.length < 2 || nickname.length > 20) return false;
    // 제어문자와 Firebase 경로 혼동 가능 문자는 허용하지 않는다.
    return !/[\u0000-\u001F\u007F.#$\[\]\/]/.test(nickname);
}

function hmGetChatDisplayName() {
    return hmCurrentNickname || hmNicknameFallback(currentUser);
}

function hmApplyNicknameToUI() {
    const displayName = hmGetChatDisplayName();
    const chatSender = document.getElementById('chatSender');
    const currentName = document.getElementById('profileCurrentName');
    const preview = document.getElementById('profileNicknamePreview');
    const avatar = document.getElementById('profileAvatar');
    const userInfo = document.getElementById('userInfoText');
    const userBarNickname = document.getElementById('userBarNickname');
    const userBarEmail = document.getElementById('userBarEmail');
    const userBarAvatar = document.getElementById('userBarAvatar');
    const accountMenuNickname = document.getElementById('accountMenuNickname');
    const accountMenuEmail = document.getElementById('accountMenuEmail');
    const accountMenuAvatar = document.getElementById('accountMenuAvatar');
    if (chatSender) chatSender.value = displayName;
    if (currentName) currentName.textContent = hmCurrentNickname || '닉네임 미설정';
    if (preview) preview.textContent = displayName;
    if (avatar) avatar.textContent = displayName.slice(0, 1).toUpperCase() || '♡';
    if (userBarNickname) userBarNickname.textContent = currentUser ? displayName : '로그인 필요';
    if (userBarEmail) userBarEmail.textContent = currentUser?.email || '-';
    if (userBarAvatar) userBarAvatar.textContent = displayName.slice(0, 1).toUpperCase() || '♡';
    if (accountMenuNickname) accountMenuNickname.textContent = currentUser ? displayName : '로그인 필요';
    if (accountMenuEmail) accountMenuEmail.textContent = currentUser?.email || '-';
    if (accountMenuAvatar) accountMenuAvatar.textContent = displayName.slice(0, 1).toUpperCase() || '♡';
    if (userInfo) userInfo.setAttribute('data-ready', currentUser ? 'true' : 'false');
}

async function loadUserProfile() {
    hmCurrentNickname = '';
    if (!currentUser) {
        hmApplyNicknameToUI();
        return;
    }
    try {
        const snap = await db.ref(`users/${currentUser.uid}/profile/nickname`).once('value');
        const nickname = hmNormalizeNickname(snap.val());
        hmCurrentNickname = hmIsValidNickname(nickname) ? nickname : '';
    } catch (err) {
        hmReportError('loadUserProfile', err, hmIsFirebasePermissionError(err) ? '프로필 읽기 권한을 확인해 주세요.' : '프로필을 불러오지 못했습니다.');
    }
    hmApplyNicknameToUI();
}

function openProfileModal() {
    if (!currentUser) return;
    const overlay = document.getElementById('profileOverlay');
    const input = document.getElementById('profileNicknameInput');
    const email = document.getElementById('profileEmailText');
    const status = document.getElementById('profileStatus');
    if (!overlay || !input) return;
    input.value = hmCurrentNickname;
    if (email) email.textContent = currentUser.email || '';
    if (status) { status.textContent = ''; status.className = 'hm-profile-status'; }
    hmApplyNicknameToUI();
    if (typeof openModalOverlayById === 'function') openModalOverlayById('profileOverlay');
    else {
        overlay.removeAttribute('inert');
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }
    setTimeout(() => input.focus(), 30);
}

function closeProfileModal() {
    const overlay = document.getElementById('profileOverlay');
    if (!overlay) return;
    if (typeof closeModalOverlayById === 'function') closeModalOverlayById('profileOverlay');
    else {
        if (overlay.contains(document.activeElement)) document.activeElement.blur();
        overlay.style.display = 'none';
        overlay.setAttribute('inert', '');
        overlay.setAttribute('aria-hidden', 'true');
    }
}

function updateProfileNicknamePreview() {
    const input = document.getElementById('profileNicknameInput');
    const preview = document.getElementById('profileNicknamePreview');
    if (!input || !preview) return;
    preview.textContent = hmNormalizeNickname(input.value) || hmNicknameFallback(currentUser);
}

async function saveProfileNickname() {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const input = document.getElementById('profileNicknameInput');
    const status = document.getElementById('profileStatus');
    const button = document.getElementById('profileSaveBtn');
    const nickname = hmNormalizeNickname(input ? input.value : '');
    if (!hmIsValidNickname(nickname)) {
        if (status) { status.textContent = '닉네임은 2~20자로 입력하고 / . # $ [ ] 문자는 사용하지 마세요.'; status.className = 'hm-profile-status error'; }
        if (input) input.focus();
        return;
    }
    try {
        if (button) button.disabled = true;
        await db.ref(`users/${currentUser.uid}/profile`).update({
            nickname,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        hmCurrentNickname = nickname;
        hmApplyNicknameToUI();
        updateChatAlignment();
        if (status) { status.textContent = '닉네임이 저장되었습니다. 새 채팅부터 이 이름으로 표시됩니다.'; status.className = 'hm-profile-status success'; }
        showSaveStatus('✅ 닉네임 저장 완료');
    } catch (err) {
        hmReportError('saveProfileNickname', err, hmIsFirebasePermissionError(err) ? '닉네임 저장 권한이 없습니다.' : '닉네임 저장에 실패했습니다.');
        if (status) { status.textContent = '닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'; status.className = 'hm-profile-status error'; }
    } finally {
        if (button) button.disabled = false;
    }
}


// STEP5.10.9 홈 상단 계정 메뉴를 중앙 팝업으로 정리한다.
function openAccountMenuModal() {
    if (!currentUser) return;
    hmApplyNicknameToUI();
    const roomText = document.getElementById('roomSettingsCardSub')?.textContent?.trim() || '연결된 공간이 없습니다.';
    const roomTarget = document.getElementById('accountMenuRoom');
    if (roomTarget) roomTarget.textContent = roomText;
    if (typeof openModalOverlayById === 'function') openModalOverlayById('accountMenuOverlay');
    else {
        const overlay = document.getElementById('accountMenuOverlay');
        if (!overlay) return;
        overlay.removeAttribute('inert');
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }
}

function closeAccountMenuModal() {
    const overlay = document.getElementById('accountMenuOverlay');
    if (!overlay) return;
    if (typeof closeModalOverlayById === 'function') closeModalOverlayById('accountMenuOverlay');
    else {
        if (overlay.contains(document.activeElement)) document.activeElement.blur();
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('inert', '');
    }
}

function openAccountChildModal(type) {
    closeAccountMenuModal();
    window.setTimeout(() => {
        if (type === 'profile' && typeof openProfileModal === 'function') openProfileModal();
        else if (type === 'theme' && typeof openThemeModal === 'function') openThemeModal();
        else if (type === 'data' && typeof openDataManagementModal === 'function') openDataManagementModal();
        else if (type === 'admin' && typeof openDataAdminModal === 'function') openDataAdminModal();
        else if (type === 'console') {
            try {
                const user = (typeof babyAuth !== 'undefined' && babyAuth.currentUser) ? babyAuth.currentUser : null;
                if (user) sessionStorage.setItem('hmAdminLaunch', JSON.stringify({ uid: user.uid, at: Date.now() }));
            } catch (error) { console.warn('[Admin Console] launcher marker failed', error); }
            window.location.href = 'admin.html';
        }
    }, 80);
}

window.openAccountMenuModal = openAccountMenuModal;
window.closeAccountMenuModal = closeAccountMenuModal;
window.openAccountChildModal = openAccountChildModal;
