import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-1-clean-baseline-20260719';

const ADMIN_STEP = 'STEP A11';
const ADMIN_LABEL = 'Data Center Readonly';
const ADMIN_CACHE_KEY = 'admin-2-0-a11-1-clean-baseline-20260719';
const MAIN_STEP = 'STEP6.2.13.4';
const MAIN_VERSION = 'HearMe2nite v1.0 STEP6.2.13.4';
const RELEASE_DATE = '2026.07.19';

function safeChanges(release) {
  const changes = Array.isArray(release.changes) ? release.changes : [];
  const fallback = [
    '愿由ъ옄 怨듯넻 紐⑤뱢 UTF-8 臾몄옄???뺣━',
    '?곗씠???붿껌 愿由??붾㈃ ?곹깭쨌硫붾え ????덉젙??,
    '?쒖뒪???붾㈃???곗씠??愿由??쇳꽣 ?쎄린 ?먭? 異붽?',
    '蹂듦뎄 ?쇳꽣瑜??ㅽ뻾 ??湲곗????뺤씤 ?붾㈃?쇰줈 ?뺣━',
    '由대━?ㅼ? 愿由ъ옄 ?ㅽ뀦??硫붿씤??踰꾩쟾怨?遺꾨━ ?쒖떆',
    '硫붿씤??STEP6.2.13.4 湲곗? ?좎?'
  ];

  return (changes.length ? changes : fallback).slice(0, 8);
}

export function render() {
  const release = window.HM_RELEASE || {};
  const changes = safeChanges(release);

  return `
    <section class="module-view" aria-labelledby="releaseHeading">
      <section class="admin-hero-card">
        <div class="admin-hero-icon">燧놅툘</div>
        <div>
          <h2 id="releaseHeading">由대━???쇳꽣 쨌 諛고룷 湲곗???/h2>
          <p>硫붿씤??踰꾩쟾怨?愿由ъ옄 肄섏넄 ?ㅽ뀦??遺꾨━?댁꽌 ?뺤씤?⑸땲?? ???붾㈃? ?쎄린 ?꾩슜?낅땲??</p>
        </div>
      </section>

      <section class="admin-grid admin-grid-4">
        <article class="admin-card admin-metric"><span>硫붿씤??湲곗?</span><strong>${MAIN_STEP}</strong><small>${MAIN_VERSION}</small></article>
        <article class="admin-card admin-metric"><span>愿由ъ옄 湲곗?</span><strong>${ADMIN_STEP}</strong><small>${ADMIN_LABEL}</small></article>
        <article class="admin-card admin-metric"><span>由대━???좎쭨</span><strong>${RELEASE_DATE}</strong><small>Beta</small></article>
        <article class="admin-card admin-metric"><span>罹먯떆 ??/span><strong>A11</strong><small>${ADMIN_CACHE_KEY}</small></article>
      </section>

      <section class="admin-card admin-panel">
        <div class="admin-panel-head">
          <div>
            <h2>?꾩옱 諛고룷 ?뺣낫</h2>
            <p>愿由ъ옄 ?낅뜲?댄듃媛 硫붿씤??湲곗????щ━吏 ?딆븯?붿? ?뺤씤?섎뒗 湲곗??낅땲??</p>
          </div>
          <span class="admin-status-pill muted">Read Only</span>
        </div>
        <div class="admin-grid admin-grid-2">
          <article class="admin-soft-card">
            <h3>硫붿씤???덉젙 湲곗?</h3>
            <div class="admin-key-value"><span>?쒗뭹</span><strong>HearMe2nite</strong></div>
            <div class="admin-key-value"><span>??踰꾩쟾</span><strong>${MAIN_VERSION}</strong></div>
            <div class="admin-key-value"><span>?ㅽ뀦</span><strong>${MAIN_STEP}</strong></div>
            <div class="admin-key-value"><span>鍮뚮뱶</span><strong>20260718</strong></div>
          </article>
          <article class="admin-soft-card">
            <h3>愿由ъ옄 ?묒뾽 湲곗?</h3>
            <div class="admin-key-value"><span>愿由ъ옄 ?ㅽ뀦</span><strong>${ADMIN_STEP}</strong></div>
            <div class="admin-key-value"><span>?묒뾽紐?/span><strong>${ADMIN_LABEL}</strong></div>
            <div class="admin-key-value"><span>踰붿쐞</span><strong>愿由ъ옄 ???꾩슜</strong></div>
            <div class="admin-key-value"><span>?ㅽ뻾 湲곕뒫</span><strong>?놁쓬 쨌 ?쎄린/硫붾え/?곹깭 ???以묒떖</strong></div>
          </article>
        </div>
      </section>

      <section class="admin-card admin-panel">
        <h2>諛고룷 ??泥댄겕</h2>
        <p>GitHub ?낅줈???꾩뿉 硫붿씤?깃낵 愿由ъ옄 ??湲곗????섎닠 ?뺤씤?⑸땲??</p>
        <div class="admin-grid admin-grid-2">
          <div class="admin-check-row">??硫붿씤??踰꾩쟾? ${MAIN_STEP} 湲곗? ?좎?</div>
          <div class="admin-check-row">??愿由ъ옄 罹먯떆??${ADMIN_CACHE_KEY} 湲곗??쇰줈 媛깆떊</div>
          <div class="admin-check-row">??愿由ъ옄 肄섏넄 醫뚯륫 諛곗??먯꽌 ?꾩옱 ?ㅽ뀦 ?뺤씤</div>
          <div class="admin-check-row">???ㅼ젣 ??젣쨌蹂듦뎄 ?ㅽ뻾 湲곕뒫? ?꾩쭅 ?곌껐?섏? ?딆쓬</div>
          <div class="admin-check-row">??諛고룷 ??愿由ъ옄 硫붾돱蹂??붾㈃ 吏꾩엯 ?뺤씤</div>
          <div class="admin-check-row">??臾몄젣媛 ?앷린硫?硫붿씤???덉젙 湲곗?怨?愿由ъ옄 ?ㅽ뀦??遺꾨━?댁꽌 濡ㅻ갚 ?먮떒</div>
        </div>
      </section>

      <section class="admin-card admin-panel">
        <h2>?꾩옱 由대━??蹂寃??댁뿭</h2>
        <p>愿由ъ옄 湲곗? ?뚯씪???깅줉??蹂寃??댁뿭?낅땲??</p>
        <ul class="admin-change-list">
          ${changes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </section>
    </section>
  `;
}

