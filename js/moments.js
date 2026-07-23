// HearMe2nite STEP6.2.13.7 - Daily Moments Gallery
(function hmDailyMomentsGallery() {
    const TEST_PROJECT_ID = 'hearme2nite1205';
    const TEST_LIMIT = 10;
    const LEGACY_LIMIT = 5;
    const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
    const BASE64_TARGET_LENGTH = 470000;
    let uploadInProgress = false;
    let pendingMomentUploads = [];
    let pendingMomentDate = '';
    let pendingMomentContext = null;
    let mealUploadInProgress = false;
    let pendingMealUploads = [];
    let pendingMealDate = '';
    let pendingMealContext = null;
    const MEAL_LABELS = Object.freeze({ breakfast: '아침', lunch: '점심', dinner: '저녁' });

    function environment() {
        const projectId = String(window.HM_FIREBASE_ENV?.projectId || babyApp?.options?.projectId || '');
        return {
            projectId,
            usesStorage: projectId === TEST_PROJECT_ID,
            limit: projectId === TEST_PROJECT_ID ? TEST_LIMIT : LEGACY_LIMIT
        };
    }

    function roomCode() {
        try { return typeof getRoomCodeForData === 'function' ? getRoomCodeForData() : activeRoomCode; } catch (e) { return ''; }
    }

    function selectedDate() {
        return document.getElementById('recordDate')?.value || '';
    }

    function mediaContext() {
        return { uid: currentUser?.uid || '', roomCode: roomCode(), date: selectedDate() };
    }

    function isMediaContextCurrent(context) {
        const current = mediaContext();
        return !!context && !!context.uid && !!context.roomCode && !!context.date
            && context.uid === current.uid
            && context.roomCode === current.roomCode
            && context.date === current.date;
    }

    function normalizeMoment(value, id) {
        if (!value || typeof value !== 'object') return null;
        const src = String(value.url || value.dataUrl || '').trim();
        if (!src) return null;
        return {
            id: String(id || value.id || ''),
            storageType: value.storageType === 'storage' ? 'storage' : 'base64',
            url: String(value.url || ''),
            dataUrl: String(value.dataUrl || ''),
            storagePath: String(value.storagePath || ''),
            caption: String(value.caption || '').slice(0, 120),
            mealType: MEAL_LABELS[value.mealType] ? String(value.mealType) : '',
            uploadedBy: String(value.uploadedBy || ''),
            uploadedAt: Number(value.uploadedAt || 0),
            legacy: value.legacy === true
        };
    }

    function getRecordMoments(record) {
        const rows = [];
        const source = record?.moments;
        if (source && typeof source === 'object') {
            Object.entries(source).forEach(([id, value]) => {
                const item = normalizeMoment(value, id);
                if (item) rows.push(item);
            });
        }
        if (record?.photo && !rows.some((item) => item.dataUrl === record.photo || item.url === record.photo)) {
            rows.push({
                id: 'legacy-photo', storageType: 'base64', url: '', dataUrl: record.photo,
                storagePath: '', caption: '기존 사진', uploadedBy: '', uploadedAt: 0, legacy: true
            });
        }
        const unique = new Map();
        rows.forEach((item) => {
            const identity = item.id || momentSource(item);
            if (identity && !unique.has(identity)) unique.set(identity, item);
        });
        return Array.from(unique.values()).sort((a, b) => Number(a.uploadedAt || 0) - Number(b.uploadedAt || 0));
    }

    function momentSource(item) {
        return String(item?.url || item?.dataUrl || item?.previewUrl || '');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function canDelete(item) {
        return item?.pending === true || item?.legacy === true || (!!currentUser?.uid && item?.uploadedBy === currentUser.uid);
    }

    function render() {
        const grid = document.getElementById('momentsPreviewGrid');
        const box = document.getElementById('previewBox');
        const guide = document.getElementById('momentsUploadGuide');
        const env = environment();
        const uniqueMoments = [];
        const identities = new Set();
        hmDailyMoments.forEach((item) => {
            const identity = item?.id || momentSource(item);
            if (!identity || identities.has(identity)) return;
            identities.add(identity);
            uniqueMoments.push(item);
        });
        if (uniqueMoments.length !== hmDailyMoments.length) hmDailyMoments = uniqueMoments;
        const visibleMoments = hmDailyMoments.filter((item) => !item.mealType).concat(pendingMomentUploads);
        const count = visibleMoments.length;
        if (guide) {
            const pendingText = pendingMomentUploads.length ? ` · 저장 대기 ${pendingMomentUploads.length}장` : '';
            guide.textContent = (env.usesStorage
                ? `안전한 사진 저장소 · ${count}/${env.limit}장`
                : `현재 환경은 압축 저장 · ${count}/${env.limit}장`) + pendingText;
        }
        if (!grid || !box) return;
        box.style.display = count ? 'block' : 'none';
        grid.innerHTML = visibleMoments.map((item) => {
            const src = escapeHtml(momentSource(item));
            const deleteButton = canDelete(item)
                ? `<button type="button" class="moment-remove-btn" data-moment-delete="${escapeHtml(item.id)}" aria-label="사진 삭제">×</button>`
                : '';
            return `<figure class="moment-preview-item${item.pending ? ' is-pending' : ''}">
                <button type="button" class="moment-open-btn" data-moment-open="${escapeHtml(item.id)}" aria-label="사진 크게 보기">
                    <img src="${src}" alt="오늘의 순간 사진" loading="lazy">
                </button>${item.pending ? '<span class="moment-pending-badge">저장 대기</span>' : ''}${deleteButton}
            </figure>`;
        }).join('');
        renderMealPhotos();
    }

    function renderMealPhotos() {
        const gallery = document.getElementById('mealPhotoGallery');
        if (!gallery) return;
        const rows = hmDailyMoments.filter((item) => MEAL_LABELS[item.mealType]).concat(pendingMealUploads).slice(0, 3);
        Object.keys(MEAL_LABELS).forEach((mealType) => {
            const button = document.querySelector(`[data-meal-photo-button="${mealType}"]`);
            if (!button) return;
            const item = rows.find((row) => row.mealType === mealType);
            button.classList.toggle('has-photo', !!item);
            button.setAttribute('aria-label', `${MEAL_LABELS[mealType]} 식사 사진 ${item ? '등록됨' : '추가'}`);
            button.innerHTML = item
                ? `<img src="${escapeHtml(momentSource(item))}" alt="${MEAL_LABELS[mealType]} 식사 사진 썸네일">`
                : '<span aria-hidden="true">📷</span>';
        });
        gallery.hidden = rows.length === 0;
        gallery.dataset.count = String(rows.length);
        gallery.innerHTML = rows.map((item) => `<figure class="meal-photo-thumb${item.pending ? ' is-pending' : ''}">
            <button type="button" class="meal-photo-open" data-moment-open="${escapeHtml(item.id)}" aria-label="${MEAL_LABELS[item.mealType]} 식사 사진 크게 보기">
                <img src="${escapeHtml(momentSource(item))}" alt="${MEAL_LABELS[item.mealType]} 식사 사진" loading="lazy">
                <span>${MEAL_LABELS[item.mealType]}</span>
            </button>
            ${item.pending ? '<span class="meal-photo-pending-badge">저장 대기</span>' : ''}
            ${canDelete(item) ? `<button type="button" class="meal-photo-remove" data-moment-delete="${escapeHtml(item.id)}" aria-label="${MEAL_LABELS[item.mealType]} 식사 사진 삭제">×</button>` : ''}
        </figure>`).join('');
        const saveButton = document.getElementById('mealPhotoSaveButton');
        if (saveButton) {
            saveButton.disabled = mealUploadInProgress || pendingMealUploads.length === 0;
            saveButton.textContent = pendingMealUploads.length ? `식사 사진 ${pendingMealUploads.length}장 저장` : '식사 사진 저장';
        }
    }

    function setDailyMoments(rawMoments, legacyPhoto) {
        if (pendingMomentDate && pendingMomentDate !== selectedDate()) discardPendingUploads();
        if (pendingMealDate && pendingMealDate !== selectedDate()) discardPendingMealUploads();
        hmDailyMoments = getRecordMoments({ moments: rawMoments || {}, photo: legacyPhoto || '' });
        uploadedPhotoBase64 = legacyPhoto || '';
        render();
        if (typeof updateDailyCards === 'function') updateDailyCards();
    }

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error || new Error('파일 읽기 실패'));
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onerror = () => reject(new Error('이미지 형식 읽기 실패'));
            image.onload = () => resolve(image);
            image.src = src;
        });
    }

    function canvasBlob(canvas, quality) {
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('이미지 압축 실패')), 'image/jpeg', quality);
        });
    }

    async function compress(file, usesStorage) {
        const src = await readFile(file);
        const image = await loadImage(src);
        const canvas = document.createElement('canvas');
        const maxWidth = usesStorage ? 1600 : 900;
        const scale = Math.min(1, maxWidth / Math.max(1, image.width));
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d', { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);

        if (usesStorage) {
            const blob = await canvasBlob(canvas, 0.8);
            return { blob, dataUrl: '' };
        }

        let quality = 0.72;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > BASE64_TARGET_LENGTH && canvas.width > 420) {
            const width = Math.max(420, Math.round(canvas.width * 0.84));
            const height = Math.max(1, Math.round(canvas.height * (width / canvas.width)));
            const resized = document.createElement('canvas');
            resized.width = width;
            resized.height = height;
            resized.getContext('2d', { alpha: false }).drawImage(canvas, 0, 0, width, height);
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d', { alpha: false }).drawImage(resized, 0, 0);
            quality = Math.max(0.52, quality - 0.04);
            dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > 600000) throw new Error('압축 후에도 사진 용량이 너무 큽니다.');
        return { blob: null, dataUrl };
    }

    async function persistMoment(file, mealType = '', requestContext = mediaContext()) {
        if (typeof window.hmGuardRelationshipDataAccess === 'function' && !window.hmGuardRelationshipDataAccess()) {
            throw new Error('relationship/data-locked');
        }
        const env = environment();
        const room = requestContext.roomCode;
        const date = requestContext.date;
        if (!isMediaContextCurrent(requestContext)) throw new Error('media/context-changed');
        if (!currentUser || !room || !date) throw new Error('Room과 날짜를 먼저 확인해 주세요.');
        const id = db.ref(`rooms/${room}/days/${date}/moments`).push().key;
        const compressed = await compress(file, env.usesStorage);
        if (!isMediaContextCurrent(requestContext)) throw new Error('media/context-changed');
        const payload = {
            storageType: env.usesStorage ? 'storage' : 'base64',
            caption: '',
            uploadedBy: requestContext.uid,
            uploadedAt: firebase.database.ServerValue.TIMESTAMP
        };
        if (MEAL_LABELS[mealType]) payload.mealType = mealType;

        let storageRef = null;
        if (env.usesStorage) {
            const path = `rooms/${room}/moments/${date}/${requestContext.uid}/${id}.jpg`;
            storageRef = firebase.storage(babyApp).ref(path);
            const snapshot = await storageRef.put(compressed.blob, { contentType: 'image/jpeg' });
            if (!isMediaContextCurrent(requestContext)) {
                await storageRef.delete().catch(() => {});
                throw new Error('media/context-changed');
            }
            payload.url = await snapshot.ref.getDownloadURL();
            payload.storagePath = path;
        } else {
            payload.dataUrl = compressed.dataUrl;
        }

        try {
            if (!isMediaContextCurrent(requestContext)) throw new Error('media/context-changed');
            if (typeof window.hmGuardRelationshipDataAccess === 'function' && !window.hmGuardRelationshipDataAccess()) {
                throw new Error('relationship/data-locked');
            }
            await db.ref(`rooms/${room}/days/${date}/moments/${id}`).set(payload);
        } catch (error) {
            if (storageRef) storageRef.delete().catch(() => {});
            throw error;
        }
        if (!isMediaContextCurrent(requestContext)) return false;
        const savedMoment = normalizeMoment({ ...payload, uploadedAt: Date.now() }, id);
        const existingIndex = hmDailyMoments.findIndex((item) => item.id === id);
        if (existingIndex >= 0) hmDailyMoments[existingIndex] = savedMoment;
        else hmDailyMoments.push(savedMoment);
        return true;
    }

    async function handleMealPhotoUpload(input, mealType) {
        const file = input?.files?.[0];
        input.value = '';
        if (typeof window.hmGuardRelationshipDataAccess === 'function' && !window.hmGuardRelationshipDataAccess()) return;
        if (!file || !MEAL_LABELS[mealType] || mealUploadInProgress) return;
        if (!file.type?.startsWith('image/') || file.size > MAX_SOURCE_BYTES) {
            alert('이미지 파일만 선택할 수 있으며 원본 파일은 12MB 이하여야 합니다.');
            return;
        }
        if (hmDailyMoments.concat(pendingMealUploads).some((item) => item.mealType === mealType)) {
            alert(`${MEAL_LABELS[mealType]} 사진은 한 장만 등록할 수 있습니다. 기존 사진을 삭제한 뒤 다시 추가해 주세요.`);
            return;
        }
        if (hmDailyMoments.concat(pendingMealUploads).filter((item) => MEAL_LABELS[item.mealType]).length >= 3) {
            alert('식사 사진은 아침·점심·저녁 각 한 장씩 최대 3장까지 등록할 수 있습니다.');
            return;
        }
        pendingMealDate = selectedDate();
        pendingMealContext = mediaContext();
        pendingMealUploads.push({
            id: `pending-meal-${Date.now()}-${mealType}`,
            file,
            mealType,
            previewUrl: URL.createObjectURL(file),
            pending: true,
            uploadedBy: currentUser?.uid || ''
        });
        renderMealPhotos();
        if (typeof updateDailyCards === 'function') updateDailyCards();
        if (typeof showSaveStatus === 'function') showSaveStatus(`📷 ${MEAL_LABELS[mealType]} 식사 사진 저장 대기`);
    }

    function discardPendingMealUploads() {
        pendingMealUploads.forEach((item) => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); });
        pendingMealUploads = [];
        pendingMealDate = '';
        pendingMealContext = null;
        renderMealPhotos();
    }

    async function saveMealPhotos() {
        if (typeof window.hmGuardRelationshipDataAccess === 'function' && !window.hmGuardRelationshipDataAccess()) {
            discardPendingMealUploads();
            return;
        }
        if (mealUploadInProgress || !pendingMealUploads.length) return;
        if (pendingMealDate !== selectedDate() || !isMediaContextCurrent(pendingMealContext)) {
            alert('날짜가 변경되었습니다. 식사 사진을 다시 선택해 주세요.');
            discardPendingMealUploads();
            return;
        }
        mealUploadInProgress = true;
        document.querySelectorAll('.meal-photo-input').forEach((item) => { item.disabled = true; });
        renderMealPhotos();
        try {
            let savedCount = 0;
            while (pendingMealUploads.length) {
                const pending = pendingMealUploads[0];
                const applied = await persistMoment(pending.file, pending.mealType, pendingMealContext);
                if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
                pendingMealUploads.shift();
                if (!applied) {
                    discardPendingMealUploads();
                    return;
                }
                savedCount += 1;
                renderMealPhotos();
            }
            pendingMealDate = '';
            pendingMealContext = null;
            if (typeof triggerAutoSave === 'function') triggerAutoSave('meal-photo-upload');
            if (typeof showSaveStatus === 'function') showSaveStatus(`📷 식사 사진 ${savedCount}장 저장 완료`);
        } catch (error) {
            if (typeof hmReportError === 'function') hmReportError('meal.photo.upload', error, '❌ 식사 사진 저장 실패');
            else alert(error.message || '식사 사진 저장에 실패했습니다.');
        } finally {
            mealUploadInProgress = false;
            document.querySelectorAll('.meal-photo-input').forEach((item) => { item.disabled = false; });
            renderMealPhotos();
        }
    }

    async function handleUpload(input) {
        if (typeof window.hmGuardRelationshipDataAccess === 'function' && !window.hmGuardRelationshipDataAccess()) {
            if (input) input.value = '';
            return;
        }
        if (uploadInProgress) return;
        const files = Array.from(input?.files || []);
        if (!files.length) return;
        const env = environment();
        const ordinaryMomentCount = hmDailyMoments.filter((item) => !item.mealType).length;
        const available = Math.max(0, env.limit - ordinaryMomentCount - pendingMomentUploads.length);
        if (!available) {
            alert(`오늘의 순간은 이 환경에서 하루 최대 ${env.limit}장까지 저장할 수 있습니다.`);
            input.value = '';
            return;
        }
        const selected = files.slice(0, available);
        if (files.length > available) alert(`남은 ${available}장만 추가합니다.`);
        const invalid = selected.find((file) => !file.type?.startsWith('image/') || file.size > MAX_SOURCE_BYTES);
        if (invalid) {
            alert('이미지 파일만 선택할 수 있으며 원본 한 장은 12MB 이하여야 합니다.');
            input.value = '';
            return;
        }

        pendingMomentDate = selectedDate();
        pendingMomentContext = mediaContext();
        selected.forEach((file, index) => {
            pendingMomentUploads.push({
                id: `pending-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
                file,
                previewUrl: URL.createObjectURL(file),
                pending: true,
                uploadedBy: currentUser?.uid || ''
            });
        });
        input.value = '';
        render();
        if (typeof updateDailyCards === 'function') updateDailyCards();
        if (typeof showSaveStatus === 'function') showSaveStatus(`📷 사진 ${selected.length}장 저장 대기`);
    }

    function discardPendingUploads() {
        pendingMomentUploads.forEach((item) => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        pendingMomentUploads = [];
        pendingMomentDate = '';
        pendingMomentContext = null;
        render();
    }

    async function saveDailyMomentsAndClose() {
        if (typeof window.hmGuardRelationshipDataAccess === 'function' && !window.hmGuardRelationshipDataAccess()) {
            discardPendingUploads();
            return;
        }
        if (uploadInProgress) return;
        if (!pendingMomentUploads.length) {
            closeDailyModal('outing');
            return;
        }
        if (pendingMomentDate !== selectedDate() || !isMediaContextCurrent(pendingMomentContext)) {
            alert('날짜가 변경되었습니다. 사진을 다시 선택해 주세요.');
            discardPendingUploads();
            return;
        }
        const input = document.getElementById('goingOutPhoto');
        const saveButton = document.getElementById('dailyMomentsSaveButton');
        uploadInProgress = true;
        if (input) input.disabled = true;
        if (saveButton) saveButton.disabled = true;
        try {
            let savedCount = 0;
            while (pendingMomentUploads.length) {
                const pending = pendingMomentUploads[0];
                const applied = await persistMoment(pending.file, '', pendingMomentContext);
                if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
                pendingMomentUploads.shift();
                if (!applied) {
                    discardPendingUploads();
                    return;
                }
                savedCount += 1;
                render();
            }
            pendingMomentDate = '';
            pendingMomentContext = null;
            if (typeof triggerAutoSave === 'function') triggerAutoSave('daily-moments-upload');
            if (typeof showSaveStatus === 'function') showSaveStatus(`📷 오늘의 순간 ${savedCount}장 저장 완료`);
            closeDailyModal('outing');
        } catch (error) {
            if (typeof hmReportError === 'function') hmReportError('moments.upload', error, '❌ 사진 저장 실패');
            else alert(error.message || '사진 저장에 실패했습니다.');
        } finally {
            uploadInProgress = false;
            if (input) input.disabled = false;
            if (saveButton) saveButton.disabled = false;
            render();
        }
    }

    function cancelDailyMomentsAndClose() {
        if (uploadInProgress) return;
        discardPendingUploads();
        closeDailyModal('outing');
    }

    async function deleteMoment(id) {
        const pendingMealIndex = pendingMealUploads.findIndex((row) => row.id === id);
        if (pendingMealIndex >= 0) {
            const pending = pendingMealUploads[pendingMealIndex];
            if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
            pendingMealUploads.splice(pendingMealIndex, 1);
            if (!pendingMealUploads.length) pendingMealDate = '';
            renderMealPhotos();
            return;
        }
        const pendingIndex = pendingMomentUploads.findIndex((row) => row.id === id);
        if (pendingIndex >= 0) {
            const pending = pendingMomentUploads[pendingIndex];
            if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
            pendingMomentUploads.splice(pendingIndex, 1);
            if (!pendingMomentUploads.length) pendingMomentDate = '';
            render();
            return;
        }
        const item = hmDailyMoments.find((row) => row.id === id);
        if (!item || !canDelete(item) || !confirm('이 사진을 삭제할까요?')) return;
        const room = roomCode();
        const date = selectedDate();
        try {
            if (item.legacy) {
                await db.ref(`rooms/${room}/days/${date}/photo`).remove();
                uploadedPhotoBase64 = '';
            } else {
                if (item.storageType === 'storage' && item.storagePath) {
                    await firebase.storage(babyApp).ref(item.storagePath).delete();
                }
                await db.ref(`rooms/${room}/days/${date}/moments/${id}`).remove();
            }
            hmDailyMoments = hmDailyMoments.filter((row) => row.id !== id);
            render();
            renderMealPhotos();
            if (typeof updateDailyCards === 'function') updateDailyCards();
            if (typeof showSaveStatus === 'function') showSaveStatus('📷 사진 삭제 완료');
        } catch (error) {
            if (typeof hmReportError === 'function') hmReportError('moments.delete', error, '❌ 사진 삭제 실패');
        }
    }

    function openMoment(id) {
        const item = hmDailyMoments.concat(pendingMomentUploads, pendingMealUploads).find((row) => row.id === id);
        const src = momentSource(item);
        if (src) window.open(src, '_blank', 'noopener,noreferrer');
    }

    document.addEventListener('click', (event) => {
        const deleteButton = event.target.closest('[data-moment-delete]');
        if (deleteButton) {
            event.preventDefault();
            deleteMoment(deleteButton.dataset.momentDelete);
            return;
        }
        const openButton = event.target.closest('[data-moment-open]');
        if (openButton) openMoment(openButton.dataset.momentOpen);
    });

    window.hmGetRecordMoments = getRecordMoments;
    window.hmRecordHasMoments = (record) => getRecordMoments(record).length > 0;
    window.hmRecordMomentCount = (record) => getRecordMoments(record).length;
    window.hmFirstMomentSource = (record) => momentSource(getRecordMoments(record)[0]);
    window.hmSetDailyMoments = setDailyMoments;
    window.hmRenderDailyMoments = render;
    window.handlePhotoUpload = handleUpload;
    window.handleMealPhotoUpload = handleMealPhotoUpload;
    window.saveMealPhotos = saveMealPhotos;
    window.hmRenderMealPhotos = renderMealPhotos;
    window.saveDailyMomentsAndClose = saveDailyMomentsAndClose;
    window.cancelDailyMomentsAndClose = cancelDailyMomentsAndClose;
    window.hmDiscardPendingMedia = function hmDiscardPendingMedia() {
        discardPendingUploads();
        discardPendingMealUploads();
        render();
    };
    window.hmGetPendingMediaState = function hmGetPendingMediaState() {
        return {
            date: pendingMomentDate || pendingMealDate || '',
            moments: pendingMomentUploads.length,
            meals: pendingMealUploads.length,
            uploading: uploadInProgress || mealUploadInProgress
        };
    };

    document.addEventListener('DOMContentLoaded', render);
})();
