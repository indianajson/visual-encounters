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

    // Alias -> client character ID used by the real battle package. Keep this
    // in the deployment manifest so missing external characters can be traced
    // to concrete Engine.require_character() dependencies.
    function packageCharacterIds(source) {
        const found = /\benemy_packages\s*=\s*\{([\s\S]*?)\n\s*\},\s*\n\s*obstacles\s*=/.exec(source);
        if (!found) throw new Error('Cannot inspect battle package enemy_packages mappings.');
        const result = {};
        for (const line of found[1].split(/\r?\n/)) {
            const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*['"]([^'"]+)['"]/.exec(line);
            if (match) result[match[1]] = match[2];
        }
        return result;
    }

    // Build the complete drop-in archive in one testable path. The actual battle
    // package and character mods remain separate nested ZIP files under the
    // server's existing asset directory; they are NOT unpacked into each other.
    async function buildDropinBundle(options) {
        options = options || {};
        const ZIP = options.JSZip;
        if (!ZIP || typeof ZIP.loadAsync !== 'function') throw new Error('JSZip is required to build an encounter bundle.');
        if (typeof options.readResource !== 'function') throw new Error('A resource reader is required.');
        const target = options.target || 'liberations';
        if (!Object.prototype.hasOwnProperty.call(TARGET_LABELS, target)) throw new Error('Unknown export target: ' + target);
        const identity = options.identity || mapIdentity(options.data && options.data.area_id);
        const aliases = aliasesForMission(options.data || {});
        const includeMods = options.includeMods !== false;
        const battleSource = target === 'liberations' ? TEMPLATE_SOURCE : 'mods/ezencounters.zip';
        const archive = new ZIP();
        const inputLua = options.lua;
        if (typeof inputLua !== 'string' || !inputLua.trim()) throw new Error('Encounter Lua text is missing.');
        archive.file(identity.encounterFile, inputLua);

        async function readZip(resource, bytes) {
            try {
                const zip = await ZIP.loadAsync(bytes, { checkCRC32: true });
                const entry = zip.file('entry.lua');
                if (!entry) throw new Error('missing root entry.lua');
                const text = await entry.async('string');
                if (!text || !text.trim()) throw new Error('empty entry.lua');
                return { zip, text };
            } catch (error) {
                throw new Error('Invalid ZIP ' + resource + ': ' + error.message);
            }
        }
        const baseBytes = await options.readResource(battleSource);
        const battle = await readZip(battleSource, baseBytes);
        const originalAliases = packageAliases(battle.text);
        const characterIds = packageCharacterIds(battle.text);
        const unknown = aliases.filter(alias => !originalAliases.has(alias));
        if (unknown.length) throw new Error('Battle ZIP lacks enemy aliases: ' + unknown.join(', '));
        const battleAssetName = target === 'liberations' ? identity.assetFile : PACKAGE_DIRECTORY + 'ezencounters.zip';
        if (target === 'liberations') {
            battle.zip.file('entry.lua', patchBattleEntry(battle.text, identity, aliases));
        }
        const battleBytes = await battle.zip.generateAsync({ type: 'uint8array' });
        await readZip(battleAssetName, battleBytes);
        archive.file(battleAssetName, battleBytes);

        const modPlan = collectModDownloads(aliases, options.enemyDictionary || []);
        const uploads = new Map();
        for (const file of options.extraModFiles || []) {
            const name = String(file && file.name || '');
            if (!/^[A-Za-z0-9_.-]+\.zip$/.test(name)) throw new Error('Invalid additional mod ZIP filename: ' + name);
            if (name === 'ezencounters.zip' || name === 'ezencounters-v21-base.zip') {
                throw new Error('Cannot replace the battle package using additional character mods: ' + name);
            }
            if (uploads.has(name)) throw new Error('Duplicate uploaded mod ZIP filename: ' + name);
            if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Cannot read additional mod ' + name);
            uploads.set(name, file);
        }
        const requestedMods = new Set(includeMods ? modPlan.files : []);
        for (const name of uploads.keys()) requestedMods.add(name);
        const included = [], missing = [], invalid = [];
        for (const name of [...requestedMods].sort()) {
            let bytes;
            try {
                bytes = uploads.has(name)
                    ? await uploads.get(name).arrayBuffer()
                    : await options.readResource('mods/' + encodeURIComponent(name));
            } catch (error) {
                missing.push(name);
                continue;
            }
            try {
                await readZip(name, bytes);
            } catch (error) {
                invalid.push(name + ': ' + error.message);
                continue;
            }
            archive.file(PACKAGE_DIRECTORY + name, bytes);
            included.push(name);
        }
        // Missing and damaged requested dependencies are NOT a successful build.
        if (missing.length || invalid.length) {
            throw new Error('Character mod bundle incomplete. Missing: ' + (missing.join(', ') || 'none')
                + '. Invalid: ' + (invalid.join('; ') || 'none')
                + '. Restore the hosted ZIPs or supply valid additional mod files.');
        }
        const locallyDefinedIds = new Set();
        const localMatcher = /Engine\.define_character\(\s*['"]([^'"]+)['"]/g;
        for (const match of battle.text.matchAll(localMatcher)) locallyDefinedIds.add(match[1]);
        const unresolved = modPlan.unresolved.filter(alias => !locallyDefinedIds.has(characterIds[alias]));
        const locallyDefinedAliases = modPlan.unresolved.filter(alias => locallyDefinedIds.has(characterIds[alias]));
        const modReport = {
            included, missing, invalid, unresolved, locallyDefinedAliases,
            requiredHostedFiles: modPlan.files,
            modCopiesEnabled: includeMods,
            additionalFiles: [...uploads.keys()].sort()
        };
        const manifest = {
            format: 'VisualEncounters V2.1', target,
            area: identity.name, encounterFile: identity.encounterFile,
            battlePackage: battleAssetName,
            packageId: target === 'liberations' ? 'com.keristero.mob.' + identity.packageName : 'com.keristero.mob.ezencounters',
            enemyAliases: aliases,
            expectedCharacterIds: Object.fromEntries(aliases.map(alias => [alias, characterIds[alias]])),
            characterMods: modReport,
            reference: 'DEBUGLIB contains Tiled mission objects that are NOT created by this encounter export.'
        };
        archive.file('EXPORT_MANIFEST_V21.json', JSON.stringify(manifest, null, 2) + '\n');
        archive.file('INSTALL_V21_MISSION.md', installationNotes(identity, aliases, [], modReport, target));
        return { archive, manifest, battleAssetName, modReport };
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
            '4. Nested character .zip files are installed into assets/ezlibs-assets/ezencounters/ without unpacking them; do not extract each inner ZIP.',
            '5. Verify the map has the correct Tiled mission objects and restart the server/client.',
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
            'Included: ' + (((mods && mods.included) || []).join(', ') || 'none'),
            'Required hosted filenames: ' + (((mods && mods.requiredHostedFiles) || []).join(', ') || 'none'),
            'Character ZIP copies enabled: ' + !!(mods && mods.modCopiesEnabled),
            'Could not fetch: ' + ((mods && mods.missing) || []).join(', '),
            'Unmapped downloadable alias (verify an installed mod or locally-defined character): ' + ((mods && mods.unresolved) || []).join(', '),
            '', '## DEBUGLIB-style mission configuration (Tiled, not generated)', '',
            '- The Lua and client ZIP do not create the Liberation Config, Spawn Point, Dark Panel, Dark Hole, Dark Hole Buffed Virus, Boss Dark Panel, Bot Config, Encounter Config, Panel Gate or Indestructible Panel objects.',
            '- For linked OW encounters, use the Tiled `OW Encounter Config` reference, `Encounter Category`, `Encounter Mode`, and `Encounter Name` matching the encounter Lua.',
            '- Bot Config provides overworld/battle scale, max HP, starting HP, AI type and attack modifiers independently of the battle-grid encounter definition.',
            '- DEBUGLIB includes separate named boss and special encounter definitions, object links and tileset references. Reuse its authored map conventions; this tool never overwrites a .tmx map.',
            '', '## Notes', '',
            '- This exports a data-only Lua file. It does not fabricate a Lua results_callback or Tiled objects.',
            '- For Endless Runner, use the base area ID, not a cloned floor instance ID.',
            '- The mission-scoped ZIP uses the DEBUGLIB battle-package baseline, with only package name and alias requirements changed.',
            ''
        ].join('\n');
    }

    root.VisualEncountersV21 = {
        mapIdentity, aliasesForMission, packageAliases, packageCharacterIds, patchBattleEntry,
        collectModDownloads, installationNotes, prepareTable, buildDropinBundle,
        TARGET_LABELS, TARGET_DESCRIPTIONS, TEMPLATE_SOURCE, PACKAGE_DIRECTORY, TEMPLATE_DIRECTORY
    };
})(typeof window !== 'undefined' ? window : globalThis);
