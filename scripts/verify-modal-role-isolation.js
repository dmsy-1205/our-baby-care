"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const conversations = fs.readFileSync(path.join(root, "js/card-conversations.js"), "utf8");
const routines = fs.readFileSync(path.join(root, "js/sub-routine.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(conversations, /suspendedParentOverlayId/);
assert.match(conversations, /closeModalOverlayById\(suspendedParentOverlayId\)/);
assert.match(conversations, /openModalOverlayById\(parentOverlayId\)/);
assert.match(html, /id="subRoutineRoleNote" data-hm-role-label-ignore/);
assert.match(routines, /이 루틴을 만든 사용자가 직접 관리합니다/);
assert.doesNotMatch(routines, /기록\(Sub\)가 직접 관리하는 루틴입니다/);

console.log("Modal and Room role-label isolation verification passed.");
