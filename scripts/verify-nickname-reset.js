"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const profile = fs.readFileSync(path.join(root, "js/profile.js"), "utf8");
const rules = JSON.parse(fs.readFileSync(path.join(root, "database.rules.json"), "utf8")).rules;

assert.match(profile, /const clearingNickname = nickname\.length === 0/);
assert.match(profile, /!clearingNickname && !hmIsValidNickname\(nickname\)/);
assert.match(profile, /nickname: clearingNickname \? null : nickname/g);
assert.match(profile, /닉네임이 해제되었습니다/);
assert.match(profile, /닉네임 해제 완료/);
assert.equal(rules.users.$uid.profile.nickname[".validate"].startsWith("!newData.exists()"), true);

console.log("Nickname reset verification passed.");
