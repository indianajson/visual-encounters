/*
 * VisualEncounters V2.1 mission-scoped bundle builder.
 * Transforms the repaired, working EZEncounters client package rather than
 * rebuilding its battle implementation. No external game APIs are invented.
 *
 * Source baseline: mods/ezencounters-v21-base.zip, copied from the repaired
 * ezencounters-liberation-debuglib.zip shipped on 2026-11-11.
 */
(function (root) {
    'use strict';

    const PACKAGE_DIRECTORY = 'assets/ezlibs-assets/ezencounters/';
    const ENCOUNTER_DIRECTORY = 'encounters/';
    const TEMPLATE_DIRECTORY = 'scripts/ezlibs-custom/nebulous-liberations/liberations/enemies/';
    const TEMPLATE_SOURCE = 'mods/ezencounters-v21-base.zip';
    const CATEGORIES = ['encounters', 'special_encounters', 'bosses'];

    function mapIdentity(value) {
        const name = String(value || '').trim();
        if (!name || !/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(name)) {
            throw new Error('Enter the exact Tiled area name (letters, numbers, spaces, _ or -; no path or .tmx).');
        }
        if (name.length > 90) throw new Error('Map name is too long (maximum 90 characters).');
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        return {
            name,
            slug,
            packageName: 'ezencounters_liberation_' + slug.replace(/-/g, '_'),
            zipName: 'ezencounters-liberation-' + slug + '.zip',
            encounterFile: ENCOUNTER_DIRECTORY + name + '.lua',
            assetFile: PACKAGE_DIRECTORY + 'ezencounters-liberation-' + slug + '.zip',
            clientPath: '/server/' + PACKAGE_DIRECTORY + 'ezencounters-liberation-' + slug + '.zip'
        };
    }

    function aliasesForMission(data) {
        const used = new Set();
        for (const category of CATEGORIES) {
            for (const encounter of data[category] || []) {
                for (const enemy of encounter.enemies || []) {
                    const alias = enemy && enemy.name;
                    if (typeof alias !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
                        throw new Error('Invalid enemy alias in ' + category + '/' + String(encounter.name || '?') + ': ' + String(alias));
                    }
                    used.add(alias);
                }
            }
        }
        if (used.size === 0) throw new Error('Add at least one enemy to an encounter before exporting the V2.1 battle package.');
        return [...used].sort((a, b) => a.localeCompare(b, 'en'));
    }

    function packageAliases(entry) {
        const found = /\benemy_packages\s*=\s*\{([\s\S]*?)\n\s*\},\s*\n\s*obstacles\s*=/.exec(entry);
        if (!found) throw new Error('The V2.1 base package does not contain the expected enemy_packages table.');
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
        if (missing.length) {
            throw new Error('Unknown EZEncounters enemy alias(es): ' + missing.join(', ') + '. Register real character packages before export.');
        }
        if (!/\bfunction\s+get_package_id\s*\(\s*alias\s*\)/.test(source)
            || !/\bfunction\s+package_build\s*\(/.test(source)
            || !/\bselect_enemy_character_package\s*\(/.test(source)) {
            throw new Error('The base ZIP is missing essential EZEncounters builder functions. Do not use an unverified package.');
        }
        // The baseline intentionally contains these exact anchors. Refuse a
        // changed baseline rather than guess and silently corrupt entry.lua.
        const packageName = /^local package_name = "[A-Za-z0-9_]+"\s*$/m;
        const requirements = /local liberation_aliases\s*=\s*\{[\s\S]*?\n\}\s*\n\s*function package_requires_scripts\s*\(\s*\)/m;
        if (!packageName.test(source) || !requirements.test(source)) {
            throw new Error('The base package changed its scoped dependency structure; update the template using a verified working ZIP.');
        }
        const aliasTable = requestedAliases.map(alias => '    ' + alias + ' = true,').join('\n');
        let patched = source.replace(packageName, 'local package_name = "' + identity.packageName + '"');
        patched = patched.replace(requirements, 'local liberation_aliases = {\n' + aliasTable + '\n}\n\nfunction package_requires_scripts()');
        if (!patched.includes('return encounter_info.enemy_packages[alias]')) {
            throw new Error('The essential get_package_id() return statement was lost.');
        }
        if (!patched.includes('local mob_package_id = "com."..package_prefix..".mob."..package_name')) {
            throw new Error('The package ID expression has changed; verify this client version first.');
        }
        return patched;
    }

    function collectModDownloads(aliases, enemyDictionary) {
        const byAlias = new Map((enemyDictionary || []).map(enemy => [enemy.name, enemy]));
        const downloads = new Set();
        const unresolved = [];
        for (const alias of aliases) {
            const record = byAlias.get(alias);
            const names = record && Array.isArray(record.downloads) ? record.downloads : [];
            if (!names.length) { unresolved.push(alias); continue; }
            for (const name of names) {
                if (typeof name === 'string' && /^[A-Za-z0-9_.-]+\.zip$/.test(name)) downloads.add(name);
            }
        }
        return { files: [...downloads].sort(), unresolved };
    }

    function installationNotes(identity, aliases, templates, mods) {
        const templateNames = templates || [];
        return [
            '# V2.1 Liberation mission · ' + identity.name,
            '',
            'Generated by VisualEncounters from the repaired mission-scoped EZEncounters base.',
            '',
            '## Deployment',
            '',
            '1. Back up the server. Extract `encounters/` and `assets/` from this ZIP into the server root.',
            '2. Tiled must already contain `areas/' + identity.name + '.tmx` with a valid `Liberation Config` and named `Spawn Point` objects. This editor does not invent or edit Tiled maps.',
            '3. Ensure the map\'s encounter references (regular/special/boss names, Dark Hole Encounter List, OW Bot Encounter, etc.) match these definitions.',
            '4. Deploy the required real character mods under `assets/ezlibs-assets/ezencounters/`. Optional mod copies, when available, are included in this bundle.',
            '5. Restart server and client before testing battle package IDs and spawners.',
            '',
            'Encounter file: `' + identity.encounterFile + '`',
            'Battle package: `' + identity.assetFile + '`',
            'Package ID: `com.keristero.mob.' + identity.packageName + '`',
            '',
            '## Enemy aliases (' + aliases.length + ')',
            '',
            ...aliases.map(alias => '- `' + alias + '`'),
            '',
            '## Overworld templates (' + templateNames.length + ')',
            '',
            ...(!templateNames.length ? ['None exported.'] : templateNames.map(name => '- `template_' + name.toLowerCase() + '.lua` (see `ENEMY_TEMPLATE_REGISTRATION.md`)')),
            '',
            '## Character mod copying',
            '',
            'Included: ' + ((mods && mods.included) || []).join(', '),
            'Missing hosted ZIPs: ' + ((mods && mods.missing) || []).join(', '),
            'Unmapped aliases (verify already installed real mod): ' + ((mods && mods.unresolved) || []).join(', '),
            '',
            '## Important guarantees and limitations',
            '',
            '- `get_package_id(alias)` and the original `package_build()` are preserved. The only battle code changes are the unique package name and scoped dependency set.',
            '- The client package reuses existing EZEncounters character IDs and registered HP variants; it does NOT synthesize new enemy mods or HP presets.',
            '- Nebulous Liberations never grants battle-result rewards. Panel/mission loot remains managed by the mission.',
            '- Enemy Templates are **overworld** definitions; they must be registered in your existing `enemy_templates.lua`. This bundle does not overwrite that registry.',
            '- Adding a new encounter enemy alias later requires regenerating this scoped ZIP.',
            '- This tool does not automatically edit your Tiled objects, terrain, mission links, or scripted overworld AI.',
            ''
        ].join('\n');
    }

    root.VisualEncountersV21 = {
        mapIdentity, aliasesForMission, packageAliases, patchBattleEntry,
        collectModDownloads, installationNotes, TEMPLATE_SOURCE, PACKAGE_DIRECTORY, TEMPLATE_DIRECTORY
    };
})(typeof window !== 'undefined' ? window : globalThis);
