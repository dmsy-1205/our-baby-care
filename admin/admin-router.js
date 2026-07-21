import { setState } from './admin-state.js';
import { renderTopbar } from './components/topbar.js?v=admin-2-0-a17-3-dual-firebase-environment-20260721';
import { renderLoadingState } from './components/loading-state.js?v=admin-2-0-a17-3-dual-firebase-environment-20260721';
import { ADMIN_RELEASE } from './admin-release.js?v=admin-2-0-a17-3-dual-firebase-environment-20260721';

const routes = new Set(['dashboard', 'users', 'rooms', 'lifecycle', 'requests', 'support', 'backups', 'recovery', 'audit', 'releases', 'system']);
const ADMIN_MODULE_VERSION = ADMIN_RELEASE.cacheKey;
let navigationSequence = 0;

function normalizeRoute(value) {
  const route = String(value || '').replace(/^#\/?/, '').trim();
  return routes.has(route) ? route : 'dashboard';
}

async function loadModule(route) {
  return import(`./modules/${route}.js?v=${ADMIN_MODULE_VERSION}`);
}

export async function navigate(route, { replace = false } = {}) {
  const normalized = normalizeRoute(route);
  const previousOutlet = document.getElementById('adminOutlet');
  const topbar = document.getElementById('adminTopbarHost');
  if (!previousOutlet || !topbar) return;

  const navigationId = ++navigationSequence;
  const outlet = previousOutlet.cloneNode(false);
  previousOutlet.replaceWith(outlet);

  setState({ currentRoute: normalized });
  topbar.innerHTML = renderTopbar(normalized);
  outlet.innerHTML = renderLoadingState();

  document.querySelectorAll('[data-route]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.route === normalized);
  });

  if (replace) {
    history.replaceState(null, '', `#/${normalized}`);
  } else if (location.hash !== `#/${normalized}`) {
    history.pushState(null, '', `#/${normalized}`);
  }

  try {
    const module = await loadModule(normalized);
    const html = await Promise.resolve(module.render());
    if (navigationId !== navigationSequence || !outlet.isConnected) return;
    outlet.innerHTML = html || '';

    if (typeof module.afterRender === 'function') {
      await Promise.resolve(module.afterRender(outlet));
    }

    document.title = `${topbar.querySelector('h1')?.textContent || '관리자'} · HearMe2nite`;
  } catch (error) {
    if (navigationId !== navigationSequence || !outlet.isConnected) return;
    console.error('[Admin 2.0] route load failed', error);
    outlet.innerHTML = `
      <div class="error-card">
        <strong>화면을 불러오지 못했습니다.</strong>
        <p>${error.message || error}</p>
      </div>`;
  }
}

export function startRouter() {
  navigate(location.hash, { replace: !location.hash });
  window.addEventListener('hashchange', () => navigate(location.hash, { replace: true }));
}
