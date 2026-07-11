// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// chat.js - Chat
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // =========================================================

    // MODULE: CHAT / LISTEN

    // Split-ready target: listenChat

    // =========================================================

    // Chat listener 연결
    // 현재 방의 chat 경로를 실시간 구독한다.

    // =========================================================
    // MODULE 16. CHAT
    // 분리 후보: chat.js
    // 방별 채팅 listener, 메시지 렌더링, 전송, 내 메시지 정렬을 담당한다.
    // chats/{roomCode} 경로는 변경 금지.
    // =========================================================
    async function listenChat() {
        const roomCode = getRoomCodeForData();
        if (!(await hmRequireRoomAccess('채팅 읽기', roomCode))) return;
        if (chatRef) chatRef.off();
        chatRef = db.ref('rooms/' + roomCode + '/messages');
        chatRef.limitToLast(50).on('value', (snapshot) => {
            if (roomCode !== activeRoomCode) return;
            renderMessages(snapshot.val());
        }, (err) => {
            hmReportError('listenChat', err, hmIsFirebasePermissionError(err) ? '❌ 채팅 읽기 권한 없음' : '❌ 채팅 불러오기 실패');
        });
    }

    // =========================================================

    // MODULE: CHAT / RENDER

    // Split-ready target: renderMessages

    // =========================================================

    // Chat 메시지 렌더링
    // sender uid를 기준으로 내 메시지/상대 메시지 정렬을 결정한다.
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

    function renderMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        if (!messages) {
            chatMessages.innerHTML = '<div style="text-align: center; color: #ccc; font-size: 0.85rem; margin-top: 50px;">첫 메시지를 보내 대화를 시작해보세요! 💬</div>';
            return;
        }
        const myName = typeof hmGetChatDisplayName === 'function' ? hmGetChatDisplayName() : document.getElementById('chatSender').value.trim();
        Object.keys(messages).forEach((key) => {
            const msg = messages[key];
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
            const timeText = hmFormatChatTimestamp(msg.timestamp || msg.createdAt || msg.sentAt);
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

    // =========================================================

    // MODULE: CHAT / SEND

    // Split-ready target: sendChatMessage

    // =========================================================

    // Chat 메시지 전송
    // 현재 roomCode/chat 하위에 메시지를 push한다.
    async function sendChatMessage() {
        try {
            const roomCode = getRoomCodeForData();
            const sender = typeof hmGetChatDisplayName === 'function' ? hmGetChatDisplayName() : document.getElementById('chatSender').value.trim();
            const text = document.getElementById('chatInput').value.trim();
            if (!currentUser) { alert('로그인이 필요합니다.'); return; }
            if (!sender || !text) return;
            if (!(await hmRequireRoomAccess('채팅 전송', roomCode))) { alert('채팅 권한이 없습니다.'); return; }

            await db.ref('rooms/' + roomCode + '/messages').push({
                sender: sender,
                senderUid: currentUser.uid,
                senderEmail: currentUser.email,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            document.getElementById('chatInput').value = '';
        } catch (err) {
            hmReportError('sendChatMessage', err, hmIsFirebasePermissionError(err) ? '❌ 채팅 권한 없음' : '❌ 채팅 전송 실패');
        }
    }

    // =========================================================

    // MODULE: CHAT / ALIGNMENT

    // Split-ready target: updateChatAlignment

    // =========================================================

    function updateChatAlignment() {
        const roomCode = getRoomCodeForData();
        if (!roomCode || !chatRef) return;
        chatRef.once('value', (snapshot) => { renderMessages(snapshot.val()); });
    }



