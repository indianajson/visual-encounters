# 🎨 VisualEncounters: Shared Themes and Settings

## What's new

- **Settings** is a fourth top-level tab, available alongside Legacy Format, V2.1 Format, and Enemy Template Workshop.
- Choose **Light** or **Dark** in Settings > Appearance. The old Legacy toolbar theme button is removed.
- The choice uses the existing browser `localStorage` key `darkMode`, so existing preferences carry forward and changes persist across visits when browser storage is enabled.
- All authoring tabs now share the same control, dropdown, focus, and selection color palette through `visual-theme.css`.
- Native `<select>`/`<option>` and Select2 dropdowns use explicit foreground/background colors and theme `color-scheme`, to prevent light dropdown menus inside dark fields.
- Workshop, V2.1, and Legacy data are **not** changed by the new Settings tab.

## Shared design tokens

Modify `visual-theme.css` to adjust appearance consistently across all tabs. The theme defines panel/text/border/accent colors and reusable control variables:

| Token | Purpose |
| --- | --- |
| `--ve-control-bg` | Input and closed selector background |
| `--ve-control-popup-bg` | Dropdown list background |
| `--ve-control-popup-text` | Dropdown option text |
| `--ve-control-selected-bg` | Selected option background |
| `--ve-control-hover-bg` | Hover/highlight background |
| `--ve-control-border` | Input and selector outline |
| `--ve-focus-ring` | Keyboard focus indication |

Dark mode favors darker, blue-gray dropdown options with pale text. Light mode uses pale controls and dark text. Because some operating systems render native option popups separately, precise highlight styling can still vary; `color-scheme` and explicit option text/background colors provide the best native coverage without replacing standard selectors.

## Publishing

Commit **all five code/release files** together:

- `index.html`
- `liberation-editor.js`
- `visual-theme.css` (new)
- `tools/update_site_version.py`
- `site-version.json`

Before pushing, run your existing `publish.bat` or `publish.sh`. It will run `tools/update_site_version.py` and stage the generated page title, JS fingerprints, CSS fingerprint, and release manifest.

The generator includes CSS in its build fingerprint and updates the stylesheet URL when its contents change. Re-running it with no changed resources is idempotent.

## Tests

```sh
node tests/theme-settings.test.js
node tests/v21-regression.test.js
node tests/cache-release.test.js
```

`tests/v21-export.test.js` in the supplied baseline already contains an unrelated validator error-text assertion mismatch and is not changed by this patch.
