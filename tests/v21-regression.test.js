/* Run: node tests/v21-regression.test.js (no dependencies). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sandbox = { window: {}, document: {readyState:'loading', addEventListener() {}}, console, setTimeout() {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'v21-export.js'),'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'liberation-editor.js'),'utf8'), sandbox);
const api = sandbox.window.VisualEncountersV21;
const diag = sandbox.window.VisualEncountersEditorDiagnostics;
const plain = obj => JSON.parse(JSON.stringify(obj));
assert(api && diag, 'API exports are available');
function encounter(name, alias, rank) {
 return {
  name, weight:10, enemies:[{name:alias,rank}], obstacles:[],
  positions:[[0,0,0,1,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]],
  player_positions:[[0,0,0,0,0,0],[0,1,0,0,0,0],[0,0,0,0,0,0]],
  freedom_mission:{enabled:true,turn_count:3,player_can_flip:false},
  rewards:{ money:{base:100} },
  manual_battlefield_override:false
 };
}
const base = {area_id:'DEBUGLIB', minimum_steps_before_encounter:80, encounter_chance_per_step:.05,
 rewards:{money:{base:20}}, enemy_rewards:{Mettaur:{money:{base:10}}},
 encounters:[encounter('Encounter1','Mettaur',1)],
 bosses:[encounter('ShadeMan','ShadeMan',8)],
 special_encounters:[encounter('SpecialTest','Bladia',4)]};
const withoutFreedom = diag.normalizeEncounter({name:'RunnerSimple',enemies:[{name:'Mettaur',rank:1}]});
assert.equal(withoutFreedom.freedom_mission,undefined,'ordinary/Runner Lua import cannot implicitly enable Freedom Mission');
const original = JSON.stringify(base);
const identity = api.mapIdentity('DEBUGLIB');
assert.equal(identity.encounterFile,'encounters/DEBUGLIB.lua');
for (const target of ['liberations','ezencounters','endless_runner']) {
 const result = plain(api.prepareTable(base,{target,identity}));
 assert.equal(result.encounters.length,1);
 assert.equal(result.special_encounters.length,1);
 assert.equal(result.bosses.length,1);
 assert.deepEqual(result.encounters[0].positions[0],[0,0,0,1,0,0]);
 assert.equal(result.encounters[0].enemies[0].rank,1);
 assert.equal(result.bosses[0].enemies[0].rank,8);
 assert.equal(result.encounters[0].player_positions[1][1],1);
 assert.equal(result.encounters[0].tiles,undefined,'auto terrain omits tiles');
 if(target==='liberations'){
  assert(result.encounters[0].path.includes('ezencounters-liberation-debuglib.zip'));
  assert.equal(result.encounters[0].freedom_mission.turn_count,3);
  assert.equal(result.encounters[0].freedom_mission.player_can_flip,false);
  assert.equal(result.encounters[0].no_battle_rewards,true);
  assert.equal(result.encounters[0].rewards,undefined);
  assert.equal(result.rewards,undefined);
 } else {
  assert.equal(result.encounters[0].path,'/server/assets/ezlibs-assets/ezencounters/ezencounters.zip');
  assert.equal(result.encounters[0].no_battle_rewards,undefined);
  assert.equal(result.encounters[0].rewards.money.base,100);
  assert.equal(result.rewards.money.base,20);
  assert.equal(result.enemy_rewards.Mettaur.money.base,10);
 }
}
const overrideInput = plain(base);
overrideInput.encounters[0].enemies[0].rank_override = 0;
assert.equal(plain(api.prepareTable(overrideInput,{target:'liberations',identity})).encounters[0].enemies[0].rank_override,0);
overrideInput.encounters[0].enemies[0].rank_override = 8;
assert.throws(()=>api.prepareTable(overrideInput,{target:'liberations',identity}),/rank_override must be/);
assert.equal(JSON.stringify(base),original,'export does not mutate input');
const manual = plain(base);
manual.encounters[0].manual_battlefield_override = true;
manual.encounters[0].teams=[[2,2,2,1,1,1],[2,2,2,1,1,1],[2,2,2,1,1,1]];
manual.encounters[0].tiles=Array.from({length:3},()=>[1,1,1,1,1,1]);
assert.equal(plain(api.prepareTable(manual,{target:'liberations',identity})).encounters[0].teams[0][3],1);
const duplicate = plain(base);
duplicate.encounters.push(encounter('ShadeMan','Roll',1));
assert.throws(()=>api.prepareTable(duplicate,{target:'liberations',identity}),/Duplicate encounter/);
const collision = plain(base);
collision.encounters[0].player_positions=[[0,0,0,1,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]];
assert.throws(()=>api.prepareTable(collision,{target:'liberations',identity}),/same cell/);
const badRank = plain(base);badRank.encounters[0].enemies[0].rank=0;
assert.throws(()=>api.prepareTable(badRank,{target:'liberations',identity}),/rank must be/);
const templ = diag.templateModule('TestProg',{battle_name:'Mettaur',texture_path:'/server/assets/prog.png',animation_path:'/server/assets/prog.animation',ai_type:'patterned_attack',scale:1.5});
assert(templ.includes('EnemyTemplates.register'));
assert(!templ.includes('battle_scale ='), 'unset battle_scale follows OW/Tiled scale');
assert(templ.includes('ai_type = "patterned_attack"'));
assert.throws(()=>diag.templateModule('Bad',{texture_path:'',animation_path:''}),/required/);
const fakeEntry = fs.readFileSync(path.join(__dirname,'fixture-debuglib-entry.lua'),'utf8');
const aliases = api.packageAliases(fakeEntry);
assert(aliases.has('Mettaur') && aliases.has('ShadeMan') && aliases.has('Bladia'));
const patched=api.patchBattleEntry(fakeEntry,identity,['Mettaur','ShadeMan']);
assert(patched.includes('local package_name = "ezencounters_liberation_debuglib"'));
assert(patched.includes('    Mettaur = true,') && patched.includes('    ShadeMan = true,'));
assert(!/\bBigBrute\s*=\s*true/.test(patched.slice(patched.indexOf('local liberation_aliases'), patched.indexOf('function package_requires_scripts'))));
assert.throws(()=>api.patchBattleEntry(fakeEntry,identity,['NotARealEnemy']),/Unknown EZEncounters enemy alias/);
console.log('PASS: three export policies, V2.1 schema, 1-based rank, no silent mutation, collisions, manual terrain, templates, scoped package aliases');
