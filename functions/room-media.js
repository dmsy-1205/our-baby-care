"use strict";

const crypto = require("node:crypto");

const MEDIA_KINDS = new Set(["moment", "meal", "promise", "subRoutine", "routineEntry"]);
const ROOM_PATTERN = /^[A-Za-z0-9_-]{3,60}$/;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;
const MAX_BYTES = 700 * 1024;

function parseImageDataUrl(value) {
  const match = /^data:image\/(webp|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ""));
  if (!match) throw new Error("invalid-image-data");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_BYTES) throw new Error("image-size");
  return { buffer, contentType: `image/${match[1]}`, extension: match[1] === "jpeg" ? "jpg" : "webp" };
}

function mediaPath({ roomCode, kind, resourceId, uid, extension = "webp" }) {
  if (!ROOM_PATTERN.test(roomCode) || !MEDIA_KINDS.has(kind) || !ID_PATTERN.test(resourceId) || !ID_PATTERN.test(uid)) {
    throw new Error("invalid-media-path");
  }
  const ownerSegment = kind === "moment" || kind === "meal" || kind === "routineEntry" ? `/${uid}` : "";
  return `rooms/${roomCode}/media/${kind}/${resourceId}${ownerSegment}/cover.${extension}`;
}

function downloadUrl(bucketName, path, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucketName)}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

function newDownloadToken() {
  return crypto.randomUUID();
}

module.exports = { MEDIA_KINDS, MAX_BYTES, parseImageDataUrl, mediaPath, downloadUrl, newDownloadToken };
