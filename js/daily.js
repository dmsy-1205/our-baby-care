// =========================================================
// HearMe2nite RC2 v2.8.0 STEP7
// daily.js - Daily Record / Form
// Extracted from stable RC2.7 final file without DB/Firebase key changes.
// =========================================================

    // MODULE 07. DAILY CARDS / FORM UI
    // 분리 후보: daily.js
    // 하루 기록 카드, 기분, 식사, 물, 사진, 관리 전용 카드 상태를 담당한다.
    // 입력 id와 카드 id는 기존 HTML/Firebase 저장 구조와 연결되어 있으므로 변경 금지.
    // =========================================================
    const MOOD_LABELS = {
        great: '😊 좋음',
        okay: '🙂 괜찮음',
        normal: '😐 보통',
        hard: '😞 힘듦',
        veryHard: '😭 매우 힘듦'
    };
    let selectedMood = '';

    // =========================================================

    // MODULE: MOOD / DAILY MOOD

    // Split-ready target: selectMood

    // =========================================================

    function selectMood(value) {
        selectedMood = selectedMood === value ? '' : value;
        updateMoodUI();
        triggerAutoSave('mood');
    }

    function updateMoodUI() {
        document.querySelectorAll('.mood-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mood === selectedMood);
        });
        updateDailyCards();
    }


    // =========================================================




    // MODULE: DAILY INPUT / FIELD CHANGE

    // Split-ready target: handleDailyFieldChanged

    // =========================================================

    function handleDailyFieldChanged() {
        updateDailyCards();
        triggerAutoSave();
    }

    function hmStructuredTimeConfig(kind) {
        return kind === 'sleep'
            ? { legacy:'sleepTime', period:'sleepPeriod', clock:'sleepClock', note:'sleepTimeNote', preview:'sleepTimePreview', defaultPeriod:'오후' }
            : { legacy:'wakeTime', period:'wakePeriod', clock:'wakeClock', note:'wakeTimeNote', preview:'wakeTimePreview', defaultPeriod:'오전' };
    }
    function hmSyncTimeEntryControlsFromLegacy(kind) {
        const cfg = hmStructuredTimeConfig(kind);
        const legacy = document.getElementById(cfg.legacy);
        const period = document.getElementById(cfg.period);
        const clock = document.getElementById(cfg.clock);
        const note = document.getElementById(cfg.note);
        const preview = document.getElementById(cfg.preview);
        if (!legacy || !period || !clock || !note) return;
        const source = String(legacy.value || '').trim();
        if (legacy.dataset.hmStructuredSource === source) return;
        legacy.dataset.hmStructuredSource = source;
        period.value = cfg.defaultPeriod;
        clock.value = '';
        note.value = '';
        if (!source || source === '기록 없음') { if(preview) preview.textContent=`기록 시간: ${period.value} --:--`; return; }
        const periodMatch = source.match(/(오전|오후|새벽|아침|밤)/);
        const timeMatch = source.match(/(\d{1,2})\s*(?::|시|\.)\s*(\d{1,2})?/);
        if (!timeMatch) { note.value = source; return; }
        let hour = Number(timeMatch[1] || 0);
        const minute = Math.max(0,Math.min(59,Number(timeMatch[2] || 0)));
        let parsedPeriod = periodMatch ? ((periodMatch[1] === '오후' || periodMatch[1] === '밤') ? '오후' : '오전') : '';
        if (hour > 12) { parsedPeriod = '오후'; hour -= 12; }
        if (hour === 0) hour = 12;
        if (!parsedPeriod) parsedPeriod = kind === 'sleep' && hour >= 7 && hour <= 11 ? '오후' : '오전';
        period.value = parsedPeriod;
        clock.value = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
        const trailing = source.slice((timeMatch.index || 0) + timeMatch[0].length).replace(/^[\s·,-]+/,'').trim();
        note.value = trailing;
        if (preview) preview.textContent = `기록 시간: ${period.value} ${clock.value}`;
    }
    function hmHandleStructuredTimeChanged(kind, finalize) {
        const cfg = hmStructuredTimeConfig(kind);
        const legacy = document.getElementById(cfg.legacy);
        const period = document.getElementById(cfg.period);
        const clock = document.getElementById(cfg.clock);
        const note = document.getElementById(cfg.note);
        const preview = document.getElementById(cfg.preview);
        if (!legacy || !period || !clock || !note) return;
        const digits = String(clock.value || '').replace(/\D/g,'').slice(0,4);
        let time = digits.length > 2 ? `${digits.slice(0,-2)}:${digits.slice(-2)}` : digits;
        clock.value = time;
        const match = time.match(/^(\d{1,2}):(\d{2})$/);
        let validTime = '';
        if (match) {
            let hour = Number(match[1]);
            const minute = Number(match[2]);
            if (hour <= 23 && minute <= 59) {
                if (hour > 12) { period.value = '오후'; hour -= 12; }
                if (hour === 0) { period.value = '오전'; hour = 12; }
                validTime = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
                if (finalize) clock.value = validTime;
            }
        }
        if (time && !validTime) {
            if (preview) preview.textContent = `기록 시간: ${period.value} --:--`;
            return;
        }
        const memo = String(note.value || '').trim();
        const value = validTime ? `${period.value} ${validTime}${memo ? ` · ${memo}` : ''}` : memo;
        legacy.value = value;
        legacy.dataset.hmStructuredSource = value;
        if (preview) preview.textContent = `기록 시간: ${period.value} ${validTime || '--:--'}`;
        handleDailyFieldChanged();
    }
    window.hmHandleStructuredTimeChanged = hmHandleStructuredTimeChanged;

    function handleOwnerNoteFieldChanged() {
        updateDailyCards();
        triggerOwnerNoteSave();
    }
    // RC2 v2.8.0 STEP1: getTrimmedValue moved to js/utils.js


    // =========================================================

    // MODULE: DAILY CARD UI

    // Split-ready target: updateDailyCards

    // =========================================================

    // Daily 카드 요약 갱신
    // 실제 입력값은 그대로 두고 카드 subtitle/완료 상태만 최신화한다.
    function updateDailyCards() {
        hmSyncTimeEntryControlsFromLegacy('wake');
        hmSyncTimeEntryControlsFromLegacy('sleep');
        const wakeSub = document.getElementById('wakeCardSub');
        if (wakeSub) {
            const text = getTrimmedValue('wakeTime');
            wakeSub.innerText = text || '아직 입력하지 않았어요.';
        }

        const weightSub = document.getElementById('weightCardSub');
        if (weightSub) {
            const text = getTrimmedValue('weight');
            weightSub.innerText = text || '아직 입력하지 않았어요.';
        }

        const exerciseSub = document.getElementById('exerciseCardSub');
        if (exerciseSub) {
            const text = getTrimmedValue('exercise');
            exerciseSub.innerText = text || '아직 기록하지 않았어요.';
        }

        const waterSub = document.getElementById('waterCardSub');
        if (waterSub) waterSub.innerText = `${currentWater || 0}ML · 눌러서 추가하세요.`;

        const outingSub = document.getElementById('outingCardSub');
        if (outingSub) {
            const text = getTrimmedValue('goingOut');
            const photoCount = Array.isArray(hmDailyMoments) ? hmDailyMoments.filter((item) => !item?.mealType).length : (uploadedPhotoBase64 ? 1 : 0);
            outingSub.innerText = text ? `${text}${photoCount ? ` · 사진 ${photoCount}장` : ''}` : (photoCount ? `오늘의 순간 ${photoCount}장` : '외출 기록과 일상 사진을 남겨보세요.');
        }

        const sleepSub = document.getElementById('sleepCardSub');
        if (sleepSub) {
            const text = getTrimmedValue('sleepTime');
            sleepSub.innerText = text || '아직 입력하지 않았어요.';
        }

        const moodSub = document.getElementById('moodCardSub');
        const moodNoteText = getTrimmedValue('moodNote');
        if (moodSub) {
            const moodLabel = selectedMood ? MOOD_LABELS[selectedMood] : '';
            moodSub.innerText = moodLabel ? `${moodLabel}${moodNoteText ? ' · 메모 있음' : ''}` : '아직 선택하지 않았어요.';
        }

        const mealSub = document.getElementById('mealCardSub');
        if (mealSub) {
            const filled = ['mealBreakfast', 'mealLunch', 'mealDinner'].filter(id => getTrimmedValue(id)).length;
            mealSub.innerText = filled ? `${filled}/3 입력 완료` : '아침 · 점심 · 저녁을 필요할 때 입력하세요.';
        }

        const diarySub = document.getElementById('diaryCardSub');
        if (diarySub) {
            const text = getTrimmedValue('diary');
            diarySub.innerText = text ? (text.length > 28 ? `${text.slice(0, 28)}...` : text) : '오늘 하루를 기록해 보세요.';
        }

        const feedbackSub = document.getElementById('feedbackCardSub');
        if (feedbackSub) {
            const text = getTrimmedValue('replyMessage');
            const typeLabel = getFeedbackTypeLabel(selectedFeedbackType);
            if (feedbackConfirmed && typeLabel) feedbackSub.innerText = `확인 완료 · ${typeLabel}`;
            else if (feedbackConfirmed) feedbackSub.innerText = '오늘의 기록을 확인했어요.';
            else if (typeLabel) feedbackSub.innerText = `${typeLabel}${text ? ' · 한마디 있음' : ''}`;
            else feedbackSub.innerText = text ? (text.length > 28 ? `${text.slice(0, 28)}...` : text) : '아직 피드백이 없습니다.';
        }

        const rewardSub = document.getElementById('rewardCardSub');
        if (rewardSub) {
            const label = selectedDailyChoice ? getDailyChoiceLabel(selectedDailyChoice) : '';
            const note = getTrimmedValue('rewardNote');
            rewardSub.innerText = label ? `${label}${note ? ' · 메모 있음' : ''}` : (note ? (note.length > 28 ? `${note.slice(0, 28)}...` : note) : '작은 보상이나 편안한 휴식을 전해보세요.');
        }

        const feedbackCard = document.getElementById('feedbackDailyCard');
        const rewardCard = document.getElementById('rewardDailyCard');
        const hasFeedbackContent = !!(getTrimmedValue('replyMessage') || selectedFeedbackType || feedbackConfirmed);
        const hasRewardContent = !!(selectedDailyChoice || getTrimmedValue('rewardNote'));
        if (feedbackCard) {
            feedbackCard.classList.toggle('is-filled', hasFeedbackContent);
            feedbackCard.classList.toggle('is-locked', !canManageRelationshipCards());
        }
        if (rewardCard) {
            rewardCard.classList.toggle('is-filled', hasRewardContent);
            rewardCard.classList.toggle('is-locked', !canManageRelationshipCards());
        }
        updateManagedFieldAccessControls();

        const ownerNoteSub = document.getElementById('ownerNoteCardSub');
        if (ownerNoteSub) {
            const note = getTrimmedValue('ownerPrivateNote');
            ownerNoteSub.innerText = note ? (note.length > 28 ? `${note.slice(0, 28)}...` : note) : '주인만 보는 메모를 남겨주세요.';
        }
    }



    // =========================================================



    // MODULE: ROLE / OWNER ONLY UI



    // Split-ready target: updateOwnerOnlySections



    // =========================================================



    function updateOwnerOnlySections() {
        const sections = document.querySelectorAll('.owner-only-section');
        const canManage = canManageRelationshipCards();
        sections.forEach((el) => {
            el.hidden = !canManage;
            el.style.display = canManage ? '' : 'none';
            el.setAttribute('aria-hidden', canManage ? 'false' : 'true');
            el.toggleAttribute('inert', !canManage);
        });
        updateManagedFieldAccessControls();
        if (typeof renderCustomRoutineCards === 'function') renderCustomRoutineCards();
    }

    // 관리 전용 카드 접근 제어
    // 기록(Sub) 사용자가 관리(Dom) 전용 항목을 수정하지 못하도록 UI 입력을 잠근다.
    function updateManagedFieldAccessControls() {
        const canManage = canManageRelationshipCards();
        const replyEl = document.getElementById('replyMessage');
        const rewardEl = document.getElementById('rewardNote');
        const ownerNoteEl = document.getElementById('ownerPrivateNote');
        const rewardBtn = document.getElementById('rewardBtn');
        const restBtn = document.getElementById('restBtn');
        const feedbackLock = document.getElementById('feedbackLockNote');
        const feedbackConfirmedEl = document.getElementById('feedbackConfirmed');
        const feedbackTypeButtons = document.querySelectorAll('[data-feedback-type]');
        const rewardLock = document.getElementById('rewardLockNote');
        [replyEl, rewardEl, ownerNoteEl, rewardBtn, restBtn, feedbackConfirmedEl].forEach((el) => { if (el) el.disabled = !canManage; });
        feedbackTypeButtons.forEach((el) => { el.disabled = !canManage; });
        if (feedbackLock) feedbackLock.style.display = canManage ? 'none' : 'block';
        if (rewardLock) rewardLock.style.display = canManage ? 'none' : 'block';
        updateMissionAccessControls();
    }

    // =========================================================


    function getFeedbackTypeLabel(type) {
        const labels = { praise: '💜 칭찬해요', support: '🌱 응원해요', talk: '💬 이야기해요', together: '🤍 함께할게요' };
        return labels[type] || '';
    }

    function selectFeedbackType(type) {
        if (!canManageRelationshipCards()) { alert('피드백은 관리(Dom)만 작성할 수 있습니다.'); return; }
        selectedFeedbackType = selectedFeedbackType === type ? '' : type;
        updateFeedbackTypeButtons();
        updateDailyCards();
        triggerAutoSave('feedback-type');
    }

    function updateFeedbackTypeButtons() {
        document.querySelectorAll('[data-feedback-type]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.feedbackType === selectedFeedbackType);
        });
        const confirmedEl = document.getElementById('feedbackConfirmed');
        if (confirmedEl && document.activeElement !== confirmedEl) confirmedEl.checked = !!feedbackConfirmed;
    }

    function handleFeedbackConfirmedChanged() {
        if (!canManageRelationshipCards()) return;
        feedbackConfirmed = !!document.getElementById('feedbackConfirmed')?.checked;
        updateDailyCards();
        triggerAutoSave('feedback-confirmed');
    }

    function renderFeedbackReviewStatus() {
        const list = document.getElementById('feedbackReviewList');
        const summary = document.getElementById('feedbackReviewSummary');
        if (!list) return;
        const checks = [
            ['기상 시간', !!getTrimmedValue('wakeTime')],
            ['오늘의 컨디션', !!(selectedMood || getTrimmedValue('moodNote') || getTrimmedValue('exercise') || getTrimmedValue('weight') || currentWater > 0)],
            ['식사 기록', ['mealBreakfast','mealLunch','mealDinner'].some(id => !!getTrimmedValue(id))],
            ['오늘의 순간', !!(getTrimmedValue('goingOut') || uploadedPhotoBase64 || (Array.isArray(hmDailyMoments) && hmDailyMoments.some((item) => !item?.mealType)))],
            ['오늘의 하루', !!getTrimmedValue('diary')]
        ];
        const completed = checks.filter(([,done]) => done).length;
        list.innerHTML = checks.map(([label, done]) => `<div class="feedback-review-item ${done ? 'is-done' : ''}"><span>${done ? '✓' : '–'}</span><strong>${label}</strong><small>${done ? '작성됨' : '기록 없음'}</small></div>`).join('');
        if (summary) {
            const selectedDate = document.getElementById('recordDate')?.value || '선택 날짜';
            summary.textContent = `${selectedDate} · ${completed}/${checks.length} 작성`;
        }
    }

        // MODULE: DAILY CHOICE / REWARD CHECK

    // Split-ready target: toggleDailyChoice

    // =========================================================

    function toggleDailyChoice(choice) {
        if (!canManageRelationshipCards()) {
            alert('오늘의 선물은 관리(Dom)만 작성할 수 있습니다.');
            return;
        }
        selectedDailyChoice = selectedDailyChoice === choice ? '' : choice;
        updateDailyChoiceButtons();
        updateDailyCards();
        triggerAutoSave('daily-choice');
    }

    function updateDailyChoiceButtons() {
        const rewardBtn = document.getElementById('rewardBtn');
        const restBtn = document.getElementById('restBtn');
        if (rewardBtn) rewardBtn.classList.toggle('active', selectedDailyChoice === 'reward');
        if (restBtn) restBtn.classList.toggle('active', selectedDailyChoice === 'rest');
    }

    function getDailyChoiceLabel(choice) {
        if (choice === 'reward') return '🎁 작은 보상';
        if (choice === 'rest') return '🌙 편안한 휴식';
        return '기록 없음';
    }

    // =========================================================

    // MODULE: OWNER NOTE / PRIVATE NOTE

    // Split-ready target: triggerOwnerNoteSave

    // =========================================================

    // 관리 전용 메모 저장 debounce
    // 입력 즉시 저장하지 않고 짧은 지연 후 저장해 Firebase write를 줄인다.
    function triggerOwnerNoteSave() {
        if (!canManageRelationshipCards()) return;
        showSaveStatus('👑 주인 메모 입력 중...');
        clearTimeout(ownerNoteSaveTimeout);
        ownerNoteSaveTimeout = setTimeout(saveOwnerPrivateNote, 600);
    }

    // 관리 전용 메모 저장
    // ownerNote 경로에 별도로 저장되며 일반 날짜 기록과 섞지 않는다.
    async function saveOwnerPrivateNote() {
        if (!canManageRelationshipCards()) return;
        const roomCode = getRoomCodeForData();
        if (!(await hmRequireRoomAccess('관리 전용 메모 저장', roomCode))) return;
        const date = document.getElementById('recordDate').value;
        const noteEl = document.getElementById('ownerPrivateNote');
        const note = noteEl ? String(noteEl.value || '').slice(0, 1000) : '';
        try {
            await db.ref(`ownerNotes/${roomCode}/${date}`).set({
                note,
                updatedBy: currentUser.uid,
                updatedByEmail: currentUser.email,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            showSaveStatus('👑 주인 메모 저장 완료');
        } catch (err) {
            hmReportError('saveOwnerPrivateNote', err, hmIsFirebasePermissionError(err) ? '❌ 관리 메모 권한 없음' : '❌ 주인 메모 저장 실패');
        }
    }

    function listenOwnerPrivateNote() {
        if (ownerNoteRef) ownerNoteRef.off();
        ownerNoteRef = null;
        const noteEl = document.getElementById('ownerPrivateNote');
        if (!currentUser || !activeRoomCode || !noteEl || !canManageRelationshipCards()) return;
        const date = document.getElementById('recordDate').value;
        ownerNoteRef = db.ref(`ownerNotes/${activeRoomCode}/${date}`);
        ownerNoteRef.on('value', (snapshot) => {
            const data = snapshot.val() || {};
            if (document.activeElement !== noteEl) noteEl.value = data.note || '';
            updateDailyCards();
        }, (err) => {
            console.error(err);
            showSaveStatus('❌ 주인 메모 읽기 권한 없음');
        });
    }

    // =========================================================



    // MODULE 13. FORM RESTORE / PHOTO / WATER HELPERS
    // 분리 후보: daily.js 일부
    // Firebase에서 읽은 데이터를 화면 필드로 복원하고 사진/물 UI를 동기화한다.
    // =========================================================
    function safeUpdateField(id, val) {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) el.value = (val === '기록 없음' || !val) ? '' : val;
    }

    // =========================================================

    // MODULE: FORM / CLEAR FIELDS

    // Split-ready target: clearFormFieldsExceptSync

    // =========================================================

    function clearFormFieldsExceptSync() {
        const fields = ['wakeTime', 'exercise', 'weight', 'mealBreakfast', 'mealLunch', 'mealDinner', 'goingOut', 'sleepTime', 'diary', 'replyMessage', 'moodNote', 'rewardNote'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el && document.activeElement !== el) el.value = '';
        });
        currentWater = 0;
        const waterDisplay = document.getElementById('waterDisplay');
        if (waterDisplay) waterDisplay.innerText = 0;
        clearMissionAndMoodUI();
        selectedFeedbackType = '';
        feedbackConfirmed = false;
        updateFeedbackTypeButtons();
        updateDailyCards();
        removePhotoUI();
    }

    // =========================================================

    // MODULE: PHOTO / UI

    // Split-ready target: removePhotoUI

    // =========================================================

    function removePhotoUI() {
        uploadedPhotoBase64 = "";
        const input = document.getElementById('goingOutPhoto');
        const preview = document.getElementById('previewBox');
        if (input) input.value = "";
        if (preview) preview.style.display = 'none';
        if (typeof hmSetDailyMoments === 'function') hmSetDailyMoments({}, '');
    }

    // =========================================================

    // MODULE: WATER / COUNTER

    // Split-ready target: addWater

    // =========================================================

    function addWater(amount) { currentWater += amount; document.getElementById('waterDisplay').innerText = currentWater; updateDailyCards(); triggerAutoSave('water'); }
    function resetWater() { currentWater = 0; document.getElementById('waterDisplay').innerText = currentWater; updateDailyCards(); triggerAutoSave('water-reset'); }
    function removePhoto() { removePhotoUI(); updateDailyCards(); triggerAutoSave('photo-remove'); }

    // =========================================================

    // MODULE: PHOTO / UPLOAD PREVIEW

    // Split-ready target: handlePhotoUpload

    // =========================================================

    // 사진 업로드 처리
    // 업로드 이미지를 Base64로 변환해 날짜 기록과 함께 저장한다.
    // 주의: Storage를 쓰지 않는 현재 구조를 유지한다.
    function handlePhotoUpload(input) {
        const file = input.files && input.files[0];
        if (!file) return;
        if (!file.type || !file.type.startsWith('image/')) {
            alert('이미지 파일만 첨부할 수 있습니다.');
            input.value = '';
            return;
        }
        if (file.size > HM_MAX_PHOTO_SIZE_BYTES) {
            alert('사진 용량이 큽니다. 5MB 이하 이미지로 다시 선택해 주세요.');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onerror = function(err) {
            hmReportError('photo.reader', err, '❌ 사진을 불러오지 못했습니다.');
            input.value = '';
        };
        reader.onload = function(e) {
            const img = new Image();
            img.onerror = function(err) {
                hmReportError('photo.image', err, '❌ 사진 형식을 읽지 못했습니다.');
                input.value = '';
            };
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 350;
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    uploadedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.5);
                    document.getElementById('photoPreview').src = uploadedPhotoBase64;
                    document.getElementById('previewBox').style.display = 'block';
                    updateDailyCards();
                    triggerAutoSave('photo-upload');
                } catch (err) {
                    hmReportError('photo.canvas', err, '❌ 사진 처리 실패');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // =========================================================



    // MODULE: REPORT / GENERATE RESULT

    // Split-ready target: finalizeAndGenerateReport

    // =========================================================

    // 결과문 생성 및 명시 저장
    // 자동저장과 별개로 사용자가 복사할 수 있는 하루 보고 문구를 생성한다.
    async function finalizeAndGenerateReport() {
        const roomCode = getRoomCodeForData();
        const date = document.getElementById('recordDate').value;
        if(!currentUser) { alert('로그인이 필요합니다.'); return; }
        if(!roomCode) { alert('방에 연결되어야 전송용 결과가 추출됩니다.'); return; }
        if (!(await canCurrentUserAccessRoom(roomCode))) { alert('이 방에 접근할 수 없습니다.'); return; }
        hmLoadMergedDayRecord(roomCode, date).then((record) => {
            if (record) {
                let finalText = record.fullText || '';
                if (!finalText.includes('🎁 오늘의 선물:')) {
                    const choiceLabel = record.dailyChoiceLabel || getDailyChoiceLabel(record.dailyChoice || '');
                    const rewardNote = record.rewardNote || '기록 없음';
                    finalText += `\n\n🎁 오늘의 선물:\n  - 선택: ${choiceLabel || '기록 없음'}\n  - 내용: ${rewardNote}`;
                }
                document.getElementById('resultBox').value = finalText;
                const resultContainer = document.getElementById('resultContainer');
                resultContainer.style.display = 'block';
                resultContainer.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('오늘 날짜의 저장된 기록이 아직 없습니다.');
            }
        });
    }

    // =========================================================

    // MODULE: REPORT / COPY

    // Split-ready target: copyToClipboard

    // =========================================================
    // RC2 v2.8.0 STEP1: copyToClipboard moved to js/utils.js

    // RC2 v2.8.0 STEP1: executeCopy moved to js/utils.js

    // =========================================================
    // MODULE: UI / TOAST
    // Split-ready target: showToast
    // =========================================================
    // RC2 v2.8.0 STEP1: showToast moved to js/utils.js
