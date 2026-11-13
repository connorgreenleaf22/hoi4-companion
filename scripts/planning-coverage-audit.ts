// Installed-source HTTP regression. Reads the retained index; never indexes, launches HOI4 or writes game data.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {startServer,validateProfile} from '../server/api';import {rankCoverageGaps} from '../server/planner/coverage';import type {Entry,Node} from '../src/types';import type {PlanCoverage} from '../src/planning-coverage-types';
import {explanationPreview,type Explanation} from '../src/mechanics-interpreter';
const flatten=(xs:Explanation[]):Explanation[]=>xs.flatMap(x=>[x,...flatten(x.children||[])]);
function portugalFields(c:PlanCoverage){
 const all=flatten(c.references.flatMap(r=>r.summary));
 const option=(suffix:string)=>all.find(x=>x.code==='option'&&x.text.includes('lar_portugal_promote_monarchist_cause.2.'+suffix));
 const accepted=flatten(option('a')?.children||[]),refused=flatten(option('b')?.children||[]);
 return {
  acceptRefuseBranches:!!option('a')&&!!option('b'),
  acceptanceRecipientAnnexation:accepted.some(x=>x.code==='annex_country'&&!x.unknown&&x.text.includes('annexes Brazil and receives its troops')),
  acceptanceConditionalCores:accepted.some(x=>x.code==='every_state')&&accepted.some(x=>x.code==='is_core_of'&&x.status==='state-unknown')&&accepted.some(x=>x.code==='add_core_of'&&!x.unknown),
  refusalWarGoal:refused.some(x=>x.code==='create_wargoal'&&!x.unknown&&x.text.includes('annexation war goal against Brazil')),
  followupNotifications:['.5','.6'].every(s=>c.events.some(e=>e.id==='lar_portugal_promote_monarchist_cause'+s&&e.reference)),
  randomizedNewsTiming:accepted.some(x=>x.code==='news_event'&&x.text.includes('120 hours (upper bound excluded')),
  aiModifierConditions:refused.some(x=>x.code==='has_global_flag:POR_portugal_joined_brazilian_civil_war_flag'&&x.status==='state-unknown'),
  dlcAlternativeDelivery:['JUNO_brazil_events.190','lar_portugal_promote_monarchist_cause.7'].every(id=>all.some(x=>!x.unknown&&x.text.startsWith('Event '+id+' delivered')))
 };
}
async function main(){
const db=new DatabaseSync(path.resolve(process.env.HOI4_REFERENCE_DB||'.bridge-local/m71-audit-db/companion.sqlite'),{readOnly:true});const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-planning-audit-'));const app=await startServer({dataDir:dir,port:0,autoIndex:false});
const post=async(route:string,input:unknown)=>{const r=await fetch(app.url+'/api/v1/'+route,{method:'POST',body:JSON.stringify(input)});return {status:r.status,body:await r.json()};};
try{
 const meta=JSON.parse(String(db.prepare("SELECT value FROM settings WHERE key='meta'").get()!.value));
 const baseline=JSON.parse(fs.readFileSync('tests/fixtures/planning-coverage-sources.json','utf8'));assert.equal(meta.version,baseline.version);
 const pins=JSON.parse(fs.readFileSync('tests/fixtures/mechanics-portugal-sources-m741.json','utf8'));
 const launcher=JSON.parse(fs.readFileSync(path.join(meta.root,'launcher-settings.json'),'utf8'));assert.equal(launcher.rawVersion,pins.version);assert.equal(launcher.version,pins.launcherVersion);assert.equal(meta.indexRevision,pins.indexRevision);
 for(const file of pins.files)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(meta.root,file.source))).digest('hex'),file.hash,'Pinned installed source changed: '+file.source);
 for(const file of baseline.files){assert.equal(createHash('sha256').update(fs.readFileSync(path.join(meta.root,file.source))).digest('hex'),file.hash,'Installed source changed: '+file.source);}
 const entries=db.prepare("SELECT payload FROM entries WHERE source IN ('common/national_focus/portugal.txt','common/national_focus/germany.txt') OR id IN ('POR_stir_monarchist_sentiment_in_brazil','POR_stir_monarchist_sentiment_in_portugal','basic_machine_tools')").all().map(r=>JSON.parse(String(r.payload)) as Entry);
 for(const e of entries){const pin=baseline.files.find((x:any)=>x.source===e.source);if(pin)assert.equal(e.hash,pin.hash,'Index/source mismatch');app.store.insert(e);}
 const eventIds=new Set<string>();let scanBudget=100000;
 const scan=(ns:Node[],depth=0)=>{assert.ok(depth<=32&&scanBudget>0,'Audit event-source scan exceeded its bound');for(const n of ns){assert.ok(--scanBudget>0,'Audit source scan budget exhausted');if(['country_event','news_event','state_event'].includes(n.key)){
  const id=typeof n.value==='string'?n.value:n.value.find(x=>x.key==='id')?.value;
  if(typeof id==='string'&&!eventIds.has(id)){eventIds.add(id);assert.ok(eventIds.size<=256,'Audit event count bound exceeded');for(const row of db.prepare("SELECT payload FROM entries WHERE kind='event' AND id=?").all(id)){const event=JSON.parse(String(row.payload));app.store.insert(event);scan(event.data.nodes||[],depth+1);}}
 }if(Array.isArray(n.value)&&!['effect_tooltip','custom_effect_tooltip','event_option_tooltip','show_ideas_tooltip','unlock_decision_tooltip'].includes(n.key))scan(n.value,depth+1);}};
 app.store.setSetting('meta',meta);const reports:PlanCoverage[]=[];const goals=[];
 for(const [country,goal] of [['POR','POR_the_kingdom_reunited'],['GER','GER_autarky_achieved'],['GER','GER_oppose_hitler']]){
  const target=entries.find(e=>e.kind==='focus'&&e.id===goal)!;assert.ok(target);const tree=entries.find(e=>e.kind==='focus_tree'&&e.id===target.data.treeId)!;assert.ok(tree);
  const profile=validateProfile({id:'audit-'+goal,country,tree:'definition:'+tree.uid,startDate:'1936-01-01',completed:[]});const plan={id:goal,name:goal,tree:profile.tree,startDate:profile.startDate,items:[],assumptions:[]};
  const result=await post('strategy/paths',{profile,plan,goal:'definition:'+target.uid,indexRevision:meta.indexRevision});assert.equal(result.status,200);assert.ok(result.body.paths.length,JSON.stringify(result.body.diagnostics));
  const first=result.body.paths[0];assert.equal(first.coverage.structuralValidity,'valid');assert.equal(first.coverage.policy.rankingAllowed,false);
  for(const item of first.items){const entry=entries.find(e=>'definition:'+e.uid===item.reference||e.id===item.legacyId);assert.ok(entry);scan(entry.data.nodes||[]);for(const helper of Object.values(entry.data.mechanicScripts||{}) as any[])scan(helper.nodes||[]);}
  for(const entry of entries.filter(e=>country==='POR'&&e.kind==='decision'))scan(entry.data.nodes||[]);
  const supporting=entries.filter(e=>e.kind==='technology'||country==='POR'&&e.kind==='decision').map(e=>'definition:'+e.uid);
  const input={schemaVersion:1,profile,plan:{...plan,items:first.items},supportingReferences:supporting,indexRevision:meta.indexRevision,intent:'provisional'};
  const review=await post('strategy/review',input);assert.equal(review.status,200);const c=review.body.coverage as PlanCoverage;reports.push(c);
  for(const intent of ['rank','optimize'])assert.equal((await post('strategy/review',{...input,intent})).status,422);
  if(country==='POR'){
   assert.ok(c.gaps.some(g=>g.code==='start_civil_war'&&g.severity==='critical'));assert.ok(c.events.some(e=>e.id==='lar_portugal_promote_monarchist_cause.2'&&e.reference));
   assert.ok(JSON.stringify(c.references).includes('less than 40% stability'));assert.ok(JSON.stringify(c.references).includes('Fascist civil war'));
   const fields=portugalFields(c);assert.ok(Object.values(fields).every(Boolean),JSON.stringify(fields));
   const kingdom=c.references.find(r=>r.reference.endsWith(':POR_the_kingdom_reunited'))!;
   const previews=explanationPreview(kingdom.summary,100);assert.ok(previews.some(x=>x.text.includes('.2.a')&&x.text.includes('annexes Brazil')));assert.ok(previews.some(x=>x.text.includes('.2.b')&&x.text.includes('war goal against Brazil')));
   assert.equal(flatten(kingdom.summary).filter(x=>x.code==='create_wargoal'&&!x.unknown).length,1,'Refusal notification tooltip must not execute another war goal');
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
 const portugal=reports.find(c=>c.planId==='POR_the_kingdom_reunited')!;
 const prior=process.env.HOI4_COVERAGE_BASELINE?JSON.parse(fs.readFileSync(process.env.HOI4_COVERAGE_BASELINE,'utf8')):undefined;
 const result={schemaVersion:1,version:meta.version,indexRevision:meta.indexRevision,verifiedSourceFiles:proofs.size,verification:'installed-source HTTP regression; no native game or AI-generated plan',portugalFields:{before:prior?portugalFields(prior.reports.find((c:PlanCoverage)=>c.planId===portugal.planId)):undefined,after:portugalFields(portugal),note:'Eight targeted field checks, not a global coverage percentage. More discovered risks can increase blocker counts.'},goals,priorities:rankCoverageGaps(reports),reports};
 const output=process.env.HOI4_COVERAGE_AUDIT_OUTPUT||'.bridge-local/planning-coverage-audit.json';fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,reports:undefined},null,2));
}finally{db.close();await app.close();fs.rmSync(dir,{recursive:true,force:true});}

}
main().catch(e=>{console.error(e);process.exitCode=1;});
