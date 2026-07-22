// HearMe2nite centralized save-state contract.
(function hmSaveStateModule(global) {
    'use strict';

    const STATES = Object.freeze(['idle', 'editing', 'pending', 'saving', 'saved', 'error']);

    function normalize(state) {
        return STATES.includes(state) ? state : 'idle';
    }

    function infer(message) {
        const value = String(message || '');
        if (/실패|권한 없음|오류/.test(value)) return 'error';
        if (/저장 대기|연결 대기|오프라인/.test(value)) return 'pending';
        if (/입력 중|저장 중|동기화 중/.test(value)) return 'saving';
        if (/완료|저장됨|동기화 완료/.test(value)) return 'saved';
        return 'idle';
    }

    function set(state, message) {
        const element = document.getElementById('saveStatus');
        const value = String(message || '');
        const normalized = normalize(state || infer(value));
        if (element) {
            element.innerText = value;
            element.dataset.saveState = normalized;
            element.setAttribute('aria-label', `자동 저장 상태: ${value.replace(/^\S+\s*/, '') || value}`);
        }
        global.dispatchEvent(new CustomEvent('hm:save-state', { detail: { state: normalized, message: value } }));
        return normalized;
    }

    global.HM_SAVE_STATE = Object.freeze({ STATES, normalize, infer, set });
})(window);
