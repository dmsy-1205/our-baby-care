import { escapeHtml } from '../admin-utils.js';

const ADMIN_CONSOLE_STEP = 'STEP A11';
const ADMIN_CONSOLE_STEP_LABEL = 'Data Impact Preview';

const items = [
  ['dashboard', '??쒕낫??, '??],
  ['users', '?ъ슜??, '??],
  ['rooms', 'Room', '??],
  ['requests', '?곗씠???붿껌', '??],
  ['recovery', '蹂듦뎄 ?쇳꽣', '??],
  ['audit', '媛먯궗 濡쒓렇', '??],
  ['releases', '由대━??, '燧?],
  ['system', '?쒖뒪??, '??]
];

export function renderSidebar({ route, userEmail }) {
  return `
    <aside class="admin-sidebar" id="adminSidebar" aria-label="愿由ъ옄 硫붾돱">
      <div class="sidebar-brand">
        <span class="brand-symbol" aria-hidden="true">?ㅲ샑</span>
        <span><strong>HearMe2nite</strong><small>Admin Console 2.0</small><em class="admin-step-badge">${ADMIN_CONSOLE_STEP} 쨌 ${ADMIN_CONSOLE_STEP_LABEL}</em></span>
      </div>
      <nav class="sidebar-nav">
        ${items.map(([id, label, icon]) => `
          <button class="nav-item${route === id ? ' is-active' : ''}" type="button" data-route="${id}">
            <span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span>
          </button>`).join('')}
      </nav>
      <div class="sidebar-footer">
        <small>濡쒓렇??愿由ъ옄</small>
        <strong title="${escapeHtml(userEmail)}">${escapeHtml(userEmail)}</strong>
        <button id="adminSignOut" class="text-button" type="button">濡쒓렇?꾩썐</button>
      </div>
    </aside>`;
}

