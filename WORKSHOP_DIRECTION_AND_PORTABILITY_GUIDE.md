# Attack and Enemy Workshops — direction defaults, ownership and portable exports

## Default animations: four directions

**Eight-direction animation naming is off by default** in both Workshops. A bot or effect with a prefix such as `IDLE`, `ATTACK`, `IMPACT`, or `HIT` expects these four states:

| Up Left | Up Right | Down Left | Down Right |
|---|---|---|---|
| `PREFIX_UL` | `PREFIX_UR` | `PREFIX_DL` | `PREFIX_DR` |

Enable the relevant **eight-direction** checkbox *only* when the sprite animation also has `PREFIX_U`, `PREFIX_D`, `PREFIX_L`, and `PREFIX_R`. The checkbox **only changes the animation-state lookup**: it does **not** change bot movement, movement permissions, attack direction, aim selection, shape rotation, piercing, or target hitboxes. When a runtime direction is cardinal but the template has four states, the shared animation helper uses a deterministic adjacent diagonal (`U→UL`, `R→UR`, `D→DR`, `L→DL`). It does **not** claim to mirror the artist's sprite by itself.

**Enemy Workshop checkbox**: applies to *bot* body animations, such as `IDLE`, `ATTACK`, and `HOLD` prefixes. New enemies default to `IDLE`, `ATTACK`, and `HOLD` prefixes but only the four diagonal states are expected. These are the bot's own animations, not projectile/effect art.

**Attack Workshop checkbox**: applies to directional *attack effects*, including each phase's effect and contact animation `PREFIX_DIRECTION` state. A phase can explicitly turn off directional lookup to play a fixed, un-suffixed state. Eight-direction effect animation lookup is off by default even if an attack can aim in eight directions.

## Field ownership

| Property | Workshop | Details |
|---|---|---|
| Enemy identity, battle alias, type, death message | Enemy | Bot metadata |
| OW HP / battle HP, OW/battle scale | Enemy | Bot stats |
| Bot movement range/directions/panels | Enemy | Movement and territory rules |
| Bot texture and `.animation` | Enemy | Used to create the overworld bot |
| Bot `IDLE`, `ATTACK`, `HOLD` prefixes and bot animation duration | Enemy | Body animation states |
| Bot eight-direction animation switch | Enemy | Opt-in only |
| Assigned primary and rotating attacks | Enemy | Names of Attack Template registrations |
| Attack damage, contact/piercing, timing | Attack | Attack damage/hit behavior |
| Approach/telegraph and phases/shape changes | Attack | Targeting and attack-specific motion |
| Attack effect texture, effect animation, contact effects, SFX | Attack | Independent effects/phase assets |
| Attack eight-direction effect switch | Attack | Opt-in only |

The remaining legacy Enemy Workshop `has_attack_animation` / `has_attack_hold` switches describe **whether the bot has those body states**; they do not define what the attack effect sprite does.

## Save attacks and load them into enemies

1. Open **Attack Template Workshop**, choose **New**, configure attack behavior, phase shapes and visual effects. The **eight-direction effect** toggle starts unchecked.
2. Enter a unique name, such as `GrowingWave`, and select **Save attack**. It is now available in the Enemy Workshop's **Primary attack template** dropdown.
3. Export **selected attack JSON**, **all attacks JSON**, or **Export attacks ZIP**. A ZIP contains both the Lua registry and `ATTACK_WORKSHOP_PROJECT.json`, so it can be imported again as an editable project.
4. In another browser or project, open Attack Template Workshop → **Import attacks JSON / ZIP**, select that exported file, and confirm the saved attack appears.
5. Open Enemy Template Workshop and select the attack name under **2 · Attack loadout**. Save the enemy template and choose **Export all templates ZIP**.
6. The enemy ZIP includes the enemy Lua module *and* `attacks/enemy_workshop_templates.lua` containing the required custom attack definitions. That file loads in addition to (not instead of) your separately installed `attacks/custom_templates.lua`.

The Enemy Workshop's **Export project JSON** similarly carries the custom attacks that its enemies require. Its importer reads both the previous version 1 (enemy-only) and the new version 2 format.

## Compatibility with older saved projects

When older enemy templates put `attack_damage`, `attack_texture`, `attack_animation_path`, or `attack_effect_animation` directly on the enemy, the new editor copies those settings into a specifically named Attack Template and links the enemy to it. Existing registered specialized AI types stay specialized; they are **not automatically converted** to phased attacks. The server runtime still accepts the old fields for other Lua registrations.

Old Attack Workshop projects sometimes include `idle_animation_prefix` or `attack_animation_prefix`. These fields are transferred to any linked Enemy Template while preserving its explicit bot settings. Unassigned old attack profiles keep their values for a future assignment, rather than losing them during import.

## Deployment notes

Both Workshops generate Lua registrations for Nebulous Liberations. The current shared server patch supports both optional registration files and keeps other original AI modules intact. Deploy the updated server Lua modules once before trying the new exported templates. Neither Workshop ZIP creates Tiled Dark Hole objects, automatically uploads referenced `.png`, `.animation`, or `.ogg` files, or replaces existing OpenNetBattle client character mods.
