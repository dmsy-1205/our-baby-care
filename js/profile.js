// =========================================================
// HearMe2nite v1.0 STEP5.6.3
// profile.js - 닉네임 / 계정 표시 / 채팅 이름 고정
// 프로필 사진 및 Firebase Storage 의존성 없음.
// =========================================================

let hmCurrentNickname = '';
let hmRoomProfiles = {};
let hmRoomProfilesRef = null;

function hmNicknameFallback(user) {
    const email = user && user.email ? String(user.email) : '';
    const local = email.split('@')[0].trim();
    return local || '나';
}
function hmNormalizeNickname(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function hmIsValidNickname(value) {
    const nickname = hmNormalizeNickname(value);
    if (nickname.length < 2 || nickname.length > 20) return false;
    return !/[\u0000-\u001F\u007F.#$\[\]\/]/.test(nickname);
}
function hmGetChatDisplayName() { return hmCurrentNickname || hmNicknameFallback(currentUser); }
function hmProfileLetter(name) { return (String(name || '').trim().slice(0, 1).toUpperCase() || '♡'); }

function hmRenderInitialAvatar(element, name) {
    if (!element) return;
    element.classList.remove('has-photo');
    element.textContent = hmProfileLetter(name || hmGetChatDisplayName());
}
function hmCreateAvatarElement(className, profile, fallbackName) {
    const el = document.createElement('div');
    el.className = className;
    const name = (profile && profile.nickname) || fallbackName || '상대방';
    el.textContent = hmProfileLetter(name);
    return el;
}

function hmStopRoomProfilesListener() {
    if (hmRoomProfilesRef) hmRoomProfilesRef.off();
    hmRoomProfilesRef = null;
    hmRoomProfiles = {};
}
function hmStartRoomProfilesListener() {
    hmStopRoomProfilesListener();
    if (!currentUser || !activeRoomCode) { hmRenderRoomProfilePair(); return; }
    hmRoomProfilesRef = db.ref(`roomMembers/${activeRoomCode}`);
    hmRoomProfilesRef.on('value', snap => {
        hmRoomProfiles = snap.val() || {};
        hmRenderRoomProfilePair();
        if (typeof updateChatAlignment === 'function') updateChatAlignment();
    }, err => hmReportError('hmStartRoomProfilesListener', err, '공간 프로필을 불러오지 못했습니다.'));
}
function hmRenderRoomProfilePair() {
    const wrap = document.getElementById('roomProfilePair');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!currentUser || !activeRoomCode) { wrap.hidden = true; return; }
    const entries = Object.entries(hmRoomProfiles || {});
    if (!entries.length) { wrap.hidden = true; return; }
    entries.sort((a,b) => (a[1].role === 'owner' ? -1 : 1) - (b[1].role === 'owner' ? -1 : 1));
    entries.slice(0,2).forEach(([uid, member]) => {
        const profile = member.profile || {};
        const fallback = uid === currentUser.uid ? hmGetChatDisplayName() : (member.email ? String(member.email).split('@')[0] : '상대방');
        const name = profile.nickname || fallback;
        const card = document.createElement('div');
        card.className = 'hm-room-person';
        card.appendChild(hmCreateAvatarElement('hm-room-person-avatar', profile, name));
        const copy = document.createElement('div');
        copy.className = 'hm-room-person-copy';
        const strong = document.createElement('strong');
        strong.textContent = uid === currentUser.uid ? `${name} · 나` : name;
        const role = member.relationshipRole === 'dom' ? '관리(Dom)' : member.relationshipRole === 'sub' ? '기록(Sub)' : (member.role === 'owner' ? '방주인' : '참여자');
        const small = document.createElement('small');
        small.textContent = role;
        const status = document.createElement('span');
        const online = !!(member.presence && member.presence.online);
        status.className = `hm-room-person-status${online ? ' online' : ''}`;
        status.textContent = online ? '온라인' : '오프라인';
        copy.append(strong, small, status);
        card.appendChild(copy);
        wrap.appendChild(card);
    });
    wrap.hidden = false;
}
function hmGetRoomProfile(uid) {
    if (!uid) return null;
    const member = hmRoomProfiles && hmRoomProfiles[uid];
    return member && member.profile ? member.profile : null;
}

function hmApplyNicknameToUI() {
    const displayName = hmGetChatDisplayName();
    const chatSender = document.getElementById('chatSender');
    const currentName = document.getElementById('profileCurrentName');
    const preview = document.getElementById('profileNicknamePreview');
    const nicknameEl = document.getElementById('userBarNickname');
    const emailEl = document.getElementById('userBarEmail');
    if (chatSender) chatSender.value = displayName;
    if (currentName) currentName.textContent = displayName;
    if (preview) preview.textContent = displayName;
    if (nicknameEl) { nicknameEl.textContent = displayName; nicknameEl.title = displayName; }
    if (emailEl) {
        const email = currentUser && currentUser.email ? currentUser.email : '';
        emailEl.textContent = email;
        emailEl.title = email;
    }
    hmRenderInitialAvatar(document.getElementById('profileAvatar'), displayName);
    hmRenderInitialAvatar(document.getElementById('userBarAvatar'), displayName);
}

async function loadUserProfile() {
    hmCurrentNickname = '';
    if (!currentUser) { hmApplyNicknameToUI(); return; }
    try {
        const snap = await db.ref(`users/${currentUser.uid}/profile`).once('value');
        const data = snap.val() || {};
        const nickname = hmNormalizeNickname(data.nickname);
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
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => input.focus(), 30);
}
function closeProfileModal() {
    const overlay = document.getElementById('profileOverlay');
    if (!overlay) return;
    if (overlay.contains(document.activeElement)) document.activeElement.blur();
    hmApplyNicknameToUI();
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
}
function updateProfileNicknamePreview() {
    const input = document.getElementById('profileNicknameInput');
    const preview = document.getElementById('profileNicknamePreview');
    if (!preview) return;
    const value = input ? hmNormalizeNickname(input.value) : '';
    preview.textContent = value || hmNicknameFallback(currentUser);
}
function hmSetProfileStatus(message, type) {
    const status = document.getElementById('profileStatus');
    if (!status) return;
    status.textContent = message || '';
    status.className = `hm-profile-status${type ? ` ${type}` : ''}`;
}
async function saveProfileNickname() {
    if (!currentUser) return;
    const input = document.getElementById('profileNicknameInput');
    const button = document.getElementById('profileSaveBtn');
    const nickname = hmNormalizeNickname(input && input.value);
    if (!hmIsValidNickname(nickname)) {
        hmSetProfileStatus('닉네임은 2~20자로 입력하고 . # $ [ ] / 문자는 사용하지 마세요.', 'error');
        return;
    }
    if (button) { button.disabled = true; button.textContent = '닉네임 저장 중...'; }
    try {
        const updatedAt = firebase.database.ServerValue.TIMESTAMP;
        await db.ref(`users/${currentUser.uid}/profile`).update({ nickname, updatedAt });
        if (activeRoomCode) {
            await db.ref(`roomMembers/${activeRoomCode}/${currentUser.uid}/profile`).update({ nickname, updatedAt });
        }
        hmCurrentNickname = nickname;
        hmApplyNicknameToUI();
        hmStartRoomProfilesListener();
        hmSetProfileStatus('닉네임이 저장되었습니다. 새 채팅부터 적용됩니다.', 'success');
    } catch (err) {
        hmReportError('saveProfileNickname', err, '닉네임을 저장하지 못했습니다.');
        hmSetProfileStatus('닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
        if (button) { button.disabled = false; button.textContent = '닉네임 저장'; }
    }
}

window.hmStartRoomProfilesListener = hmStartRoomProfilesListener;
window.hmStopRoomProfilesListener = hmStopRoomProfilesListener;
window.hmGetRoomProfile = hmGetRoomProfile;
window.hmCreateAvatarElement = hmCreateAvatarElement;
window.hmGetChatDisplayName = hmGetChatDisplayName;
window.loadUserProfile = loadUserProfile;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.updateProfileNicknamePreview = updateProfileNicknamePreview;
window.saveProfileNickname = saveProfileNickname;
