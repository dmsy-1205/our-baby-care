# HearMe2nite v1.0 STEP5.10.10 QA Checklist

## Required deployment
- Deploy `database.rules.json` before or together with the web build.
- Deploy the complete source package to Netlify/GitHub.

## Dom deletion test
1. Sign in as Dom/Owner and open a date with an existing record.
2. Delete the record and confirm the new 30-day recovery warning.
3. Verify the date disappears from the normal history calendar/detail.
4. Verify Firebase contains `rooms/{roomCode}/deletedRecords/{date}`.
5. Confirm the archive contains `originalDay`, `originalDayAdmin` when present, deletion time, UID, email, app version, and `restored: false`.

## Sub notification test
1. Sign in as Sub in another browser/private window.
2. Confirm the home deletion notice appears.
3. Open History and confirm the deleted date/time is visible.
4. Press Confirm and verify `seenBy/{subUid}` is written.
5. Confirm the home unread notice disappears after acknowledgement.

## Restore test
1. As Dom/Owner, press Restore within History.
2. Confirm the original date returns to the calendar and detail view.
3. Confirm `restored: true`, restore time, and restoring UID remain in `deletedRecords/{date}`.
4. Confirm Sub can see that the record was restored.

## Regression test
- Current-day autosave
- Today Promise and My Routine history
- Photos and daily detail
- Chat and presence
- Room switching
- Logout without permission errors
- Light/dark/system modes on PC and mobile
