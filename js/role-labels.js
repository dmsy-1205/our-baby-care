// Room participant nicknames for visible Dom/Sub guidance.
// Internal role keys, Firebase paths and access checks always remain dom/sub.
(function hmRoleLabelsModule(global) {
    'use strict';

    const DEFAULTS = Object.freeze({ dom: '관리 사용자', sub: '기록 사용자' });
    const DISPLAY_NICKNAME_MAX = 8;
    const ATTRIBUTES = Object.freeze(['aria-label', 'title', 'placeholder']);
    const originalText = new WeakMap();
    const renderedText = new WeakMap();
    const originalAttributes = new WeakMap();
    let labels = { ...DEFAULTS };
    let activeRef = null;
    let listenedRoom = '';
    let contextTimer = 0;
    let observer = null;

    function currentAuthUser() {
        try { return typeof currentUser !== 'undefined' ? currentUser : (global.currentUser || null); } catch (error) { return null; }
    }

    function currentRoom() {
        try { return String(typeof activeRoomCode !== 'undefined' ? activeRoomCode : (global.activeRoomCode || '')); } catch (error) { return ''; }
    }

    function currentRelationshipRole() {
        try {
            const active = typeof activeRelationshipRole !== 'undefined' ? activeRelationshipRole : global.activeRelationshipRole;
            const pending = typeof pendingRelationshipRole !== 'undefined' ? pendingRelationshipRole : global.pendingRelationshipRole;
            return active || pending || '';
        } catch (error) { return ''; }
    }

    function database() {
        try { return typeof db !== 'undefined' ? db : global.db; } catch (error) { return global.db; }
    }

    function cleanRoleLabel(value, fallback) {
        const normalized = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 20);
        return normalized || fallback;
    }

    function memberRole(member, uid) {
        const explicit = String(member?.relationshipRole || member?.presence?.relationshipRole || '').toLowerCase();
        if (explicit === 'dom' || explicit === 'sub') return explicit;
        if (uid === String(currentAuthUser()?.uid || '')) return currentRelationshipRole();
        if (member?.role === 'owner') return 'dom';
        return '';
    }

    function memberNickname(member, uid) {
        const ownNickname = uid === String(currentAuthUser()?.uid || '') ? global.hmCurrentNickname : '';
        return cleanRoleLabel(
            ownNickname || member?.nickname || member?.displayName || member?.name || member?.presence?.nickname,
            ''
        );
    }

    function displayNickname(value) {
        const nickname = String(value || '').trim();
        const characters = Array.from(nickname);
        return characters.length > DISPLAY_NICKNAME_MAX
            ? `${characters.slice(0, DISPLAY_NICKNAME_MAX).join('')}…`
            : nickname;
    }

    function nicknameLabels(membersValue) {
        const members = membersValue && typeof membersValue === 'object' ? membersValue : {};
        const next = { ...DEFAULTS };
        const unresolved = [];
        Object.entries(members).forEach(([uid, memberValue]) => {
            const member = memberValue || {};
            const nickname = memberNickname(member, uid);
            if (!nickname) return;
            const role = memberRole(member, uid);
            if (role === 'dom' || role === 'sub') next[role] = displayNickname(nickname);
            else unresolved.push(displayNickname(nickname));
        });
        const ownRole = currentRelationshipRole();
        const ownNickname = cleanRoleLabel(global.hmCurrentNickname, '');
        if ((ownRole === 'dom' || ownRole === 'sub') && ownNickname) next[ownRole] = displayNickname(ownNickname);
        const partnerRole = ownRole === 'dom' ? 'sub' : ownRole === 'sub' ? 'dom' : '';
        if (partnerRole && next[partnerRole] === DEFAULTS[partnerRole] && unresolved.length) {
            next[partnerRole] = unresolved[0];
        }
        return next;
    }

    function roleLabel(role) {
        return role === 'sub' ? labels.sub : labels.dom;
    }

    function roleHonorific(role) {
        const label = roleLabel(role);
        return label.endsWith('님') ? label : `${label}님`;
    }

    function replaceRoleToken(text, token, role) {
        const honorific = roleHonorific(role);
        const particles = {
            '만': `${honorific}만`,
            '은': `${honorific}은`,
            '는': `${honorific}은`,
            '이': `${honorific}이`,
            '가': `${honorific}이`,
            '의': `${honorific}의`,
            '과': `${honorific}과`,
            '와': `${honorific}과`,
            '에게': `${honorific}에게`,
            '께서': `${honorific}께서`
        };
        let output = text.replace(new RegExp(`${token}(?:님)?(에게|께서|만|은|는|이|가|의|과|와)`, 'g'), (_, particle) => particles[particle]);
        output = output.replace(new RegExp(token, 'g'), roleLabel(role));
        return output;
    }

    function roleText(value) {
        let output = String(value == null ? '' : value);
        const domHonorific = roleHonorific('dom');
        output = output.replace(/주인의/g, `${domHonorific}의`);
        output = output.replace(/주인님/g, domHonorific);
        output = output.replace(/주인만/g, `${domHonorific}만`);
        output = output.replace(/주인에게/g, `${domHonorific}에게`);
        output = output.replace(/주인이/g, `${domHonorific}이`);
        output = output.replace(/주인(?=\s*(?:비공개\s*메모|메모))/g, domHonorific);
        output = output.replace(/관리\(Dom\)/g, 'Dom');
        output = output.replace(/기록\(Sub\)/g, 'Sub');
        output = replaceRoleToken(output, 'Dom', 'dom');
        output = replaceRoleToken(output, 'Sub', 'sub');
        return output;
    }

    function shouldSkipTextNode(node) {
        const parent = node?.parentElement;
        return !parent || !!parent.closest('script,style,code,pre,textarea,[data-hm-role-label-ignore]');
    }

    function applyTextNode(node, externalMutation = false) {
        if (shouldSkipTextNode(node)) return;
        if (!originalText.has(node) || (externalMutation && node.nodeValue !== renderedText.get(node))) {
            originalText.set(node, node.nodeValue || '');
        }
        const next = roleText(originalText.get(node));
        if (node.nodeValue !== next) node.nodeValue = next;
        renderedText.set(node, next);
    }

    function applyAttributes(element, externalMutation = false) {
        if (!(element instanceof Element) || element.closest('[data-hm-role-label-ignore]')) return;
        let originals = originalAttributes.get(element);
        if (!originals) {
            originals = {};
            originalAttributes.set(element, originals);
        }
        ATTRIBUTES.forEach((attribute) => {
            if (!element.hasAttribute(attribute)) return;
            const current = element.getAttribute(attribute) || '';
            const renderedKey = `${attribute}Rendered`;
            if (!(attribute in originals) || (externalMutation && current !== originals[renderedKey])) {
                originals[attribute] = current;
            }
            const next = roleText(originals[attribute]);
            if (current !== next) element.setAttribute(attribute, next);
            originals[renderedKey] = next;
        });
    }

    function applyTree(root = document.body, externalMutation = false) {
        if (!root) return;
        if (root.nodeType === Node.TEXT_NODE) {
            applyTextNode(root, externalMutation);
            return;
        }
        if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
        if (root.nodeType === Node.ELEMENT_NODE) applyAttributes(root, externalMutation);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            if (node.nodeType === Node.TEXT_NODE) applyTextNode(node, externalMutation);
            else applyAttributes(node, externalMutation);
            node = walker.nextNode();
        }
    }

    function applyLabels(next) {
        labels = {
            dom: cleanRoleLabel(next?.dom, DEFAULTS.dom),
            sub: cleanRoleLabel(next?.sub, DEFAULTS.sub)
        };
        applyTree(document.body);
        document.dispatchEvent(new CustomEvent('hm-role-labels-changed', { detail: { ...labels } }));
    }

    function detach() {
        if (activeRef) activeRef.off();
        activeRef = null;
        listenedRoom = '';
    }

    function refreshForActiveRoom() {
        const room = currentRoom();
        const uid = String(currentAuthUser()?.uid || '');
        if (!room || !uid) {
            detach();
            if (labels.dom !== DEFAULTS.dom || labels.sub !== DEFAULTS.sub) applyLabels(DEFAULTS);
            return;
        }
        if (room === listenedRoom && activeRef) return;
        detach();
        listenedRoom = room;
        activeRef = database().ref(`roomMembers/${room}`);
        activeRef.on('value', (snapshot) => {
            if (room !== currentRoom() || uid !== String(currentAuthUser()?.uid || '')) return;
            applyLabels(nicknameLabels(snapshot.val()));
        }, (error) => {
            if (room !== currentRoom()) return;
            console.warn('[HearMe2nite][ROLE_LABELS] participant nickname read failed', error);
            applyLabels(DEFAULTS);
        });
    }

    function installDialogTransforms() {
        ['alert', 'confirm', 'prompt'].forEach((name) => {
            const native = global[name];
            if (typeof native !== 'function' || native.__hmRoleWrapped) return;
            const wrapped = function (...args) {
                if (args.length) args[0] = roleText(args[0]);
                return native.apply(global, args);
            };
            wrapped.__hmRoleWrapped = true;
            global[name] = wrapped;
        });
    }

    function start() {
        installDialogTransforms();
        applyTree(document.body);
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData') applyTextNode(mutation.target, true);
                else if (mutation.type === 'attributes') applyAttributes(mutation.target, true);
                else mutation.addedNodes.forEach((node) => applyTree(node));
            });
        });
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            characterData: true,
            characterDataOldValue: true,
            attributes: true,
            attributeFilter: ATTRIBUTES
        });
        refreshForActiveRoom();
        contextTimer = global.setInterval(refreshForActiveRoom, 700);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();

    Object.assign(global, {
        hmRoleText: roleText,
        hmGetRoleLabel: roleLabel,
        hmGetRoleHonorific: roleHonorific,
        hmRefreshRoleLabelsForActiveRoom: refreshForActiveRoom
    });
})(window);
