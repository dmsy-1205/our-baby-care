import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';
import { ADMIN_RELEASE } from '../admin-release.js?v=admin-2-0-a17-1-2-firebase-data-sync-hotfix-20260721';

const titles = {
  dashboard: ['운영 대시보드', '서비스 상태와 주요 운영 항목을 확인합니다.'],
  users: ['사용자', '사용자의 연결 상태를 읽기 전용으로 확인합니다.'],
  rooms: ['Room', 'Room 구성과 관계 무결성을 확인합니다.'],
  lifecycle: ['데이터 수명주기', '빈 계정과 Room의 정리 후보를 읽기 전용으로 관찰합니다.'],
  requests: ['데이터 요청', '삭제 요청의 상태, 서버 사전점검과 승인 잠금을 확인합니다.'],
  support: ['문의 센터', '사용자 문의에 답변하고 내부 운영 메모를 관리합니다.'],
  backups: ['백업 센터', '삭제 전 운영 스냅샷과 체크섬 무결성을 확인합니다.'],
  recovery: ['복구 센터', '삭제 감사와 복구 가능 상태를 확인합니다.'],
  audit: ['감사 로그', '관리자 작업 이력을 확인합니다.'],
  releases: ['릴리스', '현재 배포 버전과 릴리스 정보를 확인합니다.'],
  system: ['통합 운영 점검', '계정·Room·문의·백업·복구 위험 신호를 교차 확인합니다.']
};

export function renderTopbar(route) {
  const [title, description] = titles[route] || titles.dashboard;
  return `
    <header class="admin-topbar">
      <button id="sidebarToggle" class="icon-button mobile-only" type="button" aria-label="메뉴 열기">☰</button>
      <div class="topbar-title">
        <p class="eyebrow">BETA OPERATIONS</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="topbar-actions"><span class="phase-badge">${escapeHtml(ADMIN_RELEASE.stage)} · ${escapeHtml(ADMIN_RELEASE.label)}</span></div>
    </header>`;
}
