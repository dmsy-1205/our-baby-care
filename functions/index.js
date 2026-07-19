"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

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
