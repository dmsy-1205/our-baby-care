// HearMe2nite centralized UI access policy.
(function hmAccessPolicyModule(global) {
    'use strict';

    const RULES = Object.freeze({
        manageRelationshipCards: Object.freeze(['dom']),
        editFeedback: Object.freeze(['dom']),
        editReward: Object.freeze(['dom']),
        viewOwnerNote: Object.freeze(['dom']),
        manageSubRoutine: Object.freeze(['sub']),
        useSharedConversation: Object.freeze(['dom', 'sub'])
    });

    function normalizeRole(role) {
        const value = String(role || '').trim().toLowerCase();
        return value === 'dom' || value === 'sub' ? value : '';
    }

    function can(feature, role) {
        const allowed = RULES[feature];
        return Array.isArray(allowed) && allowed.includes(normalizeRole(role));
    }

    global.HM_ACCESS_POLICY = Object.freeze({ RULES, normalizeRole, can });
})(window);
