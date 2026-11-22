# Visual Encounters — Reusable Attack Templates and diagonal-only defaults (2026-11-22)

## Installation
Extract the modified-files ZIP into the **website repository root**. Keep `mods/` and all existing source assets. Republish using your existing publishing script to refresh the live site.

The full-site alternative is a complete current website snapshot.

## Changes
- Eight-direction animation states default **OFF** in Attack and Enemy Workshops.
- Four-direction states are `PREFIX_UL`, `PREFIX_UR`, `PREFIX_DL`, `PREFIX_DR`.
- The checkbox changes **animation suffix lookup ONLY**; not facing, attack target/shape, or movement.
- The Enemy Workshop owns the bot sprite, its IDLE/ATTACK/HOLD prefixes and animation-state availability, HP/scale, movement/territory and attack assignments.
- The Attack Workshop owns attack damage, targeting, per-phase shapes/durations, visual effect and contact art, SFX, piercing and attack-specific movement.
- Attack Workshop can export a selected attack as JSON, all attacks as JSON, or a complete ZIP. It can import **both JSON and exported ZIP** projects.
- Saved attack names appear in Enemy Workshop's attack selector. Enemy Template ZIP includes its own required custom attacks in `attacks/enemy_workshop_templates.lua` without overwriting `attacks/custom_templates.lua`.
- Old enemy attack-owned fields are moved to attack definitions automatically; old attack bot prefixes migrate to linked enemies without overwriting explicit settings.
- The current light/dark theme CSS remains unchanged and in use.

**See `WORKSHOP_DIRECTION_AND_PORTABILITY_GUIDE.md` for examples and exact field ownership.**

## Server requirement
Install `Nebulous_Workshop_Four_Direction_Server_Patch_2026-11-22.zip` as well. The seven changed runtime Lua modules are based on the existing Workshop refactor, and do NOT include `instance.lua`; verify your newest runtime is compatible before deploying.

## Tests
Run `node tests/workshop-ownership.test.js`, `node tests/enemy-workshop-regression.test.js`, existing `tests/*.test.js`, and optionally `python tests/workshop-browser.test.py` (requires a local Chromium install). The browser smoke test uses `about:blank` + injected local sources to work around restricted navigation.
