# STEP5.10.11.2 QA Checklist

## Role guard
- [ ] Dom opens Feedback and sees full editing UI.
- [ ] Dom opens Today's Gift and sees full editing UI.
- [ ] Sub opens Feedback and sees only the manager-only notice.
- [ ] Sub opens Today's Gift and sees only the manager-only notice.
- [ ] Sub closing either modal does not trigger a write or permission error.

## Dark mode audit
- [ ] User Guide header, search, tabs, update card, FAQ, tips, and footer are dark.
- [ ] Feedback, gift, manager notices, deletion audit, data management, and common cards contain no white strip.
- [ ] Lavender, Blossom, Ocean, Forest, and Cream themes remain distinguishable in dark mode.
- [ ] PC, mobile, tablet, and Fold layouts remain centered and scroll correctly.

## Regression
- [ ] Login, Room, chat, routines, history, deletion notice, restore, and logout work.
- [ ] QA RELEASE_SYNC, duplicate function, duplicate ID, and Firebase checks pass.
