// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// app.js - boot / remaining integration code
// =========================================================
// HearMe2nite RC2 v2.8.0 STEP1
// app.js
// - CSS / Config / Utils 분리 후 남은 기존 앱 로직
// - 다음 STEP부터 Popup/Auth/Room 등 기능별 분리 예정
// =========================================================

// =========================================================
    // RC2 v2.6.0 STEP 2: JavaScript Developer Comment Map
    // RC2 v2.6.0 STEP 4: Component-Ready Module Map
    // RC2 v2.7.0 STEP 1: Stability Guard / Error Handling
    // RC2 v2.7.0 STEP 2: Data Protection Guard / Permission QA
    // RC2 v2.7.0 STEP 5: Error Log / Final Stability QA
    // ---------------------------------------------------------
    // 현재 파일은 배포 안정성을 위해 단일 HTML을 유지한다.
    // 단, 아래 JS 영역은 파일 분리 직전 상태처럼 모듈 경계를 명확히 표시한다.
    // 추후 분리 후보:
    // 01 config.js      - Firebase 설정 / 전역 상태 / 날짜 초기화
    // 02 utils.js       - 공통 유틸 / HTML escape / toast / copy
    // 03 auth.js        - 로그인 / 회원가입 / 로그아웃 / 인증 상태
    // 04 room.js        - Room 생성 / 참여 / 초대코드 / 권한 확인
    // 05 role.js        - 관리(Dom) / 기록(Sub) 역할 잠금 및 권한 UI
    // 06 popup.js       - 공통 모달 / 스크롤 잠금 / 카드 팝업
    // 07 daily.js       - 하루 기록 카드 / 식사 / 물 / 사진 / 기분
    // 08 mission.js     - 미션 / 미션함 / 달성률
    // 09 autosave.js    - 날짜별 AutoSave / Firebase listener
    // 10 history.js     - 지난 기록실 / 캘린더 / 상세 팝업
    // 11 chat.js        - 채팅 송수신 / 정렬 / 스크롤
    // 12 boot.js        - 초기 실행 / 이벤트 바인딩 / Motion QA
    // ---------------------------------------------------------
    // ---------------------------------------------------------
    // 목적
    // - 기존 Firebase/Auth/Room/History/AutoSave/Chat/Role 기능 유지
    // - 현재 단일 index.html 내부 JS를 기능별 영역으로 읽을 수 있게 정리
    // - 추후 auth.js / room.js / popup.js / history.js / chat.js / mission.js / autosave.js 분리를 위한 기준선 생성
    //
    // 절대 변경 금지
    // - Firebase DB key / Room 구조 / roomMembers 권한 구조
    // - 기존 사용자 데이터 / 날짜별 저장 구조 / AutoSave 흐름
    // - 로그인 및 초대코드 흐름
    //
    // 이번 STEP 2 적용 범위
    // - 실행 로직 변경 없음
    // - 함수 이동 없음
    // - 핵심 함수별 역할/주의사항 주석 추가
    // - 추후 파일 분리를 위한 데이터 흐름 설명 보강
    // =========================================================

    // =========================================================
    // hearme2nite 1번 사이트 정리본
    // - 공유코드는 브라우저 저장소에 저장하지 않음
    // - 로그인 계정별 users/{uid}/activeRoom 에서만 자동 연결
    // - 기존 rooms/{공유코드}/days 데이터 그대로 사용
    // - roomAccess/{공유코드} ownerEmail / partnerEmail 로 접근 제한
    // - 로그인과 생활관리 데이터 모두 our-baby-care Firebase 사용
    // =========================================================


    // RC2 v2.8.0 STEP1: Config / Global State moved to js/config.js


// RC2.11.1 Mobile Viewport Guard
// 일부 안드로이드/크롬 모바일에서 데스크톱 레이아웃 폭으로 해석되어
// 450px 앱 컨테이너가 작게 중앙 정렬되는 현상을 보정한다.
(function applyHmMobileViewportGuard() {
    const ua = navigator.userAgent || '';
    const isTouchPhone = /Android|iPhone|iPod|Mobile/i.test(ua) || Math.min(screen.width || 9999, screen.height || 9999) <= 600;

    function updateMobileViewportWidth() {
        if (!isTouchPhone || !document.body) return;
        const screenShortSide = Math.min(screen.width || window.innerWidth || 390, screen.height || window.innerHeight || 390);
        const safeWidth = Math.max(320, Math.min(screenShortSide, 480));
        document.documentElement.style.setProperty('--hm-mobile-safe-width', `${safeWidth}px`);
        document.body.classList.add('hm-phone-viewport');
    }

    updateMobileViewportWidth();
    window.addEventListener('resize', updateMobileViewportWidth);
    window.addEventListener('orientationchange', () => setTimeout(updateMobileViewportWidth, 120));
})();

    // App bootstrap
    // - 오늘 날짜를 기본 기록일로 세팅한다.
    // - URL 초대코드를 먼저 감지한 뒤, 로그인 상태에 따라 방 연결을 시도한다.
    // - Firebase listener는 로그인 변경 시 반드시 해제 후 다시 연결한다.
    // v0.10.21: Auth 상태 확정 전 로그인 화면 깜빡임을 방지하기 위해 body.hm-booting 유지
    function hmFinishBooting() {
        document.body.classList.remove('hm-booting');
    }

    window.onload = function() {
        const today = new Date();
        const dateInput = document.getElementById('recordDate');
        dateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        captureInviteFromUrl();
        // 공유코드는 브라우저 저장소에서 불러오지 않습니다. 초대코드는 로그인 전 임시 보관만 합니다.
        clearRoomInputs();
        setDataSectionsVisible(false);
        resetProtectedDataUI();

        babyAuth.onAuthStateChanged(async (user) => {
            try { if (window.hmPresenceStop) window.hmPresenceStop(); } catch(e) { console.warn(e); }
            disconnectAllListeners();
            clearRoomInputs();
            clearFormFieldsExceptSync();
            setDataSectionsVisible(false);
            resetProtectedDataUI();
            currentUser = user;

            if (user) {
                // STEP5.2: 기존 사용자는 그대로 보호하고, 신규 가입 표시가 있는 계정만 이메일 인증을 요구한다.
                const verificationPolicy = await hmGetEmailVerificationPolicy(user);
                if (verificationPolicy.required && !user.emailVerified) {
                    document.body.classList.remove('hm-authenticated');
                    document.getElementById('authBox').classList.remove('is-hidden');
                    document.getElementById('authBox').style.display = 'grid';
                    document.getElementById('appContent').style.display = 'none';
                    showEmailVerificationPanel(user);
                    hmFinishBooting();
                    showSaveStatus('✉️ 이메일 인증이 필요합니다.');
                    return;
                }

                if (verificationPolicy.required && user.emailVerified) {
                    try {
                        const tokenReady = await hmEnsureVerifiedAuthToken(user);
                        if (!tokenReady) {
                            throw new Error('auth/email-verification-token-not-refreshed');
                        }
                        await db.ref(`users/${user.uid}`).update({
                            emailVerified: true,
                            emailVerifiedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    } catch (err) { console.warn('[STEP5.2] 인증 완료 기록 실패:', err); }
                    hmSignupFlowActive = false;
                }

                hideEmailVerificationPanel();
                document.getElementById('authBox').classList.add('is-hidden');
                document.getElementById('authBox').style.display = 'none';
                if (typeof loadUserTheme === 'function') await loadUserTheme();
                if (typeof loadUserProfile === 'function') await loadUserProfile();
                if (typeof hmRefreshDataAdminAccess === 'function') await hmRefreshDataAdminAccess();
                await loadUserActiveRoom();
                await acceptPendingInviteIfAny();
                document.body.classList.add('hm-authenticated');
                document.getElementById('appContent').style.display = 'flex';
                hmFinishBooting();
                await showGuideForFirstLogin();
            } else {
                activeRoomCode = "";
                activeRoomRole = "";
                activeRelationshipRole = "";
                pendingRelationshipRole = "";
                if (typeof hmCurrentNickname !== 'undefined') hmCurrentNickname = '';
                if (typeof hmApplyNicknameToUI === 'function') hmApplyNicknameToUI();
                if (typeof hmRefreshDataAdminAccess === 'function') hmRefreshDataAdminAccess();
                hideEmailVerificationPanel();
                document.body.classList.remove('hm-authenticated');
                document.getElementById('authBox').classList.remove('is-hidden');
                document.getElementById('authBox').style.display = 'grid';
                document.getElementById('appContent').style.display = 'none';
                hmFinishBooting();
                showSaveStatus("🔒 로그인이 필요합니다.");
            }
        });
    };

    // =========================================================


// RC2 v2.8.0 STEP7: module code extracted to external js files.




// RC2 v2.8.0 STEP7: module code extracted to external js files.


    // =========================================================


// RC2 v2.8.0 STEP7: module code extracted to external js files.


    // =========================================================




// RC2 v2.8.0 STEP7: module code extracted to external js files.






// RC2 v2.8.0 STEP7: module code extracted to external js files.

    /* RC2 v2.5.7 Motion + Final UI QA helpers */

    // =========================================================

// RC2 v2.8.0 STEP7: module code extracted to external js files.



// v0.10.10 Home Visibility QA guard - UI only
(function() {
  function syncAuthVisibility() {
    var authBox = document.getElementById('authBox');
    var appContent = document.getElementById('appContent');
    if (!authBox || !appContent) return;
    var loggedIn = appContent.style.display !== 'none' && appContent.offsetParent !== null;
    document.body.classList.toggle('hm-app-ready', loggedIn);
  }
  window.addEventListener('load', syncAuthVisibility);
  setTimeout(syncAuthVisibility, 500);
})();


// STEP5.7.1: 오늘의 약속 중복 카드 제거 및 관리 목록형 UI 적용.
(function hmSyncVisibleAppVersion() {
  function syncVersion() {
    var badge = document.getElementById('appVersionBadge');
    if (badge && typeof HM_APP_VERSION === 'string') {
      badge.textContent = HM_APP_VERSION.replace('HearMe2nite ', 'Version ');
      badge.setAttribute('data-version', HM_APP_VERSION);
    }
    if (typeof HM_APP_VERSION === 'string') document.title = HM_APP_VERSION;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncVersion);
  else syncVersion();
})();

// STEP6.2.12.3: 앱 안 알림 바를 실제 기록/피드백 상태와 연결한다.
(function hmInAppNotificationBar() {
  const READ_STORAGE_PREFIX = 'hm_notification_read_v1';
  let hmCurrentNotificationItems = [];
  let hmOpeningFromNotification = false;

  function $(id) { return document.getElementById(id); }
  function text(value) { return String(value == null ? '' : value).trim(); }
  function isMeaningful(value) {
    const v = text(value);
    if (!v) return false;
    const compact = v.replace(/\s+/g, '').toLowerCase();
    return !['기록없음', '선택없음', '-', '0ml'].includes(compact);
  }
  function getSafeRoomCode() {
    try { return typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : (activeRoomCode || ''); } catch (e) { return ''; }
  }
  function getSelectedDate() { return $('recordDate')?.value || ''; }
  function getReadStorageKey() {
    const uid = currentUser?.uid || 'guest';
    const room = getSafeRoomCode() || 'no-room';
    return `${READ_STORAGE_PREFIX}:${uid}:${room}`;
  }
  function readMap() {
    try { return JSON.parse(localStorage.getItem(getReadStorageKey()) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeRead(signature) {
    if (!signature) return;
    try {
      const map = readMap();
      map[signature] = Date.now();
      localStorage.setItem(getReadStorageKey(), JSON.stringify(map));
    } catch (e) {}
  }
  function markItemsReadByKey(key) {
    if (!key) return;
    try {
      const map = readMap();
      buildItems().forEach((item) => {
        if (item.key === key && item.signature) map[item.signature] = Date.now();
      });
      localStorage.setItem(getReadStorageKey(), JSON.stringify(map));
    } catch (e) {}
    renderNotificationBar();
  }
  function shortDate(date) { return date ? date.slice(5).replace('-', '.') : '오늘'; }
  function recordForDate(date) {
    let publicRecord = {};
    let adminRecord = {};
    try { publicRecord = (window.cachedDaysData || cachedDaysData || {})?.[date] || {}; } catch (e) {}
    try { adminRecord = (window.cachedDayAdminData || cachedDayAdminData || {})?.[date] || {}; } catch (e) {}
    if (typeof hmMergeDaySecurityRecord === 'function') return hmMergeDaySecurityRecord(publicRecord, adminRecord);
    return Object.assign({}, publicRecord, adminRecord);
  }
  function adminRecordForDate(date) {
    try { return (window.cachedDayAdminData || cachedDayAdminData || {})?.[date] || {}; } catch (e) { return {}; }
  }
  function publicRecordForDate(date) {
    try { return (window.cachedDaysData || cachedDaysData || {})?.[date] || {}; } catch (e) { return {}; }
  }
  function updatedByOther(record) {
    if (!record || !currentUser) return false;
    return !record.updatedBy || record.updatedBy !== currentUser.uid;
  }
  function hasWaterRecord(record) {
    return Number(String(record?.water || '').replace(/[^0-9.]/g, '')) > 0;
  }
  function cardWritten(record, key) {
    if (!record || typeof record !== 'object') return false;
    if (key === 'promise') return !!(record.customCardValues && Object.keys(record.customCardValues || {}).length);
    if (key === 'subRoutine') return Array.isArray(record.subRoutineSnapshot) && record.subRoutineSnapshot.length > 0;
    if (key === 'mood') return isMeaningful(record.moodLabel) || isMeaningful(record.mood) || isMeaningful(record.moodNote);
    if (key === 'weight') return isMeaningful(record.weight);
    if (key === 'exercise') return isMeaningful(record.exercise);
    if (key === 'water') return hasWaterRecord(record);
    if (key === 'wake') return isMeaningful(record.wakeTime);
    if (key === 'meal') return isMeaningful(record.mealBreakfast) || isMeaningful(record.mealLunch) || isMeaningful(record.mealDinner);
    if (key === 'outing') return isMeaningful(record.goingOut) || !!record.photo;
    if (key === 'sleep') return isMeaningful(record.sleepTime);
    if (key === 'diary') return isMeaningful(record.diary);
    if (key === 'feedback') return isMeaningful(record.replyMessage) || isMeaningful(record.feedbackType) || record.feedbackConfirmed === true;
    if (key === 'reward') return isMeaningful(record.dailyChoiceLabel) || isMeaningful(record.dailyChoice) || isMeaningful(record.rewardNote);
    return false;
  }
  function makeSignature(type, date, record, fallbackText) {
    const stamp = record?.updatedAt || record?.createdAt || '';
    const author = record?.updatedBy || '';
    const body = text(fallbackText).slice(0, 140);
    return [type, date, stamp, author, body].join('|');
  }
  function pushCardNotification(items, source, card) {
    items.push({
      type: card.open || card.key,
      key: card.key,
      icon: card.icon,
      title: `${source}가 ${card.label} 카드 작성`,
      sub: `${shortDate(card.date)} · ${card.label} 카드를 확인해 보세요`,
      action: '확인',
      signature: makeSignature(card.key, card.date, card.record, `${source}:${card.label}`)
    });
  }
  function buildItems() {
    const date = getSelectedDate();
    const room = getSafeRoomCode();
    if (!currentUser || !room || !date) return [];

    const publicRecord = publicRecordForDate(date);
    const adminRecord = adminRecordForDate(date);
    const canManage = typeof canManageRelationshipCards === 'function' && canManageRelationshipCards();
    const items = [];

    if (canManage && updatedByOther(publicRecord)) {
      [
        { key:'promise', icon:'💜', label:'오늘의 약속', open:'record' },
        { key:'subRoutine', icon:'🌱', label:'나의 루틴', open:'record' },
        { key:'mood', icon:'😊', label:'오늘의 기분', open:'record' },
        { key:'weight', icon:'⚖️', label:'체중', open:'record' },
        { key:'exercise', icon:'🏃', label:'오늘의 운동', open:'record' },
        { key:'water', icon:'💧', label:'오늘의 수분', open:'record' },
        { key:'wake', icon:'☀️', label:'기상 시간', open:'record' },
        { key:'meal', icon:'🥗', label:'식사 기록', open:'record' },
        { key:'outing', icon:'🚶‍♀️', label:'외출 기록', open:'record' },
        { key:'sleep', icon:'🌙', label:'취침 예정', open:'record' },
        { key:'diary', icon:'📝', label:'오늘의 하루', open:'record' }
      ].forEach((card) => {
        if (cardWritten(publicRecord, card.key)) pushCardNotification(items, 'Sub', { ...card, date, record: publicRecord });
      });
    }

    if (!canManage && updatedByOther(adminRecord)) {
      [
        { key:'feedback', icon:'💌', label:'주인의 피드백', open:'feedback' },
        { key:'reward', icon:'🎁', label:'오늘의 선물', open:'reward' }
      ].forEach((card) => {
        if (cardWritten(adminRecord, card.key)) pushCardNotification(items, 'Dom', { ...card, date, record: adminRecord });
      });
    }

    return items;
  }
  function renderNotificationBar() {
    const bar = $('hmNotificationBar');
    if (!bar) return;
    const icon = $('hmNotificationBar')?.querySelector('.hm-notification-icon');
    const title = $('hmNotificationTitle');
    const sub = $('hmNotificationSub');
    const action = $('hmNotificationAction');
    const read = readMap();
    const allItems = buildItems();
    const unreadItems = allItems.filter((item) => !read[item.signature]);
    hmCurrentNotificationItems = unreadItems;
    const item = unreadItems[0];

    bar.classList.toggle('has-unread', unreadItems.length > 0);
    bar.setAttribute('aria-label', unreadItems.length ? `앱 안 알림 ${unreadItems.length}개 보기` : '앱 안 알림 보기');

    if (!getSafeRoomCode()) {
      if (icon) icon.textContent = '🔕';
      if (title) title.textContent = '공간 연결 대기';
      if (sub) sub.textContent = '공간을 연결하면 기록 알림을 보여줘요';
      if (action) action.textContent = '보기';
      return;
    }

    if (!item) {
      if (icon) icon.textContent = '🔕';
      if (title) title.textContent = '새 알림 없음';
      if (sub) sub.textContent = '오늘은 조용해요';
      if (action) action.textContent = '보기';
      return;
    }

    if (icon) icon.textContent = item.icon;
    if (title) title.textContent = unreadItems.length > 1 ? `${item.title} 외 ${unreadItems.length - 1}개` : item.title;
    if (sub) sub.textContent = item.sub;
    if (action) action.textContent = unreadItems.length > 1 ? `${unreadItems.length}개` : item.action;
  }
  function ensureNotificationOverlay() {
    let overlay = $('hmNotificationOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'hmNotificationOverlay';
    overlay.className = 'daily-modal-overlay hm-notification-overlay';
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    overlay.innerHTML = `
      <div class="daily-modal hm-notification-modal" role="dialog" aria-modal="true" aria-labelledby="hmNotificationModalTitle">
        <div class="daily-modal-head">
          <h2 id="hmNotificationModalTitle">🔔 알림</h2>
          <button type="button" class="modal-close-btn" data-hm-notification-close>닫기</button>
        </div>
        <div class="hm-notification-list" id="hmNotificationList"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay || event.target.closest('[data-hm-notification-close]')) closeNotificationOverlay();
      const row = event.target.closest('[data-hm-notification-index]');
      if (!row) return;
      const index = Number(row.dataset.hmNotificationIndex || 0);
      openItem(hmCurrentNotificationItems[index] || null);
    });
    return overlay;
  }
  function closeNotificationOverlay() {
    const overlay = $('hmNotificationOverlay');
    if (!overlay) return;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    overlay.classList.remove('is-open');
    overlay.style.display = 'none';
  }
  function openNotificationOverlay() {
    const overlay = ensureNotificationOverlay();
    const list = $('hmNotificationList');
    if (list) {
      list.innerHTML = hmCurrentNotificationItems.map((item, index) => `
        <button type="button" class="hm-notification-row" data-hm-notification-index="${index}">
          <span>${item.icon}</span>
          <strong>${item.title}</strong>
          <small>${item.sub}</small>
          <em>›</em>
        </button>`).join('');
    }
    overlay.removeAttribute('inert');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-open');
    overlay.style.display = 'flex';
  }
  function openRecordCard(item) {
    const key = item?.key || '';
    if (key === 'promise') {
      const card = $('customRoutineHubCard');
      if (card) return card.click();
      if (typeof openCustomRoutineHub === 'function') return openCustomRoutineHub();
    }
    if (key === 'subRoutine') {
      const card = $('subRoutineHubCard');
      if (card) return card.click();
      if (typeof openSubRoutineHub === 'function') return openSubRoutineHub();
    }
    const dailyKeys = ['mood', 'weight', 'exercise', 'water', 'wake', 'meal', 'outing', 'sleep', 'diary'];
    if (dailyKeys.includes(key) && typeof openDailyModal === 'function') return openDailyModal(key);
    const summaryCard = $('hmProductDashboard');
    if (summaryCard) return summaryCard.click();
    const promise = $('hmTodayPromiseSection');
    if (promise) promise.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function openItem(item) {
    if (!item) {
      if (typeof showToast === 'function') showToast('🔕 지금 확인할 새 알림은 없어요.');
      return;
    }
    writeRead(item.signature);
    closeNotificationOverlay();
    renderNotificationBar();
    hmOpeningFromNotification = true;
    try {
      if (item.type === 'feedback' && typeof openDailyModal === 'function') return openDailyModal('feedback');
      if (item.type === 'reward' && typeof openDailyModal === 'function') return openDailyModal('reward');
      if (item.type === 'record') return openRecordCard(item);
    } finally {
      setTimeout(() => {
        hmOpeningFromNotification = false;
        renderNotificationBar();
      }, 0);
    }
  }

  window.hmRefreshNotificationBar = renderNotificationBar;
  window.hmMarkNotificationCardRead = function hmMarkNotificationCardRead(key) {
    if (hmOpeningFromNotification) return;
    markItemsReadByKey(key);
  };
  window.hmOpenNotificationCenter = function hmOpenNotificationCenter() {
    if (hmCurrentNotificationItems.length > 1) return openNotificationOverlay();
    openItem(hmCurrentNotificationItems[0] || null);
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderNotificationBar();
    $('recordDate')?.addEventListener('change', () => setTimeout(renderNotificationBar, 80));
  });
  window.addEventListener('focus', () => setTimeout(renderNotificationBar, 120));
})();

// STEP6.2.12.14: Use a custom record date picker instead of native date UI.
// Native date inputs differ too much across iPhone/desktop browsers.
(function hmStableRecordDateField() {
  let pickerMonth = '';

  function formatRecordDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : '날짜 선택';
  }

  function localDateToYmd(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getTodayYmd() {
    return localDateToYmd(new Date());
  }

  function normalizeYmd(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : getTodayYmd();
  }

  function monthFromYmd(value) {
    return normalizeYmd(value).slice(0, 7);
  }

  function shiftMonth(ym, diff) {
    const [year, month] = String(ym || getTodayYmd().slice(0, 7)).split('-').map(Number);
    const date = new Date(year, (month || 1) - 1 + diff, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function syncRecordDateDisplay(input) {
    const valueEl = document.getElementById('hmRecordDateDisplayValue');
    if (valueEl) valueEl.textContent = formatRecordDate(input?.value || '');
  }

  function ensureDatePicker() {
    let overlay = document.getElementById('hmRecordDatePickerOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'hmRecordDatePickerOverlay';
    overlay.className = 'hm-record-date-picker-overlay';
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
    overlay.innerHTML = `
      <div class="hm-record-date-picker-card" role="dialog" aria-modal="true" aria-label="기록 날짜 선택">
        <div class="hm-record-date-picker-head">
          <button type="button" data-hm-date-prev aria-label="이전 달">‹</button>
          <strong id="hmRecordDatePickerTitle">날짜 선택</strong>
          <button type="button" data-hm-date-next aria-label="다음 달">›</button>
        </div>
        <div class="hm-record-date-weekdays" aria-hidden="true">
          <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
        </div>
        <div class="hm-record-date-picker-grid" id="hmRecordDatePickerGrid"></div>
        <div class="hm-record-date-picker-actions">
          <button type="button" data-hm-date-today>오늘</button>
          <button type="button" data-hm-date-close>닫기</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (event) => {
      const input = document.getElementById('recordDate');
      if (event.target === overlay || event.target.closest('[data-hm-date-close]')) {
        closePicker();
        return;
      }
      if (event.target.closest('[data-hm-date-prev]')) {
        pickerMonth = shiftMonth(pickerMonth, -1);
        renderPicker(input);
        return;
      }
      if (event.target.closest('[data-hm-date-next]')) {
        pickerMonth = shiftMonth(pickerMonth, 1);
        renderPicker(input);
        return;
      }
      if (event.target.closest('[data-hm-date-today]')) {
        setDateValue(input, getTodayYmd());
        closePicker();
        return;
      }
      const dayButton = event.target.closest('[data-hm-date-value]');
      if (dayButton) {
        setDateValue(input, dayButton.dataset.hmDateValue);
        closePicker();
      }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function renderPicker(input) {
    const selected = normalizeYmd(input?.value || '');
    pickerMonth = pickerMonth || monthFromYmd(selected);
    const [year, month] = pickerMonth.split('-').map(Number);
    const first = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0).getDate();
    const startBlank = first.getDay();
    const title = document.getElementById('hmRecordDatePickerTitle');
    const grid = document.getElementById('hmRecordDatePickerGrid');
    if (title) title.textContent = `${year}.${String(month).padStart(2, '0')}`;
    if (!grid) return;

    const cells = [];
    for (let i = 0; i < startBlank; i += 1) {
      cells.push('<span class="hm-record-date-picker-empty"></span>');
    }
    for (let day = 1; day <= lastDay; day += 1) {
      const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = ymd === selected;
      const isToday = ymd === getTodayYmd();
      cells.push(`
        <button type="button" data-hm-date-value="${ymd}" class="${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}">
          ${day}
        </button>
      `);
    }
    grid.innerHTML = cells.join('');
  }

  function openPicker(input) {
    const overlay = ensureDatePicker();
    pickerMonth = monthFromYmd(input?.value || '');
    renderPicker(input);
    overlay.removeAttribute('inert');
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
  }

  function closePicker() {
    const overlay = document.getElementById('hmRecordDatePickerOverlay');
    if (!overlay) return;
    if (overlay.contains(document.activeElement)) {
      const shell = document.querySelector('.hm-record-date-shell');
      if (shell && typeof shell.focus === 'function') shell.focus();
      else if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
    }
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('inert', '');
  }

  function setDateValue(input, value) {
    if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return;
    input.value = value;
    syncRecordDateDisplay(input);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function initRecordDateDisplay() {
    const input = document.getElementById('recordDate');
    if (!input || input.closest('.hm-record-date-shell')) return;

    const shell = document.createElement('div');
    shell.className = 'hm-record-date-shell';
    shell.setAttribute('role', 'button');
    shell.setAttribute('tabindex', '0');
    shell.setAttribute('aria-label', '기록 날짜 선택');
    shell.innerHTML = `
      <span class="hm-record-date-display-value" id="hmRecordDateDisplayValue">${formatRecordDate(input.value)}</span>
      <span class="hm-record-date-display-icon" aria-hidden="true">📅</span>
    `;

    input.parentNode.insertBefore(shell, input);
    shell.appendChild(input);
    input.classList.add('hm-record-date-native');
    input.setAttribute('aria-label', '기록 날짜');

    shell.addEventListener('click', (event) => {
      event.preventDefault();
      openPicker(input);
    });
    shell.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openPicker(input);
    });
    input.addEventListener('input', () => syncRecordDateDisplay(input));
    input.addEventListener('change', () => syncRecordDateDisplay(input));
    window.addEventListener('load', () => setTimeout(() => syncRecordDateDisplay(input), 0), { once: true });
    setTimeout(() => syncRecordDateDisplay(input), 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRecordDateDisplay, { once: true });
  } else {
    initRecordDateDisplay();
  }
})();
