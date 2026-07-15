# STEP5.10.12.1 Record Restore Permission QA

1. Deploy Realtime Database Rules: `firebase deploy --only database`.
2. Deploy the complete web source and confirm BOOT shows STEP5.10.12.1.
3. Sign in as Dom and delete a test date.
4. Open Deleted Records and restore the date.
5. Confirm `days/{date}` and `dayAdmin/{date}` are recreated when snapshots exist.
6. Confirm `deletedRecords/{date}/restored` is true and restore audit fields exist.
7. Confirm `restoreInProgressBy` and `restoreInProgressAt` are removed after success.
8. Sign in as Sub and confirm the restored date is visible in History.
9. Confirm another Room member cannot restore records outside their Room.
