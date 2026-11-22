'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'attack-workshop.js'),'utf8');
const editor=fs.readFileSync(path.join(root,'liberation-editor.js'),'utf8');
const sandbox={window:{}};sandbox.window.window=sandbox.window;
vm.runInNewContext(src,sandbox,{filename:'attack-workshop.js'});
const api=sandbox.window.VisualEncountersAttackWorkshop;
const attack=api.newAttack();
assert.equal(attack.eight_direction_animations,false,'Eight effect directions must be opt-in');
assert.equal(attack.allow_cardinal_directions,undefined,'Animation checkbox must not affect targeting');
assert.equal(attack.attack_animation_prefix,undefined,'Bot body animation must not live in attack');
assert.equal(attack.idle_animation_prefix,undefined,'Bot idle animation must not live in attack');
const mod=api.validate('Wave_01',{...attack,eight_direction_animations:true,
  attack_animation_prefix:'ATTACK',idle_animation_prefix:'IDLE'});
assert.equal(mod.eight_direction_animations,true);
assert.equal(mod.attack_animation_prefix,'ATTACK'); // kept until an enemy adopts it
assert.equal(mod.idle_animation_prefix,'IDLE');
const lua=api.moduleSource('Wave_01',mod);
assert(lua.includes('eight_direction_animations = true'));
assert(lua.includes('idle_animation_prefix')); // legacy-only pending migration
assert(lua.includes('attack_animation_prefix'));
assert(lua.includes('attack_damage'));
assert.match(editor,/\['eight_direction_animations','Bot has all eight/);
assert.match(editor,/migrateLegacyEnemyAttackFields/);
assert.match(editor,/migrateLegacyAttackBotAnimations/);
assert.match(editor,/requiredCustomAttackTemplates/);
assert.match(editor,/migrateLegacyAttackBotAnimations/);
assert.match(editor,/attacks\/enemy_workshop_templates\.lua/);
const fields=editor.slice(editor.indexOf('const TEMPLATE_FIELDS'),editor.indexOf('const TEMPLATE_AI'));
for(const bad of ['attack_damage','attack_texture','attack_animation_path','attack_effect_animation'])
 assert(!fields.includes(`['${bad}'`),`Attack-owned field ${bad} remains in Enemy Workshop`);
for(const good of ['idle_animation_prefix','attack_animation_prefix','hold_animation_prefix','eight_direction_animations'])
 assert(fields.includes(`['${good}'`),`Bot-owned ${good} is missing`);
assert(src.includes('ATTACK_WORKSHOP_PROJECT.json'));
assert(src.includes('JSZip.loadAsync(await selected.arrayBuffer())'));
console.log('PASS: four-direction default, clean ownership, migration and save/load/export wiring');
