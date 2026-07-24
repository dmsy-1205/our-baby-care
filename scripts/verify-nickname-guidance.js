"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const roleSource = fs.readFileSync(path.join(root, "js/role-labels.js"), "utf8");
const conversationSource = fs.readFileSync(path.join(root, "js/card-conversations.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const events = fs.readFileSync(path.join(root, "js/ui-events.js"), "utf8");

assert.match(roleSource, /roomMembers\/\$\{room\}/);
assert.match(roleSource, /member\?\.nickname/);
assert.match(roleSource, /member\?\.presence\?\.nickname/);
assert.match(roleSource, /global\.hmCurrentNickname/);
assert.match(roleSource, /관리 사용자/);
assert.match(roleSource, /기록 사용자/);
assert.doesNotMatch(roleSource, /meta\/roleLabels/);
assert.doesNotMatch(roleSource, /database\(\)\.ref\([^)]*\)\.(?:set|update|remove)\(/);
assert.doesNotMatch(roleSource, /activeRef\.(?:set|update|remove)\(/);

assert.doesNotMatch(html, /roleDisplayLabelsCard|Dom 표시명|Sub 표시명|표시명 저장/);
assert.doesNotMatch(events, /save-role-display-label|reset-role-display-label/);
assert.match(conversationSource, /item\.authorName \|\| \(item\.authorRole === 'dom' \? '관리 사용자' : '기록 사용자'\)/);
assert.match(conversationSource, /item\.authorRole === 'dom' \? '관리 역할' : '기록 역할'/);

console.log("Nickname-centered guidance verification passed.");
