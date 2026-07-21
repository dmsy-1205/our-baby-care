// HearMe2nite STEP6.2.13.7 - Daily Moments Gallery
(function hmDailyMomentsGallery() {
    const TEST_PROJECT_ID = 'hearme2nite1205';
    const TEST_LIMIT = 10;
    const LEGACY_LIMIT = 5;
    const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
    const BASE64_TARGET_LENGTH = 470000;
    let uploadInProgress = false;

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
        return rows.sort((a, b) => Number(a.uploadedAt || 0) - Number(b.uploadedAt || 0));
    }

    function momentSource(item) {
        return String(item?.url || item?.dataUrl || '');
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function canDelete(item) {
        return item?.legacy === true || (!!currentUser?.uid && item?.uploadedBy === currentUser.uid);
    }

    function render() {
        const grid = document.getElementById('momentsPreviewGrid');
        const box = document.getElementById('previewBox');
        const guide = document.getElementById('momentsUploadGuide');
        const env = environment();
        const count = hmDailyMoments.length;
        if (guide) {
            guide.textContent = env.usesStorage
                ? `안전한 사진 저장소 · ${count}/${env.limit}장`
                : `현재 환경은 압축 저장 · ${count}/${env.limit}장`;
        }
        if (!grid || !box) return;
        box.style.display = count ? 'block' : 'none';
        grid.innerHTML = hmDailyMoments.map((item) => {
            const src = escapeHtml(momentSource(item));
            const deleteButton = canDelete(item)
                ? `<button type="button" class="moment-remove-btn" data-moment-delete="${escapeHtml(item.id)}" aria-label="사진 삭제">×</button>`
                : '';
            return `<figure class="moment-preview-item">
                <button type="button" class="moment-open-btn" data-moment-open="${escapeHtml(item.id)}" aria-label="사진 크게 보기">
                    <img src="${src}" alt="오늘의 순간 사진" loading="lazy">
                </button>${deleteButton}
            </figure>`;
        }).join('');
    }

    function setDailyMoments(rawMoments, legacyPhoto) {
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

    async function persistMoment(file) {
        const env = environment();
        const room = roomCode();
        const date = selectedDate();
        if (!currentUser || !room || !date) throw new Error('Room과 날짜를 먼저 확인해 주세요.');
        const id = db.ref(`rooms/${room}/days/${date}/moments`).push().key;
        const compressed = await compress(file, env.usesStorage);
        const payload = {
            storageType: env.usesStorage ? 'storage' : 'base64',
            caption: '',
            uploadedBy: currentUser.uid,
            uploadedAt: firebase.database.ServerValue.TIMESTAMP
        };

        let storageRef = null;
        if (env.usesStorage) {
            const path = `rooms/${room}/moments/${date}/${currentUser.uid}/${id}.jpg`;
            storageRef = firebase.storage(babyApp).ref(path);
            const snapshot = await storageRef.put(compressed.blob, { contentType: 'image/jpeg' });
            payload.url = await snapshot.ref.getDownloadURL();
            payload.storagePath = path;
        } else {
            payload.dataUrl = compressed.dataUrl;
        }

        try {
            await db.ref(`rooms/${room}/days/${date}/moments/${id}`).set(payload);
        } catch (error) {
            if (storageRef) storageRef.delete().catch(() => {});
            throw error;
        }
        hmDailyMoments.push(normalizeMoment({ ...payload, uploadedAt: Date.now() }, id));
    }

    async function handleUpload(input) {
        if (uploadInProgress) return;
        const files = Array.from(input?.files || []);
        if (!files.length) return;
        const env = environment();
        const available = Math.max(0, env.limit - hmDailyMoments.length);
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

        uploadInProgress = true;
        input.disabled = true;
        try {
            for (const file of selected) {
                await persistMoment(file);
                render();
            }
            if (typeof triggerAutoSave === 'function') triggerAutoSave('daily-moments-upload');
            if (typeof showSaveStatus === 'function') showSaveStatus(`📷 오늘의 순간 ${selected.length}장 저장 완료`);
        } catch (error) {
            if (typeof hmReportError === 'function') hmReportError('moments.upload', error, '❌ 사진 저장 실패');
            else alert(error.message || '사진 저장에 실패했습니다.');
        } finally {
            uploadInProgress = false;
            input.disabled = false;
            input.value = '';
            render();
        }
    }

    async function deleteMoment(id) {
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
            if (typeof updateDailyCards === 'function') updateDailyCards();
            if (typeof showSaveStatus === 'function') showSaveStatus('📷 사진 삭제 완료');
        } catch (error) {
            if (typeof hmReportError === 'function') hmReportError('moments.delete', error, '❌ 사진 삭제 실패');
        }
    }

    function openMoment(id) {
        const item = hmDailyMoments.find((row) => row.id === id);
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

    document.addEventListener('DOMContentLoaded', render);
})();

