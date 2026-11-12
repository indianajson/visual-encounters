# VisualEncounters V2.1 — Files Changed and Installation

## Install the **website/editor** update

Unzip the updated VisualEncounters files into your **VisualEncounters website/repository root**, not into the ONB server. Keep its existing `mods/`, `enemies/`, `obstacles/`, `tile/`, `ow-preview/`, and other media folders. Open `index.html` from a web server or your hosted VisualEncounters page.

The **V2.1 format** tab then generates a **separate, server-ready ZIP** for an individual Liberation map. Extract that generated ZIP into the **OpenNetBattle server root**. This is different from installing the editor itself.

## Edited files (complete replacements)

| File | Changes |
|---|---|
| `index.html` | Loads the local JSZip dependency and the new V2.1 builder before `liberation-editor.js`; legacy UI remains intact |
| `liberation-editor.js` | Map-named V2.1 export, scoped ZIP creation, all three battle categories, no battle rewards, three-turn defaults, template/mod packaging, real `DEBUGLIB.lua` import/export support |
| `README.md` | Links to the new exporter guide |
| `NEBULOUS_EDITOR_UPDATE.md` | Updated instructions for the new output format |

## New files

| File | Purpose |
|---|---|
| `v21-export.js` | Validates mission names/aliases and safely patches the repaired EZEncounters entry.lua |
| `mods/ezencounters-v21-base.zip` | **Verified repaired baseline** from the November 11 DEBUGLIB `get_package_id` fix; required by new bundle downloads |
| `vendor/jszip.min.js` | Locally hosted JSZip 3.10.1 for deterministic ZIP generation |
| `vendor/JSZIP_LICENSE.md` | JSZip's license notice |
| `V21_EXPORT_GUIDE.md` | Full mission creation, export, and installation guide |
| `V21_RELEASE_NOTES.md` | This file |
| `tests/v21-export.test.js` | Browser-independent package-safety regression test (requires Node.js) |

## Browser export contents

An export named `LiberationEasyMode` creates a deployable ZIP with:

```text
encounters/LiberationEasyMode.lua
assets/ezlibs-assets/ezencounters/ezencounters-liberation-liberationeasymode.zip
scripts/ezlibs-custom/nebulous-liberations/liberations/enemies/template_<name>.lua   (if authored)
assets/ezlibs-assets/ezencounters/<hosted-character-mod>.zip                       (if requested and available)
INSTALL_V21_MISSION.md
ENEMY_TEMPLATE_REGISTRATION.md
```

**Not automatically generated:** Tiled `.tmx` files, mission gate/NPC configuration, new character packages, new HP-mod variants, custom overworld attack AI, or a merged `enemy_templates.lua` registry. The builder lists unprovided dependencies rather than inventing them.

## Safeguards

- All encounter categories use one unique mission ZIP and matching server path.
- `positions` are always authored and exported; manual terrain/team matrices only when explicitly requested.
- Freedom Missions default to three turns and no flip; the mission runtime owns surrounded flipping.
- All battles export `no_battle_rewards = true`.
- Building fails clearly if a client enemy alias isn't in the real package registry.
- The existing `get_package_id(alias)` and `package_build()` functions are *required*, not reimplemented or removed.
- Complete package files outside `entry.lua` remain byte-for-byte identical to the repaired baseline.
- Imported `DEBUGLIB.lua` encounter positions, obstacles, player spawns, and team/terrain matrices were compared with the regenerated output.

## Validation and known limits

- `node --check`: both changed/new JavaScript modules passed.
- `node tests/v21-export.test.js`: passed unique package IDs, alias checks, spawner lookup, non-entry byte preservation, template and mod manifests.
- Headless Chromium: built a new mission, downloaded a deployable ZIP; loaded actual `DEBUGLIB.lua` (1 regular / 6 special / 1 boss) and downloaded a second valid ZIP.
- Generated `DEBUGLIB` Lua: all 8 entries compared against source, keeping enemy/formation/field values; server-enforced reward and package-path changes expected.
- Generated encounter Lua and package entry Lua passed Lua syntax validation.
- **No live client battle was run**. The editor is not a substitute for in-game validation of character mods, unique battle package IDs, and new map configurations.

## Rollback

Back up your existing VisualEncounters repository before replacement. To roll back the site, restore the old `index.html` and `liberation-editor.js` and remove the added `v21-export.js`, `mods/ezencounters-v21-base.zip`, and `vendor/` files if unused elsewhere. Keep any already-generated server encounter ZIPs and maps unchanged unless you intentionally roll those back too.
