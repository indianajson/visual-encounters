/* Combat Pack V3 authoring foundation. Strict data; no eval or code execution. */
(function(root){'use strict';
const VERSION=3, STORE='veCombatPackV3', TYPES=['attack','behavior','entity','asset','preset'];
const byId=id=>document.getElementById(id);
const deepcopy=value=>JSON.parse(JSON.stringify(value));
const idOK=value=>/^[A-Za-z_][A-Za-z0-9_.-]{0,127}$/.test(value);
const blank=()=>({version:VERSION,definitions:Object.fromEntries(TYPES.map(k=>[k,{}]))});
function sample(type){
 if(type==='attack')return {description:'',timeline:[{seconds:.2,actions:[{type:'shape',cells:[{x:1,y:0}]}],events:{on_start:[],on_middle:[],on_end:[],on_contact:[]}}]};
 if(type==='entity')return {description:'',kind:'enemy',hp:100,texture_path:'',animation_path:'',animation_bindings:{Idle:'IDLE',Strike:'ATTACK'},eight_direction_animations:false,attacks:[],behavior:''};
 if(type==='preset')return {description:'',entity:'',defaults:{scale:1}};
 if(type==='behavior')return {description:'',policy:'stationary',targeting:'nearest'};
 return {description:'',texture_path:'',animation_path:''};
}
function validatePack(input){
 if(!input||input.version!==VERSION||!input.definitions||typeof input.definitions!=='object')throw Error('Combat Pack schema version must be 3.');
 const pack=blank();
 for(const [kind,entries] of Object.entries(input.definitions)){
  if(!TYPES.includes(kind)||!entries||Array.isArray(entries)||typeof entries!=='object')throw Error('Unknown definition type '+kind);
  for(const [id,def] of Object.entries(entries)){
   if(!idOK(id)||!def||Array.isArray(def)||typeof def!=='object')throw Error('Invalid definition '+id);
   if(kind==='attack' && !Array.isArray(def.timeline) && !(def.graph&&def.graph.nodes&&def.graph.start))throw Error('Attack '+id+' needs timeline or graph');
   if(kind==='preset' && !idOK(def.entity||''))throw Error('Preset '+id+' needs an entity ID');
   pack.definitions[kind][id]=deepcopy(def);
  }
 }
 const required=new Set();
 const ref=(kind,id,source)=>{if(!id)return; if(!pack.definitions[kind][id])required.add(`${source}: ${kind}/${id}`)};
 for(const [id,def] of Object.entries(pack.definitions.entity)){
  ref('behavior',def.behavior,id);ref('asset',def.asset,id);
  for(const a of def.attacks||[])ref('attack',a,id);
 }
 for(const [id,def] of Object.entries(pack.definitions.preset))ref('entity',def.entity,id);
 for(const [id,def] of Object.entries(pack.definitions.attack)){
  const scan=actions=>(actions||[]).forEach(a=>{if(a.type==='spawn_entity'){ref('entity',a.entity,id);ref('preset',a.preset,id)}if(a.type==='run_attack')ref('attack',a.attack,id);if(a.asset)ref('asset',a.asset,id)});
  for(const phase of def.timeline||[]){scan(phase.actions);for(const events of Object.values(phase.events||{}))scan(events)}
  for(const node of Object.values((def.graph&&def.graph.nodes)||{}))scan(node.actions);
 }
 return {pack,missing:[...required]};
}
function lua(value,indent=0){
 if(value===null)return 'nil';
 if(typeof value==='boolean')return value?'true':'false';
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Non-finite numeric value');return String(value)}
 if(typeof value==='string')return '"'+value.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t')+'"';
 if(Array.isArray(value))return '{'+value.map(v=>lua(v,indent+1)).join(',')+'}';
 if(typeof value==='object')return '{'+Object.entries(value).map(([k,v])=>`[${lua(k)}]=${lua(v,indent+1)}`).join(',')+'}';
 throw Error('Unsupported Lua export value');
}
function xml(v){return String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[x]))}
function tiledTemplate(id){return `<?xml version="1.0" encoding="UTF-8"?>\n<template>\n <object name="${xml(id)}" type="V3 Entity" width="0" height="0">\n  <properties>\n   <property name="V3 Preset" type="string" value="${xml(id)}"/>\n   <property name="V3 Facing" type="string" value="Down Right"/>\n   <property name="V3 Enabled" type="bool" value="true"/>\n  </properties>\n </object>\n</template>\n`}
function download(name,data,mime){let blob=new Blob([data],{type:mime||'application/octet-stream'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
let project=blank(),kind='attack',currentId='',current=sample('attack'),mode='timeline';
try{const saved=root.localStorage.getItem(STORE);if(saved)project=validatePack(JSON.parse(saved)).pack}catch(err){console.warn('V3 project restore',err)}
const status=(str,error=false)=>{let el=byId('v3-message');el.textContent=str;el.classList.toggle('error',error)};
const persist=()=>{try{root.localStorage.setItem(STORE,JSON.stringify(project))}catch(err){status('Local storage unavailable. Export your JSON to preserve the project.',true)}};
function load(id){currentId=id||'';current=deepcopy(project.definitions[kind][id]||sample(kind));byId('v3-id').value=id||'';byId('v3-description').value=current.description||'';render()}
function choices(){const s=byId('v3-select');s.innerHTML='';Object.keys(project.definitions[kind]).sort().forEach(id=>{let o=new Option(id,id);s.add(o)});s.value=currentId}
function parseCurrent(){
 current.description=byId('v3-description').value;
 if(mode==='json')current=JSON.parse(byId('v3-def-json').value);
 if(kind==='attack'&&mode==='graph'&&current.graph){current.graph.start=byId('v3-graph-start').value.trim();current.graph.nodes=JSON.parse(byId('v3-graph-json').value)}
 return current;
}
function save(){
 const id=byId('v3-id').value.trim();if(!idOK(id))throw Error('Definition ID must start with a letter/underscore and use letters, digits, dots, hyphens or underscores.');
 const def=deepcopy(parseCurrent());let prior=project.definitions[kind][currentId];
 if(currentId && currentId!==id && prior)delete project.definitions[kind][currentId];
 project.definitions[kind][id]=def;
 try{validatePack(project)}catch(e){delete project.definitions[kind][id];if(prior)project.definitions[kind][currentId]=prior;throw e}
 currentId=id;current=def;choices();persist();render();status('Saved '+kind+' '+id+'.');return id;
}
function field(title,value,cb,type='text'){
 const label=document.createElement('label');label.textContent=title;
 const input=document.createElement('input');input.type=type;input.value=value==null?'':String(value);input.addEventListener('change',()=>{try{cb(input.value)}catch(err){status(err.message,true)}});label.appendChild(input);return label;
}
function renderTimeline(){
 const area=byId('v3-phase-list');area.innerHTML='';if(kind!=='attack')return;
 const arr=current.timeline||[];
 arr.forEach((phase,i)=>{
  const card=document.createElement('article');card.className='v3-phase';
  const h=document.createElement('strong');h.textContent='Phase '+(i+1);card.appendChild(h);
  const fields=document.createElement('div');fields.className='v3-phase-grid';
  fields.append(field('Duration (seconds)',phase.seconds??.25,v=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>60){status('Duration must be 0–60.',true);return}phase.seconds=n},'number'));
  fields.append(field('Shape as relative x:y cells',(phase.actions||[]).find(a=>a.type==='shape')?.cells?.map(c=>c.x+':'+c.y).join(' ')||'1:0',v=>{
   const cells=v.split(/\s+/).filter(Boolean).map(p=>{const m=p.match(/^(-?\d+):(-?\d+)$/);if(!m)throw Error('Shape coordinates must be x:y');return {x:Number(m[1]),y:Number(m[2])}});
   if(!cells.length||cells.length>81)throw Error('Shape must have 1–81 cells');let shape=(phase.actions||[]).find(a=>a.type==='shape');if(shape)shape.cells=cells;else (phase.actions||(phase.actions=[])).push({type:'shape',cells});
  }));
  fields.append(field('SFX on start',(phase.events?.on_start||[]).find(a=>a.type==='sound')?.path||'',v=>{
   phase.events=phase.events||{};phase.events.on_start=(phase.events.on_start||[]).filter(a=>a.type!=='sound');if(v.trim())phase.events.on_start.push({type:'sound',path:v.trim()});
  }));card.appendChild(fields);
  const lbl=document.createElement('label');lbl.textContent='Phase actions and event actions (JSON)';
  const input=document.createElement('textarea');input.rows=7;input.value=JSON.stringify({actions:phase.actions||[],events:phase.events||{}},null,2);
  input.addEventListener('change',()=>{try{let parsed=JSON.parse(input.value);phase.actions=parsed.actions||[];phase.events=parsed.events||{};status('Updated phase event data.')}catch(e){status(e.message,true)}});
  lbl.appendChild(input);card.appendChild(lbl);
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove phase';remove.addEventListener('click',()=>{arr.splice(i,1);renderTimeline()});card.appendChild(remove);
  area.appendChild(card);
 });
}
function renderGraph(){
 const svg=byId('v3-graph-svg');svg.textContent='';const graph=current.graph;
 if(!graph||!graph.nodes){svg.textContent='Add a graph in Definition JSON to enable advanced graph editing.';return}
 byId('v3-graph-start').value=graph.start||'';
 byId('v3-graph-json').value=JSON.stringify(graph.nodes,null,2);
 const entries=Object.entries(graph.nodes),height=Math.max(100,entries.length*64);
 const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 400 '+height);
 entries.forEach(([key,node],i)=>{
  const y=i*64+12;const rect=document.createElementNS(s.namespaceURI,'rect');rect.setAttribute('x',20);rect.setAttribute('y',y);rect.setAttribute('width',360);rect.setAttribute('height',42);rect.setAttribute('rx',6);rect.setAttribute('fill','var(--ve-theme-accent)');rect.setAttribute('stroke','var(--ve-theme-blue)');s.appendChild(rect);
  const txt=document.createElementNS(s.namespaceURI,'text');txt.setAttribute('x',30);txt.setAttribute('y',y+25);txt.setAttribute('fill','var(--ve-theme-text)');txt.setAttribute('font-size','13');txt.textContent=key+' · '+node.type+' → '+(node.next||node.yes||'end');s.appendChild(txt);
 });svg.appendChild(s);
}
function renderDeps(){
 const area=byId('v3-deps');area.innerHTML='';const problems=validatePack(project).missing;
 const p=document.createElement('p');p.textContent=problems.length?'Unresolved references: '+problems.length:'All references resolve in this project.';area.appendChild(p);
 if(problems.length){let ul=document.createElement('ul');problems.forEach(d=>{let li=document.createElement('li');li.textContent=d;ul.appendChild(li)});area.appendChild(ul)}
}
function render(){
 const isAttack=kind==='attack';byId('v3-timeline').hidden=!isAttack||mode!=='timeline';byId('v3-graph').hidden=!isAttack||mode!=='graph';byId('v3-json').hidden=isAttack&&mode!=='json';
 byId('v3-def-json').value=JSON.stringify(current,null,2);
 renderTimeline();renderGraph();renderDeps();
 document.querySelectorAll('.v3-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
}
function exportProject(){const {missing}=validatePack(project);if(missing.length)throw Error('Resolve missing dependencies before export: '+missing.join(', '));return JSON.stringify(project,null,2)}
async function exportZip(){
 const json=exportProject();if(!root.JSZip)throw Error('JSZip library not available. Use JSON export instead.');
 const zip=new root.JSZip();zip.file('combat-pack.json',json);zip.file('manifest.json',JSON.stringify({schema_version:3,definitions:Object.fromEntries(TYPES.map(k=>[k,Object.keys(project.definitions[k])]))},null,2));
 zip.file('combat_pack.lua','-- Generated by Visual Encounters V3. Requires V3 registry.\nreturn function(registry)\n  return registry:load_pack('+lua(project)+')\nend\n');
 for(const id of Object.keys(project.definitions.preset))zip.file('tiled/'+id+'.tx',tiledTemplate(id));
 zip.file('INSTALL.md','V3 authoring foundation. Copy combat_pack.lua to your chosen Lua load path. Tiled .tx presets are authoring assets; to spawn live bots, install and wire the V3 mission runtime against your current server instance.lua. Existing EZEncounters packages are not replaced.\n');
 download('combat-pack-v3.zip',await zip.generateAsync({type:'blob'}),'application/zip');
}
function click(id,callback){byId(id).addEventListener('click',()=>{try{const result=callback();if(result&&result.catch)result.catch(e=>status(e.message,true))}catch(e){status(e.message,true)}})}
byId('v3-kind').addEventListener('change',e=>{kind=e.target.value;mode='json';currentId='';choices();load('')});
byId('v3-select').addEventListener('change',e=>load(e.target.value));
document.querySelectorAll('.v3-tabs button').forEach(b=>b.addEventListener('click',()=>{try{parseCurrent();mode=b.dataset.mode;if(mode==='graph'&&!current.graph){current.graph={start:'begin',nodes:{begin:{type:'action',next:'done'},done:{type:'end'}}};delete current.timeline}render()}catch(err){status(err.message,true)}}));
click('v3-new',()=>{load('');status('New '+kind+' definition.')});
click('v3-save',save);
click('v3-remove',()=>{if(!currentId)return;delete project.definitions[kind][currentId];persist();currentId='';choices();load('');status('Definition deleted.')});
click('v3-add-phase',()=>{if(!current.timeline)current.timeline=[];current.timeline.push({seconds:.25,actions:[],events:{on_start:[],on_middle:[],on_end:[],on_contact:[]}});renderTimeline()});
click('v3-export-json',()=>download('combat-pack-v3.json',exportProject(),'application/json'));
click('v3-export-zip',exportZip);
click('v3-export-tiled',()=>{if(kind!=='preset'||!currentId)throw Error('Select and save a Tiled preset first.');download(currentId+'.tx',tiledTemplate(currentId),'application/xml')});
click('v3-import',()=>byId('v3-file').click());
byId('v3-file').addEventListener('change',async e=>{
 try{const file=e.target.files[0];if(!file)return;let str;
  if(file.name.toLowerCase().endsWith('.zip')){
   if(!root.JSZip)throw Error('JSZip is unavailable');let zip=await root.JSZip.loadAsync(await file.arrayBuffer());const f=zip.file('combat-pack.json');if(!f)throw Error('ZIP has no combat-pack.json');str=await f.async('string');
  }else str=await file.text();
  const candidate=validatePack(JSON.parse(str));if(candidate.missing.length)throw Error('Missing dependencies: '+candidate.missing.join(', '));project=candidate.pack;persist();currentId='';choices();load('');status('Imported Combat Pack V3.');
 }catch(err){status(err.message,true)}finally{e.target.value=''}
});
click('v3-theme',()=>{const enabled=!document.body.classList.contains('dark-mode');document.body.classList.toggle('dark-mode',enabled);try{root.localStorage.setItem('darkMode',String(enabled))}catch(_){}});
try{document.body.classList.toggle('dark-mode',root.localStorage.getItem('darkMode')==='true')}catch(_){}
choices();load('');
root.V3CombatWorkshop={validatePack,lua,tiledTemplate,getProject:()=>deepcopy(project)};
})(window);
