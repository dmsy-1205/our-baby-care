import { withTimeout } from './admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';

const ADMIN_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDMVl65SWhqPcxrMY7h_ir7OgPbk7P1LAs',
  authDomain: 'our-baby-care.firebaseapp.com',
  databaseURL: 'https://our-baby-care-default-rtdb.firebaseio.com',
  projectId: 'our-baby-care',
  storageBucket: 'our-baby-care.appspot.com',
  messagingSenderId: '564751165',
  appId: '1:564751165:web:12012e95e1240e87e27354'
};

let cachedApp = null;

function getFirebaseApp() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK를 찾을 수 없습니다.');
  }

  if (cachedApp) return cachedApp;

  const namedApp = firebase.apps?.find((app) => app.name === 'babyApp');
  if (namedApp) {
    cachedApp = namedApp;
    return cachedApp;
  }

  if (firebase.apps?.length) {
    cachedApp = firebase.apps[0];
    return cachedApp;
  }

  cachedApp = firebase.initializeApp(window.firebaseConfig || ADMIN_FIREBASE_CONFIG, 'babyApp');
  return cachedApp;
}

export function getAdminDatabase() {
  return firebase.database(getFirebaseApp());
}

export function getAdminAuth() {
  return firebase.auth(getFirebaseApp());
}

export function getAdminFunctions() {
  return firebase.app(getFirebaseApp().name).functions('us-central1');
}

export function getAdminFirebaseEnvironment() {
  const app = getFirebaseApp();
  const projectId = String(app?.options?.projectId || window.HM_FIREBASE_ENV?.projectId || '');
  return Object.freeze({
    projectId,
    mode: projectId === 'hearme2nite1205' ? 'test' : 'production',
    permanentDeletionAllowed: projectId === 'hearme2nite1205'
  });
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
  if (profile === true) return true;
  if (!profile || typeof profile !== 'object') return false;
  return profile.active === true || profile.enabled === true || profile.role === 'owner' || profile.role === 'admin';
}

export async function signOutAdmin() {
  await getAdminAuth().signOut();
}
