import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {searchEntries} from '../server/search';
import {productionSupport} from '../server/domain';
import {number} from '../src/App';
import type {Store} from '../server/store';

// Read-only comparison against the retained disposable installed index. Never opens personal data.
const file=path.resolve('../candidate/artifacts/v0.2-installed-import/disposable-data/companion.sqlite');
const digest=()=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const before=digest();const db=new DatabaseSync(file,{readOnly:true});
const store={db,getSetting(key:string,fallback:any){const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key);return row?JSON.parse(String(row.value)):fallback;}} as Store;
const mode=process.argv.includes('--baseline')?'before':'after';
async function main(){try{
  const cases=[
    ['What happens after Denmark occupation event 1?','denmark_occupation_event.1'],
    ['professional officer corps cost','professional_officer_corps_spirit'],
    ['How much does professional officer corps cost?','professional_officer_corps_spirit'],
    ['What unlocks medium tank cannon?','tank_medium_cannon'],
    ['What does Cavalry Charge give?','cavalry_charge'],
    ['Who recruits the Aussa sultan?','AFA_sultan_mohamed_yayyo_of_aussa'],
    ['denmark_occupation_event.1','denmark_occupation_event.1'],
    ['professional_officer_corps_spirit','professional_officer_corps_spirit']
  ];
  const searches=cases.map(([q,target])=>{const result=searchEntries(store,new URLSearchParams({q,limit:'10'}));return {q,target,total:result.total,firstTen:result.entries.map(e=>e.id),found:result.entries.some(e=>e.id===target),question:result.question};});
  const module=JSON.parse(String(db.prepare("SELECT payload FROM entries WHERE kind='module' AND id='heavy_mg_4x'").get()!.payload));
  const formatter=mode==='before'?number:(await import('../src/format')).sourceNumber;
  const displayed=formatter(module.data.addStats.reliability);
  const naval=productionSupport({uid:'equipment:fixture:convoy',kind:'equipment',id:'convoy',title:'Convoy',source:'fixture',line:1,hash:'fixture',version:'fixture',description:'',data:{type:'convoy',stats:{build_cost_ic:70}}},[]);
  const report={at:new Date().toISOString(),mode,readOnlyInstalledCache:file,searches,precision:{declared:module.data.addStats.reliability,displayed,sourceHash:module.hash,exact:displayed==='-0.025'},naval,copyCurrent:!naval.reason?.includes('v0.1.1'),cacheUnchanged:before===digest(),independentAcceptance:false};
  fs.mkdirSync('artifacts/qa-fix-r2',{recursive:true});fs.writeFileSync(`artifacts/qa-fix-r2/${mode}-installed.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify({mode,searches:searches.map(({q,total,found})=>({q,total,found})),precision:report.precision,naval:naval.reason,cacheUnchanged:report.cacheUnchanged}));
  if(mode==='after'&&(!searches.every(s=>s.found)||!report.precision.exact||!report.copyCurrent||!report.cacheUnchanged))process.exitCode=1;
}finally{db.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
