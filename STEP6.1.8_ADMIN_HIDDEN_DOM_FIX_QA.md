# STEP6.1.8 Admin Hidden DOM Fix QA

## Root cause
`adminGate.hidden = true` was correctly executed, but `.admin-gate { display:grid }` and `.admin-shell { display:grid }` overrode the browser hidden presentation rule.

## Fix
- Added `[hidden]{display:none!important}` at the top of `css/admin.css`.
- Hardened `showGate()` and `showApp()` with explicit hidden attribute add/remove.
- Updated cache-busting version to STEP6.1.8.

## QA
1. Log in with an administrator account.
2. Open Account > Admin Console.
3. Confirm the session gate disappears.
4. Confirm sidebar, dashboard metrics, and refresh button are visible.
5. Confirm console logs `dashboard ready`.
6. Confirm non-admin data access remains protected by Firebase Rules.
