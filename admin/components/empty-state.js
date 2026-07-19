import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a10-recovery-clean-20260719';

export function renderEmptyState(title = '표시할 데이터가 없습니다.', description = '조건을 바꾸거나 잠시 후 다시 확인해 주세요.') {
  return `
    <div class="state-card">
      <div class="state-icon" aria-hidden="true">⌁</div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>`;
}
