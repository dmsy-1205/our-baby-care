'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const baseline = readJson('scripts/quality-baseline.json');
const adminFreeze = readJson('scripts/admin-freeze.json');
const errors = [];
const notes = [];

function absolute(relativePath) {
  return path.resolve(root, relativePath);
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function lines(relativePath) {
  return read(relativePath).split(/\r?\n/).length;
}

function requireCheck(ok, message) {
  if (!ok) errors.push(message);
}

function collectFiles(relativeDirectory, extension) {
  const output = [];
  const visit = (directory) => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && path.extname(entry.name) === extension) output.push(full);
    });
  };
  visit(absolute(relativeDirectory));
  return output;
}

const aliases = readJson('.firebaserc').projects || {};
requireCheck(aliases.test === 'hearme2nite1205', 'test alias must be hearme2nite1205');
requireCheck(aliases.prod === 'our-baby-care', 'prod alias must be our-baby-care');

const firebaseConfig = readJson('firebase.json');
requireCheck(firebaseConfig.hosting && firebaseConfig.hosting.public === 'public', 'Hosting public directory must remain public');
const predeploy = (firebaseConfig.hosting && firebaseConfig.hosting.predeploy) || [];
requireCheck(predeploy.includes('node scripts/verify-session-regressions.js'), 'Hosting must run the Dom/Sub session regression verifier');
requireCheck(predeploy.includes('node scripts/verify-app-baseline.js'), 'Hosting must run the baseline verifier');
requireCheck(predeploy.includes('node scripts/build-public.js'), 'Hosting must run the public whitelist build');

const deployScript = read('scripts/deploy-hosting.ps1');
const productionDeployScript = read('scripts/deploy-production-hosting.ps1');
requireCheck(/\[string\]\$Target\s*=\s*'Test'/.test(deployScript), 'Deployment must default to Test, never All or Production');
requireCheck(/\[ValidateSet\('Test'\)\]/.test(deployScript), 'Test deployment script must reject Production and All targets');
requireCheck(!/projects\.prod|--project\s+prod|our-baby-care/.test(deployScript), 'Test deployment script must contain no production target');
requireCheck(/firebaseCommand deploy --only hosting/.test(deployScript), 'Deployment script must deploy Hosting only');
requireCheck(!/--only\s+(?:database|storage|functions)/i.test(deployScript), 'Deployment script must not deploy Database, Storage, or Functions');
requireCheck(/\[ValidateSet\('our-baby-care'\)\]/.test(productionDeployScript), 'Production deployment requires the exact project confirmation');
requireCheck(/--only hosting --project prod/.test(productionDeployScript), 'Production script remains Hosting-only and explicitly targets prod');

Object.entries(adminFreeze.hashes || {}).forEach(([relativePath, expectedHash]) => {
  const file = absolute(relativePath);
  requireCheck(fs.existsSync(file), `Frozen admin file is missing: ${relativePath}`);
  if (!fs.existsSync(file)) return;
  const actualHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  requireCheck(actualHash === expectedHash, `Frozen admin file changed: ${relativePath}`);
});

const index = read('index.html');
const admin = read('admin.html');
requireCheck(index.includes('<script src="/__/firebase/init.js"></script>'), 'Main app must use the active Hosting Firebase configuration');
requireCheck(admin.includes('<script src="/__/firebase/init.js"></script>'), 'Admin app must use the active Hosting Firebase configuration');
requireCheck(index.indexOf('js/release-info.js') < index.indexOf('js/config.js'), 'release-info.js must load before config.js');
requireCheck(index.indexOf('js/access-policy.js') < index.indexOf('js/room.js'), 'access-policy.js must load before role-dependent modules');
requireCheck(index.indexOf('js/save-state.js') < index.indexOf('js/autosave.js'), 'save-state.js must load before autosave.js');

const ids = [...index.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, position) => ids.indexOf(id) !== position))];
requireCheck(duplicateIds.length === 0, `Duplicate DOM ids: ${duplicateIds.join(', ')}`);

const release = read('js/release-info.js');
const worker = read('service-worker.js');
const releaseStep = (release.match(/step:\s*'([^']+)'/) || [])[1] || '';
const workerStep = (worker.match(/HM_PWA_VERSION\s*=\s*'v1\.0-step([0-9-]+)'/) || [])[1] || '';
const normalizedReleaseStep = releaseStep.replace(/^STEP/i, '').replace(/\./g, '-');
const pwaScriptStep = ((index.match(/js\/pwa\.js\?v=step([0-9-]+)/) || [])[1] || '').replace(/-+$/, '');
requireCheck(Boolean(releaseStep), 'Release step is missing');
requireCheck(normalizedReleaseStep === workerStep, `Release/PWA version mismatch: ${releaseStep} vs ${workerStep || 'missing'}`);
requireCheck(normalizedReleaseStep === pwaScriptStep, `Release/PWA script URL mismatch: ${releaseStep} vs ${pwaScriptStep || 'missing'}`);

const inlineHandlers = (index.match(/\bon(?:click|change|input|submit|keypress|blur)\s*=/g) || []).length;
requireCheck(index.includes('id="hmNotificationBar" data-hm-action="open-notifications"'), 'Home notification button must use the shared UI event bridge');
requireCheck(read('js/ui-events.js').includes("'open-notifications'"), 'Shared UI event bridge must register the home notification action');
const dailyFieldInputs = (index.match(/data-hm-input="daily-field-change"/g) || []).length;
requireCheck(dailyFieldInputs === 10, `Daily record inputs must use 10 shared input bindings, found ${dailyFieldInputs}`);
const missionTemplateActions = (index.match(/data-hm-action="add-mission-template"/g) || []).length;
requireCheck(missionTemplateActions === 10, `Mission templates must use 10 shared click bindings, found ${missionTemplateActions}`);
requireCheck(index.includes('id="missionModalOverlay" data-hm-action="close-mission-overlay"'), 'Mission overlay must use the shared close action');
requireCheck((index.match(/data-hm-change="mission-completion-change"/g) || []).length === 5, 'Mission completion controls must use 5 shared change bindings');
requireCheck((index.match(/data-hm-input="mission-text-change"/g) || []).length === 5, 'Mission text controls must use 5 shared input bindings');
requireCheck((index.match(/data-hm-action="clear-mission-row"/g) || []).length === 5, 'Mission rows must use 5 shared clear bindings');
requireCheck((index.match(/data-hm-action="open-room-settings"/g) || []).length === 2, 'Relationship screen must use 2 shared room-open bindings');
requireCheck((index.match(/data-hm-action="set-relationship-role"/g) || []).length === 2, 'Relationship screen must use 2 shared role bindings');
requireCheck(index.includes('id="roomSettingsOverlay" data-hm-action="close-room-settings-overlay"'), 'Relationship overlay must use the shared close action');
requireCheck((index.match(/data-hm-action="open-history-panel"/g) || []).length === 1, 'History screen must use one shared panel-open binding');
requireCheck(index.includes('id="historyPanelOverlay" data-hm-action="close-history-panel-overlay"'), 'History panel overlay must use the shared close action');
requireCheck(index.includes('id="historySearchInput"') && index.includes('data-hm-input="history-search"'), 'History search input must use the shared input binding');
requireCheck(index.includes('id="historyTypeFilter" data-hm-change="history-search"'), 'History type filter must use the shared change binding');
requireCheck(index.includes('id="recordDeletionModalOverlay" hidden data-hm-action="close-deleted-records-overlay"'), 'Deleted-record overlay must use the shared close action');
requireCheck(index.includes('id="historyDetailOverlay" data-hm-action="close-history-detail-overlay"'), 'History detail overlay must use the shared close action');
const historySource = read('js/history.js');
requireCheck(!/onclick="selectHistoryDate\(/.test(historySource), 'Dynamic history date cards must not use inline select handlers');
requireCheck(!/onclick="(?:closeHistoryPhotoGallery\(\); )?openHistoryDetailModal\(/.test(historySource), 'Dynamic history detail cards must not use inline open handlers');
requireCheck(!/onclick="copyDirectText\(event/.test(historySource), 'Dynamic history copy controls must not use inline handlers');
requireCheck(!/onclick="deleteRecord\(event/.test(historySource), 'Dynamic history delete controls must not use inline handlers');
requireCheck((historySource.match(/data-hm-action="select-history-date"/g) || []).length === 3, 'History calendar and story templates must use 3 shared date bindings');
requireCheck((historySource.match(/data-hm-action="open-history-detail"/g) || []).length === 1, 'Selected history card must use one shared detail binding');
requireCheck((historySource.match(/data-hm-action="open-history-photo-detail"/g) || []).length === 1, 'History photo card must use one shared detail binding');
requireCheck((historySource.match(/data-hm-action="copy-history-record"/g) || []).length === 2, 'History detail templates must use 2 shared copy bindings');
requireCheck((historySource.match(/data-hm-action="delete-history-record"/g) || []).length === 2, 'History cards must use 2 shared delete bindings');
requireCheck(index.includes('id="userInfoText" data-hm-action="open-account-menu"'), 'Settings account launcher must use the shared action');
requireCheck(index.includes('id="accountMenuOverlay" data-hm-action="close-account-menu-overlay"'), 'Settings account overlay must use the shared close action');
requireCheck((index.match(/data-hm-action="open-account-child"/g) || []).length === 5, 'Settings account menu must use 5 shared child actions');
requireCheck(index.includes('class="hm-account-logout-btn" data-hm-action="logout-account"'), 'Settings logout must use the ordered shared action');
requireCheck(index.includes('id="profileOverlay" data-hm-action="close-profile-overlay"'), 'Profile overlay must use the shared close action');
requireCheck((index.match(/data-hm-action="select-profile-avatar"/g) || []).length === 6, 'Profile must use 6 shared avatar actions');
requireCheck(index.includes('id="profileNicknameInput"') && index.includes('data-hm-input="profile-nickname-preview"'), 'Profile nickname must use the shared input action');
requireCheck(index.includes('id="themeOverlay" data-hm-action="close-theme-overlay"'), 'Theme overlay must use the shared close action');
requireCheck((index.match(/data-hm-action="select-theme-mode"/g) || []).length === 2, 'Theme must use 2 shared mode actions');
requireCheck((index.match(/data-hm-action="preview-personal-theme"/g) || []).length === 5, 'Theme must use 5 shared palette actions');
requireCheck((index.match(/data-hm-action="preview-display-mode"/g) || []).length === 3, 'Theme must use 3 shared display actions');
requireCheck(index.includes('id="dataManagementOverlay" data-hm-action="close-data-management-overlay"'), 'Data management overlay must use the shared close action');
requireCheck((index.match(/data-hm-action="select-data-tab"/g) || []).length === 3, 'Data management must use 3 shared tab actions');
requireCheck((index.match(/data-hm-change="delete-request-type"/g) || []).length === 3, 'Data management must use 3 shared request-type actions');
requireCheck((index.match(/data-hm-action="set-data-admin-filter"/g) || []).length === 2, 'Data administration must use 2 shared filter actions');
requireCheck((index.match(/data-hm-keypress="auth-submit-enter"/g) || []).length === 2, 'Authentication must use 2 shared Enter-key bindings');
requireCheck((index.match(/data-hm-keypress="chat-send-enter"/g) || []).length === 1, 'Chat must use one shared Enter-key binding');
requireCheck((index.match(/data-hm-submit="support-ticket"/g) || []).length === 1, 'Support form must use one shared submit binding');
requireCheck((index.match(/data-hm-(?:change|input|blur)="structured-time-change"/g) || []).length === 8, 'Wake and sleep controls must use 8 shared time bindings');
requireCheck((index.match(/data-hm-change="daily-photo-upload"/g) || []).length === 1, 'Daily moments must use one shared file binding');
requireCheck((index.match(/data-hm-change="meal-photo-upload"/g) || []).length === 3, 'Meal photos must use 3 shared file bindings');
const subRoutineSource = read('js/sub-routine.js');
const customRoutineSource = read('js/custom-routine.js');
requireCheck(!/on(?:click|change|input|submit|keypress|blur)=/.test(subRoutineSource), 'Sub routine dynamic templates must not use inline handlers');
requireCheck(!/on(?:click|change|input|submit|keypress|blur)=/.test(customRoutineSource), 'Custom routine dynamic templates must not use inline handlers');
requireCheck((index.match(/data-hm-action="open-sub-routine-editor"/g) || []).length === 1, 'Sub routine must use one static editor-open action');
requireCheck((index.match(/data-hm-action="close-sub-routine-editor"/g) || []).length === 2, 'Sub routine must use 2 static editor-close actions');
requireCheck((index.match(/data-hm-action="fill-custom-routine-template"/g) || []).length === 4, 'Custom routine must use 4 shared template actions');
requireCheck((index.match(/data-hm-change="custom-routine-schedule"/g) || []).length === 2, 'Custom routine must use 2 shared schedule actions');
requireCheck((customRoutineSource.match(/data-hm-action="open-custom-routine-input"/g) || []).length === 2, 'Custom routine dynamic cards must use 2 shared input-open bindings');
const helpSource = read('js/help-center.js');
requireCheck(!/on(?:click|change|input|submit|keypress|blur)=/.test(helpSource), 'Help center dynamic templates must not use inline handlers');
requireCheck((index.match(/data-hm-action="set-auth-mode"/g) || []).length === 2, 'Authentication must use 2 shared mode actions');
requireCheck((index.match(/data-hm-action="select-help-tab"/g) || []).length === 13, 'Help center must use 13 shared tab actions');
requireCheck((index.match(/data-hm-action="toggle-help-faq"/g) || []).length === 6, 'Help center must use 6 shared FAQ actions');
requireCheck((index.match(/data-hm-action="open-guide"/g) || []).length === 2, 'Guide must use 2 shared open actions');
requireCheck((helpSource.match(/data-hm-submit="support-(?:followup|rating)"/g) || []).length === 2, 'Help support dynamic forms must use 2 shared submit actions');
requireCheck((index.match(/data-hm-action="close-daily-overlay"/g) || []).length === 11, 'Daily record modals must use 11 shared overlay-close actions');
requireCheck((index.match(/data-hm-action="close-daily"/g) || []).length === 22, 'Daily record modals must use 22 shared close actions');
requireCheck((index.match(/data-hm-action="select-mood"/g) || []).length === 5, 'Mood must use 5 shared selection actions');
requireCheck((index.match(/data-hm-action="select-feedback-type"/g) || []).length === 4, 'Feedback must use 4 shared selection actions');
requireCheck((index.match(/data-hm-action="toggle-daily-choice"/g) || []).length === 2, 'Rewards must use 2 shared choice actions');
requireCheck(inlineHandlers === 0, 'index.html must not contain direct inline event handlers');
const inlineDynamicScripts = collectFiles('js', '.js').filter((file) => /on(?:click|change|input|submit|keypress|blur)=/.test(fs.readFileSync(file, 'utf8')));
requireCheck(inlineDynamicScripts.length === 0, `Dynamic inline event handlers remain: ${inlineDynamicScripts.map((file) => path.relative(root, file)).join(', ')}`);
const styleEntry = read('css/style.css');
const styleManifest = readJson('css/style.layers.json');
const importedLayers = [...styleEntry.matchAll(/@import url\("\.\/([^"]+\.css)"\);/g)].map((match) => match[1]);
const declaredLayers = styleManifest.layers.map((layer) => layer.name);
requireCheck(JSON.stringify(importedLayers) === JSON.stringify(declaredLayers), 'CSS layer import order differs from the locked manifest');
requireCheck(!declaredLayers.some((name) => /^style\.layer/.test(name)), 'Unclassified CSS layer remains outside components, screens, tokens, or legacy');
styleManifest.layers.forEach((layer) => {
  const content = read(`css/${layer.name}`);
  requireCheck(Buffer.byteLength(content) === layer.bytes, `CSS layer byte count changed: ${layer.name}`);
  requireCheck(content.split(/\r?\n/).length === layer.lines, `CSS layer line count changed: ${layer.name}`);
});
const reconstructedCss = declaredLayers.map((name) => read(`css/${name}`)).join('');
const reconstructedHash = crypto.createHash('sha256').update(reconstructedCss).digest('hex');
requireCheck(reconstructedHash === styleManifest.sourceHash, 'CSS layer content or order changed without a reviewed baseline update');
requireCheck(Buffer.byteLength(reconstructedCss) <= baseline.cssSourceBytesMax, `CSS source grew: ${Buffer.byteLength(reconstructedCss)} > ${baseline.cssSourceBytesMax} bytes`);
const indexLines = lines('index.html');
requireCheck(indexLines <= baseline.indexLinesMax, `index.html grew: ${indexLines} > ${baseline.indexLinesMax}`);
requireCheck(inlineHandlers <= baseline.inlineHandlersMax, `Inline event handlers grew: ${inlineHandlers} > ${baseline.inlineHandlersMax}`);
Object.entries(baseline.largeScriptLinesMax).forEach(([file, maximum]) => {
  const count = lines(file);
  requireCheck(count <= maximum, `${file} grew: ${count} > ${maximum}`);
});

const syntaxFiles = [
  ...collectFiles('js', '.js'),
  ...collectFiles('admin', '.js'),
  absolute('service-worker.js'),
  absolute('scripts/build-public.js')
];
syntaxFiles.forEach((file) => {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`JavaScript syntax error: ${path.relative(root, file)}\n${result.stderr.trim()}`);
});

const policySandbox = { window: {} };
vm.runInNewContext(read('js/access-policy.js'), policySandbox, { filename: 'js/access-policy.js' });
const policy = policySandbox.window.HM_ACCESS_POLICY;
requireCheck(policy && policy.can('manageRelationshipCards', 'dom') === true, 'Dom must manage relationship cards');
requireCheck(policy && policy.can('manageRelationshipCards', 'sub') === false, 'Sub must not manage relationship cards');
requireCheck(policy && policy.can('manageSubRoutine', 'sub') === true, 'Sub must manage Sub routines');
requireCheck(policy && policy.can('viewOwnerNote', 'sub') === false, 'Sub must never view owner notes');

const saveSandbox = {
  window: { dispatchEvent() {} },
  document: { getElementById() { return null; } },
  CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options.detail; }
};
vm.runInNewContext(read('js/save-state.js'), saveSandbox, { filename: 'js/save-state.js' });
const saveState = saveSandbox.window.HM_SAVE_STATE;
requireCheck(saveState && saveState.infer('사진 저장 대기') === 'pending', 'Photo save wait must map to pending');
requireCheck(saveState && saveState.infer('서버 저장 완료') === 'saved', 'Save completion must map to saved');
requireCheck(saveState && saveState.infer('저장 실패') === 'error', 'Save failure must map to error');

const uiListeners = {};
let notificationOpened = false;
let dailyFieldChanged = false;
let missionOpened = false;
let missionClosed = false;
let missionTemplate = '';
let missionRandomized = false;
let missionLibrarySaved = false;
const missionChanges = [];
let clearedMissionRow = 0;
const relationshipCalls = [];
const historyCalls = [];
const settingsCalls = [];
const riskCalls = [];
const routineCalls = [];
const generalCalls = [];
const dailyCalls = [];
const dynamicCalls = [];
const uiSandbox = {
  window: {
    hmOpenNotificationCenter() { notificationOpened = true; },
    handleDailyFieldChanged() { dailyFieldChanged = true; },
    openMissionModal() { missionOpened = true; },
    closeMissionModal() { missionClosed = true; },
    addMissionTemplate(value) { missionTemplate = value; },
    addRandomMission() { missionRandomized = true; },
    saveMissionToLibrary() { missionLibrarySaved = true; },
    handleMissionChanged(completed) { missionChanges.push(completed); },
    clearMissionRow(row) { clearedMissionRow = row; },
    openRoomSettingsModal() { relationshipCalls.push('open'); },
    closeRoomSettingsModal() { relationshipCalls.push('close'); },
    setRelationshipRole(role) { relationshipCalls.push(`role:${role}`); },
    createMyRoom() { relationshipCalls.push('create'); },
    createInviteCode() { relationshipCalls.push('invite'); },
    acceptInviteFromInput() { relationshipCalls.push('accept'); },
    joinExistingRoomByCode() { relationshipCalls.push('join'); },
    openHistoryPanelModal() { historyCalls.push('open'); },
    closeHistoryPanelModal() { historyCalls.push('close'); },
    hmHistoryApplySearch() { historyCalls.push('search'); },
    hmHistoryClearSearch() { historyCalls.push('clear'); },
    closeDeletedRecordsModal() { historyCalls.push('deleted-close'); },
    closeHistoryDetailModal() { historyCalls.push('detail-close'); },
    selectHistoryDate(date) { historyCalls.push(`select:${date}`); },
    openHistoryDetailModal(date) { historyCalls.push(`detail:${date}`); },
    closeHistoryPhotoGallery() { historyCalls.push('photo-close'); },
    copyDirectText(event, date) { historyCalls.push(`copy:${date}:${event.target.dataset.hmAction}`); },
    deleteRecord(event, date) { historyCalls.push(`delete:${date}:${event.target.dataset.hmAction}`); },
    openAccountMenuModal() { settingsCalls.push('account-open'); },
    closeAccountMenuModal() { settingsCalls.push('account-close'); },
    openAccountChildModal(value) { settingsCalls.push(`child:${value}`); },
    logoutUser() { settingsCalls.push('logout'); },
    closeProfileModal() { settingsCalls.push('profile-close'); },
    updateProfileNicknamePreview() { settingsCalls.push('profile-preview'); },
    selectProfileAvatar(value) { settingsCalls.push(`avatar:${value}`); },
    saveProfileNickname() { settingsCalls.push('profile-save'); },
    closeThemeModal() { settingsCalls.push('theme-close'); },
    selectThemeMode(value) { settingsCalls.push(`theme-mode:${value}`); },
    previewPersonalTheme(value) { settingsCalls.push(`theme:${value}`); },
    previewDisplayMode(value) { settingsCalls.push(`display:${value}`); },
    savePersonalTheme() { settingsCalls.push('theme-save'); },
    closeDataManagementModal() { settingsCalls.push('data-close'); },
    selectDataManagementTab(value) { settingsCalls.push(`data-tab:${value}`); },
    updateDeleteRequestTypeNotice() { settingsCalls.push('delete-type'); },
    submitDataDeleteRequest() { settingsCalls.push('delete-submit'); },
    closeDataAdminModal() { settingsCalls.push('admin-close'); },
    setDataAdminFilter(value) { settingsCalls.push(`admin-filter:${value}`); },
    handleAuthSubmit() { riskCalls.push('auth'); },
    sendChatMessage() { riskCalls.push('chat'); },
    submitSupportTicket(event) { riskCalls.push(`support:${event.type}`); },
    hmHandleStructuredTimeChanged(value, commit) { riskCalls.push(`time:${value}:${String(commit)}`); },
    handlePhotoUpload(element) { riskCalls.push(`photo:${element.dataset.hmChange}`); },
    handleMealPhotoUpload(element, value) { riskCalls.push(`meal:${value}:${element.dataset.hmChange}`); },
    openSubRoutineHub() { routineCalls.push('sub-hub-open'); },
    closeSubRoutineHub() { routineCalls.push('sub-hub-close'); },
    openSubRoutineEditor(value) { routineCalls.push(`sub-edit:${value}`); },
    closeSubRoutineEditor() { routineCalls.push('sub-edit-close'); },
    addSubRoutineDraftItem() { routineCalls.push('sub-add'); },
    removeSubRoutineDraftItem(value) { routineCalls.push(`sub-remove:${value}`); },
    saveSubRoutine() { routineCalls.push('sub-save'); },
    deleteSubRoutine(value) { routineCalls.push(`sub-delete:${value}`); },
    openSubRoutineInput(value) { routineCalls.push(`sub-input:${value}`); },
    closeSubRoutineInput() { routineCalls.push('sub-input-close'); },
    saveSubRoutineInput() { routineCalls.push('sub-input-save'); },
    openCustomRoutineHub() { routineCalls.push('custom-hub-open'); },
    closeCustomRoutineHub() { routineCalls.push('custom-hub-close'); },
    openCustomRoutineManager() { routineCalls.push('custom-manager-open'); },
    closeCustomRoutineManager() { routineCalls.push('custom-manager-close'); },
    fillCustomRoutineTemplate(value) { routineCalls.push(`custom-template:${value}`); },
    updateCustomRoutineScheduleUi() { routineCalls.push('custom-schedule'); },
    selectAllCustomRoutineDays() { routineCalls.push('custom-days'); },
    addCustomRoutineDraftItem() { routineCalls.push('custom-add'); },
    removeCustomRoutineDraftItem(value) { routineCalls.push(`custom-remove:${value}`); },
    resetCustomRoutineEditor() { routineCalls.push('custom-reset'); },
    saveCustomRoutineCard() { routineCalls.push('custom-save'); },
    editCustomRoutineCard(value) { routineCalls.push(`custom-edit:${value}`); },
    toggleCustomRoutineCard(value) { routineCalls.push(`custom-toggle:${value}`); },
    deleteCustomRoutineCard(value) { routineCalls.push(`custom-delete:${value}`); },
    deleteLegacyRoutineItem(card, item) { routineCalls.push(`custom-legacy:${card}:${item}`); },
    openCustomRoutineInput(value) { routineCalls.push(`custom-input:${value}`); },
    closeCustomRoutineInput() { routineCalls.push('custom-input-close'); },
    saveCustomRoutineInput() { routineCalls.push('custom-input-save'); },
    setAuthMode(value) { generalCalls.push(`auth-mode:${value}`); },
    checkEmailVerificationStatus() { generalCalls.push('verify-check'); },
    resendEmailVerification() { generalCalls.push('verify-resend'); },
    openChatModal() { generalCalls.push('chat-open'); },
    closeChatModal() { generalCalls.push('chat-close'); },
    finalizeAndGenerateReport() { generalCalls.push('report'); },
    copyToClipboard() { generalCalls.push('copy-result'); },
    closeOnboardingModal(value) { generalCalls.push(`onboarding-close:${value}`); },
    startSoloOnboarding() { generalCalls.push('onboarding-solo'); },
    startTogetherOnboarding() { generalCalls.push('onboarding-together'); },
    openGuideModal() { generalCalls.push('guide-open'); },
    closeGuideModal(value) { generalCalls.push(`guide-close:${value}`); },
    selectHelpTab(value) { generalCalls.push(`help-tab:${value}`); },
    searchHelpCenter(value) { generalCalls.push(`help-search:${value}`); },
    toggleHelpFaq(element) { generalCalls.push(`faq:${element.dataset.hmAction}`); },
    loadSupportTickets(value) { generalCalls.push(`support-refresh:${value}`); },
    openHelpSearchMatch(value) { generalCalls.push(`help-match:${value}`); },
    submitSupportFollowUp(event, value) { generalCalls.push(`followup:${event.type}:${value}`); },
    submitSupportRating(event, value) { generalCalls.push(`rating:${event.type}:${value}`); },
    closeDailyModal(value) { dailyCalls.push(`close:${value}`); },
    addWater(value) { dailyCalls.push(`water:${value}:${typeof value}`); },
    resetWater() { dailyCalls.push('water-reset'); },
    cancelDailyMomentsAndClose() { dailyCalls.push('moments-cancel'); },
    saveDailyMomentsAndClose() { dailyCalls.push('moments-save'); },
    selectMood(value) { dailyCalls.push(`mood:${value}`); },
    saveMealPhotos() { dailyCalls.push('meal-photos'); },
    selectFeedbackType(value) { dailyCalls.push(`feedback:${value}`); },
    handleFeedbackConfirmedChanged() { dailyCalls.push('feedback-confirmed'); },
    toggleDailyChoice(value) { dailyCalls.push(`choice:${value}`); },
    handleOwnerNoteFieldChanged() { dailyCalls.push('owner-note'); },
    hmSetCustomAnniversaryType(value) { dynamicCalls.push(`anniversary-type:${value}`); },
    hmSetFirstMetFromAnniversary(value) { dynamicCalls.push(`anniversary-main:${value}`); },
    cancelDataDeleteRequest(value) { dynamicCalls.push(`data-cancel:${value}`); },
    executeApprovedRoomDisconnect(owner, request) { dynamicCalls.push(`disconnect:${owner}:${request}`); },
    processDataAdminRequest(owner, request, status) { dynamicCalls.push(`data-process:${owner}:${request}:${status}`); },
    deleteMissionFromLibrary(value) { dynamicCalls.push(`mission-delete:${value}`); },
    openPreviousRoom(value) { dynamicCalls.push(`room-open:${value}`); },
    copyInviteText(code, link, expires) { dynamicCalls.push(`invite:${code}:${link}:${expires}:${typeof expires}`); },
    hmHistoryChangeMonth(value) { dynamicCalls.push(`history-month:${value}:${typeof value}`); },
    hmSetDeletedRecordFilter(value) { dynamicCalls.push(`deleted-filter:${value}`); },
    hmRestoreDeletedRecord(value) { dynamicCalls.push(`deleted-restore:${value}`); },
    hmOpenHomeStatsModal(value) { dynamicCalls.push(`stats:${value}`); },
    hmToggleSummaryItem(value, checked) { dynamicCalls.push(`summary-toggle:${value}:${checked}`); },
    hmMoveSummaryItem(value, direction) { dynamicCalls.push(`summary-move:${value}:${direction}:${typeof direction}`); },
    hmRenderHistorySearch() { dynamicCalls.push('product-search'); }
  },
  document: { addEventListener(type, listener) { uiListeners[type] = listener; } }
};
vm.runInNewContext(read('js/ui-events.js'), uiSandbox, { filename: 'js/ui-events.js' });
const notificationElement = {
  disabled: false,
  dataset: { hmAction: 'open-notifications' },
  closest(selector) { return selector === '[data-hm-action]' ? this : null; }
};
if (uiListeners.click) uiListeners.click({ target: notificationElement });
requireCheck(notificationOpened, 'Home notification declarative action must call hmOpenNotificationCenter');
requireCheck(uiSandbox.window.HM_UI_EVENTS?.actionNames.includes('open-notifications'), 'Home notification action must be exposed by HM_UI_EVENTS');
const dailyInputElement = {
  dataset: { hmInput: 'daily-field-change' },
  closest(selector) { return selector === '[data-hm-input]' ? this : null; }
};
if (uiListeners.input) uiListeners.input({ target: dailyInputElement });
requireCheck(dailyFieldChanged, 'Daily record declarative input must call handleDailyFieldChanged');
requireCheck(uiSandbox.window.HM_UI_EVENTS?.actionNames.includes('daily-field-change'), 'Daily record input action must be exposed by HM_UI_EVENTS');
const missionActionElement = (action, value = '') => ({
  disabled: false,
  dataset: { hmAction: action, hmValue: value },
  closest(selector) { return selector === '[data-hm-action]' ? this : null; }
});
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-mission') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('add-mission-template', 'mission-test') });
const missionOverlayElement = missionActionElement('close-mission-overlay');
if (uiListeners.click) uiListeners.click({ target: missionOverlayElement });
requireCheck(missionOpened, 'Mission declarative open action must call openMissionModal');
requireCheck(missionClosed, 'Mission declarative overlay action must call closeMissionModal');
requireCheck(missionTemplate === 'mission-test', 'Mission template action must forward its data value');
if (uiListeners.click) uiListeners.click({ target: missionActionElement('add-random-mission') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-mission-library') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('clear-mission-row', '4') });
const missionChangeElement = {
  dataset: { hmChange: 'mission-completion-change' },
  closest(selector) { return selector === '[data-hm-change]' ? this : null; }
};
const missionTextElement = {
  dataset: { hmInput: 'mission-text-change' },
  closest(selector) { return selector === '[data-hm-input]' ? this : null; }
};
if (uiListeners.change) uiListeners.change({ target: missionChangeElement });
if (uiListeners.input) uiListeners.input({ target: missionTextElement });
requireCheck(missionRandomized, 'Mission random action must call addRandomMission');
requireCheck(missionLibrarySaved, 'Mission library action must call saveMissionToLibrary');
requireCheck(clearedMissionRow === 4, 'Mission clear action must forward its numeric row');
requireCheck(missionChanges.length === 2 && missionChanges[0] === true && missionChanges[1] === false, 'Mission change actions must preserve completion flags');
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-room-settings') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('set-relationship-role', 'sub') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('create-room') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('create-invite') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('accept-invite') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('join-existing-room') });
const roomOverlayElement = missionActionElement('close-room-settings-overlay');
if (uiListeners.click) uiListeners.click({ target: roomOverlayElement });
requireCheck(
  JSON.stringify(relationshipCalls) === JSON.stringify(['open', 'role:sub', 'create', 'invite', 'accept', 'join', 'close']),
  `Relationship declarative actions changed: ${relationshipCalls.join(', ')}`
);
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-history-panel') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('close-history-panel') });
const historyPanelOverlayElement = missionActionElement('close-history-panel-overlay');
if (uiListeners.click) uiListeners.click({ target: historyPanelOverlayElement });
const historySearchInputElement = {
  dataset: { hmInput: 'history-search' },
  closest(selector) { return selector === '[data-hm-input]' ? this : null; }
};
const historySearchChangeElement = {
  dataset: { hmChange: 'history-search' },
  closest(selector) { return selector === '[data-hm-change]' ? this : null; }
};
if (uiListeners.input) uiListeners.input({ target: historySearchInputElement });
if (uiListeners.change) uiListeners.change({ target: historySearchChangeElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('clear-history-search') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('close-deleted-records') });
const deletedOverlayElement = missionActionElement('close-deleted-records-overlay');
if (uiListeners.click) uiListeners.click({ target: deletedOverlayElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('close-history-detail') });
const detailOverlayElement = missionActionElement('close-history-detail-overlay');
if (uiListeners.click) uiListeners.click({ target: detailOverlayElement });
requireCheck(
  JSON.stringify(historyCalls) === JSON.stringify(['open', 'close', 'close', 'search', 'search', 'clear', 'deleted-close', 'deleted-close', 'detail-close', 'detail-close']),
  `History declarative actions changed: ${historyCalls.join(', ')}`
);
if (uiListeners.click) uiListeners.click({ target: missionActionElement('select-history-date', '2026-07-20') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-history-detail', '2026-07-21') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-history-photo-detail', '2026-07-22') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('copy-history-record', '2026-07-23') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('delete-history-record', '2026-07-24') });
requireCheck(
  JSON.stringify(historyCalls.slice(-6)) === JSON.stringify([
    'select:2026-07-20',
    'detail:2026-07-21',
    'photo-close',
    'detail:2026-07-22',
    'copy:2026-07-23:copy-history-record',
    'delete:2026-07-24:delete-history-record'
  ]),
  `Dynamic history actions changed: ${historyCalls.slice(-6).join(', ')}`
);
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-account-menu') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-account-child', 'theme') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('logout-account') });
const accountOverlayElement = missionActionElement('close-account-menu-overlay');
if (uiListeners.click) uiListeners.click({ target: accountOverlayElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('select-profile-avatar', 'avatar-test') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-profile') });
const profileOverlayElement = missionActionElement('close-profile-overlay');
if (uiListeners.click) uiListeners.click({ target: profileOverlayElement });
if (uiListeners.input) uiListeners.input({ target: { dataset: { hmInput: 'profile-nickname-preview' }, closest(selector) { return selector === '[data-hm-input]' ? this : null; } } });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('select-theme-mode', 'shared') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('preview-personal-theme', 'forest') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('preview-display-mode', 'dark') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-personal-theme') });
const themeOverlayElement = missionActionElement('close-theme-overlay');
if (uiListeners.click) uiListeners.click({ target: themeOverlayElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('select-data-tab', 'policy') });
if (uiListeners.change) uiListeners.change({ target: { dataset: { hmChange: 'delete-request-type' }, closest(selector) { return selector === '[data-hm-change]' ? this : null; } } });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('submit-data-delete-request') });
const dataOverlayElement = missionActionElement('close-data-management-overlay');
if (uiListeners.click) uiListeners.click({ target: dataOverlayElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('set-data-admin-filter', 'all') });
const adminOverlayElement = missionActionElement('close-data-admin-overlay');
if (uiListeners.click) uiListeners.click({ target: adminOverlayElement });
requireCheck(
  JSON.stringify(settingsCalls) === JSON.stringify([
    'account-open', 'child:theme', 'account-close', 'logout', 'account-close',
    'avatar:avatar-test', 'profile-save', 'profile-close', 'profile-preview',
    'theme-mode:shared', 'theme:forest', 'display:dark', 'theme-save', 'theme-close',
    'data-tab:policy', 'delete-type', 'delete-submit', 'data-close', 'admin-filter:all', 'admin-close'
  ]),
  `Settings declarative actions changed: ${settingsCalls.join(', ')}`
);
const riskElement = (binding, action, value = '', extra = {}) => ({
  dataset: { [binding]: action, hmValue: value, ...extra },
  closest(selector) { return selector === `[data-${binding.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}]` ? this : null; }
});
if (uiListeners.keypress) uiListeners.keypress({ type: 'keypress', key: 'Enter', target: riskElement('hmKeypress', 'auth-submit-enter') });
if (uiListeners.keypress) uiListeners.keypress({ type: 'keypress', key: 'Escape', target: riskElement('hmKeypress', 'auth-submit-enter') });
if (uiListeners.keypress) uiListeners.keypress({ type: 'keypress', key: 'Enter', target: riskElement('hmKeypress', 'chat-send-enter') });
if (uiListeners.submit) uiListeners.submit({ type: 'submit', target: riskElement('hmSubmit', 'support-ticket') });
if (uiListeners.change) uiListeners.change({ type: 'change', target: riskElement('hmChange', 'structured-time-change', 'wake', { hmCommit: 'true' }) });
if (uiListeners.input) uiListeners.input({ type: 'input', target: riskElement('hmInput', 'structured-time-change', 'wake', { hmCommit: 'false' }) });
if (uiListeners.input) uiListeners.input({ type: 'input', target: riskElement('hmInput', 'structured-time-change', 'sleep') });
if (uiListeners.blur) uiListeners.blur({ type: 'blur', target: riskElement('hmBlur', 'structured-time-change', 'sleep', { hmBlurCommit: 'true' }) });
if (uiListeners.change) uiListeners.change({ type: 'change', target: riskElement('hmChange', 'daily-photo-upload') });
if (uiListeners.change) uiListeners.change({ type: 'change', target: riskElement('hmChange', 'meal-photo-upload', 'dinner') });
requireCheck(
  JSON.stringify(riskCalls) === JSON.stringify([
    'auth', 'chat', 'support:submit', 'time:wake:true', 'time:wake:false', 'time:sleep:undefined', 'time:sleep:true',
    'photo:daily-photo-upload', 'meal:dinner:meal-photo-upload'
  ]),
  `High-risk declarative actions changed: ${riskCalls.join(', ')}`
);
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-sub-routine-hub') });
const subHubOverlay = missionActionElement('close-sub-routine-hub-overlay');
if (uiListeners.click) uiListeners.click({ target: subHubOverlay });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-sub-routine-editor', 'sub-1') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('remove-sub-routine-item', 'item-1') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-sub-routine') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('delete-sub-routine', 'sub-2') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-sub-routine-input', 'sub-3') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-sub-routine-input') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-custom-routine-hub') });
const customHubOverlay = missionActionElement('close-custom-routine-hub-overlay');
if (uiListeners.click) uiListeners.click({ target: customHubOverlay });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('fill-custom-routine-template', 'weekly') });
if (uiListeners.change) uiListeners.change({ type: 'change', target: riskElement('hmChange', 'custom-routine-schedule') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('remove-custom-routine-item', 'custom-item') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-custom-routine-card') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('edit-custom-routine', 'custom-1') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('toggle-custom-routine', 'custom-2') });
const legacyRoutineElement = missionActionElement('delete-legacy-routine-item', 'legacy-card');
legacyRoutineElement.dataset.hmExtra = 'legacy-item';
if (uiListeners.click) uiListeners.click({ target: legacyRoutineElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-custom-routine-input', 'custom-3') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-custom-routine-input') });
requireCheck(
  JSON.stringify(routineCalls) === JSON.stringify([
    'sub-hub-open', 'sub-hub-close', 'sub-edit:sub-1', 'sub-remove:item-1', 'sub-save', 'sub-delete:sub-2', 'sub-input:sub-3', 'sub-input-save',
    'custom-hub-open', 'custom-hub-close', 'custom-template:weekly', 'custom-schedule', 'custom-remove:custom-item', 'custom-save',
    'custom-manager-open', 'custom-edit:custom-1', 'custom-toggle:custom-2', 'custom-legacy:legacy-card:legacy-item', 'custom-input:custom-3', 'custom-input-save'
  ]),
  `Routine declarative actions changed: ${routineCalls.join(', ')}`
);
if (uiListeners.click) uiListeners.click({ target: missionActionElement('set-auth-mode', 'signup') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('check-email-verification') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('resend-email-verification') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-chat') });
const chatOverlay = missionActionElement('close-chat-overlay');
if (uiListeners.click) uiListeners.click({ target: chatOverlay });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('finalize-report') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('copy-result') });
const onboardingOverlay = missionActionElement('close-onboarding-overlay');
if (uiListeners.click) uiListeners.click({ target: onboardingOverlay });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('start-solo-onboarding') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-guide') });
const guideOverlay = missionActionElement('close-guide-overlay');
if (uiListeners.click) uiListeners.click({ target: guideOverlay });
const helpTabElement = missionActionElement('select-help-tab');
helpTabElement.dataset.helpTab = 'faq';
if (uiListeners.click) uiListeners.click({ target: helpTabElement });
const helpSearchElement = riskElement('hmInput', 'help-search');
helpSearchElement.value = '기록실';
if (uiListeners.input) uiListeners.input({ type: 'input', target: helpSearchElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('toggle-help-faq') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('refresh-support-tickets') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-help-search-match', 'history') });
if (uiListeners.submit) uiListeners.submit({ type: 'submit', target: riskElement('hmSubmit', 'support-followup', 'ticket-1') });
if (uiListeners.submit) uiListeners.submit({ type: 'submit', target: riskElement('hmSubmit', 'support-rating', 'ticket-2') });
requireCheck(
  JSON.stringify(generalCalls) === JSON.stringify([
    'auth-mode:signup', 'verify-check', 'verify-resend', 'chat-open', 'chat-close', 'report', 'copy-result',
    'onboarding-close:false', 'onboarding-solo', 'guide-open', 'guide-close:true', 'help-tab:faq', 'help-search:기록실',
    'faq:toggle-help-faq', 'support-refresh:true', 'help-match:history', 'followup:submit:ticket-1', 'rating:submit:ticket-2'
  ]),
  `General declarative actions changed: ${generalCalls.join(', ')}`
);
if (uiListeners.click) uiListeners.click({ target: missionActionElement('close-daily', 'wake') });
const dailyOverlayElement = missionActionElement('close-daily-overlay', 'sleep');
if (uiListeners.click) uiListeners.click({ target: dailyOverlayElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('add-water', '250') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('reset-water') });
const momentsOverlayElement = missionActionElement('cancel-daily-moments-overlay');
if (uiListeners.click) uiListeners.click({ target: momentsOverlayElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-daily-moments') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('select-mood', 'veryHard') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('save-meal-photos') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('select-feedback-type', 'support') });
if (uiListeners.change) uiListeners.change({ type: 'change', target: riskElement('hmChange', 'feedback-confirmed') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('toggle-daily-choice', 'rest') });
if (uiListeners.input) uiListeners.input({ type: 'input', target: riskElement('hmInput', 'owner-note-change') });
requireCheck(
  JSON.stringify(dailyCalls) === JSON.stringify([
    'close:wake', 'close:sleep', 'water:250:number', 'water-reset', 'moments-cancel', 'moments-save',
    'mood:veryHard', 'meal-photos', 'feedback:support', 'feedback-confirmed', 'choice:rest', 'owner-note'
  ]),
  `Daily record declarative actions changed: ${dailyCalls.join(', ')}`
);
if (uiListeners.click) uiListeners.click({ target: missionActionElement('set-anniversary-type', 'birthday') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('set-main-anniversary', 'ann-1') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('cancel-data-delete-request', 'request-1') });
const disconnectElement = missionActionElement('execute-room-disconnect', 'owner-1');
disconnectElement.dataset.hmExtra = 'request-2';
if (uiListeners.click) uiListeners.click({ target: disconnectElement });
const processElement = missionActionElement('process-data-admin-request', 'owner-2');
processElement.dataset.hmExtra = 'request-3'; processElement.dataset.hmOption = 'approved';
if (uiListeners.click) uiListeners.click({ target: processElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('delete-mission-library', 'mission-1') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-previous-room', 'ROOM1') });
const inviteElement = missionActionElement('copy-invite-text', 'CODE1');
inviteElement.dataset.hmExtra = 'https://example.test/invite'; inviteElement.dataset.hmNumber = '12345';
if (uiListeners.click) uiListeners.click({ target: inviteElement });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('change-history-month', '-1') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('set-deleted-record-filter', 'active') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('restore-deleted-record', '2026-07-22') });
if (uiListeners.click) uiListeners.click({ target: missionActionElement('open-home-stats', 'mood') });
const summaryToggleElement = riskElement('hmChange', 'toggle-summary-item', 'water'); summaryToggleElement.checked = true;
if (uiListeners.change) uiListeners.change({ type: 'change', target: summaryToggleElement });
const summaryMoveElement = missionActionElement('move-summary-item', 'water'); summaryMoveElement.dataset.hmNumber = '-1';
if (uiListeners.click) uiListeners.click({ target: summaryMoveElement });
if (uiListeners.input) uiListeners.input({ type: 'input', target: riskElement('hmInput', 'product-history-search') });
requireCheck(
  JSON.stringify(dynamicCalls) === JSON.stringify([
    'anniversary-type:birthday', 'anniversary-main:ann-1', 'data-cancel:request-1', 'disconnect:owner-1:request-2',
    'data-process:owner-2:request-3:approved', 'mission-delete:mission-1', 'room-open:ROOM1',
    'invite:CODE1:https://example.test/invite:12345:number', 'history-month:-1:number', 'deleted-filter:active',
    'deleted-restore:2026-07-22', 'stats:mood', 'summary-toggle:water:true', 'summary-move:water:-1:number', 'product-search'
  ]),
  `Dynamic declarative actions changed: ${dynamicCalls.join(', ')}`
);

const publicDirectory = absolute('public');
if (fs.existsSync(publicDirectory)) {
  const forbidden = ['database.rules.json', 'storage.rules', '.firebaserc', '.git'];
  forbidden.forEach((name) => {
    requireCheck(!fs.existsSync(path.join(publicDirectory, name)), `Forbidden deployment asset found: public/${name}`);
  });
}

notes.push(`CSS ${Buffer.byteLength(reconstructedCss)}/${baseline.cssSourceBytesMax} bytes in ${declaredLayers.length} ordered layers`);
notes.push(`index.html ${indexLines}/${baseline.indexLinesMax} lines`);
notes.push(`inline events ${inlineHandlers}/${baseline.inlineHandlersMax}`);
notes.forEach((message) => console.log(`[BASELINE] ${message}`));

if (errors.length) {
  errors.forEach((message) => console.error(`[FAIL] ${message}`));
  process.exit(1);
}
console.log(`[HearMe2nite] baseline verification passed (${releaseStep})`);
