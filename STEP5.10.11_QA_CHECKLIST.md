# HearMe2nite v1.0 STEP5.10.11 QA Checklist

1. Deploy `database.rules.json` before the web build.
2. Dom deletes a test date and verifies the original disappears from History.
3. Confirm the deletion entry shows actor, time, app version, and remaining restore days.
4. Sign in as Sub and verify the Home deletion notice appears.
5. Sub acknowledges the notice and confirms the unread count decreases.
6. Test All / Recoverable / Restored / Expired filters.
7. Dom restores the record and verifies `days` and `dayAdmin` return.
8. Confirm the audit entry remains and shows restore time and restorer email.
9. Verify light, dark, mobile, Fold, tablet, and PC layouts.
10. Confirm no `permission_denied` errors during delete, acknowledge, restore, room switch, or logout.
