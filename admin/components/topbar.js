import { escapeHtml } from '../admin-utils.js';

const titles = {
  dashboard: ['운영 대시보드', '서비스 상태와 주요 운영 항목을 확인합니다.'],
  users: ['사용자', '사용자의 연결 상태를 읽기 전용으로 확인합니다.'],
  rooms: ['Room', 'Room 구성과 관계 무결성을 확인합니다.'],
  requests: ['데이터 요청', '삭제 및 데이터 관련 요청을 확인합니다.'],
  recovery: ['복구 센터', '삭제 감사와 복구 가능 상태를 확인합니다.'],
  audit: ['감사 로그', '관리자 작업 이력을 확인합니다.'],
  releases: ['릴리스', '현재 배포 버전과 릴리스 정보를 확인합니다.'],
  system: ['시스템', 'Firebase 연결 및 운영 환경을 확인합니다.']
};

export function renderTopbar(route) {
  const [title, description] = titles[route] || titles.dashboard;
  return `
    <header class="admin-topbar">
      <button id="sidebarToggle" class="icon-button mobile-only" type="button" aria-label="메뉴 열기">☰</button>
      <div class="topbar-title"><p class="eyebrow">BETA OPERATIONS</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div>
      <div class="topbar-actions"><span class="phase-badge">Phase 1 · Foundation</span></div>
    </header>`;
}
