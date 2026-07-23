// Room-scoped display labels for the fixed Dom/Sub permission roles.
// Internal role keys, Firebase paths and access checks always remain dom/sub.
(function hmRoleLabelsModule(global) {
    'use strict';

    const DEFAULTS = Object.freeze({ dom: 'Dom', sub: 'Sub' });
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
        const normalized = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 12);
        return normalized || fallback;
    }

    function roleLabel(role) {
        return role === 'sub' ? labels.sub : labels.dom;
    }

    function roleHonorific(role) {
        return `${roleLabel(role)}님`;
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

    function renderEditor() {
        const card = document.getElementById('roleDisplayLabelsCard');
        const domInput = document.getElementById('domDisplayRoleLabel');
        const subInput = document.getElementById('subDisplayRoleLabel');
        const help = document.getElementById('roleDisplayLabelsHelp');
        const role = currentRelationshipRole();
        const hasRoom = !!currentRoom();
        if (card) card.hidden = !hasRoom;
        if (domInput) {
            if (document.activeElement !== domInput) domInput.value = labels.dom;
            domInput.disabled = role !== 'dom' || !hasRoom;
        }
        if (subInput) {
            if (document.activeElement !== subInput) subInput.value = labels.sub;
            subInput.disabled = role !== 'sub' || !hasRoom;
        }
        if (help) {
            help.textContent = hasRoom
                ? `${roleHonorific(role === 'sub' ? 'sub' : 'dom')}은 자신의 화면 표시명만 변경할 수 있습니다. 실제 권한은 Dom/Sub로 유지됩니다.`
                : '공간을 연결하면 역할 표시명을 설정할 수 있습니다.';
        }
        const preview = document.getElementById('roleDisplayLabelsPreview');
        if (preview) preview.textContent = `${roleHonorific('dom')}이 작성하고 ${roleHonorific('sub')}이 확인합니다.`;
    }

    function applyLabels(next) {
        labels = {
            dom: cleanRoleLabel(next?.dom, DEFAULTS.dom),
            sub: cleanRoleLabel(next?.sub, DEFAULTS.sub)
        };
        applyTree(document.body);
        renderEditor();
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
            else renderEditor();
            return;
        }
        if (room === listenedRoom && activeRef) {
            renderEditor();
            return;
        }
        detach();
        listenedRoom = room;
        activeRef = database().ref(`rooms/${room}/meta/roleLabels`);
        activeRef.on('value', (snapshot) => {
            if (room !== currentRoom() || uid !== String(currentAuthUser()?.uid || '')) return;
            applyLabels(snapshot.val() || DEFAULTS);
        }, (error) => {
            if (room !== currentRoom()) return;
            console.warn('[HearMe2nite][ROLE_LABELS] display-label read failed', error);
            applyLabels(DEFAULTS);
        });
    }

    function validateInput(value) {
        const normalized = String(value || '').replace(/\s+/g, ' ').trim();
        if (normalized.length < 2 || normalized.length > 12) return { ok: false, message: '역할 표시명은 2~12자로 입력해 주세요.' };
        if (!/^[가-힣A-Za-z0-9][가-힣A-Za-z0-9 _-]*$/u.test(normalized)) return { ok: false, message: '한글, 영문, 숫자, 공백, -, _만 사용할 수 있습니다.' };
        if (/dom|sub/i.test(normalized) || /님$/.test(normalized)) return { ok: false, message: 'Dom/Sub 또는 “님”을 포함하지 않은 역할 이름을 입력해 주세요.' };
        return { ok: true, value: normalized };
    }

    async function saveOwnRoleLabel() {
        const room = currentRoom();
        const currentRole = currentRelationshipRole();
        const role = currentRole === 'sub' ? 'sub' : currentRole === 'dom' ? 'dom' : '';
        if (!room || !role || !currentAuthUser()) return alert('연결된 공간과 역할을 먼저 확인해 주세요.');
        const input = document.getElementById(role === 'dom' ? 'domDisplayRoleLabel' : 'subDisplayRoleLabel');
        const checked = validateInput(input?.value);
        if (!checked.ok) return alert(checked.message);
        try {
            await database().ref(`rooms/${room}/meta/roleLabels/${role}`).set(checked.value);
            if (typeof global.showSaveStatus === 'function') global.showSaveStatus('🏷️ 역할 표시명 저장 완료');
        } catch (error) {
            if (typeof global.hmReportError === 'function') global.hmReportError('roleLabels.save', error, '❌ 역할 표시명 저장 실패');
            else alert('역할 표시명을 저장하지 못했습니다.');
        }
    }

    async function resetOwnRoleLabel() {
        const room = currentRoom();
        const currentRole = currentRelationshipRole();
        const role = currentRole === 'sub' ? 'sub' : currentRole === 'dom' ? 'dom' : '';
        if (!room || !role || !currentAuthUser()) return;
        try {
            await database().ref(`rooms/${room}/meta/roleLabels/${role}`).remove();
            if (typeof global.showSaveStatus === 'function') global.showSaveStatus('🏷️ 기본 역할 이름으로 복원');
        } catch (error) {
            if (typeof global.hmReportError === 'function') global.hmReportError('roleLabels.reset', error, '❌ 역할 표시명 초기화 실패');
        }
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
        hmRefreshRoleLabelsForActiveRoom: refreshForActiveRoom,
        hmSaveOwnRoleLabel: saveOwnRoleLabel,
        hmResetOwnRoleLabel: resetOwnRoleLabel
    });
})(window);
