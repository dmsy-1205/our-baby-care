# HearMe2nite STEP5.6.4.7 Final Security Audit

## Final baseline

- Version: HearMe2nite v1.0 STEP5.6.4.7
- Firebase product: Realtime Database
- Deployment: GitHub Actions → Firebase Hosting
- Database Rules deployment remains manual and separate from Hosting.

## Verified controls

1. Global default read and write are denied.
2. Administrator checks require `admins/{uid} === true`.
3. Users can only read Rooms where their membership exists.
4. Unknown Room child paths cannot be written.
5. Room owner metadata is protected after initial creation.
6. Owner/Dom-only paths include private owner notes, management cards, mission library, and dayAdmin data.
7. Chat messages validate authenticated sender UID, authenticated email, field types, and length.
8. Chat read status can only be changed by its UID owner or an administrator.
9. Daily general records and Dom-only records are stored separately while legacy reads remain compatible.
10. Invite codes use a 24-hour expiry, one-account claim, UID-bound membership creation, and reuse protection.
11. Existing Room switching does not recreate or mutate membership records.
12. RTDB Rules contain no Firestore-only `hasOnly()` or unsupported `numChildren()` calls.

## Hosting exposure hardening

Firebase Hosting uses the project root as its public directory. The final baseline excludes the following from deployment:

- Realtime Database and Storage Rules
- Legacy Rules files
- Functions source
- Internal documentation and README
- Backup files, ZIP archives, and source maps

The obsolete `js/room.js.bak` file was removed.

## Required release QA

- Existing Owner and Partner login and Room recovery
- Previous Room switching
- New Room creation
- Invite generation and Partner join
- Reuse of the same invite by another account is rejected
- Owner and Partner daily saves
- Owner feedback/gift save under dayAdmin
- Bidirectional chat and read status
- No application `permission_denied` messages during normal use

## Rules deployment reminder

GitHub Hosting deployment does not publish Realtime Database Rules. Back up the current console Rules and manually publish this release's `database.rules.json` only when Rules have changed.
