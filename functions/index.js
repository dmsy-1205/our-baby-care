'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

if (!getApps().length) initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 3 });

const ALLOWED_TYPES = new Set(['account', 'leave_room', 'delete_room']);

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function requireAdmin(auth, db) {
  if (!auth || !auth.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const snap = await db.ref(`admins/${auth.uid}`).get();
  if (!snap.exists()) throw new HttpsError('permission-denied', '관리자만 실행할 수 있습니다.');
}

async function existence(db, paths) {
  return Promise.all(paths.map(async (path) => {
    const snap = await db.ref(path).get();
    return { path, exists: snap.exists() };
  }));
}

exports.previewDataDeletion = onCall(async (request) => {
  const db = getDatabase();
  await requireAdmin(request.auth, db);

  const uid = clean(request.data?.uid);
  const requestId = clean(request.data?.requestId);
  if (!uid || !requestId) throw new HttpsError('invalid-argument', 'uid와 requestId가 필요합니다.');

  const requestRef = db.ref(`dataDeleteRequests/${uid}/${requestId}`);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists()) throw new HttpsError('not-found', '삭제 요청을 찾을 수 없습니다.');

  const item = requestSnap.val() || {};
  if (item.requestedByUid !== uid) throw new HttpsError('failed-precondition', '요청 UID가 일치하지 않습니다.');
  if (!ALLOWED_TYPES.has(item.requestType)) throw new HttpsError('failed-precondition', '지원하지 않는 요청 유형입니다.');

  const roomCode = clean(item.roomCode);
  const status = clean(item.status) || 'pending';
  const databasePaths = [];
  const storageTargets = [];
  const warnings = [];
  let authTarget = null;

  if (item.requestType === 'account') {
    databasePaths.push(`users/${uid}`, `userRooms/${uid}`, `appRunLogs/${uid}`, `userFavorites/${uid}`);
    authTarget = { uid };
    warnings.push('공동 Room 기록은 자동 삭제 대상에 포함하지 않았습니다.');
  }

  if (item.requestType === 'leave_room') {
    if (!roomCode) throw new HttpsError('failed-precondition', 'Room 코드가 없습니다.');
    databasePaths.push(`userRooms/${uid}/${roomCode}`, `roomMembers/${roomCode}/${uid}`, `users/${uid}/activeRoom`);
    warnings.push('Room 기록, 채팅, 사진과 상대방 데이터는 보존됩니다.');
  }

  if (item.requestType === 'delete_room') {
    if (!roomCode) throw new HttpsError('failed-precondition', 'Room 코드가 없습니다.');
    databasePaths.push(`rooms/${roomCode}`, `roomMembers/${roomCode}`, `ownerNotes/${roomCode}`);
    const membersSnap = await db.ref(`roomMembers/${roomCode}`).get();
    const members = membersSnap.val() || {};
    Object.keys(members).forEach((memberUid) => databasePaths.push(`userRooms/${memberUid}/${roomCode}`));
    storageTargets.push({ path: `roomUploads/${roomCode}/**`, exists: null });
    warnings.push('상대방 동의 확인은 아직 자동화되지 않았습니다. 실제 실행 단계 전에 반드시 확인해야 합니다.');
    warnings.push('Storage 실제 경로는 기존 업로드 구조와 대조 검증이 필요합니다.');
  }

  const databaseTargets = await existence(db, [...new Set(databasePaths)]);
  const previewedAt = Date.now();
  const preview = {
    requestId,
    requestType: item.requestType,
    status,
    targetUid: uid,
    roomCode,
    databaseTargets,
    storageTargets,
    authTarget,
    warnings,
    canExecute: status === 'approved',
    previewedAt,
    previewedByUid: request.auth.uid,
    dryRun: true
  };

  await db.ref(`dataDeletionPreviews/${requestId}`).set(preview);
  return preview;
});
