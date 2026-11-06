# VisualEncounters — Nebulous Liberations editor update

## Getting started

Open `index.html` through a local web server or your hosted site (not a restrictive `file://` sandbox). Choose **Nebulous Liberations**. The three encounter categories retain separate encounter lists. Choose a category, add an encounter, set its Freedom Mission and battlefield mode, then use the familiar visual grid and enemy inspector.

### New layout

- **Top**: category tabs, create/load/export actions, and encounter selector.
- **Battlefield**: original 6 × 3 grid with zoom and tile selection.
- **Encounter configuration**: encounter-specific battle options, Freedom Mission, and manual/automatic mode; always visible alongside tile selection.
- **Selected tile · Combatant**: battle enemy alias, rank, nickname, starting HP, max HP, battle sprite scale and battle modifiers.
- **Global & category overrides**: collapsible area settings, random encounter frequency, category-wide manual battlefield override, reward fallbacks.
- **Enemy Templates** tab: saved overworld enemy definitions. Does not change the legacy editor.

### Freedom Mission defaults

New encounters and missing turn counts default to **3**. Explicit imported `turn_count` values are preserved. `player_can_flip` is still calculated at runtime by the Liberation mission terrain rules; the Nebulous export writes false.

### Per-enemy encounter fields

The following optional fields are exported in the `enemies` records: `name`, `rank`, `nickname`, `health`, `max_hp`, `scale`, `attack_multiplier`, `defense_multiplier`. Starting HP and max HP can vary between duplicate enemies in the same encounter. Rank is 1-based. `scale` applies to the battle character, not necessarily to independent projectiles. Mods must opt in to attack/defense multipliers; Roll currently supports outgoing attack multiplication. There is no universal Battle damage interception in ezencounters.

`Max HP` beyond the mod's supported maximum still requires a compatible character package (for example the previously prepared 240-HP variants).

### Template workshop

Template definitions are **overworld enemy templates**, not ezencounters battle aliases. Fill out the name, visuals, HP, optional sprite scale, AI, attack visuals, selection shape, and optional boss mug. **Save template** stores it locally in the browser; **Export Lua module** generates `template_<name>.lua`. Place it in `scripts/ezlibs-custom/nebulous-liberations/liberations/enemies/` and register the module in `liberations/enemy_templates.lua` after the common AI helpers are defined:

```lua
require("scripts/ezlibs-custom/nebulous-liberations/liberations/enemies/template_myenemy")(EnemyTemplates)
```

Select the template via Tiled `Boss` or `Spawns` (or the applicable typed object property). `Liberation Enemy Config` on the map can override a specific spawn's HP and OW/Battle scales. The builder cannot generate code for custom attack AI; it only references existing registered `simple_charge`, `ranged`, and `shockwave_line` handlers. For complex AI copy and edit a handwritten template such as Mettaur.

### Server packages

The included `mods/ezencounters.zip` and `mods/com_OFC_mob_EXEPoN_027_RollV1.zip` have been synchronized with the previously delivered Liberation scaling and HP patch. The Save Lua + Mods action collects those hosted ZIPs alongside the encounter's other required mod packages. It does not rebuild character mods or invent unsupported max HP profiles.

### Compatibility

- Legacy format tab and its export remain separate.
- Existing Nebulous encounters are preserved (including explicitly authored 5-turn missions).
- Existing Tiled objects and registry templates are not rewritten.
- Browser-side saved templates persist with the Nebulous editor workspace but are not embedded in `encounters.lua` because the Liberation runtime does not accept template definitions there.

### Verification

Static JavaScript syntax and archive integrity were checked. The OpenNetBattle runtime and a fully loaded browser UI with CDN dependencies were not available to execute end-to-end here; in-game verification is still required for modifiers and mod-specific animations.
