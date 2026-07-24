// HearMe2nite STEP6.2.14.88 - secured Room media client
(function hmRoomMediaClient() {
    'use strict';

    const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
    const MAX_DATA_URL_LENGTH = 680000;
    const VALID_KINDS = new Set(['moment', 'meal', 'promise', 'subRoutine', 'routineEntry']);

    function authenticatedUid() {
        try { return firebase.auth(babyApp).currentUser?.uid || ''; } catch (error) { return ''; }
    }

    function assertContext(context) {
        const currentUid = authenticatedUid();
        const currentRoom = typeof getRoomCodeForData === 'function'
            ? String(getRoomCodeForData() || '')
            : (typeof activeRoomCode !== 'undefined' ? String(activeRoomCode || '') : '');
        if (!context?.uid || !context?.roomCode || context.uid !== currentUid || context.roomCode !== currentRoom) {
            throw new Error('media/context-changed');
        }
    }

    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(reader.error || new Error('사진 파일을 읽지 못했습니다.'));
            reader.onload = () => resolve(String(reader.result || ''));
            reader.readAsDataURL(file);
        });
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onerror = () => reject(new Error('지원하지 않는 사진 형식입니다.'));
            image.onload = () => resolve(image);
            image.src = src;
        });
    }

    function resizeCanvas(source, width) {
        const next = document.createElement('canvas');
        next.width = Math.max(1, Math.round(width));
        next.height = Math.max(1, Math.round(source.height * (next.width / source.width)));
        next.getContext('2d', { alpha: false }).drawImage(source, 0, 0, next.width, next.height);
        return next;
    }

    async function compress(file) {
        if (!file || !String(file.type || '').startsWith('image/')) throw new Error('사진 파일만 선택할 수 있습니다.');
        if (file.size > MAX_SOURCE_BYTES) throw new Error('원본 사진은 12MB 이하만 선택할 수 있습니다.');
        const image = await loadImage(await readFile(file));
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height, 1));
        let canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d', { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);

        let quality = 0.8;
        let mime = 'image/webp';
        let dataUrl = canvas.toDataURL(mime, quality);
        if (!dataUrl.startsWith('data:image/webp;')) {
            mime = 'image/jpeg';
            dataUrl = canvas.toDataURL(mime, quality);
        }
        while (dataUrl.length > MAX_DATA_URL_LENGTH && canvas.width > 420) {
            canvas = resizeCanvas(canvas, Math.max(420, canvas.width * 0.84));
            quality = Math.max(0.5, quality - 0.05);
            dataUrl = canvas.toDataURL(mime, quality);
        }
        if (dataUrl.length > MAX_DATA_URL_LENGTH) throw new Error('사진을 안전한 크기로 압축하지 못했습니다.');
        return { dataUrl, previewUrl: dataUrl, contentType: mime };
    }

    function callable(name) {
        if (!window.firebase?.functions || typeof babyApp === 'undefined') throw new Error('사진 저장 서비스를 불러오지 못했습니다.');
        return firebase.app(babyApp.name).functions('us-central1').httpsCallable(name);
    }

    async function upload({ kind, resourceId, file, context }) {
        if (!VALID_KINDS.has(kind)) throw new Error('지원하지 않는 사진 종류입니다.');
        assertContext(context);
        const compressed = await compress(file);
        assertContext(context);
        const result = await callable('executeApprovedRoomDisconnect')({
            mediaAction: 'uploadRoomMedia',
            roomCode: context.roomCode,
            kind,
            resourceId,
            dataUrl: compressed.dataUrl
        });
        return result?.data || {};
    }

    async function remove({ kind, resourceId, path, context }) {
        if (!path) return { ok: true };
        if (!VALID_KINDS.has(kind)) throw new Error('지원하지 않는 사진 종류입니다.');
        if (!context?.uid || !context?.roomCode || context.uid !== authenticatedUid()) throw new Error('media/context-changed');
        const result = await callable('executeApprovedRoomDisconnect')({
            mediaAction: 'deleteRoomMedia',
            roomCode: context.roomCode,
            kind,
            resourceId,
            path
        });
        return result?.data || {};
    }

    window.hmRoomMedia = Object.freeze({
        MAX_SOURCE_BYTES,
        compress,
        upload,
        remove,
        captureContext() {
            return {
                uid: authenticatedUid(),
                roomCode: typeof getRoomCodeForData === 'function'
                    ? String(getRoomCodeForData() || '')
                    : (typeof activeRoomCode !== 'undefined' ? String(activeRoomCode || '') : '')
            };
        }
    });
})();
