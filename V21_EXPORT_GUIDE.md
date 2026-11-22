# Visual Encounters V2.1 — current server format

This release is synchronized against the uploaded `visual-encounters(2).zip`, `encounters_and_scripts(1).zip`, `areas_and_assets(1).zip`, and the subsequent **DEBUGLIB single-package test build** (`DEBUGLIB_eager_all_bots_single_encounter_zip_2026-11-20.zip`). It has not been tested against a running client or any newer private server snapshot.

## Choosing your target

| Target | Export file | Battle package | Notes |
|---|---|---|---|
| Nebulous Liberations | `encounters/<BaseArea>.lua` | `assets/ezlibs-assets/ezencounters/ezencounters-liberation-<area>.zip` | Freedom default 3 turns, no battle rewards, separate Tiled map and OW templates |
| EZEncounters | `encounters/<BaseArea>.lua` | `assets/ezlibs-assets/ezencounters/ezencounters.zip` | Existing supported rewards and persistent flags preserved |
| Endless Runner | `encounters/<RunnerBaseArea>.lua` | `assets/ezlibs-assets/ezencounters/ezencounters.zip` | Floor-specific overrides must be provided via your runner's existing Tiled configuration |

Always use the original **base** area ID in the editor (such as `DEBUGLIB`), **not** the instanced `liberation_<player>` ID. The exporter does not create Tiled maps or place Dark Holes / spawn pads in those maps.

## Battle ZIP dependency choice (Liberations only)

- **Default: selected enemies.** The ZIP requests only the character aliases you actually placed in its encounters. This is the recommended option for normal Liberation missions.
- **Full catalog:** toggle **Liberation ZIP: require the entire enemy catalog (DEBUGLIB stress-test mode)**. The package requests all **131** aliases. Use it for deliberate full-catalog tests; it can create a large dependency download and increase client loading pressure.
- **Include hosted character mod ZIPs:** default on. The export copies all required hosted mod ZIPs into `assets/ezlibs-assets/ezencounters/`. Turn off if the identical versions are already installed and you want a smaller deployment.

The Liberation battle baseline contains two character definitions in the same ZIP: `AirMan` and `Roll`. The exporter does **not** download redundant external mods for those two aliases in Liberation mode. The normal EZEncounters package retains its original dependencies and data.

## Battle definition format

Three categories: `encounters`, `special_encounters`, `bosses`. A named encounter has `name`, `path`, `weight`, `enemies`, optional `obstacles`, `positions`, and one `player_positions` marker. `teams`, `tiles`, and `obstacle_positions` are used only when authored manual battlefield mode is selected.

Each enemy may have `name`, `rank` (1 through 8), optional `rank_override` (0 through 7), `nickname`, `health`/`starting_hp`, `max_hp`, `scale`, `attack_multiplier`, and `defense_multiplier`. These are **battle** configuration fields; per-character runtime support for damage modifiers, non-native max HP, sprite scaling after animation swaps, and attack orientation is not guaranteed merely by exporting them. The original mods and engine must implement each behavior.

For Liberation encounters, `no_battle_rewards = true`, no normal reward definitions, and Freedom Mission `turn_count = 3` by default. The editor writes 3×6 enemy and player grids. It does **not** generate `results_callback` functions.

## Overworld Liberation setup is independent

A Dark Hole Buffed Virus on the Tiled map needs the correct `Bot Config` object, `OW Encounter Config`, and a valid accessible destination panel. In your DEBUGLIB build, the local Prog OW character templates and the map's `TEST -` labels control which bots spawn immediately versus deferred. **This editor's battle ZIP does not set those flags.** Deploy the relevant Tiled map, `enemy_templates.lua` registry and its imported template modules separately.

The Enemy Template Workshop exports Lua modules but does not inject the registration call into `enemy_templates.lua` automatically. That's a useful next feature, and the editor documents the manual installation step.

## Export verification

Run from the website repository:

```sh
node tests/v21-export.test.js
node tests/v21-regression.test.js
node tests/v21-package-catalog.test.js
python tools/update_site_version.py
node tests/cache-release.test.js
```

Publishing through the included scripts updates the website version hash, preventing cached old ZIPs. The complete website archive includes all hosted mods; the smaller modified-files archive only changes targeted resources.
