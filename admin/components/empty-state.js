import { escapeHtml } from '../admin-utils.js';

export function renderEmptyState(title, description) {
  return `<div class="state-card"><span class="state-icon" aria-hidden="true">📭</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div>`;
}
