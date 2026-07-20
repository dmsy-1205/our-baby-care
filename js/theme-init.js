// Apply the saved theme before the main application renders.
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
    } catch (error) {
        document.documentElement.setAttribute('data-hm-theme', 'lavender');
        document.documentElement.setAttribute('data-hm-display-mode', 'system');
        document.documentElement.setAttribute('data-hm-display', 'light');
    }
})();
