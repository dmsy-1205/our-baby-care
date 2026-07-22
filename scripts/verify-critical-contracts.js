'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const failures = [];
const passes = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function check(condition, message) {
  (condition ? passes : failures).push(message);
}

function getRule(rules, segments) {
  return segments.reduce((value, segment) => value && value[segment], rules.rules);
}

function localDateToYmd(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function functionBody(source, signature) {
  const start = source.indexOf(signature);
  if (start < 0) return '';
  const openingBrace = source.indexOf('{', start + signature.length);
  if (openingBrace < 0) return '';
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }
  return '';
}

// 1. Central Dom/Sub UI policy contract.
const policySandbox = { window: {} };
vm.runInNewContext(read('js/access-policy.js'), policySandbox, { filename: 'js/access-policy.js' });
const policy = policySandbox.window.HM_ACCESS_POLICY;
check(policy.can('manageRelationshipCards', 'dom') === true, 'Dom can manage relationship cards');
check(policy.can('manageRelationshipCards', 'sub') === false, 'Sub cannot manage relationship cards');
check(policy.can('viewOwnerNote', 'dom') === true, 'Dom can view the private owner note');
check(policy.can('viewOwnerNote', 'sub') === false, 'Sub cannot view the private owner note');
check(policy.can('manageSubRoutine', 'sub') === true, 'Sub can manage Sub routines');
check(policy.can('manageSubRoutine', 'dom') === false, 'Dom cannot manage Sub routines');

// 2. Realtime Database rule contract. These checks are deliberately structural:
// UI hiding is never accepted as a privacy boundary.
const databaseRules = JSON.parse(read('database.rules.json'));
const ownerNotesRead = getRule(databaseRules, ['ownerNotes', '$roomCode', '.read']) || '';
const ownerNotesWrite = getRule(databaseRules, ['ownerNotes', '$roomCode', '.write']) || '';
const dayAdminWrite = getRule(databaseRules, ['rooms', '$roomCode', 'dayAdmin', '$date', '.write']) || '';
const subRoutineWrite = getRule(databaseRules, ['rooms', '$roomCode', 'subRoutines', '.write']) || '';
const subRoutineDayWrite = getRule(databaseRules, ['rooms', '$roomCode', 'subRoutineDays', '$date', '$routineId', '.write']) || '';
const userRoomsRead = getRule(databaseRules, ['userRooms', '$uid', '.read']) || '';
const roomMembersRead = getRule(databaseRules, ['roomMembers', '$roomCode', '.read']) || '';
const roomRead = getRule(databaseRules, ['rooms', '$roomCode', '.read']) || '';

check(/relationshipRole'\)\.val\(\) === 'dom'/.test(ownerNotesRead), 'Owner-note reads require the Dom relationship role');
check(!/relationshipRole'\)\.val\(\) === 'sub'/.test(ownerNotesRead), 'Owner-note reads never grant the Sub relationship role');
check(/relationshipRole'\)\.val\(\) === 'dom'/.test(ownerNotesWrite), 'Owner-note writes require the Dom relationship role');
check(/relationshipRole'\)\.val\(\) === 'dom'/.test(dayAdminWrite), 'Administrative day-record writes require Dom');
check(/relationshipRole'\)\.val\(\) === 'sub'/.test(subRoutineWrite), 'Sub-routine definitions are writable by Sub');
check(/relationshipRole'\)\.val\(\) === 'sub'/.test(subRoutineDayWrite), 'Sub-routine day values are writable by Sub');
check(/auth\.uid === \$uid/.test(userRoomsRead), 'Users can read their own Room index');
check(/roomMembers'\)\.child\(\$roomCode\)\.child\(auth\.uid\)\.exists\(\)/.test(roomMembersRead), 'Room members can read their Room membership list');
check(/roomMembers'\)\.child\(\$roomCode\)\.child\(auth\.uid\)\.exists\(\)/.test(roomRead), 'Room members can read Room descendants including Sub routines');

// 3. KST/local-date contract. UTC ISO slicing must not choose a user's calendar day.
// 2026-07-22 00:30 KST is still 2026-07-21 in UTC.
const kstMidnight = new Date('2026-07-22T00:30:00+09:00');
check(localDateToYmd(kstMidnight) === '2026-07-22', 'Local calendar helper preserves the KST date near midnight');
check(kstMidnight.toISOString().slice(0, 10) !== '2026-07-22', 'UTC ISO slicing reproduces the KST previous-day defect');

const productSource = read('js/product.js');
const subRoutineSource = read('js/sub-routine.js');
check(!/new Date\(\)\.toISOString\(\)\.slice\(0\s*,\s*10\)/.test(productSource), 'Home statistics do not use UTC ISO date fallback');
check(!/new Date\(\)\.toISOString\(\)\.slice\(0\s*,\s*10\)/.test(subRoutineSource), 'Sub routines do not use UTC ISO date fallback');

// 4. Save-context contract. A save must capture and re-check identity, room and date.
const autosaveSource = read('js/autosave.js');
check(/const sessionUid\s*=\s*currentUser\s*&&\s*currentUser\.uid/.test(autosaveSource), 'Room listeners capture the login identity');
check(/currentUser\.uid\s*!==\s*sessionUid/.test(autosaveSource), 'Room listeners reject a stale login identity');
check(/roomCode\s*!==\s*activeRoomCode/.test(autosaveSource), 'Room listeners reject stale room responses');

const executeAutoSaveBody = functionBody(autosaveSource, 'async function executeAutoSave()');
const contextCheckBody = functionBody(autosaveSource, 'function hmIsAutoSaveContextCurrent(context)');
check(executeAutoSaveBody.length > 0, 'Critical test can inspect the autosave implementation');
check(/const\s+(?:save|request|context)[A-Za-z]*\s*=/.test(executeAutoSaveBody) && /roomCode/.test(executeAutoSaveBody) && /date/.test(executeAutoSaveBody), 'Each autosave captures an immutable room/date request context');
check(/hmIsAutoSaveContextCurrent\(saveContext\)/.test(executeAutoSaveBody) && /activeRoomCode/.test(contextCheckBody) && /recordDate/.test(contextCheckBody), 'Autosave completion re-checks the active room and date');

// 5. UI safety contract: save state must not float over the brand, and embedded
// editors must stop announcing themselves as modal dialogs while in a route.
const indexSource = read('index.html');
const homeNavigationSource = read('js/home-navigation.js');
const topBarSource = read('css/components/top-bar.css');
check(/id="saveStatus"[^>]*role="status"[^>]*aria-live="polite"/.test(indexSource), 'Save state is announced as a polite live status');
check(/\.container\s*>\s*\.autosave-status\{[^}]*position:static!important/.test(topBarSource), 'Authenticated save state occupies its own header row');
check(/modal\.setAttribute\('role',\s*'region'\)/.test(homeNavigationSource) && /modal\.removeAttribute\('aria-modal'\)/.test(homeNavigationSource), 'Embedded route editors are regions, not modal dialogs');
check(/item\.modal\.setAttribute\('role',\s*item\.dialogRole\)/.test(homeNavigationSource) && /item\.modal\.setAttribute\('aria-modal',\s*item\.dialogAriaModal\)/.test(homeNavigationSource), 'Editors restore dialog semantics when returned to overlays');

// 6. Settings hierarchy and light-mode contrast contract.
const profileSource = read('js/profile.js');
const themeSource = read('js/theme.js');
const dataManagementSource = read('js/data-management.js');
const settingsAccountSource = read('css/screens/settings-account.css');
check(/hmAccountChildReturnType\s*=\s*type/.test(profileSource) && /hmReturnToAccountMenu/.test(profileSource), 'Account child screens remember their parent menu');
check(/hmReturnToAccountMenu\?\.\('theme'\)/.test(themeSource) && /hmReturnToAccountMenu\?\.\('data'\)/.test(dataManagementSource), 'Theme and data screens return to the account menu');
check(/data-hm-display="light"[^\n]*\.hm-theme-modal/.test(settingsAccountSource), 'Theme settings define an explicit light-mode surface');
check(/border-color:#bcaeba/.test(settingsAccountSource) && /color:#34283a/.test(settingsAccountSource), 'Light-mode controls retain visible text and borders');
const homeCategoriesSource = read('css/screens/home-categories.css');
const categoryRoutesSource = read('css/screens/category-routes.css');
check(/data-hm-display="light"[\s\S]*color:\s*#5f5366/.test(homeCategoriesSource) && /data-hm-display="light"[\s\S]*color:\s*#5f5366/.test(categoryRoutesSource), 'Light-mode support copy keeps the strengthened contrast');
check(/hm-adaptive-category-icon[^}]*Segoe UI Symbol/.test(homeCategoriesSource) && /hm-adaptive-action\s*>\s*span:first-child[^}]*Segoe UI Symbol/.test(homeCategoriesSource), 'Home and route action icons share one symbol treatment');

// 7. Responsive shell contract. Wide-screen polish must not redesign cards.
const responsiveShellSource = read('css/components/app-shell-responsive.css');
check(/appContent::before/.test(responsiveShellSource) && /min-width:1181px/.test(responsiveShellSource), 'Tablet and PC use an outer app-frame treatment');
check(/min-width:700px[^}]*max-height:600px/.test(responsiveShellSource), 'Landscape Fold receives compact outer spacing');
check(/hm-adaptive-category-grid\{grid-template-columns:repeat\(2/.test(responsiveShellSource), 'The existing two-column category-card layout is preserved');
check(!/hm-adaptive-category-grid\{[^}]*repeat\((?:3|4)/.test(responsiveShellSource), 'Responsive shell does not introduce three- or four-column card layouts');

// 8. Auth-transition contract. Switching Dom/Sub accounts in one tab must
// detach the previous account's routine listeners and retire stale boot work.
const appSource = read('js/app.js');
check(/const authTransitionId\s*=\s*\+\+hmAuthTransitionSequence/.test(appSource), 'Each auth-state callback receives a monotonic transition identity');
check(/authTransitionId\s*===\s*hmAuthTransitionSequence/.test(appSource), 'Stale auth-state callbacks are rejected');
check(/onAuthStateChanged[\s\S]{0,900}hmStopSubRoutines/.test(appSource), 'Every auth-state change immediately detaches Sub-routine listeners');
check((appSource.match(/if \(!isCurrentAuthTransition\(\)\) return;/g) || []).length >= 6, 'Async login boot stages repeatedly reject stale account work');

// 9. Pending-media contract. Selected photos belong to one immutable login,
// Room and date context, including across compression and Storage upload awaits.
const momentsSource = read('js/moments.js');
check(/function mediaContext\(\)[\s\S]*uid:[\s\S]*roomCode:[\s\S]*date:/.test(momentsSource), 'Pending media captures login, Room and date');
check(/function isMediaContextCurrent\(context\)/.test(momentsSource), 'Pending media can reject a stale context');
check(/persistMoment\(file, mealType = '', requestContext = mediaContext\(\)\)/.test(momentsSource), 'Each media upload receives an immutable request context');
check((momentsSource.match(/isMediaContextCurrent\(requestContext\)/g) || []).length >= 4, 'Media uploads re-check context across asynchronous stages');
check(/onAuthStateChanged[\s\S]{0,1000}hmDiscardPendingMedia/.test(appSource), 'Every auth-state change discards pending media previews');

// 10. Rules-drift audit contract. The audit may only read deployed rules and
// report paths; it must never become an implicit rules deployment command.
const rulesAuditSource = read('scripts/audit-deployed-database-rules.js');
check(/database:get[',\s]+\/\.settings\/rules/.test(rulesAuditSource), 'Rules audit reads the deployed settings/rules endpoint');
check(/collectDifferences/.test(rulesAuditSource) && /differing paths/.test(rulesAuditSource), 'Rules audit reports structural drift paths');
check(!/['"]deploy['"]|database:set|database:update|database:remove/.test(rulesAuditSource), 'Rules audit contains no Firebase mutation or deployment command');

// 11. PWA cache contract. Registration, central release metadata and the
// worker cache key must advance together without forcing an unsafe reload.
const pwaSource = read('js/pwa.js');
const serviceWorkerSource = read('service-worker.js');
check(/window\.HM_RELEASE\?\.step/.test(pwaSource), 'PWA registration derives its version from central release metadata');
check(/service-worker\.js\?v=\$\{encodeURIComponent\(HM_PWA_APP_VERSION\)\}/.test(pwaSource), 'Service-worker registration URL follows the derived release version');
check(!/controllerchange[\s\S]{0,400}window\.location\.reload/.test(pwaSource), 'Service-worker activation never forces an unsafe page reload');
check(/hmPwaUpdateReady/.test(pwaSource), 'A ready service-worker update is exposed without interrupting current work');
check((serviceWorkerSource.match(/return cached \|\| Response\.error\(\)/g) || []).length >= 1, 'Offline scripts and styles never receive the offline HTML document');

// 12. Generated role-label contract. Feedback and reward cards already expose
// their role in the route UI; CSS must not append duplicate accessible text.
const legacyBaseSource = read('css/legacy/base.css');
check(!/\.managed-card\s+\.daily-card-title::after\s*\{[^}]*content\s*:\s*['"]\s*관리 전용/.test(legacyBaseSource), 'Managed cards do not generate duplicate role-label text');
check(/el\.hidden\s*=\s*!canManage/.test(read('js/daily.js')) && /toggleAttribute\('inert',\s*!canManage\)/.test(read('js/daily.js')), 'Dom-only sections synchronize visual and accessibility hiding');

passes.forEach((message) => console.log(`[PASS] ${message}`));
failures.forEach((message) => console.error(`[FAIL] ${message}`));

console.log(`[CRITICAL CONTRACTS] ${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
