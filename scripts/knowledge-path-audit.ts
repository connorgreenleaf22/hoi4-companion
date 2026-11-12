// Explicit opt-in installed-source audit. Reads the retained index; writes only ignored/local outputs.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {startServer,validateProfile} from '../server/api';import type {Entry,Node} from '../src/types';import type {Explanation} from '../src/mechanics-interpreter';import {renderPathBrief} from '../server/planner/path-summary';
const hash=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const flatten=(xs:Explanation[]):Explanation[]=>xs.flatMap(x=>[x,...flatten(x.children||[])]);
const routes=[['POR','POR_the_kingdom_reunited'],['GER','GER_return_of_the_kaiser'],['HUN','HUN_proclaim_the_restoration_of_austria_hungary']];
async function main(){
 assert.ok(process.env.HOI4_REFERENCE_DB,'Supply HOI4_REFERENCE_DB explicitly; never use personal app data.');
 const db=new DatabaseSync(path.resolve(process.env.HOI4_REFERENCE_DB!),{readOnly:true});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-path-audit-'));const app=await startServer({dataDir:dir,port:0,autoIndex:false});
 try{
 const meta=JSON.parse(String(db.prepare("SELECT value FROM settings WHERE key='meta'").get()!.value));
 const launcher=JSON.parse(fs.readFileSync(path.join(meta.root,'launcher-settings.json'),'utf8'));
 const prior=JSON.parse(fs.readFileSync('tests/fixtures/mechanics-portugal-sources-m741.json','utf8'));
 assert.equal(meta.version,prior.version);assert.equal(launcher.rawVersion,prior.version);assert.equal(launcher.version,prior.launcherVersion);assert.equal(meta.indexRevision,prior.indexRevision);
 assert.equal(hash(path.join(meta.root,'hoi4.exe')),prior.executableSha256);
 for(const f of prior.files)assert.equal(hash(path.join(meta.root,f.source)),f.hash,f.source);
 const entries=db.prepare("SELECT payload FROM entries WHERE source IN ('common/national_focus/portugal.txt','common/national_focus/germany.txt','common/national_focus/hungary.txt') OR id IN ('POR_stir_monarchist_sentiment_in_brazil','POR_stir_monarchist_sentiment_in_portugal')").all().map(r=>JSON.parse(String(r.payload)) as Entry);
 const proofs=new Map<string,string>();
 const verify=(e:Entry)=>{assert.equal(e.version,meta.version);assert.equal(hash(path.join(meta.root,e.source)),e.hash,e.source);proofs.set(e.source,e.hash);};
 for(const e of entries){verify(e);app.store.insert(e);}app.store.setSetting('meta',meta);
 const added=new Set<string>();let budget=100000;
 const scan=(ns:Node[],depth=0)=>{assert.ok(depth<40&&budget>0,'Audit traversal bound reached');for(const n of ns){assert.ok(--budget>0);if(['effect_tooltip','custom_effect_tooltip','event_option_tooltip','show_ideas_tooltip','unlock_decision_tooltip'].includes(n.key))continue;
 if(['country_event','news_event','state_event'].includes(n.key)){const id=typeof n.value==='string'?n.value:n.value.find(v=>v.key==='id')?.value;
 if(typeof id==='string'&&!added.has(id)){added.add(id);assert.ok(added.size<256);for(const row of db.prepare("SELECT payload FROM entries WHERE kind='event' AND id=?").all(id)){const e=JSON.parse(String(row.payload));verify(e);app.store.insert(e);scan(e.data.nodes||[],depth+1);}}}
 if(Array.isArray(n.value))scan(n.value,depth+1);
 }};
 const post=async(route:string,input:unknown)=>{const r=await fetch(app.url+'/api/v1/'+route,{method:'POST',body:JSON.stringify(input)});return {status:r.status,body:await r.json()};};
 const reports=[];
 for(const [country,goal] of routes){
 const target=entries.find(e=>e.id===goal&&e.kind==='focus')!;assert.ok(target);const tree=entries.find(e=>e.kind==='focus_tree'&&e.id===target.data.treeId)!;assert.ok(tree);
 const profile=validateProfile({id:'path-audit-'+country,country,tree:'definition:'+tree.uid,startDate:'1936-01-01',completed:[]});
 const plan={id:goal,name:target.title,tree:profile.tree,startDate:profile.startDate,items:[],assumptions:['Static source scenario; no live campaign assertions.']};
 const paths=await post('strategy/paths',{profile,plan,goal:'definition:'+target.uid,indexRevision:meta.indexRevision});assert.equal(paths.status,200);assert.ok(paths.body.paths.length);
 const chosen=paths.body.paths.find((p:any)=>country!=='HUN'||p.items.some((i:any)=>i.legacyId==='HUN_demand_a_referendum'))||paths.body.paths[0];
 const selected=chosen.items.map((i:any)=>entries.find(e=>'definition:'+e.uid===i.reference)!);for(const e of selected){assert.ok(e);scan(e.data.nodes||[]);for(const helper of Object.values(e.data.mechanicScripts||{}) as any[])scan(helper.nodes||[]);}
 const supporting=entries.filter(e=>country==='POR'&&e.kind==='decision');for(const e of supporting)scan(e.data.nodes||[]);
 const input={schemaVersion:1,profile,plan:{...plan,items:chosen.items},supportingReferences:supporting.map(e=>'definition:'+e.uid),indexRevision:meta.indexRevision,intent:'provisional',includePathSummary:true};
 const review=await post('strategy/review',input);assert.equal(review.status,200);const c=review.body.coverage;
 assert.equal(c.structuralValidity,'valid');assert.equal(c.policy.rankingAllowed,false);for(const intent of ['rank','optimize'])assert.equal((await post('strategy/review',{...input,intent})).status,422);
 const all=flatten(c.references.flatMap((r:any)=>[...r.summary,...r.requirements]));const known=(code:string)=>all.filter(x=>x.code===code&&!x.unknown);
 const frequencies=Object.entries(all.filter(x=>x.unknown).reduce((a:Record<string,number>,x)=>{a[x.code||'unknown']=(a[x.code||'unknown']||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]);
 reports.push({country,goal,title:target.title,sequence:selected.map((e:Entry)=>({id:e.id,title:e.title,days:e.data.days,prerequisites:e.data.prerequisites,exclusive:e.data.exclusive,source:e.source,line:e.line})),treeSelection:tree.data.countryScript,fields:{politicalTransitions:known('set_politics').map(x=>x.text),popularitySets:known('set_popularities').map(x=>x.text),characterPromotions:known('promote_character').map(x=>x.text),stateControlRequirements:known('controls_state').map(x=>x.text),popularityRequirements:all.filter(x=>['neutrality','fascism','democratic','communism'].includes(x.code||'')&&!x.unknown).map(x=>x.text),weightedBranches:known('weighted-branch').length,annexation:known('annex_country').map(x=>x.text),refusalWarGoals:known('create_wargoal').map(x=>x.text)},unsupported:frequencies,coverage:c,pathSummary:review.body.pathSummary});
 }
 // Every embedded evidence path, including helpers/ideas/localization, must match the installation.
 const visit=(x:any)=>{if(!x||typeof x!=='object')return;if(x.source&&x.hash&&typeof x.source==='string'){const existing=proofs.get(x.source);assert.ok(!existing||existing===x.hash);proofs.set(x.source,x.hash);}for(const v of Object.values(x))if(typeof v==='object')visit(v);};reports.forEach(visit);
 for(const [source,expected] of proofs)assert.equal(hash(path.join(meta.root,source)),expected,source);
 const pins={schemaVersion:1,version:meta.version,launcherVersion:launcher.version,indexRevision:meta.indexRevision,executableHash:hash(path.join(meta.root,'hoi4.exe')),files:[...proofs].sort(([a],[b])=>a.localeCompare(b)).map(([source,hash])=>({source,hash}))};
 const pinPath='tests/fixtures/knowledge-path-sources-m741b.json';if(fs.existsSync(pinPath)){const p=JSON.parse(fs.readFileSync(pinPath,'utf8'));assert.equal(p.version,pins.version);assert.equal(p.indexRevision,pins.indexRevision);for(const f of p.files)assert.equal(hash(path.join(meta.root,f.source)),f.hash,f.source);}
 const output=process.env.HOI4_PATH_AUDIT_OUTPUT||'.bridge-local/m741b-audit.json';fs.writeFileSync(output,JSON.stringify({verification:'installed source and HTTP; no native/provider run',pins,reports},null,2));
 for(const r of reports)if(r.pathSummary)fs.writeFileSync(path.join(path.dirname(output),'m741b-'+r.country+'-brief.md'),renderPathBrief(r.pathSummary));
 console.log(JSON.stringify({output,pins:proofs.size,routes:reports.map(r=>({country:r.country,goal:r.goal,fields:r.fields,unsupported:r.unsupported.slice(0,8),events:r.coverage.events.length,blockers:r.coverage.policy.blockingGapCount,summary:!!r.pathSummary}))},null,2));
 }finally{await app.close();db.close();fs.rmSync(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
