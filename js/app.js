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
                        await db.ref(`users/${user.uid}`).update({
                            emailVerified: true,
                            emailVerifiedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    } catch (err) { console.warn('[STEP5.2] 인증 완료 기록 실패:', err); }
                    hmSignupFlowActive = false;
                }

                hideEmailVerificationPanel();
                document.body.classList.add('hm-authenticated');
                document.getElementById('authBox').classList.add('is-hidden');
                document.getElementById('authBox').style.display = 'none';
                document.getElementById('appContent').style.display = 'flex';
                hmFinishBooting();
                if (typeof loadUserProfile === 'function') await loadUserProfile();
                if (typeof hmRefreshDataAdminAccess === 'function') await hmRefreshDataAdminAccess();
                await loadUserActiveRoom();
                await acceptPendingInviteIfAny();
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
