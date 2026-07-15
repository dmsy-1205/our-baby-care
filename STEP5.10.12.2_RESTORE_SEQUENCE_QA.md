# STEP5.10.12.2 Restore Sequence QA

1. Deploy the full source and confirm BOOT shows STEP5.10.12.2.
2. Confirm STEP5.10.12.1 database rules are deployed.
3. Delete a test date as Dom and confirm the archive exists.
4. Restore it and confirm no `update at / failed` message appears.
5. Confirm `days/{date}` and, when present, `dayAdmin/{date}` return.
6. Confirm the archive has `restored: true` and restore audit fields.
7. Confirm the Sub can see the restored date.
8. Force a failure only in a test project and confirm no partial restored paths remain.
