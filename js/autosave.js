// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// autosave.js - AutoSave / Firebase Listeners
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // MODULE: FIREBASE / LISTENER CLEANUP

    // Split-ready target: disconnectAllListeners

    // =========================================================

    // Firebase listener 정리
    // 로그인 전환/방 변경 시 이전 방의 days/chat/ownerNote 리스너를 반드시 해제한다.

    // =========================================================
    // MODULE 12. AUTOSAVE / FIREBASE LISTENERS
    // 분리 후보: autosave.js
    // 날짜별 기록 listener 연결/해제, 입력값 복원, AutoSave 저장을 담당한다.
    // records/{roomCode}/days/{date} 구조는 변경 금지.
    // =========================================================
    let hmLastAutoSaveHealth = { state: 'idle', roomCode: '', date: '', reason: '', savedAt: 0, error: '' };
    function disconnectAllListeners() {
        if (currentRoomRef) currentRoomRef.off();
        if (entireRoomRef) entireRoomRef.off();
        if (currentDayAdminRef) currentDayAdminRef.off();
        if (entireDayAdminRef) entireDayAdminRef.off();
        if (typeof hmStopCustomRoutineCards === 'function') hmStopCustomRoutineCards();
        if (typeof hmStopSharedThemeListener === 'function') hmStopSharedThemeListener();
        if (chatRef) chatRef.off();
        if (typeof hmChatReadRef !== 'undefined' && hmChatReadRef) hmChatReadRef.off();
        if (typeof hmChatPresenceRef !== 'undefined' && hmChatPresenceRef) hmChatPresenceRef.off();
        if (ownerNoteRef) ownerNoteRef.off();
        currentRoomRef = null;
        entireRoomRef = null;
        currentDayAdminRef = null;
        entireDayAdminRef = null;
        cachedDayAdminData = null;
        chatRef = null;
        if (typeof hmChatReadRef !== 'undefined') hmChatReadRef = null;
        if (typeof hmChatPresenceRef !== 'undefined') hmChatPresenceRef = null;
        ownerNoteRef = null;
        cachedDaysData = null;
        hmLastAutoSaveSignature = '';
        hmAutoSaveQueued = false;
        if (typeof hmRefreshNotificationBar === 'function') setTimeout(hmRefreshNotificationBar, 0);
    }


    // STEP5.6.4.5B-2: 날짜 일반 기록과 Dom/Owner 전용 관리 기록을 논리적으로 분리한다.
    // 기존 days/{date} 안의 관리 필드는 읽기 fallback으로만 유지한다.
    const HM_DAY_ADMIN_FIELDS = ['replyMessage', 'feedbackType', 'feedbackConfirmed', 'dailyChoice', 'dailyChoiceLabel', 'rewardNote', 'domWakeTime', 'domMood', 'domAvailability', 'domSleepTime', 'domTodayMessage'];

    function hmExtractLegacyDayAdmin(record) {
        const source = record || {};
        const result = {};
        HM_DAY_ADMIN_FIELDS.forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = source[key];
        });
        return result;
    }

    function hmMergeDaySecurityRecord(publicRecord, adminRecord) {
        const base = publicRecord && typeof publicRecord === 'object' ? publicRecord : {};
        const legacy = hmExtractLegacyDayAdmin(base);
        const secure = adminRecord && typeof adminRecord === 'object' ? adminRecord : {};
        const merged = Object.assign({}, base, legacy, secure);
        merged.fullText = hmBuildMergedDayReportText(merged);
        return merged;
    }

    function hmBuildRecordCustomRoutineReportText(record) {
        const values = record && record.customCardValues;
        if (!values || typeof values !== 'object') return '';
        const blocks = [];
        Object.entries(values).forEach(([cardId, itemMap]) => {
            if (!itemMap || typeof itemMap !== 'object') return;
            const itemRows = Object.values(itemMap).filter(item => item && typeof item === 'object');
            const savedTitle = itemRows.find(item => item.cardTitle)?.cardTitle || '';
            const cardTitle = (typeof hmCustomCards !== 'undefined' && hmCustomCards?.[cardId]?.title)
                ? hmCustomCards[cardId].title
                : (savedTitle || '오늘의 약속');
            const lines = itemRows
                .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
                .map(item => {
                    let value = item.value;
                    if (item.type === 'checkbox') value = value === true ? '완료' : '미완료';
                    if (value === undefined || value === null || value === '') value = '기록 없음';
                    return `  - ${item.label || '항목'}: ${value}`;
                });
            if (lines.length) blocks.push(`💜 ${cardTitle}:\n${lines.join('\n')}`);
        });
        return blocks.join('\n\n');
    }

    function hmBuildMergedDayReportText(record) {
        const valueOrEmpty = (value) => {
            if (value === undefined || value === null) return '기록 없음';
            const text = String(value).trim();
            return text || '기록 없음';
        };
        const date = valueOrEmpty(record?.date);
        const moodLabel = valueOrEmpty(record?.moodLabel);
        const moodNote = String(record?.moodNote || '').trim();
        const weight = valueOrEmpty(record?.weight);
        const exercise = valueOrEmpty(record?.exercise);
        const water = valueOrEmpty(record?.water);
        const wakeTime = valueOrEmpty(record?.wakeTime);
        const mealBreakfast = valueOrEmpty(record?.mealBreakfast);
        const mealLunch = valueOrEmpty(record?.mealLunch);
        const mealDinner = valueOrEmpty(record?.mealDinner);
        const goingOut = valueOrEmpty(record?.goingOut);
        const recordPhotoCount = typeof hmRecordMomentCount === 'function' ? hmRecordMomentCount(record) : (record?.photo ? 1 : 0);
        const hasPhotoText = recordPhotoCount ? `📷 사진 ${recordPhotoCount}장` : '사진 없음';
        const sleepTime = valueOrEmpty(record?.sleepTime);
        const diary = valueOrEmpty(record?.diary);
        const feedbackTypeLabel = (typeof getFeedbackTypeLabel === 'function' ? getFeedbackTypeLabel(record?.feedbackType || '') : '') || '선택 없음';
        const replyMessage = valueOrEmpty(record?.replyMessage);
        const choiceLabel = record?.dailyChoiceLabel || (typeof getDailyChoiceLabel === 'function' ? getDailyChoiceLabel(record?.dailyChoice || '') : '') || '기록 없음';
        const rewardNote = valueOrEmpty(record?.rewardNote);
        const promiseText = hmBuildRecordCustomRoutineReportText(record);
        const subRoutineText = (typeof hmBuildSubRoutineReportText === 'function') ? hmBuildSubRoutineReportText(record?.subRoutineSnapshot || []) : '';

        const sections = [
            `📅 [${date}] 아가의 하루 기록 💕`
        ];

        // STEP5.7.2: 홈 화면의 큰 구역 순서와 동일하게 정렬합니다.
        // 오늘의 약속 → 오늘의 컨디션 → 오늘의 기록 → 관리와 피드백
        if (promiseText) sections.push(promiseText);
        if (subRoutineText) sections.push(subRoutineText);
        sections.push(
            `😊 오늘의 기분:
  - 기분: ${moodLabel}${moodNote ? `
  - 한마디: ${moodNote}` : ''}`,
            `⚖️ 체중: ${weight}`,
            `🏃 오늘의 운동: ${exercise}`,
            `💧 오늘의 수분: ${water}`,
            `☀️ 기상 시간: ${wakeTime}`,
            `🥗 식사 기록:
  - 아침: ${mealBreakfast}
  - 점심: ${mealLunch}
  - 저녁: ${mealDinner}`,
            `🚶‍♀️ 외출 기록: ${goingOut} (${hasPhotoText})`,
            `🌙 취침 예정: ${sleepTime}`,
            `📝 오늘의 하루:
"${diary}"`,
            `💌 주인의 피드백:
  - 유형: ${feedbackTypeLabel}
  - 확인: ${record?.feedbackConfirmed === true ? '확인 완료' : '미확인'}
  - 한마디: "${replyMessage}"`,
            `🎁 오늘의 선물:
  - 선택: ${choiceLabel}
  - 내용: ${rewardNote}`,
            '오늘도 건강하게 보내줘서 고마워요 단 한 사람 최고 알라뷰❤️'
        );
        return sections.join('\n\n').trim();
    }

    async function hmLoadMergedDayRecord(roomCode, date) {
        const [publicSnap, adminSnap, subRoutineSnapshot] = await Promise.all([
            db.ref(`rooms/${roomCode}/days/${date}`).once('value'),
            db.ref(`rooms/${roomCode}/dayAdmin/${date}`).once('value'),
            (typeof hmLoadSubRoutineSnapshot === 'function') ? hmLoadSubRoutineSnapshot(roomCode, date) : Promise.resolve([])
        ]);
        if (!publicSnap.exists() && !adminSnap.exists() && !subRoutineSnapshot.length) return null;
        const publicRecord = publicSnap.val() || {};
        if (!Array.isArray(publicRecord.subRoutineSnapshot) || !publicRecord.subRoutineSnapshot.length) publicRecord.subRoutineSnapshot = subRoutineSnapshot;
        return hmMergeDaySecurityRecord(publicRecord, adminSnap.val() || {});
    }

    function hmMergeAllDaySecurityRecords(days, dayAdmin) {
        const publicDays = days || {};
        const secureDays = dayAdmin || {};
        const keys = new Set([...Object.keys(publicDays), ...Object.keys(secureDays)]);
        const merged = {};
        keys.forEach((date) => { merged[date] = hmMergeDaySecurityRecord(publicDays[date] || {}, secureDays[date] || {}); });
        return merged;
    }

    // =========================================================

    // MODULE: FIREBASE / CONNECT LISTENERS

    // Split-ready target: connectAndListenFirebase

    // =========================================================

    // 현재 Room 데이터 실시간 연결
    // rooms/{roomCode}/days, chat, ownerNote 등을 구독하고 화면을 갱신한다.
    // 주의: 저장 구조는 기존 rooms/{roomCode}/days/{date} 형태를 유지한다.
    async function connectAndListenFirebase() {
        try {
        const sessionUid = currentUser && currentUser.uid;
        if (!sessionUid) { showSaveStatus('🔒 로그인이 필요합니다.'); return; }
        if (activeRoomCode && activeRelationshipStatus !== 'active') {
            if (typeof hmStartRelationshipStateListener === 'function') hmStartRelationshipStateListener(activeRoomCode);
            if (typeof hmLockProtectedRoomUI === 'function') {
                hmLockProtectedRoomUI(activeRelationshipStatus === 'locked'
                    ? '관계 상태를 확인하지 못해 안전을 위해 데이터를 잠갔습니다.'
                    : '관계가 종료되어 이 공간의 데이터가 잠겼습니다.');
            } else {
                disconnectAllListeners();
                setDataSectionsVisible(false);
                resetProtectedDataUI('관계가 종료되어 이 공간의 데이터가 잠겼습니다.');
            }
            showSaveStatus(activeRelationshipStatus === 'recovery_pending' ? '💞 관계 회복 동의 대기 중' : '🔒 관계 종료 · 데이터 잠김');
            updateCurrentRoomInfo();
            return;
        }
        const roomCode = getRoomCodeForData();
        const date = document.getElementById('recordDate').value;

        if (!hmIsOnline) showSaveStatus('📴 오프라인 상태입니다. 연결되면 다시 동기화됩니다.');

        disconnectAllListeners();
        if (typeof hmStartRelationshipStateListener === 'function') hmStartRelationshipStateListener(roomCode);
        if (!roomCode || !hmIsSafeRoomCode(roomCode)) {
            setDataSectionsVisible(false);
            resetProtectedDataUI();
            showSaveStatus('🔑 방을 만들거나 올바른 초대코드로 참여해 주세요.');
            return;
        }

        const allowed = await hmRequireRoomAccess('방 연결', roomCode);
        if (!currentUser || currentUser.uid !== sessionUid) {
            disconnectAllListeners();
            return;
        }
        if (!allowed) {
            activeRoomCode = '';
            clearRoomInputs();
            setDataSectionsVisible(false);
            resetProtectedDataUI('이 계정은 해당 방에 접근할 수 없습니다.');
            showSaveStatus('🔒 허용되지 않은 방입니다.');
            return;
        }

        activeRoomCode = roomCode;
        activeRoomRole = await getCurrentUserRoomRole(roomCode) || activeRoomRole || 'member';
        if (!currentUser || currentUser.uid !== sessionUid) { disconnectAllListeners(); return; }
        activeRelationshipRole = await getCurrentUserRelationshipRole(roomCode) || activeRelationshipRole || (activeRoomRole === 'owner' ? 'dom' : 'sub');
        if (!currentUser || currentUser.uid !== sessionUid) { disconnectAllListeners(); return; }
        pendingRelationshipRole = activeRelationshipRole;
        updateCurrentRoomInfo();
        setDataSectionsVisible(true);
        showSaveStatus('📡 연결 중...');
        updateOwnerOnlySections();
        listenChat();
        listenOwnerPrivateNote();
        if (typeof hmStartCustomRoutineCards === 'function') hmStartCustomRoutineCards(roomCode);
        if (typeof hmStartSubRoutines === 'function') hmStartSubRoutines(roomCode);

        // STEP5.6.3.6: 기록실을 열지 않아도 Room 연결 직후 대표 기념일을 불러온다.
        // anniversary.js가 autosave.js보다 먼저 로드되지만 connectAndListenFirebase 호출 시점에는
        // 전체 스크립트 로딩이 완료되어 있으므로 여기서 직접 호출하는 것이 가장 안정적이다.
        if (typeof hmLoadAnniversarySettings === 'function') {
            await hmLoadAnniversarySettings();
            if (!currentUser || currentUser.uid !== sessionUid || roomCode !== activeRoomCode) {
                disconnectAllListeners();
                return;
            }
        }

        currentRoomRef = db.ref('rooms/' + roomCode + '/days/' + date);
        currentRoomRef.on('value', (snapshot) => {
            if (roomCode !== activeRoomCode) return;
            const publicRecord = snapshot.val();
            const record = publicRecord ? hmMergeDaySecurityRecord(publicRecord, cachedDayAdminData?.[date] || {}) : null;
            if (record) {
                safeUpdateField('wakeTime', record.wakeTime);
                safeUpdateField('weight', record.weight);
                safeUpdateField('exercise', record.exercise);
                safeUpdateField('mealBreakfast', record.mealBreakfast);
                safeUpdateField('mealLunch', record.mealLunch);
                safeUpdateField('mealDinner', record.mealDinner);
                safeUpdateField('goingOut', record.goingOut);
                safeUpdateField('sleepTime', record.sleepTime);
                safeUpdateField('diary', record.diary);
                safeUpdateField('replyMessage', record.replyMessage);
                selectedFeedbackType = record.feedbackType || '';
                feedbackConfirmed = record.feedbackConfirmed === true;
                if (typeof updateFeedbackTypeButtons === 'function') updateFeedbackTypeButtons();
                safeUpdateField('moodNote', record.moodNote);
                safeUpdateField('rewardNote', record.rewardNote);
                safeUpdateField('domWakeTime', record.domWakeTime);
                safeUpdateField('domMood', record.domMood);
                safeUpdateField('domAvailability', record.domAvailability);
                safeUpdateField('domSleepTime', record.domSleepTime);
                safeUpdateField('domTodayMessage', record.domTodayMessage);
                renderMissions(record.missions);
                if (typeof hmSetCustomRoutineValues === 'function') hmSetCustomRoutineValues(record.customCardValues || {});

                currentWater = parseInt(record.water) || 0;
                const waterDisplay = document.getElementById('waterDisplay');
                if (waterDisplay) waterDisplay.innerText = currentWater;

                selectedDailyChoice = record.dailyChoice || '';
                updateDailyChoiceButtons();
                selectedMood = record.mood || '';
                updateMoodUI();
                updateDailyCards();
                if (typeof hmRefreshNotificationBar === 'function') setTimeout(hmRefreshNotificationBar, 0);

                if (typeof hmSetDailyMoments === 'function') hmSetDailyMoments(record.moments || {}, record.photo || '');
                else if (record.photo) uploadedPhotoBase64 = record.photo;
            } else {
                clearFormFieldsExceptSync();
                if (typeof hmSetCustomRoutineValues === 'function') hmSetCustomRoutineValues({});
            }
            showSaveStatus('☁️ 서버 실시간 동기화 완료');
        }, (err) => {
            hmReportError('currentRoomRef.on', err, hmIsFirebasePermissionError(err) ? '❌ 읽기 권한 없음' : '❌ 기록 읽기 실패');
        });

        currentDayAdminRef = db.ref('rooms/' + roomCode + '/dayAdmin/' + date);
        currentDayAdminRef.on('value', (snapshot) => {
            if (roomCode !== activeRoomCode) return;
            cachedDayAdminData = cachedDayAdminData || {};
            cachedDayAdminData[date] = snapshot.val() || {};
            // 일반 기록 listener의 최신 값과 병합하기 위해 한 번 읽어 화면만 갱신한다.
            db.ref('rooms/' + roomCode + '/days/' + date).once('value').then((publicSnap) => {
                const record = hmMergeDaySecurityRecord(publicSnap.val() || {}, snapshot.val() || {});
                safeUpdateField('replyMessage', record.replyMessage);
                selectedFeedbackType = record.feedbackType || '';
                feedbackConfirmed = record.feedbackConfirmed === true;
                safeUpdateField('rewardNote', record.rewardNote);
                safeUpdateField('domWakeTime', record.domWakeTime);
                safeUpdateField('domMood', record.domMood);
                safeUpdateField('domAvailability', record.domAvailability);
                safeUpdateField('domSleepTime', record.domSleepTime);
                safeUpdateField('domTodayMessage', record.domTodayMessage);
                selectedDailyChoice = record.dailyChoice || '';
                if (typeof updateFeedbackTypeButtons === 'function') updateFeedbackTypeButtons();
                updateDailyChoiceButtons();
                updateDailyCards();
                if (typeof hmRefreshNotificationBar === 'function') setTimeout(hmRefreshNotificationBar, 0);
            }).catch((err) => hmReportError('currentDayAdminRef.merge', err));
        }, (err) => hmReportError('currentDayAdminRef.on', err, hmIsFirebasePermissionError(err) ? '❌ 관리 기록 읽기 권한 없음' : '❌ 관리 기록 읽기 실패'));

                entireRoomRef = db.ref('rooms/' + roomCode + '/days');
        entireRoomRef.on('value', (snapshot) => {
            if (roomCode !== activeRoomCode) return;
            cachedDaysData = snapshot.val() || {};
            displayHistory(hmMergeAllDaySecurityRecords(cachedDaysData, cachedDayAdminData));
            if (typeof hmRefreshNotificationBar === 'function') setTimeout(hmRefreshNotificationBar, 0);
        }, (err) => {
            hmReportError('entireRoomRef.on', err, hmIsFirebasePermissionError(err) ? '❌ 기록실 읽기 권한 없음' : '❌ 기록실 불러오기 실패');
        });

        entireDayAdminRef = db.ref('rooms/' + roomCode + '/dayAdmin');
        entireDayAdminRef.on('value', (snapshot) => {
            if (roomCode !== activeRoomCode) return;
            cachedDayAdminData = snapshot.val() || {};
            displayHistory(hmMergeAllDaySecurityRecords(cachedDaysData, cachedDayAdminData));
            if (typeof hmRefreshNotificationBar === 'function') setTimeout(hmRefreshNotificationBar, 0);
        }, (err) => {
            hmReportError('entireDayAdminRef.on', err, hmIsFirebasePermissionError(err) ? '❌ 관리 기록 읽기 권한 없음' : '❌ 관리 기록실 불러오기 실패');
        });
        } catch (err) {
            hmReportError('connectAndListenFirebase', err, '❌ 방 연결 실패');
            setDataSectionsVisible(false);
        }
    }

    // =========================================================

    // MODULE: AUTOSAVE / SAFE FIELD UPDATE

    // Split-ready target: safeUpdateField

    // =========================================================


    // =========================================================


    // MODULE: AUTOSAVE / TRIGGER

    // Split-ready target: triggerAutoSave

    // =========================================================

    // 자동저장 debounce 진입점
    // 입력 이벤트가 몰려도 Firebase write가 과도하게 발생하지 않도록 지연 저장한다.
    function triggerAutoSave(reason = 'input') {
        hmPendingAutoSaveReason = reason;
        hmLastAutoSaveHealth = { ...hmLastAutoSaveHealth, state: 'pending', reason, error: '' };
        if (!currentUser) { showSaveStatus('🔒 로그인 후 저장됩니다.'); return; }
        const roomCode = getRoomCodeForData();
        if (!roomCode || !hmIsSafeRoomCode(roomCode)) {
            showSaveStatus('🔑 방 연결 후 저장됩니다.');
            return;
        }
        showSaveStatus(hmIsOnline ? '✍️ 입력 중...' : '📴 오프라인 입력 중...');
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(executeAutoSave, HM_AUTOSAVE_DELAY_MS);
    }

    // =========================================================

    // MODULE: AUTOSAVE / EXECUTE

    // Split-ready target: executeAutoSave

    // =========================================================

    // 날짜별 기록 자동저장
    // rooms/{roomCode}/days/{recordDate}에 현재 폼 데이터를 저장한다.
    // 주의: 기존 DB Key와 필드명을 바꾸면 과거 기록 호환이 깨진다.

    // =========================================================
    // MODULE 14. REPORT BUILD / SAVE
    // 분리 후보: autosave.js + report.js 선택
    // 현재 폼 상태를 reportText/newRecord로 조립해 날짜별 Firebase 기록으로 저장한다.
    // 결과 텍스트 형식과 저장 key는 기존 사용자 데이터 호환 때문에 유지한다.
    // =========================================================
    // RC2.7 STEP3: AUTOSAVE STABILITY HELPERS
    // - 저장 전 필수 상태를 한 번 더 검증한다.
    // - 같은 내용의 중복 저장을 건너뛰어 Firebase write를 줄인다.
    // - 저장 중 추가 입력이 들어오면 한 번 더 큐에 넣어 마지막 상태를 저장한다.
    // =========================================================
    function hmCanAttemptAutoSave(roomCode, date) {
        if (!currentUser) { showSaveStatus('🔒 로그인 후 저장됩니다.'); return false; }
        if (!roomCode || !hmIsSafeRoomCode(roomCode)) { showSaveStatus('🔑 방 연결 후 저장됩니다.'); return false; }
        if (!date) { showSaveStatus('📅 날짜 선택 후 저장됩니다.'); return false; }
        if (!hmIsOnline) {
            hmAutoSaveQueued = true;
            showSaveStatus('📴 오프라인 상태입니다. 연결 복구 후 저장됩니다.');
            return false;
        }
        return true;
    }

    function hmBuildAutoSaveSignature(record) {
        try {
            return JSON.stringify({
                date: record.date,
                wakeTime: record.wakeTime,
                water: record.water,
                weight: record.weight,
                exercise: record.exercise,
                mealBreakfast: record.mealBreakfast,
                mealLunch: record.mealLunch,
                mealDinner: record.mealDinner,
                goingOut: record.goingOut,
                sleepTime: record.sleepTime,
                diary: record.diary,
                replyMessage: record.replyMessage,
                feedbackType: record.feedbackType,
                feedbackConfirmed: record.feedbackConfirmed,
                missions: record.missions,
                mood: record.mood,
                moodNote: record.moodNote,
                dailyChoice: record.dailyChoice,
                rewardNote: record.rewardNote,
                domWakeTime: record.domWakeTime,
                domMood: record.domMood,
                domAvailability: record.domAvailability,
                domSleepTime: record.domSleepTime,
                domTodayMessage: record.domTodayMessage,
                photo: record.photo ? record.photo.slice(0, 80) + ':' + record.photo.length : '',
                customCardValues: (typeof hmCollectCustomRoutineValues === 'function') ? hmCollectCustomRoutineValues() : {},
                subRoutineSnapshot: (typeof hmCurrentSubRoutineSnapshot === 'function') ? hmCurrentSubRoutineSnapshot() : []
            });
        } catch (err) {
            console.warn('autosave.signature', err);
            return String(Date.now());
        }
    }

    function hmQueueAutoSaveRetry() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(executeAutoSave, HM_AUTOSAVE_RETRY_DELAY_MS);
    }

    function hmIsAutoSaveContextCurrent(context) {
        return !!context && currentUser?.uid === context.uid && getRoomCodeForData() === context.roomCode && activeRoomCode === context.roomCode && (document.getElementById('recordDate')?.value || '') === context.date;
    }

    // =========================================================
    async function executeAutoSave() {
        if (hmIsAutoSaving) {
            hmAutoSaveQueued = true;
            showSaveStatus('⏳ 저장 중... 마지막 입력을 이어서 저장합니다.');
            return;
        }
        try {
        const roomCode = getRoomCodeForData();
        const date = document.getElementById('recordDate')?.value || '';
        const saveContext = { uid: currentUser?.uid || '', roomCode, date };
        if (!hmCanAttemptAutoSave(roomCode, date)) return;
        if (!(await hmRequireRoomAccess('저장', roomCode))) return;
        if (!hmIsAutoSaveContextCurrent(saveContext)) { hmAutoSaveQueued = true; return; }
        hmIsAutoSaving = true;
        hmLastAutoSaveHealth = { state: 'saving', roomCode, date, reason: hmPendingAutoSaveReason || 'input', savedAt: 0, error: '' };

        const wakeTime = document.getElementById('wakeTime').value || '기록 없음';
        const weight = document.getElementById('weight').value || '기록 없음';
        const exercise = document.getElementById('exercise').value || '기록 없음';
        const water = currentWater > 0 ? `${currentWater}ML` : '기록 없음';
        const mealBreakfast = document.getElementById('mealBreakfast').value || '기록 없음';
        const mealLunch = document.getElementById('mealLunch').value || '기록 없음';
        const mealDinner = document.getElementById('mealDinner').value || '기록 없음';
        const goingOut = document.getElementById('goingOut').value || '기록 없음';
        const sleepTime = document.getElementById('sleepTime').value || '기록 없음';
        const diary = document.getElementById('diary').value || '기록 없음';
        const replyMessageRaw = document.getElementById('replyMessage').value || '';
        const replyMessage = replyMessageRaw ? replyMessageRaw.slice(0, 1000) : '기록 없음';
        const feedbackType = selectedFeedbackType || '';
        const feedbackTypeLabel = (typeof getFeedbackTypeLabel === 'function' ? getFeedbackTypeLabel(feedbackType) : '') || '선택 없음';
        const missions = collectMissions();
        const missionSummary = getMissionSummary(missions);
        const missionReport = getMissionReportText(missions);
        const mood = selectedMood || '';
        const moodLabel = mood ? MOOD_LABELS[mood] : '기록 없음';
        const moodNote = document.getElementById('moodNote').value || '';
        const dailyChoice = selectedDailyChoice || '';
        const dailyChoiceLabel = getDailyChoiceLabel(dailyChoice);
        const rewardNote = (document.getElementById('rewardNote').value || '').slice(0, 1000);
        const domWakeTime = document.getElementById('domWakeTime')?.value || '';
        const domMood = document.getElementById('domMood')?.value || '';
        const domAvailability = document.getElementById('domAvailability')?.value || '';
        const domSleepTime = document.getElementById('domSleepTime')?.value || '';
        const domTodayMessage = (document.getElementById('domTodayMessage')?.value || '').slice(0, 300);
        const currentPhotoCount = Array.isArray(hmDailyMoments) ? hmDailyMoments.filter((item) => !item?.mealType).length : (uploadedPhotoBase64 ? 1 : 0);
        const hasPhotoText = currentPhotoCount ? `📷 사진 ${currentPhotoCount}장` : '사진 없음';
        const customRoutineReport = (typeof hmBuildCustomRoutineReportText === 'function') ? hmBuildCustomRoutineReportText() : '';
        const customCardValues = (typeof hmCollectCustomRoutineValues === 'function') ? hmCollectCustomRoutineValues() : {};
        const subRoutineSnapshot = (typeof hmCurrentSubRoutineSnapshot === 'function') ? hmCurrentSubRoutineSnapshot() : [];

        const publicReportText = `📅 [${date}] 아가의 하루 기록 💕\n\n` +
                           (customRoutineReport ? `${customRoutineReport}\n\n` : '') +
                           (typeof hmBuildSubRoutineReportText === 'function' && subRoutineSnapshot.length ? `${hmBuildSubRoutineReportText(subRoutineSnapshot)}\n\n` : '') +
                           `😊 오늘의 기분:\n` +
                           `  - 기분: ${moodLabel}${moodNote ? `\n  - 한마디: ${moodNote}` : ''}\n\n` +
                           `⚖️ 체중: ${weight}\n\n` +
                           `🏃 오늘의 운동: ${exercise}\n\n` +
                           `💧 오늘의 수분: ${water}\n\n` +
                           `☀️ 기상 시간: ${wakeTime}\n\n` +
                           `🥗 식사 기록:\n` +
                           `  - 아침: ${mealBreakfast}\n` +
                           `  - 점심: ${mealLunch}\n` +
                           `  - 저녁: ${mealDinner}\n\n` +
                           `🚶‍♀️ 외출 기록: ${goingOut} (${hasPhotoText})\n\n` +
                           `🌙 취침 예정: ${sleepTime}\n\n` +
                           `📝 오늘의 하루:\n"${diary}"`;

        updateDailyCards();

        const publicRecord = {
            date, wakeTime, water: `${currentWater}ML`, weight, exercise,
            mealBreakfast, mealLunch, mealDinner,
            goingOut, sleepTime, diary,
            missions, mood, moodLabel, moodNote, missionSummary,
            customCardValues,
            subRoutineSnapshot,
            photo: uploadedPhotoBase64,
            fullText: publicReportText,
            fullTextPublic: publicReportText,
            updatedBy: currentUser.uid,
            updatedByEmail: currentUser.email,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        const adminRecord = {
            replyMessage, feedbackType, feedbackConfirmed,
            dailyChoice, dailyChoiceLabel, rewardNote,
            domWakeTime, domMood, domAvailability, domSleepTime, domTodayMessage,
            updatedBy: currentUser.uid,
            updatedByEmail: currentUser.email,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        const newRecord = hmMergeDaySecurityRecord(publicRecord, canManageRelationshipCards() ? adminRecord : (cachedDayAdminData?.[date] || {}));

        const signature = hmBuildAutoSaveSignature(newRecord);
        if (signature === hmLastAutoSaveSignature && !hmAutoSaveQueued) {
            showSaveStatus('☁️ 저장됨');
            return;
        }

        await db.ref('rooms/' + roomCode + '/days/' + date).update(publicRecord);
        if (canManageRelationshipCards()) {
            await db.ref('rooms/' + roomCode + '/dayAdmin/' + date).set(adminRecord);
        }
        if (!hmIsAutoSaveContextCurrent(saveContext)) return;
        if (typeof hmRefreshNotificationBar === 'function') setTimeout(hmRefreshNotificationBar, 0);
        hmLastAutoSaveSignature = signature;
        hmAutoSaveQueued = false;
        hmLastAutoSaveHealth = { state: 'saved', roomCode, date, reason: hmPendingAutoSaveReason || 'input', savedAt: Date.now(), error: '' };
        showSaveStatus('☁️ 서버 자동저장 완료');
        } catch (err) {
            hmAutoSaveQueued = true;
            hmLastAutoSaveHealth = { ...hmLastAutoSaveHealth, state: 'error', error: String(err?.message || err || '저장 실패') };
            hmReportError('executeAutoSave', err, hmIsFirebasePermissionError(err) ? '❌ 저장 권한 없음' : '❌ 저장 실패 - 잠시 후 다시 시도합니다.');
            if (!hmIsFirebasePermissionError(err)) hmQueueAutoSaveRetry();
        } finally {
            hmIsAutoSaving = false;
            if (hmAutoSaveQueued && hmIsOnline && currentUser && getRoomCodeForData()) {
                hmAutoSaveQueued = false;
                triggerAutoSave('queued');
            }
        }
    }

    // =========================================================

    // MODULE: AUTOSAVE / STATUS UI

    // Split-ready target: showSaveStatus

    // =========================================================

    function showSaveStatus(msg) {
        if (window.HM_SAVE_STATE) return window.HM_SAVE_STATE.set('', msg);
        const el = document.getElementById('saveStatus');
        if (el) el.innerText = String(msg || '');
    }
    window.hmGetAutoSaveHealth = function hmGetAutoSaveHealth() { return { ...hmLastAutoSaveHealth }; };

    // =========================================================
