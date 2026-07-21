// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// room.js - Room / Role / Data Guard
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // MODULE: ROLE / RELATIONSHIP ROLE

    // Split-ready target: getRelationshipRoleLabel

    // =========================================================


    // =========================================================
    // MODULE 05. RELATIONSHIP ROLE
    // 분리 후보: role.js
    // 관리(Dom) / 기록(Sub) 역할 표시, 최초 설정, 잠금, 권한 UI를 담당한다.
    // roomMembers/{roomCode}/{uid}/relationshipRole 경로는 변경 금지.
    // =========================================================
    function getRelationshipRoleLabel(role) {
        if (role === 'dom') return '관리(Dom)';
        if (role === 'sub') return '기록(Sub)';
        return '역할 미선택';
    }

    function canManageRelationshipCards() {
        return activeRelationshipRole === 'dom';
    }

    async function getCurrentUserRelationshipRole(roomCode) {
        if (!currentUser || !roomCode) return '';
        try {
            const snap = await db.ref(`roomMembers/${roomCode}/${currentUser.uid}/relationshipRole`).once('value');
            return snap.val() || '';
        } catch (err) {
            console.error('관계 역할 확인 실패:', err);
            return '';
        }
    }

    async function getUserDefaultRelationshipRole() {
        if (!currentUser) return '';
        try {
            const snap = await db.ref(`users/${currentUser.uid}/relationshipRole`).once('value');
            return snap.val() || '';
        } catch (err) {
            console.error('기본 관계 역할 확인 실패:', err);
            return '';
        }
    }

    // 관계 역할 설정
    // 관리(Dom) / 기록(Sub)을 최초 선택 후 고정하는 역할이다.
    // 주의: 기존 roomMembers 구조를 변경하지 않고 relationshipRole만 기록한다.
    async function setRelationshipRole(role) {
        if (!['dom', 'sub'].includes(role)) return;
        if (activeRelationshipRole) {
            alert('관계 역할은 최초 1회 설정 후 변경할 수 없습니다. 변경이 필요하면 새 공간/초기화 절차로 진행해 주세요.');
            updateRelationshipRoleUI();
            return;
        }
        const ok = confirm(`${getRelationshipRoleLabel(role)} 역할로 설정할까요?

이 설정은 앱 설치 순서나 방 생성 순서와 관계없으며, 최초 1회 선택 후 일반 화면에서는 변경할 수 없습니다.`);
        if (!ok) return;

        pendingRelationshipRole = role;
        activeRelationshipRole = role;
        updateRelationshipRoleUI();
        updateOwnerOnlySections();
        updateDailyCards();
        updateManagedFieldAccessControls();
        hmRefreshPresenceFromRoom();

        if (currentUser) {
            try {
                const updates = {};
                updates[`users/${currentUser.uid}/relationshipRole`] = role;
                if (activeRoomCode) {
                    updates[`roomMembers/${activeRoomCode}/${currentUser.uid}/relationshipRole`] = role;
                    updates[`userRooms/${currentUser.uid}/${activeRoomCode}/relationshipRole`] = role;
                }
                await db.ref().update(updates);
                showSaveStatus(`👥 역할 고정 완료: ${getRelationshipRoleLabel(role)}`);
            } catch (err) {
                console.error(err);
                showSaveStatus('❌ 역할 저장 실패');
            }
        }
    }

    // =========================================================

    // MODULE: ROLE / ROLE UI

    // Split-ready target: updateRelationshipRoleUI

    // =========================================================

    // 관계 역할 UI 동기화
    // activeRelationshipRole 상태를 버튼/잠금 배지/관리 전용 카드 표시와 맞춘다.
    function updateRelationshipRoleUI() {
        const role = activeRelationshipRole || pendingRelationshipRole || '';
        const box = document.getElementById('relationshipRoleBox');
        const domBtn = document.getElementById('relationshipDomBtn');
        const subBtn = document.getElementById('relationshipSubBtn');
        const help = document.getElementById('relationshipRoleHelp');
        const note = document.getElementById('relationshipRoleNote');
        const badge = document.getElementById('relationshipRoleLockedBadge');
        const isLocked = !!activeRelationshipRole;

        if (box) box.classList.toggle('is-locked', isLocked);
        if (domBtn) {
            domBtn.classList.toggle('active', role === 'dom');
            domBtn.disabled = isLocked;
        }
        if (subBtn) {
            subBtn.classList.toggle('active', role === 'sub');
            subBtn.disabled = isLocked;
        }
        if (badge) badge.innerHTML = isLocked ? '<span class="relationship-role-locked-badge">고정됨</span>' : '';
        if (note) note.style.display = isLocked ? 'none' : 'block';
        if (help) {
            help.innerText = isLocked
                ? `현재 역할: ${getRelationshipRoleLabel(role)} · 이 역할은 고정되어 일반 화면에서는 변경할 수 없습니다.`
                : '관리(Dom) 또는 기록(Sub)을 먼저 선택해 주세요. 앱 설치 순서/방 생성 순서와는 관계가 없습니다.';
        }
    }

    // =========================================================

    // MODULE: ROOM / CURRENT ROOM INFO

    // Split-ready target: updateCurrentRoomInfo

    // =========================================================


    // =========================================================
    // MODULE 06. ROOM STATUS / GUIDE
    // 분리 후보: room.js 일부 + guide.js 선택
    // 현재 연결된 방 표시, 사용설명서, 내 공간 목록 표시를 담당한다.
    // =========================================================
    function updateCurrentRoomInfo() {
        const el = document.getElementById('currentRoomInfo');
        const createBtn = document.getElementById('createRoomBtn');
        const invitePanel = document.getElementById('invitePanel');
        const joinInvitePanel = document.getElementById('joinInvitePanel');
        const legacyRoomPanel = document.getElementById('legacyRoomPanel');
        const roomSettingsCardSub = document.getElementById('roomSettingsCardSub');
        if (!el) return;

        const emptyState = document.getElementById('roomEmptyState');
        if (activeRoomCode) {
            if (emptyState) emptyState.style.display = 'none';
            setDataSectionsVisible(true);
            const roleLabel = activeRoomRole === 'owner' ? '방주인' : '초대받은 사용자';
            const relationshipLabel = getRelationshipRoleLabel(activeRelationshipRole || pendingRelationshipRole);
            el.innerHTML = `현재 연결된 공간: <strong>${escapeHtml(activeRoomCode)}</strong><br>내 권한: <strong>${roleLabel}</strong> · 내 역할: <strong>${relationshipLabel}</strong><br>이 공간의 기록과 채팅이 실시간으로 동기화됩니다.`;
            if (roomSettingsCardSub) roomSettingsCardSub.innerText = `현재: ${activeRoomCode} · ${relationshipLabel}`;

            // 정책:
            // - owner: 새 방 만들기, 초대코드 생성, 초대코드 입력, 기존방 재연결 가능
            // - partner: 새 방 만들기/초대코드 생성/기존 공유코드 연결은 금지
            // - partner도 방주인이 새로 보낸 초대코드로는 방 이동 가능
            if (activeRoomRole === 'owner') {
                if (createBtn) { createBtn.style.display = ''; createBtn.innerText = '🌱 새 공간 만들기 / 다른 공간으로 시작하기'; }
                if (invitePanel) { invitePanel.open = false; invitePanel.style.display = ''; }
                if (joinInvitePanel) { joinInvitePanel.open = false; joinInvitePanel.style.display = ''; }
                if (legacyRoomPanel) { legacyRoomPanel.open = false; legacyRoomPanel.style.display = ''; }
                if (currentUser) loadMyRoomList();
            } else {
                if (createBtn) { createBtn.style.display = 'none'; }
                if (invitePanel) { invitePanel.open = false; invitePanel.style.display = 'none'; }
                if (joinInvitePanel) { joinInvitePanel.open = false; joinInvitePanel.style.display = ''; }
                if (legacyRoomPanel) { legacyRoomPanel.open = false; legacyRoomPanel.style.display = 'none'; }
            }
        } else {
            if (emptyState) emptyState.style.display = 'block';
            setDataSectionsVisible(false);
            el.innerHTML = '아직 연결된 공간이 없습니다. 혼자 사용할 공간을 만들거나 초대코드를 입력해 주세요.';
            if (roomSettingsCardSub) roomSettingsCardSub.innerText = '방을 만들거나 초대코드로 연결하세요.';
            if (createBtn) { createBtn.style.display = ''; createBtn.innerText = '🌱 새로운 공간 시작하기'; }
            if (invitePanel) { invitePanel.open = false; invitePanel.style.display = ''; }
            if (joinInvitePanel) { joinInvitePanel.open = false; joinInvitePanel.style.display = ''; }
            if (legacyRoomPanel) { legacyRoomPanel.open = false; legacyRoomPanel.style.display = ''; }
            if (currentUser) loadMyRoomList();
        }
        updateRelationshipRoleUI();
        updateOwnerOnlySections();
        updateManagedFieldAccessControls();
        hmRefreshPresenceFromRoom();
        if (typeof hmRefreshThemeForActiveRoom === 'function') hmRefreshThemeForActiveRoom();
    }


    // =========================================================

    // MODULE: ROOM / PRESENCE BRIDGE

    // RC2.14.4 Recovery STEP1
    // room.js는 Presence 데이터를 직접 관리하지 않는다.
    // 방 상태(activeRoomCode/currentUser)가 바뀐 뒤 presence.js에 새로고침만 요청한다.
    // presence.js가 아직 로드되지 않은 시점도 안전하게 무시한다.
    function hmRefreshPresenceFromRoom(reason = 'room-state') {
        try {
            const run = function(delay){
                setTimeout(function(){
                    try {
                        if (!activeRoomCode && window.hmPresenceStop) {
                            window.hmPresenceStop();
                            return;
                        }
                        if (window.hmPresenceRefresh) {
                            window.hmPresenceRefresh();
                        }
                    } catch (e) {
                        console.warn('[Presence Bridge] refresh skipped:', reason, e);
                    }
                }, delay);
            };
            // Auth/room 복구는 비동기로 완료되므로 한 번만 호출하면 타이밍이 어긋날 수 있다.
            // 0ms + 짧은 지연 재시도로 currentUser/activeRoomCode 확정 후 Presence를 다시 연결한다.
            run(0);
            run(300);
            run(1000);
        } catch (e) {
            console.warn('[Presence Bridge] schedule failed:', reason, e);
        }
    }
    window.hmRefreshPresenceFromRoom = hmRefreshPresenceFromRoom;

    // =========================================================

    // MODULE: UTIL / RANDOM ID

    // Split-ready target: randomCode

    // =========================================================
    // RC2 v2.8.0 STEP1: randomCode moved to js/utils.js

    // RC2 v2.8.0 STEP1: randomRoomId moved to js/utils.js


    // =========================================================

    // MODULE: UTIL / FORMAT / SANITIZE

    // Split-ready target: escapeHtml

    // =========================================================
    // RC2 v2.8.0 STEP1: escapeHtml moved to js/utils.js


    // =========================================================

    // MODULE: STABILITY / GUARD UTILITIES

    // Split-ready target: utils.js + stability.js

    // =========================================================

    // RC2.7 안정화 공통 유틸
    // - 사용자에게는 짧은 안내만 보여주고, 개발자 콘솔에는 상세 오류를 남긴다.
    // - DB 구조/저장 경로는 변경하지 않는다.
    // RC2 v2.8.0 STEP1: hmReportError moved to js/utils.js

    // RC2 v2.8.0 STEP1: hmRequireLoginAndRoom moved to js/utils.js



    // RC2.7 STEP2: 데이터 보호 공통 가드
    // - 방 코드 형식 / 로그인 / roomMembers 권한을 작업 직전에 다시 확인한다.
    // - Firebase Rules를 우회하는 용도가 아니라, 화면 단계에서 잘못된 읽기/쓰기를 미리 차단한다.
    // RC2 v2.8.0 STEP1: hmIsSafeRoomCode moved to js/utils.js


    async function hmRequireRoomAccess(actionLabel = '작업', roomCode = getRoomCodeForData()) {
        const sessionUid = currentUser && currentUser.uid;
        if (!sessionUid) {
            showSaveStatus(`🔒 로그인 후 ${actionLabel}할 수 있습니다.`);
            return false;
        }
        if (!hmIsSafeRoomCode(roomCode)) {
            showSaveStatus(`🔑 올바른 방 연결 후 ${actionLabel}할 수 있습니다.`);
            return false;
        }
        const allowed = await canCurrentUserAccessRoom(roomCode);
        if (!currentUser || currentUser.uid !== sessionUid) return false;
        if (!allowed) {
            if (hmLastPermissionRoomCode !== roomCode) {
                hmLastPermissionRoomCode = roomCode;
                resetProtectedDataUI('이 계정은 해당 방 데이터를 열 수 없습니다.');
            }
            showSaveStatus(`🔒 ${actionLabel} 권한 없음`);
            return false;
        }
        return true;
    }

    function hmIsOwnerRole() {
        return activeRoomRole === 'owner';
    }
    // RC2 v2.8.0 STEP1: hmIsFirebasePermissionError moved to js/utils.js


    function hmSetupStabilityListeners() {
        if (window.__hmStabilityListenersReady) return;
        window.__hmStabilityListenersReady = true;

        window.addEventListener('online', () => {
            hmIsOnline = true;
            showSaveStatus('📡 인터넷 연결 복구됨');
            if (currentUser && getRoomCodeForData()) triggerAutoSave('online-reconnect');
        });

        window.addEventListener('offline', () => {
            hmIsOnline = false;
            showSaveStatus('📴 인터넷 연결 끊김 - 다시 연결되면 저장됩니다.');
        });

        window.addEventListener('error', (event) => {
            hmReportError('window.error', event.error || event.message, '⚠️ 화면 처리 중 오류가 감지되었습니다.');
        });

        window.addEventListener('unhandledrejection', (event) => {
            hmReportError('promise', event.reason, '⚠️ 비동기 처리 오류가 감지되었습니다.');
        });

        try {
            db.ref('.info/connected').on('value', (snap) => {
                if (snap.val() === true) {
                    showSaveStatus('☁️ 서버 연결됨');
                } else if (currentUser) {
                    showSaveStatus('📡 서버 재연결 대기 중');
                }
            });
        } catch (err) {
            hmReportError('firebase.connected', err, '⚠️ 서버 연결 상태 확인 실패');
        }
    }
    // RC2 v2.8.0 STEP1: formatTimestamp moved to js/utils.js


    // =========================================================

    // MODULE: GUIDE / FIRST USE MODAL

    // Split-ready target: openGuideModal

    // =========================================================


    function openOnboardingModal() {
        openModalOverlayById('onboardingModal');
    }

    async function closeOnboardingModal(markSeen = false) {
        closeModalOverlayById('onboardingModal');
        const dontShow = document.getElementById('dontShowOnboardingAgain');
        if ((markSeen || (dontShow && dontShow.checked)) && currentUser) {
            try { await db.ref(`users/${currentUser.uid}/hasSeenOnboarding`).set(true); } catch(e) { console.warn(e); }
        }
    }

    async function startSoloOnboarding() {
        await closeOnboardingModal(true);
        openRoomSettingsModal();
        showToast('먼저 새로운 공간을 만들면 혼자 바로 사용할 수 있어요.');
    }

    async function startTogetherOnboarding() {
        await closeOnboardingModal(true);
        openRoomSettingsModal();
        showToast('공간을 만든 뒤 초대코드를 만들어 상대에게 보내세요.');
    }

    function openGuideModal() {
        closeModalOverlayById('onboardingModal');
        if (typeof resetHelpCenter === 'function') resetHelpCenter();
        openModalOverlayById('guideModal');
    }

    async function closeGuideModal(markSeen = false) {
        closeModalOverlayById('guideModal');
        if (markSeen && currentUser) {
            try { await db.ref(`users/${currentUser.uid}/hasSeenGuide`).set(true); } catch(e) { console.warn(e); }
        }
    }

    async function showGuideForFirstLogin() {
        if (!currentUser) return;
        try {
            const snap = await db.ref(`users/${currentUser.uid}/hasSeenOnboarding`).once('value');
            if (snap.val() !== true && !activeRoomCode) openOnboardingModal();
        } catch (err) {
            console.warn('온보딩 확인 실패:', err);
        }
    }

    // =========================================================

    // MODULE: ROOM / MY ROOM LIST

    // Split-ready target: loadMyRoomList

    // =========================================================

    async function loadMyRoomList() {
        const box = document.getElementById('ownedRoomsList');
        const uid = currentUser && currentUser.uid;
        if (!box || !uid) return;
        box.innerHTML = '<div class="empty-message">이전 공간을 불러오는 중입니다...</div>';
        try {
            const snap = await db.ref(`userRooms/${uid}`).once('value');
            if (!currentUser || currentUser.uid !== uid) return;
            const rooms = snap.val() || {};
            const roomCodes = Object.keys(rooms).filter(Boolean);
            if (roomCodes.length === 0) {
                box.innerHTML = '<div class="empty-message">아직 불러올 이전 공간이 없습니다. ✨</div>';
                return;
            }

            const items = [];
            for (const roomCode of roomCodes) {
                const memberSnap = await db.ref(`roomMembers/${roomCode}/${uid}`).once('value');
                if (!currentUser || currentUser.uid !== uid) return;
                if (!memberSnap.exists()) continue;
                const member = memberSnap.val() || {};
                const metaSnap = await db.ref(`rooms/${roomCode}/meta`).once('value');
                if (!currentUser || currentUser.uid !== uid) return;
                const meta = metaSnap.val() || {};
                items.push({
                    roomCode,
                    role: member.role || 'member',
                    joinedAt: member.joinedAt || 0,
                    createdAt: meta.createdAt || member.joinedAt || 0,
                    isActive: roomCode === activeRoomCode
                });
            }

            items.sort((a, b) => (b.createdAt || b.joinedAt || 0) - (a.createdAt || a.joinedAt || 0));
            if (items.length === 0) {
                box.innerHTML = '<div class="empty-message">연결 가능한 이전 공간이 없습니다.</div>';
                return;
            }

            box.innerHTML = items.map(item => {
                const roleLabel = item.role === 'owner' ? '👑 방주인' : '🤝 참여자';
                const activeLabel = item.isActive ? ' · 현재 연결됨' : '';
                const disabled = item.isActive ? 'disabled style="opacity:.55; cursor:default;"' : '';
                const btnText = item.isActive ? '현재 공간' : '이 공간 열기';
                return `
                    <div class="room-list-item">
                        <div class="room-list-title">💕 ${escapeHtml(item.roomCode)}</div>
                        <div class="room-list-meta">${roleLabel}${activeLabel}<br>생성/참여일: ${formatTimestamp(item.createdAt || item.joinedAt)}</div>
                        <button type="button" class="room-open-btn" ${disabled} onclick="openPreviousRoom('${escapeHtml(item.roomCode)}')">${btnText}</button>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error(err);
            box.innerHTML = '<div class="empty-message">이전 공간 목록을 불러오지 못했습니다. Firebase Rules를 확인해 주세요.</div>';
        }
    }

    // =========================================================

    // MODULE: ROOM / OPEN PREVIOUS ROOM

    // Split-ready target: openPreviousRoom

    // =========================================================

    async function openPreviousRoom(roomCode) {
        if (!currentUser || !roomCode) return;
        if (roomCode === activeRoomCode) {
            hmRefreshPresenceFromRoom();
            return;
        }
        const ok = confirm('이전 공간으로 다시 연결할까요? 현재 기본 공간이 변경됩니다.');
        if (!ok) return;
        try {
            const memberSnap = await db.ref(`roomMembers/${roomCode}/${currentUser.uid}`).once('value');
            if (!memberSnap.exists()) {
                alert('이 계정은 해당 공간의 멤버가 아닙니다.');
                return;
            }
            const memberData = memberSnap.val() || {};
            pendingRelationshipRole = memberData.relationshipRole || pendingRelationshipRole || '';
            await saveActiveRoom(roomCode, memberData.role || 'member', memberData.relationshipRole || pendingRelationshipRole);
            connectAndListenFirebase();
            hmRefreshPresenceFromRoom('open-previous-room');
            if (currentUser) loadMyRoomList();
            showSaveStatus('☁️ 이전 공간 연결 완료');
        } catch (err) {
            console.error(err);
            alert('이전 공간 연결에 실패했습니다.');
            showSaveStatus('❌ 이전 공간 연결 실패');
        }
    }


    // =========================================================


    // MODULE: DATA / ROOM CODE RESOLUTION


    // Split-ready target: getRoomCodeForData


    // =========================================================


    // 데이터 접근용 Room Code 확인
    // activeRoomCode가 없으면 화면 입력값을 fallback으로 사용한다.

    // =========================================================
    // MODULE 10. DATA GUARD / ROOM ACCESS
    // 분리 후보: room.js + dataGuard.js 선택
    // 현재 사용자가 접근 가능한 방인지 확인하고, 보호 데이터 UI 표시를 제어한다.
    // 사용자 기록 유출 방지를 위한 핵심 영역이므로 경로/조건 변경 금지.
    // =========================================================
    function getRoomCodeForData() {
        return activeRoomCode || '';
    }

    // =========================================================

    // MODULE: DATA / SECTION VISIBILITY

    // Split-ready target: setDataSectionsVisible

    // =========================================================

    // 방 연결 전/후 데이터 섹션 노출 제어
    // 미연결 상태에서 다른 사용자의 기록이 보이지 않도록 보호한다.
    function setDataSectionsVisible(visible) {
        const targets = [
            ...document.querySelectorAll('.container > .input-group'),
            ...document.querySelectorAll('.container > .row'),
            document.getElementById('chatSection'),
            document.querySelector('.container > .btn-main'),
            document.getElementById('resultContainer'),
            document.querySelector('.history-card')
        ].filter(Boolean);

        targets.forEach((el) => {
            if (el.id === 'resultContainer' && visible) return;
            el.style.display = visible ? '' : 'none';
        });
    }

    // =========================================================

    // MODULE: DATA / PROTECTED UI RESET

    // Split-ready target: resetProtectedDataUI

    // =========================================================

    // 보호 화면 초기화
    // 로그아웃/방 해제 시 폼, 히스토리, 채팅 표시를 안전한 빈 상태로 되돌린다.
    function resetProtectedDataUI(message = '방을 만들거나 초대코드로 참여하면 기록이 표시됩니다. ✨') {
        clearFormFieldsExceptSync();
        const resultContainer = document.getElementById('resultContainer');
        const resultBox = document.getElementById('resultBox');
        const historyList = document.getElementById('historyList');
        const chatMessages = document.getElementById('chatMessages');
        if (resultContainer) resultContainer.style.display = 'none';
        if (resultBox) resultBox.value = '';
        if (historyList) historyList.innerHTML = `<div class="empty-message">${escapeHtml(message)}</div>`;
        if (chatMessages) chatMessages.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 0.85rem; margin-top: 50px;">방에 연결되면 채팅이 표시됩니다. ✨</div>';
    }

    // =========================================================

    // MODULE: SECURITY / ROOM ACCESS CHECK

    // Split-ready target: canCurrentUserAccessRoom

    // =========================================================

    // 현재 사용자의 Room 접근 권한 확인
    // roomMembers/{roomCode}/{uid} 기준으로 접근 가능 여부를 판단한다.
    async function canCurrentUserAccessRoom(roomCode) {
        const uid = currentUser && currentUser.uid;
        if (!uid || !hmIsSafeRoomCode(roomCode)) return false;
        try {
            const memberSnap = await db.ref(`roomMembers/${roomCode}/${uid}`).once('value');
            if (!currentUser || currentUser.uid !== uid) return false;
            return memberSnap.exists();
        } catch (err) {
            console.error('방 접근 확인 실패:', err);
            return false;
        }
    }

    // =========================================================

    // MODULE: ROOM / MEMBER ROLE

    // Split-ready target: getCurrentUserRoomRole

    // =========================================================

    async function getCurrentUserRoomRole(roomCode) {
        if (!currentUser || !roomCode) return '';
        try {
            const memberSnap = await db.ref(`roomMembers/${roomCode}/${currentUser.uid}/role`).once('value');
            return memberSnap.val() || '';
        } catch (err) {
            console.error('방 역할 확인 실패:', err);
            return '';
        }
    }

    // =========================================================

    // MODULE: ROOM / SAVE ACTIVE ROOM

    // Split-ready target: saveActiveRoom

    // =========================================================

    // 사용자별 활성 방 저장
    // users/{uid}/activeRoom에 마지막 사용 방/역할 정보를 저장한다.

    // =========================================================
    // MODULE 11. ROOM CREATE / INVITE / JOIN
    // 분리 후보: room.js
    // 방 생성, 초대코드 생성, 초대 수락, 기존 방 참여, activeRoom 저장을 담당한다.
    // rooms / roomMembers / userRooms / invites 경로는 변경 금지.
    // =========================================================
    async function saveActiveRoom(roomCode, role = 'member', relationshipRole = '') {
        const myEmail = normalizeEmail(currentUser.email);
        let existingMember = null;
        try {
            const existingSnap = await db.ref(`roomMembers/${roomCode}/${currentUser.uid}`).once('value');
            existingMember = existingSnap.exists() ? (existingSnap.val() || {}) : null;
        } catch (e) {
            console.warn(e);
        }

        const existingRelationshipRole = existingMember && existingMember.relationshipRole ? existingMember.relationshipRole : '';
        const resolvedRole = existingMember && existingMember.role ? existingMember.role : role;
        const userDefaultRelationshipRole = await getUserDefaultRelationshipRole();
        const finalRelationshipRole = relationshipRole || existingRelationshipRole || pendingRelationshipRole || userDefaultRelationshipRole || (resolvedRole === 'owner' ? 'dom' : 'sub');

        // 기존 Room 전환 시에는 이미 존재하는 멤버십을 절대 다시 쓰지 않는다.
        // joinedAt / inviteCode 등 가입 당시 보안 필드를 보존하고,
        // 사용자별 활성 Room 정보만 갱신한다.
        const updates = {};
        if (!existingMember) {
            updates[`roomMembers/${roomCode}/${currentUser.uid}`] = {
                email: myEmail,
                role: resolvedRole,
                relationshipRole: finalRelationshipRole,
                joinedAt: firebase.database.ServerValue.TIMESTAMP
            };
        }
        updates[`userRooms/${currentUser.uid}/${roomCode}`] = true;
        updates[`users/${currentUser.uid}/activeRoom`] = roomCode;
        updates[`users/${currentUser.uid}/email`] = myEmail;
        updates[`users/${currentUser.uid}/lastLogin`] = firebase.database.ServerValue.TIMESTAMP;
        updates[`users/${currentUser.uid}/relationshipRole`] = finalRelationshipRole;
        await db.ref().update(updates);

        activeRoomCode = roomCode;
        activeRoomRole = resolvedRole;
        activeRelationshipRole = finalRelationshipRole;
        pendingRelationshipRole = finalRelationshipRole;
        const roomInput = document.getElementById('roomCode');
        if (roomInput) roomInput.value = roomCode;
        updateCurrentRoomInfo();
        hmRefreshPresenceFromRoom('save-active-room');
    }

    // =========================================================

    // MODULE: ROOM / CREATE ROOM

    // Split-ready target: createMyRoom

    // =========================================================

    // 새 Room 생성
    // 방 코드, owner, roomMembers, activeRoom을 생성한다.
    // 주의: DB key/Room 구조는 Firebase Rules와 연결되어 있으므로 변경 금지.
    async function createMyRoom() {
        if (!currentUser) { alert('먼저 로그인해 주세요.'); return; }

        // 신규 가입자는 Firebase Rules가 auth.token.email_verified를 확인한다.
        // 이메일 인증 직후의 오래된 ID 토큰으로 방 생성을 시도하지 않도록
        // 실제 생성 쓰기 직전에 토큰을 다시 발급받는다.
        try {
            const verificationPolicy = await hmGetEmailVerificationPolicy(currentUser);
            if (verificationPolicy.required) {
                const tokenReady = await hmEnsureVerifiedAuthToken(currentUser);
                if (!tokenReady) {
                    alert('이메일 인증 정보를 갱신하지 못했습니다. 다시 로그인한 뒤 방을 만들어 주세요.');
                    return;
                }
            }
        } catch (verificationError) {
            console.error('[Room Create] 이메일 인증 토큰 갱신 실패:', verificationError);
            alert('이메일 인증 정보를 확인하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.');
            return;
        }
        if (activeRoomCode) {
            if (activeRoomRole !== 'owner') {
                alert('초대받은 사용자는 새 방을 만들 수 없습니다. 방 변경은 방주인만 가능합니다.');
                return;
            }
            const ok = confirm('이미 연결된 방이 있습니다. 새 방을 만들면 앞으로 새 방이 기본 방으로 열립니다. 계속할까요?');
            if (!ok) return;
        }
        if (!pendingRelationshipRole && !activeRelationshipRole) { alert('먼저 관리(Dom) 또는 기록(Sub) 역할을 선택해 주세요.'); return; }
        const roomCode = randomRoomId();
        const myEmail = normalizeEmail(currentUser.email);
        showSaveStatus('🏠 새 방 생성 중...');
        try {
            await saveActiveRoom(roomCode, 'owner', pendingRelationshipRole);
            await db.ref(`rooms/${roomCode}/meta`).set({
                ownerUid: currentUser.uid,
                ownerEmail: myEmail,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                app: 'hearme2nite'
            });
            connectAndListenFirebase();
            hmRefreshPresenceFromRoom('create-room');
            showSaveStatus('☁️ 내 방 생성 완료');
        } catch (err) {
            console.error(err);
            alert('방 생성에 실패했습니다. Firebase Rules를 확인해 주세요.');
            showSaveStatus('❌ 방 생성 실패');
        }
    }

    // =========================================================

    // MODULE: INVITE / CREATE CODE

    // Split-ready target: createInviteCode

    // =========================================================

    // 초대코드 생성
    // 현재 방 기준으로 초대 링크와 코드를 만들고 roomAccess 권한 흐름과 연결한다.
    async function hmGetFirebaseServerNow() {
        try {
            const offsetSnap = await db.ref('.info/serverTimeOffset').once('value');
            const offset = Number(offsetSnap.val());
            return Date.now() + (Number.isFinite(offset) ? offset : 0);
        } catch (error) {
            console.warn('[HearMe2nite Invite] 서버 시간 보정값을 불러오지 못해 기기 시간을 사용합니다.');
            return Date.now();
        }
    }

    // 과거 버전에서 Room 멤버십은 생성됐지만 rooms/{roomCode}/meta 저장이
    // 권한 오류로 누락된 방을 초대 전에 안전하게 복구한다.
    async function hmEnsureRoomOwnerMeta(roomCode) {
        const metaRef = db.ref(`rooms/${roomCode}/meta`);
        const metaSnap = await metaRef.once('value');
        const meta = metaSnap.val() || {};
        if (meta.ownerUid === currentUser.uid) return meta;
        if (metaSnap.exists() && meta.ownerUid && meta.ownerUid !== currentUser.uid) {
            throw new Error('Room owner metadata does not match the current owner.');
        }
        const memberSnap = await db.ref(`roomMembers/${roomCode}/${currentUser.uid}`).once('value');
        const member = memberSnap.val() || {};
        if (member.role !== 'owner') throw new Error('Current user is not the Room owner.');
        const repairedMeta = {
            ownerUid: currentUser.uid,
            ownerEmail: normalizeEmail(currentUser.email),
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            app: 'hearme2nite'
        };
        await metaRef.set(repairedMeta);
        console.info('[HearMe2nite Invite] repaired missing Room owner metadata', roomCode);
        return repairedMeta;
    }

    async function createInviteCode() {
        if (!currentUser) { alert('먼저 로그인해 주세요.'); return; }
        if (!activeRoomCode) { alert('먼저 내 방을 만들거나 기존 방에 연결해 주세요.'); return; }
        const allowed = await hmRequireRoomAccess('초대코드 생성', activeRoomCode);
        if (!allowed) { alert('현재 방의 초대코드를 만들 권한이 없습니다.'); return; }
        const myRole = await getCurrentUserRoomRole(activeRoomCode);
        if (myRole !== 'owner') {
            alert('초대코드는 방을 만든 사람만 생성할 수 있습니다.');
            return;
        }

        try {
            await hmEnsureRoomOwnerMeta(activeRoomCode);
        } catch (metaError) {
            console.error('[HearMe2nite Invite] owner metadata repair failed', metaError);
            alert('방 소유자 정보를 복구하지 못해 초대코드를 만들 수 없습니다. 최신 보안 규칙을 배포한 뒤 다시 시도해 주세요.');
            return;
        }

        const partnerSnap = await db.ref(`rooms/${activeRoomCode}/meta/partnerUid`).once('value');
        if (partnerSnap.exists()) {
            alert('이미 상대방이 연결된 방입니다. 새 초대코드를 만들 수 없습니다.');
            return;
        }

        let code = randomCode(8);
        let tries = 0;
        while ((await db.ref(`invites/${code}`).once('value')).exists() && tries < 5) {
            code = randomCode(6);
            tries++;
        }
        if (tries >= 5) { alert('초대코드 생성에 실패했습니다. 다시 시도해 주세요.'); return; }

        const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${code}`;
        try {
            const serverNow = await hmGetFirebaseServerNow();
            await db.ref(`invites/${code}`).set({
                roomCode: activeRoomCode,
                ownerUid: currentUser.uid,
                ownerEmail: normalizeEmail(currentUser.email),
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                expiresAt: serverNow + HM_INVITE_TTL_MS,
                used: false
            });
            const expiresAt = serverNow + HM_INVITE_TTL_MS;
            const expiresLabel = hmFormatInviteExpiry(expiresAt);
            const box = document.getElementById('inviteResult');
            box.style.display = 'block';
            box.innerHTML = `
                <strong>초대코드:</strong> <span style="font-size:1.1rem; color:#ff7675; font-weight:bold;">${code}</span><br>
                <strong>유효기간:</strong> 생성 후 ${HM_INVITE_TTL_LABEL}<br>
                <strong>만료 예정:</strong> ${escapeHtml(expiresLabel)}<br>
                <strong>초대링크:</strong><br>${escapeHtml(inviteLink)}<br>
                <div style="margin-top:7px; color:#636e72; font-size:0.8rem;">※ 코드가 만료되면 새 초대코드를 만들어 주세요.</div>
                <button type="button" class="btn-copy" style="padding:8px; font-size:0.85rem; margin-top:8px;" onclick="copyInviteText('${code}', '${inviteLink}', ${expiresAt})">📋 초대문구 복사하기</button>
            `;
            showSaveStatus('🎟️ 초대코드 생성 완료');
        } catch (err) {
            console.error(err);
            alert('초대코드 생성에 실패했습니다. Firebase Rules에 invites 권한이 필요합니다.');
            showSaveStatus('❌ 초대코드 생성 실패');
        }
    }

    // =========================================================

    // MODULE: INVITE / COPY TEXT

    // Split-ready target: copyInviteText

    // =========================================================
    function hmFormatInviteExpiry(expiresAt) {
        const date = new Date(Number(expiresAt));
        if (Number.isNaN(date.getTime())) return '생성 후 24시간';
        try {
            return new Intl.DateTimeFormat('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            }).format(date);
        } catch (error) {
            return date.toLocaleString('ko-KR');
        }
    }

    function copyInviteText(code, link, expiresAt) {
        const expiryText = hmFormatInviteExpiry(expiresAt);
        const text = `HearMe2nite 초대코드: ${code}
초대링크: ${link}
유효기간: 생성 후 ${HM_INVITE_TTL_LABEL}
만료 예정: ${expiryText}

HearMe2nite 계정으로 로그인한 뒤 초대코드를 입력하면 같은 공간을 사용할 수 있어요.
이미 다른 방에 연결되어 있어도 이 초대코드로 새 방으로 이동할 수 있어요.
코드가 만료되면 방 주인에게 새 코드를 요청해 주세요.`;
        executeCopy(text);
    }

    // =========================================================

    // MODULE: INVITE / ACCEPT PENDING

    // Split-ready target: acceptPendingInviteIfAny

    // =========================================================

    async function acceptPendingInviteIfAny() {
        const pending = (sessionStorage.getItem('pendingInviteCode') || '').trim().toUpperCase();
        if (!pending || !currentUser) return;
        await acceptInviteCodeValue(pending, true);
    }

    async function acceptInviteFromInput() {
        const code = (document.getElementById('inviteCodeInput').value || '').trim().toUpperCase();
        if (!code) { alert('초대코드를 입력해 주세요.'); return; }
        await acceptInviteCodeValue(code, false);
    }

    // 초대코드 수락 핵심 함수
    // 입력/URL에서 들어온 코드를 검증하고 roomMembers에 현재 사용자를 등록한다.
    // 주의: 기존 사용자 데이터가 다른 방에 섞이지 않도록 activeRoom 저장 순서를 유지한다.
    async function acceptInviteCodeValue(code, fromPending) {
        if (!currentUser) {
            sessionStorage.setItem('pendingInviteCode', code);
            alert('먼저 HearMe2nite 계정으로 로그인하거나 회원가입해 주세요. 로그인 후 초대 참여가 진행됩니다.');
            return;
        }
        if (!pendingRelationshipRole && !activeRelationshipRole) {
            alert('초대코드로 참여하기 전에 관리(Dom) 또는 기록(Sub) 역할을 선택해 주세요.');
            return;
        }
        if (!/^[A-Z0-9]{5,10}$/.test(code)) {
            alert('초대코드 형식이 올바르지 않습니다.');
            return;
        }

        if (activeRoomCode) {
            const ok = confirm('현재 연결된 방이 있습니다. 이 초대코드의 방으로 기본 방을 변경할까요?');
            if (!ok) return;
        }

        showSaveStatus('🤝 초대코드 확인 중...');
        try {
            const inviteRef = db.ref(`invites/${code}`);
            const initialSnap = await inviteRef.once('value');
            if (!initialSnap.exists()) {
                if (fromPending) sessionStorage.removeItem('pendingInviteCode');
                alert('존재하지 않는 초대코드입니다.');
                showSaveStatus('❌ 초대코드 없음');
                return;
            }

            const initialInvite = initialSnap.val() || {};
            if (!initialInvite.roomCode || !initialInvite.ownerUid) {
                alert('초대코드 정보가 올바르지 않습니다.');
                showSaveStatus('❌ 초대코드 오류');
                return;
            }
            if (initialInvite.ownerUid === currentUser.uid) {
                if (fromPending) sessionStorage.removeItem('pendingInviteCode');
                alert('내가 만든 초대코드는 같은 계정으로 수락할 수 없습니다. 상대방 계정으로 로그인한 뒤 수락해 주세요.');
                showSaveStatus('ℹ️ 상대방 계정에서 수락 필요');
                return;
            }
            if (initialInvite.used && initialInvite.usedByUid !== currentUser.uid) {
                if (fromPending) sessionStorage.removeItem('pendingInviteCode');
                alert('이미 다른 사용자가 사용한 초대코드입니다. 방 주인에게 새 초대코드를 요청해 주세요.');
                showSaveStatus('🔒 이미 사용된 초대코드');
                return;
            }
            const serverNow = await hmGetFirebaseServerNow();
            if (!initialInvite.used && initialInvite.expiresAt && serverNow > initialInvite.expiresAt) {
                if (fromPending) sessionStorage.removeItem('pendingInviteCode');
                alert('초대코드의 24시간 유효기간이 만료되었습니다. 방 주인에게 새 초대코드를 요청해 주세요.');
                showSaveStatus('🔒 만료된 초대코드');
                return;
            }

            const roomCode = initialInvite.roomCode;
            const myEmail = normalizeEmail(currentUser.email);

            // STEP5.6.4.6.9: 초대 코드 귀속을 트랜잭션 콜백이 아닌 서버 검증 update로 처리한다.
            // RTDB Rules가 used=false → true 전환을 단 한 번만 허용하므로 동시에 여러 계정이 시도해도 한 계정만 성공한다.
            // 같은 계정이 앞선 시도에서 코드 귀속만 완료하고 멤버십 생성에 실패한 경우에는 재시도를 계속 허용한다.
            let claimedInvite = initialInvite;
            if (!initialInvite.used) {
                try {
                    await inviteRef.update({
                        used: true,
                        usedByUid: currentUser.uid,
                        usedByEmail: myEmail,
                        // 클라이언트 시계가 틀려도 만료 판정이 어긋나지 않도록
                        // 실제 저장 시각은 RTDB 서버 타임스탬프를 사용한다.
                        usedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                } catch (claimError) {
                    // 다른 요청이 먼저 처리되었을 수 있으므로 서버 상태를 다시 읽어 현재 계정의 귀속인지 확인한다.
                    const latestClaimSnap = await inviteRef.once('value');
                    const latestClaim = latestClaimSnap.val() || {};
                    if (latestClaim.usedByUid !== currentUser.uid || normalizeEmail(latestClaim.usedByEmail) !== myEmail) {
                        if (fromPending) sessionStorage.removeItem('pendingInviteCode');
                        console.error('[HearMe2nite Invite] claim rejected', claimError);
                        const claimCode = String(claimError && claimError.code || '').toLowerCase();
                        if (claimCode.includes('permission')) {
                            alert('초대코드는 유효하지만 서버에서 수락 권한을 확인하지 못했습니다. 보안 규칙을 최신 버전으로 배포한 뒤 다시 시도해 주세요.');
                            showSaveStatus('🔐 초대 수락 권한 확인 필요');
                        } else {
                            alert('초대코드 수락 중 연결 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
                            showSaveStatus('⚠️ 초대 수락 연결 오류');
                        }
                        return;
                    }
                }

                const claimedSnap = await inviteRef.once('value');
                claimedInvite = claimedSnap.val() || {};
            }

            if (claimedInvite.usedByUid !== currentUser.uid || claimedInvite.usedByEmail !== myEmail || claimedInvite.roomCode !== roomCode || claimedInvite.ownerUid !== initialInvite.ownerUid) {
                if (fromPending) sessionStorage.removeItem('pendingInviteCode');
                alert('이 초대코드는 현재 계정에 사용할 수 없습니다.');
                showSaveStatus('🔒 초대코드 계정 불일치');
                return;
            }

            // 귀속된 초대 코드의 사용자만 Partner 멤버십을 만든다.
            // 재시도 시 기존 멤버십의 joinedAt을 덮어쓰지 않는다.
            const finalRelationshipRole = pendingRelationshipRole || activeRelationshipRole || 'sub';
            const memberRef = db.ref(`roomMembers/${roomCode}/${currentUser.uid}`);
            const existingMemberSnap = await memberRef.once('value');
            if (!existingMemberSnap.exists()) {
                const membershipUpdates = {};
                membershipUpdates[`roomMembers/${roomCode}/${currentUser.uid}`] = {
                    email: myEmail,
                    role: 'partner',
                    relationshipRole: finalRelationshipRole,
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    inviteCode: code
                };
                membershipUpdates[`userRooms/${currentUser.uid}/${roomCode}`] = true;
                membershipUpdates[`users/${currentUser.uid}/activeRoom`] = roomCode;
                membershipUpdates[`users/${currentUser.uid}/email`] = myEmail;
                membershipUpdates[`users/${currentUser.uid}/lastLogin`] = firebase.database.ServerValue.TIMESTAMP;
                membershipUpdates[`users/${currentUser.uid}/relationshipRole`] = finalRelationshipRole;
                await db.ref().update(membershipUpdates);
            } else {
                const existingMember = existingMemberSnap.val() || {};
                if (existingMember.role !== 'partner' || existingMember.inviteCode !== code || normalizeEmail(existingMember.email) !== myEmail) {
                    throw new Error('Existing Room membership does not match the claimed invite.');
                }
                const userUpdates = {};
                userUpdates[`userRooms/${currentUser.uid}/${roomCode}`] = true;
                userUpdates[`users/${currentUser.uid}/activeRoom`] = roomCode;
                userUpdates[`users/${currentUser.uid}/lastLogin`] = firebase.database.ServerValue.TIMESTAMP;
                await db.ref().update(userUpdates);
            }

            // STEP5.6.4.6.9: 기존 Room의 meta 부모 경로는 잠겨 있으므로
            // 허용된 자식 경로를 순서대로 개별 저장한다.
            // partnerEmail Rules가 partnerUid의 서버 저장을 확인하므로 UID를 먼저 기록한다.
            const partnerUidRef = db.ref(`rooms/${roomCode}/meta/partnerUid`);
            await partnerUidRef.set(currentUser.uid);

            const savedPartnerUidSnap = await partnerUidRef.once('value');
            if (savedPartnerUidSnap.val() !== currentUser.uid) {
                throw new Error('Partner UID server verification failed.');
            }

            await db.ref(`rooms/${roomCode}/meta/partnerEmail`).set(myEmail);

            sessionStorage.removeItem('pendingInviteCode');
            const inviteInput = document.getElementById('inviteCodeInput');
            if (inviteInput) inviteInput.value = '';
            activeRoomCode = roomCode;
            activeRoomRole = 'partner';
            activeRelationshipRole = finalRelationshipRole;
            pendingRelationshipRole = finalRelationshipRole;
            const roomInput = document.getElementById('roomCode');
            if (roomInput) roomInput.value = roomCode;
            updateCurrentRoomInfo();
            connectAndListenFirebase();
            hmRefreshPresenceFromRoom('accept-invite');
            showSaveStatus('☁️ 초대 참여 완료');
        } catch (err) {
            console.error('[HearMe2nite Invite]', err);
            alert('초대 참여에 실패했습니다. 초대코드가 만료되지 않았는지 확인한 뒤 다시 시도해 주세요.');
            showSaveStatus('❌ 초대 참여 실패');
        }
    }

    // =========================================================

    // MODULE: ROOM / JOIN ROOM

    // Split-ready target: joinExistingRoomByCode

    // =========================================================

    async function joinExistingRoomByCode() {
        if (!currentUser) { alert('먼저 로그인해 주세요.'); return; }
        if (activeRoomCode && activeRoomRole !== 'owner') {
            alert('초대받은 사용자는 기존 방을 다시 연결하거나 방을 변경할 수 없습니다.');
            return;
        }
        const roomCode = document.getElementById('roomCode').value.trim();
        if (!roomCode) { alert('기존 공유코드를 입력해 주세요.'); return; }
        if (!hmIsSafeRoomCode(roomCode)) {
            alert('공유코드는 영문, 숫자, _ , - 만 사용해서 입력해 주세요.');
            return;
        }
        showSaveStatus('🔗 기존 방 확인 중...');
        try {
            const memberSnap = await db.ref(`roomMembers/${roomCode}/${currentUser.uid}`).once('value');
            if (!memberSnap.exists()) {
                alert('이 계정은 해당 기존 공유코드 방의 멤버가 아닙니다. 방 주인의 초대코드를 받아 참여해 주세요.');
                showSaveStatus('🔒 기존 방 접근 차단');
                return;
            }
            const memberData = memberSnap.val() || {};
            pendingRelationshipRole = memberData.relationshipRole || pendingRelationshipRole || '';
            await saveActiveRoom(roomCode, memberData.role || 'member', memberData.relationshipRole || pendingRelationshipRole);
            connectAndListenFirebase();
            hmRefreshPresenceFromRoom('join-existing-room');
            showSaveStatus('☁️ 기존 공유코드 연결 완료');
        } catch (err) {
            console.error(err);
            alert('기존 공유코드 연결에 실패했습니다.');
            showSaveStatus('❌ 기존 방 연결 실패');
        }
    }

    // =========================================================
