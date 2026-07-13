// =========================================================
// HearMe2nite v1.0 STEP5.6.4.0
// chat.js - card launcher, unread badge, realtime chat modal
// Existing message path remains rooms/{roomCode}/messages.
// =========================================================

let hmChatReadRef = null;
let hmChatPresenceRef = null;
let hmChatLastReadAt = 0;
let hmChatLatestTimestamp = 0;
let hmChatLatestMessages = null;
let hmChatPartnerOnline = false;

function hmChatTimestampValue(msg) {
    return Number(msg && (msg.timestamp || msg.createdAt || msg.sentAt) || 0);
}

function hmFormatChatTimestamp(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate();
    const ampm = date.getHours() < 12 ? '오전' : '오후';
    const hour12 = date.getHours() % 12 || 12;
    const minute = String(date.getMinutes()).padStart(2, '0');
    const time = `${ampm} ${hour12}:${minute}`;
    if (isToday) return time;
    if (isYesterday) return `어제 ${time}`;
    return `${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')} ${time}`;
}

function hmGetChatMessageRows(messages) {
    if (!messages || typeof messages !== 'object') return [];
    return Object.keys(messages).map(key => ({ key, ...(messages[key] || {}) }))
        .sort((a, b) => hmChatTimestampValue(a) - hmChatTimestampValue(b));
}

function hmIsChatModalOpen() {
    const overlay = document.getElementById('chatModalOverlay');
    return !!overlay && overlay.getAttribute('aria-hidden') === 'false' && overlay.style.display !== 'none';
}

function hmUpdateChatCard(messages) {
    const rows = hmGetChatMessageRows(messages);
    const preview = document.getElementById('chatCardPreview');
    const time = document.getElementById('chatCardTime');
    const badge = document.getElementById('chatUnreadBadge');
    const roomCode = getRoomCodeForData();

    hmChatLatestTimestamp = rows.reduce((latest, msg) => Math.max(latest, hmChatTimestampValue(msg)), 0);
    const latest = rows.length ? rows[rows.length - 1] : null;
    if (preview) {
        if (!roomCode) preview.textContent = '공간을 연결하면 대화를 시작할 수 있어요.';
        else if (!latest) preview.textContent = '첫 메시지를 보내 대화를 시작해보세요.';
        else preview.textContent = `${latest.senderUid === currentUser?.uid ? '나: ' : ''}${String(latest.text || '').replace(/\s+/g, ' ').trim() || '메시지'}`;
    }
    if (time) time.textContent = latest ? hmFormatChatTimestamp(hmChatTimestampValue(latest)) : '';

    const unread = currentUser ? rows.filter(msg => msg.senderUid !== currentUser.uid && hmChatTimestampValue(msg) > hmChatLastReadAt).length : 0;
    if (badge) {
        badge.textContent = unread > 99 ? '99+' : String(unread);
        badge.hidden = unread < 1;
    }
    if (unread > 0) {
        const card = document.getElementById('chatLaunchCard');
        if (card) card.setAttribute('aria-label', `우리의 대화 열기, 읽지 않은 메시지 ${unread}개`);
    }
}

function hmUpdateChatPresence(members) {
    const dot = document.getElementById('chatCardPresenceDot');
    const text = document.getElementById('chatCardPresenceText');
    const modalText = document.getElementById('chatModalPresence');
    const offlineNote = document.getElementById('chatOfflineNote');
    const entries = members && typeof members === 'object' ? Object.entries(members) : [];
    const partners = currentUser ? entries.filter(([uid]) => uid !== currentUser.uid) : [];
    hmChatPartnerOnline = partners.some(([, member]) => member && member.presence && member.presence.online === true);
    const label = !getRoomCodeForData() ? '공간 연결 전' : !partners.length ? '상대방 연결 전' : hmChatPartnerOnline ? '상대방 온라인' : '상대방 오프라인';
    if (dot) dot.classList.toggle('is-online', hmChatPartnerOnline);
    if (text) text.textContent = label;
    if (modalText) modalText.textContent = hmChatPartnerOnline ? '● 상대방 온라인 · 지금 바로 대화할 수 있어요' : `○ ${label}`;
    if (offlineNote) offlineNote.hidden = hmChatPartnerOnline || !partners.length;
}

async function hmMarkChatRead() {
    if (!currentUser || !getRoomCodeForData() || !hmChatReadRef) return;
    const readAt = Math.max(Date.now(), hmChatLatestTimestamp || 0);
    hmChatLastReadAt = readAt;
    hmUpdateChatCard(hmChatLatestMessages);
    try {
        await hmChatReadRef.set({ lastReadAt: readAt, updatedAt: firebase.database.ServerValue.TIMESTAMP });
    } catch (err) {
        hmReportError('hmMarkChatRead', err, hmIsFirebasePermissionError(err) ? '❌ 채팅 읽음 상태 저장 권한 없음' : '❌ 채팅 읽음 상태 저장 실패');
    }
}

function openChatModal() {
    if (!getRoomCodeForData()) {
        if (typeof showToast === 'function') showToast('먼저 우리의 공간을 연결해 주세요.');
        return;
    }
    if (typeof openModalOverlayById === 'function') openModalOverlayById('chatModalOverlay');
    else {
        const overlay = document.getElementById('chatModalOverlay');
        if (overlay) { overlay.removeAttribute('inert'); overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden', 'false'); }
    }
    requestAnimationFrame(() => {
        const messages = document.getElementById('chatMessages');
        if (messages) messages.scrollTop = messages.scrollHeight;
        const input = document.getElementById('chatInput');
        if (input) input.focus({ preventScroll: true });
    });
    hmMarkChatRead();
}

function closeChatModal() {
    hmMarkChatRead();
    if (typeof closeModalOverlayById === 'function') closeModalOverlayById('chatModalOverlay');
    else {
        const overlay = document.getElementById('chatModalOverlay');
        if (document.activeElement && overlay && overlay.contains(document.activeElement)) document.activeElement.blur();
        if (overlay) { overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true'); overlay.setAttribute('inert', ''); }
    }
}

async function listenChat() {
    const roomCode = getRoomCodeForData();
    if (!(await hmRequireRoomAccess('채팅 읽기', roomCode))) return;
    if (chatRef) chatRef.off();
    if (hmChatReadRef) hmChatReadRef.off();
    if (hmChatPresenceRef) hmChatPresenceRef.off();

    hmChatLastReadAt = 0;
    hmChatLatestTimestamp = 0;
    hmChatLatestMessages = null;

    chatRef = db.ref('rooms/' + roomCode + '/messages');
    hmChatReadRef = db.ref(`rooms/${roomCode}/chatReadStatus/${currentUser.uid}`);
    hmChatPresenceRef = db.ref(`roomMembers/${roomCode}`);

    hmChatReadRef.on('value', snapshot => {
        if (roomCode !== activeRoomCode) return;
        const value = snapshot.val() || {};
        hmChatLastReadAt = Number(value.lastReadAt || 0);
        hmUpdateChatCard(hmChatLatestMessages);
    }, err => hmReportError('listenChatReadStatus', err, '❌ 채팅 읽음 상태 불러오기 실패'));

    hmChatPresenceRef.on('value', snapshot => {
        if (roomCode !== activeRoomCode) return;
        hmUpdateChatPresence(snapshot.val() || {});
    }, () => hmUpdateChatPresence({}));

    chatRef.limitToLast(50).on('value', snapshot => {
        if (roomCode !== activeRoomCode) return;
        hmChatLatestMessages = snapshot.val();
        renderMessages(hmChatLatestMessages);
        hmUpdateChatCard(hmChatLatestMessages);
        if (hmIsChatModalOpen()) hmMarkChatRead();
    }, err => {
        hmReportError('listenChat', err, hmIsFirebasePermissionError(err) ? '❌ 채팅 읽기 권한 없음' : '❌ 채팅 불러오기 실패');
    });
}

function renderMessages(messages) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    chatMessages.innerHTML = '';
    const rows = hmGetChatMessageRows(messages);
    if (!rows.length) {
        chatMessages.innerHTML = '<div class="hm-chat-empty">첫 메시지를 보내 대화를 시작해보세요! 💬</div>';
        return;
    }
    const myName = typeof hmGetChatDisplayName === 'function' ? hmGetChatDisplayName() : document.getElementById('chatSender').value.trim();
    rows.forEach(msg => {
        const msgLine = document.createElement('div');
        const isMe = msg.senderUid === currentUser.uid || (msg.sender === myName && myName !== '');
        msgLine.className = 'chat-message-line ' + (isMe ? 'is-me' : 'is-other');
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerText = msg.text;
        if (!isMe) {
            const senderName = document.createElement('span');
            senderName.className = 'chat-sender-name';
            senderName.innerText = msg.sender || '상대방';
            msgLine.appendChild(senderName);
        }
        msgLine.appendChild(bubble);
        const timeText = hmFormatChatTimestamp(hmChatTimestampValue(msg));
        if (timeText) {
            const timeEl = document.createElement('span');
            timeEl.className = 'chat-message-time';
            timeEl.innerText = timeText;
            msgLine.appendChild(timeEl);
        }
        chatMessages.appendChild(msgLine);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChatMessage() {
    try {
        const roomCode = getRoomCodeForData();
        const sender = typeof hmGetChatDisplayName === 'function' ? hmGetChatDisplayName() : document.getElementById('chatSender').value.trim();
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        if (!currentUser) { alert('로그인이 필요합니다.'); return; }
        if (!sender || !text) return;
        if (!(await hmRequireRoomAccess('채팅 전송', roomCode))) { alert('채팅 권한이 없습니다.'); return; }
        await db.ref('rooms/' + roomCode + '/messages').push({
            sender,
            senderUid: currentUser.uid,
            senderEmail: currentUser.email,
            text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        input.value = '';
        input.focus({ preventScroll: true });
    } catch (err) {
        hmReportError('sendChatMessage', err, hmIsFirebasePermissionError(err) ? '❌ 채팅 권한 없음' : '❌ 채팅 전송 실패');
    }
}

function updateChatAlignment() {
    const roomCode = getRoomCodeForData();
    if (!roomCode || !chatRef) return;
    chatRef.once('value', snapshot => { renderMessages(snapshot.val()); hmUpdateChatCard(snapshot.val()); });
}

window.openChatModal = openChatModal;
window.closeChatModal = closeChatModal;
