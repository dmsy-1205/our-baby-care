import { withTimeout } from './admin-utils.js';

function requireFirebase() {
  if (!window.babyAuth || !window.db) {
    throw new Error('Firebase 초기화 정보를 찾지 못했습니다.');
  }
  return { auth: window.babyAuth, database: window.db };
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
