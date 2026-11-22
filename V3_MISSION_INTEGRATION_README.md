# Nebulous Liberations — V3 integration for updated 2026-11-22 archives

SOURCE OF TRUTH: `encounters_and_scripts(2).zip` + `areas_and_assets(2).zip`.

## Files to install (complete replacements)

- `scripts/ezlibs-custom/nebulous-liberations/liberations/instance.lua`
- `scripts/ezlibs-custom/nebulous-liberations/liberations/v3/mission_bridge.lua` (new)
- `scripts/ezlibs-custom/nebulous-liberations/liberations/v3/adapter.lua`
- `scripts/ezlibs-custom/nebulous-liberations/liberations/v3/attacks.lua`
- `scripts/ezlibs-scripts/generate-ezlibs-tiled.lua`
- `visual-encounters/v3-combat-workshop.html`
- `visual-encounters/v3-combat-workshop.js`

All nine V3 foundation files are ALREADY present in the updated server archive; this patch only replaces those listed above, and adds `mission_bridge.lua`. Do not revert the other source modules.

## What is live and opt-in

A Liberation mission only activates V3 if Tiled contains a **V3 Combat Pack** object with a nonempty `V3 Pack` property. The value is a safe single Lua module ID, e.g. `ThunderPack`. The matching Lua file must be installed at:

`scripts/ezlibs-custom/nebulous-liberations/liberations/v3/packs/ThunderPack.lua`

The Visual Encounters V3 ZIP now includes that server-root path automatically, plus `tiled/v3-combat-pack.tx` and each preset's `.tx` file. Import Tiled templates, put the pack object anywhere on the mission map and place `V3 Entity` objects at their authored tile positions. V3 is initialized when the last player finishes transferring and the mission begins.

**Important:** Generator changes do not take effect until you rerun your existing `generate-ezlibs-tiled.lua` flow and load the generated Tiled project types. The script is authoritative for Tiled class definitions; any pre-generated JSON/docs need regeneration.

## Working source-grounded integration

- The existing mission constructor's **already-used** base-area object scan collects pack/preset objects, avoiding a second full scan of DEBUGLIB. Ordinary V2 maps pay only one cheap type comparison in their existing scan.
- `Mission:begin()` loads the authored Combat Pack module using the actual Lua `require` convention already in server scripts, starts V3 only for opt-in maps, and queues placed entity instances at two per tick.
- `Mission:on_tick` advances V3 without blocking the legacy Liberation turn coroutine.
- Entity contact uses `Net.get_player_position` and a floor-based tile comparison against the authored timeline shapes (up to 24 attack jobs sampled per 100ms). Per-player contact is deduplicated within each phase, and contact effects use existing V3 attack actions.
- Attack damage uses the existing `GuardInterception.prepare_attack`, `GuardInterception.apply_damage` and `PlayerSession:hurt` pipeline. The normal guard/invincibility/HP rules therefore apply.
- Optional approach/retreat behaviors check the mission's enemy panel restrictions, authored panel allowlist, other bots and player occupancy, then call the already-used `Net.transfer_bot` API. Three behavior decisions max per update.
- On attack finish, authored bot idle animation is restored. Initial rendering uses tile-center coordinates (`x+0.5`, `y+0.5`), matching V2 enemy code.
- Victory and mission cleanup cancel V3 events and remove mission-owned effect/entity bots before area teardown. Guarded disconnect cleanup and DEBUGLIB proximity streaming are retained unchanged.

## Boundaries of this release

- **Opt-in only**. Existing battle and encounter flows are not replaced; no new EZEncounters battle package format is introduced.
- These generic V3 entities are separate from the V2 `mission.enemies` list. They do not automatically participate in V2 victory-count or OW battle initiation. The battle-HP handoff and full battle encounter bridge remain future integration work.
- The V3 `shape` action currently assumes x/y offsets authored in world tile coordinates; automatic facing-relative 8-direction shape transforms and animation-completion callbacks are not implemented.
- Damage must be authored as a phase `on_contact` action (or relevant graph action) to apply. The `shape` action by itself only defines an occupied contact mask.
- The `max_entities=96` cap and 2-spawns-per-tick startup budget deliberately protect DEBUGLIB from mass spawning. `V3 Combat Pack` is not automatically added to DEBUGLIB or any existing mission.
- Imported Lua modules and Tiled data should be trusted author-created content. There is no runtime loading of arbitrary user Lua from text fields.

## Regression procedure

1. Back up server root and Visual Encounters repo before installing this patch.
2. Run `generate-ezlibs-tiled.lua` using the project's normal generator command; refresh project types in Tiled.
3. In Visual Encounters V3, set Pack ID `ThunderPack`; export ZIP. Install its Lua module under `v3/packs/ThunderPack.lua` and place the exported pack/preset Tiled templates in a small test Liberation map.
4. Restart server. A `V3 Combat Pack enabled` structured log should show the pack ID and queued entity count. Confirm entities start spawning after transfer, not during initial area clone.
5. Test one entity's idle animation, animation directions, custom attack and contact HP; then test a behavior using allowed panel movement; verify cleanup on exit and victory.
6. Try existing DEBUGLIB **without** any V3 Combat Pack object. The old DEBUGLIB streaming/counts and performance should be unchanged.

**Test caveat:** offline Lua and generated site export tests cannot verify client-side visual alignment, packet throughput or actual ONB execution. Always test on a small map first.
