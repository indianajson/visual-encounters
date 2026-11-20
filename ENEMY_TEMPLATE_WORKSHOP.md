# Enemy Template Workshop — standalone tab

The Workshop is a **third top-level tab** alongside Legacy Format and V2.1. It does not change the selected encounter category, edit an encounter table, or consume an encounter enemy slot.

Its templates are overworld (OW) bot descriptors for Nebulous Liberations. They register with `EnemyTemplates.register(name, config)` using your existing runtime in:

`scripts/ezlibs-custom/nebulous-liberations/liberations/enemy_templates.lua`

## Workflow

1. Enter a Lua-safe template name (`A–Z`, `a–z`, digits and underscores; starts with a letter).
2. Fill in the battle alias, HP, texture and animation paths. The *Battle Scale* field is optional: when blank, the runtime follows OW/Tiled scale.
3. Choose a **registered AI** type (`simple_charge`, `ranged`, `shockwave_line`, `shademan_ambush`, `bladia_strike`, `roll_heart_whip`, `patterned_attack`). If a named AI requires additional `attack_profile` configuration, that must be supplied by an authored Lua implementation; the Workshop does not invent attack profiles.
4. Paint the panel selection shape and preview the actual OW PNG + `.animation` state. Local preview files are browser-only; the exported server paths must exist on your server.
5. Save the template. You can export a single `template_<name>.lua`, or **Export all templates ZIP** including complete modules and `ENEMY_TEMPLATE_REGISTRATION.md`.
6. Register the files in the existing enemy registry **after** shared AI initialization. Do not replace or delete the existing registry. Use exact Tiled template/Spawns property names.

## Project portability

- **Export project JSON** saves the Workshop's named templates for later editing.
- **Import project JSON** validates each template and merges it into the local Workshop library.
- Templates are saved under the editor's existing local-storage workspace, independently of the Legacy and V2.1 active views.

## Why this is separate from battle mods

EZEncounters/Endless Runner battle actors are provided by client **character mod ZIPs** and referenced by `enemies = { {name=..., rank=...} }`. OW templates are Lua-defined **server overworld entities** used by Nebulous Liberations, with extra selection shapes, bot assets and AI routines. One cannot replace the other.

The Workshop intentionally **does not** create new character packages, HP-native variants, arbitrary AI functions, maps, or `.tsx` assets.
