// =========================================================
// HearMe2nite v1.0 STEP5.6.2
// profile.js - 닉네임 / 프로필 사진 / 채팅 이름 고정
// 기존 UID, Room, 메시지 경로를 변경하지 않는다.
// =========================================================

let hmCurrentNickname = '';
let hmCurrentProfilePhotoURL = '';
let hmPendingProfilePhotoBlob = null;
let hmPendingProfilePhotoPreviewURL = '';

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
function hmAvatarLetter() { return (hmGetChatDisplayName().slice(0, 1).toUpperCase() || '♡'); }

function hmRenderAvatar(element, sizeClass) {
    if (!element) return;
    element.classList.toggle('has-photo', !!hmCurrentProfilePhotoURL);
    element.innerHTML = '';
    if (hmCurrentProfilePhotoURL) {
        const img = document.createElement('img');
        img.src = hmCurrentProfilePhotoURL;
        img.alt = '';
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => { element.classList.remove('has-photo'); element.textContent = hmAvatarLetter(); };
        element.appendChild(img);
    } else {
        element.textContent = hmAvatarLetter();
    }
}

function hmApplyNicknameToUI() {
    const displayName = hmGetChatDisplayName();
    const chatSender = document.getElementById('chatSender');
    const currentName = document.getElementById('profileCurrentName');
    const preview = document.getElementById('profileNicknamePreview');
    const nicknameEl = document.getElementById('userBarNickname');
    const emailEl = document.getElementById('userBarEmail');
    if (chatSender) chatSender.value = displayName;
    if (currentName) currentName.textContent = hmCurrentNickname || '닉네임 미설정';
    if (preview) preview.textContent = displayName;
    if (nicknameEl) nicknameEl.textContent = displayName;
    if (emailEl && currentUser) emailEl.textContent = currentUser.email || '';
    hmRenderAvatar(document.getElementById('profileAvatar'));
    hmRenderAvatar(document.getElementById('userBarAvatar'));
}

async function loadUserProfile() {
    hmCurrentNickname = '';
    hmCurrentProfilePhotoURL = '';
    if (!currentUser) { hmApplyNicknameToUI(); return; }
    try {
        const snap = await db.ref(`users/${currentUser.uid}/profile`).once('value');
        const data = snap.val() || {};
        const nickname = hmNormalizeNickname(data.nickname);
        hmCurrentNickname = hmIsValidNickname(nickname) ? nickname : '';
        hmCurrentProfilePhotoURL = typeof data.photoURL === 'string' ? data.photoURL : '';
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
    hmDiscardPendingPhoto();
    hmApplyNicknameToUI();
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => input.focus(), 30);
}
function closeProfileModal() {
    const overlay = document.getElementById('profileOverlay');
    if (!overlay) return;
    if (overlay.contains(document.activeElement)) document.activeElement.blur();
    hmDiscardPendingPhoto();
    hmApplyNicknameToUI();
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
}
function updateProfileNicknamePreview() {
    const input = document.getElementById('profileNicknameInput');
    const preview = document.getElementById('profileNicknamePreview');
    if (input && preview) preview.textContent = hmNormalizeNickname(input.value) || hmNicknameFallback(currentUser);
}
function hmSetProfileStatus(text, type) {
    const status = document.getElementById('profileStatus');
    if (!status) return;
    status.textContent = text || '';
    status.className = `hm-profile-status${type ? ' ' + type : ''}`;
}
function hmDiscardPendingPhoto() {
    hmPendingProfilePhotoBlob = null;
    if (hmPendingProfilePhotoPreviewURL) URL.revokeObjectURL(hmPendingProfilePhotoPreviewURL);
    hmPendingProfilePhotoPreviewURL = '';
    const input = document.getElementById('profilePhotoInput');
    if (input) input.value = '';
}

function hmLoadImage(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없습니다.')); };
        img.src = url;
    });
}
async function hmCompressProfileImage(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('JPG, PNG 또는 WEBP 파일만 사용할 수 있습니다.');
    if (file.size > 10 * 1024 * 1024) throw new Error('원본 이미지는 10MB 이하만 사용할 수 있습니다.');
    const img = await hmLoadImage(file);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = Math.max(0, (img.naturalWidth - side) / 2);
    const sy = Math.max(0, (img.naturalHeight - side) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, 512, 512);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob) throw new Error('이미지 변환에 실패했습니다.');
    return blob;
}
async function handleProfilePhotoSelected(event) {
    const file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    try {
        hmSetProfileStatus('이미지를 준비하고 있습니다…', '');
        const blob = await hmCompressProfileImage(file);
        hmDiscardPendingPhoto();
        hmPendingProfilePhotoBlob = blob;
        hmPendingProfilePhotoPreviewURL = URL.createObjectURL(blob);
        const avatar = document.getElementById('profileAvatar');
        if (avatar) {
            avatar.classList.add('has-photo');
            avatar.innerHTML = `<img src="${hmPendingProfilePhotoPreviewURL}" alt="선택한 프로필 사진 미리보기">`;
        }
        hmSetProfileStatus('사진이 준비되었습니다. 아래 저장 버튼을 눌러 적용해 주세요.', 'success');
    } catch (err) {
        hmDiscardPendingPhoto(); hmApplyNicknameToUI(); hmSetProfileStatus(err.message || '이미지를 준비하지 못했습니다.', 'error');
    }
}
async function hmUploadPendingProfilePhoto() {
    if (!hmPendingProfilePhotoBlob || !currentUser) return hmCurrentProfilePhotoURL;
    const ref = storage.ref().child(`profiles/${currentUser.uid}/avatar.webp`);
    const snapshot = await ref.put(hmPendingProfilePhotoBlob, { contentType: 'image/webp', cacheControl: 'public,max-age=3600' });
    return snapshot.ref.getDownloadURL();
}

async function saveProfileNickname() {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const input = document.getElementById('profileNicknameInput');
    const button = document.getElementById('profileSaveBtn');
    const nickname = hmNormalizeNickname(input ? input.value : '');
    if (!hmIsValidNickname(nickname)) { hmSetProfileStatus('닉네임은 2~20자로 입력하고 / . # $ [ ] 문자는 사용하지 마세요.', 'error'); if(input) input.focus(); return; }
    try {
        if (button) { button.disabled = true; button.textContent = hmPendingProfilePhotoBlob ? '사진과 프로필 저장 중…' : '프로필 저장 중…'; }
        const photoURL = await hmUploadPendingProfilePhoto();
        const updates = { nickname, updatedAt: firebase.database.ServerValue.TIMESTAMP };
        if (photoURL) updates.photoURL = photoURL;
        await db.ref(`users/${currentUser.uid}/profile`).update(updates);
        hmCurrentNickname = nickname;
        hmCurrentProfilePhotoURL = photoURL || hmCurrentProfilePhotoURL;
        hmDiscardPendingPhoto(); hmApplyNicknameToUI(); updateChatAlignment();
        hmSetProfileStatus('프로필이 저장되었습니다. 새 채팅부터 이 닉네임으로 표시됩니다.', 'success');
        showSaveStatus('✅ 프로필 저장 완료');
    } catch (err) {
        hmReportError('saveUserProfile', err, hmIsFirebasePermissionError(err) ? '프로필 저장 권한을 확인해 주세요.' : '프로필 저장에 실패했습니다.');
        hmSetProfileStatus('프로필을 저장하지 못했습니다. Firebase Storage 설정과 권한을 확인해 주세요.', 'error');
    } finally { if (button) { button.disabled = false; button.textContent = '프로필 저장'; } }
}

async function resetProfilePhoto() {
    if (!currentUser) return;
    if (!confirm('프로필 사진을 기본 이미지로 되돌릴까요?')) return;
    const button = document.getElementById('profilePhotoResetBtn');
    try {
        if (button) button.disabled = true;
        try { await storage.ref().child(`profiles/${currentUser.uid}/avatar.webp`).delete(); } catch (e) { if (!e || e.code !== 'storage/object-not-found') throw e; }
        await db.ref(`users/${currentUser.uid}/profile/photoURL`).remove();
        hmCurrentProfilePhotoURL = ''; hmDiscardPendingPhoto(); hmApplyNicknameToUI();
        hmSetProfileStatus('기본 이미지로 변경했습니다.', 'success');
    } catch (err) {
        hmReportError('resetProfilePhoto', err, '프로필 사진을 초기화하지 못했습니다.');
        hmSetProfileStatus('프로필 사진을 초기화하지 못했습니다.', 'error');
    } finally { if (button) button.disabled = false; }
}
