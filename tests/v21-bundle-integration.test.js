/* End-to-end offline test of the actual V2.1 nested ZIP exporter.
 * Run: node tests/v21-bundle-integration.test.js
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const JSZip = require('../vendor/jszip.min.js');
require('../v21-export.js');
const api = globalThis.VisualEncountersV21;
const root = path.resolve(__dirname, '..');
const readResource = async name => fs.readFileSync(path.join(root, decodeURIComponent(name)));
const dict = [
    {name:'Mettaur',downloads:['EXE6-001-Metall.zip']},
    {name:'BigBrute',downloads:['com_keristero_mob_BigBrute.zip']},
    {name:'ShadeMan',downloads:['com_Dawn_Shademan.zip']},
    {name:'Powie2',downloads:['com_discord_Konstinople_7692_powie.zip']},
];
const data = {area_id:'DEBUGLIB',encounters:[{name:'Encounter1',enemies:[{name:'Mettaur',rank:1}],positions:[[0,0,0,1,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]]}],special_encounters:[{name:'Special1',enemies:[{name:'BigBrute',rank:1},{name:'Powie2',rank:4}],positions:[[0,0,0,1,2,0],[0,0,0,0,0,0],[0,0,0,0,0,0]]}],bosses:[{name:'Boss1',enemies:[{name:'ShadeMan',rank:1}],positions:[[0,0,0,1,0,0],[0,0,0,0,0,0],[0,0,0,0,0,0]]}]};
const identity=api.mapIdentity(data.area_id);
const lua=target=>{
 const prepared=api.prepareTable(data,{target,identity});
 return '-- ' + target + '\nreturn { encounters = { { name = "Encounter1", path = "' + prepared.encounters[0].path + '" } } }\n';
};
async function create(target, opts={}) {
 return api.buildDropinBundle({JSZip,target,identity,data,lua:lua(target),enemyDictionary:dict,readResource,...opts});
}
(async()=>{
 for(const target of ['liberations','ezencounters','endless_runner']){
  const result=await create(target);
  const bytes=await result.archive.generateAsync({type:'nodebuffer'});
  const outer=await JSZip.loadAsync(bytes,{checkCRC32:true});
  const manifest=JSON.parse(await outer.file('EXPORT_MANIFEST_V21.json').async('string'));
  assert.equal(manifest.target,target);
  assert(outer.file('encounters/DEBUGLIB.lua'));
  assert(outer.file(manifest.battlePackage));
  const gameZip=await JSZip.loadAsync(await outer.file(manifest.battlePackage).async('nodebuffer'),{checkCRC32:true});
  const entry=await gameZip.file('entry.lua').async('string');
  assert.match(entry,/Powie2="com\.discord\.Konstinople#7692\.enemy\.powie2"/);
  assert.match(entry,/function package_requires_scripts\(\)/);
  if(target==='liberations'){
   assert.match(entry,/local package_name = "ezencounters_liberation_debuglib"/);
   assert.match(entry,/Powie2 = true,/);
   assert(!/AirMan = true,/.test(entry.slice(entry.indexOf('local liberation_aliases'),entry.indexOf('function package_requires_scripts'))));
   assert.equal(manifest.battlePackage,'assets/ezlibs-assets/ezencounters/ezencounters-liberation-debuglib.zip');
  }else{
   assert.match(entry,/local package_name = "ezencounters"/);
   assert.equal(manifest.battlePackage,'assets/ezlibs-assets/ezencounters/ezencounters.zip');
  }
  assert.equal(result.modReport.included.length,4);
  for(const file of result.modReport.included){
   const nested=outer.file('assets/ezlibs-assets/ezencounters/'+file);
   assert(nested,'missing mod in bundle: '+file);
   const mod=await JSZip.loadAsync(await nested.async('nodebuffer'),{checkCRC32:true});
   assert(mod.file('entry.lua'),'mod lacks entry.lua: '+file);
  }
  assert((await outer.file('INSTALL_V21_MISSION.md').async('string')).includes('Bot Config'));
  console.log('PASS: '+target+' complete ZIP, manifest, package, dependency mods');
 }
 const minimal=await create('liberations',{includeMods:false});
 assert.equal(minimal.modReport.included.length,0);
 assert.equal(minimal.modReport.requiredHostedFiles.length,4);
 const brokenReader=async name=>{if(name.endsWith('EXE6-001-Metall.zip'))throw new Error('offline');return readResource(name);};
 await assert.rejects(()=>create('liberations',{readResource:brokenReader}),/Character mod bundle incomplete.*EXE6-001-Metall.zip/);
 const invalidReader=async name=>name.endsWith('com_Dawn_Shademan.zip')?Buffer.from('not-a-ZIP'):readResource(name);
 await assert.rejects(()=>create('liberations',{readResource:invalidReader}),/Invalid:.*com_Dawn_Shademan.zip/);
 const extra={name:'my_custom_character.zip',async arrayBuffer(){return readResource('mods/com_keristero_mob_BigBrute.zip')}};
 const custom=await create('liberations',{includeMods:false,extraModFiles:[extra]});
 assert.deepEqual(custom.modReport.included,['my_custom_character.zip']);
 const override={name:'EXE6-001-Metall.zip',async arrayBuffer(){return readResource('mods/EXE6-001-Metall.zip')}};
 const replaced=await create('liberations',{extraModFiles:[override]});
 assert.equal(replaced.modReport.included.length,4);
 console.log('PASS: fail-closed missing/corrupt mods, optional omission, extra/override nested ZIP handling');
})().catch(error=>{console.error(error);process.exitCode=1});
