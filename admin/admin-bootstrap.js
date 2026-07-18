import { waitForAuthenticatedUser, readAdminProfile, isActiveAdmin, signOutAdmin } from './admin-api.js?v=admin-2-0-a11-data-impact-preview-20260718';
import { setState } from './admin-state.js';
import { setDocumentBusy } from './admin-utils.js';
import { renderSidebar } from './components/sidebar.js?v=admin-2-0-a11-data-impact-preview-20260718';
import { startRouter, navigate } from './admin-router.js?v=admin-2-0-a11-data-impact-preview-20260718';

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
  showBoot('濡쒓렇???몄뀡???뺤씤?섍퀬 ?덉뒿?덈떎.');

  try {
    const user = await waitForAuthenticatedUser();
    if (!user) {
      setState({ phase: 'signed-out' });
      showBoot('濡쒓렇?몃맂 怨꾩젙???놁뒿?덈떎. ?ъ슜???깆뿉??愿由ъ옄 怨꾩젙?쇰줈 濡쒓렇?명빐 二쇱꽭??', { retry: true, error: true });
      return;
    }

    showBoot('愿由ъ옄 沅뚰븳???뺤씤?섍퀬 ?덉뒿?덈떎.');
    const adminProfile = await readAdminProfile(user.uid);
    if (!isActiveAdmin(adminProfile)) {
      setState({ phase: 'forbidden', user, adminProfile });
      showBoot('?묎렐 沅뚰븳???놁뒿?덈떎. ???붾㈃? ?깅줉???댁쁺 愿由ъ옄留??ъ슜?????덉뒿?덈떎.', { retry: true, error: true });
      return;
    }

    setState({ phase: 'ready', user, adminProfile, bootedAt: Date.now() });
    renderShell(user);
    startRouter();
    console.info('[Admin 2.0] secure foundation ready');
  } catch (error) {
    console.error('[Admin 2.0] bootstrap failed', error);
    setState({ phase: 'error', bootError: error });
    showBoot(`愿由ъ옄 ?쇳꽣瑜??쒖옉?섏? 紐삵뻽?듬땲?? ${error.message}`, { retry: true, error: true });
  } finally {
    setDocumentBusy(false);
  }
}

retryButton.addEventListener('click', bootstrap);
bootstrap();

