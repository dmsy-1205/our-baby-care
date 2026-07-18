import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-route-render-fix-20260719';

export function renderEmptyState(title = '표시할 데이터가 없습니다.', description = '조건을 바꾸거나 잠시 후 다시 확인해 주세요.', icon = '∅') {
  return `
    <div class="state-card">
      <div class="state-icon" aria-hidden="true">${escapeHtml(icon)}</div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>`;
}
