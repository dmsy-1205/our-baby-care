// =========================================================
// HearMe2nite RC2.18 UX Help Center
// Card guide / FAQ accordion / Search / Random tips
// No Firebase, Room, History, Presence structure changes
// =========================================================
(function () {
    const HELP_TIPS = [
        '매일 한 줄이라도 기록을 남겨보세요.',
        '커스텀 미션은 “물 2L 마시기”처럼 짧고 구체적으로 쓰면 좋아요.',
        '첫 만남, 첫 여행, 첫 데이트도 기념일로 남겨보세요.',
        '운동은 거창하지 않아도 괜찮아요. 산책도 충분히 좋은 기록입니다.',
        '기록실에서 날짜를 눌러 지난 추억을 다시 확인해 보세요.',
        '오늘의 약속에는 잊으면 안 되는 일정만 간단히 적어보세요.',
        '피드백은 칭찬을 먼저 쓰면 더 따뜻하게 전달됩니다.',
        '사진을 함께 남기면 기록실을 열었을 때 추억이 더 선명해져요.'
    ];

    function getRoot() {
        return document.getElementById('guideModal');
    }

    function selectHelpTab(tabName) {
        const root = getRoot();
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

        const results = document.getElementById('helpSearchResults');
        if (results) {
            results.hidden = true;
            results.innerHTML = '';
        }
    }

    function showRandomHelpTip() {
        const target = document.getElementById('helpRandomTip');
        if (!target) return;
        const index = Math.floor(Math.random() * HELP_TIPS.length);
        target.textContent = HELP_TIPS[index];
    }

    function toggleHelpFaq(button) {
        if (!button) return;
        const answer = button.nextElementSibling;
        const expanded = button.classList.toggle('open');
        button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (answer) answer.classList.toggle('open', expanded);
    }

    function searchHelpCenter(query) {
        const root = getRoot();
        const results = document.getElementById('helpSearchResults');
        if (!root || !results) return;

        const q = (query || '').trim().toLowerCase();
        if (!q) {
            results.hidden = true;
            results.innerHTML = '';
            return;
        }

        const cards = Array.from(root.querySelectorAll('[data-help-keywords]'));
        const matched = cards.filter((card) => {
            const haystack = `${card.textContent || ''} ${card.dataset.helpKeywords || ''}`.toLowerCase();
            return haystack.includes(q);
        }).slice(0, 6);

        if (!matched.length) {
            results.innerHTML = '<div class="help-empty-result">검색 결과가 없어요. “운동”, “미션”, “기념일”, “기록실”처럼 입력해 보세요.</div>';
            results.hidden = false;
            return;
        }

        results.innerHTML = matched.map((card) => {
            const title = card.querySelector('h3, .faq-question, strong')?.textContent?.replace('⌄', '').trim() || '사용 가이드';
            const text = (card.querySelector('p, .faq-answer, .help-tip')?.textContent || card.textContent || '').replace(/\s+/g, ' ').trim();
            return `<button type="button" class="help-result-card" onclick="openHelpSearchMatch('${card.closest('[data-help-panel]')?.dataset.helpPanel || 'home'}')"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(text.slice(0, 80))}</span></button>`;
        }).join('');
        results.hidden = false;
    }

    function openHelpSearchMatch(panelName) {
        selectHelpTab(panelName || 'home');
        const input = document.getElementById('helpSearchInput');
        if (input) input.value = '';
    }

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function resetHelpCenter() {
        const input = document.getElementById('helpSearchInput');
        if (input) input.value = '';
        selectHelpTab('home');
        showRandomHelpTip();
    }

    window.selectHelpTab = selectHelpTab;
    window.resetHelpCenter = resetHelpCenter;
    window.searchHelpCenter = searchHelpCenter;
    window.toggleHelpFaq = toggleHelpFaq;
    window.showRandomHelpTip = showRandomHelpTip;
    window.openHelpSearchMatch = openHelpSearchMatch;

    document.addEventListener('DOMContentLoaded', resetHelpCenter);
})();
