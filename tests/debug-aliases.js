const fs=require('fs'), JSZip=require('../vendor/jszip.min.js');require('../v21-export.js');
(async()=>{
 const html=fs.readFileSync('index.html','utf8');const begin=html.indexOf('const enemyDictionary = [');const end=html.indexOf('];',begin);const dict=Function('return '+html.slice(html.indexOf('[',begin),end+1))();
 const z=await JSZip.loadAsync(fs.readFileSync('mods/ezencounters-v21-base.zip'));
 const entry=await z.file('entry.lua').async('string');const a=[...globalThis.VisualEncountersV21.packageAliases(entry)];
 const local=globalThis.VisualEncountersV21.localBattleAliases(entry);
 const plan=globalThis.VisualEncountersV21.collectModDownloads(a,dict,local);
 const allfiles=new Set(fs.readdirSync('mods'));
 console.log('dictionary',dict.length,'known aliases',a.length,'missing aliases',a.filter(n=>!dict.some(x=>x.name===n)));
 console.log('local', [...local]);console.log('plan:',plan.files.length,'missing mapping',plan.unresolved,'missing zip files',plan.files.filter(n=>!allfiles.has(n)));
})().catch(e=>{console.error(e);process.exitCode=1})
