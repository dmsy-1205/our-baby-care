# HearMe2nite CSS structure

`css/style.css` is the only HTML entry point. Its imports must remain in the exact order recorded by `css/style.layers.json`.

## Directories

- `tokens.css`: earliest shared compatibility tokens.
- `components/`: app shell, top bar, buttons, inputs, cards, and modals.
- `screens/`: home, daily, missions, records, relationship, and settings rules.
- `legacy/`: mixed chronological rules that cannot be moved safely without changing the cascade.

## Safety rules

1. Do not reorder imports to group files by directory.
2. Do not merge legacy files merely because selectors look duplicated.
3. Move a rule only with its responsive, theme, state, and animation dependencies.
4. Run `node scripts/verify-app-baseline.js` before and after `node scripts/build-public.js`.
5. Deploy Hosting to the test project only after local light/dark, responsive, and Dom/Sub checks pass.

The manifest locks every file's byte count, line count, combined hash, and cascade position.
