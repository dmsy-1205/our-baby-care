// =========================================================
// HearMe2nite RC2.18
// help-center.js - In-app Help Center tab controller
// Documentation only / no Firebase structure changes
// =========================================================

(function () {
    function selectHelpTab(tabName) {
        const root = document.getElementById('guideModal');
        if (!root || !tabName) return;

        const tabs = root.querySelectorAll('[data-help-tab]');
        const panels = root.querySelectorAll('[data-help-panel]');

        tabs.forEach((tab) => {
            const active = tab.dataset.helpTab === tabName;
            tab.classList.toggle('active', active);
            tab.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        panels.forEach((panel) => {
            const active = panel.dataset.helpPanel === tabName;
            panel.classList.toggle('active', active);
            panel.hidden = !active;
        });
    }

    function resetHelpCenter() {
        selectHelpTab('start');
    }

    window.selectHelpTab = selectHelpTab;
    window.resetHelpCenter = resetHelpCenter;

    document.addEventListener('DOMContentLoaded', function () {
        resetHelpCenter();
    });
})();
