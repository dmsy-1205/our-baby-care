import { withTimeout } from './admin-utils.js?v=admin-2-0-a10-recovery-clean-20260719';

function getFirebaseApp() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK를 찾을 수 없습니다.');
  }
  if (firebase.apps?.length) return firebase.app();
  if (!window.firebaseConfig) {
    throw new Error('Firebase 설정을 찾을 수 없습니다.');
  }
  return firebase.initializeApp(window.firebaseConfig);
}

export function getAdminDatabase() {
  getFirebaseApp();
  return firebase.database();
}

export function getAdminAuth() {
  getFirebaseApp();
  return firebase.auth();
}

export function waitForAuthenticatedUser() {
  return withTimeout(new Promise((resolve) => {
    const auth = getAdminAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user || null);
    });
  }), 10000, '로그인 확인');
}

export async function readAdminProfile(uid) {
  if (!uid) return null;
  const snapshot = await withTimeout(
    getAdminDatabase().ref(`admins/${uid}`).once('value'),
    10000,
    '관리자 권한 확인'
  );
  return snapshot.val();
}

export function isActiveAdmin(profile) {
  if (!profile) return false;
  return profile.active === true || profile.role === 'owner' || profile.role === 'admin';
}

export async function signOutAdmin() {
  await getAdminAuth().signOut();
}
