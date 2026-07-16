# STEP6.1.6 Admin Gate Direct QA

- Removed forced getIdToken(true) from admin gate.
- Reuses the same direct admins/{uid} lookup used by the user app.
- Adds a two-minute same-tab admin launcher marker after successful admin button visibility.
- Firebase Rules remain the final authority for all admin data reads.
- Adds stage logs and an 8-second permission lookup timeout.
- Prevents indefinite admin gate waiting.
