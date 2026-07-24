"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const navigation = fs.readFileSync(path.join(root, "js/home-navigation.js"), "utf8");
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");

assert.match(navigation, /category\.key === 'mission'[\s\S]{0,100}\['promise', 'subRoutine'\]/);
assert.match(navigation, /\(EDITOR_ROUTES\[category\.key\] \|\| \[\]\)/);
assert.match(navigation, /visibleNotificationKeys\.forEach\(\(key\) => window\.hmMarkNotificationCardRead\?\.\(key\)\)/);
assert.match(app, /function markItemsReadByKey\(key\)/);
assert.match(app, /if \(item\.key === key && item\.signature\) signatures\.push\(item\.signature\)/);
assert.match(app, /writeRemoteReads\(signatures\)/);
assert.match(app, /delete pending\[identity\]/);

console.log("Section notification read synchronization verification passed.");
