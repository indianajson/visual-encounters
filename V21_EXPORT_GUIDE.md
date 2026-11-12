# ⚔️ VisualEncounters — V2.1 Nebulous Liberations export guide

This page describes the **V2.1 format** tab of this repository, based on the current Liberation encounter tables, repaired EZEncounters client package, and map requirements documented in the server's V2.1 authoring guide. The **Legacy Format** tab continues to use the original EZEncounters exporter.

## Contents

1. [What the old V2.1 exporter got wrong](#1-what-the-old-v21-exporter-got-wrong)
2. [Create a mission file](#2-create-a-mission-file)
3. [Regular, special, and boss categories](#3-regular-special-and-boss-categories)
4. [Battle grid and Freedom Mission defaults](#4-battle-grid-and-freedom-mission-defaults)
5. [Enemy Templates (overworld, not battle mods)](#5-enemy-templates-overworld-not-battle-mods)
6. [Export and install the complete bundle](#6-export-and-install-the-complete-bundle)
7. [How scoped EZEncounters ZIPs are built](#7-how-scoped-ezencounters-zips-are-built)
8. [Tiled map setup and limits](#8-tiled-map-setup-and-limits)
9. [Troubleshooting and tests](#9-troubleshooting-and-tests)

## 1. What the old V2.1 exporter got wrong

Previously **Save Lua + Mods** created a generic `encounters.lua` and copied `mods/ezencounters.zip` through the Legacy downloader. That is **not** a mission-scoped V2.1 deployment. The full EZEncounters package requires its entire character catalog, and imported V2.1 entries could retain another mission's `path`. Some reward fields were also editable even though Liberation does not grant battle rewards.

The replacement **Download V2.1 drop-in ZIP** generates the actual two linked files for a specific map:

- `encounters/<MapName>.lua` (regular, special, boss encounters)
- `assets/ezlibs-assets/ezencounters/ezencounters-liberation-<lowercase-map-name>.zip` (battle package)

It also includes the current OW template modules you have saved in the editor and optionally collects character-mod ZIPs that are hosted in `mods/`.

**Why this matters:** An earlier custom package broke the client because it removed the EZEncounters `get_package_id(alias)` helper while reducing dependencies. The V2.1 exporter now starts from the *repaired working package*, and changes only the package name and the mission's `liberation_aliases` set. It refuses an unrecognized base ZIP. It does not edit the battle builder.

## 2. Create a mission file

Open `index.html` via a web server and choose **V2.1 format**. Enter the exact area name from Tiled in **Tiled Area / Encounter Filename**. Example: `LiberationEasyMode` corresponds to `areas/LiberationEasyMode.tmx` and `encounters/LiberationEasyMode.lua`. Letter case matters for the encounter filename and area loader.

This area name also determines the client package filename and a **distinct package ID**:

| Item | Example |
|---|---|
| Source map | `areas/LiberationEasyMode.tmx` (you create this in Tiled) |
| Encounter output | `encounters/LiberationEasyMode.lua` |
| Battle ZIP | `assets/ezlibs-assets/ezencounters/ezencounters-liberation-liberationeasymode.zip` |
| Encounter `path` | `/server/assets/ezlibs-assets/ezencounters/ezencounters-liberation-liberationeasymode.zip` |
| Client package ID | `com.keristero.mob.ezencounters_liberation_liberationeasymode` |

The map name is kept in the browser workspace. Loading an encounter file named `<MapName>.lua` sets the matching map name automatically. Loading generic `encounters.lua` does **not** invent a map name; enter it manually.

## 3. Regular, special, and boss categories

The three V2.1 tabs export a *single Lua return table* with `encounters`, `special_encounters`, and `bosses`. Encounter **names must be unique across all three categories**, as maps reference them by name.

- **Encounters**: normal Liberation panel battles, referenced by `Encounter1`, `Encounter2`, and so forth.
- **Special Encounters**: Dark Hole encounter lists and named OW-bot battles, selected using the map's typed encounter objects.
- **Boss Encounters**: encounter data selected by the Boss Dark Panel. Usually the name matches its OW bot alias, but the OW template and battle character are separate.

The editor exports `minimum_steps_before_encounter` and `encounter_chance_per_step` for compatibility, plus the three categories. It does **not** export Legacy rewards, results callbacks, music (configured on `Liberation Config`), or OW template registry definitions inside the battle table. Every entry gets `no_battle_rewards = true`.

## 4. Battle grid and Freedom Mission defaults

The original 6×3 grid and enemy/obstacle inspector are shared between tabs. The V2.1 exporter always writes the authored `positions` matrix, even for automatic battlefields. The `enemies` list uses **1-based indexes** in the positions grid. For example, `positions[1][4] = 1` places the first enemy at the first row's fourth column.

A new V2.1 encounter starts with **Freedom Mission enabled, 3 turns, and flipping disabled**. Import preserves an explicitly disabled Freedom Mission. The actual Liberation instance sets `player_can_flip` only for surrounded terrain.

`player_positions` contains one marker (the default is row 2, column 2 on the player side). If imported data omitted it, the editor supplies that default. `teams`, `tiles`, and `obstacle_positions` are emitted when **manual battlefield** is enabled; automatic mode lets Liberation terrain determine them.

Enemy definitions support the actual EZEncounters fields `name`, `rank`, `nickname`, `health`, `max_hp`, `scale`, `attack_multiplier`, and `defense_multiplier`. Ranks in this editor are 1-based (`1..8`). A requested max HP only works above a mod's native maximum if the compatible character variant is actually installed; the editor does not fabricate variants.

## 5. Enemy Templates (overworld, not battle mods)

Choose **Enemy Templates** to create OW enemies. Save them into the editor workspace. Exports include a separate file for each saved template:

` scripts/ezlibs-custom/nebulous-liberations/liberations/enemies/template_<lowercase-name>.lua `

A template defines OW appearance/animation, AI name, optional attack visuals, selection shape, offsets, and HP/scale. It does **not** create a client-side battle enemy mod. For unusual AI, extend a real enemy module in your server; this editor only names existing AI handlers (`simple_charge`, `ranged`, `shockwave_line`).

The ZIP includes `ENEMY_TEMPLATE_REGISTRATION.md` with precise `require(...)(EnemyTemplates)` lines. Copy those lines into the *existing* `scripts/ezlibs-custom/nebulous-liberations/liberations/enemy_templates.lua` **after its shared AI helpers**. The editor intentionally does not overwrite your existing registry or duplicate its custom logic.

## 6. Export and install the complete bundle

1. Author all regular, special, and boss encounters. Give every encounter at least one enemy placed on the grid.
2. Set the Tiled map name at the top. Choose manual/automatic battlefield options and check Freedom Mission settings.
3. Optionally check **Include hosted character mod ZIPs with deployment**. Some character mod archives may not be bundled with VisualEncounters; those are listed as missing/unmapped in the installer manifest.
4. Click **Download V2.1 drop-in ZIP**. The browser creates `<map-slug>-v21-liberation-dropin.zip`.
5. Back up the server, unzip into its root, and preserve the `encounters/`, `assets/`, and (if present) `scripts/` folder paths.
6. If OW templates were exported, follow `ENEMY_TEMPLATE_REGISTRATION.md`.
7. Check Tiled object encounter names, config, and spawn references. Restart the server and client, then test a battle.

**Lua only** downloads `<MapName>.lua` for manual placement in `encounters/`; it does not build the battle ZIP. Use that only if you already have a matching package and verified it contains all required character aliases.

## 7. How scoped EZEncounters ZIPs are built

`mods/ezencounters-v21-base.zip` is a copy of the *repaired* mission-scoped DEBUGLIB battle package from the November 11 fix. The new `v21-export.js` checks the actual enemy alias table and requires the original `get_package_id(alias)` and `package_build()` functions.

For each mission, the editor:

1. Collects **all** `enemies[].name` values across all three categories, including boss aliases and Dark Hole specials.
2. Rejects unknown aliases not present in `encounter_info.enemy_packages`.
3. Replaces `package_name` with `ezencounters_liberation_<map-slug>` (using underscores in its package ID).
4. Replaces only `local liberation_aliases = { ... }` with the real set used by the mission.
5. Retains `package_requires_scripts()` so it requires only those aliases and their already registered HP variants.
6. **Preserves** `get_package_id(alias)`, `select_enemy_character_package()`, `package_build()`, and all other package members.
7. Packages `entry.lua` at the ZIP root, with the same supporting files as the repaired baseline.
8. Gives all encounters in the exported file the matching mission-specific `path`.

**Do not rename or modify** `mods/ezencounters-v21-base.zip` without verifying its `entry.lua`. Removing `get_package_id` was the confirmed cause of the previous empty-mob client crash.

## 8. Tiled map setup and limits

This is an **encounter and OW-template editor**, not a Tiled map editor. It does not generate `.tmx` maps, typed NPCs, Dark Hole configuration, tile GIDs, or links for `Liberation Encounter Pool` and `Dark Hole Encounter List`.

Use `areas/DEBUGLIB.tmx` and the server's comprehensive V2.1 guide as your working reference. At minimum, a mission needs a `Liberation Config` object, valid `Spawn Point` objects, its battle panels, and accurate object references. `OW Encounter Pool` is a reference to `Liberation Encounter Pool`, **not** a `Dark Hole Encounter List`.

The server loads encounter definitions from `encounters/<base-area-name>.lua`, creates a cloned mission area, and provides the selected battle ZIP there. The exported map-specific path must exist on the server. The editor does **not** decide the player's battle terrain; the Liberation instance does.

## 9. Troubleshooting and tests

| Symptom | Check |
|---|---|
| `get_package_id` nil or “Current mob was empty” | Wrong/old scoped ZIP. Re-export with this release. Confirm `entry.lua` is at ZIP root and has `get_package_id()`. |
| “Unknown EZEncounters enemy alias” | The base package does not register the battle alias. Supply a compatible real character mod and update the verified base. |
| Character mod not installed | Check `INSTALL_V21_MISSION.md` for included, missing, and unmapped mod ZIPs. Existing client mods may still need to be installed separately. |
| Map or selected encounter not found | Exact `encounters/<MapName>.lua` filename and Tiled object encounter name; spellings/case matter. |
| Dark Hole picks wrong battle | Distinguish `Liberation Encounter Pool` from `Dark Hole Encounter List`; use the expected category. |
| Client loads too many unused mods | Verify the battle path references the mission-specific ZIP, not `ezencounters.zip`. |
| Sprite or HP variant wrong | Verify real character package variants; the editor does not create new mods/HP presets. |

Run the included **offline exporter regression** with `node tests/v21-export.test.js`. The tested browser workflow also imported the real `DEBUGLIB.lua` (1 regular, 6 special, 1 boss) and generated a scoped battle ZIP. **The actual ONB client and server still require in-game validation.**
