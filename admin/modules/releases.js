import { escapeHtml } from '../admin-utils.js?v=admin-2-0-a11-data-impact-preview-20260718';

const ADMIN_RELEASE_STEP = 'STEP A11';
const ADMIN_RELEASE_LABEL = 'Data Impact Preview';
const ADMIN_CACHE_KEY = 'admin-2-0-a11-data-impact-preview-20260718';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function renderReleaseChanges(changes) {
  if (!changes.length) {
    return '<li>?깅줉??蹂寃??댁뿭???놁뒿?덈떎.</li>';
  }

  return changes.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

export function render() {
  const release = window.HM_RELEASE || {};
  const changes = asArray(release.changes);

  return `
    <section class="module-view" aria-labelledby="adminReleaseHeading">
      <div class="foundation-notice">
        <span class="notice-icon" aria-hidden="true">燧?/span>
        <div>
          <h2 id="adminReleaseHeading">由대━???쇳꽣 쨌 諛고룷 湲곗???/h2>
          <p>硫붿씤??踰꾩쟾怨?愿由ъ옄 肄섏넄 ?ㅽ뀦??遺꾨━?댁꽌 ?뺤씤?⑸땲?? ???붾㈃? ?쎄린 ?꾩슜?낅땲??</p>
        </div>
      </div>

      <div class="metric-grid admin-release-metrics">
        <article class="metric-card">
          <span>硫붿씤??湲곗?</span>
          <strong>${escapeHtml(release.step || '-')}</strong>
          <small>${escapeHtml(release.appVersion || release.version || '-')}</small>
        </article>
        <article class="metric-card">
          <span>愿由ъ옄 湲곗?</span>
          <strong>${ADMIN_RELEASE_STEP}</strong>
          <small>${ADMIN_RELEASE_LABEL}</small>
        </article>
        <article class="metric-card">
          <span>由대━???좎쭨</span>
          <strong>${escapeHtml(release.releaseDate || '-')}</strong>
          <small>${escapeHtml(release.stage || 'Beta')}</small>
        </article>
        <article class="metric-card">
          <span>罹먯떆 ??/span>
          <strong>A11</strong>
          <small>${ADMIN_CACHE_KEY}</small>
        </article>
      </div>

      <article class="panel">
        <div class="panel-header admin-release-panel-header">
          <div>
            <h2>?꾩옱 諛고룷 ?뺣낫</h2>
            <p>愿由ъ옄 ?낅뜲?댄듃媛 硫붿씤??踰꾩쟾???щ━吏 ?딆븯?붿? ?뺤씤?섎뒗 湲곗??낅땲??</p>
          </div>
          <span class="phase-badge">Read Only</span>
        </div>

        <div class="admin-release-grid">
          <section class="admin-release-card">
            <h3>硫붿씤???덉젙 湲곗?</h3>
            <dl>
              <div><dt>?쒗뭹</dt><dd>${escapeHtml(release.product || 'HearMe2nite')}</dd></div>
              <div><dt>??踰꾩쟾</dt><dd>${escapeHtml(release.appVersion || release.version || '-')}</dd></div>
              <div><dt>?ㅽ뀦</dt><dd>${escapeHtml(release.step || '-')}</dd></div>
              <div><dt>鍮뚮뱶</dt><dd>${escapeHtml(release.build || '-')}</dd></div>
            </dl>
          </section>

          <section class="admin-release-card">
            <h3>愿由ъ옄 ?묒뾽 湲곗?</h3>
            <dl>
              <div><dt>愿由ъ옄 ?ㅽ뀦</dt><dd>${ADMIN_RELEASE_STEP}</dd></div>
              <div><dt>?묒뾽紐?/dt><dd>${ADMIN_RELEASE_LABEL}</dd></div>
              <div><dt>踰붿쐞</dt><dd>愿由ъ옄 ???꾩슜</dd></div>
              <div><dt>?ㅽ뻾 湲곕뒫</dt><dd>?놁쓬 쨌 ?쎄린 ?꾩슜</dd></div>
            </dl>
          </section>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header admin-release-panel-header">
          <div>
            <h2>諛고룷 ??泥댄겕</h2>
            <p>GitHub ?낅줈???꾩뿉 硫붿씤?깃낵 愿由ъ옄 ??湲곗????섎닠 ?뺤씤?⑸땲??</p>
          </div>
        </div>
        <div class="admin-release-checks">
          <div>??硫붿씤??踰꾩쟾? ${escapeHtml(release.step || '湲곗〈 ?덉젙 踰꾩쟾')} 湲곗? ?좎?</div>
          <div>??愿由ъ옄 罹먯떆??${ADMIN_CACHE_KEY} 湲곗??쇰줈 媛깆떊</div>
          <div>??愿由ъ옄 肄섏넄 醫뚯륫 諛곗??먯꽌 ?꾩옱 ?ㅽ뀦 ?뺤씤</div>
          <div>???ㅼ젣 ??젣쨌蹂듦뎄 ?ㅽ뻾 湲곕뒫? ?꾩쭅 ?곌껐?섏? ?딆쓬</div>
          <div>??諛고룷 ??愿由ъ옄 硫붾돱蹂??붾㈃ 吏꾩엯 ?뺤씤</div>
          <div>??臾몄젣媛 ?앷린硫?硫붿씤???덉젙 湲곗?怨?愿由ъ옄 ?ㅽ뀦??遺꾨━?댁꽌 濡ㅻ갚 ?먮떒</div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-header admin-release-panel-header">
          <div>
            <h2>?꾩옱 由대━??蹂寃??댁뿭</h2>
            <p>硫붿씤??湲곗? ?뚯씪???깅줉??蹂寃??댁뿭?낅땲??</p>
          </div>
        </div>
        <ul class="admin-release-changes">
          ${renderReleaseChanges(changes)}
        </ul>
      </article>
    </section>`;
}

