import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {validateProfile,startServer} from '../server/api';import {parseScript} from '../server/parser';import {evaluatePlanner} from '../server/planner/evaluate';import {reviewPlanCoverage,rankCoverageGaps,reviewProposal} from '../server/planner/coverage';import {entryMechanics,explanationPreview} from '../src/mechanics';
import {explorePaths} from '../server/planner/strategy';
import {summarizePath,renderPathBrief} from '../server/planner/path-summary';
import {treeFocuses} from '../server/domain';import {focusExclusions} from '../src/focus-structure';
import type {Entry,CampaignPlan} from '../src/types';
const profile=validateProfile({id:'coverage',country:'POR',tree:'tree',startDate:'1936-01-01',completed:[]});
const tree:Entry={uid:'tree',id:'tree',title:'Fixture tree',kind:'focus_tree',source:'fixture.txt',line:1,hash:'fixture',version:'fixture',description:'',data:{countries:['POR']}};
const focus=(id:string,script='',extra:Record<string,unknown>={}):Entry=>({...tree,uid:id,id,title:id,kind:'focus',data:{treeId:'tree',days:70,nodes:parseScript('cost=10 '+script),prerequisites:[],exclusive:[],...extra}});
const sources={version:'fixture',indexRevision:'fixture',mode:'base-game' as const,playset:'detected' as const,mods:[],warnings:[]};
const plan=(ids:string[]):CampaignPlan=>({id:'p',name:'Editable proposal',tree:'tree',startDate:'1936-01-01',items:ids.map(reference=>({reference})),assumptions:['A manual scenario, not live state']});
const review=(es:Entry[],ids=es.map(e=>e.uid),support:Entry[]=[])=>{const p=plan(ids);return reviewPlanCoverage(profile,p,es,tree,evaluatePlanner(profile,p,es,{tree}),sources,support);};

test('source-valid simple path stays editable and provisional; coverage never qualifies an optimization model',()=>{
 const es=[focus('A','completion_reward={add_political_power=10}'),focus('B','prerequisite={focus=A} completion_reward={add_stability=0.1}',{prerequisites:[['A']]})];
 const r=review(es);assert.equal(r.structuralValidity,'valid');assert.equal(r.dimensions.rewards,'reviewed');assert.equal(r.policy.provisionalAllowed,true);assert.equal(reviewProposal('optimize',r).allowed,false);assert.equal(r.policy.confidentRecommendationAllowed,false);assert.equal(r.editable,true);assert.deepEqual(r.assumptions.slice(0,1),plan([]).assumptions);
 assert.equal(review(es,['B','A']).structuralValidity,'invalid');assert.equal(review(es,['A','A']).policy.provisionalAllowed,false);
});
test('reverse exclusions veto a proposed route even when earlier availability is unknown',()=>{
 const es=[focus('A','available={has_war=yes} mutually_exclusive={focus=B}',{exclusive:['B']}),focus('B')];
 const r=review(es);assert.equal(r.structuralValidity,'invalid');assert.equal(reviewProposal('provisional',r).allowed,false);assert.ok(r.gaps.some(g=>g.dimension==='branch-conflicts'&&g.kind==='structure'));
});

test('repeated exclusion blocks survive cached derived fields and reject both political branches',()=>{
 const cached=[focus('A','mutually_exclusive={focus=B} mutually_exclusive={focus=C}',{exclusive:['B']}),focus('B'),focus('C','mutually_exclusive={focus=B} mutually_exclusive={focus=A}',{exclusive:['B']})];
 const normalized=treeFocuses(tree,cached);assert.deepEqual(normalized[0].data.exclusive,['B','C']);assert.equal(review(normalized,['A','C']).structuralValidity,'invalid');assert.equal(review(normalized,['A']).structuralValidity,'valid');
 assert.deepEqual(cached[0].data.exclusive,['B'],'read-time normalization must not mutate retained entries');assert.match(JSON.stringify(entryMechanics(cached[0]).requirements),/B, C/);
 assert.deepEqual(focusExclusions(parseScript('mutually_exclusive={} mutually_exclusive={focus=B focus=B} wrapper={mutually_exclusive={focus=C}}')),['B']);
 const malformed=treeFocuses(tree,[focus('A','mutually_exclusive=yes')]);assert.equal(review(malformed).structuralValidity,'unknown');
});
test('partial civil-war explanation preserves stability guard, scope, known siblings and explicit unknown allocation',()=>{
 const e=focus('restoration','completion_reward={if={limit={has_stability<0.4} start_civil_war={ideology=fascism size=unresolved_variable states={181}}} else={add_stability=-0.1} add_political_power=25}');
 const text=explanationPreview(entryMechanics(e).summary,10).map(x=>x.text).join('\n');assert.match(text,/less than 40% stability/);assert.match(text,/fascism civil war/);assert.match(text,/Otherwise/);assert.match(text,/25 political power/);
 const r=review([e]),gap=r.gaps.find(g=>g.category==='War, territory and diplomatic consequences');assert.ok(gap);assert.equal(gap.severity,'critical');assert.ok(gap.context.some(x=>x.includes('civil war')));assert.equal(gap.evidence[0].source,'fixture.txt');assert.ok(gap.context.some(x=>x.includes('less than 40%')));assert.equal(r.policy.rankingAllowed,false);
});
test('events hidden inside unsupported wrappers and scripts are still consequence blockers with both source references',()=>{
 const e=focus('A','completion_reward={helper=yes}',{mechanicScripts:{helper:{source:'helper.txt',hash:'helperhash',version:'fixture',line:20,nodes:parseScript('unknown_wrapper={BRA={country_event={id=test.1 hours=6}}}')}}});
 const event={...tree,uid:'event',id:'test.1',kind:'event',source:'events/test.txt',data:{nodes:[]}},p=plan(['A']);
 const r=reviewPlanCoverage(profile,p,[e],tree,evaluatePlanner(profile,p,[e]),sources,[],id=>id==='test.1'?event:undefined);
 const g=r.gaps.find(g=>g.dimension==='downstream-events')!;assert.equal(g.evidence[0].source,'helper.txt');assert.equal(g.evidence.at(-1)!.source,'events/test.txt');assert.ok(g.context.includes('BRA'));assert.equal(r.events[0].consequences,'unresolved');assert.equal(r.events[0].reference,'definition:event');
});
test('unrepresented top-level effects, dynamic costs, malformed gates and absent AST cannot pass coverage',()=>{
 const e=focus('A','select_effect={add_political_power=-50} available=yes bypass_effect={country_event=missing}');
 const r=review([e]);assert.ok(r.gaps.some(g=>g.code==='select_effect'));assert.ok(r.gaps.some(g=>g.code==='available'));assert.ok(r.gaps.some(g=>g.code==='bypass_effect'));
 const decision={...focus('decision','cost=dynamic complete_effect={add_political_power=-10}'),kind:'decision'};
 const d=review([focus('A')],['A'],[decision]);assert.ok(d.gaps.some(g=>g.dimension==='costs'));
 const missing=focus('missing');delete missing.data.nodes;assert.equal(review([missing]).structuralValidity,'unknown');
});
test('triage counts distinct definitions and plans; a rare critical consequence outranks frequent name gaps',()=>{
 const r=review([focus('A','completion_reward={country_event={id=missing}}')]);const event=r.gaps.find(g=>g.dimension==='downstream-events')!;
 const low={...event,severity:'low' as const,category:'Names',kind:'presentation' as const};
 const priority=rankCoverageGaps([{planId:'a',gaps:[event,event,...Array.from({length:50},(_,i)=>({...low,reference:'name'+i}))]},{planId:'b',gaps:[event]}]);
 assert.equal(priority[0].category,event.category);assert.equal(priority[0].affectedDefinitions,1);assert.equal(priority[0].affectedPlans,2);assert.equal(priority[0].priority,5);
});
test('HTTP proposal boundary rejects forged confidence, stale references and optimization; editable drafts survive unchanged',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-coverage-'));const app=await startServer({dataDir:dir,port:0,autoIndex:false});
 const post=async(data:unknown)=>{const r=await fetch(app.url+'/api/v1/strategy/review',{method:'POST',body:JSON.stringify(data)});return {status:r.status,value:await r.json()};};
 try{
  app.store.insert(tree);app.store.insert(focus('A','completion_reward={add_political_power=5}'));app.store.insert(focus('B','prerequisite={focus=A}',{prerequisites:[['A']]}));app.store.setSetting('meta',{version:'fixture',indexRevision:'fixture',mods:[],dlcs:[]});
  const input={schemaVersion:1,profile,plan:plan(['A','B']),supportingReferences:[],indexRevision:'fixture',intent:'provisional'};
  const ok=await post(input);assert.equal(ok.status,200);assert.equal(ok.value.coverage.structuralValidity,'valid');assert.equal(ok.value.coverage.references.length,2);
  assert.equal(ok.value.pathSummary,undefined);
  const summary=await post({...input,includePathSummary:true});assert.equal(summary.status,200);assert.equal(summary.value.pathSummary.milestones.length,2);assert.deepEqual(summary.value.pathSummary.policy,summary.value.coverage.policy);assert.equal(summary.value.pathSummary.reviewFingerprint,summary.value.coverage.reviewFingerprint);assert.equal(summary.value.pathSummary.documentedExternalStrategy.length,0);
  const restricted=await post({...input,includePathSummary:true,intent:'optimize'});assert.equal(restricted.status,422);assert.equal(restricted.value.allowed,false);assert.equal(restricted.value.pathSummary.policy.optimizationAllowed,false);
  assert.equal((await post({...input,includePathSummary:'yes'})).status,400);
  for(const intent of ['rank','optimize']){const bad=await post({...input,intent,coverage:{rankingAllowed:true},confidence:1});assert.equal(bad.status,422);assert.equal(bad.value.allowed,false);assert.equal(bad.value.coverage.policy.rankingAllowed,false);}
  assert.equal((await post({...input,plan:plan(['B','A'])})).status,422);assert.equal((await post({...input,indexRevision:'stale'})).status,409);assert.equal((await post({...input,supportingReferences:['not-a-reference']})).status,400);
  assert.equal(app.store.profile('coverage'),null);assert.deepEqual(input.plan.items.map(x=>x.reference),['A','B']);
  const changed=await post({...input,plan:{...input.plan,assumptions:['Changed scenario']}});assert.notEqual(changed.value.coverage.reviewFingerprint,ok.value.coverage.reviewFingerprint);
  app.store.saveProfile(profile,{semanticApply:true});assert.equal((await post({...input,profile:{...profile,revision:99}})).status,409);
 }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('path summary preserves scoped choice guards and exact nested evidence with visible bounds',()=>{
 const es=[focus('A','completion_reward={add_political_power=10}')],c=review(es);
 c.references[0].summary=[{text:'Only if source condition holds',status:'conditional',children:[{text:'Option: accept',code:'option',status:'conditional',evidence:[{source:'events/fixture.txt',line:22,hash:'eventhash',version:'fixture'}],children:[{text:'Recipient annexes target',code:'annex_country',role:'effect',line:25}]}]}];
 const s=summarizePath(c,es,tree);assert.deepEqual(s.policy,c.policy);assert.equal(s.verification,'source-only');assert.equal(s.milestones[0].consequences[0].evidence[0].source,'events/fixture.txt');assert.equal(s.milestones[0].consequences[0].evidence[0].line,25);assert.ok(s.milestones[0].consequences[0].appliesWhen.includes('Only if source condition holds'));assert.match(renderPathBrief(s),/Option: accept/);assert.ok(s.recommendations.every(r=>r.classification==='rules-based-inference'));
 c.references[0].summary=Array.from({length:100},()=>({text:'Option',code:'option',status:'conditional'}));const bounded=summarizePath(c,es,tree);assert.equal(bounded.branches.length,16);assert.equal(bounded.omittedBranches,84);
 const unsupported=review([focus('B','completion_reward={set_popularities={neutrality=variable} start_civil_war={ideology=fascism size=unknown}}')]);const u=summarizePath(unsupported,[focus('B')],tree);assert.ok(u.unsupported.total>0);assert.equal(u.policy.confidentRecommendationAllowed,false);assert.ok(u.recommendations.some(r=>r.text.includes('civil-war')));
});

test('briefs render prerequisite gates and propagate nested unknown guards and administrative flags',()=>{
 const es=[focus('A','available={neutrality>0.4 controls_state=9} completion_reward={if={limit={has_country_flag=test unknown_trigger=yes} add_political_power=12}}')];
 const s=summarizePath(review(es),es,tree),fact=s.milestones[0].consequences[0];
 assert.equal(fact.unresolvedContext,true);assert.match(fact.appliesWhen.join(' '),/script flag must be set/);assert.match(fact.appliesWhen.join(' '),/condition is not interpreted/);
 const rendered=renderPathBrief(s);assert.match(rendered,/more than 40%/);assert.match(rendered,/control state 9/);assert.match(rendered,/Source: fixture.txt/);
});

test('empty root prerequisite blocks match the importer and permit structural route exploration',()=>{
 const root=focus('A','prerequisite={} mutually_exclusive={}');const result=explorePaths(profile,plan([]),'A',[root],tree,null,sources);
 assert.equal(result.paths.length,1);assert.equal(result.paths[0].coverage.structuralValidity,'valid');
});

test('display-only effect tooltips cannot create fictitious event consequences or rewards',()=>{
 const e=focus('A','completion_reward={effect_tooltip={country_event={id=not_fired}} show_ideas_tooltip=spirit unlock_decision_tooltip=decision add_political_power=4}');
 const r=review([e]);assert.equal(r.events.length,0);assert.equal(r.dimensions['downstream-events'],'reviewed');assert.equal(explanationPreview(entryMechanics(e).summary).length,1);
});
test('idea modifier gaps retain the idea source instead of borrowing the focus source',()=>{
 const e=focus('A','completion_reward={add_ideas=test}',{mechanicIdeas:{test:{source:'ideas/test.txt',hash:'ideaHash',version:'fixture',line:30,modifiers:parseScript('unknown_modifier=0.1')}}});
 const gap=review([e]).gaps.find(g=>g.code==='unknown_modifier')!;assert.equal(gap.evidence[0].source,'ideas/test.txt');assert.equal(gap.evidence[0].hash,'ideaHash');
});

test('HTTP coverage exposes caller-bound event branches and invalidates downstream source changes without upgrading strategy confidence',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-event-coverage-'));const app=await startServer({dataDir:dir,port:0,autoIndex:false});
 const fixture=JSON.parse(fs.readFileSync('tests/fixtures/mechanics-events-m741.json','utf8'));
 const eventEntries=Object.entries(fixture.events).map(([id,script])=>({...tree,uid:'event-'+id,id,kind:'event',version:'fixture',source:'synthetic/events.txt',hash:'event-original',data:{nodes:parseScript(String(script)),eventType:id==='news.1'?'news_event':'country_event'}}));
 const post=async(data:unknown)=>{const r=await fetch(app.url+'/api/v1/strategy/review',{method:'POST',body:JSON.stringify(data)});return {status:r.status,value:await r.json()};};
 try{
  app.store.insert(tree);app.store.insert(focus('A','completion_reward={if={limit={has_dlc="Fixture DLC"} BRA={country_event={id=union.10 hours=6}}} else={BRA={country_event=union.11}}}'));
  eventEntries.forEach(e=>app.store.insert(e));app.store.setSetting('meta',{version:'fixture',indexRevision:'fixture',mods:[],dlcs:[]});
  const input={schemaVersion:1,profile,plan:plan(['A']),supportingReferences:[],indexRevision:'fixture',intent:'provisional',includePathSummary:true};
  const first=await post(input);assert.equal(first.status,200);const c=first.value.coverage;
  const text=JSON.stringify(c.references);assert.match(text,/annexes BRA and receives its troops/);assert.match(text,/annexation war goal against BRA/);assert.match(text,/Requires Fixture DLC/);assert.match(text,/Otherwise/);
  assert.ok(c.events.some((e:any)=>e.id==='union.12'&&e.reference));assert.ok(!c.events.some((e:any)=>e.id==='tooltip.99'));
  assert.ok(c.gaps.some((g:any)=>g.code==='ai_chance'&&g.evidence[0].source==='synthetic/events.txt'));
  assert.ok(c.gaps.some((g:any)=>g.code==='unhandled_character'&&g.context.some((x:string)=>x.includes('Option 1'))));
  assert.equal(c.policy.confidentRecommendationAllowed,false);assert.equal(c.policy.rankingAllowed,false);
  const next=eventEntries.find(e=>e.id==='union.12')!;app.store.insert({...next,hash:'event-changed'});
  const changed=await post(input);assert.notEqual(changed.value.coverage.reviewFingerprint,c.reviewFingerprint);
  const union=eventEntries.find(e=>e.id==='union.10')!;app.store.insert({...union,version:'changed-patch'});
  const mismatch=await post(input);assert.match(JSON.stringify(mismatch.value.coverage.references),/patch-mismatched/);assert.ok(!JSON.stringify(mismatch.value.coverage.references).includes('annexes'));
  assert.ok(!JSON.stringify(mismatch.value.pathSummary.milestones).includes('annexes'));assert.equal(mismatch.value.pathSummary.policy.rankingAllowed,false);
  assert.equal((await post({...input,intent:'optimize'})).status,422);
  app.store.insert({...union,uid:'event-duplicate'});
  const ambiguous=await post(input);assert.match(JSON.stringify(ambiguous.value.coverage.references),/missing or ambiguous/);assert.ok(!JSON.stringify(ambiguous.value.coverage.references).includes('annexes'));
  assert.ok(!JSON.stringify(ambiguous.value.pathSummary.branches).includes('annexes'));
 }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
