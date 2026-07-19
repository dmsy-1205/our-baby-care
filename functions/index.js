"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("node:crypto");

admin.initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 2, timeoutSeconds: 30, memory: "256MiB" });

exports.executeApprovedRoomDisconnect = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const targetUid = String(request.data?.targetUid || "").trim();
  const requestId = String(request.data?.requestId || "").trim();
  if (!targetUid || !requestId) throw new HttpsError("invalid-argument", "대상 UID와 요청 ID가 필요합니다.");

  const db = admin.database();
  const adminSnap = await db.ref(`admins/${callerUid}`).get();
  if (!adminSnap.exists()) throw new HttpsError("permission-denied", "관리자 권한이 없습니다.");

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
  if (!snapshot.exists()) throw new HttpsError("permission-denied", "관리자 권한이 없습니다.");
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
      { path: `roomMembers/${decoded.roomCode}`, value: decoded.data?.roomMembers }
    ].filter((item) => item.value !== null && item.value !== undefined);
  }
  return [
    { path: `users/${decoded.targetUid}`, value: decoded.data?.user },
    { path: `userRooms/${decoded.targetUid}`, value: decoded.data?.userRooms },
    ...Object.entries(decoded.data?.memberships || {}).map(([roomCode, value]) => ({ path: `roomMembers/${roomCode}/${decoded.targetUid}`, value }))
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
    const [roomSnap, membersSnap] = await Promise.all([
      db.ref(`rooms/${roomCode}`).get(), db.ref(`roomMembers/${roomCode}`).get()
    ]);
    return {
      schemaVersion: 1, requestType: item.requestType, targetUid, roomCode,
      capturedPaths: [`rooms/${roomCode}`, `roomMembers/${roomCode}`],
      data: { room: roomSnap.val() ?? null, roomMembers: membersSnap.val() ?? null }
    };
  }

  const [userSnap, userRoomsSnap] = await Promise.all([
    db.ref(`users/${targetUid}`).get(), db.ref(`userRooms/${targetUid}`).get()
  ]);
  const linkedRooms = userRoomsSnap.val() || {};
  const memberships = {};
  await Promise.all(Object.keys(linkedRooms).map(async (roomCodeValue) => {
    const memberSnap = await db.ref(`roomMembers/${roomCodeValue}/${targetUid}`).get();
    memberships[roomCodeValue] = memberSnap.val() ?? null;
  }));
  return {
    schemaVersion: 1, requestType: item.requestType, targetUid, roomCode,
    capturedPaths: [`users/${targetUid}`, `userRooms/${targetUid}`, ...Object.keys(linkedRooms).map((code) => `roomMembers/${code}/${targetUid}`)],
    data: { user: userSnap.val() ?? null, userRooms: linkedRooms, memberships }
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
  blockers.push("permanent_deletion_disabled");

  const now = Date.now();
  const readyForSecondApproval = backupVerified && preflight.partnerConsentConfirmed;
  const action = {
    requestId, requestType: item.requestType, targetUid, roomCode,
    status: readyForSecondApproval ? "awaiting_second_approval" : "awaiting_backup", executionEnabled: false,
    preflight, blockers,
    firstApproval: { uid: caller.uid, email: caller.email, approvedAt: now },
    createdAt: now, updatedAt: now
  };
  await db.ref(`deletionActionQueue/${requestId}`).set(action);
  await db.ref(`adminAuditLogs/${now}_${requestId}_preflight`).set({
    action: "deletion_preflight_created", requestId, targetUid,
    requestType: item.requestType, adminUid: caller.uid, createdAt: now,
    backupVerified, executionEnabled: false
  });
  return { ok: true, action };
});

// Records an independent second approval only after backup verification.
// Permanent deletion remains hard-disabled until a later audited release.
exports.approveDeletionAction = onCall(async (request) => {
  const caller = await requireAdminCaller(request);
  const requestId = String(request.data?.requestId || "").trim();
  if (!requestId) throw new HttpsError("invalid-argument", "요청 ID가 필요합니다.");
  const db = admin.database();
  const actionRef = db.ref(`deletionActionQueue/${requestId}`);
  const actionSnap = await actionRef.get();
  if (!actionSnap.exists()) throw new HttpsError("not-found", "승인 대기 작업을 찾을 수 없습니다.");
  const action = actionSnap.val() || {};
  if (action.firstApproval?.uid === caller.uid) throw new HttpsError("failed-precondition", "첫 승인자와 다른 관리자가 확인해야 합니다.");

  const backupSnap = await db.ref(`dataBackups/${requestId}`).get();
  const backup = backupSnap.val() || {};
  if (backup.status !== "verified" || !Number(backup.verifiedAt || 0)) {
    throw new HttpsError("failed-precondition", "검증된 백업이 없어 승인할 수 없습니다.");
  }
  const now = Date.now();
  await actionRef.update({
    status: "approved_execution_locked", backupVerified: true,
    secondApproval: { uid: caller.uid, email: caller.email, approvedAt: now },
    executionEnabled: false, updatedAt: now
  });
  await db.ref(`adminAuditLogs/${now}_${requestId}_second_approval`).set({
    action: "deletion_second_approval_recorded", requestId,
    targetUid: action.targetUid || "", adminUid: caller.uid,
    createdAt: now, executionEnabled: false
  });
  return { ok: true, status: "approved_execution_locked", executionEnabled: false };
});
