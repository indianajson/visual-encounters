/* VisualEncounters V2.1: server-source grounded export formats. */
(function (root) {
    'use strict';

    const PACKAGE_DIRECTORY = 'assets/ezlibs-assets/ezencounters/';
    const ENCOUNTER_DIRECTORY = 'encounters/';
    const TEMPLATE_DIRECTORY = 'scripts/ezlibs-custom/nebulous-liberations/liberations/enemies/';
    const TEMPLATE_SOURCE = 'mods/ezencounters-v21-base.zip';
    const CATEGORIES = ['encounters', 'special_encounters', 'bosses'];
    const TARGET_LABELS = {
        liberations: 'Nebulous Liberations',
        ezencounters: 'EZEncounters',
        endless_runner: 'Endless Runner'
    };
    const TARGET_DESCRIPTIONS = {
        liberations: 'Mission-scoped client ZIP and no battle rewards. Freedom missions default to three turns. Tiled must select this base area and its named encounters.',
        ezencounters: 'Area encounter table and standard ezencounters.zip. Rewards, enemy fallback rewards and battle properties are preserved.',
        endless_runner: 'Same encounter table as EZEncounters, keyed by the Runner base-area ID. Runner floor sections/overrides are configured in Tiled.'
    };
    const ENEMY_FIELDS = [
        'name', 'rank', 'rank_override', 'nickname', 'health', 'max_hp', 'starting_hp', 'scale',
        'attack_multiplier', 'defense_multiplier'
    ];
    const ENCOUNTER_FIELDS = [
        'name', 'path', 'weight', 'enemies', 'obstacles', 'positions',
        'obstacle_positions', 'player_positions', 'tiles', 'teams', 'freedom_mission',
        'no_battle_rewards', 'rewards', 'music', 'persistent_health', 'no_results'
    ];
    const MATRIX_FIELDS = ['positions', 'player_positions', 'obstacle_positions', 'teams', 'tiles'];
    const TOP_LEVEL_FIELDS = ['rewards', 'enemy_rewards', 'persistent_health'];

    function mapIdentity(value) {
        const name = String(value || '').trim();
        if (!name || !/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(name)) {
            throw new Error('Enter the exact base area name (letters, numbers, spaces, _ or -, no path or .tmx).');
        }
        if (name.length > 90) throw new Error('Area name must be at most 90 characters.');
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        return {
            name, slug,
            packageName: 'ezencounters_liberation_' + slug.replace(/-/g, '_'),
            zipName: 'ezencounters-liberation-' + slug + '.zip',
            encounterFile: ENCOUNTER_DIRECTORY + name + '.lua',
            assetFile: PACKAGE_DIRECTORY + 'ezencounters-liberation-' + slug + '.zip',
            clientPath: '/server/' + PACKAGE_DIRECTORY + 'ezencounters-liberation-' + slug + '.zip'
        };
    }

    function aliasesForMission(data) {
        const used = new Set();
        for (const category of CATEGORIES) for (const encounter of data[category] || []) {
            for (const enemy of encounter.enemies || []) {
                const alias = enemy && enemy.name;
                if (typeof alias !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
                    throw new Error('Invalid enemy package alias in ' + category + '/' + String(encounter.name || '?') + ': ' + String(alias));
                }
                used.add(alias);
            }
        }
        if (used.size === 0) throw new Error('Place an enemy on the battle grid before exporting.');
        return [...used].sort((a, b) => a.localeCompare(b, 'en'));
    }

    function packageAliases(entry) {
        const found = /\benemy_packages\s*=\s*\{([\s\S]*?)\n\s*\},\s*\n\s*obstacles\s*=/.exec(entry);
        if (!found) throw new Error('The battle package does not contain the expected enemy_packages table.');
        const result = new Set();
        for (const line of found[1].split(/\r?\n/)) {
            const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*['"]/.exec(line);
            if (match) result.add(match[1]);
        }
        return result;
    }

    function patchBattleEntry(source, identity, requestedAliases) {
        if (typeof source !== 'string') throw new Error('V2.1 base entry.lua is missing.');
        const mapped = packageAliases(source);
        const missing = requestedAliases.filter(alias => !mapped.has(alias));
        if (missing.length) throw new Error('Unknown EZEncounters enemy alias(es): ' + missing.join(', '));
        if (!/\bfunction\s+get_package_id\s*\(\s*alias\s*\)/.test(source)
            || !/\bfunction\s+package_build\s*\(/.test(source)
            || !/\bselect_enemy_character_package\s*\(/.test(source)) {
            throw new Error('Battle package is missing required EZEncounters entry points.');
        }
        const packageName = /^local package_name = "[A-Za-z0-9_]+"\s*$/m;
        const requirements = /local liberation_aliases\s*=\s*\{[\s\S]*?\n\}\s*\n\s*function package_requires_scripts\s*\(\s*\)/m;
        if (!packageName.test(source) || !requirements.test(source)) {
            throw new Error('The battle-package baseline has changed its dependency structure; update the verified base ZIP.');
        }
        const aliasTable = requestedAliases.map(alias => '    ' + alias + ' = true,').join('\n');
        const patched = source.replace(packageName, 'local package_name = "' + identity.packageName + '"')
            .replace(requirements, 'local liberation_aliases = {\n' + aliasTable + '\n}\n\nfunction package_requires_scripts()');
        if (!patched.includes('return encounter_info.enemy_packages[alias]')) {
            throw new Error('The required get_package_id() lookup was lost.');
        }
        if (!patched.includes('local mob_package_id = "com."..package_prefix..".mob."..package_name')) {
            throw new Error('The original package ID declaration has changed.');
        }
        return patched;
    }

    function grid(rows, label, min, max, required) {
        if (rows === undefined && !required) return undefined;
        if (!Array.isArray(rows) || rows.length !== 3) throw new Error(label + ': expected exactly three rows.');
        return rows.map((row, rowIndex) => {
            if (!Array.isArray(row) || row.length !== 6) throw new Error(label + ' row ' + (rowIndex + 1) + ': expected six columns.');
            return row.map(value => {
                const n = Number(value);
                if (!Number.isInteger(n) || n < min || n > max) throw new Error(label + ': invalid grid index ' + String(value));
                return n;
            });
        });
    }

    function prepareTable(data, options) {
        options = options || {};
        const target = options.target || 'liberations';
        if (!Object.prototype.hasOwnProperty.call(TARGET_LABELS, target)) throw new Error('Unknown export target: ' + target);
        const identity = options.identity || mapIdentity(data.area_id);
        const forLiberation = target === 'liberations';
        const minSteps = Number(data.minimum_steps_before_encounter ?? 80);
        const chance = Number(data.encounter_chance_per_step ?? 0.05);
        if (!Number.isInteger(minSteps) || minSteps < 0) throw new Error('Minimum steps must be a non-negative integer.');
        if (!Number.isFinite(chance) || chance < 0 || chance > 1) throw new Error('Encounter chance must be between 0 and 1.');
        const output = { minimum_steps_before_encounter: minSteps, encounter_chance_per_step: chance };
        if (!forLiberation) for (const key of TOP_LEVEL_FIELDS) {
            if (data[key] !== undefined) output[key] = data[key];
        }
        const names = new Set();
        for (const category of CATEGORIES) {
            const entries = data[category] || [];
            if (!Array.isArray(entries)) throw new Error(category + ' must be an array of encounters.');
            output[category] = entries.map((original, index) => {
                if (!original || typeof original !== 'object' || Array.isArray(original)) throw new Error(category + '[' + index + '] must be an encounter table.');
                const name = String(original.name || '').trim();
                if (!name || !/^[A-Za-z0-9_ -]+$/.test(name)) throw new Error(category + '[' + index + '] needs a valid encounter name.');
                if (names.has(name)) throw new Error('Duplicate encounter name: ' + name + ' (across categories).');
                names.add(name);
                const enemies = Array.isArray(original.enemies) ? original.enemies : [];
                if (enemies.length < 1 || enemies.length > 9) throw new Error(name + ': expected 1–9 enemies.');
                const clean = {};
                for (const key of ENCOUNTER_FIELDS) if (original[key] !== undefined) clean[key] = original[key];
                clean.name = name;
                clean.path = forLiberation ? identity.clientPath : '/server/' + PACKAGE_DIRECTORY + 'ezencounters.zip';
                clean.weight = Number(original.weight ?? 10);
                if (!Number.isFinite(clean.weight) || clean.weight < 0) throw new Error(name + ': invalid weight.');
                clean.enemies = enemies.map((raw, i) => {
                    const enemy = {};
                    for (const key of ENEMY_FIELDS) if (raw && raw[key] !== undefined) enemy[key] = raw[key];
                    if (typeof enemy.name !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(enemy.name)) {
                        throw new Error(name + ' enemy ' + (i + 1) + ': invalid EZEncounters alias.');
                    }
                    const rank = Number(enemy.rank ?? 1);
                    // The verified EZEncounters client uses 1-based rank indices
                    // into the [0..7] character rank table. Never export rank 0.
                    if (!Number.isInteger(rank) || rank < 1 || rank > 8) {
                        throw new Error(name + ' enemy ' + (i + 1) + ': rank must be 1..8 (1=V1, 8=Nightmare).');
                    }
                    enemy.rank = rank;
                    if (enemy.rank_override !== undefined) {
                        const override = Number(enemy.rank_override);
                        if (!Number.isInteger(override) || override < 0 || override > 7) {
                            throw new Error(name + ' enemy ' + (i + 1) + ': rank_override must be 0..7 (engine index).');
                        }
                        enemy.rank_override = override;
                    }
                    for (const key of ['health', 'starting_hp', 'max_hp']) if (enemy[key] !== undefined) {
                        const n = Number(enemy[key]);
                        if (!Number.isInteger(n) || n <= 0) throw new Error(name + ': ' + key + ' must be positive integer.');
                        enemy[key] = n;
                    }
                    if (enemy.max_hp !== undefined && enemy.health !== undefined && enemy.health > enemy.max_hp) {
                        throw new Error(name + ': starting health exceeds max_hp.');
                    }
                    for (const key of ['scale', 'attack_multiplier', 'defense_multiplier']) if (enemy[key] !== undefined) {
                        const n = Number(enemy[key]);
                        if (!Number.isFinite(n) || (key === 'scale' ? n <= 0 : n < 0)) throw new Error(name + ': invalid ' + key);
                        enemy[key] = n;
                    }
                    return enemy;
                });
                clean.positions = grid(original.positions, name + ' enemy positions', 0, enemies.length, true);
                const placed = new Set();
                for (const row of clean.positions) for (const slot of row) if (slot > 0) {
                    if (placed.has(slot)) throw new Error(name + ': duplicate position index ' + slot + '; each enemy needs a separate record.');
                    placed.add(slot);
                }
                if (placed.size !== enemies.length) throw new Error(name + ': every enemy must be placed exactly once on the 3×6 grid.');
                clean.player_positions = grid(original.player_positions || [[0,0,0,0,0,0],[0,1,0,0,0,0],[0,0,0,0,0,0]], name + ' player positions', 0, 1, true);
                const playerCount = clean.player_positions.flat().filter(Boolean).length;
                if (playerCount !== 1) throw new Error(name + ': place exactly one player marker.');
                for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) {
                    if (clean.player_positions[y][x] && clean.positions[y][x]) throw new Error(name + ': player and enemy occupy the same cell.');
                }
                const manual = !!((options.manualDefaults || {})[category] || original.manual_battlefield_override === true);
                clean.obstacles = Array.isArray(original.obstacles) ? original.obstacles : [];
                if (manual) {
                    clean.teams = grid(original.teams, name + ' teams', 1, 2, true);
                    clean.tiles = grid(original.tiles, name + ' tiles', 1, 18, true);
                    clean.obstacle_positions = grid(original.obstacle_positions || Array.from({length:3}, () => Array(6).fill(0)), name + ' obstacle positions', 0, clean.obstacles.length, true);
                } else {
                    delete clean.teams;
                    delete clean.tiles;
                    delete clean.obstacle_positions;
                }
                if (forLiberation) {
                    if (original.freedom_mission && original.freedom_mission.enabled === false) {
                        // Explicit non-Freedom battles are supported by the
                        // same server payload; only missing settings default to 3.
                        delete clean.freedom_mission;
                    } else {
                        const turns = Number(original.freedom_mission && (original.freedom_mission.turn_count ?? original.freedom_mission.turns) || 3);
                        if (!Number.isInteger(turns) || turns < 1) throw new Error(name + ': freedom turn_count must be positive.');
                        clean.freedom_mission = { enabled: true, turn_count: turns, player_can_flip: false };
                    }
                    clean.no_battle_rewards = true;
                    delete clean.music;
                    delete clean.rewards;
                    delete clean.persistent_health;
                    delete clean.no_results;
                } else {
                    if (!clean.freedom_mission || clean.freedom_mission.enabled === false) {
                        delete clean.freedom_mission;
                    } else {
                        const fm = clean.freedom_mission;
                        clean.freedom_mission = {enabled: true, turn_count: Number(fm.turn_count ?? fm.turns ?? 3), player_can_flip: !!fm.player_can_flip};
                    }
                    if (clean.no_battle_rewards !== true) delete clean.no_battle_rewards;
                }
                return clean;
            });
        }
        return output;
    }

    function collectModDownloads(aliases, enemyDictionary) {
        const byAlias = new Map((enemyDictionary || []).map(enemy => [enemy.name, enemy]));
        const downloads = new Set();
        const unresolved = [];
        for (const alias of aliases) {
            const record = byAlias.get(alias);
            const names = record && Array.isArray(record.downloads) ? record.downloads : [];
            if (!names.length) { unresolved.push(alias); continue; }
            for (const name of names) if (typeof name === 'string' && /^[A-Za-z0-9_.-]+\.zip$/.test(name)) downloads.add(name);
        }
        return { files: [...downloads].sort(), unresolved };
    }

    function installationNotes(identity, aliases, templates, mods, target) {
        target = target || 'liberations';
        const scoped = target === 'liberations';
        return [
            '# VisualEncounters V2.1 · ' + identity.name + ' · ' + TARGET_LABELS[target],
            '', '## Install', '',
            '1. Back up your server and extract `encounters/` and `assets/` into the server root.',
            '2. The base map must be `areas/' + identity.name + '.tmx` (exact spelling/case). This tool does not generate Tiled map files.',
            '3. Ensure the Tiled encounter references and any runner floor sections match the exported names.',
            '4. Install any missing character mods separately and restart server/client.',
            '', 'Encounter file: `' + identity.encounterFile + '`',
            'Battle ZIP: `' + (scoped ? identity.assetFile : PACKAGE_DIRECTORY + 'ezencounters.zip') + '`',
            scoped ? 'Package ID: `com.keristero.mob.' + identity.packageName + '`' : 'Package ID: `com.keristero.mob.ezencounters`',
            '', '## Encounter rules', '',
            scoped ? '- All Liberation battle results have no_battle_rewards=true. Tiled mission/panel loot is independent.' : '- Ordinary EZEncounters reward definitions are preserved. The Runner may also apply floor rewards.',
            scoped ? '- Freedom missions default to 3 turns; player_can_flip is calculated by Liberation terrain.' : '- Freedom missions are emitted only when explicitly enabled.',
            '- Enemy positions and exactly one player spawn are always exported.',
            '- Manual teams/tiles/obstacle positions are exported only for manual battlefield encounters.',
            '- Referenced character mods and their HP variants must be installed; the editor cannot synthesize new native HP presets.',
            '- Overworld Enemy Templates are independent Lua modules; export them from the separate top-level Workshop.',
            '', '## Encounter aliases', '', ...aliases.map(a => '- `' + a + '`'),
            '', '## Optional character mod copies', '',
            'Included: ' + ((mods && mods.included) || []).join(', '),
            'Could not fetch: ' + ((mods && mods.missing) || []).join(', '),
            'Unmapped downloadable alias (verify an installed mod): ' + ((mods && mods.unresolved) || []).join(', '),
            '', '## Notes', '',
            '- This exports a data-only Lua file. It does not fabricate a Lua results_callback or Tiled objects.',
            '- For Endless Runner, use the base area ID, not a cloned floor instance ID.',
            '- The mission-scoped ZIP uses the DEBUGLIB battle-package baseline, with only package name and alias requirements changed.',
            ''
        ].join('\n');
    }

    root.VisualEncountersV21 = {
        mapIdentity, aliasesForMission, packageAliases, patchBattleEntry,
        collectModDownloads, installationNotes, prepareTable,
        TARGET_LABELS, TARGET_DESCRIPTIONS, TEMPLATE_SOURCE, PACKAGE_DIRECTORY, TEMPLATE_DIRECTORY
    };
})(typeof window !== 'undefined' ? window : globalThis);
