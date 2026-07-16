import { setState } from './admin-state.js';
import { renderTopbar } from './components/topbar.js';
import { renderLoadingState } from './components/loading-state.js';

const routes = new Set(['dashboard', 'users', 'rooms', 'requests', 'recovery', 'audit', 'releases', 'system']);

function normalizeRoute(value) {
  const route = String(value || '').replace(/^#\/?/, '').trim();
  return routes.has(route) ? route : 'dashboard';
}

async function loadModule(route) {
  return import(`./modules/${route}.js`);
}

export async function navigate(route, { replace = false } = {}) {
  const normalized = normalizeRoute(route);
  const outlet = document.getElementById('adminOutlet');
  const topbar = document.getElementById('adminTopbarHost');
  if (!outlet || !topbar) return;

  setState({ currentRoute: normalized });
  topbar.innerHTML = renderTopbar(normalized);
  outlet.innerHTML = renderLoadingState();
  document.querySelectorAll('[data-route]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.route === normalized);
  });

  if (replace) history.replaceState(null, '', `#/${normalized}`);
  else if (location.hash !== `#/${normalized}`) history.pushState(null, '', `#/${normalized}`);

  try {
    const module = await loadModule(normalized);
    outlet.innerHTML = module.render();
    document.title = `${topbar.querySelector('h1')?.textContent || '관리자'} · HearMe2nite`;
  } catch (error) {
    console.error('[Admin 2.0] route load failed', error);
    outlet.innerHTML = `<div class="error-card"><strong>화면을 불러오지 못했습니다.</strong><p>${error.message}</p></div>`;
  }
}

export function startRouter() {
  navigate(location.hash, { replace: !location.hash });
  window.addEventListener('hashchange', () => navigate(location.hash, { replace: true }));
}
