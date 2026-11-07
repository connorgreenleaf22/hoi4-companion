// Installed-source HTTP regression. Reads the retained index; never indexes, launches HOI4 or writes game data.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {startServer,validateProfile} from '../server/api';import {rankCoverageGaps} from '../server/planner/coverage';import type {Entry,Node} from '../src/types';import type {PlanCoverage} from '../src/planning-coverage-types';
async function main(){
const db=new DatabaseSync(path.resolve('.bridge-local/m71-audit-db/companion.sqlite'),{readOnly:true});const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-planning-audit-'));const app=await startServer({dataDir:dir,port:0,autoIndex:false});
const post=async(route:string,input:unknown)=>{const r=await fetch(app.url+'/api/v1/'+route,{method:'POST',body:JSON.stringify(input)});return {status:r.status,body:await r.json()};};
try{
 const meta=JSON.parse(String(db.prepare("SELECT value FROM settings WHERE key='meta'").get()!.value));
 const baseline=JSON.parse(fs.readFileSync('tests/fixtures/planning-coverage-sources.json','utf8'));assert.equal(meta.version,baseline.version);
 for(const file of baseline.files){assert.equal(createHash('sha256').update(fs.readFileSync(path.join(meta.root,file.source))).digest('hex'),file.hash,'Installed source changed: '+file.source);}
 const entries=db.prepare("SELECT payload FROM entries WHERE source IN ('common/national_focus/portugal.txt','common/national_focus/germany.txt') OR id IN ('POR_stir_monarchist_sentiment_in_brazil','POR_stir_monarchist_sentiment_in_portugal','basic_machine_tools')").all().map(r=>JSON.parse(String(r.payload)) as Entry);
 for(const e of entries){const pin=baseline.files.find((x:any)=>x.source===e.source);if(pin)assert.equal(e.hash,pin.hash,'Index/source mismatch');app.store.insert(e);}
 const eventIds=new Set<string>();const scan=(ns:Node[])=>{for(const n of ns){if(n.key==='country_event'){const id=typeof n.value==='string'?n.value:n.value.find(x=>x.key==='id')?.value;if(typeof id==='string')eventIds.add(id);}if(Array.isArray(n.value))scan(n.value);}};
 for(const e of entries){scan(e.data.nodes||[]);for(const h of Object.values(e.data.mechanicScripts||{}) as any[])scan(h.nodes||[]);}
 for(const id of eventIds)for(const r of db.prepare("SELECT payload FROM entries WHERE kind='event' AND id=?").all(id))app.store.insert(JSON.parse(String(r.payload)));
 app.store.setSetting('meta',meta);const reports:PlanCoverage[]=[];const goals=[];
 for(const [country,goal] of [['POR','POR_the_kingdom_reunited'],['GER','GER_autarky_achieved'],['GER','GER_oppose_hitler']]){
  const target=entries.find(e=>e.kind==='focus'&&e.id===goal)!;assert.ok(target);const tree=entries.find(e=>e.kind==='focus_tree'&&e.id===target.data.treeId)!;assert.ok(tree);
  const profile=validateProfile({id:'audit-'+goal,country,tree:'definition:'+tree.uid,startDate:'1936-01-01',completed:[]});const plan={id:goal,name:goal,tree:profile.tree,startDate:profile.startDate,items:[],assumptions:[]};
  const result=await post('strategy/paths',{profile,plan,goal:'definition:'+target.uid,indexRevision:meta.indexRevision});assert.equal(result.status,200);assert.ok(result.body.paths.length,JSON.stringify(result.body.diagnostics));
  const first=result.body.paths[0];assert.equal(first.coverage.structuralValidity,'valid');assert.equal(first.coverage.policy.rankingAllowed,false);
  const supporting=entries.filter(e=>e.kind==='technology'||country==='POR'&&e.kind==='decision').map(e=>'definition:'+e.uid);
  const input={schemaVersion:1,profile,plan:{...plan,items:first.items},supportingReferences:supporting,indexRevision:meta.indexRevision,intent:'provisional'};
  const review=await post('strategy/review',input);assert.equal(review.status,200);const c=review.body.coverage as PlanCoverage;reports.push(c);
  for(const intent of ['rank','optimize'])assert.equal((await post('strategy/review',{...input,intent})).status,422);
  if(country==='POR'){
   assert.ok(c.gaps.some(g=>g.code==='start_civil_war'&&g.severity==='critical'));assert.ok(c.events.some(e=>e.id==='lar_portugal_promote_monarchist_cause.2'&&e.reference));
   assert.ok(JSON.stringify(c.references).includes('less than 40% stability'));assert.ok(JSON.stringify(c.references).includes('Fascist civil war'));
  }
  if(goal==='GER_autarky_achieved')assert.ok(c.gaps.some(g=>g.category==='Dynamic economy and variable formulas'));
  if(goal==='GER_oppose_hitler')assert.ok(c.gaps.some(g=>g.dimension==='downstream-events'));
  // Deliberately remove a required ancestor; do not accept a plan just because the objective resolves.
  if(first.items.length>1){const bad=await post('strategy/review',{...input,plan:{...input.plan,items:first.items.slice(1)}});assert.equal(bad.status,422);}
  goals.push({goal,routes:result.body.paths.length,truncated:result.body.truncated,selectedSequence:first.items.map((x:any)=>x.legacyId),structure:c.structuralValidity,blockingGaps:c.policy.blockingGapCount,events:c.events.map(e=>e.id),supportingReferences:supporting});
 }
 // Verify every cited local source, including idea/helper/event dependencies, against the actual installation.
 const proofs=new Map<string,string>();const inspect=(value:any)=>{if(!value||typeof value!=='object')return;if(typeof value.source==='string'&&typeof value.hash==='string')proofs.set(value.source,value.hash);for(const v of Object.values(value))if(typeof v==='object')inspect(v);};reports.forEach(inspect);
 for(const [source,hash] of proofs)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(meta.root,source))).digest('hex'),hash,'Cited source changed: '+source);
 const result={schemaVersion:1,version:meta.version,indexRevision:meta.indexRevision,verifiedSourceFiles:proofs.size,verification:'installed-source HTTP regression; no native game or AI-generated plan',goals,priorities:rankCoverageGaps(reports),reports};
 fs.writeFileSync('.bridge-local/planning-coverage-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,reports:undefined},null,2));
}finally{db.close();await app.close();fs.rmSync(dir,{recursive:true,force:true});}

}
main().catch(e=>{console.error(e);process.exitCode=1;});
