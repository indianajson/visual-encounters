/* Offline regression tests for the V2.1 mission-scoped package generator.
 * Run: node tests/v21-export.test.js
 * Uses vendored JSZip and repaired release base, no network or live client.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('../vendor/jszip.min.js');
require('../v21-export.js');
const v = globalThis.VisualEncountersV21;

(async () => {
    const baseZip = await JSZip.loadAsync(fs.readFileSync(path.join(__dirname, '../mods/ezencounters-v21-base.zip')));
    const base = await baseZip.file('entry.lua').async('string');
    const originalMembers = Object.keys(baseZip.files).sort();
    const identity = v.mapIdentity('LiberationEasyMode');
    assert.equal(identity.encounterFile, 'encounters/LiberationEasyMode.lua');
    assert.equal(identity.assetFile, 'assets/ezlibs-assets/ezencounters/ezencounters-liberation-liberationeasymode.zip');
    assert.equal(identity.clientPath, '/server/assets/ezlibs-assets/ezencounters/ezencounters-liberation-liberationeasymode.zip');
    assert.throws(() => v.mapIdentity('../bad'), /exact Tiled area name/);
    assert.throws(() => v.mapIdentity(''), /exact Tiled area name/);
    const sample = {
        encounters: [{ name: 'Encounter1', enemies: [{ name: 'Spikey' }, { name: 'Cannodumb' }, { name: 'Spikey' }] }],
        special_encounters: [{ name: 'Special1', enemies: [{ name: 'BigBrute' }] }],
        bosses: [{ name: 'ShadeMan', enemies: [{ name: 'ShadeMan' }] }]
    };
    const aliases = v.aliasesForMission(sample);
    assert.deepEqual(aliases, ['BigBrute', 'Cannodumb', 'ShadeMan', 'Spikey']);
    assert.throws(() => v.aliasesForMission({ encounters: [], special_encounters: [], bosses: [] }), /at least one/);
    assert.throws(() => v.patchBattleEntry(base, identity, ['UnregisteredThing']), /Unknown EZEncounters/);
    const patched = v.patchBattleEntry(base, identity, aliases);
    assert.match(patched, /function get_package_id\(alias\)/);
    assert.match(patched, /return encounter_info\.enemy_packages\[alias\]/);
    assert.match(patched, /function package_build\(mob,data\)/);
    assert.match(patched, /local package_name = "ezencounters_liberation_liberationeasymode"/);
    const table = patched.match(/local liberation_aliases = \{([\s\S]*?)\n\}/)[1];
    assert.match(table, /Spikey = true/);
    assert.doesNotMatch(table, /Roll = true/);
    assert.match(patched, /for alias, variants in pairs\(enemy_max_health_variants\)/);
    assert.match(patched, /if liberation_aliases\[alias\] then/);
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(__dirname, '../mods/ezencounters-v21-base.zip')));
    zip.file('entry.lua', patched);
    const regenerated = await JSZip.loadAsync(await zip.generateAsync({ type: 'nodebuffer' }));
    assert.deepEqual(Object.keys(regenerated.files).sort(), originalMembers, 'package structure must be preserved');
    for (const name of originalMembers) {
        if (name !== 'entry.lua' && !regenerated.files[name].dir) {
            const [a, b] = await Promise.all([baseZip.file(name).async('nodebuffer'), regenerated.file(name).async('nodebuffer')]);
            assert.ok(a.equals(b), 'modified unrelated package file: ' + name);
        }
    }
    const other = v.patchBattleEntry(base, v.mapIdentity('NewLiberation1'), ['Mettaur']);
    assert.notEqual(patched.match(/local package_name = "([^"]+)"/)[1], other.match(/local package_name = "([^"]+)"/)[1]);
    assert.match(other, /Mettaur = true/);
    assert.doesNotMatch(other.match(/local liberation_aliases = \{([\s\S]*?)\n\}/)[1], /Spikey = true/);
    const plan = v.collectModDownloads(['BigBrute', 'Spikey', 'AliasWithoutMod'], [
        { name: 'BigBrute', downloads: ['com_keristero_mob_BigBrute.zip'] },
        { name: 'Spikey', downloads: ['com_Dawn_Spikey.zip'] }
    ]);
    assert.deepEqual(plan.unresolved, ['AliasWithoutMod']);
    assert.equal(plan.files.length, 2);
    const notes = v.installationNotes(identity, aliases, ['Mettaur'], { included: ['example.zip'], missing: [], unresolved: [] });
    assert.ok(notes.includes('template_mettaur.lua'));
    assert.ok(notes.includes('get_package_id(alias)'));
    console.log('PASS: V2.1 mission naming, aliases, no missing lookup, scoped requirements, preserved package members, template and mod manifests');
})().catch(err => { console.error(err); process.exitCode = 1; });
