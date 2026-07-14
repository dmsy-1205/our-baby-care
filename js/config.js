// =========================================================
// HearMe2nite RC2 v2.8.0 STEP1
// config.js
// - Firebase 설정 / 앱 참조 / 전역 상태값만 담당
// - Firebase DB Key / Room 구조 / AutoSave 저장 구조 변경 없음
// =========================================================

// =========================================================
    // MODULE 01. CONFIG / GLOBAL STATE
    // 분리 후보: config.js
    // HearMe2nite 단일 Firebase 앱, Auth/DB 참조, 전역 상태값을 관리한다.
    // DB 구조와 key 이름은 절대 변경하지 않는다.
    // =========================================================

    const babyFirebaseConfig = {
        apiKey: "AIzaSyDMVl65SWhqPcxrMY7h_ir7OgPbk7P1LAs",
        authDomain: "our-baby-care.firebaseapp.com",
        databaseURL: "https://our-baby-care-default-rtdb.firebaseio.com",
        projectId: "our-baby-care",
        storageBucket: "our-baby-care.appspot.com",
        messagingSenderId: "564751165",
        appId: "1:564751165:web:12012e95e1240e87e27354"
    };

    const babyApp = firebase.apps.find(app => app.name === 'babyApp') || firebase.initializeApp(babyFirebaseConfig, 'babyApp');

    const babyAuth = firebase.auth(babyApp);
    const db = firebase.database(babyApp);
    const auth = babyAuth;

    let currentUser = null;
    let activeRoomCode = "";
    let activeRoomRole = "";
    let activeRelationshipRole = "";
    let pendingRelationshipRole = "";
    let currentWater = 0;
    let uploadedPhotoBase64 = "";
    let autoSaveTimeout = null;
    let currentRoomRef = null;
    let entireRoomRef = null;
    let currentDayAdminRef = null;
    let entireDayAdminRef = null;
    let cachedDayAdminData = null;
    let chatRef = null;
    let ownerNoteRef = null;
    let ownerNoteSaveTimeout = null;
    let cachedDaysData = null;

    // RC2.7 안정화: Firebase 연결 상태와 과도한 경고 반복을 제어한다.
    let hmIsOnline = navigator.onLine;
    let hmLastErrorMessage = '';
    const HM_MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
    const HM_ROOM_CODE_PATTERN = /^[a-zA-Z0-9_-]{3,60}$/;
    let hmLastPermissionRoomCode = '';
    const HM_AUTOSAVE_DELAY_MS = 900;
    const HM_AUTOSAVE_RETRY_DELAY_MS = 1800;
    let hmIsAutoSaving = false;
    let hmAutoSaveQueued = false;
    let hmLastAutoSaveSignature = '';
    let hmPendingAutoSaveReason = '';
    // RC2.7 STEP5: 최종 안정화 QA 상태
    const HM_APP_VERSION = 'HearMe2nite v1.0 STEP5.8.1';
    const HM_INVITE_TTL_MS = 24 * 60 * 60 * 1000;
    const HM_INVITE_TTL_LABEL = '24시간';
    const hmQaState = {
        bootedAt: new Date().toISOString(),
        checks: [],
        warnings: [],
        errors: []
    };
    let selectedDailyChoice = '';
    let selectedFeedbackType = '';
    let feedbackConfirmed = false;
    let missionLibraryCache = {};
