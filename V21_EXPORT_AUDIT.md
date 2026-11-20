# Visual Encounters V2.1 — Battle ZIP and character mod audit

This audit was made against the supplied `visual-encounters(2).zip`, `scripts(4).zip`, and the server's `encounters/DEBUGLIB.lua` and `areas/DEBUGLIB.tmx` from `encounters_areas_assets.zip`.

## What the downloaded ZIP contains

For an area named `DEBUGLIB`, the **Nebulous Liberations** V2.1 export includes:

```text
encounters/DEBUGLIB.lua
assets/ezlibs-assets/ezencounters/ezencounters-liberation-debuglib.zip
assets/ezlibs-assets/ezencounters/<required-character-mod>.zip
EXPORT_MANIFEST_V21.json
INSTALL_V21_MISSION.md
```

The **regular EZEncounters** and **Endless Runner** variants instead include `assets/ezlibs-assets/ezencounters/ezencounters.zip`. The same category schema (`encounters`, `special_encounters`, and `bosses`) is used across targets; reward policy differs.

**Keep nested character ZIPs zipped.** Extract only the *outer* downloaded archive into the ONB server root. Do not extract individual character `.zip` files into Lua folders or inject them into the battle ZIP. Each battle package has a root `entry.lua`, and `package_requires_scripts()` resolves character package IDs independently.

The battle ZIPs have the same internal supporting assets/scripts as the verified server baselines. The Liberation ZIP patches only its unique package ID and the required enemy alias set; it retains DEBUGLIB's embedded `AirManHPV3` resources and other battle support logic.

## What is checked at export time

- Requested enemy aliases must exist in the battle package's `enemy_packages` table.
- A battle package must have `entry.lua` at the root; the output is reopened and CRC-checked.
- Each copied hosted or additionally uploaded character mod ZIP must pass CRC and have a root `entry.lua`.
- Missing/invalid *requested* mod archives stop the export with filenames. Nothing is represented as a complete package after a failed download.
- An optional additional-mod picker can include custom ZIPs or override hosted copies. Invalid filenames or duplicate uploads are rejected.
- The deployment manifest identifies every enemy alias, its client character ID, and the copied/expected mod ZIPs. Unmapped aliases are listed for manual installation checks; client `Engine.require_character()` resolution still requires live testing.
- The export keeps authored enemy positions, one player position, all three categories, and optional manual team/tile/obstacle matrices. Liberation removes battle-result rewards and defaults Freedom battles to 3 turns.

If you disable **Include hosted character mod ZIPs**, the bundle deliberately contains only its encounter file and battle ZIP (plus any manually chosen ZIPs). Its manifest still lists hosted dependency filenames, so you can install them yourself.

## DEBUGLIB mission features are not created by encounter ZIPs

The verified `areas/DEBUGLIB.tmx` has **49 Dark Hole Buffed Virus** objects, **55 Encounter Config** objects, **52 Bot Config** objects, **56 Dark Panels**, **2 Dark Holes**, **2 Boss Dark Panels**, **3 Spawn Points**, **13 Indestructible Panels**, and one **Liberation Config** object. Other map objects include panel gates, item panels, bonus/trap panels and encounter selection lists.

These map objects contain the **overworld-specific** settings and mission rules that a battle-only `.lua` encounter cannot express, such as `OW Encounter Config` links, enemy `Spawns`, battle/OW scales, `Max HP`, `Starting HP`, AI types, boss IDs, linked panels, mission phase/turn settings and respawn area. For example:

```text
Dark Hole Buffed Virus
  Bot Config: <object ID of Bot Config>
  OW Encounter Config: <object ID of Encounter Config>

Bot Config
  Spawns: <registered Enemy Template name>
  Max HP: <OW enemy max HP>
  Starting HP: <OW enemy starting HP>
  OW Scale: <scale>
  Battle Scale: <scale>

Encounter Config
  Encounter Mode: Fixed
  Encounter Category: special_encounters
  Encounter Name: <name in encounters/<area>.lua>
```

Those properties are examples from DEBUGLIB, not a generated map. Maintain your `.tmx` separately and link the names to the exported encounter table. The Enemy Template Workshop exports separate Lua modules; use that workspace to create or update the OW templates needed by Tiled `Spawns` properties.

## Confirmed compatibility discrepancy in supplied server snapshot

In `scripts(4).zip`, `nebulous-liberations/liberations/panel_encounters.lua` validates `enemy.rank` as **0–7**, but the supplied client battle ZIP treats `rank` as a **1–8** position in its rank enum. `rank_override` remains the explicit **0–7** enum index. An optional server patch is supplied separately to correct the server validator. Don't overwrite a newer live module if its rank rules have already been fixed.

## Tested

- All 152 hosted ZIP archives passed ZIP member-integrity checks; 150 were character mod ZIPs with root `entry.lua`.
- All 126 UI enemy dictionary records had hosted `downloads` filenames present.
- The hosted Powie mod explicitly defines `com.discord.Konstinople#7692.enemy.powie2`; both battle baselines were updated to map the previously missing `Powie2` alias to that verified ID.
- The V2.1 test suite regenerates real outer ZIPs for all three targets, reopens the battle ZIP and copied character mod ZIPs, verifies package IDs and manifest paths, and covers missing/corrupt dependencies, extra uploaded mods, and replacement ZIPs.

**Still requires live testing:** Character mod IDs not expressible as static strings in their source are not exhaustively resolved offline; server provisioning, client character loading, enemy scale/HP application, and Tiled mission objects must be verified on the running ONB server/client.
