import { withTimeout } from './admin-utils.js';

function resolveFirebaseServices() {
  const firebaseSdk = window.firebase;

  if (!firebaseSdk || typeof firebaseSdk.auth !== 'function' || typeof firebaseSdk.database !== 'function') {
    throw new Error('Firebase SDK를 불러오지 못했습니다.');
  }

  // config.js declares babyAuth/db with top-level const. Those bindings are
  // available to classic scripts but are not properties of window, so an ES
  // module cannot read them through window.babyAuth/window.db. Resolve the
  // already initialized named app directly from the Firebase compat SDK.
  const babyApp = firebaseSdk.apps.find((app) => app && app.name === 'babyApp');

  if (!babyApp) {
    throw new Error('HearMe2nite Firebase 앱(babyApp)이 초기화되지 않았습니다.');
  }

  return {
    auth: firebaseSdk.auth(babyApp),
    database: firebaseSdk.database(babyApp)
  };
}

function requireFirebase() {
  return resolveFirebaseServices();
}

export function getAdminDatabase() {
  return requireFirebase().database;
}

export async function waitForAuthenticatedUser(timeoutMs = 10000) {
  const { auth } = requireFirebase();
  if (auth.currentUser) return auth.currentUser;

  return withTimeout(new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user || null);
    });
  }), timeoutMs, '로그인 세션 확인');
}

export async function readAdminProfile(uid) {
  const { database } = requireFirebase();
  const snapshot = await withTimeout(
    database.ref(`admins/${uid}`).once('value'),
    10000,
    '관리자 권한 확인'
  );
  return snapshot.val();
}

export function isActiveAdmin(profile) {
  return profile === true || Boolean(profile && typeof profile === 'object' && (
    profile.active === true || profile.enabled === true || profile.role === 'admin'
  ));
}

export async function signOutAdmin() {
  const { auth } = requireFirebase();
  await auth.signOut();
}
