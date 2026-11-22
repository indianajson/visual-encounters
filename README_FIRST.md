# Attack Template Workshop — Visual Encounters Theme Fix

This update is for Visual Encounters V2.1 with the Attack + Enemy Workshops from the 2026-11-22 build.

## Install

Extract `VisualEncounters_Attack_Workshop_Theme_Modified_2026-11-22.zip` over the **root of your Visual Encounters website repository** while preserving directories. Publish with your existing `publish.sh` or `publish.bat`. This is **not a server-side Lua patch**.

Alternatively, deploy the complete updated website ZIP. It contains the same Attack/Enemy Workshop and character mods as the prior full-site build; only the six files listed below differ from that previous release.

## Fixes

- Includes `#ve-attack-view` in the shared `visual-theme.css` view and native input/select/textarea/option/focus/disabled/checkbox styling rules.
- Uses `--ve-theme-*` and `--ve-control-*` tokens for Attack Workshop panels, toolbar, buttons, inputs, editor cards, custom shape previews, status messages, and hover/focus states.
- Removes fixed blue and error colors from `attack-workshop.css` in favor of matching light/dark theme tokens.
- Adds a theme-aware error token for sufficient light/dark contrast.
- Adapts the Attack Workshop to small-screen widths and reduced-motion preferences.
- Rebuilds `index.html` and `site-version.json` fingerprints so the browser retrieves the new CSS immediately after publishing.
- Adds `tests/attack-workshop-theme.test.js` and extends the original theme regression checks.

## Modified files

- `visual-theme.css`
- `attack-workshop.css`
- `index.html`
- `site-version.json`
- `tests/theme-settings.test.js`
- `tests/attack-workshop-theme.test.js`

## Tests

Run `node tests/attack-workshop-theme.test.js` and `node tests/theme-settings.test.js` from the site root. All seven `tests/*.test.js` suites passed. An isolated Chromium smoke test also confirmed light/dark computed colors and a visible keyboard focus outline for the Workshop's native selectors, buttons, and shape previews.

**No encounter schema, exported ZIP behavior, custom attacks, character mods, or server scripts changed.**
