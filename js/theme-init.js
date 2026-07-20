// STEP5.10.9: 테마와 표시 모드를 Firebase 연결 전에 먼저 적용해 화면 깜빡임을 줄입니다.
// 2026-07-20: index.html 인라인 <script>에서 분리 (CSP에서 script-src 'unsafe-inline' 제거를 위함).
(function () {
    try {
        var theme = localStorage.getItem('hm_theme_last') || 'lavender';
        var displayMode = localStorage.getItem('hm_display_mode_last') || 'system';
        if (theme === 'midnight') { theme = 'lavender'; displayMode = 'dark'; }
        if (!/^(lavender|blossom|ocean|forest|cream)$/.test(theme)) theme = 'lavender';
        if (!/^(light|dark|system)$/.test(displayMode)) displayMode = 'system';
        var resolved = displayMode === 'system'
            ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : displayMode;
        document.documentElement.setAttribute('data-hm-theme', theme);
        document.documentElement.setAttribute('data-hm-display-mode', displayMode);
        document.documentElement.setAttribute('data-hm-display', resolved);
    } catch (e) {
        document.documentElement.setAttribute('data-hm-theme', 'lavender');
        document.documentElement.setAttribute('data-hm-display-mode', 'system');
        document.documentElement.setAttribute('data-hm-display', 'light');
    }
})();
