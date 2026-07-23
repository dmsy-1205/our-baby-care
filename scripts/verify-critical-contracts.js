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
const databaseRulesSource = read('database.rules.json');
const databaseRules = JSON.parse(databaseRulesSource);
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
check(/orderedItems=hmSummaryDraft\.map\(key=>byKey\.get\(key\)\)/.test(productSource), 'Summary settings render selected items in their saved order');
check(/index===0\?'disabled'/.test(productSource) && /index===hmSummaryDraft\.length-1\?'disabled'/.test(productSource), 'Summary order arrows disable at their movement boundaries');
check(/\{key:'subRoutine',icon:'🌱',label:'나의 루틴'\}/.test(productSource)
  && /Array\.isArray\(rec\?\.subRoutineSnapshot\)/.test(productSource)
  && /subRoutine:\{short:subRoutines\.length/.test(productSource)
  && /\$\{subRoutineDone\}\/\$\{subRoutines\.length\}/.test(productSource),
  'Today summary settings include My Routine completion from the saved daily snapshot');
check(/const requestedItems=hmSummaryNormalize\(hmSummaryDraft\.slice\(\)\)/.test(productSource)
  && /currentUser\?\.uid\)\|\|'guest'\)!==uid/.test(productSource)
  && /오늘의 요약 설정 동기화 실패/.test(productSource),
  'Summary settings preserve request identity and report remote synchronization failures');

const configSource = read('js/config.js');
check(/'hearme2nite1205\.web\.app': 'hearme2nite1205'/.test(configSource)
  && /'our-baby-care\.web\.app': 'our-baby-care'/.test(configSource)
  && /hmExpectedHostingProject && hmHostingProjectId !== hmExpectedHostingProject/.test(configSource)
  && /Firebase environment mismatch/.test(configSource),
  'Known test and production Hosting domains fail closed on Firebase project mismatch');
check(/\.hm-summary-setting-row>div button\{width:44px;height:44px/.test(read('css/legacy/release-foundation.css'))
  && /\.relationship-lifecycle-btn\{[\s\S]{0,120}min-height:44px/.test(read('css/screens/relationship.css')),
  'Summary ordering and relationship actions meet the 44px mobile touch target');

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
const profileSource = read('js/profile.js');
const presenceSource = read('js/presence.js');
const cardConversationSource = read('js/card-conversations.js');
const notificationConversationBody = functionBody(cardConversationSource, 'function openFromNotification(cardKey)');
const topBarSource = read('css/components/top-bar.css');
check(/id="saveStatus"[^>]*role="status"[^>]*aria-live="polite"/.test(indexSource), 'Save state is announced as a polite live status');
check(/\.container\s*>\s*\.autosave-status\{[^}]*position:static!important/.test(topBarSource), 'Authenticated save state occupies its own header row');
check(/modal\.setAttribute\('role',\s*'region'\)/.test(homeNavigationSource) && /modal\.removeAttribute\('aria-modal'\)/.test(homeNavigationSource), 'Embedded route editors are regions, not modal dialogs');
check(/item\.modal\.setAttribute\('role',\s*item\.dialogRole\)/.test(homeNavigationSource) && /item\.modal\.setAttribute\('aria-modal',\s*item\.dialogAriaModal\)/.test(homeNavigationSource), 'Editors restore dialog semantics when returned to overlays');
check(/window\.hmCurrentNickname\s*=\s*hmCurrentNickname/.test(profileSource), 'Loaded nicknames are exposed to the shared Room presence layer');
check(/presence`\)\.update\(\{ nickname, avatar: hmCurrentAvatar \}\)/.test(profileSource), 'Profile saves synchronize nickname and avatar into Room presence');
check(/nickname:\s*String\(window\.hmCurrentNickname \|\| ''\)/.test(presenceSource), 'Presence heartbeats repair missing shared nicknames');
check(/function hmCaptureProfileContext\(\)/.test(profileSource) && (profileSource.match(/hmIsProfileContextCurrent\(requestContext\)/g) || []).length >= 5, 'Profile reads and writes reject stale UID and Room contexts');
check(/user\.uid !== activePresenceUid \|\| getRoomCode\(\) !== activePresenceRoom/.test(presenceSource), 'Presence heartbeats reject stale account and Room references');
check(/openConversationDialog\(cardKey\)/.test(notificationConversationBody) && !/open(?:Daily|Mission|CustomRoutine|SubRoutine)/.test(notificationConversationBody), 'Comment notifications open only the conversation dialog');
check(/data-card-conversation-open/.test(functionBody(cardConversationSource, 'function renderPanel(cardKey, overlayId)')) && !/PANEL_DISABLED_KEYS/.test(cardConversationSource), 'Standalone record cards retain a comment-dialog trigger');
check(/authorName:\s*authorDisplayName\(\)/.test(cardConversationSource), 'Comment authors use the configured profile nickname');
check(/then\(\(saved\) => \{ if \(saved\) textarea\.value = ''; \}\)/.test(cardConversationSource), 'Failed comment saves preserve the draft text');
check(/aria-labelledby="cardConversationDialogTitle"/.test(cardConversationSource) && /event\.key === 'Escape'/.test(cardConversationSource) && /event\.key !== 'Tab'/.test(cardConversationSource), 'Comment dialog exposes a name and keyboard focus controls');

// 6. Settings hierarchy and light-mode contrast contract.
const themeSource = read('js/theme.js');
const dataManagementSource = read('js/data-management.js');
const settingsAccountSource = read('css/screens/settings-account.css');
const authSource = read('js/auth.js');
const uiEventsSource = read('js/ui-events.js');
check(/data-hm-action="toggle-auth-password"/.test(indexSource) && /function toggleAuthPassword/.test(authSource), 'Login supports accessible password reveal controls');
check(/data-hm-action="reset-auth-password"/.test(indexSource) && /sendPasswordResetEmail\(email\)/.test(authSource), 'Login provides a password-reset email path');
check(/id="authFormStatus"[^>]*role="status"[^>]*aria-live="polite"/.test(indexSource), 'Login progress and errors use an inline live status');
check(/auth-email-enter/.test(uiEventsSource) && /auth-submit-enter/.test(uiEventsSource), 'Login keyboard flow advances from email and submits from password');
check(/hm-login-field input[\s\S]{0,300}background:#fff!important/.test(settingsAccountSource) && /hm-login-field label[^{]*\{[^}]*color:#4e435d/.test(settingsAccountSource), 'Login fields and labels retain strong light-mode contrast');
check(/min-width:761px\) and \(max-width:1099px/.test(settingsAccountSource) && /width:min\(620px/.test(settingsAccountSource), 'Fold login layout uses a bounded intermediate card width');
check(/hm-password-control\s*>\s*\.hm-password-toggle[\s\S]{0,500}width:56px!important/.test(settingsAccountSource), 'Password reveal stays inside a bounded trailing control');
check(/signup && password\.length < 8/.test(authSource) && !/if \(password\.length </.test(authSource), 'New signups require 8 characters without blocking legacy logins');
check(/typeof window\[name\] === 'function'/.test(read('js/qa.js')) && !/\beval\s*\(/.test(read('js/qa.js')), 'QA function discovery avoids eval');
check(/X-Content-Type-Options/.test(read('firebase.json')) && /X-Frame-Options/.test(read('firebase.json')) && /Referrer-Policy/.test(read('firebase.json')), 'Hosting defines safe non-breaking response headers');
check(/id="pendingInviteNotice"[^>]*aria-live="polite"/.test(indexSource) && /pendingInviteCodeText/.test(indexSource), 'Invite links expose a persistent accessible login notice');
check(/\^\[A-Z0-9\]\{5,10\}\$/.test(authSource) && /codeText\.textContent = invite/.test(authSource), 'URL invite capture accepts only valid codes and renders them as text');
check(/sessionStorage\.getItem\('pendingInviteCode'\)[\s\S]{0,100}await acceptPendingInviteIfAny\(\)/.test(read('js/room.js')), 'First role selection resumes a pending invite');
check(/모든 멤버는 본인의 userRooms와 roomMembers로 검증된 이전 방에 다시 연결 가능/.test(read('js/room.js'))
  && /if \(legacyRoomPanel\) \{ legacyRoomPanel\.open = false; legacyRoomPanel\.style\.display = ''; \}[\s\S]{0,100}if \(currentUser\) loadMyRoomList\(\);/.test(read('js/room.js')),
  'Dom and Sub can reopen previously joined rooms from the verified room list');
const relationshipGateCount = (databaseRulesSource.match(/child\('relationship'\)\.child\('status'\)[\s\S]{0,180}val\(\) === 'active'/g) || []).length;
check(relationshipGateCount >= 40, 'Ended relationships are denied across Room read and write rules');
check(/"relationship"\s*:\s*\{[\s\S]{0,500}"\.read"[\s\S]{0,1000}"\.write"[\s\S]{0,2500}recovery_pending/.test(databaseRulesSource),
  'Relationship state remains readable and mutually recoverable while Room data is locked');
check(/id="relationshipLifecycleBox"[\s\S]{0,2200}관계를 종료하면 양쪽 모두 기존 데이터를 불러오거나 새 기록을 작성할 수 없습니다/.test(indexSource),
  'Relationship settings explain the symmetric data lock before termination');
check(/function hmEndRoomRelationship/.test(read('js/room.js'))
  && /function hmRequestRoomRecovery/.test(read('js/room.js'))
  && /function hmApproveRoomRecovery/.test(read('js/room.js'))
  && /recoveryRequestedByUid === currentUser\.uid/.test(read('js/room.js')),
  'Relationship termination and recovery require two distinct participant actions');
const relationshipWriteRule = getRule(databaseRules, ['rooms', '$roomCode', 'meta', 'relationship', '.write']) || '';
check(/roomMembers'\)\.child\(\$roomCode\)\.child\(auth\.uid\)\.exists\(\)/.test(relationshipWriteRule)
  && !/emailVerificationRequired/.test(relationshipWriteRule),
  'Existing Room participants can end or recover a relationship without a legacy email-verification gate');
check(/!data\.child\('ownerUid'\)\.exists\(\)/.test(getRule(databaseRules, ['rooms', '$roomCode', 'meta', 'relationship', '.validate']) || '')
  && /data\.child\('generation'\)\.exists\(\)\s*\?\s*data\.child\('generation'\)\.val\(\)\s*:\s*0/.test(getRule(databaseRules, ['rooms', '$roomCode', 'meta', 'relationship', '.validate']) || ''),
  'Legacy relationship states can adopt canonical Room UIDs and generation zero during their first transition');
check(/!root\.child\('rooms'\)\.child\(\$roomCode\)\.child\('meta'\)\.child\('ownerUid'\)\.exists\(\)/.test(getRule(databaseRules, ['rooms', '$roomCode', 'meta', 'relationship', '.validate']) || '')
  && /child\(newData\.child\('ownerUid'\)\.val\(\)\)\.child\('role'\)\.val\(\) === 'owner'/.test(getRule(databaseRules, ['rooms', '$roomCode', 'meta', 'relationship', '.validate']) || '')
  && /child\(newData\.child\('partnerUid'\)\.val\(\)\)\.child\('role'\)\.val\(\) === 'partner'/.test(getRule(databaseRules, ['rooms', '$roomCode', 'meta', 'relationship', '.validate']) || ''),
  'Legacy Rooms without meta ownerUid bind relationship participants to fixed owner and partner memberships');
check(/db\.ref\(`roomMembers\/\$\{roomCode\}`\)\.once\('value'\)/.test(read('js/room.js'))
  && /member\.role === 'owner'/.test(read('js/room.js'))
  && /member\.role === 'partner'/.test(read('js/room.js')),
  'Relationship loading recovers missing legacy participant UIDs from verified Room memberships');
check(/relationshipStateWritePending\s*=\s*true/.test(read('js/room.js'))
  && /confirmedSnapshot\s*=\s*await relationshipRef\.once\('value'\)/.test(read('js/room.js'))
  && /confirmedState\.status\s*!==\s*nextState\.status/.test(read('js/room.js')),
  'Relationship UI changes only after the server state is read back and confirmed');
check(/state read failed[\s\S]{0,400}status:\s*'locked'/.test(read('js/room.js'))
  && /listener failed[\s\S]{0,300}activeRelationshipStatus\s*=\s*'locked'/.test(read('js/room.js')),
  'Relationship read and listener failures lock protected data instead of failing open');
check(/function resetConversationsForLockedRoom/.test(read('js/card-conversations.js'))
  && /hmResetCardConversations/.test(read('js/room.js'))
  && /hmResetRoomNotifications/.test(read('js/room.js')),
  'Relationship locking clears comment and notification listeners and cached UI');
const testRulesDeploySource = read('scripts/deploy-database-rules.ps1');
check(/ValidateSet\('Test'\)/.test(testRulesDeploySource)
  && /hearme2nite1205/.test(testRulesDeploySource)
  && /deploy --only database --project test/.test(testRulesDeploySource)
  && !/storage|functions|--project prod/i.test(testRulesDeploySource),
  'Relationship rules have a test-only Database deployment path');
check(/property="og:title"/.test(indexSource) && /property="og:image"/.test(indexSource) && /name="twitter:card"/.test(indexSource), 'Shared links define Open Graph and social preview metadata');
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
const navigationFetchBody = functionBody(serviceWorkerSource, 'async function networkFirstNavigation(request)');
check(/window\.HM_RELEASE\?\.step/.test(pwaSource), 'PWA registration derives its version from central release metadata');
check(/service-worker\.js\?v=\$\{encodeURIComponent\(HM_PWA_APP_VERSION\)\}/.test(pwaSource), 'Service-worker registration URL follows the derived release version');
check(!/controllerchange[\s\S]{0,400}window\.location\.reload/.test(pwaSource), 'Service-worker activation never forces an unsafe page reload');
check(/hmPwaUpdateReady/.test(pwaSource), 'A ready service-worker update is exposed without interrupting current work');
check((serviceWorkerSource.match(/return cached \|\| Response\.error\(\)/g) || []).length >= 1, 'Offline scripts and styles never receive the offline HTML document');
check(!/cache\.put\(request/.test(navigationFetchBody) && !/caches\.match\(request\)/.test(navigationFetchBody), 'PWA navigation never reuses a cached app document');
check(/!\[HM_STATIC_CACHE, HM_RUNTIME_CACHE\]\.includes\(key\)/.test(serviceWorkerSource), 'Service-worker activation preserves current-version caches');
check(/await clearOldPwaCachesIfNeeded\(\);[\s\S]{0,80}await registerServiceWorker\(\)/.test(pwaSource), 'PWA cache cleanup completes before service-worker registration');
const releaseInfoSource = read('js/release-info.js');
check(/메인 이전 전 환경·저장 안전성 보강/.test(releaseInfoSource)
  && /Firebase 프로젝트 불일치를 차단/.test(releaseInfoSource),
  'Release metadata describes pre-main environment and save safety');

// 12. Generated role-label contract. Feedback and reward cards already expose
// their role in the route UI; CSS must not append duplicate accessible text.
const legacyBaseSource = read('css/legacy/base.css');
check(!/\.managed-card\s+\.daily-card-title::after\s*\{[^}]*content\s*:\s*['"]\s*관리 전용/.test(legacyBaseSource), 'Managed cards do not generate duplicate role-label text');
check(/el\.hidden\s*=\s*!canManage/.test(read('js/daily.js')) && /toggleAttribute\('inert',\s*!canManage\)/.test(read('js/daily.js')), 'Dom-only sections synchronize visual and accessibility hiding');

passes.forEach((message) => console.log(`[PASS] ${message}`));
failures.forEach((message) => console.error(`[FAIL] ${message}`));

console.log(`[CRITICAL CONTRACTS] ${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
