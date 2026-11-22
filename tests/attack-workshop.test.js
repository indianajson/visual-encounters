'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const sandbox={window:{}};sandbox.window.window=sandbox.window;
vm.runInNewContext(fs.readFileSync(path.join(root,'attack-workshop.js'),'utf8'),sandbox,{filename:'attack-workshop.js'});
const a=sandbox.window.VisualEncountersAttackWorkshop;
assert(a,'exposed workshop');
assert.equal(a.suffixes.length,8);
assert.equal(Object.keys(a.facing).length,8);
assert.equal(Object.keys(a.seeds).length,16);
for(const name of ['Legacy_Quaker','Legacy_Cannodumb','Legacy_Bladia','Legacy_Mettaur','Legacy_Piranha','Legacy_Swordy'])assert(a.seeds[name],name);
const attack=a.newAttack();
attack.phases=[
 {shape:[[1]],duration:0.1,animation_prefix:'WAVE',sfx:{on_start:'/server/assets/sfx/start.ogg'}},
 {shape:[[1,1]],duration:0.2,animation_prefix:'WAVE',movement_mode:'smooth',sfx:{on_middle:'/server/assets/sfx/middle.ogg'}},
 {shape:[[1,1,1]],duration:0.3,animation_prefix:'BURST',movement_mode:'instant',wait_for_animation:true,linger_until_contact:true,max_wait_seconds:1, pierce_players:false,contact_effect:'piranha_impact',contact_animation_prefix:'HIT',spawn_bot_template:'Mettaur',spawn_bot_count:2,sfx:{on_end:'/server/assets/sfx/end.ogg',on_contact:'/server/assets/sfx/hit.ogg'}}
];
const validated=a.validate('Wave_Test',attack);
assert.equal(validated.phases.length,3);
assert.deepEqual(Array.from(validated.phases.map(x=>x.shape[0].length)),[1,2,3]);
assert.equal(validated.phases[2].pierce_players,false);
assert.throws(()=>a.validate('bad name',attack),/Attack name/);
assert.throws(()=>a.validate('Valid',{...attack,phases:[{shape:[[1,2]],duration:1}]}),/shape/i);
assert.throws(()=>a.validate('Valid',{...attack,phases:[{shape_type:'line',range:1,contact_texture:'/etc/passwd'}]}),/absolute/);
assert.throws(()=>a.validate('Valid',{...attack,phases:[{spawn_bot_count:6}]}),/Spawn count|spawn_bot_count/);
const text=a.moduleSource('Wave_Test',attack);
const bundle=a.bundleSource({Wave_Test:attack});
for (const snippet of ['WAVE','BURST','Mettaur','on_contact','on_middle','contact_animation_prefix','linger_until_contact']) assert(bundle.includes(snippet),snippet);
const out=path.join(__dirname,'generated-attack-regression.lua');
fs.writeFileSync(out,bundle);
console.log('PASS: split attack workshop, existing 16 template seeds, eight directional suffixes, three phase shapes, SFX, contact FX, summoning, guards, and generated Lua');
