/* Independent Attack Template Workshop for Nebulous Liberations.
 * A legacy AI is listed for reference; only 'phased_attack' uses the new
 * generic phase runner. This module does not touch encounter tables.
 */
(function (root) {
'use strict';
const BUILT_INS = {"Legacy_Yurarion":{"source":"enemies/template_missing_viruses.lua","runtime":"patterned_attack","telegraph_seconds":0.42,"attack_damage":17,"effect_hold_seconds":0.2,"telegraph":{"range":3,"shape_type":"line"},"movement":{"tiles":2,"mode":"reposition"},"stages":[{"motion":"travel","state":"THUNDER","duration":0.35,"range":3,"effect":"thunder_ow"}]},"Legacy_Quaker":{"source":"enemies/template_directional_attacks.lua","runtime":"patterned_attack","telegraph_seconds":0.55,"attack_damage":16,"telegraph":{"range":3,"shape_type":"line"},"effect_hold_seconds":0.68,"movement":{"tiles":2,"mode":"approach"},"stages":[{"motion":"travel","state":"SHOCKWAVE","duration":0.14,"range":3,"effect":"quaker_shock"}]},"Legacy_Piranha":{"source":"enemies/template_directional_attacks.lua","runtime":"patterned_attack","telegraph_seconds":0.5,"attack_damage":14,"telegraph":{"range":4,"shape_type":"line"},"effect_hold_seconds":0.18,"movement":{"tiles":1,"mode":"reposition"},"stages":[{"motion":"travel","state":"PIRANHA_ARROW","duration":0.12,"range":4,"effect":"piranha_arrow"},{"state":"PIRANHA_IMPACT","offset_y":3,"duration":0.09,"effect":"piranha_impact","range":1,"shape_type":"line"}]},"Legacy_Yurayura":{"source":"enemies/template_missing_viruses.lua","runtime":"patterned_attack","telegraph_seconds":0.45,"attack_damage":13,"effect_hold_seconds":0.22,"telegraph":{"range":2,"shape_type":"cone"},"movement":{"tiles":2,"mode":"reposition"},"stages":[{"state":"WIND_BURST","duration":0.19,"effect":"wind_burst","range":2,"shape_type":"line"},{"state":"WIND_BURST","duration":0.27,"effect":"wind_burst","range":2,"shape_type":"cone"}]},"Legacy_KillFlower":{"source":"enemies/template_missing_viruses.lua","runtime":"patterned_attack","telegraph_seconds":0.57,"attack_damage":16,"effect_hold_seconds":0.2,"telegraph":{"range":2,"shape_type":"arc"},"movement":{"tiles":1,"mode":"approach"},"stages":[{"state":"WIDESHOT","duration":0.31,"effect":"wideshot-effect","range":2,"shape_type":"arc"}]},"Legacy_ShadeMan":{"runtime":"existing_ai","ai_type":"shademan_ambush","attack_damage":60,"source":"enemies/shademan_ow.lua"},"Legacy_Bladia":{"runtime":"existing_ai","ai_type":"bladia_strike","attack_damage":25,"source":"enemies/bladia_ow.lua"},"Legacy_AirMan":{"source":"enemies/template_directional_attacks.lua","runtime":"patterned_attack","telegraph_seconds":0.6,"attack_damage":15,"telegraph":{"range":3,"shape_type":"cone"},"effect_hold_seconds":0.38,"movement":{"tiles":1,"mode":"reposition"},"stages":[{"state":"WIND_BURST","duration":0.12,"effect":"wind_burst","range":1,"shape_type":"line"},{"state":"WIND_BURST","duration":0.12,"effect":"wind_burst","range":2,"shape_type":"cone"},{"state":"WIND_BURST","duration":0.16,"effect":"wind_burst","range":3,"shape_type":"cone"}]},"Legacy_Swordy":{"source":"enemies/template_directional_attacks.lua","runtime":"patterned_attack","telegraph_seconds":0.45,"attack_damage":22,"telegraph":{"shape_type":"arc"},"effect_hold_seconds":0.22,"movement":{"tiles":2,"mode":"approach"},"stages":[{"duration":0.23,"state":"SWORD_ARC","effect":"sword_arc","shape_type":"arc"}]},"Legacy_Roll":{"runtime":"existing_ai","ai_type":"roll_heart_whip","attack_damage":18,"source":"enemies/roll_ow.lua"},"Legacy_Cannodumb":{"source":"enemies/template_directional_attacks.lua","runtime":"patterned_attack","telegraph_seconds":0.8,"attack_damage":24,"telegraph":{"range":4,"shape_type":"line"},"effect_hold_seconds":0.55,"movement":{"tiles":0,"mode":"stationary"},"stages":[{"motion":"travel","state":"CANNON_BURST","duration":0.12,"range":4,"effect":"cannon_burst"}]},"Legacy_Prog":{"ai_type":"ranged","attack_damage":10,"source":"enemies/template_prog.lua","runtime":"existing_ai"},"Legacy_KillWeed":{"source":"enemies/template_missing_viruses.lua","runtime":"patterned_attack","telegraph_seconds":0.55,"attack_damage":14,"effect_hold_seconds":0.26,"telegraph":{"range":2,"shape_type":"line"},"movement":{"tiles":0,"mode":"stationary"},"stages":[{"state":"WOOD_TOWER","duration":0.45,"effect":"killweed_tower","range":2,"shape_type":"line"}]},"Legacy_BlizzardMan":{"ai_type":"simple_charge","attack_damage":40,"source":"enemies/template_blizzardman.lua","runtime":"existing_ai"},"Legacy_BigBrute":{"ai_type":"simple_charge","attack_damage":20,"source":"enemies/template_bigbrute.lua","runtime":"existing_ai"},"Legacy_Mettaur":{"runtime":"existing_ai","ai_type":"shockwave_line","attack_damage":20,"source":"enemies/mettaur.lua"}};
const ROOT = 'scripts/ezlibs-custom/nebulous-liberations/liberations/';
const FACES = ['UL','U','UR','R','DR','D','DL','L'];
const FACING = {UL:'Up Left', U:'Up', UR:'Up Right', R:'Right', DR:'Down Right', D:'Down', DL:'Down Left', L:'Left'};
const VALID_MOVEMENT = ['animation','smooth','instant','spawn'];
const VALID_SHAPES = ['line','ray','arc','cone','cross','diamond','custom'];
const VALID_AI = ['phased_attack','patterned_attack','existing_ai'];
const PAT = /^[A-Za-z][A-Za-z0-9_]*$/;
const copy = o => JSON.parse(JSON.stringify(o));
function safePath(v, label) {
  if (!v) return;
  if (typeof v !== 'string' || !/^\/server\/assets\/[\w\s.\-/]+$/.test(v) || v.includes('..'))
    throw new Error(label+' must be an absolute /server/assets/ path without traversal.');
}
function validateMask(mask) {
  if (!Array.isArray(mask) || !mask.length || mask.length>9 || !mask.every(row => Array.isArray(row) && row.length>0 && row.length<=9 && row.length===mask[0].length && row.every(c=>c===0||c===1)) || !mask.some(row=>row.includes(1)))
    throw new Error('Custom shape must be a nonempty 1–9 by 1–9 grid of 0/1 values.');
  return mask;
}
function parseMask(text) {
  const mask=String(text||'1').split('/').map(line=>line.trim().split(',').map(v=>Number(v.trim())));
  return validateMask(mask);
}
function validate(name, value) {
  if (!PAT.test(name)) throw new Error('Attack name: letters, digits and underscores; start with a letter.');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Attack definition must be an object.');
  const d = copy(value);
  d.runtime=d.runtime||'phased_attack';
  // This switch controls PREFIX_DIRECTION effect states ONLY, not aiming/movement.
  d.eight_direction_animations = d.eight_direction_animations === true;
  // Old projects may still carry bot animation fields. Keep them until the
  // editor can migrate them to a linked Enemy Template without data loss.
  // New attacks never create these keys and the attack runtime ignores them.
  if (!VALID_AI.includes(d.runtime)) throw new Error('Unknown attack runtime '+d.runtime);
  const positive=(v,label,min,max)=>{
    if(v==null||v==='')return undefined;
    const n=Number(v); if (!Number.isFinite(n)||n<min||n>max)throw new Error(label+' must be '+min+'–'+max+'.');
    return n;
  };
  for (const key of ['attack_damage','telegraph_seconds','windup_seconds','effect_hold_seconds','contact_effect_seconds'])
    if(d[key]!=null)d[key]=positive(d[key],key,0, key.includes('seconds')?10:9999);
  for(const key of ['attack_texture','attack_animation_path','effect_texture','effect_animation_path','contact_texture','contact_animation_path'])safePath(d[key],key);
  if(d.runtime==='existing_ai') {
    if(typeof d.ai_type!=='string'||!PAT.test(d.ai_type))throw new Error('Existing AI must name a registered Lua AI.');
    return d;
  }
  if(d.movement!=null) {
    if(!['stationary','approach','reposition'].includes(d.movement.mode))throw new Error('Unknown movement policy.');
    d.movement.tiles=positive(d.movement.tiles??0,'Movement tiles',0,3);
    if(d.movement.transition && !['smooth','instant'].includes(d.movement.transition))throw new Error('Invalid movement transition.');
  }
  if(d.runtime==='phased_attack' && (!Array.isArray(d.phases)||!d.phases.length)) throw new Error('Add at least one attack phase.');
  const phases = d.runtime==='phased_attack' ? d.phases : d.stages||[];
  if(phases.length>24)throw new Error('Maximum 24 phases per attack.');
  for(const [idx,p] of phases.entries()) {
    if(!p || typeof p!=='object')throw new Error('Invalid phase '+(idx+1));
    if(p.pierce_players==='inherit')delete p.pierce_players;
    else if(p.pierce_players==='true')p.pierce_players=true;
    else if(p.pierce_players==='false')p.pierce_players=false;
    if(p.pierce_players!=null && typeof p.pierce_players!=='boolean')throw new Error('Piercing must be true, false, or inherit.');
    if(p.shape)validateMask(p.shape);
    if(p.shape_type && !VALID_SHAPES.includes(p.shape_type))throw new Error('Unknown shape type for phase '+(idx+1));
    if(p.shape_type==='custom' && !p.shape)throw new Error('Paint a custom shape for phase '+(idx+1));
    if(p.range!=null)p.range=positive(p.range,'Phase range',1,8);
    for(const key of ['duration','max_wait_seconds','spawn_offset_x','spawn_offset_y','spawn_bot_count','offset_x','offset_y','damage']){
      if(p[key]!=null) p[key]=positive(p[key],key,key.includes('offset')?-9:0,key.includes('offset')?9:(key==='damage'?9999:(key==='spawn_bot_count'?3:8)));
    }
    if(p.movement_mode && !VALID_MOVEMENT.includes(p.movement_mode))throw new Error('Unknown phase movement mode.');
    if(p.spawn_bot_template && !PAT.test(p.spawn_bot_template))throw new Error('Spawned bot must use a registered enemy-template name.');
    for(const key of ['effect_texture','effect_animation_path','contact_texture','contact_animation_path'])safePath(p[key],key);
    if(p.effect && !/^([A-Za-z0-9_ .-]+|\/server\/assets\/[\w\s.\-/]+)$/.test(p.effect))throw new Error('Invalid effect basename.');
    for(const [event,path] of Object.entries(p.sfx||{})){
      if(!['on_start','on_middle','on_end','on_contact'].includes(event))throw new Error('Unknown SFX event.');
      safePath(path,'SFX '+event);
    }
  }
  return d;
}
function luaString(s) { return '"'+String(s).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r')+'"'; }
function luaValue(val, depth=0) {
  if(val===null||val===undefined)return 'nil';
  if(typeof val==='string')return luaString(val);
  if(typeof val==='boolean')return String(val);
  if(typeof val==='number') {if(!Number.isFinite(val))throw new Error('Invalid numeric field.');return String(val);}
  const tab='    '.repeat(depth);
  if(Array.isArray(val))return '{'+val.map(v=>luaValue(v,depth+1)).join(', ')+'}';
  if(typeof val==='object')return '{\n'+Object.keys(val).sort().map(k=>'    '+tab+(PAT.test(k)?k:'['+luaString(k)+']')+' = '+luaValue(val[k],depth+1)+',').join('\n')+'\n'+tab+'}';
  throw new Error('Unsupported Lua field.');
}
function moduleSource(name,def){ const d=validate(name,def);return '-- Generated by Visual Encounters Attack Template Workshop\nreturn function(AttackTemplates)\n    AttackTemplates.register('+luaString(name)+', '+luaValue(d,1)+')\nend\n'; }
function bundleSource(defs){
  let names=Object.keys(defs).sort();if(!names.length)throw new Error('Save at least one custom attack first.');
  const chunks=names.map(n=>'    AttackTemplates.register('+luaString(n)+', '+luaValue(validate(n,defs[n]),1)+')');
  return '-- Drop-in custom Attack Workshop registry. Loaded by ai/attack_templates.lua.\nreturn function(AttackTemplates)\n'+chunks.join('\n')+'\nend\n';
}
function newAttack(){return {runtime:'phased_attack',attack_damage:20,targeting:'players',pierce_players:true,eight_direction_animations:false,movement:{mode:'stationary',tiles:0,transition:'smooth'},phases:[{shape_type:'line',range:1,duration:0.25,movement_mode:'animation',animation_prefix:'IMPACT',directional:true,contact_directional:true,pierce_players:true,sfx:{}}]};}
const getNames=custom=>Array.from(new Set([...Object.keys(BUILT_INS),...Object.keys(custom||{})])).sort();

function mount(node, options={}) {
  const doc=node.ownerDocument||document;
  const custom=options.templates||{};
  const persist=options.onChange||(()=>{});
  const download=options.download||(()=>{});
  const loadZip=options.loadZip||(()=>Promise.reject(new Error('ZIP loader unavailable')));
  node.replaceChildren();
  const e=(tag,text,attrs={})=>{
    const n=doc.createElement(tag);
    if(text!==undefined)n.textContent=text;
    Object.entries(attrs).forEach(([key,val])=>{if(key==='class')n.className=val;else n.setAttribute(key,String(val))});
    return n;
  };
  const buildInput=(label, key, value, kind, onChange, optionsList)=>{
    const box=e('label',label,{class:'ve-aw-field'});
    const input=optionsList?e('select'):e(kind==='bool'?'input':'input');
    if(optionsList)optionsList.forEach(opt=>{const o=e('option',opt.label||opt.value,{value:String(opt.value)});input.appendChild(o)});
    else input.type=kind==='bool'?'checkbox':kind==='number'?'number':'text';
    if(kind==='number')input.step='any';
    if(kind==='bool')input.checked=!!value;
    else input.value=value==null?'':String(value);
    input.addEventListener('change',()=>onChange(kind==='bool'?input.checked:input.value));
    box.appendChild(input);return box;
  };
  const button=(text,fn)=>{const b=e('button',text,{type:'button'});b.addEventListener('click',()=>{try{const result=fn(); if(result&&typeof result.catch==='function')result.catch(err=>show(err.message,false));}catch(err){show(err.message,false)}});return b};
  const heading=e('div',undefined,{class:'ve-aw-head'});
  heading.appendChild(e('h2','Attack Template Workshop'));
  heading.appendChild(e('p','Reusable, multi-phase OW attacks. Built-in profiles can be copied/edited; existing species-specific AI stays available.'));
  node.appendChild(heading);
  const bar=e('div',undefined,{class:'ve-aw-toolbar'});node.appendChild(bar);
  const chooser=e('select');const name=e('input',undefined,{type:'text',placeholder:'Attack template name'});
  const status=e('p','',{class:'ve-aw-status'});node.appendChild(status);
  const canvas=e('div',undefined,{class:'ve-aw-editor'});node.appendChild(canvas);
  let current=newAttack();let currentKey='';
  const show=(message,success)=>{status.textContent=message;status.dataset.ok=String(!!success)};
  function refreshChooser(){chooser.replaceChildren(e('option','New attack…',{value:''}));getNames(custom).forEach(k=>chooser.appendChild(e('option',k+(BUILT_INS[k]&&!custom[k]?' · built-in':''),{value:k})));chooser.value=currentKey;}
  function renderPhaseShape(phase, parent){
    const layer=e('div',undefined,{class:'ve-aw-shape'});parent.appendChild(layer);
    let mask=phase.shape;
    if(!mask){
      const rows=Math.min(8,Math.max(1,Number(phase.range)||1));
      if(phase.shape_type==='arc')mask=[[1,1,1]];
      else if(phase.shape_type==='cross'||phase.shape_type==='diamond')mask=[[0,1,0],[1,1,1],[0,1,0]];
      else if(phase.shape_type==='cone')mask=Array.from({length:rows},(_,i)=>Array(i*2+1).fill(1));
      else mask=Array.from({length:rows},()=>[1]);
    }
    for(const row of mask){
      const line=e('div',undefined,{class:'ve-aw-shape-row'});layer.appendChild(line);
      row.forEach(cell=>line.appendChild(e('span',cell?'■':'·',{class:cell?'ve-aw-shape-on':'ve-aw-shape-off'})));
    }
  }
  function render(){
    canvas.replaceChildren();
    const info=e('section',undefined,{class:'ve-aw-card'});canvas.appendChild(info);
    info.appendChild(e('h3','1 · Attack behavior and targeting'));
    const fields=e('div',undefined,{class:'ve-aw-fields'});info.appendChild(fields);
    const prop=(label,key,kind,opts)=>fields.appendChild(buildInput(label,key,current[key],kind,v=>{current[key]=kind==='number'?(v===''?undefined:Number(v)):v;},opts));
    fields.appendChild(buildInput('Runtime','runtime',current.runtime,'text',v=>{current.runtime=v; if(v==='phased_attack'&&(!current.phases||!current.phases.length))current.phases=[copy(newAttack().phases[0])];render();},VALID_AI.map(v=>({value:v,label:v}))));
    prop('Base OW damage','attack_damage','number');
    prop('Targeting','targeting','text',['players','forward'].map(v=>({value:v,label:v})));
    prop('Pierce players','pierce_players','bool');
    prop('Allow repeat hits','allow_repeat_hits','bool');
    const movementCard=e('section',undefined,{class:'ve-aw-card'});canvas.appendChild(movementCard);
    const movement=current.movement||(current.movement={mode:'stationary',tiles:0,transition:'smooth'});
    const mv=e('div',undefined,{class:'ve-aw-fields'});movementCard.appendChild(e('h3','2 · Approach before attack'));movementCard.appendChild(mv);
    for(const [label,key,type,opts] of [
      ['Policy','mode','text',['stationary','approach','reposition']],
      ['Maximum tiles','tiles','number'],['Travel','transition','text',['smooth','instant']]]){
      mv.appendChild(buildInput(label,key,movement[key],type,v=>{movement[key]=type==='number'?Number(v):v},opts&&opts.map(x=>({value:x,label:x}))));
    }
    const effects=e('section',undefined,{class:'ve-aw-card'});canvas.appendChild(effects);
    effects.appendChild(e('h3','3 · Attack effect assets and animations'));
    effects.appendChild(e('p','Four diagonal suffixes (UL, UR, DL, DR) are the default. Enable eight-direction effect animations only when those states actually exist. This does not change attack targeting or the enemy sprite animations.'));
    const fx=e('div',undefined,{class:'ve-aw-fields'});effects.appendChild(fx);
    const fxProp=(label,key,kind)=>fx.appendChild(buildInput(label,key,current[key],kind,v=>{current[key]=v;}));
    fxProp('Eight-direction effect animations (PREFIX_DIRECTION)','eight_direction_animations','bool');
    fxProp('Default effect texture (/server/assets/…)','effect_texture','text');
    fxProp('Default effect animation path','effect_animation_path','text');
    fxProp('Default effect animation PREFIX','animation_prefix','text');
    fxProp('Contact effect texture','contact_texture','text');
    fxProp('Contact effect animation path','contact_animation_path','text');
    fxProp('Contact effect animation PREFIX','contact_animation_prefix','text');
    if(current.runtime==='existing_ai'){
      effects.appendChild(e('p','Legacy AI asset overrides (only needed for existing non-phased AI):'));
      const legacyFx=e('div',undefined,{class:'ve-aw-fields'});effects.appendChild(legacyFx);
      for(const [label,key] of [['Legacy attack texture','attack_texture'],['Legacy attack animation','attack_animation_path'],['Legacy attack effect state','attack_effect_animation']])
        legacyFx.appendChild(buildInput(label,key,current[key],'text',v=>{current[key]=v;}));
      info.appendChild(e('p','This is an existing specialized Lua AI ('+(current.ai_type||'')+'). It is listed for reference; switch to phased_attack and add phases to build a new generic version.'));
      return;
    }
    const sequence=e('section',undefined,{class:'ve-aw-card'});canvas.appendChild(sequence);
    const row=e('div',undefined,{class:'ve-aw-phase-title'});row.appendChild(e('h3','4 · Phases · in execution order'));
    row.appendChild(button('Add phase',()=>{if(!current.phases)current.phases=[];current.phases.push(copy(newAttack().phases[0]));render()}));sequence.appendChild(row);
    if(current.runtime==='patterned_attack' && !current.phases){
      sequence.appendChild(e('p','Legacy stages are preserved in the old runner. Change runtime to phased_attack and add phases for advanced features.'));
      return;
    }
    (current.phases||[]).forEach((phase,index)=>{
      const card=e('section',undefined,{class:'ve-aw-phase'});sequence.appendChild(card);
      const nav=e('div',undefined,{class:'ve-aw-phase-title'});nav.appendChild(e('strong','Phase '+(index+1)));
      [['↑',()=>{if(index){[current.phases[index-1],current.phases[index]]=[current.phases[index],current.phases[index-1]];render()}}],
      ['↓',()=>{if(index<current.phases.length-1){[current.phases[index],current.phases[index+1]]=[current.phases[index+1],current.phases[index]];render()}}],
      ['Duplicate',()=>{current.phases.splice(index+1,0,copy(phase));render()}],
      ['Remove',()=>{current.phases.splice(index,1);render()}]].forEach(([t,fn])=>nav.appendChild(button(t,fn)));card.appendChild(nav);
      const grid=e('div',undefined,{class:'ve-aw-fields'});card.appendChild(grid);
      function field(label,key,kind,opts){const val=kind==='bool'&&['directional','contact_directional'].includes(key)&&phase[key]===undefined?true:phase[key];grid.appendChild(buildInput(label,key,val,kind,v=>{phase[key]=kind==='number'?(v===''?undefined:Number(v)):v; if(['shape_type','range'].includes(key))render();},opts&&opts.map(o=>({value:o,label:o}))))}
      field('Shape','shape_type','text',VALID_SHAPES);
      field('Forward range','range','number');field('Offset X','offset_x','number');field('Offset Y','offset_y','number');
      field('Seconds / phase','duration','number');field('Wait for full animation','wait_for_animation','bool');
      field('Effect basename (attacks/)','effect','text');field('Effect texture (optional)','effect_texture','text');field('Effect animation path','effect_animation_path','text');
      field('Animation PREFIX','animation_prefix','text');field('Directional phase state (PREFIX_DIRECTION)','directional','bool');field('Effect movement','movement_mode','text',VALID_MOVEMENT);
      field('Pierce players (override)','pierce_players','text',['inherit','true','false']);
      field('Persist until contact (bounded)','linger_until_contact','bool');field('Maximum wait seconds','max_wait_seconds','number');
      field('Contact effect basename','contact_effect','text');field('Contact animation PREFIX','contact_animation_prefix','text');field('Directional contact state (PREFIX_DIRECTION)','contact_directional','bool');
      field('Spawn enemy template','spawn_bot_template','text');field('Spawn count (max 3)','spawn_bot_count','number');
      field('Spawn offset X','spawn_offset_x','number');field('Spawn offset Y','spawn_offset_y','number');
      field('Phase damage override','damage','number');
      const sfxfields=e('div',undefined,{class:'ve-aw-fields'});card.appendChild(e('h4','Sound effects (server asset paths)'));card.appendChild(sfxfields);
      phase.sfx=phase.sfx||{};
      for(const [event,label] of Object.entries({on_start:'Phase start',on_middle:'Phase midpoint',on_end:'Phase end',on_contact:'Player contact'})){
        sfxfields.appendChild(buildInput(label,event,phase.sfx[event],'text',v=>phase.sfx[event]=v));
      }
      card.appendChild(e('h4','Tile shape preview'));
      renderPhaseShape(phase,card);
      const painter=e('textarea',undefined,{class:'ve-aw-mask-input',rows:'2',placeholder:'Optional custom mask: 1,1 / 1,0'});
      painter.value=phase.shape?phase.shape.map(r=>r.join(',')).join(' / '):'';
      painter.addEventListener('change',()=>{try{phase.shape=painter.value.trim()?parseMask(painter.value):undefined;if(phase.shape)phase.shape_type='custom';render();}catch(err){show(err.message,false)}});
      card.appendChild(painter);
    });
  }
  function load(key){currentKey=key||''; current=copy(custom[key]||BUILT_INS[key]||newAttack());name.value=key||'';chooser.value=key||'';render();show(key&&BUILT_INS[key]&&!custom[key]?'Built-in reference. Save to customize; the server retains its original specialized AI unless you opt into phases.':'',true)}
  function save(){const key=name.value.trim();const valid=validate(key,current);custom[key]=valid;currentKey=key;current=copy(valid);persist();refreshChooser();render();show('Saved attack '+key+'. Export the combined Attack Workshop ZIP to install it.',true);return key;}
  const toolbarRows=[chooser,name,
    button('New',()=>{currentKey='';load('');refreshChooser()}),
    button('Save attack',()=>save()),
    button('Export Lua',()=>{const k=save();download('attack_'+k.toLowerCase()+'.lua',moduleSource(k,current),'text/plain')}),
    button('Export attacks ZIP',async()=>{
      try{save(); const JSZip=await loadZip();const zip=new JSZip();
        zip.file(ROOT+'attacks/custom_templates.lua',bundleSource(custom));
        zip.file('ATTACK_WORKSHOP_PROJECT.json',JSON.stringify({version:2,attacks:custom},null,2));
        zip.file('ATTACK_WORKSHOP_README.md','# Attack Workshop\nExtract into server root. The new attacks/custom_templates.lua is loaded automatically by ai/attack_templates.lua from the accompanying server patch. Keep the client visual and SFX files at the authored /server/assets paths.\n');
        download('attack-template-workshop.zip',await zip.generateAsync({type:'blob'}),'application/zip');
        show('Exported '+Object.keys(custom).length+' attack templates.',true);
      }catch(err){show(err.message,false)}
    }),
    button('Export selected attack JSON',()=>{const k=save();download('attack_'+k.toLowerCase()+'.json',JSON.stringify({version:2,attacks:{[k]:custom[k]}},null,2),'application/json')}),
    button('Export all attacks JSON',()=>download('attack-workshop.json',JSON.stringify({version:2,attacks:custom},null,2),'application/json')),
    button('Import attacks JSON / ZIP',()=>file.click()),
    button('Delete',()=>{const key=chooser.value;if(key&&custom[key]&&root.confirm('Delete saved '+key+'?')){delete custom[key];persist();currentKey='';refreshChooser();load('')}})
  ];
  toolbarRows.forEach(child=>bar.appendChild(child));
  const file=e('input',undefined,{type:'file',accept:'.json,.zip,application/json,application/zip'});file.hidden=true;bar.appendChild(file);
  file.addEventListener('change',async()=>{
    try{
      const selected=file.files&&file.files[0];if(!selected)return;
      let body;
      if(/\.zip$/i.test(selected.name)){
        const JSZip=await loadZip();const archive=await JSZip.loadAsync(await selected.arrayBuffer());
        const project=archive.file('ATTACK_WORKSHOP_PROJECT.json');
        if(!project)throw new Error('This ZIP has no ATTACK_WORKSHOP_PROJECT.json. Export it from the Attack Workshop first.');
        body=JSON.parse(await project.async('string'));
      }else body=JSON.parse(await selected.text());
      if(body.version!==2||!body.attacks||typeof body.attacks!=='object'||Array.isArray(body.attacks))throw new Error('Invalid Attack Workshop v2 project.');
      const incoming={};
      for(const [key,def] of Object.entries(body.attacks)) incoming[key]=validate(key,def);
      Object.assign(custom,incoming);persist();refreshChooser();load('');
      show('Imported '+Object.keys(incoming).length+' attacks. Open Enemy Template Workshop to assign them.',true);
    }catch(err){show(err.message,false)}file.value='';
  });
  chooser.addEventListener('change',()=>load(chooser.value));
  refreshChooser();load('');
  return {getNames:()=>getNames(custom),reload:()=>{refreshChooser();load(chooser.value)}};
}
root.VisualEncountersAttackWorkshop={seeds:BUILT_INS,validate,parseMask,moduleSource,bundleSource,newAttack,getNames,mount,suffixes:FACES,facing:FACING};
})(typeof window!=='undefined'?window:globalThis);
