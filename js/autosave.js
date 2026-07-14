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
    function disconnectAllListeners() {
        if (currentRoomRef) currentRoomRef.off();
        if (entireRoomRef) entireRoomRef.off();
        if (typeof hmStopCustomRoutineCards === 'function') hmStopCustomRoutineCards();
        if (chatRef) chatRef.off();
        if (typeof hmChatReadRef !== 'undefined' && hmChatReadRef) hmChatReadRef.off();
        if (typeof hmChatPresenceRef !== 'undefined' && hmChatPresenceRef) hmChatPresenceRef.off();
        if (ownerNoteRef) ownerNoteRef.off();
        currentRoomRef = null;
        entireRoomRef = null;
        chatRef = null;
        if (typeof hmChatReadRef !== 'undefined') hmChatReadRef = null;
        if (typeof hmChatPresenceRef !== 'undefined') hmChatPresenceRef = null;
        ownerNoteRef = null;
        cachedDaysData = null;
        hmLastAutoSaveSignature = '';
        hmAutoSaveQueued = false;
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
        const roomCode = getRoomCodeForData();
        const date = document.getElementById('recordDate').value;

        if (!hmIsOnline) showSaveStatus('📴 오프라인 상태입니다. 연결되면 다시 동기화됩니다.');

        disconnectAllListeners();
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
            const record = snapshot.val();
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

                if (record.photo) {
                    uploadedPhotoBase64 = record.photo;
                    document.getElementById('photoPreview').src = record.photo;
                    document.getElementById('previewBox').style.display = 'block';
                } else {
                    removePhotoUI();
                }
            } else {
                clearFormFieldsExceptSync();
                if (typeof hmSetCustomRoutineValues === 'function') hmSetCustomRoutineValues({});
            }
            showSaveStatus('☁️ 서버 실시간 동기화 완료');
        }, (err) => {
            hmReportError('currentRoomRef.on', err, hmIsFirebasePermissionError(err) ? '❌ 읽기 권한 없음' : '❌ 기록 읽기 실패');
        });

        entireRoomRef = db.ref('rooms/' + roomCode + '/days');
        entireRoomRef.on('value', (snapshot) => {
            if (roomCode !== activeRoomCode) return;
            cachedDaysData = snapshot.val();
            displayHistory(cachedDaysData);
        }, (err) => {
            hmReportError('entireRoomRef.on', err, hmIsFirebasePermissionError(err) ? '❌ 기록실 읽기 권한 없음' : '❌ 기록실 불러오기 실패');
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
                photo: record.photo ? record.photo.slice(0, 80) + ':' + record.photo.length : '',
                customCardValues: (typeof hmCollectCustomRoutineValues === 'function') ? hmCollectCustomRoutineValues() : {}
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
        if (!hmCanAttemptAutoSave(roomCode, date)) return;
        if (!(await hmRequireRoomAccess('저장', roomCode))) return;
        hmIsAutoSaving = true;

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
        const hasPhotoText = uploadedPhotoBase64 ? '📷 사진 첨부 완료' : '사진 없음';
        const customRoutineReport = (typeof hmBuildCustomRoutineReportText === 'function') ? hmBuildCustomRoutineReportText() : '';
        const customCardValues = (typeof hmCollectCustomRoutineValues === 'function') ? hmCollectCustomRoutineValues() : {};

        const reportText = `📅 [${date}] 아가의 하루 기록 💕\n\n` +
                           `☀️ 기상 시간: ${wakeTime}\n` +
                           `💧 물 마시기: ${water}\n` +
                           `🏃 운동: ${exercise}\n` +
                           `⚖️ 몸무게: ${weight}\n\n` +
                           `🥗 식사 기록:\n` +
                           `  - 아침: ${mealBreakfast}\n` +
                           `  - 점심: ${mealLunch}\n` +
                           `  - 저녁: ${mealDinner}\n\n` +
                           `🚶‍♀️ 외출 여부: ${goingOut} (${hasPhotoText})\n` +
                           `🌙 취침 예정: ${sleepTime}\n\n` +
                           `📝 오늘의 한 줄:\n"${diary}"\n\n` +
                           `💌 주인의 피드백:
  - 유형: ${feedbackTypeLabel}
  - 확인: ${feedbackConfirmed ? '확인 완료' : '미확인'}
  - 한마디: "${replyMessage}"

` +
                           `🎁 오늘의 선물:
` +
                           `  - 선택: ${dailyChoiceLabel}
` +
                           `  - 내용: ${rewardNote || '기록 없음'}` +
                           customRoutineReport + `

` +
                           `오늘도 건강하게 보내줘서 고마워요 단 한 사람 최고 알라뷰❤️`;

        updateDailyCards();

        const newRecord = {
            date, wakeTime, water: `${currentWater}ML`, weight, exercise,
            mealBreakfast, mealLunch, mealDinner,
            goingOut, sleepTime, diary, replyMessage, feedbackType, feedbackConfirmed,
            missions, mood, moodLabel, moodNote, missionSummary,
            customCardValues,
            dailyChoice, dailyChoiceLabel, rewardNote,
            photo: uploadedPhotoBase64, fullText: reportText,
            updatedBy: currentUser.uid,
            updatedByEmail: currentUser.email,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        const signature = hmBuildAutoSaveSignature(newRecord);
        if (signature === hmLastAutoSaveSignature && !hmAutoSaveQueued) {
            showSaveStatus('☁️ 저장됨');
            return;
        }

        await db.ref('rooms/' + roomCode + '/days/' + date).set(newRecord);
        hmLastAutoSaveSignature = signature;
        hmAutoSaveQueued = false;
        showSaveStatus('☁️ 서버 자동저장 완료');
        } catch (err) {
            hmAutoSaveQueued = true;
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
        const el = document.getElementById('saveStatus');
        if (el) el.innerText = msg;
    }

    // =========================================================


