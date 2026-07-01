# RC2.14.9 Header Presence Layout Hotfix

## Scope
- UI layout only.
- No Firebase / Room / History / Invite structure changes.

## Changes
- Repositioned the home version badge and presence dots onto a tighter single row.
- Forced the version badge margin override inside `.app-meta-row` to prevent old global badge styles from pulling the header apart.
- Reduced the vertical gap between the app header and the session/login card.

## QA
- Confirm v1.0 RC badge appears on the left side of the meta row.
- Confirm two online/offline dots appear on the right side of the same row.
- Confirm both dots still update in real time.
- Confirm PC / mobile / fold layout does not feel vertically detached.
