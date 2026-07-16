export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

export function withTimeout(promise, timeoutMs, label = '작업') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} 시간이 초과되었습니다.`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timer));
}

export function formatDateTime(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date(number));
}

export function setDocumentBusy(isBusy) {
  document.documentElement.setAttribute('aria-busy', String(Boolean(isBusy)));
}
