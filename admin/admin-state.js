const state = {
  phase: 'booting',
  user: null,
  adminProfile: null,
  currentRoute: 'dashboard',
  bootError: null,
  bootedAt: null
};

const listeners = new Set();

export function getState() {
  return Object.freeze({ ...state });
}

export function setState(patch) {
  Object.assign(state, patch);
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
  return snapshot;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
