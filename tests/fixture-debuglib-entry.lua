local package_prefix = "keristero"
local package_name = "ezencounters_liberation_debuglib"

local mob_package_id = "com."..package_prefix..".mob."..package_name
local loaded_obstacles = {}

-- EZDBG: client-side battle trace. print() is the supported mod diagnostic
-- channel; file-based logging is controlled by the client executable.
local function ezdbg(stage, ...)
    local values = {}
    for index = 1, select('#', ...) do
        values[#values + 1] = tostring(select(index, ...))
    end
    print('[EZDBG][CLIENT][' .. package_name .. '][' .. stage .. '] ' .. table.concat(values, ' '))
end
ezdbg('ENTRY_LOADED', mob_package_id)

ezdbg('INCLUDE_BEGIN', 'random_scenario.lua')
local ramdomize_test_scenario = include('random_scenario.lua')
ezdbg('INCLUDE_OK', 'random_scenario.lua')

local encounter_info = {
    -- If you need to add an mob do it here based on the character package name. 
    enemy_packages = {
        ShadowManPoN="com.OFC.char.EXEPoN-025-ShadowMan",
        GregarBeast="com.OFC.char.EXE6-051-GregarBeast1",
        ElementMan="com.OFC.char.EXE6-045-ElementMan1",
        BurnerMan="com.OFC.char.EXE4-038-BurnerMan1",
        Gobby="mob.realms.rey.navi.000.gobby",
        Yuki="com.alrysc.enemy.YukiEnemy",--V1,V2
        Yumeko="com.alrysc.enemy.YumekoEnemy",--V1,V2
        VolcanoMan="com.alrysc.enemy.VolcanoManEnemy",--V1,V2
        DreamMeraru="com.OFC.char.EXEPoN-018-DreamMeraru",
        DreamRapia="com.OFC.char.EXEPoN-018-DreamLapia",
        DreamBolt="com.OFC.char.EXEPoN-018-DreamBolt",
        DreamMoss="com.OFC.char.EXEPoN-018-DreamMoss",
        Sparky="com.OFC.char.EXEPoN-014-Yura",
        Yurayura="com.OFC.char.EXEPoN-014-Yurayura",
        Yurarion="com.OFC.char.EXEPoN-014-Yurarion",
        Dharma="com.OFC.char.EXEPoN-011-Dharma",
        Dharga="com.OFC.char.EXEPoN-011-Dharga",
        Dhardara="com.OFC.char.EXEPoN-011-Dhardara",
        KillPlant="com.OFC.char.EXEPoN-010-KillPlant",
        KillWeed="com.OFC.char.EXEPoN-010-KillWeed",
        KillFlower="com.OFC.char.EXEPoN-010-KillFlower",
        Beetank="com.OFC.char.EXEPoN-007-Kabutank", --V1,V2,V3,SP
        SwapLight="hoov.enemy.swaplight",
        QuickMan="com.louise.enemy.Quickman", --V1,V2,V3,SP, NM
        HeelNavi="com.louise.enemy.HeelNavi", --V1,V2,V3,SP
        CircusMan="com.louise.enemy.CircusMan", -- V1 (1), EX (5), SP (4), NM (8)
        RayCannon="com.alrysc.enemy.RayCannon_enemy", --custom ranks based on integer, 0 = SP
        ShadeMan="com.keristero.char.ShadeMan.EZLiberation", --V1,EX,SP
        Kogasa="com.alrysc.enemy.KogasaEnemy", --V1,V2,V3
        Juraigon="com.alrysc.enemy.juraigonVirus", --V1,V2,V3
        CutMan="com.louise.enemy.Cutman", --V1, EX, SP, NM
        AirMan="com.keristero.char.AirMan.DEBUGLIB_HP_V3",--v1,v2,SP
        SwordyEl="mob.realms.rey.virus.009.swordy", -- 1-9
        StarMan="com.OFC.char.EXE45-036-StarMan1", --V1,V2,V3,SP
        Alpha="com.OFC.char.EXE3-061-Proto", --V1, SP
        Bark="com.louise.enemy.Bark", --V1
        Basher="com.EXE3.Basher.Enemy",--V1
        BigBrute="com.keristero.char.BigBrute",
        Bladia2="com.EXE5.Bladia.Enemy2", --Bladia2
        Bladia3="com.EXE5.Bladia.Enemy3", --Bladia3
        Bladia4="com.EXE5.Bladia.Enemy4", --Bladia4
        Bladia5="com.EXE5.Bladia.Enemy5", --Bladia5
        Bladia6="com.EXE5.Bladia.Enemy6", --Bladia6
        Bladia="com.EXE5.Bladia.Enemy1", --Bladia
        BlastMan="com.Thor.enemy.BlastMan_V1", -- V1 (1), EX (5), SP (4), RV (??)
        BombCorn="com.louise.enemy.Corn.BombCorn",--V1,SP,R1,R2
        Boomer="com.louise.enemy.Boomer",
        Breaker="com.louise.enemy.Breaker",
        Bugtank="com.louise.enemy.Bugtank",
        Cacter="com.discord.Konstinople#7692.enemy.cacter",
        Cactikil="com.discord.Konstinople#7692.enemy.cactikil",
        Cactroll="com.discord.Konstinople#7692.enemy.cactroll",
        Canodumb="com.discord.Konstinople#7692.enemy.canodumb",
        Canosmart="com.dawn.enemy.canosmart",
        Catack="com.Dawn.Requested.Enemy.Catack",--V1,V2,V3,SP
        Champy="com.keristero.char.Champy",
        ChefVirus="com.alrysc.enemy.ChefVirusEnemy",
        Chimpy="com.keristero.char.Chimpy",
        Chumpy="com.keristero.char.Chumpy",
        CirCrush="com.louise.enemy.CirCrush",
        CirKill="com.louise.enemy.CirKill",--V1,R1,R2,SP,NM
        CirSmash="com.louise.enemy.CirSmash",
        ColdHead="com.louise.enemy.ColdHead",
        ColdHead="com.louise.enemy.ColdHead",
        Cragger="com.louise.enemy.Cragger",--V1,V2,V3,R1,R2,SP,NM
        DarkMech="com.HNST_SGNL.enemy.DarkMech",--V1,V2,V3,SP,R1,R2
        DarkMega="com.Dawn.Enemy.DarkRock", --V1
        DarkMegaNM="com.Dawn.Enemy.DarkRockNM", --NM
        DemonEye="com.louise.enemy.DemonEye",--V1
        Dominerd="com.louise.enemy.Dominerd",--V1,V2,V3,SP,NM
        Doomer="com.louise.enemy.Doomer",
        DthFire="com.louise.enemy.DthFire",--V1,R1,R2,SP,NM
        Elemperor="com.louise.enemy.Elemperor",--V1,V2,V3,R1,R2,SP,NM
        FighterPlane="com.Dawn.Viruses.Enemy.FighterPlane",--V1,V2,V3,SP
        FireManPoN="com.OFC.char.EXEPoN-022-FireMan", --V1,V2,V3,SP
        Fishy="com.louise.enemy.Fishy",--V1,V2,V3,SP
        Flashy="com.louise.enemy.Flashy",--V1,V2,V3,R1,R2,SP,NM
        Forte="com.OFC.char.EXE4-047-Forte1", --V1, SP, NM
        FulFire="com.louise.enemy.FulFire",--V1,R1,R2,SP,NM
        GigaCorn="com.louise.enemy.Corn.GigaCorn",--V1
        Gloomer="com.louise.enemy.Gloomer",
        Gunner="com.OFC.char.EXE6-023-Gunner",
        GutsManPoN="com.OFC.char.EXEPoN-026-GutsMan", --V1,V2,V3,SP,NM
        HardHead="com.louise.enemy.HardHead",
        HatMan="com.alrysc.enemy.HatManEnemy", --V1,V2,V3,SP
        HauntedCandle="com.louise.enemy.HauntedCandle",--V1,V2,V3,SP,R1,R2
        Hecatia="com.alrysc.enemy.HecatiaEnemy",
        HotHead="com.louise.enemy.HotHead",
        IceManPoN="com.OFC.char.EXEPoN-023-IceMan",--V1,V2,V3,SP
        JammingMan="com.alrysc.enemy.JammingManEnemy", --V1,V2,V3,SP
        JokerEye="com.louise.enemy.JokerEye",--V1
        KillerEye="com.louise.enemy.KillerEye",--V1,SP,R1,R2
        Lark="com.louise.enemy.Lark",--V1,R1,R2,SP,NM
        MegaCorn="com.louise.enemy.Corn.MegaCorn",--V1
        MetFire="com.louise.enemy.MetFire",--V1,R1,R2,SP,NM
        Metrid="com.EXE3.Metrid.Enemy",--V1,V2,V3,SP
        Mettaur="com.OFC.char.EXE6-001-Metall",
        Noir="com.OctoChris.enemy.Noir",
        OldBurner="com.louise.enemy.OldBurner", --Third Version, Spawn @ V1
        OldHeater="com.louise.enemy.OldHeater", --Second Version, Spawn @ V1
        OldStove="com.louise.enemy.OldStove", --First Version, Spawn @ V1/SP/R1/R2/NM
        Piranha="com.louise.enemy.Piranha",
        Powie3="com.discord.Konstinople#7692.enemy.powie3",
        Powie="com.discord.Konstinople#7692.enemy.powie",
        ProtomanPoN="com.OFC.char.EXEPoN-028-Blues", --V1,V2,V3,SP
        Puffy="com.louise.enemy.Puffy",
        Quaker="com.louise.enemy.Quaker",
        RareChampy="com.keristero.char.RareChampy",
        Ratty="com.Dawn.BN3.Enemy.Ratty",--V1,V2,V3,SP
        Roll="com.OFC.char.EXEPoN-027-Roll", --V1
        Scuttle="com.louise.enemy.Scuttle",--V1
        Scuttler="com.louise.enemy.Scuttler",--V1
        Scuttlest="com.louise.enemy.Scuttlest",--V1,SP
        Scuttzer="com.louise.enemy.Scuttzer",--V1
        Scutz="com.louise.enemy.Scutz",--V1
        Shaker="com.louise.enemy.Shaker",
        Shrimpy="com.louise.enemy.Shrimpy",
        Skarab="com.louise.enemy.Skarab",--V1,SP,R1,R2,NM
        Skarry="com.louise.enemy.Skarry",--V1
        Skelly="com.louise.enemy.Skelly",--V1
        Spikey="com.Dawn.char.Spikey",--V1,V2,V3,SP
        Swordy="com.louise.enemy.Swordy",--V1,V2,V3,SP,NM
        Tark="com.louise.enemy.Tark",--V1
        VacuumFan="com.louise.enemy.VacuumFan", --V1/V2/V3/SP
        Volcano="com.louise.enemy.Volcano",--V1,V2,V3,R1,R2,SP,NM
        Volgear="com.louise.char.Volgear",--V1,V2,V3,SP
        WindBox="com.louise.enemy.WindBox", --V1/V2/V3/SP/NM
        WoodmanPoN="com.OFC.char.EXEPoN-024-WoodMan", --V1,V2,V3,SP
        Yort="com.louise.enemy.Yort",--V1,V2,V3,R1,R2,SP,NM
        Zomon="com.OFC.char.EXE5-013-Zaemon",
        Rabiree="com.OFC.char.EXE3-010-Rabiree",
        Cannodumb="com.OFC.char.EXEPoN-002-Cannodumb",
    },
    obstacles = {
        RockCube="obstacles/rock_cube.lua",
        Rock="obstacles/rock.lua",
        Coffin="obstacles/coffin.lua",
        BlastCube="obstacles/blast_cube.lua",
        IceCube="obstacles/ice_cube.lua",
        MysteryData="obstacles/mystery.lua",
    },
    tile_states = {
        0,--normal
        1,--cracked
        2,--broken
        11,--up
        12,--down
        9,--left
        10,--right
        7,--empty
        4,--grass
        17,--hidden
        8,--holy
        3,--ice
        5,--lava
        6,--poison
        13,--volcano
        14,--sea
        15,--sand
        16,--metal
    },
    enemy_ranks = {
        0,--v1
        1,--v2
        2,--v3
        3,--sp
        4,--ex
        5,--rare1
        6,--rare2
        7--nightmare
    },
    field_tiles_default = {
        {1,1,1,1,1,1},
        {1,1,1,1,1,1},
        {1,1,1,1,1,1}
    },
    field_teams_default = {
        {2,2,2,1,1,1},
        {2,2,2,1,1,1},
        {2,2,2,1,1,1}
    }
}

function get_enum_value_by_index(mapping_table,p_index)
    for i, value in ipairs(mapping_table) do
        if tonumber(i) == tonumber(p_index) then
            return value
        end
    end
    print("[ezencounters] WARNING invalid input data, no index",p_index)
end

-- Native character packages defer their maximum HP until the spawn mutator.
-- Use the same base character ID for all max_hp values: no EZHP variants.
local function select_enemy_character_package(enemy_info)
    return get_package_id(enemy_info.name)
end

-- Mission-local character requirements restored after the dynamic-HP migration.
-- Preserve these aliases when rebuilding this encounter ZIP.
local liberation_aliases = {
    BigBrute = true,
    KillFlower = true,
    KillWeed = true,
    Mettaur = true,
    Quaker = true,
    Roll = true,
    ShadeMan = true,
    Yurarion = true,
    Yurayura = true,
    Swordy = true,
    Piranha = true,
    AirMan = true,
    Cannodumb = true,
}

function package_requires_scripts()
    ezdbg('REQUIRES_BEGIN')
    -- The original AirMan package is sometimes cached under its old ID.
    -- Define our debug-only character from files embedded in THIS encounter
    -- archive, the same local-definition pattern used by AirMan's own mob.
    Engine.define_character("com.keristero.char.AirMan.DEBUGLIB_HP_V3", _modpath.."AirManHPV3")
    ezdbg('AIRMAN_DEBUG_V3_DEFINED', "com.keristero.char.AirMan.DEBUGLIB_HP_V3")
    for alias, package in pairs(encounter_info.enemy_packages) do
        if liberation_aliases[alias] then
            if alias == 'AirMan' then
                -- Already defined in this package; requiring a separate mod
                -- would risk loading an old character definition again.
                ezdbg('REQUIRE_LOCAL', alias, package)
            else
                ezdbg('REQUIRE_BEGIN', tostring(alias or 'variant'), package)
                Engine.requires_character(package)
                ezdbg('REQUIRE_OK', tostring(alias or 'variant'), package)
            end
        end
    end
    ezdbg('REQUIRES_END')
end

function get_package_id(alias)
    return encounter_info.enemy_packages[alias]
end

function package_init(package)
    ezdbg('PACKAGE_INIT_BEGIN')
    package:declare_package_id(mob_package_id)
    package:set_name(package_name)
    package:set_description("Initiate custom battles from the server!")
    package:set_preview_texture_path(_modpath.."preview.png")
    ezdbg('PACKAGE_INIT_END')
end


local function make_empty_matrix()
    return {
        {0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0},
        {0, 0, 0, 0, 0, 0},
    }
end

local function get_terrain_columns(terrain)
    if terrain == "advantage" then
        return {1, 2, 3, 4}, {5, 6}
    elseif terrain == "disadvantage" then
        return {1, 2}, {3, 4, 5, 6}
    elseif terrain == "even" then
        return {1, 2, 3}, {4, 5, 6}
    elseif terrain == "surrounded" then
        return {3, 4}, {1, 2, 5, 6}
    end
    return nil, nil
end

local function copy_matrix(matrix)
    local result = make_empty_matrix()
    if type(matrix) ~= "table" then return result end
    for y = 1, 3 do
        if type(matrix[y]) == "table" then
            for x = 1, 6 do
                if matrix[y][x] ~= nil then
                    result[y][x] = matrix[y][x]
                end
            end
        end
    end
    return result
end

local function matrix_cells(matrix, is_occupied)
    local cells = {}
    for y = 1, 3 do
        for x = 1, 6 do
            local value = matrix[y] and matrix[y][x]
            if is_occupied(value) then
                cells[#cells + 1] = {x = x, y = y, value = value}
            end
        end
    end
    return cells
end

local function get_team_at(teams, x, y)
    return teams[y] and tonumber(teams[y][x]) or nil
end

local function list_team_columns(teams, team_id)
    local columns, seen = {}, {}
    for y = 1, 3 do
        for x = 1, 6 do
            if get_team_at(teams, x, y) == team_id and not seen[x] then
                seen[x] = true
                columns[#columns + 1] = x
            end
        end
    end
    table.sort(columns)
    return columns
end

local function get_open_team_cells(teams, team_id, occupied, side)
    local cells = {}
    for y = 1, 3 do
        for x = 1, 6 do
            local on_side = side == nil
                or (side == "left" and x <= 2)
                or (side == "right" and x >= 5)
            local key = tostring(x)..":"..tostring(y)
            if on_side and get_team_at(teams, x, y) == team_id and not occupied[key] then
                cells[#cells + 1] = {x = x, y = y}
            end
        end
    end
    return cells
end

local function sort_cells_near(cells, origin_x, origin_y, side)
    table.sort(cells, function(a, b)
        local a_row = math.abs(a.y - origin_y)
        local b_row = math.abs(b.y - origin_y)
        if a_row ~= b_row then return a_row < b_row end
        local a_col = math.abs(a.x - origin_x)
        local b_col = math.abs(b.x - origin_x)
        if a_col ~= b_col then return a_col < b_col end
        if side == "left" then return a.x > b.x end
        if side == "right" then return a.x < b.x end
        return a.x < b.x
    end)
end

local function normalize_player_positions(data)
    if type(data.player_positions) ~= "table" then return end
    local positions = copy_matrix(data.player_positions)
    local players = matrix_cells(positions, function(value)
        return value ~= nil and value ~= 0
    end)
    local occupied = {}

    -- Keep every player already standing on a player-owned tile. Invalid
    -- placements are moved afterward, preserving their original row/column
    -- as closely as the available player territory permits.
    local to_move = {}
    for _, player in ipairs(players) do
        local key = tostring(player.x)..":"..tostring(player.y)
        if get_team_at(data.teams, player.x, player.y) == 2 and not occupied[key] then
            occupied[key] = true
        else
            to_move[#to_move + 1] = player
            positions[player.y][player.x] = 0
        end
    end

    for _, player in ipairs(to_move) do
        local candidates = get_open_team_cells(data.teams, 2, occupied)
        sort_cells_near(candidates, player.x, player.y)
        local target = candidates[1]
        if target then
            positions[target.y][target.x] = player.value
            occupied[tostring(target.x)..":"..tostring(target.y)] = true
        else
            print("[ezencounters] WARNING no available player-owned tile for player", player.value)
        end
    end
    data.player_positions = positions
end

local function build_enemy_slots(data, terrain, side)
    local slots = {}
    local preferred_columns = {}
    if terrain == "surrounded" then
        if side == "left" then preferred_columns = {2, 1}
        else preferred_columns = {5, 6} end
    else
        preferred_columns = list_team_columns(data.teams, 1)
    end

    for _, y in ipairs({2, 1, 3}) do
        for _, x in ipairs(preferred_columns) do
            if get_team_at(data.teams, x, y) == 1 then
                slots[#slots + 1] = {x = x, y = y}
            end
        end
    end
    return slots
end

local function normalize_enemy_positions(data, terrain)
    if type(data.enemies) ~= "table" then return end

    local positions_were_missing = type(data.positions) ~= "table"
    local positions = copy_matrix(data.positions)
    local enemies = {}
    for index = 1, #data.enemies do
        enemies[index] = {index = index}
    end

    local existing_by_index = {}
    for _, cell in ipairs(matrix_cells(positions, function(value)
        return tonumber(value) ~= nil and tonumber(value) ~= 0
    end)) do
        local index = tonumber(cell.value)
        if index and index >= 1 and index <= #enemies and not existing_by_index[index] then
            existing_by_index[index] = {x = cell.x, y = cell.y}
        end
    end

    -- An omitted positions matrix means every listed enemy should be placed.
    -- A supplied matrix is a manual spawn selection: do not add entries the
    -- author intentionally left out; only normalize the entries it contains.
    local active_indices = {}
    if positions_were_missing then
        for index = 1, #enemies do active_indices[#active_indices + 1] = index end
    else
        for index = 1, #enemies do
            if existing_by_index[index] then
                active_indices[#active_indices + 1] = index
            end
        end
    end

    local occupied = {}
    local placements = {}
    -- The surrounded half-on-each-side distribution is only an automatic
    -- formation. Explicit authored enemy positions must remain where the
    -- author placed them if they already belong to the enemy team.
    local is_surrounded = terrain == "surrounded" and positions_were_missing

    if is_surrounded then
        local left_target = math.ceil(#active_indices / 2)
        local right_target = math.floor(#active_indices / 2)
        local left_count, right_count = 0, 0

        -- Retain existing flank placements while each side remains within its
        -- fair share. Excess enemies are reassigned to the opposite flank.
        for _, index in ipairs(active_indices) do
            local old = existing_by_index[index]
            if old then
                local side = old.x <= 2 and "left" or old.x >= 5 and "right" or nil
                if side == "left" and left_count < left_target
                    and get_team_at(data.teams, old.x, old.y) == 1 then
                    placements[index] = {x = old.x, y = old.y, side = side}
                    occupied[tostring(old.x)..":"..tostring(old.y)] = true
                    left_count = left_count + 1
                elseif side == "right" and right_count < right_target
                    and get_team_at(data.teams, old.x, old.y) == 1 then
                    placements[index] = {x = old.x, y = old.y, side = side}
                    occupied[tostring(old.x)..":"..tostring(old.y)] = true
                    right_count = right_count + 1
                end
            end
        end

        for _, index in ipairs(active_indices) do
            if not placements[index] then
                local side
                if left_count < left_target and right_count < right_target then
                    side = left_count <= right_count and "left" or "right"
                elseif left_count < left_target then
                    side = "left"
                else
                    side = "right"
                end
                local source = existing_by_index[index]
                local candidates = get_open_team_cells(data.teams, 1, occupied, side)
                local origin_x = source and source.x or (side == "left" and 2 or 5)
                local origin_y = source and source.y or 2
                sort_cells_near(candidates, origin_x, origin_y, side)
                local target = candidates[1]
                if target then
                    placements[index] = {x = target.x, y = target.y, side = side}
                    occupied[tostring(target.x)..":"..tostring(target.y)] = true
                    if side == "left" then left_count = left_count + 1
                    else right_count = right_count + 1 end
                else
                    print("[ezencounters] WARNING no available enemy tile for enemy", index)
                end
            end
        end
    else
        -- Preserve valid enemy positions; move only entries outside enemy
        -- territory or colliding with an already retained enemy.
        local to_move = {}
        for _, index in ipairs(active_indices) do
            local old = existing_by_index[index]
            if old then
                local key = tostring(old.x)..":"..tostring(old.y)
                if get_team_at(data.teams, old.x, old.y) == 1 and not occupied[key] then
                    placements[index] = {x = old.x, y = old.y}
                    occupied[key] = true
                else
                    to_move[#to_move + 1] = index
                end
            else
                to_move[#to_move + 1] = index
            end
        end
        for _, index in ipairs(to_move) do
            local source = existing_by_index[index]
            local candidates = get_open_team_cells(data.teams, 1, occupied)
            sort_cells_near(candidates, source and source.x or 5, source and source.y or 2)
            local target = candidates[1]
            if target then
                placements[index] = {x = target.x, y = target.y}
                occupied[tostring(target.x)..":"..tostring(target.y)] = true
            else
                print("[ezencounters] WARNING no available enemy tile for enemy", index)
            end
        end
    end

    if positions_were_missing or terrain ~= nil then
        positions = make_empty_matrix()
        for index, placement in pairs(placements) do
            if placement then
                positions[placement.y][placement.x] = index
            end
        end
        data.positions = positions
    end
end

local function prepare_battlefield_data(data)
    if type(data.tiles) ~= "table" then
        data.tiles = copy_matrix(encounter_info.field_tiles_default)
    end

    local terrain = type(data.terrain) == "string" and data.terrain or nil
    local player_columns, enemy_columns = get_terrain_columns(terrain)

    if type(data.teams) ~= "table" then
        if player_columns and enemy_columns then
            local player_column_set = {}
            for _, x in ipairs(player_columns) do player_column_set[x] = true end
            data.teams = make_empty_matrix()
            for y = 1, 3 do
                for x = 1, 6 do
                    data.teams[y][x] = player_column_set[x] and 2 or 1
                end
            end
        else
            data.teams = copy_matrix(encounter_info.field_teams_default)
        end
    else
        data.teams = copy_matrix(data.teams)
    end

    -- Terrain is runtime context, never an encounter-definition requirement.
    -- Only normalize placements when a recognized terrain was supplied.
    if player_columns then
        normalize_player_positions(data)
        normalize_enemy_positions(data, terrain)
    end
end

function package_build(mob,data)
    ezdbg('BUILD_BEGIN', 'data', type(data), 'enemies', type(data) == 'table' and type(data.enemies) == 'table' and #data.enemies or 'nil')
 
    print("[ezencounters scale-once-test] PACKAGE_BUILD LOADED")
    --First a work around to not crash the server, include the obstacle scripts here rather than in global scope
    for obstacle_alias, script_path in pairs(encounter_info.obstacles) do
        --print('[ezencounters] including '..script_path)
        ezdbg('OBSTACLE_INCLUDE_BEGIN', obstacle_alias, script_path)
        loaded_obstacles[obstacle_alias] = include(script_path)
        ezdbg('OBSTACLE_INCLUDE_OK', obstacle_alias)
    end
    --work around end

    --TESTING, uncomment to set up custom arrangements of enemies for testing
    --[[local data = {
        enemies = {
            {name="Mettaur",rank=1},
        },
        positions = {
            {0,0,0,0,0,1},
            {0,0,0,0,1,0},
            {0,0,0,1,0,0}
        },
    }]]
    --

    local field = mob:get_field()
    --can setup music, and field here
    if not data then
        --test data here
        local flip_field = false
        data = ramdomize_test_scenario(encounter_info,flip_field)
    end
    -- Prepare default tiles/teams and apply any runtime terrain formation.
    -- `terrain` is supplied in initiate_encounter data, never stored in the
    -- area encounter definition itself.
    prepare_battlefield_data(data)

    for y, x_table in ipairs(data.tiles) do
        for x, tile_state_index in ipairs(x_table) do
            local tile = field:tile_at(x,y)
            local tile_state = get_enum_value_by_index(encounter_info.tile_states,tile_state_index)
            if tile then
                tile:set_state(tile_state)
            end
        end
    end

    -- A surrounded battlefield puts enemy-owned tiles on BOTH sides of the
    -- players. Mods can read their tile's facing again after teleports, flips,
    -- and movement; make the tiles face the opposition as well as the spawned
    -- characters. Never derive combat direction solely from team ownership.
    local function facing_for_tile(x, y, team_id)
        local opposing_team = team_id == 1 and 2 or 1
        local nearest_x = nil
        local nearest_distance = math.huge
        -- For enemies prefer the actual player's position over empty player
        -- territory. This is especially important on authored battlefields.
        if team_id == 1 and type(data.player_positions) == "table" then
            for player_y, row in ipairs(data.player_positions) do
                if type(row) == "table" then
                    for player_x, player_id in ipairs(row) do
                        if player_id ~= nil and player_id ~= 0 then
                            local distance = math.abs(player_x - x) * 4 + math.abs(player_y - y)
                            if distance < nearest_distance then
                                nearest_distance, nearest_x = distance, player_x
                            end
                        end
                    end
                end
            end
        end
        if nearest_x == nil then
            -- On player tiles prefer a right-side opponent when surrounded,
            -- preserving the normal player orientation if both are available.
            local right_x, left_x = nil, nil
            for target_y, row in ipairs(data.teams) do
                for target_x, target_team in ipairs(row) do
                    if tonumber(target_team) == opposing_team then
                        if target_x > x and (not right_x or target_x < right_x) then
                            right_x = target_x
                        elseif target_x < x and (not left_x or target_x > left_x) then
                            left_x = target_x
                        end
                    end
                end
            end
            if team_id == 2 and right_x then return Direction.Right end
            if team_id == 2 and left_x then return Direction.Left end
            if right_x and left_x then
                nearest_x = (right_x - x <= x - left_x) and right_x or left_x
            else
                nearest_x = right_x or left_x
            end
        end
        if nearest_x ~= nil then
            if nearest_x > x then return Direction.Right end
            if nearest_x < x then return Direction.Left end
        end
        return team_id == 1 and Direction.Left or Direction.Right
    end

    -- Team 1 is enemy territory; team 2 is player territory.
    for y, x_table in ipairs(data.teams) do
        for x, team_index in ipairs(x_table) do
            local tile = field:tile_at(x, y)
            if tile then
                tile:set_team(team_index, false)
                if tonumber(team_index) == 1 or tonumber(team_index) == 2 then
                    tile:set_facing(facing_for_tile(x, y, tonumber(team_index)))
                end
            else
                print('[ezencounters] WARNING missing team tile at', x, y)
            end
        end
    end

    -- Normalize top-level overrides for single-character old encounter tables.
    if type(data.enemies) == 'table' and #data.enemies == 1 then
        local e = data.enemies[1]
        if type(e) == 'table' then
            if e.max_hp == nil then e.max_hp = data.max_hp end
            if e.starting_hp == nil and e.health == nil then
                e.starting_hp = data.starting_hp or data.health
            end
        end
    end

    -- Show the full selected enemy data *before* the spawner is created.
    -- If max_hp is absent here, the problem is the server payload rather
    -- than an early native-HP assignment by a character mod.
    for i, e in ipairs(data.enemies or {}) do
        print('[EZHP][CLIENT][ENTRY_PAYLOAD]', i,
            'name', tostring(e.name), 'max_hp', tostring(e.max_hp),
            'health', tostring(e.health), 'start', tostring(e.starting_hp),
            'rank', tostring(e.rank), 'top_max', tostring(data.max_hp))
    end

    --load enemies from data
    if not data.enemies then
        print('[ezencounters] WARNING no enemies listed for encounter')
        return
    end
    spawners = {}
    for index, enemy_info in ipairs(data.enemies) do
        local override_rank = tonumber(enemy_info.rank_override)
        local enemy_rank
        if override_rank ~= nil and override_rank >= 0 and override_rank <= 7
            and override_rank == math.floor(override_rank) then
            enemy_rank = encounter_info.enemy_ranks[override_rank + 1]
            print('[EZHP][CLIENT][RANK_OVERRIDE]', tostring(enemy_info.name), override_rank)
        else
            enemy_rank = get_enum_value_by_index(encounter_info.enemy_ranks,enemy_info.rank)
        end
        print("trying to make spawner for ",enemy_info.name,enemy_rank)
        local package_id = select_enemy_character_package(enemy_info)
        if package_id == nil then
            error("[ezencounters] Unknown enemy package alias: " .. tostring(enemy_info.name))
        end
        ezdbg('SPAWNER_BEGIN', index, enemy_info.name, 'package', package_id, 'rank', enemy_rank, 'hp', enemy_info.max_hp, 'scale', enemy_info.scale)
        spawners[index] = mob:create_spawner(package_id, enemy_rank)
        ezdbg('SPAWNER_OK', index, enemy_info.name)
    end

    -- Resolve the player's battle-field column so enemies can face inward
    -- even when the encounter places enemies on both sides of the player.
    -- The standard player-side center column is 3 when no explicit position
    -- is supplied (the normal 6x3 encounter field).
    local player_columns = {}
    if type(data.player_positions) == "table" then
        for _, x_table in ipairs(data.player_positions) do
            if type(x_table) == "table" then
                for x, player_id in ipairs(x_table) do
                    if player_id ~= nil and player_id ~= 0 then
                        player_columns[#player_columns + 1] = x
                    end
                end
            end
        end
    end
    if #player_columns == 0 then
        player_columns = list_team_columns(data.teams, 2)
    end
    if #player_columns == 0 then
        player_columns[1] = 3
    end

    local function facing_toward_nearest_player(enemy_x, character)
        local nearest_player_x = player_columns[1]
        local nearest_distance = math.abs(enemy_x - nearest_player_x)
        for index = 2, #player_columns do
            local distance = math.abs(enemy_x - player_columns[index])
            if distance < nearest_distance then
                nearest_distance = distance
                nearest_player_x = player_columns[index]
            end
        end

        if enemy_x < nearest_player_x then
            return Direction.Right
        elseif enemy_x > nearest_player_x then
            return Direction.Left
        end

        -- Same-column placement is unusual; preserve the tile's configured
        -- facing rather than forcing an arbitrary horizontal direction.
        local tile = character:get_tile()
        if tile then
            return tile:get_facing()
        end
        return Direction.Left
    end

    -- Persistent, per-character frame-proportional scaling.
    -- A sprite resize in the spawn mutator can be reset by later animation and
    -- texture changes. The character's own update callback is retained, and
    -- we reapply only when the observed width or height is no longer the
    -- expected scaled size. Each axis is tracked independently: if an attack
    -- changes only one dimension, the other is never multiplied twice.
    -- No assumption is made about hidden engine scale methods or animations.
    local function install_shademan_scale_monitor(character, enemy_info)
        local scale = enemy_info and tonumber(enemy_info.scale) or 1
        if type(scale) ~= "number" or scale ~= scale or scale <= 0
            or scale == math.huge or scale == -math.huge then
            print("[EZDBG][CLIENT][ShadeMan:scale][INVALID]", tostring(enemy_info and enemy_info.scale))
            return
        end
        if scale == 1 then
            print("[EZDBG][CLIENT][ShadeMan:scale][NATIVE] 1.0")
            return
        end
        -- These are native (width,height) pairs from com_Dawn_Shademan.zip's
        -- own battle shademan.animation, not its overworld spritesheet.
        local native_frames = {
            {11, 4},
            {21, 33},
            {23, 41},
            {24, 9},
            {24, 22},
            {27, 38},
            {31, 45},
            {31, 77},
            {31, 78},
            {38, 33},
            {40, 85},
            {41, 75},
            {41, 76},
            {41, 77},
            {41, 78},
            {41, 79},
            {43, 69},
            {43, 71},
            {46, 69},
            {52, 89},
            {56, 58},
            {56, 61},
            {64, 81},
            {64, 82},
            {74, 58},
            {75, 70},
            {77, 64},
            {82, 70},
            {83, 71},
            {84, 72},
            {85, 71},
            {100, 87},
            {100, 89},
            {142, 70},
            {143, 70},
        }
        -- ONB reports battle-sprite dimensions at 2x the .animation frame
        -- rectangles before applying any encounter multiplier. Client logs:
        -- ShadeMan 41x77 -> -82x154 at scale=2, but NO [FRAME] resize;
        -- the previous guard mistook that unscaled base for our target size.
        -- Match signed sprite dimensions against this render-space baseline.
        local native_render_multiplier = 2
        local printed = 0
        local unknown_printed = false
        local pending_frame_reported = false
        local last_width, last_height = nil, nil
        local failures = 0
        local disabled = false
        local function matches(a,b,x,y)
            return math.abs(a-x) < 0.05 and math.abs(b-y) < 0.05
        end
        local function refresh()
            if disabled then return end
            local ok, err = pcall(function()
                local sprite = character:sprite()
                if not sprite then return end
                local width, height = sprite:get_width(), sprite:get_height()
                if type(width) ~= "number" or type(height) ~= "number"
                    or width ~= width or height ~= height
                    or width == math.huge or height == math.huge
                    or width == -math.huge or height == -math.huge
                    or width == 0 or height == 0 then
                    if not pending_frame_reported then
                        pending_frame_reported = true
                        print('[EZDBG][CLIENT][ShadeMan:scale][FRAME_PENDING]',
                            'width', tostring(width), 'height', tostring(height))
                    end
                    return
                end
                local aw, ah = math.abs(width), math.abs(height)
                -- Already scaled: no action. This also guards engine ticks
                -- which update unrelated battle callbacks without new frames.
                if last_width and matches(width,height,last_width,last_height) then return end
                local native = false
                local scaled = false
                for _, size in ipairs(native_frames) do
                    local native_w = size[1] * native_render_multiplier
                    local native_h = size[2] * native_render_multiplier
                    if matches(aw,ah,native_w,native_h) then native = true end
                    if matches(aw,ah,native_w*scale,native_h*scale) then scaled = true end
                    if native and scaled then break end
                end
                -- An unrelated native frame can match a scaled OTHER frame.
                -- Since last_width/last_height were checked above, prefer a
                -- known native frame over a merely POSSIBLE scaled frame.
                if not native and scaled then
                    last_width, last_height = width, height
                    return
                end
                if not native then
                    if not unknown_printed then
                        unknown_printed = true
                        print("[EZDBG][CLIENT][ShadeMan:scale][UNKNOWN_FRAME]",
                            tostring(width), tostring(height), "factor", tostring(scale),
                            "render_multiplier", native_render_multiplier)
                    end
                    return
                end
                local new_width, new_height = width*scale, height*scale
                if math.abs(new_width)>2048 or math.abs(new_height)>2048
                    or math.abs(new_width)<1 or math.abs(new_height)<1 then return end
                sprite:set_width(new_width)
                sprite:set_height(new_height)
                last_width, last_height = new_width, new_height
                if printed < 12 then
                    printed = printed + 1
                    print("[EZDBG][CLIENT][ShadeMan:scale][FRAME]",
                        tostring(width), tostring(height), "to",
                        tostring(new_width), tostring(new_height), "factor", tostring(scale))
                end
            end)
            if not ok then
                failures = failures + 1
                print("[EZDBG][CLIENT][ShadeMan:scale][ERROR]", tostring(err))
                if failures >= 3 then disabled = true end
            else
                failures = 0
            end
        end
        -- ShadeMan also needs UI-lifetime monitoring: at spawn its animated
        -- root sprite may have no dimensions yet, and Local components do not
        -- update during chip selection. Do not overwrite Sol usertype methods.
        local scale_lifetime = Lifetimes.UI or Lifetimes.Scene or Lifetimes.Local
        local lifetime_name = (Lifetimes.UI and 'UI') or
            (Lifetimes.Scene and 'Scene') or 'Local'
        local component_ticks = 0
        local installed, install_err = pcall(function()
            local scale_component = Battle.Component.new(character, scale_lifetime)
            scale_component.update_func = function(self, dt)
                component_ticks = component_ticks + 1
                if component_ticks <= 2 then
                    local ok, w, h = pcall(function()
                        local s = character:sprite()
                        return s and s:get_width(), s and s:get_height()
                    end)
                    print('[EZDBG][CLIENT][ShadeMan:scale][COMPONENT_TICK]',
                        'lifetime', lifetime_name, 'tick', component_ticks,
                        'size_ok', ok, 'width', tostring(w), 'height', tostring(h))
                end
                refresh()
            end
            character:register_component(scale_component)
        end)
        if not installed then
            print('[EZDBG][CLIENT][ShadeMan:scale][COMPONENT_FAILED]', tostring(install_err))
        end
        refresh()
        print("[EZDBG][CLIENT][ShadeMan:scale][INSTALLED]",
            tostring(scale), "native_frames", #native_frames,
            'native_render_multiplier', native_render_multiplier,
            'lifetime', lifetime_name, 'component', installed)
    end

    -- Exact native battle-frame dimensions, taken from the installed enemy
    -- character archives, not the OW spritesheets. ONB reports a root sprite
    -- at 2x these .animation rectangle dimensions before encounter scaling.
    -- Original native battle rectangles from the installed BigBrute and
    -- Bladia character .animation files. The ONB root sprite exposes these
    -- dimensions at twice their .animation size before encounter scaling.
    local KNOWN_BATTLE_FRAME_DIMENSIONS = {
        BigBrute = { {67,68}, {69,66}, {70,69}, {71,71}, {83,71}, {84,73} },
        Bladia = { {48,62}, {64,68}, {65,84}, {69,72}, {72,70}, {73,64}, {73,65}, {73,66}, {73,67}, {74,73}, {78,63}, {82,60} },
    }

    -- The engine may replace only ONE dimension during an animation change.
    -- Thus sprite width can already be scaled while sprite height is native,
    -- or vice versa. Whole-frame matching left both dimensions uncorrected;
    -- scaling every mismatch blindly made Bladia/BigBrute grow infinitely.
    -- Recognize each axis separately from known native render-space values.
    local function install_enemy_sprite_scale_monitor(character, enemy_info)
        local alias = tostring(enemy_info and enemy_info.name or 'unknown')
        local raw_scale = enemy_info and enemy_info.scale
        local scale = raw_scale == nil and 1 or tonumber(raw_scale)
        if type(scale) ~= 'number' or scale ~= scale
            or scale == math.huge or scale == -math.huge or scale <= 0 then
            print('[ezencounters scale] INVALID; using 1.0', alias, tostring(raw_scale))
            return
        end
        if scale == 1 then return end

        -- Mettaur already works; keep its existing one-shot path verbatim.
        if alias == 'Mettaur' then
            local ok, err = pcall(function()
                local sprite = character:sprite()
                local w, h = sprite:get_width(), sprite:get_height()
                if type(w) ~= 'number' or type(h) ~= 'number'
                    or w == 0 or h == 0
                    or math.abs(w*scale) > 16384 or math.abs(h*scale) > 16384
                    or math.abs(w*scale) < 1 or math.abs(h*scale) < 1 then
                    error('invalid spawn sprite dimensions')
                end
                sprite:set_width(w*scale)
                sprite:set_height(h*scale)
                print('[ezencounters scale-once-test] APPLIED ONCE', alias,
                    'factor', scale, 'before', w, h, 'after', w*scale, h*scale)
            end)
            if not ok then
                print('[ezencounters scale-once-test] SPAWN APPLY FAILED', alias, tostring(err))
            end
            return
        end

        -- ONB's embedded Lua runtime does not always expose the standard
        -- string metatable (__index). In that runtime alias:match(...) raises
        -- 'attempt to index a string value', aborting scale registration.
        -- Use direct table lookup instead of any string method. The aliases
        -- below are the names used by the shipped encounter configurations.
        local bigbrute_aliases = {
            BigBrute = true, BigBrute1 = true, BigBrute2 = true,
            BigBrute3 = true, BigBrute4 = true,
            BigBruteVar1 = true, BigBruteVar2 = true, BigBruteVar3 = true,
            BigBrutevar1 = true, BigBrutevar2 = true, BigBrutevar3 = true,
        }
        local bladia_aliases = {
            Bladia = true, Bladia1 = true, Bladia2 = true,
            Bladia3 = true, Bladia4 = true, Bladia5 = true, Bladia6 = true,
        }
        local native_frames
        if bigbrute_aliases[alias] then
            -- Preserve the exact catalogs verified in the live client.
            native_frames = KNOWN_BATTLE_FRAME_DIMENSIONS.BigBrute
        elseif bladia_aliases[alias] then
            native_frames = KNOWN_BATTLE_FRAME_DIMENSIONS.Bladia
        elseif type(enemy_info) == 'table'
            and type(enemy_info._ez_battle_native_frames) == 'table'
            and #enemy_info._ez_battle_native_frames > 0 then
            -- Auto-generated once during server startup from the installed
            -- mod ZIP's actual primary battle .animation file. All entries
            -- are native [width,height] pairs, not previously scaled pixels.
            native_frames = enemy_info._ez_battle_native_frames
            print('[EZDBG][CLIENT][SCALE_BOOT_CATALOG]', alias,
                'frames', #native_frames, 'factor', scale)
        end

        local render_multiplier = 2
        local native_widths, native_heights = {}, {}
        if native_frames then
            for _, pair in ipairs(native_frames) do
                native_widths[#native_widths+1] = pair[1] * render_multiplier
                native_heights[#native_heights+1] = pair[2] * render_multiplier
            end
        end
        -- Conservative fallback for mods without a verified frame catalog:
        -- learn only their first nonzero dimensions. Do not treat every
        -- subsequent animation value as an unscaled base.
        local learned_native = false
        local last_written_w, last_written_h = nil, nil
        local frame_reports, unknown_reports, axis_reports = 0, 0, 0
        local failed_refreshes, disabled, pending_reported = 0, false, false
        local function near(a, b)
            return math.abs(a-b) < 0.05
        end
        local function is_in(values, actual)
            for _, value in ipairs(values) do
                if near(value, actual) then return true end
            end
            return false
        end
        local function valid_dimension(n)
            return type(n) == 'number' and n == n
                and n ~= math.huge and n ~= -math.huge
                and math.abs(n) >= 0.001
        end
        -- Return a new dimension only if that axis is definitely native.
        -- On ambiguity (native and already-scaled values coincide), DO NOT
        -- multiply, because safety against compounding takes priority.
        local function decide_axis(value, native_sizes, last_written)
            local absolute = math.abs(value)
            if last_written and near(absolute, math.abs(last_written)) then
                return nil, 'last_write'
            end
            local native = is_in(native_sizes, absolute)
            local scaled = false
            for _, base in ipairs(native_sizes) do
                if near(base*scale, absolute) then
                    scaled = true
                    break
                end
            end
            if native and not scaled then
                local proposed = value*scale
                if math.abs(proposed) <= 16384 and math.abs(proposed) >= 1 then
                    return proposed, 'native'
                end
                return nil, 'out_of_range'
            elseif scaled and not native then
                return nil, 'scaled'
            elseif native and scaled then
                return nil, 'ambiguous'
            end
            return nil, 'unknown'
        end
        local function refresh()
            if disabled then return end
            local success, err = pcall(function()
                local sprite = character:sprite()
                if not sprite then return end
                local width, height = sprite:get_width(), sprite:get_height()
                if not valid_dimension(width) or not valid_dimension(height) then
                    if not pending_reported then
                        pending_reported = true
                        print('[EZDBG][CLIENT][SCALE_FRAME_PENDING]', alias,
                            'width', tostring(width), 'height', tostring(height))
                    end
                    return
                end
                if not native_frames and not learned_native then
                    learned_native = true
                    native_widths[1] = math.abs(width)
                    native_heights[1] = math.abs(height)
                    print('[EZDBG][CLIENT][SCALE_NATIVE_LEARNED]', alias,
                        'width', native_widths[1], 'height', native_heights[1])
                end

                local next_w, width_reason = decide_axis(width, native_widths, last_written_w)
                local next_h, height_reason = decide_axis(height, native_heights, last_written_h)
                -- If only one axis is reset to native, correct ONLY that axis.
                -- This is precisely what the old all-or-nothing check missed.
                if next_w then
                    sprite:set_width(next_w)
                    last_written_w = next_w
                end
                if next_h then
                    sprite:set_height(next_h)
                    last_written_h = next_h
                end
                if next_w or next_h then
                    if frame_reports < 16 then
                        frame_reports = frame_reports+1
                        print('[EZDBG][CLIENT][SCALE_AXIS_APPLIED]', alias,
                            'factor', scale, 'before', width, height,
                            'after', next_w or width, next_h or height,
                            'width_status', width_reason, 'height_status', height_reason)
                    end
                elseif axis_reports < 4 then
                    axis_reports = axis_reports + 1
                    print('[EZDBG][CLIENT][SCALE_AXIS_SKIPPED]', alias,
                        'width', width, width_reason,
                        'height', height, height_reason,
                        'catalog', native_frames and #native_frames or 0)
                end
                if (width_reason == 'unknown' or height_reason == 'unknown')
                    and unknown_reports < 3 then
                    unknown_reports = unknown_reports+1
                    print('[EZDBG][CLIENT][SCALE_UNKNOWN_AXIS]', alias,
                        'width', width, width_reason,
                        'height', height, height_reason)
                end
            end)
            if success then
                failed_refreshes = 0
            else
                failed_refreshes = failed_refreshes+1
                if failed_refreshes == 1 then
                    print('[ezencounters scale] AXIS REFRESH FAILED', alias, tostring(err))
                end
                if failed_refreshes >= 3 then
                    disabled = true
                    print('[ezencounters scale] MONITOR DISABLED', alias)
                end
            end
        end

        -- Use the first declared lifetime supported by this client. Scene
        -- was observed in the supplied client logs; no custom callbacks are
        -- assigned to the userdata character itself (Sol prohibits it).
        local scale_lifetime = Lifetimes.UI or Lifetimes.Scene or Lifetimes.Local
        local lifetime_name = (Lifetimes.UI and 'UI') or
            (Lifetimes.Scene and 'Scene') or 'Local'
        local component_ticks = 0
        local installed, install_err = pcall(function()
            local scale_component = Battle.Component.new(character, scale_lifetime)
            scale_component.update_func = function(self, dt)
                component_ticks = component_ticks+1
                if component_ticks <= 2 then
                    local ok, w, h = pcall(function()
                        local sprite = character:sprite()
                        return sprite and sprite:get_width(), sprite and sprite:get_height()
                    end)
                    print('[EZDBG][CLIENT][SCALE_COMPONENT_TICK]', alias,
                        'lifetime', lifetime_name, 'tick', component_ticks,
                        'size_ok', ok, 'width', tostring(w), 'height', tostring(h))
                end
                refresh()
            end
            character:register_component(scale_component)
        end)
        if not installed then
            print('[EZDBG][CLIENT][SCALE_COMPONENT_FAILED]', alias, tostring(install_err))
        end
        refresh()
        print('[EZDBG][CLIENT][SCALE_COMPONENT]', alias,
            'factor', scale, 'lifetime', lifetime_name,
            'known_frames', native_frames and #native_frames or 0,
            'installed', installed)
    end

    -- Spawn enemies and explicitly set each character's facing. Tile facing
    -- alone is not sufficient for formations that surround the player:
    -- enemies on the left must face Right, while enemies on the right face Left.
    if not data.positions then
        print('[ezencounters] WARNING no enemy spawn positions')
        return
    end
    for y, x_table in ipairs(data.positions) do
        for x, spawner_id in ipairs(x_table) do
            if spawner_id ~= 0 then
                local spawner = spawners[spawner_id]
                local enemy_info = data.enemies[spawner_id]
                ezdbg('SPAWN_AT_BEGIN', enemy_info and enemy_info.name, x, y)
                local mutator = spawner:spawn_at(x, y)
                ezdbg('SPAWN_AT_OK', enemy_info and enemy_info.name, x, y)
                if enemy_info and tonumber(enemy_info.scale) and tonumber(enemy_info.scale) ~= 1 then
                    print("[ezencounters scale] SPAWN QUEUED", tostring(enemy_info.name), "scale", tostring(enemy_info.scale))
                end
                mutator:mutate(function (character)
                    ezdbg('MUTATOR_BEGIN', enemy_info and enemy_info.name, x, y)
                    local diag_ok, diag_health, diag_max = pcall(function()
                        return character:get_health(), character:get_max_health()
                    end)
                    print("[ezencounters hp-diag] MUTATOR BEFORE", tostring(enemy_info and enemy_info.name),
                        "ok", tostring(diag_ok), "current", tostring(diag_health),
                        "max", tostring(diag_max),
                        "requested", tostring(enemy_info and enemy_info.max_hp),
                        "scale", tostring(enemy_info and enemy_info.scale))
                    if enemy_info and tonumber(enemy_info.scale) and tonumber(enemy_info.scale) ~= 1 then
                        print("[ezencounters scale] SPAWN MUTATOR", tostring(enemy_info.name))
                    end
                    character:set_facing(facing_toward_nearest_player(x, character))

                    if enemy_info.nickname ~= nil then
                        character:set_name(enemy_info.nickname)
                    end
                    -- Deferred-native HP protocol, per *character instance*.
                    -- Native HP remains zero until here; ordinary mob battles
                    -- receive native rank HP in their character on_spawn_func.
                    -- An authored single-character top-level maximum is a
                    -- supported fallback when an entry lacks max_hp.
                    local requested_max = tonumber(enemy_info and enemy_info.max_hp)
                    if not requested_max and type(data.enemies) == 'table'
                        and #data.enemies == 1 then
                        requested_max = tonumber(data.max_hp)
                        if requested_max then
                            print('[EZHP][CLIENT][TOP_LEVEL_MAX_FALLBACK]',
                                tostring(enemy_info.name), requested_max)
                        end
                    end
                    if requested_max and (requested_max ~= requested_max
                        or requested_max == math.huge or requested_max <= 0) then
                        print('[EZHP][CLIENT][INVALID_MAX]', tostring(enemy_info.name), tostring(requested_max))
                        requested_max = nil
                    end
                    if requested_max then requested_max = math.floor(requested_max) end
                    local starting_health = tonumber(enemy_info and (enemy_info.health or enemy_info.starting_hp))
                    if not starting_health and #data.enemies == 1 then
                        starting_health = tonumber(data.starting_hp or data.health)
                    end
                    if starting_health and (starting_health ~= starting_health
                        or starting_health == math.huge or starting_health < 0) then
                        print('[EZHP][CLIENT][INVALID_START]', tostring(enemy_info.name), tostring(starting_health))
                        starting_health = nil
                    end
                    if starting_health then starting_health = math.floor(starting_health) end
                    print('[EZHP][CLIENT][HP_HANDOFF]', tostring(enemy_info.name),
                        'requested_max', tostring(requested_max),
                        'starting_hp', tostring(starting_health),
                        'native_hint', tostring(character.__ezhp_native_max_hp),
                        'pre_max', tostring(character:get_max_health()))
                    local old_max = character:get_max_health()
                    if requested_max and old_max == 0 then
                        character:set_health(requested_max)
                        print('[EZHP][CLIENT][MAX_INIT]', tostring(enemy_info.name),
                            'requested', requested_max, 'actual', character:get_max_health())
                    elseif requested_max and old_max ~= requested_max then
                        print('[EZHP][CLIENT][INCOMPATIBLE_CHARACTER]', tostring(enemy_info.name),
                            'requested', requested_max, 'initialized_max', old_max,
                            'native_hint', tostring(character.__ezhp_native_max_hp))
                    end
                    -- A regular encounter without an explicit maximum must
                    -- still initialize native rank HP. Do it here when possible,
                    -- after the package constructor but before first battle update.
                    if not requested_max and data.no_battle_rewards
                        and (starting_health ~= nil or data.health ~= nil) then
                        print('[EZHP][CLIENT][LIBERATION_MISSING_MAX]',
                            tostring(enemy_info.name),
                            'native', tostring(character.__ezhp_native_max_hp),
                            'starting', tostring(starting_health),
                            'top_max', tostring(data.max_hp))
                    end
                    if not requested_max and old_max == 0 then
                        local native = tonumber(character.__ezhp_native_max_hp)
                        if native and native == native and native > 0 and native < math.huge then
                            native = math.max(1, math.floor(native))
                            character:set_health(native)
                            print('[EZHP][CLIENT][NATIVE_FALLBACK_MUTATOR]',
                                tostring(enemy_info.name), native, 'actual', character:get_max_health())
                        else
                            print('[EZHP][CLIENT][NATIVE_FALLBACK_DEFERRED]',
                                tostring(enemy_info.name), tostring(native))
                        end
                    end
                    if starting_health ~= nil and character:get_max_health() > 0 then
                        local actual_start = math.min(character:get_max_health(), math.max(1, starting_health))
                        character:set_health(actual_start)
                        print('[EZHP][CLIENT][START_INIT]', tostring(enemy_info.name), actual_start)
                    elseif starting_health ~= nil and not requested_max then
                        -- Native fallback has not yet produced positive HP.
                        -- A mutator usertype cannot have on_spawn_func replaced.
                        -- A one-shot Local component applies starting HP after
                        -- the character's own initialization, without touching AI.
                        local ok, err = pcall(function()
                            local start_component = Battle.Component.new(character, Lifetimes.Local)
                            start_component.update_func = function(self, dt)
                                local owner = self:get_owner()
                                if owner and owner:get_max_health() > 0 then
                                    owner:set_health(math.min(owner:get_max_health(),
                                        math.max(1, starting_health)))
                                    self:eject()
                                end
                            end
                            character:register_component(start_component)
                        end)
                        if not ok then
                            print('[EZHP][CLIENT][DEFERRED_START_COMPONENT_FAILED]',
                                tostring(enemy_info.name), tostring(err))
                        end
                    end
                    if requested_max then
                        local actual_max = character:get_max_health()
                        print('[EZHP][CLIENT][MAX_CHECK]', tostring(enemy_info.name),
                            'requested', requested_max, 'actual', actual_max,
                            'success', actual_max == requested_max)
                    end
                    -- HP MUST be assigned before installing visual monitors.
                    -- A visual-only failure must never skip maximum-HP setup.
                    local scale_ok, scale_err = pcall(function()
                        if enemy_info and enemy_info.name == 'ShadeMan' then
                            install_shademan_scale_monitor(character, enemy_info)
                        else
                            install_enemy_sprite_scale_monitor(character, enemy_info)
                        end
                    end)
                    if not scale_ok then
                        print('[EZDBG][CLIENT][SCALE_INSTALL_FAILED]',
                            tostring(enemy_info and enemy_info.name), tostring(scale_err))
                    end
                    ezdbg('MUTATOR_END', enemy_info and enemy_info.name)
                end)
            end
        end
    end

    if data.player_positions then
        for y, x_table in ipairs(data.player_positions) do
            for x, player_id in ipairs(x_table) do
                if player_id ~= 0 then
                    ezdbg('PLAYER_SPAWN_BEGIN', player_id, x, y)
                    mob:spawn_player( player_id, x, y )
                    ezdbg('PLAYER_SPAWN_OK', player_id, x, y)
                end
            end
        end
    end

    if data.freedom_mission and data.freedom_mission.enabled ~= false then
        local turns = 3
        local can_flip = true
        -- Area encounter definitions use `turn_count`; accept the older
        -- `turns` spelling too so existing data continues to work.
        if data.freedom_mission.turn_count ~= nil then
            turns = data.freedom_mission.turn_count
        elseif data.freedom_mission.turns ~= nil then
            turns = data.freedom_mission.turns
        end
        if data.freedom_mission.player_can_flip ~= nil then
            can_flip = data.freedom_mission.player_can_flip
        end
        mob:enable_freedom_mission(turns,can_flip)
    end

    if type(data.music) == "table" then
        local music_path = data.music.path
        if type(music_path) == "string" and music_path ~= "" then
            local loop_start = tonumber(data.music.loop_start) or 0
            local loop_end = tonumber(data.music.loop_end) or 0
            mob:stream_music(_folderpath.."/music/"..music_path..".mid",loop_start,loop_end)
        end
    end

    if data.obstacle_positions then
        for y, x_table in ipairs(data.obstacle_positions) do
            for x, obstacle_id in ipairs(x_table) do
                if obstacle_id ~= 0 then
                    local obstacle_info = data.obstacles[obstacle_id]
                    local create_obstacle_func = loaded_obstacles[obstacle_info.name]
                    local new_obstacle = create_obstacle_func()
                    --print('spawning obstacle '..obstacle_info.name..' at '..x..','..y)
                    field:spawn(new_obstacle,x,y)
                end
            end
        end
    end

    ezdbg('BUILD_END')
end
