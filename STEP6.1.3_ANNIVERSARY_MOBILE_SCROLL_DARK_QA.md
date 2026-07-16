# HearMe2nite v1.0 STEP6.1.3 QA

## Scope
- Anniversary settings modal mobile touch scrolling
- Anniversary settings modal dark mode
- No Firebase path or anniversary save/delete logic changes

## Verification
1. Android/iPhone/Fold: open History > 우리의 기념일 > 관리.
2. Add enough anniversaries to exceed viewport height.
3. Swipe inside modal and verify the registered list reaches the final item.
4. Verify page behind modal does not scroll.
5. Close and reopen modal; scrolling starts at the top and remains responsive.
6. Enable dark mode and verify header, sections, chips, inputs, cards, text, main/delete buttons.
7. Verify light mode remains unchanged.
8. Verify add, representative-date selection, delete, calendar markers still work.
