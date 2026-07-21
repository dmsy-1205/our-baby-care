"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 2, timeoutSeconds: 30, memory: "256MiB" });

const BETA_DELETION_PROJECT_ID = "hearme2nite1205";

function currentProjectId() {
  return String(admin.app().options.projectId || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "");
}

function requireMatchingProject(request, { deletionExecution = false } = {}) {
  const actualProjectId = currentProjectId();
  const expectedProjectId = String(request.data?.expectedProjectId || "").trim();
  if (!actualProjectId || !expectedProjectId || actualProjectId !== expectedProjectId) {
    throw new HttpsError("failed-precondition", "요청 환경과 Functions 프로젝트가 일치하지 않습니다.");
  }
  if (deletionExecution && actualProjectId !== BETA_DELETION_PROJECT_ID) {
    throw new HttpsError("failed-precondition", "실제 영구 삭제는 검증된 테스트 프로젝트에서만 실행할 수 있습니다.");
  }
  return actualProjectId;
}

function isActiveAdminValue(value) {
  if (value === true) return true;
  if (!value || typeof value !== 'object') return false;
  return value.active === true || value.enabled === true || value.role === 'owner' || value.role === 'admin';
}

exports.executeApprovedRoomDisconnect = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const targetUid = String(request.data?.targetUid || "").trim();
  const requestId = String(request.data?.requestId || "").trim();
  if (!targetUid || !requestId) throw new HttpsError("invalid-argument", "대상 UID와 요청 ID가 필요합니다.");

  const db = admin.database();
  const adminSnap = await db.ref(`admins/${callerUid}`).get();
  if (!adminSnap.exists() || !isActiveAdminValue(adminSnap.val())) throw new HttpsError("permission-denied", "활성 관리자 권한이 없습니다.");

  const requestRef = db.ref(`dataDeleteRequests/${targetUid}/${requestId}`);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists()) throw new HttpsError("not-found", "삭제 요청을 찾을 수 없습니다.");

  const item = requestSnap.val() || {};
  if (item.requestedByUid !== targetUid) throw new HttpsError("failed-precondition", "요청 사용자 정보가 일치하지 않습니다.");
  if (item.requestType !== "leave_room") throw new HttpsError("failed-precondition", "Room 연결 해제 요청이 아닙니다.");
  if (!item.roomCode || typeof item.roomCode !== "string") throw new HttpsError("failed-precondition", "Room 코드가 없습니다.");
  if (item.status === "completed") return { ok: true, alreadyCompleted: true, roomCode: item.roomCode };
  if (item.status !== "approved") throw new HttpsError("failed-precondition", "승인된 요청만 실행할 수 있습니다.");

  const roomCode = item.roomCode;
  const now = Date.now();
  await requestRef.update({
    status: "processing",
    processingAt: admin.database.ServerValue.TIMESTAMP,
    processedByUid: callerUid,
    updatedAt: admin.database.ServerValue.TIMESTAMP,
    adminMessage: "승인된 Room 연결 해제를 처리하고 있습니다."
  });

  try {
    const activeRoomSnap = await db.ref(`users/${targetUid}/activeRoom`).get();
    const updates = {};
    updates[`userRooms/${targetUid}/${roomCode}`] = null;
    updates[`roomMembers/${roomCode}/${targetUid}`] = null;
    if (activeRoomSnap.val() === roomCode) updates[`users/${targetUid}/activeRoom`] = null;
    updates[`dataDeleteRequests/${targetUid}/${requestId}/status`] = "completed";
    updates[`dataDeleteRequests/${targetUid}/${requestId}/completedAt`] = now;
    updates[`dataDeleteRequests/${targetUid}/${requestId}/updatedAt`] = now;
    updates[`dataDeleteRequests/${targetUid}/${requestId}/adminMessage`] = "현재 Room 연결 해제가 완료되었습니다. 공동 Room 기록은 보존됩니다.";
    updates[`dataDeletionLogs/${requestId}`] = {
      requestId,
      requestType: "leave_room",
      targetUid,
      roomCode,
      processedByUid: callerUid,
      status: "completed",
      completedAt: now,
      deletedPaths: [
        `userRooms/${targetUid}/${roomCode}`,
        `roomMembers/${roomCode}/${targetUid}`,
        ...(activeRoomSnap.val() === roomCode ? [`users/${targetUid}/activeRoom`] : [])
      ]
    };
    await db.ref().update(updates);
    return { ok: true, roomCode, completedAt: now };
  } catch (error) {
    console.error("executeApprovedRoomDisconnect failed", { targetUid, requestId, roomCode, error });
    await requestRef.update({
      status: "failed",
      failedAt: admin.database.ServerValue.TIMESTAMP,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
      adminMessage: "Room 연결 해제 처리 중 오류가 발생했습니다. 관리자가 다시 확인하고 있습니다.",
      failureCode: String(error?.code || "internal").slice(0, 120)
    });
    throw new HttpsError("internal", "Room 연결 해제 처리에 실패했습니다.");
  }
});

async function requireAdminCaller(request) {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const snapshot = await admin.database().ref(`admins/${callerUid}`).get();
  if (!snapshot.exists() || !isActiveAdminValue(snapshot.val())) throw new HttpsError("permission-denied", "활성 관리자 권한이 없습니다.");
  return { uid: callerUid, email: String(request.auth?.token?.email || "") };
}

function countChildren(snapshot) {
  return snapshot.exists() ? snapshot.numChildren() : 0;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function snapshotChecksum(payload) {
  return crypto.createHash("sha256").update(stableStringify(payload)).digest("hex");
}

function encodeSnapshotValue(value) {
  if (value === null || value === undefined) return { __hmSnapshotType: "null" };
  if (Array.isArray(value)) {
    return value.length ? value.map(encodeSnapshotValue) : { __hmSnapshotType: "empty_array" };
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) return { __hmSnapshotType: "empty_object" };
    return Object.fromEntries(keys.map((key) => [key, encodeSnapshotValue(value[key])]));
  }
  return value;
}

function decodeSnapshotValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && value.__hmSnapshotType) {
    if (value.__hmSnapshotType === "empty_object") return {};
    if (value.__hmSnapshotType === "empty_array") return [];
    return null;
  }
  if (Array.isArray(value)) return value.map(decodeSnapshotValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decodeSnapshotValue(child)]));
  }
  return value;
}

function valuesEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function compareRestoreValue(path, backupValue, currentValue, result) {
  if (result.samples.length >= 200 && result.scanned >= 5000) return;
  result.scanned += 1;
  if (valuesEqual(backupValue, currentValue)) {
    result.unchanged += 1;
    return;
  }
  const backupObject = backupValue && typeof backupValue === "object" && !Array.isArray(backupValue);
  const currentObject = currentValue && typeof currentValue === "object" && !Array.isArray(currentValue);
  if (backupObject && currentObject) {
    const keys = new Set([...Object.keys(backupValue), ...Object.keys(currentValue)]);
    for (const key of keys) {
      if (!(key in backupValue)) continue;
      compareRestoreValue(`${path}/${key}`, backupValue[key], currentValue[key], result);
      if (result.scanned >= 5000) break;
    }
    return;
  }
  const action = currentValue === undefined || currentValue === null ? "create" : "overwrite";
  result[action] += 1;
  if (result.samples.length < 200) result.samples.push({ path, action });
}

function restoreRoots(payload) {
  const decoded = decodeSnapshotValue(payload);
  if (decoded.requestType === "delete_room") {
    return [
      { path: `rooms/${decoded.roomCode}`, value: decoded.data?.room },
      { path: `roomMembers/${decoded.roomCode}`, value: decoded.data?.roomMembers },
      { path: `ownerNotes/${decoded.roomCode}`, value: decoded.data?.ownerNotes },
      ...Object.entries(decoded.data?.userRoomLinks || {}).map(([uid, value]) => ({ path: `userRooms/${uid}/${decoded.roomCode}`, value })),
      ...Object.entries(decoded.data?.invites || {}).map(([inviteCode, value]) => ({ path: `invites/${inviteCode}`, value }))
    ].filter((item) => item.value !== null && item.value !== undefined);
  }
  return [
    { path: `users/${decoded.targetUid}`, value: decoded.data?.user },
    { path: `userRooms/${decoded.targetUid}`, value: decoded.data?.userRooms },
    ...Object.entries(decoded.data?.memberships || {}).map(([roomCode, value]) => ({ path: `roomMembers/${roomCode}/${decoded.targetUid}`, value })),
    ...Object.entries(decoded.data?.privateRoots || {}).map(([rootName, value]) => ({ path: `${rootName}/${decoded.targetUid}`, value })),
    ...Object.entries(decoded.data?.auxiliaryRoots || {}).flatMap(([rootName, entries]) => Object.entries(entries || {}).map(([id, value]) => ({ path: `${rootName}/${id}`, value })))
  ].filter((item) => item.value !== null && item.value !== undefined);
}

async function readDeletionRequest(db, targetUid, requestId) {
  const ref = db.ref(`dataDeleteRequests/${targetUid}/${requestId}`);
  const snap = await ref.get();
  if (!snap.exists()) throw new HttpsError("not-found", "삭제 요청을 찾을 수 없습니다.");
  const item = snap.val() || {};
  if (item.requestedByUid !== targetUid) throw new HttpsError("failed-precondition", "요청 사용자 정보가 일치하지 않습니다.");
  if (!['account', 'delete_room'].includes(item.requestType)) throw new HttpsError("failed-precondition", "백업 대상 요청이 아닙니다.");
  if (item.status !== "approved") throw new HttpsError("failed-precondition", "승인 상태인 요청만 백업할 수 있습니다.");
  return item;
}

async function buildDeletionSnapshot(db, targetUid, item) {
  const roomCode = String(item.roomCode || "").trim();
  if (item.requestType === "delete_room") {
    if (!roomCode) throw new HttpsError("failed-precondition", "Room 코드가 없습니다.");
    const [roomSnap, membersSnap, ownerNotesSnap, invitesSnap] = await Promise.all([
      db.ref(`rooms/${roomCode}`).get(), db.ref(`roomMembers/${roomCode}`).get(),
      db.ref(`ownerNotes/${roomCode}`).get(), db.ref('invites').get()
    ]);
    const members = membersSnap.val() || {};
    const userRoomLinks = {};
    await Promise.all(Object.keys(members).map(async (uid) => {
      const linkSnap = await db.ref(`userRooms/${uid}/${roomCode}`).get();
      userRoomLinks[uid] = linkSnap.val() ?? null;
    }));
    const invites = Object.fromEntries(Object.entries(invitesSnap.val() || {}).filter(([, invite]) => invite?.roomCode === roomCode));
    return {
      schemaVersion: 2, requestType: item.requestType, targetUid, roomCode,
      capturedPaths: [`rooms/${roomCode}`, `roomMembers/${roomCode}`, `ownerNotes/${roomCode}`, ...Object.keys(userRoomLinks).map((uid) => `userRooms/${uid}/${roomCode}`), ...Object.keys(invites).map((code) => `invites/${code}`)],
      data: { room: roomSnap.val() ?? null, roomMembers: membersSnap.val() ?? null, ownerNotes: ownerNotesSnap.val() ?? null, userRoomLinks, invites }
    };
  }

  const privateRootNames = ['supportTickets', 'supportReplies', 'supportUserMessages', 'supportRatings', 'supportNotifications'];
  const [userSnap, userRoomsSnap, ...remainingSnaps] = await Promise.all([
    db.ref(`users/${targetUid}`).get(), db.ref(`userRooms/${targetUid}`).get(),
    ...privateRootNames.map((rootName) => db.ref(`${rootName}/${targetUid}`).get()),
    db.ref('supportInternalNotes').get(), db.ref('supportIncidents').get(), db.ref('supportIncidentEvents').get()
  ]);
  const privateSnaps = remainingSnaps.slice(0, privateRootNames.length);
  const [notesSnap, incidentsSnap, eventsSnap] = remainingSnaps.slice(privateRootNames.length);
  const ticketIds = new Set(Object.keys(privateSnaps[0].val() || {}));
  const internalNotes = Object.fromEntries(Object.entries(notesSnap.val() || {}).filter(([id, note]) => note?.ownerUid === targetUid || ticketIds.has(id)));
  const incidents = Object.fromEntries(Object.entries(incidentsSnap.val() || {}).filter(([, incident]) => incident?.ownerUid === targetUid));
  const incidentEvents = Object.fromEntries(Object.keys(incidents).map((id) => [id, eventsSnap.val()?.[id] ?? null]));
  const auxiliaryRoots = { supportInternalNotes: internalNotes, supportIncidents: incidents, supportIncidentEvents: incidentEvents };
  const linkedRooms = userRoomsSnap.val() || {};
  const memberships = {};
  await Promise.all(Object.keys(linkedRooms).map(async (roomCodeValue) => {
    const memberSnap = await db.ref(`roomMembers/${roomCodeValue}/${targetUid}`).get();
    memberships[roomCodeValue] = memberSnap.val() ?? null;
  }));
  return {
    schemaVersion: 2, requestType: item.requestType, targetUid, roomCode,
    capturedPaths: [`users/${targetUid}`, `userRooms/${targetUid}`, ...Object.keys(linkedRooms).map((code) => `roomMembers/${code}/${targetUid}`), ...privateRootNames.map((name) => `${name}/${targetUid}`), ...Object.entries(auxiliaryRoots).flatMap(([name, entries]) => Object.keys(entries).map((id) => `${name}/${id}`))],
    data: { user: userSnap.val() ?? null, userRooms: linkedRooms, memberships, privateRoots: Object.fromEntries(privateRootNames.map((name, index) => [name, privateSnaps[index].val() ?? null])), auxiliaryRoots }
  };
}

// STEP A14.1: creates an in-project operational snapshot and verifies its SHA-256 checksum.
// This is not an off-site disaster recovery backup and never deletes source data.
exports.createDeletionBackup = onCall(async (request) => {
  const caller = await requireAdminCaller(request);
  const targetUid = String(request.data?.targetUid || "").trim();
  const requestId = String(request.data?.requestId || "").trim();
  if (!targetUid || !requestId) throw new HttpsError("invalid-argument", "대상 UID와 요청 ID가 필요합니다.");
  const db = admin.database();
  const item = await readDeletionRequest(db, targetUid, requestId);
  const payload = encodeSnapshotValue(await buildDeletionSnapshot(db, targetUid, item));
  const serialized = stableStringify(payload);
  const sizeBytes = Buffer.byteLength(serialized, "utf8");
  if (sizeBytes > 4 * 1024 * 1024) throw new HttpsError("resource-exhausted", "스냅샷이 4MB를 초과해 외부 백업이 필요합니다.");

  const now = Date.now();
  const checksum = snapshotChecksum(payload);
  const snapshotRef = db.ref(`dataBackupSnapshots/${requestId}`);
  const registryRef = db.ref(`dataBackups/${requestId}`);
  await registryRef.set({
    requestId, requestType: item.requestType, targetUid, roomCode: payload.roomCode,
    status: "verifying", storageClass: "in_project_snapshot", checksumAlgorithm: "sha256",
    checksum, sizeBytes, pathCount: payload.capturedPaths.length,
    createdAt: now, createdByUid: caller.uid, updatedAt: now
  });
  await snapshotRef.set({ payload, checksum, createdAt: now, createdByUid: caller.uid });
  const writtenSnap = await snapshotRef.get();
  const written = writtenSnap.val() || {};
  const verified = written.checksum === checksum && snapshotChecksum(written.payload) === checksum;
  await registryRef.update({
    status: verified ? "verified" : "failed", verifiedAt: verified ? Date.now() : null,
    verifiedByUid: caller.uid, updatedAt: Date.now()
  });
  await db.ref(`adminAuditLogs/${now}_${requestId}_backup`).set({
    action: verified ? "deletion_backup_verified" : "deletion_backup_failed",
    requestId, targetUid, requestType: item.requestType, adminUid: caller.uid,
    sizeBytes, checksum, storageClass: "in_project_snapshot", createdAt: now
  });
  if (!verified) throw new HttpsError("data-loss", "백업 무결성 검증에 실패했습니다.");
  return { ok: true, requestId, status: "verified", checksum, sizeBytes, pathCount: payload.capturedPaths.length };
});

exports.verifyDeletionBackup = onCall(async (request) => {
  const caller = await requireAdminCaller(request);
  const requestId = String(request.data?.requestId || "").trim();
  if (!requestId) throw new HttpsError("invalid-argument", "요청 ID가 필요합니다.");
  const db = admin.database();
  const [snapshotSnap, registrySnap] = await Promise.all([
    db.ref(`dataBackupSnapshots/${requestId}`).get(), db.ref(`dataBackups/${requestId}`).get()
  ]);
  if (!snapshotSnap.exists() || !registrySnap.exists()) throw new HttpsError("not-found", "백업 스냅샷 또는 등록 정보를 찾을 수 없습니다.");
  const snapshot = snapshotSnap.val() || {};
  const registry = registrySnap.val() || {};
  const checksum = snapshotChecksum(snapshot.payload);
  const verified = checksum === snapshot.checksum && checksum === registry.checksum;
  const now = Date.now();
  await db.ref(`dataBackups/${requestId}`).update({
    status: verified ? "verified" : "failed", verifiedAt: verified ? now : null,
    verifiedByUid: caller.uid, updatedAt: now
  });
  await db.ref(`adminAuditLogs/${now}_${requestId}_backup_verify`).set({
    action: verified ? "deletion_backup_reverified" : "deletion_backup_integrity_failed",
    requestId, adminUid: caller.uid, checksum, createdAt: now
  });
  return { ok: verified, requestId, status: verified ? "verified" : "failed", checksum };
});

// STEP A14.2: compares a verified snapshot with live data and stores only a restore plan.
exports.generateRestoreDryRun = onCall(async (request) => {
  const caller = await requireAdminCaller(request);
  const requestId = String(request.data?.requestId || "").trim();
  if (!requestId) throw new HttpsError("invalid-argument", "요청 ID가 필요합니다.");
  const db = admin.database();
  const [snapshotSnap, registrySnap] = await Promise.all([
    db.ref(`dataBackupSnapshots/${requestId}`).get(), db.ref(`dataBackups/${requestId}`).get()
  ]);
  if (!snapshotSnap.exists() || !registrySnap.exists()) throw new HttpsError("not-found", "검증 가능한 백업을 찾을 수 없습니다.");
  const stored = snapshotSnap.val() || {};
  const registry = registrySnap.val() || {};
  const checksum = snapshotChecksum(stored.payload);
  if (registry.status !== "verified" || checksum !== stored.checksum || checksum !== registry.checksum) {
    throw new HttpsError("data-loss", "백업 체크섬이 일치하지 않아 복구 계획을 만들 수 없습니다.");
  }

  const roots = restoreRoots(stored.payload);
  const result = { scanned: 0, create: 0, overwrite: 0, unchanged: 0, samples: [] };
  for (const root of roots) {
    const currentSnap = await db.ref(root.path).get();
    compareRestoreValue(root.path, root.value, currentSnap.exists() ? currentSnap.val() : undefined, result);
  }
  const risk = result.overwrite > 0 ? "review_required" : result.create > 0 ? "restorable" : "no_changes";
  const now = Date.now();
  const plan = {
    requestId, targetUid: registry.targetUid || "", requestType: registry.requestType || "",
    roomCode: registry.roomCode || "", status: "dry_run_complete", risk,
    checksum, backupVerified: true, restoreExecutionEnabled: false,
    rootPaths: roots.map((item) => item.path), summary: result,
    createdByUid: caller.uid, createdAt: now, updatedAt: now
  };
  await db.ref(`restorePlans/${requestId}`).set(plan);
  await db.ref(`adminAuditLogs/${now}_${requestId}_restore_dry_run`).set({
    action: "restore_dry_run_completed", requestId, adminUid: caller.uid,
    risk, createCount: result.create, overwriteCount: result.overwrite,
    unchangedCount: result.unchanged, restoreExecutionEnabled: false, createdAt: now
  });
  return { ok: true, plan };
});

// STEP A14.3 scaffold: deliberately hard-locked until test-room recovery approval.
exports.executeControlledRestore = onCall(async (request) => {
  await requireAdminCaller(request);
  const requestId = String(request.data?.requestId || "").trim();
  if (!requestId) throw new HttpsError("invalid-argument", "요청 ID가 필요합니다.");
  throw new HttpsError("failed-precondition", "통제 복구 실행은 현재 서버에서 잠겨 있습니다. Dry Run 결과만 확인할 수 있습니다.");
});

// STEP A14.4: registers evidence of an external backup. It does not claim the file is verified.
exports.registerExternalBackupEvidence = onCall(async (request) => {
  const caller = await requireAdminCaller(request);
  const requestId = String(request.data?.requestId || "").trim();
  const provider = String(request.data?.provider || "").trim();
  const objectRef = String(request.data?.objectRef || "").trim();
  const checksum = String(request.data?.checksum || "").trim().toLowerCase();
  const capturedAt = Number(request.data?.capturedAt || 0);
  if (!requestId || !['google_cloud_storage', 'firebase_export', 'manual_export'].includes(provider)) {
    throw new HttpsError("invalid-argument", "요청 ID와 허용된 외부 백업 방식을 입력해 주세요.");
  }
  if (!objectRef || objectRef.length > 500 || !/^[a-f0-9]{64}$/.test(checksum) || !capturedAt) {
    throw new HttpsError("invalid-argument", "외부 객체 위치, SHA-256 체크섬과 생성 시각이 필요합니다.");
  }
  const db = admin.database();
  const backupSnap = await db.ref(`dataBackups/${requestId}`).get();
  if (!backupSnap.exists()) throw new HttpsError("failed-precondition", "먼저 프로젝트 내부 백업을 생성해 주세요.");
  const now = Date.now();
  const evidence = {
    requestId, provider, objectRef, checksum, capturedAt,
    status: "evidence_registered", verification: "manual_review_required",
    registeredByUid: caller.uid, registeredAt: now, updatedAt: now
  };
  await db.ref(`externalBackupRegistry/${requestId}`).set(evidence);
  await db.ref(`adminAuditLogs/${now}_${requestId}_external_backup`).set({
    action: "external_backup_evidence_registered", requestId, provider,
    adminUid: caller.uid, createdAt: now
  });
  return { ok: true, evidence };
});

// STEP A13.1: builds a server-side deletion preflight. It never deletes data.
exports.prepareDeletionAction = onCall(async (request) => {
  const caller = await requireAdminCaller(request);
  const projectId = requireMatchingProject(request);
  const targetUid = String(request.data?.targetUid || "").trim();
  const requestId = String(request.data?.requestId || "").trim();
  if (!targetUid || !requestId) throw new HttpsError("invalid-argument", "대상 UID와 요청 ID가 필요합니다.");

  const db = admin.database();
  const requestRef = db.ref(`dataDeleteRequests/${targetUid}/${requestId}`);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists()) throw new HttpsError("not-found", "삭제 요청을 찾을 수 없습니다.");
  const item = requestSnap.val() || {};
  if (item.requestedByUid !== targetUid) throw new HttpsError("failed-precondition", "요청 사용자 정보가 일치하지 않습니다.");
  if (!['account', 'delete_room'].includes(item.requestType)) throw new HttpsError("failed-precondition", "승인형 삭제 엔진 대상 요청이 아닙니다.");
  if (item.status !== "approved") throw new HttpsError("failed-precondition", "승인 상태인 요청만 사전점검할 수 있습니다.");

  const roomCode = String(item.roomCode || "").trim();
  const [userSnap, userRoomsSnap, roomSnap, membersSnap, backupSnap] = await Promise.all([
    db.ref(`users/${targetUid}`).get(),
    db.ref(`userRooms/${targetUid}`).get(),
    roomCode ? db.ref(`rooms/${roomCode}`).get() : Promise.resolve(null),
    roomCode ? db.ref(`roomMembers/${roomCode}`).get() : Promise.resolve(null),
    db.ref(`dataBackups/${requestId}`).get()
  ]);
  const backup = backupSnap.val() || {};
  const backupVerified = backup.status === "verified" && Number(backup.verifiedAt || 0) > 0;
  const preflight = {
    requestStillApproved: true,
    targetUserExists: userSnap.exists(),
    linkedRoomCount: countChildren(userRoomsSnap),
    targetRoomExists: Boolean(roomSnap?.exists()),
    targetRoomMemberCount: countChildren(membersSnap),
    backupVerified,
    partnerConsentConfirmed: item.requestType !== "delete_room" || item.partnerConsentConfirmed === true,
    executionEnabled: false
  };
  const blockers = [];
  if (!backupVerified) blockers.push("backup_not_verified");
  if (!preflight.partnerConsentConfirmed) blockers.push("partner_consent_missing");

  const now = Date.now();
  const readyForSecondApproval = backupVerified && preflight.partnerConsentConfirmed;
  const action = {
    requestId, requestType: item.requestType, targetUid, roomCode, projectId,
    status: readyForSecondApproval ? "awaiting_second_approval" : "awaiting_backup", executionEnabled: false,
    preflight, blockers,
    firstApproval: { uid: caller.uid, email: caller.email, approvedAt: now },
    createdAt: now, updatedAt: now
  };
  await db.ref(`deletionActionQueue/${requestId}`).set(action);
  await db.ref(`adminAuditLogs/${now}_${requestId}_preflight`).set({
    action: "deletion_preflight_created", requestId, targetUid,
    requestType: item.requestType, adminUid: caller.uid, projectId, createdAt: now,
    backupVerified, executionEnabled: false
  });
  return { ok: true, action };
});

// Records an independent second approval only after backup verification.
exports.approveDeletionAction = onCall(async (request) => {
  const caller = await requireAdminCaller(request);
  const projectId = requireMatchingProject(request);
  const requestId = String(request.data?.requestId || "").trim();
  if (!requestId) throw new HttpsError("invalid-argument", "요청 ID가 필요합니다.");
  const db = admin.database();
  const actionRef = db.ref(`deletionActionQueue/${requestId}`);
  const actionSnap = await actionRef.get();
  if (!actionSnap.exists()) throw new HttpsError("not-found", "승인 대기 작업을 찾을 수 없습니다.");
  const action = actionSnap.val() || {};
  if (action.projectId !== projectId) throw new HttpsError("failed-precondition", "사전점검 환경이 현재 프로젝트와 일치하지 않습니다. 사전점검을 다시 실행해 주세요.");
  if (action.status !== "awaiting_second_approval" || action.preflight?.partnerConsentConfirmed !== true) {
    throw new HttpsError("failed-precondition", "백업과 상대방 동의 확인을 포함한 사전점검을 먼저 통과해야 합니다.");
  }
  if (action.firstApproval?.uid === caller.uid) throw new HttpsError("failed-precondition", "첫 승인자와 다른 관리자가 확인해야 합니다.");

  const backupSnap = await db.ref(`dataBackups/${requestId}`).get();
  const backup = backupSnap.val() || {};
  if (backup.status !== "verified" || !Number(backup.verifiedAt || 0)) {
    throw new HttpsError("failed-precondition", "검증된 백업이 없어 승인할 수 없습니다.");
  }
  const now = Date.now();
  await actionRef.update({
    status: "ready_for_execution", backupVerified: true,
    secondApproval: { uid: caller.uid, email: caller.email, approvedAt: now },
    executionEnabled: true, updatedAt: now
  });
  await db.ref(`adminAuditLogs/${now}_${requestId}_second_approval`).set({
    action: "deletion_second_approval_recorded", requestId,
    targetUid: action.targetUid || "", adminUid: caller.uid, projectId,
    createdAt: now, executionEnabled: true
  });
  return { ok: true, status: "ready_for_execution", executionEnabled: true };
});

// STEP A17.1: executes a backed-up, independently approved deletion request.
exports.executeDeletionAction = onCall({ timeoutSeconds: 120, memory: "512MiB" }, async (request) => {
  const caller = await requireAdminCaller(request);
  const projectId = requireMatchingProject(request, { deletionExecution: true });
  const requestId = String(request.data?.requestId || "").trim();
  const confirmation = String(request.data?.confirmation || "").trim();
  if (!requestId || confirmation !== `DELETE ${requestId}`) {
    throw new HttpsError("invalid-argument", "삭제 확인 문구가 일치하지 않습니다.");
  }

  const db = admin.database();
  const actionRef = db.ref(`deletionActionQueue/${requestId}`);
  const [actionSnap, backupSnap, snapshotSnap] = await Promise.all([
    actionRef.get(), db.ref(`dataBackups/${requestId}`).get(), db.ref(`dataBackupSnapshots/${requestId}`).get()
  ]);
  if (!actionSnap.exists()) throw new HttpsError("not-found", "삭제 대기 작업을 찾을 수 없습니다.");
  const action = actionSnap.val() || {};
  const backup = backupSnap.val() || {};
  const stored = snapshotSnap.val() || {};
  if (action.status === "completed") return { ok: true, alreadyCompleted: true, requestId };
  if (action.projectId !== projectId) {
    throw new HttpsError("failed-precondition", "삭제 대기열의 프로젝트 정보가 현재 실행 환경과 일치하지 않습니다.");
  }
  if (action.status !== "ready_for_execution" || action.executionEnabled !== true || !action.secondApproval?.uid) {
    throw new HttpsError("failed-precondition", "백업 및 2차 승인이 완료된 작업만 실행할 수 있습니다.");
  }
  if (action.firstApproval?.uid === action.secondApproval?.uid) {
    throw new HttpsError("failed-precondition", "1차 승인자와 2차 승인자가 같을 수 없습니다.");
  }
  const checksum = snapshotChecksum(stored.payload);
  const decodedForVersion = decodeSnapshotValue(stored.payload);
  if (Number(decodedForVersion.schemaVersion || 0) < 2) {
    throw new HttpsError("failed-precondition", "A17.1 범위로 백업을 다시 생성하고 검증해 주세요.");
  }
  if (backup.status !== "verified" || checksum !== backup.checksum || checksum !== stored.checksum) {
    throw new HttpsError("data-loss", "실행 직전 백업 무결성 검증에 실패했습니다.");
  }

  const targetUid = String(action.targetUid || "");
  const roomCode = String(action.roomCode || "");
  const requestRef = db.ref(`dataDeleteRequests/${targetUid}/${requestId}`);
  const requestSnap = await requestRef.get();
  const item = requestSnap.val() || {};
  if (!requestSnap.exists() || item.status !== "approved" || item.requestType !== action.requestType) {
    throw new HttpsError("failed-precondition", "원본 삭제 요청 상태가 변경되었습니다.");
  }
  if (action.requestType === "account") {
    const targetAdminSnap = await db.ref(`admins/${targetUid}`).get();
    if (targetAdminSnap.exists()) throw new HttpsError("failed-precondition", "관리자 계정은 이 기능으로 삭제할 수 없습니다.");
  }

  const now = Date.now();
  await actionRef.update({ status: "processing", executionEnabled: false, processingAt: now, executedByUid: caller.uid, updatedAt: now });
  await requestRef.update({ status: "processing", processingAt: now, updatedAt: now, processedByUid: caller.uid });

  try {
    const payload = decodeSnapshotValue(stored.payload);
    const updates = {};
    const deletedPaths = [];
    if (action.requestType === "delete_room") {
      if (!roomCode || payload.roomCode !== roomCode) throw new Error("room_snapshot_mismatch");
      [`rooms/${roomCode}`, `roomMembers/${roomCode}`, `ownerNotes/${roomCode}`].forEach((path) => { updates[path] = null; deletedPaths.push(path); });
      const memberIds = Object.keys(payload.data?.userRoomLinks || {});
      const activeRoomValues = await Promise.all(memberIds.map((uid) => db.ref(`users/${uid}/activeRoom`).get()));
      memberIds.forEach((uid, index) => {
        updates[`userRooms/${uid}/${roomCode}`] = null;
        deletedPaths.push(`userRooms/${uid}/${roomCode}`);
        if (activeRoomValues[index].val() === roomCode) {
          updates[`users/${uid}/activeRoom`] = null;
          deletedPaths.push(`users/${uid}/activeRoom`);
        }
      });
      Object.keys(payload.data?.invites || {}).forEach((code) => { updates[`invites/${code}`] = null; deletedPaths.push(`invites/${code}`); });
    } else if (action.requestType === "account") {
      if (!targetUid || payload.targetUid !== targetUid) throw new Error("account_snapshot_mismatch");
      [`users/${targetUid}`, `userRooms/${targetUid}`, 'supportTickets', 'supportReplies', 'supportUserMessages', 'supportRatings', 'supportNotifications'].forEach((path) => {
        const fullPath = path.includes('/') ? path : `${path}/${targetUid}`;
        updates[fullPath] = null;
        deletedPaths.push(fullPath);
      });
      Object.keys(payload.data?.memberships || {}).forEach((code) => { updates[`roomMembers/${code}/${targetUid}`] = null; deletedPaths.push(`roomMembers/${code}/${targetUid}`); });
      Object.entries(payload.data?.auxiliaryRoots || {}).forEach(([rootName, entries]) => {
        Object.keys(entries || {}).forEach((id) => { updates[`${rootName}/${id}`] = null; deletedPaths.push(`${rootName}/${id}`); });
      });
      deletedPaths.push(`storage/profiles/${targetUid}/avatar.webp`);
    } else {
      throw new Error("unsupported_request_type");
    }

    updates[`dataDeleteRequests/${targetUid}/${requestId}/status`] = "completed";
    updates[`dataDeleteRequests/${targetUid}/${requestId}/completedAt`] = now;
    updates[`dataDeleteRequests/${targetUid}/${requestId}/updatedAt`] = now;
    updates[`dataDeleteRequests/${targetUid}/${requestId}/requestedByEmail`] = "deleted-user";
    updates[`dataDeleteRequests/${targetUid}/${requestId}/adminMessage`] = "요청된 데이터 삭제가 완료되었습니다.";
    updates[`deletionActionQueue/${requestId}/status`] = "completed";
    updates[`deletionActionQueue/${requestId}/completedAt`] = now;
    updates[`deletionActionQueue/${requestId}/executionEnabled`] = false;
    updates[`deletionActionQueue/${requestId}/updatedAt`] = now;
    updates[`dataDeletionLogs/${requestId}`] = {
      requestId, requestType: action.requestType, targetUid, roomCode,
      status: "completed", processedByUid: caller.uid, projectId, completedAt: now,
      backupChecksum: checksum, deletedPaths
    };
    updates[`adminAuditLogs/${now}_${requestId}_executed`] = {
      action: "permanent_deletion_executed", requestId, requestType: action.requestType,
      targetUid, roomCode, adminUid: caller.uid, projectId, backupChecksum: checksum,
      deletedPathCount: deletedPaths.length, createdAt: now
    };
    await db.ref().update(updates);

    if (action.requestType === "account") {
      await admin.storage().bucket().file(`profiles/${targetUid}/avatar.webp`).delete({ ignoreNotFound: true });
      try {
        await admin.auth().deleteUser(targetUid);
      } catch (authError) {
        if (authError?.code !== 'auth/user-not-found') throw authError;
      }
    }
    return { ok: true, requestId, requestType: action.requestType, completedAt: now, deletedPathCount: deletedPaths.length };
  } catch (error) {
    console.error("executeDeletionAction failed", { requestId, targetUid, roomCode, error });
    const failedAt = Date.now();
    await actionRef.update({ status: "failed", executionEnabled: false, failedAt, updatedAt: failedAt, failureCode: String(error?.code || error?.message || 'internal').slice(0, 120) });
    await requestRef.update({ status: "failed", failedAt, updatedAt: failedAt, adminMessage: "삭제 실행 중 오류가 발생했습니다. 백업을 보존한 상태로 관리자가 확인하고 있습니다." });
    throw new HttpsError("internal", "삭제 실행에 실패했습니다. 백업과 감사 기록을 확인해 주세요.");
  }
});
