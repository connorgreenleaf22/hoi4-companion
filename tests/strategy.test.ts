import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {explorePaths,compareStrategies,planningSources} from '../server/planner/strategy';
import {validateProfile,startServer} from '../server/api';
import {ensurePlanner} from '../server/planner/plans';
import {evaluateRequirements} from '../server/planner/requirements';
import {conditionState} from '../src/planner/condition-state';
import {parseScript} from '../server/parser';
import {inspectEnvironment} from '../server/bridge/environment';
import type {Entry,CampaignPlan,Meta} from '../src/types';

const profile=validateProfile({id:'strategy',country:'GER',tree:'tree',startDate:'1936-01-01',completed:[],notes:{old:'preserve'}});
const tree:Entry={uid:'tree',id:'tree',title:'Test tree',kind:'focus_tree',source:'fixture.txt',line:1,hash:'test',version:'fixture',description:'',data:{countries:['GER']}};
const e=(id:string,prerequisites:string[][]=[],extra:Record<string,unknown>={}):Entry=>({...tree,uid:'focus:'+id,id,title:id,kind:'focus',data:{treeId:'tree',days:7,prerequisites,exclusive:[],...extra}});
const plan:CampaignPlan={id:'a',name:'A',tree:'tree',startDate:profile.startDate,items:[],assumptions:[]};
const sources={version:'fixture',indexRevision:'fixture',mode:'base-game' as const,playset:'unavailable' as const,mods:[],warnings:[]};
const run=(catalog:Entry[],goal:string,p=profile)=>explorePaths(p,plan,goal,catalog,tree,null,sources);

test('AND rows, OR branches and shared dependencies produce distinct topological routes',()=>{
 const catalog=[e('ROOT'),e('A',[['ROOT']]),e('B',[['ROOT']]),e('C',[['ROOT']]),e('GOAL',[['A','B'],['C']])];
 const before=JSON.stringify(catalog);const result=run(catalog,'GOAL');
 assert.deepEqual(result.paths.map(p=>p.items.map(i=>i.legacyId)),[['ROOT','A','C','GOAL'],['ROOT','B','C','GOAL']]);
 assert.equal(result.paths[0].report.totalDays,28);assert.equal(JSON.stringify(catalog),before);assert.deepEqual(profile.completed,[]);
 assert.deepEqual(run(catalog,'GOAL',{...profile,completed:['ROOT']}).paths[0].items.map(i=>i.legacyId),['A','C','GOAL']);
});
test('reverse exclusions prune incompatible combinations and manual completed branches',()=>{
 const catalog=[e('A',[],{exclusive:['B']}),e('B'),e('GOAL',[['A'],['B']])];
 assert.equal(run(catalog,'GOAL').paths.length,0);assert.match(run(catalog,'GOAL').diagnostics.join(' '),/mutually exclusive/);
 assert.equal(run(catalog,'B',{...profile,completed:['A']}).paths.length,0);
});
test('unknown conditions and bypass remain conditional; literal DLC rejection is retained',()=>{
 const catalog=[e('A',[],{nodes:parseScript('available={has_war=yes} bypass={always=yes}')})];
 const step=run(catalog,'A').paths[0].report.steps[0];assert.equal(step.reachability,'unknown');assert.equal(step.days,7);assert.ok(step.requirements.some(r=>r.role==='bypass'&&r.truth==='yes'));
 assert.equal(conditionState(evaluateRequirements(parseScript('always=yes'),profile)),'satisfied');
 assert.equal(conditionState(evaluateRequirements(parseScript('always=no'),profile)),'unsatisfied');
 assert.equal(conditionState(evaluateRequirements(parseScript('has_completed_focus=missing'),profile)),'unknown');
 assert.equal(conditionState(evaluateRequirements(parseScript('GER={has_completed_focus=A}'),profile)),'unsupported');
 assert.equal(evaluateRequirements(parseScript('has_dlc=test'),profile,{dlcAvailability:{test:'no'}}).truth,'no');
});
test('missing, ambiguous, cyclic and dynamic prerequisites do not yield invented routes',()=>{
 assert.equal(run([e('A',[['missing']])],'A').paths.length,0);
 assert.equal(run([e('A'),{...e('A'),uid:'duplicate'}],'A').paths.length,0);
 assert.equal(run([e('A',[['B']]),e('B',[['A']])],'A').paths.length,0);
 assert.equal(run([e('A',[],{nodes:parseScript('prerequisite={ scripted_branch=yes }')})],'A').paths.length,0);
 assert.equal(run([{...e('A'),kind:'joint_focus'}],'A').paths.length,0);
 const many=Array.from({length:40},(_,i)=>e('A'+i));const result=run([...many,e('GOAL',[many.map(e=>e.id)])],'GOAL');assert.equal(result.paths.length,32);assert.equal(result.truncated,true);
});
test('comparison uses exact definitions, exposes branch conflicts and does not invent rewards',()=>{
 const catalog=[e('ROOT'),e('A',[],{exclusive:['B'],effects:'add_political_power = 10'}),e('B')];
 const plans=[{...plan,items:[{reference:'ROOT'},{reference:'A'}]},{...plan,id:'b',name:'B',items:[{reference:'ROOT'},{reference:'B'}]}];
 const result=compareStrategies(profile,plans,()=>({tree,focuses:catalog}),null,sources);
 assert.deepEqual(result.shared,['focus:ROOT']);assert.deepEqual(result.conflicts,[{left:'A',right:'B'}]);assert.deepEqual(result.plans.map(p=>p.unique),[['focus:A'],['focus:B']]);assert.equal(result.plans[0].rewards[1].script,'add_political_power = 10');
 assert.throws(()=>compareStrategies(profile,[plan,plan],()=>({tree,focuses:catalog}),null,sources));
});
test('detected mods and unavailable launcher selection never become merged-source authority',()=>{
 const env=inspectEnvironment(path.join(os.tmpdir(),'hoi4-absent-game'),path.join(os.tmpdir(),'hoi4-absent-user'));
 const result=planningSources({mods:['mod/changed.mod']} as Meta,env);assert.equal(result.mode,'base-game');assert.equal(result.playset,'unavailable');assert.match(result.warnings.join(' '),/not merged/);
});
test('strategy API checks revisions, isolates profiles, reads references and retains alternatives after restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-strategy-'));let app=await startServer({dataDir:dir,port:0,autoIndex:false});
 const request=async(route:string,body?:unknown)=>{const r=await fetch(app.url+'/api/v1/'+route,{method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});return {status:r.status,body:await r.json()};};
 try{
  app.store.insert(tree);app.store.insert(e('A'));app.store.insert(e('B',[['A']]));
  app.store.insert({...e('GER_test'),kind:'decision',data:{nodes:parseScript('visible={tag=GER} available={has_war=yes} cost=50 complete_effect={add_stability=0.1}')}});
  app.store.insert({...e('tech_test'),kind:'technology',data:{nodes:parseScript('research_cost=1 start_year=1936')}});
  app.store.setSetting('meta',{version:'fixture',indexRevision:'fixture',dlcs:[],mods:[]});
  const p={...profile,planner:ensurePlanner(profile)};p.planner.plans=[{...plan,items:[{reference:'A'}]},{...plan,id:'b',name:'B',items:[{reference:'A'},{reference:'B'}]}];p.planner.activePlanId='a';
  const saved=app.store.saveProfile(p,{semanticApply:true}).saved!;
  assert.equal((await request('strategy/paths',{profile:saved,plan,goal:'B',indexRevision:'old'})).status,409);
  const routes=await request('strategy/paths',{profile:saved,plan,goal:'B',indexRevision:'fixture'});assert.equal(routes.status,200);assert.equal(routes.body.paths[0].items.length,2);
  assert.equal((await request('strategy/compare',{profile:saved,planIds:['a','missing'],indexRevision:'fixture'})).status,400);
  const decisions=await request('strategy/references?profile=strategy&kind=decision&scope=country');assert.equal(decisions.body.total,1);assert.equal(decisions.body.entries[0].conditions[0].result.truth,'unknown');
  assert.equal((await request('strategy/references?profile=strategy&kind=technology')).body.total,1);
  assert.equal((await request('strategy/references?profile=missing&kind=technology')).status,400);
  await app.close();app=await startServer({dataDir:dir,port:0,autoIndex:false});
  const result=await request('strategy/compare',{profile:saved,planIds:['a','b'],indexRevision:'fixture'});assert.equal(result.status,200);assert.equal(result.body.shared.length,1);assert.equal(app.store.profile('strategy')!.notes.old,'preserve');assert.deepEqual(app.store.profile('strategy')!.completed,[]);
 }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
