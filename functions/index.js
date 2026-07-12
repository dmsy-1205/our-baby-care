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
