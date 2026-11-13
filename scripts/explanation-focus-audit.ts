import fs from 'node:fs';import assert from 'node:assert/strict';
import {openStore} from '../server/store';import {indexGame,discoverGame} from '../server/importer';
import {entryMechanics,explanationPreview} from '../src/mechanics';
const store=openStore('.bridge-local/m71-audit-db');
const flat=(items:any[]):any[]=>items.flatMap(x=>[x,...flat(x.children||[])]);
try{
 const meta=indexGame(store,discoverGame()),baseline=JSON.parse(fs.readFileSync('tests/fixtures/explanation-autarky-m71.json','utf8'));
 const e=store.entry(baseline.id)!;assert.ok(e);assert.equal(e.hash,baseline.hash,'New game source requires a new matched regression baseline');assert.equal(e.version,baseline.version);assert.equal(e.data.days,70);
 const m=entryMechanics(e),all=flat([...m.summary,...m.requirements]),preview=explanationPreview(m.summary,100),text=preview.map(x=>x.text).join('\n');
 assert.ok(preview.length>0);assert.match(text,/Remove modifier MEFO Bills/);assert.match(text,/Wirtschaftswunder/);assert.match(text,/Replacement idea values \(not net changes\)/);
 for(const label of ['military factory construction speed','dockyard construction speed','factory output','dockyard output'])assert.match(text,new RegExp(label+' contribution[^\\n]*\\+5 percentage points'));
 assert.match(text,/consumer goods factor contribution[^\n]*to 0%/);assert.ok(all.some(x=>x.code==='has_resources_in_collection'&&x.unknown));assert.ok(all.some(x=>x.code==='subtract_from_variable'&&x.unknown));
 const report={baseline,gameVersion:meta.version,indexRevision:meta.indexRevision,preview,issues:all.filter(x=>x.unknown).map(x=>({code:x.code,status:x.status,text:x.text})),dependencies:Object.entries({...e.data.mechanicScripts,...e.data.mechanicDynamicModifiers,...e.data.mechanicIdeas}).map(([id,x]:[string,any])=>({id,source:x.source,line:x.line,hash:x.hash,version:x.version})),note:'Installed-source regression, not native game outcome verification.'};
 fs.writeFileSync('.bridge-local/m71-autarky-after.json',JSON.stringify(report,null,2));console.log(JSON.stringify({id:e.id,specificOutcomes:preview.length,issues:[...new Set(report.issues.map(x=>x.code))],preview:preview.map(x=>x.text)},null,2));
 const census:Record<string,{total:number;withSpecificOutcome:number;withUnsupported:number}>={};
 for(const row of store.db.prepare("SELECT payload FROM entries WHERE kind IN ('focus','shared_focus','joint_focus','decision','formable','technology')").all()){const x=JSON.parse(String(row.payload)),v=entryMechanics(x),c=census[x.kind]??={total:0,withSpecificOutcome:0,withUnsupported:0};c.total++;if(explanationPreview(v.summary,1).length)c.withSpecificOutcome++;if(flat([...v.summary,...v.requirements]).some(n=>n.unknown))c.withUnsupported++;}
 fs.writeFileSync('.bridge-local/m71-engine-after-census.json',JSON.stringify({gameVersion:meta.version,indexRevision:meta.indexRevision,measure:'Automated screening only: at least one specific outcome; any explicit unsupported/recovered/ambiguous element. Not full semantic coverage.',census},null,2));console.log(JSON.stringify(census));
}finally{store.db.close();}
