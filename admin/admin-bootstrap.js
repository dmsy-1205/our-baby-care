import { waitForAuthenticatedUser, readAdminProfile, isActiveAdmin, signOutAdmin } from './admin-api.js?v=admin-2-0-a10-system-status-baseline-20260718';
import { setState } from './admin-state.js';
import { setDocumentBusy } from './admin-utils.js';
import { renderSidebar } from './components/sidebar.js?v=admin-2-0-a10-system-status-baseline-20260718';
import { startRouter, navigate } from './admin-router.js?v=admin-2-0-a10-system-status-baseline-20260718';

const boot = document.getElementById('adminBoot');
const root = document.getElementById('adminRoot');
const message = document.getElementById('adminBootMessage');
const actions = document.getElementById('adminBootActions');
const retryButton = document.getElementById('adminRetryButton');

function showBoot(text, { retry = false, error = false } = {}) {
  root.hidden = true;
  boot.hidden = false;
  boot.classList.toggle('has-error', error);
  message.textContent = text;
  actions.hidden = !retry;
}

function renderShell(user) {
  boot.hidden = true;
  root.hidden = false;
  root.innerHTML = `
    <div class="admin-shell">
      ${renderSidebar({ route: 'dashboard', userEmail: user.email || user.uid })}
      <div id="sidebarBackdrop" class="sidebar-backdrop" hidden></div>
      <main class="admin-main">
        <div id="adminTopbarHost"></div>
        <div id="adminOutlet" class="admin-outlet"></div>
      </main>
    </div>`;

  root.addEventListener('click', async (event) => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      await navigate(routeButton.dataset.route);
      closeSidebar();
      return;
    }
    if (event.target.closest('#adminSignOut')) {
      await signOutAdmin();
      location.replace('index.html');
      return;
    }
    if (event.target.closest('#sidebarToggle')) toggleSidebar();
    if (event.target.closest('#sidebarBackdrop')) closeSidebar();
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  const open = !sidebar.classList.contains('is-open');
  sidebar.classList.toggle('is-open', open);
  backdrop.hidden = !open;
}

function closeSidebar() {
  document.getElementById('adminSidebar')?.classList.remove('is-open');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (backdrop) backdrop.hidden = true;
}

async function bootstrap() {
  setDocumentBusy(true);
  setState({ phase: 'auth-check', bootError: null });
  showBoot('로그인 세션을 확인하고 있습니다.');

  try {
    const user = await waitForAuthenticatedUser();
    if (!user) {
      setState({ phase: 'signed-out' });
      showBoot('로그인된 계정이 없습니다. 사용자 앱에서 관리자 계정으로 로그인해 주세요.', { retry: true, error: true });
      return;
    }

    showBoot('관리자 권한을 확인하고 있습니다.');
    const adminProfile = await readAdminProfile(user.uid);
    if (!isActiveAdmin(adminProfile)) {
      setState({ phase: 'forbidden', user, adminProfile });
      showBoot('접근 권한이 없습니다. 이 화면은 등록된 운영 관리자만 사용할 수 있습니다.', { retry: true, error: true });
      return;
    }

    setState({ phase: 'ready', user, adminProfile, bootedAt: Date.now() });
    renderShell(user);
    startRouter();
    console.info('[Admin 2.0] secure foundation ready');
  } catch (error) {
    console.error('[Admin 2.0] bootstrap failed', error);
    setState({ phase: 'error', bootError: error });
    showBoot(`관리자 센터를 시작하지 못했습니다. ${error.message}`, { retry: true, error: true });
  } finally {
    setDocumentBusy(false);
  }
}

retryButton.addEventListener('click', bootstrap);
bootstrap();
