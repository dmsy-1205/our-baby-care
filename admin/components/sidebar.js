import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { ADMIN_RELEASE } from '../admin-release.js';

const ADMIN_CONSOLE_STEP = ADMIN_RELEASE.step;
const ADMIN_CONSOLE_STEP_LABEL = ADMIN_RELEASE.label;

const items = [
  ['dashboard', '대시보드', '▦'],
  ['users', '사용자', '♙'],
  ['rooms', 'Room', '⌂'],
  ['lifecycle', '데이터 수명주기', '◉'],
  ['requests', '데이터 요청', '☑'],
  ['recovery', '복구 센터', '↺'],
  ['audit', '감사 로그', '≡'],
  ['releases', '릴리스', '⬆'],
  ['system', '시스템', '⚙']
];

export function renderSidebar({ route, userEmail }) {
  return `
    <aside class="admin-sidebar" id="adminSidebar" aria-label="관리자 메뉴">
      <div class="sidebar-brand">
        <span class="brand-symbol" aria-hidden="true">💕</span>
        <span>
          <strong>HearMe2nite</strong>
          <small>Admin Console 2.0</small>
          <em class="admin-step-badge">${ADMIN_CONSOLE_STEP} · ${ADMIN_CONSOLE_STEP_LABEL}</em>
        </span>
      </div>
      <nav class="sidebar-nav">
        ${items.map(([id, label, icon]) => `
          <button class="nav-item${route === id ? ' is-active' : ''}" type="button" data-route="${id}">
            <span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span>
          </button>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <small>로그인 관리자</small>
        <strong title="${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</strong>
        <button id="adminSignOut" class="text-button" type="button">로그아웃</button>
      </div>
    </aside>`;
}
