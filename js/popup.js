// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// popup.js - Popup / Modal
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    let hmRoomModalScrollY = 0;
    let hmOpenModalCount = 0;
    const hmModalReturnFocus = new WeakMap();

    // =========================================================

    // MODULE: POPUP / MODAL BODY LOCK

    // Split-ready target: lockBodyForModal

    // =========================================================

    // 공통 팝업 스크롤 잠금
    // 여러 팝업이 겹칠 수 있으므로 body lock count 방식으로 관리한다.

    // =========================================================
    // MODULE 04. POPUP CORE
    // 분리 후보: popup.js
    // 공통 모달 열기/닫기, body scroll lock, overlay body 부착을 담당한다.
    // modal-sm/md/lg/xl 디자인 시스템과 중앙 정렬 구조를 유지한다.
    // =========================================================
    function lockBodyForModal() {
        if (hmOpenModalCount === 0) {
            hmRoomModalScrollY = window.scrollY || document.documentElement.scrollTop || 0;
            document.body.classList.add('hm-modal-open');
            document.body.style.top = `-${hmRoomModalScrollY}px`;
        }
        hmOpenModalCount += 1;
    }

    function unlockBodyForModal(force = false) {
        hmOpenModalCount = force ? 0 : Math.max(0, hmOpenModalCount - 1);
        if (hmOpenModalCount === 0) {
            document.body.classList.remove('hm-modal-open');
            document.body.style.top = '';
            window.scrollTo(0, hmRoomModalScrollY || 0);
        }
    }

    function hmEnsureOverlayAttachedToBody(overlay) {
        // RC2 v2.5.3: fixed overlay가 app container 폭에 갇히지 않도록 body 직속으로 이동
        if (!overlay || overlay.parentElement === document.body) return;
        document.body.appendChild(overlay);
    }

    // 공통 팝업 열기 헬퍼
    // daily/room/history/mission 계열 팝업을 동일한 방식으로 중앙 정렬한다.
    function openModalOverlayById(id) {
        const overlay = document.getElementById(id);
        if (!overlay) {
            console.warn('[HM Popup] overlay not found:', id);
            return;
        }
        hmEnsureOverlayAttachedToBody(overlay);
        const active = document.activeElement;
        if (active && active !== document.body && !overlay.contains(active)) {
            hmModalReturnFocus.set(overlay, active);
        }
        if (overlay.style.display !== 'flex') lockBodyForModal();
        overlay.removeAttribute('inert');
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
        overlay.dataset.hmOpenedAt = String(Date.now());
        hmFocusFirstModalControl(overlay);
    }

    function closeModalOverlayById(id) {
        const overlay = document.getElementById(id);
        if (!overlay) return;

        // 포커스가 모달 내부에 남은 상태에서 aria-hidden을 적용하면
        // Chrome이 접근성 경고를 발생시키므로 먼저 외부로 이동한다.
        const active = document.activeElement;
        const returnTarget = hmModalReturnFocus.get(overlay);
        if (active && overlay.contains(active)) {
            if (returnTarget && returnTarget.isConnected && typeof returnTarget.focus === 'function') {
                try { returnTarget.focus({ preventScroll: true }); } catch (err) { returnTarget.focus(); }
            } else if (typeof active.blur === 'function') {
                active.blur();
            }
        }

        if (overlay.style.display === 'flex') unlockBodyForModal();
        overlay.style.display = 'none';
        overlay.setAttribute('inert', '');
        overlay.setAttribute('aria-hidden', 'true');
        hmModalReturnFocus.delete(overlay);
        delete overlay.dataset.hmOpenedAt;
    }

    function hmFocusFirstModalControl(overlay) {
        // RC2.7 STEP4: 모바일/데스크톱 공통 팝업 사용성 보강
        // 입력형 팝업은 자동 포커스로 키보드가 갑자기 올라오지 않도록 닫기/버튼 중심으로만 포커스한다.
        if (!overlay) return;
        requestAnimationFrame(() => {
            const target = overlay.querySelector('.modal-close-btn, .guide-close, button:not([disabled])');
            if (target && typeof target.focus === 'function') {
                try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
            }
        });
    }

    function hmCloseTopModal() {
        // 가장 최근에 열린 팝업 1개만 닫는다. 중첩 팝업에서 body lock count가 꼬이지 않게 보호한다.
        const visibleOverlays = Array.from(document.querySelectorAll('.daily-modal-overlay, .room-settings-overlay, .mission-modal-overlay, .guide-modal, .history-panel-overlay, .history-detail-overlay'))
            .filter(overlay => overlay && overlay.style.display === 'flex')
            .sort((a, b) => Number(b.dataset.hmOpenedAt || 0) - Number(a.dataset.hmOpenedAt || 0));
        const top = visibleOverlays[0];
        if (!top) return false;
        closeModalOverlayById(top.id);
        return true;
    }

    // =========================================================

    // MODULE: POPUP / ROOM SETTINGS MODAL

    // Split-ready target: openRoomSettingsModal

    // =========================================================

    function openRoomSettingsModal() {
        openModalOverlayById('roomSettingsOverlay');
    }

    function closeRoomSettingsModal() {
        try { if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch(e) {}
        closeModalOverlayById('roomSettingsOverlay');
    }


    // MODULE: POPUP / DAILY INPUT MODAL


    // Split-ready target: openDailyModal


    // =========================================================


    function hmApplyManagerOnlyModalView(name) {
        if (!['feedback', 'reward'].includes(name)) return;
        const overlay = document.getElementById(`${name}ModalOverlay`);
        const modal = overlay?.querySelector('.daily-modal');
        if (!modal) return;

        const restricted = !canManageRelationshipCards();
        modal.classList.toggle('hm-sub-manager-restricted', restricted);

        let notice = modal.querySelector('.hm-manager-restricted-message');
        if (!notice) {
            notice = document.createElement('div');
            notice.className = 'hm-manager-restricted-message';
            notice.setAttribute('role', 'status');
            notice.innerHTML = '<span aria-hidden="true">🔒</span><strong>관리자가 사용하는 화면입니다.</strong><small>관리(Dom)가 내용을 작성하면 홈 카드와 기록실에서 확인할 수 있습니다.</small>';
            const head = modal.querySelector('.daily-modal-head');
            if (head) head.insertAdjacentElement('afterend', notice);
            else modal.prepend(notice);
        }
        notice.hidden = !restricted;
    }

    function openDailyModal(name) {
        hmApplyManagerOnlyModalView(name);
        openModalOverlayById(`${name}ModalOverlay`);
        updateManagedFieldAccessControls();
        updateDailyCards();
    }

    function closeDailyModal(name) {
        closeModalOverlayById(`${name}ModalOverlay`);
        updateDailyCards();
        if (!(['feedback', 'reward'].includes(name) && !canManageRelationshipCards())) {
            triggerAutoSave('daily-modal-save');
        }
    }

    // =========================================================



    // MODULE: MISSION / MODAL

    // Split-ready target: openMissionModal

    // =========================================================

    // 미션 팝업 열기
    // 현재 역할 권한을 반영한 뒤 미션 라이브러리를 로드한다.
    function openMissionModal() {
        openModalOverlayById('missionModalOverlay');
        updateMissionCompactUI();
        updateOwnerOnlySections();
        loadMissionLibrary();
        updateMissionAccessControls();
    }

    function closeMissionModal() {
        closeModalOverlayById('missionModalOverlay');
        updateMissionCompactUI();
    }


    // =========================================================



