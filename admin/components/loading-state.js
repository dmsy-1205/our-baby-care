import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';

export function renderLoadingState(message = '화면을 준비하고 있습니다.') {
  return `
    <div class="state-card">
      <div class="spinner" aria-hidden="true"></div>
      <strong>${escapeHtml(message)}</strong>
    </div>`;
}
