'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/profile.js'), 'utf8');

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function run() {
  const read = deferred();
  const save = deferred();
  const presenceWrites = [];
  let readMode = 'deferred';
  let saveMode = 'deferred';
  const elements = {
    profileNicknameInput: { value: '테스터', focus() {} },
    profileSaveBtn: { disabled: false },
    profileStatus: { textContent: '', className: '' }
  };
  const storage = new Map();
  const sandbox = {
    window: {},
    currentUser: { uid: 'dom-uid', email: 'dom@example.com' },
    activeRoomCode: 'ROOM-A',
    getRoomCodeForData() { return sandbox.activeRoomCode; },
    document: {
      getElementById(id) { return elements[id] || null; },
      querySelectorAll() { return []; }
    },
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    db: {
      ref(target) {
        return {
          once() { return readMode === 'deferred' ? read.promise : Promise.resolve({ val: () => ({ nickname: '현재 사용자' }) }); },
          update(value) {
            if (target.includes('/presence')) { presenceWrites.push({ target, value }); return Promise.resolve(); }
            return saveMode === 'deferred' ? save.promise : Promise.resolve();
          }
        };
      }
    },
    firebase: { database: { ServerValue: { TIMESTAMP: 1 } } },
    console,
    setTimeout,
    alert() {},
    hmReportError() {},
    hmIsFirebasePermissionError() { return false; },
    updateChatAlignment() {},
    showSaveStatus() {}
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'js/profile.js' });

  const staleRead = sandbox.loadUserProfile();
  sandbox.currentUser = { uid: 'sub-uid', email: 'sub@example.com' };
  sandbox.activeRoomCode = 'ROOM-B';
  read.resolve({ val: () => ({ nickname: '이전 Dom' }) });
  await staleRead;
  if (sandbox.window.hmCurrentNickname !== '') throw new Error('stale profile read changed the active nickname');

  sandbox.currentUser = { uid: 'dom-uid', email: 'dom@example.com' };
  sandbox.activeRoomCode = 'ROOM-A';
  const staleSave = sandbox.saveProfileNickname();
  sandbox.currentUser = { uid: 'sub-uid', email: 'sub@example.com' };
  sandbox.activeRoomCode = 'ROOM-B';
  save.resolve();
  await staleSave;
  if (presenceWrites.length !== 0) throw new Error('stale profile save wrote into Room presence');

  readMode = 'immediate';
  saveMode = 'immediate';
  await sandbox.loadUserProfile();
  if (sandbox.window.hmCurrentNickname !== '현재 사용자') throw new Error('current profile read did not update the nickname');

  console.log('[SESSION REGRESSION] stale Dom/Sub profile reads and writes were rejected');
}

run().catch((error) => {
  console.error(`[SESSION REGRESSION] ${error.message}`);
  process.exitCode = 1;
});
