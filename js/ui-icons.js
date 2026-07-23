// HearMe2nite UI icon system: 24px rounded outline icons for navigation and actions.
(function hmUiIconSystem() {
    'use strict';

    const paths = Object.freeze({
        target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4V2M20 12h2M12 20v2M4 12H2"/>',
        pulse: '<path d="M3 12h4l2.2-5 4.1 10 2.2-5H21"/><path d="M5 5.8a9 9 0 1 1-1.7 9.6"/>',
        note: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>',
        diamond: '<path d="m12 3 8 9-8 9-8-9z"/><path d="M9 12h6"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
        heart: '<path d="M20.8 5.9a5.3 5.3 0 0 0-7.5 0L12 7.2l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 22l8.8-8.6a5.3 5.3 0 0 0 0-7.5Z"/>',
        routine: '<path d="M4 7h11M4 12h8M4 17h11"/><path d="m17 14 3 3-3 3M20 17h-5"/>',
        smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c1.8 2 5.2 2 7 0"/>',
        scale: '<path d="M12 4v16M5 7h14M7 7l-4 7h8L7 7ZM17 7l-4 7h8l-4-7Z"/>',
        activity: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
        droplet: '<path d="M12 2s7 7.1 7 12a7 7 0 0 1-14 0c0-4.9 7-12 7-12Z"/><path d="M9 16c.7 1 1.7 1.5 3 1.5"/>',
        sunrise: '<path d="M4 18h16M6 14a6 6 0 0 1 12 0M12 3v3M4.2 6.2l2.1 2.1M19.8 6.2l-2.1 2.1"/>',
        meal: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/>',
        image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m5 18 5-5 3 3 2-2 4 4"/>',
        moon: '<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
        message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/>',
        gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M7.5 9C5 9 4 7.8 4 6.3 4 5 5 4 6.3 4 8.5 4 12 9 12 9M16.5 9C19 9 20 7.8 20 6.3 20 5 19 4 17.7 4 15.5 4 12 9 12 9"/>',
        lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
        trend: '<path d="M4 18 9 13l4 3 7-9"/><path d="M15 7h5v5"/>',
        history: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6M12 7v5l3 2"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
        help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 1-1 1.7M12 17h.01"/>',
        data: '<path d="M4 5c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2Z"/><path d="M4 5v6c0 1.1 3.6 2 8 2s8-.9 8-2V5M4 11v6c0 1.1 3.6 2 8 2s8-.9 8-2v-6"/>',
        shield: '<path d="M12 2 20 5v6c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V5z"/><path d="m9 12 2 2 4-4"/>'
        ,sparkles: '<path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"/>'
    });

    function render(name, className = 'hm-ui-icon') {
        const body = paths[name];
        if (!body) return '';
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
    }

    function mount(root = document) {
        root.querySelectorAll?.('[data-hm-ui-icon]').forEach((target) => {
            const name = target.dataset.hmUiIcon;
            if (target.dataset.hmUiIconMounted === name) return;
            target.innerHTML = render(name);
            target.dataset.hmUiIconMounted = name;
        });
    }

    window.HM_UI_ICONS = Object.freeze({ render, mount, names: Object.freeze(Object.keys(paths)) });
    document.addEventListener('DOMContentLoaded', () => mount());
})();
