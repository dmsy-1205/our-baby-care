export function renderLoadingState(message = '화면을 준비하고 있습니다.') {
  return `<div class="state-card"><div class="spinner" aria-hidden="true"></div><strong>${message}</strong></div>`;
}
