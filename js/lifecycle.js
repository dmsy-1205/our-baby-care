// STEP A12.3: user dormancy gate and self-service restore.
// No records or Room links are deleted by this module.
(function () {
    function ensureDormantScreen() {
        let overlay = document.getElementById('hmDormantOverlay');
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'hmDormantOverlay';
        overlay.className = 'hm-dormant-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'hmDormantTitle');
        overlay.innerHTML = `
            <section class="hm-dormant-card">
                <div class="hm-dormant-icon" aria-hidden="true">☾</div>
                <p class="hm-dormant-kicker">DATA SAFE MODE</p>
                <h1 id="hmDormantTitle">계정이 휴면 상태입니다</h1>
                <p>오랫동안 사용하지 않아 앱 이용만 잠시 멈춰 두었습니다. 기존 Room과 기록은 삭제되지 않고 안전하게 보관되어 있습니다.</p>
                <div class="hm-dormant-notice"><strong>다시 사용하기</strong><span>아래 버튼을 누르면 즉시 활성화되고 기존 화면으로 돌아갑니다.</span></div>
                <button type="button" class="hm-dormant-restore" id="hmDormantRestore">내 계정 복원하기</button>
                <button type="button" class="hm-dormant-logout" id="hmDormantLogout">로그아웃</button>
                <p class="hm-dormant-safe">자동 삭제 기능은 현재 꺼져 있습니다.</p>
            </section>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    async function restoreAccount(user, button) {
        button.disabled = true;
        button.textContent = '복원하고 있습니다…';
        try {
            const now = firebase.database.ServerValue.TIMESTAMP;
            await db.ref(`users/${user.uid}/lifecycle`).update({
                status: 'active', restoredAt: now, updatedAt: now,
                dormantAt: null, reason: null, archivedRoomCodes: null
            });
            window.location.reload();
        } catch (error) {
            console.error('[A12.3] account restore failed', error);
            button.disabled = false;
            button.textContent = '내 계정 복원하기';
            if (typeof showToast === 'function') showToast('계정 복원에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            else window.alert('계정 복원에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
    }

    window.hmHandleLifecycleOnLogin = async function (user) {
        if (!user || typeof db === 'undefined') return true;
        try {
            const snapshot = await db.ref(`users/${user.uid}/lifecycle`).once('value');
            const lifecycle = snapshot.val() || {};
            if (lifecycle.status !== 'dormant') {
                await db.ref(`users/${user.uid}/lifecycle`).update({
                    status: 'active', lastLoginAt: firebase.database.ServerValue.TIMESTAMP,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                return true;
            }

            const overlay = ensureDormantScreen();
            document.body.classList.add('hm-dormant-locked');
            overlay.hidden = false;
            document.getElementById('authBox')?.classList.add('is-hidden');
            const appContent = document.getElementById('appContent');
            if (appContent) appContent.style.display = 'none';
            overlay.querySelector('#hmDormantRestore').onclick = (event) => restoreAccount(user, event.currentTarget);
            overlay.querySelector('#hmDormantLogout').onclick = async () => {
                await babyAuth.signOut();
                window.location.reload();
            };
            return false;
        } catch (error) {
            console.error('[A12.3] lifecycle status check failed', error);
            return true;
        }
    };
})();
