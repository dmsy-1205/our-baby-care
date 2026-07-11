// =========================================================
// HearMe2nite v1.0 STEP5.6.2R
// profile.js - 닉네임 / 프로필 사진 / 채팅 이름 고정
// 기존 UID, Room, 메시지 경로를 변경하지 않는다.
// =========================================================

let hmCurrentNickname = '';
let hmCurrentProfilePhotoURL = '';
let hmPendingProfilePhotoBlob = null;
let hmPendingProfilePhotoPreviewURL = '';
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

function hmProfileLetter(name) {
    return (String(name || '').trim().slice(0, 1).toUpperCase() || '♡');
}
function hmCreateAvatarElement(className, profile, fallbackName) {
    const el = document.createElement('div');
    el.className = className;
    const name = (profile && profile.nickname) || fallbackName || '상대방';
    const photoURL = profile && typeof profile.photoURL === 'string' ? profile.photoURL : '';
    if (photoURL) {
        const img = document.createElement('img');
        img.src = photoURL;
        img.alt = `${name} 프로필 사진`;
        img.referrerPolicy = 'no-referrer';
        img.onerror = () => { el.innerHTML = ''; el.textContent = hmProfileLetter(name); };
        el.appendChild(img);
    } else {
        el.textContent = hmProfileLetter(name);
    }
    return el;
}
function hmProfileStorageErrorMessage(err) {
    const code = err && err.code ? String(err.code) : '';
    if (code === 'storage/unauthorized') return '사진 저장 권한이 없습니다. Storage Rules가 배포되었는지 확인해 주세요.';
    if (code === 'storage/bucket-not-found') return 'Firebase Storage 버킷을 찾지 못했습니다. Firebase Console에서 Storage를 먼저 활성화해 주세요.';
    if (code === 'storage/retry-limit-exceeded') return '사진 업로드 시간이 초과되었습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
    if (code === 'storage/quota-exceeded') return 'Firebase Storage 사용 한도를 초과했습니다.';
    if (code === 'storage/unauthenticated') return '로그인 상태가 만료되었습니다. 다시 로그인해 주세요.';
    return '프로필 사진 저장에 실패했습니다. Storage 설정과 배포 상태를 확인해 주세요.';
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
window.hmStartRoomProfilesListener = hmStartRoomProfilesListener;
window.hmStopRoomProfilesListener = hmStopRoomProfilesListener;
window.hmGetRoomProfile = hmGetRoomProfile;
window.hmCreateAvatarElement = hmCreateAvatarElement;

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
    if (!hmPendingProfilePhotoBlob || !currentUser) return { photoURL: hmCurrentProfilePhotoURL, uploaded: false, ref: null };
    if (!storage || typeof storage.ref !== 'function') throw Object.assign(new Error('Firebase Storage가 초기화되지 않았습니다.'), { code: 'storage/not-initialized' });
    const ref = storage.ref().child(`profiles/${currentUser.uid}/avatar.webp`);
    const snapshot = await ref.put(hmPendingProfilePhotoBlob, {
        contentType: 'image/webp',
        cacheControl: 'public,max-age=3600',
        customMetadata: { ownerUid: currentUser.uid, app: 'HearMe2nite' }
    });
    return { photoURL: await snapshot.ref.getDownloadURL(), uploaded: true, ref: snapshot.ref };
}

async function saveProfileNickname() {
    if (!currentUser) { alert('로그인이 필요합니다.'); return; }
    const input = document.getElementById('profileNicknameInput');
    const button = document.getElementById('profileSaveBtn');
    const nickname = hmNormalizeNickname(input ? input.value : '');
    if (!hmIsValidNickname(nickname)) {
        hmSetProfileStatus('닉네임은 2~20자로 입력하고 / . # $ [ ] 문자는 사용하지 마세요.', 'error');
        if (input) input.focus();
        return;
    }
    let uploadResult = { photoURL: hmCurrentProfilePhotoURL, uploaded: false, ref: null };
    try {
        if (button) { button.disabled = true; button.textContent = hmPendingProfilePhotoBlob ? '사진 업로드 중…' : '프로필 저장 중…'; }
        uploadResult = await hmUploadPendingProfilePhoto();
        if (button) button.textContent = '프로필 정보 저장 중…';
        const profileData = {
            nickname,
            photoURL: uploadResult.photoURL || '',
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        const updates = {};
        updates[`users/${currentUser.uid}/profile`] = profileData;
        if (activeRoomCode) updates[`roomMembers/${activeRoomCode}/${currentUser.uid}/profile`] = profileData;
        await db.ref().update(updates);
        hmCurrentNickname = nickname;
        hmCurrentProfilePhotoURL = uploadResult.photoURL || '';
        hmDiscardPendingPhoto();
        hmApplyNicknameToUI();
        hmStartRoomProfilesListener();
        updateChatAlignment();
        hmSetProfileStatus('프로필이 저장되었습니다. 우리의 공간과 새 채팅에 반영됩니다.', 'success');
        showSaveStatus('✅ 프로필 저장 완료');
    } catch (err) {
        if (uploadResult.uploaded && uploadResult.ref) {
            try { await uploadResult.ref.delete(); } catch (_) {}
        }
        hmReportError('saveUserProfile', err, hmIsFirebasePermissionError(err) ? '프로필 저장 권한을 확인해 주세요.' : '프로필 저장에 실패했습니다.');
        const message = String(err && err.code || '').startsWith('storage/') ? hmProfileStorageErrorMessage(err) : (hmIsFirebasePermissionError(err) ? 'Realtime Database 프로필 저장 권한을 확인해 주세요.' : '프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        hmSetProfileStatus(message, 'error');
    } finally {
        if (button) { button.disabled = false; button.textContent = '프로필 저장'; }
    }
}

async function resetProfilePhoto() {
    if (!currentUser) return;
    if (!confirm('프로필 사진을 기본 이미지로 되돌릴까요?')) return;
    const button = document.getElementById('profilePhotoResetBtn');
    try {
        if (button) button.disabled = true;
        try { await storage.ref().child(`profiles/${currentUser.uid}/avatar.webp`).delete(); } catch (e) { if (!e || e.code !== 'storage/object-not-found') throw e; }
        const updates = {};
        updates[`users/${currentUser.uid}/profile/photoURL`] = null;
        if (activeRoomCode) updates[`roomMembers/${activeRoomCode}/${currentUser.uid}/profile/photoURL`] = null;
        await db.ref().update(updates);
        hmCurrentProfilePhotoURL = ''; hmDiscardPendingPhoto(); hmApplyNicknameToUI(); hmStartRoomProfilesListener();
        hmSetProfileStatus('기본 이미지로 변경했습니다.', 'success');
    } catch (err) {
        hmReportError('resetProfilePhoto', err, '프로필 사진을 초기화하지 못했습니다.');
        hmSetProfileStatus('프로필 사진을 초기화하지 못했습니다.', 'error');
    } finally { if (button) button.disabled = false; }
}
