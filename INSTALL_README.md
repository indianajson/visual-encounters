# VisualEncounters V2.1 · Drop-in website update

## Install VisualEncounters

1. Back up your existing VisualEncounters web repository.
2. Replace its contents with the files in this ZIP, retaining the directory structure. This is the **entire updated site**, including current `mods/` ZIPs and the original legacy assets.
3. Serve through an HTTP(S) web server (e.g., GitHub Pages). Browser security restrictions may prevent `fetch()` of ZIP assets if opened through `file://`.
4. Refresh the browser and use the new top navigation: **Legacy Format**, **V2.1 format**, **Enemy Template Workshop**.

## V2.1 encounters

1. Choose an export target: **Nebulous Liberations**, **EZEncounters**, or **Endless Runner**.
2. Enter the exact **base** Tiled area/map name (without `.tmx`).
3. Add encounters on the 3x6 grid, then use **Lua only** to inspect or **Download V2.1 drop-in ZIP** to get the Lua and client battle package.
4. Extract the generated export into the ONB server root. For Liberation the package is mission-scoped; for regular/Runner it is the standard ezencounters ZIP.
5. Ensure the Tiled map, NPC/dark-hole definitions, and Runner base-area config point at the correct named encounter entries. The website does not generate `.tmx` files.
6. Install or verify character mods and client assets. Optional bundled mods come from `mods/` and may not cover custom packages missing from the uploaded server snapshot.

## Enemy Template Workshop

The workshop is a separate, third top-level tab. Export it independently as Lua registry modules. **Overworld templates are not the same as battle character mod ZIPs.** The Workshop ZIP contains install paths and registration instructions; do not overwrite your main `enemy_templates.lua` registry wholesale.

## Server compatibility (important)

The uploaded DEBUGLIB EZEncounters battle client expects a **1-based `rank` index 1–8**. The uploaded Liberation server `panel_encounters.lua` validator instead accepts 0–7. A *separate optional server compatibility patch ZIP* is supplied outside this site archive. Review and merge the one-line validator change before using rank 8; do **not** replace a newer live server script without comparison. `rank_override`, when supplied, remains an independent 0–7 engine index.

## Verified scope

This website and mod inventory were reconciled against the uploaded `scripts(4).zip` and `encounters_areas_assets.zip` server snapshots. The mod sync report lists 94 replaced archives, 19 added archives and 38 unchanged archives. All 152 `mods/*.zip` packages, including the V2.1 base, passed CRC integrity tests. This does not establish that newer mods on your live debugging server are identical. Please provide the latest `scripts/`, `encounters/`, `areas/`, `assets/ezlibs-assets/ezencounters/` and custom character ZIPs for a fresh live-version comparison.

## Reference and tests

- `V21_EXPORT_GUIDE.md`
- `ENEMY_TEMPLATE_WORKSHOP.md`
- `MOD_SYNC_REPORT.md`
- `node tests/v21-regression.test.js`
