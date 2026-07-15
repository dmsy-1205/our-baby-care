# HearMe2nite v1.0 STEP6.1 Admin Console QA

## Scope
- New `admin.html` read-only console
- Existing `admins/{uid} === true` authorization reused
- User, Room, delete request, release and system status views
- No user/Room data write controls

## Required deployment
1. Deploy `database.rules.json` first.
2. Deploy Hosting files.
3. Sign in to the normal app with an administrator account.
4. Open `/admin.html` in the same browser.

## QA
- [ ] Non-authenticated user is blocked.
- [ ] Authenticated non-admin user is blocked.
- [ ] Admin account can open Dashboard.
- [ ] User count and list load.
- [ ] Room count and list load.
- [ ] User and Room search work.
- [ ] Delete requests display without mutation controls.
- [ ] Release information matches STEP6.1.
- [ ] Refresh works without permission errors.
- [ ] Mobile, tablet and desktop layouts remain usable.
- [ ] Existing user app login, Room, daily records, history, delete and restore are unchanged.
