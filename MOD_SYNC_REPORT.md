# Hosted mods and battle-package synchronization

Compared to `visual-encounters(2).zip` and the most recent uploaded DEBUGLIB single-package build.

## Battle package

- `mods/ezencounters-v21-base.zip` is now byte-identical to the latest `ezencounters-liberation-debuglib.zip` provided in `DEBUGLIB_eager_all_bots_single_encounter_zip_2026-11-20.zip`.
- `mods/ezencounters-liberation-debuglib.zip` is updated to the same standalone package.
- Includes the local `AirManHPV3` and `RollDEBUGLIB_HP` character definitions and 131 aliases.
- The old literal 13-alias `liberation_aliases` table is replaced by a **dynamic** all-alias table in the baseline; `v21-export.js` supports replacing that with a narrower explicit required-alias set when exporting a normal mission.

## Character patches

This site bundle updates four hosted mod ZIPs with only the noted Lua changes:

- `com_EXE5_Bladia.zip` — opponent-relative facing during teleport and attack.
- `hoov_package_swaplight.zip` — delayed native maximum-HP fallback and independent instance state.
- `com_louise_exe2_MetFire.zip` — case-sensitive FulFire include.
- `com_alrysc_enemy_Kogasa.zip` — two invalid Lua expressions in dormant extra.lua.

The 129 externally available character aliases are represented by hosted ZIPs (some mods contain multiple related enemy packages). `AirMan` and `Roll` are local to the scoped battle ZIP. No sprites or animations inside mod ZIPs were changed.

## Editor dictionary

Added six missing exact EZEncounters aliases: `AirMan`, `Bugtank`, `Canodumb`, `Canosmart`, `Breaker`, `Shaker`. AirMan and Canosmart do not have dedicated art in the uploaded site; their dropdowns show text-only entries rather than using an incorrect sprite image.

## Testing boundaries

The ZIP and Lua syntax checks, editor regression tests, and the dependency audit all pass. These are not live ONB client tests. Use a small mission first, then test the 131-alias option with the existing DEBUGLIB test map only if intentionally stress-testing the client's package loading.
