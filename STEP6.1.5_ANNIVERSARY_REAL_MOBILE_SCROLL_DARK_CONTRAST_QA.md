# STEP6.1.5 QA

## Scope
- Anniversary modal mobile scroll ownership moved from nested modal to top-level overlay.
- Body scroll is frozen and restored without losing page position.
- Main-date checkbox label receives explicit light/dark contrast.
- Firebase paths and anniversary save/delete logic are unchanged.

## Verify
1. Open History > Our Anniversaries on Android/iPhone/Fold.
2. Swipe from header, form, checkbox card, and registered-item card.
3. Confirm the final registered anniversary and bottom safe area are reachable.
4. Close modal and confirm the previous page scroll position is restored.
5. In dark mode confirm checkbox and full sentence are clearly visible.
6. Add/delete/set representative anniversary and verify existing behavior.
