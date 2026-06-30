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
    // - 로그인 확인은 master-app-platform, 생활관리 데이터는 our-baby-care 사용
    // =========================================================


    // RC2 v2.8.0 STEP1: Config / Global State moved to js/config.js

    // App bootstrap
    // - 오늘 날짜를 기본 기록일로 세팅한다.
    // - URL 초대코드를 먼저 감지한 뒤, 로그인 상태에 따라 방 연결을 시도한다.
    // - Firebase listener는 로그인 변경 시 반드시 해제 후 다시 연결한다.
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
            disconnectAllListeners();
            clearRoomInputs();
            clearFormFieldsExceptSync();
            setDataSectionsVisible(false);
            resetProtectedDataUI();
            currentUser = user;

            if (user) {
                showSaveStatus('🔐 앱 승인 상태 확인 중...');
                const access = await verifyMasterAppAccess({ timeoutMs: 5000 });
                if (!access.approved) {
                    await blockCurrentSession(access.reason || 'NO_APPROVED_ACCESS_RECORD');
                    return;
                }

                document.body.classList.add('hm-authenticated');
                document.getElementById('authBox').classList.add('is-hidden');
                document.getElementById('authBox').style.display = 'none';
                document.getElementById('appContent').style.display = 'flex';
                document.getElementById('userInfoText').innerText = `로그인됨: ${user.email}`;
                await loadUserActiveRoom();
                await acceptPendingInviteIfAny();
                await showGuideForFirstLogin();
            } else {
                activeRoomCode = "";
                activeRoomRole = "";
                activeRelationshipRole = "";
                pendingRelationshipRole = "";
                document.body.classList.remove('hm-authenticated');
                document.getElementById('authBox').classList.remove('is-hidden');
                document.getElementById('authBox').style.display = 'grid';
                document.getElementById('appContent').style.display = 'none';
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
