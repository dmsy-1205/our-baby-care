// HearMe2nite declarative UI event bridge.
(function hmUiEventsModule(global) {
    'use strict';

    const actions = Object.freeze({
        'open-daily': (element) => global.openDailyModal?.(element.dataset.hmValue || ''),
        'record-date-change': () => global.connectAndListenFirebase?.(),
        'open-notifications': () => global.hmOpenNotificationCenter?.(),
        'daily-field-change': () => global.handleDailyFieldChanged?.(),
        'open-mission': () => global.openMissionModal?.(),
        'close-mission': () => global.closeMissionModal?.(),
        'close-mission-overlay': (element, event) => {
            if (event.target === element) global.closeMissionModal?.();
        },
        'add-mission-template': (element) => global.addMissionTemplate?.(element.dataset.hmValue || ''),
        'add-random-mission': () => global.addRandomMission?.(),
        'save-mission-library': () => global.saveMissionToLibrary?.(),
        'mission-completion-change': () => global.handleMissionChanged?.(true),
        'mission-text-change': () => global.handleMissionChanged?.(false),
        'clear-mission-row': (element) => global.clearMissionRow?.(Number(element.dataset.hmValue)),
        'open-room-settings': () => global.openRoomSettingsModal?.(),
        'close-room-settings': () => global.closeRoomSettingsModal?.(),
        'close-room-settings-overlay': (element, event) => {
            if (event.target === element) global.closeRoomSettingsModal?.();
        },
        'set-relationship-role': (element) => global.setRelationshipRole?.(element.dataset.hmValue || ''),
        'save-role-display-label': () => global.hmSaveOwnRoleLabel?.(),
        'reset-role-display-label': () => global.hmResetOwnRoleLabel?.(),
        'create-room': () => global.createMyRoom?.(),
        'create-invite': () => global.createInviteCode?.(),
        'accept-invite': () => global.acceptInviteFromInput?.(),
        'join-existing-room': () => global.joinExistingRoomByCode?.(),
        'open-history-panel': () => global.openHistoryPanelModal?.(),
        'close-history-panel': () => global.closeHistoryPanelModal?.(),
        'close-history-panel-overlay': (element, event) => {
            if (event.target === element) global.closeHistoryPanelModal?.();
        },
        'history-search': () => global.hmHistoryApplySearch?.(),
        'clear-history-search': () => global.hmHistoryClearSearch?.(),
        'close-deleted-records': () => global.closeDeletedRecordsModal?.(),
        'close-deleted-records-overlay': (element, event) => {
            if (event.target === element) global.closeDeletedRecordsModal?.();
        },
        'close-history-detail': () => global.closeHistoryDetailModal?.(),
        'close-history-detail-overlay': (element, event) => {
            if (event.target === element) global.closeHistoryDetailModal?.();
        },
        'select-history-date': (element) => global.selectHistoryDate?.(element.dataset.hmValue || ''),
        'open-history-detail': (element) => global.openHistoryDetailModal?.(element.dataset.hmValue || ''),
        'open-history-photo-detail': (element) => {
            global.closeHistoryPhotoGallery?.();
            global.openHistoryDetailModal?.(element.dataset.hmValue || '');
        },
        'copy-history-record': (element, event) => global.copyDirectText?.(event, element.dataset.hmValue || ''),
        'delete-history-record': (element, event) => global.deleteRecord?.(event, element.dataset.hmValue || ''),
        'open-account-menu': () => global.openAccountMenuModal?.(),
        'close-account-menu': () => global.closeAccountMenuModal?.(),
        'close-account-menu-overlay': (element, event) => {
            if (event.target === element) global.closeAccountMenuModal?.();
        },
        'open-account-child': (element) => global.openAccountChildModal?.(element.dataset.hmValue || ''),
        'logout-account': () => {
            global.closeAccountMenuModal?.();
            global.logoutUser?.();
        },
        'close-profile': () => global.closeProfileModal?.(),
        'close-profile-overlay': (element, event) => {
            if (event.target === element) global.closeProfileModal?.();
        },
        'profile-nickname-preview': () => global.updateProfileNicknamePreview?.(),
        'select-profile-avatar': (element) => global.selectProfileAvatar?.(element.dataset.hmValue || ''),
        'save-profile': () => global.saveProfileNickname?.(),
        'close-theme': () => global.closeThemeModal?.(),
        'close-theme-overlay': (element, event) => {
            if (event.target === element) global.closeThemeModal?.();
        },
        'select-theme-mode': (element) => global.selectThemeMode?.(element.dataset.hmValue || ''),
        'preview-personal-theme': (element) => global.previewPersonalTheme?.(element.dataset.hmValue || ''),
        'preview-display-mode': (element) => global.previewDisplayMode?.(element.dataset.hmValue || ''),
        'save-personal-theme': () => global.savePersonalTheme?.(),
        'close-data-management': () => global.closeDataManagementModal?.(),
        'close-data-management-overlay': (element, event) => {
            if (event.target === element) global.closeDataManagementModal?.();
        },
        'select-data-tab': (element) => global.selectDataManagementTab?.(element.dataset.hmValue || ''),
        'delete-request-type': () => global.updateDeleteRequestTypeNotice?.(),
        'submit-data-delete-request': () => global.submitDataDeleteRequest?.(),
        'close-data-admin': () => global.closeDataAdminModal?.(),
        'close-data-admin-overlay': (element, event) => {
            if (event.target === element) global.closeDataAdminModal?.();
        },
        'set-data-admin-filter': (element) => global.setDataAdminFilter?.(element.dataset.hmValue || ''),
        'auth-submit-enter': (element, event) => {
            if (event.key === 'Enter') global.handleAuthSubmit?.();
        },
        'auth-email-enter': (element, event) => {
            if (event.key === 'Enter') document.getElementById('authPassword')?.focus();
        },
        'chat-send-enter': (element, event) => {
            if (event.key === 'Enter') global.sendChatMessage?.();
        },
        'support-ticket': (element, event) => global.submitSupportTicket?.(event),
        'structured-time-change': (element, event) => {
            const rawCommit = event.type === 'blur' ? element.dataset.hmBlurCommit : element.dataset.hmCommit;
            if (rawCommit === undefined) global.hmHandleStructuredTimeChanged?.(element.dataset.hmValue || '');
            else global.hmHandleStructuredTimeChanged?.(element.dataset.hmValue || '', rawCommit === 'true');
        },
        'daily-photo-upload': (element) => global.handlePhotoUpload?.(element),
        'meal-photo-upload': (element) => global.handleMealPhotoUpload?.(element, element.dataset.hmValue || ''),
        'open-sub-routine-hub': () => global.openSubRoutineHub?.(),
        'close-sub-routine-hub': () => global.closeSubRoutineHub?.(),
        'close-sub-routine-hub-overlay': (element, event) => {
            if (event.target === element) global.closeSubRoutineHub?.();
        },
        'open-sub-routine-editor': (element) => global.openSubRoutineEditor?.(element.dataset.hmValue || ''),
        'close-sub-routine-editor': () => global.closeSubRoutineEditor?.(),
        'close-sub-routine-editor-overlay': (element, event) => {
            if (event.target === element) global.closeSubRoutineEditor?.();
        },
        'add-sub-routine-item': () => global.addSubRoutineDraftItem?.(),
        'remove-sub-routine-item': (element) => global.removeSubRoutineDraftItem?.(element.dataset.hmValue || ''),
        'save-sub-routine': () => global.saveSubRoutine?.(),
        'delete-sub-routine': (element) => global.deleteSubRoutine?.(element.dataset.hmValue || ''),
        'open-sub-routine-input': (element) => global.openSubRoutineInput?.(element.dataset.hmValue || ''),
        'close-sub-routine-input': () => global.closeSubRoutineInput?.(),
        'close-sub-routine-input-overlay': (element, event) => {
            if (event.target === element) global.closeSubRoutineInput?.();
        },
        'save-sub-routine-input': () => global.saveSubRoutineInput?.(),
        'open-custom-routine-hub': () => global.openCustomRoutineHub?.(),
        'close-custom-routine-hub': () => global.closeCustomRoutineHub?.(),
        'close-custom-routine-hub-overlay': (element, event) => {
            if (event.target === element) global.closeCustomRoutineHub?.();
        },
        'open-custom-routine-manager': () => global.openCustomRoutineManager?.(),
        'close-custom-routine-manager': () => global.closeCustomRoutineManager?.(),
        'close-custom-routine-manager-overlay': (element, event) => {
            if (event.target === element) global.closeCustomRoutineManager?.();
        },
        'fill-custom-routine-template': (element) => global.fillCustomRoutineTemplate?.(element.dataset.hmValue || ''),
        'custom-routine-schedule': () => global.updateCustomRoutineScheduleUi?.(),
        'select-all-custom-routine-days': () => global.selectAllCustomRoutineDays?.(),
        'add-custom-routine-item': () => global.addCustomRoutineDraftItem?.(),
        'remove-custom-routine-item': (element) => global.removeCustomRoutineDraftItem?.(element.dataset.hmValue || ''),
        'reset-custom-routine-editor': () => global.resetCustomRoutineEditor?.(),
        'save-custom-routine-card': () => global.saveCustomRoutineCard?.(),
        'edit-custom-routine': (element) => {
            global.openCustomRoutineManager?.();
            global.editCustomRoutineCard?.(element.dataset.hmValue || '');
        },
        'toggle-custom-routine': (element) => global.toggleCustomRoutineCard?.(element.dataset.hmValue || ''),
        'delete-custom-routine': (element) => global.deleteCustomRoutineCard?.(element.dataset.hmValue || ''),
        'delete-legacy-routine-item': (element) => global.deleteLegacyRoutineItem?.(element.dataset.hmValue || '', element.dataset.hmExtra || ''),
        'open-custom-routine-input': (element) => global.openCustomRoutineInput?.(element.dataset.hmValue || ''),
        'close-custom-routine-input': () => global.closeCustomRoutineInput?.(),
        'close-custom-routine-input-overlay': (element, event) => {
            if (event.target === element) global.closeCustomRoutineInput?.();
        },
        'save-custom-routine-input': () => global.saveCustomRoutineInput?.(),
        'set-auth-mode': (element) => global.setAuthMode?.(element.dataset.hmValue || ''),
        'auth-submit': () => global.handleAuthSubmit?.(),
        'toggle-auth-password': (element) => global.toggleAuthPassword?.(element.dataset.hmTarget || '', element),
        'reset-auth-password': () => global.resetAuthPassword?.(),
        'check-email-verification': () => global.checkEmailVerificationStatus?.(),
        'resend-email-verification': () => global.resendEmailVerification?.(),
        'logout-user': () => global.logoutUser?.(),
        'open-chat': () => global.openChatModal?.(),
        'close-chat': () => global.closeChatModal?.(),
        'close-chat-overlay': (element, event) => {
            if (event.target === element) global.closeChatModal?.();
        },
        'send-chat': () => global.sendChatMessage?.(),
        'finalize-report': () => global.finalizeAndGenerateReport?.(),
        'copy-result': () => global.copyToClipboard?.(),
        'close-onboarding': () => global.closeOnboardingModal?.(false),
        'close-onboarding-overlay': (element, event) => {
            if (event.target === element) global.closeOnboardingModal?.(false);
        },
        'start-solo-onboarding': () => global.startSoloOnboarding?.(),
        'start-together-onboarding': () => global.startTogetherOnboarding?.(),
        'open-guide': () => global.openGuideModal?.(),
        'close-guide': () => global.closeGuideModal?.(true),
        'close-guide-overlay': (element, event) => {
            if (event.target === element) global.closeGuideModal?.(true);
        },
        'select-help-tab': (element) => global.selectHelpTab?.(element.dataset.hmValue || element.dataset.helpTab || ''),
        'help-search': (element) => global.searchHelpCenter?.(element.value || ''),
        'toggle-help-faq': (element) => global.toggleHelpFaq?.(element),
        'refresh-support-tickets': () => global.loadSupportTickets?.(true),
        'open-help-search-match': (element) => global.openHelpSearchMatch?.(element.dataset.hmValue || ''),
        'support-followup': (element, event) => global.submitSupportFollowUp?.(event, element.dataset.hmValue || ''),
        'support-rating': (element, event) => global.submitSupportRating?.(event, element.dataset.hmValue || ''),
        'close-daily': (element) => global.closeDailyModal?.(element.dataset.hmValue || ''),
        'close-daily-overlay': (element, event) => {
            if (event.target === element) global.closeDailyModal?.(element.dataset.hmValue || '');
        },
        'add-water': (element) => global.addWater?.(Number(element.dataset.hmValue)),
        'reset-water': () => global.resetWater?.(),
        'cancel-daily-moments': () => global.cancelDailyMomentsAndClose?.(),
        'cancel-daily-moments-overlay': (element, event) => {
            if (event.target === element) global.cancelDailyMomentsAndClose?.();
        },
        'save-daily-moments': () => global.saveDailyMomentsAndClose?.(),
        'select-mood': (element) => global.selectMood?.(element.dataset.hmValue || ''),
        'save-meal-photos': () => global.saveMealPhotos?.(),
        'select-feedback-type': (element) => global.selectFeedbackType?.(element.dataset.hmValue || ''),
        'feedback-confirmed': () => global.handleFeedbackConfirmedChanged?.(),
        'toggle-daily-choice': (element) => global.toggleDailyChoice?.(element.dataset.hmValue || ''),
        'owner-note-change': () => global.handleOwnerNoteFieldChanged?.(),
        'set-anniversary-type': (element) => global.hmSetCustomAnniversaryType?.(element.dataset.hmValue || ''),
        'set-main-anniversary': (element) => global.hmSetFirstMetFromAnniversary?.(element.dataset.hmValue || ''),
        'delete-anniversary': (element) => global.hmDeleteCustomAnniversary?.(element.dataset.hmValue || ''),
        'add-anniversary': () => global.hmAddCustomAnniversary?.(),
        'open-anniversary-settings': () => global.hmOpenAnniversarySettings?.(),
        'toggle-anniversary-panel': () => global.hmToggleAnniversaryPanel?.(),
        'cancel-data-delete-request': (element) => global.cancelDataDeleteRequest?.(element.dataset.hmValue || ''),
        'execute-room-disconnect': (element) => global.executeApprovedRoomDisconnect?.(element.dataset.hmValue || '', element.dataset.hmExtra || ''),
        'process-data-admin-request': (element) => global.processDataAdminRequest?.(element.dataset.hmValue || '', element.dataset.hmExtra || '', element.dataset.hmOption || ''),
        'save-data-admin-memo': (element) => global.saveDataAdminMemo?.(element.dataset.hmValue || '', element.dataset.hmExtra || ''),
        'delete-mission-library': (element) => global.deleteMissionFromLibrary?.(element.dataset.hmValue || ''),
        'open-previous-room': (element) => global.openPreviousRoom?.(element.dataset.hmValue || ''),
        'end-room-relationship': () => global.hmEndRoomRelationship?.(),
        'request-room-recovery': () => global.hmRequestRoomRecovery?.(),
        'approve-room-recovery': () => global.hmApproveRoomRecovery?.(),
        'cancel-room-recovery': () => global.hmCancelRoomRecovery?.(),
        'copy-invite-text': (element) => global.copyInviteText?.(element.dataset.hmValue || '', element.dataset.hmExtra || '', Number(element.dataset.hmNumber)),
        'close-history-photo-gallery': () => global.closeHistoryPhotoGallery?.(),
        'load-more-history-photos': () => global.loadMoreHistoryPhotos?.(),
        'open-history-photo-gallery': () => global.openHistoryPhotoGallery?.(),
        'change-history-month': (element) => global.hmHistoryChangeMonth?.(Number(element.dataset.hmValue)),
        'history-go-today': () => global.hmHistoryGoToday?.(),
        'open-deleted-records': () => global.openDeletedRecordsModal?.(),
        'set-deleted-record-filter': (element) => global.hmSetDeletedRecordFilter?.(element.dataset.hmValue || ''),
        'acknowledge-deleted-record': (element) => global.hmAcknowledgeDeletedRecord?.(element.dataset.hmValue || ''),
        'restore-deleted-record': (element) => global.hmRestoreDeletedRecord?.(element.dataset.hmValue || ''),
        'close-home-stats': () => global.hmCloseHomeStatsModal?.(),
        'open-home-stats': (element) => global.hmOpenHomeStatsModal?.(element.dataset.hmValue || ''),
        'set-home-stats-period': (element) => global.hmSetHomeStatsPeriod?.(element.dataset.hmValue || ''),
        'toggle-home-stats-graph': () => global.hmToggleHomeStatsGraph?.(),
        'toggle-home-stats-calendar': () => global.hmToggleHomeStatsCalendar?.(),
        'toggle-summary-settings': () => global.hmToggleSummarySettings?.(),
        'close-home-summary': () => global.hmCloseHomeSummaryModal?.(),
        'toggle-summary-item': (element) => global.hmToggleSummaryItem?.(element.dataset.hmValue || '', element.checked === true),
        'move-summary-item': (element) => global.hmMoveSummaryItem?.(element.dataset.hmValue || '', Number(element.dataset.hmNumber)),
        'save-summary-settings': () => global.hmSaveSummarySettings?.(),
        'product-history-search': () => global.hmRenderHistorySearch?.(),
        'export-current-history': () => global.hmExportCurrentHistoryText?.()
    });

    const relationshipProtectedActions = new Set([
        'open-daily', 'open-mission', 'open-custom-routine-hub', 'open-custom-routine-manager',
        'open-sub-routine-hub', 'open-sub-routine-editor', 'save-sub-routine',
        'save-sub-routine-input', 'add-sub-routine-item', 'save-custom-routine-card',
        'save-custom-routine-input', 'add-custom-routine-item', 'select-all-custom-routine-days',
        'fill-custom-routine-template', 'reset-custom-routine-editor', 'add-water', 'reset-water',
        'select-mood', 'select-feedback-type', 'toggle-daily-choice', 'save-daily-moments',
        'save-meal-photos', 'finalize-report', 'toggle-summary-settings',
        'toggle-summary-item', 'move-summary-item', 'save-summary-settings'
    ]);
    const relationshipProtectedInputs = new Set([
        'daily-field-change', 'structured-time-change', 'owner-note-change',
        'daily-photo-upload', 'meal-photo-upload', 'feedback-confirmed',
        'mission-text-change', 'mission-completion-change', 'custom-routine-schedule'
    ]);

    function relationshipAllowsEvent(element, actionName) {
        const isProtected = relationshipProtectedActions.has(actionName) || relationshipProtectedInputs.has(actionName);
        if (!isProtected || typeof global.hmGuardRelationshipDataAccess !== 'function') return true;
        const allowed = global.hmGuardRelationshipDataAccess();
        if (!allowed && element?.matches?.('input[type="file"]')) element.value = '';
        return allowed;
    }

    document.addEventListener('beforeinput', (event) => {
        const element = event.target.closest?.('[data-hm-input], [data-hm-change]');
        if (!element) return;
        const actionName = element.dataset.hmInput || element.dataset.hmChange || '';
        if (!relationshipAllowsEvent(element, actionName)) event.preventDefault();
    }, true);

    document.addEventListener('click', (event) => {
        const label = event.target.closest?.('label[for]');
        if (!label) return;
        const inputId = label.getAttribute('for');
        const input = inputId ? document.getElementById(inputId) : null;
        if (!input?.matches?.('input[type="file"][data-hm-change]')) return;
        if (!relationshipAllowsEvent(input, input.dataset.hmChange)) event.preventDefault();
    }, true);

    document.addEventListener('click', (event) => {
        const element = event.target.closest('[data-hm-action]');
        if (!element || element.disabled) return;
        if (!relationshipAllowsEvent(element, element.dataset.hmAction)) {
            event.preventDefault();
            return;
        }
        const action = actions[element.dataset.hmAction];
        if (action) action(element, event);
    });

    document.addEventListener('change', (event) => {
        const element = event.target.closest('[data-hm-change]');
        if (!element) return;
        if (!relationshipAllowsEvent(element, element.dataset.hmChange)) return;
        const action = actions[element.dataset.hmChange];
        if (action) action(element, event);
    });

    document.addEventListener('input', (event) => {
        const element = event.target.closest('[data-hm-input]');
        if (!element) return;
        if (!relationshipAllowsEvent(element, element.dataset.hmInput)) return;
        const action = actions[element.dataset.hmInput];
        if (action) action(element, event);
    });

    document.addEventListener('blur', (event) => {
        const element = event.target.closest('[data-hm-blur]');
        if (!element) return;
        if (!relationshipAllowsEvent(element, element.dataset.hmBlur)) return;
        const action = actions[element.dataset.hmBlur];
        if (action) action(element, event);
    }, true);

    document.addEventListener('keypress', (event) => {
        const element = event.target.closest('[data-hm-keypress]');
        if (!element) return;
        const action = actions[element.dataset.hmKeypress];
        if (action) action(element, event);
    });

    document.addEventListener('submit', (event) => {
        const element = event.target.closest('[data-hm-submit]');
        if (!element) return;
        const action = actions[element.dataset.hmSubmit];
        if (action) action(element, event);
    });

    global.HM_UI_EVENTS = Object.freeze({ actionNames: Object.keys(actions) });
})(window);
