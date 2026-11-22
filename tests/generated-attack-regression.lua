-- Drop-in custom Attack Workshop registry. Loaded by ai/attack_templates.lua.
return function(AttackTemplates)
    AttackTemplates.register("Wave_Test", {
        attack_damage = 20,
        eight_direction_animations = false,
        movement = {
            mode = "stationary",
            tiles = 0,
            transition = "smooth",
        },
        phases = {{
                animation_prefix = "WAVE",
                duration = 0.1,
                sfx = {
                    on_start = "/server/assets/sfx/start.ogg",
                },
                shape = {{1}},
            }, {
                animation_prefix = "WAVE",
                duration = 0.2,
                movement_mode = "smooth",
                sfx = {
                    on_middle = "/server/assets/sfx/middle.ogg",
                },
                shape = {{1, 1}},
            }, {
                animation_prefix = "BURST",
                contact_animation_prefix = "HIT",
                contact_effect = "piranha_impact",
                duration = 0.3,
                linger_until_contact = true,
                max_wait_seconds = 1,
                movement_mode = "instant",
                pierce_players = false,
                sfx = {
                    on_contact = "/server/assets/sfx/hit.ogg",
                    on_end = "/server/assets/sfx/end.ogg",
                },
                shape = {{1, 1, 1}},
                spawn_bot_count = 2,
                spawn_bot_template = "Mettaur",
                wait_for_animation = true,
            }},
        pierce_players = true,
        runtime = "phased_attack",
        targeting = "players",
    })
end
