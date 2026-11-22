# Visual Encounters V2.1 — full-package compatibility update

The site is synchronized against the provided latest single-package DEBUGLIB battle ZIP and the uploaded server source snapshot. **This does not update a live website automatically**; replace the files in your Visual Encounters site repository and publish using `publish.sh` or `publish.bat`.

## What's new

- Latest DEBUGLIB single-package battle archive in `mods/ezencounters-v21-base.zip` and `mods/ezencounters-liberation-debuglib.zip` (131 aliases, local AirMan and Roll definitions).
- Optional `Liberation ZIP: require the entire enemy catalog` switch for a deliberate full dependency stress test. **Normal missions default to only the aliases actually placed.**
- V2.1 mod downloads skip the redundant local AirMan and Roll packages in Liberation mode.
- Six missing dropdown aliases: AirMan, Bugtank, Canodumb, Canosmart, Breaker, Shaker.
- Hosted Bladia, SwapLight, MetFire, and Kogasa Lua corrections. All four mod ZIPs are complete archives.
- Host mod download failures now stop an export rather than silently producing an incomplete deployment ZIP.
- Verification that starting HP never exceeds max_hp, whether `health` or `starting_hp` is used.

## Modes and deployment

- **Liberations:** exports `encounters/<BaseArea>.lua` and a mission-scoped ZIP. It does not generate the Tiled map, its Dark Hole Bot Config/OW Encounter Config objects, or the server-side Overworld Enemy Templates. Install those separately.
- **Regular EZEncounters:** exports `encounters/<BaseArea>.lua` plus the existing `ezencounters.zip`. That original ZIP was not altered by this release.
- **Endless Runner:** same regular battle package, with encounter definitions keyed by the Runner base-area ID. Floor overrides remain configured in Tiled.

## Install

Option A: Extract the COMPLETE website archive into your website repository root and republish.

Option B: Extract the MODIFIED FILES archive into your existing Visual Encounters repository root and republish. This keeps all unchanged enemy art and untouched mod ZIP files from your current website copy.

Run `python tools/update_site_version.py` when publishing, or use your existing publish scripts. This release already has updated hashes, but publishing should regenerate them for any later local edits.

## Offline checks

`node tests/v21-export.test.js`, `node tests/v21-regression.test.js`, `node tests/v21-package-catalog.test.js`, `node tests/cache-release.test.js`, and `node tests/theme-settings.test.js` were run successfully in this environment. Lua source inside the modified battle package and four modified character ZIPs passed syntax compilation.

No live OpenNetBattle client or server execution was available. Battle-side attack/defense multipliers and sprite scaling after animation changes remain mod-dependent, not guaranteed by this export tool.
