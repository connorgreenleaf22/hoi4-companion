import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {startServer,validateProfile} from '../server/api';import {parseScript} from '../server/parser';
import {OpenAiPlanningProvider,providerWire,type PlanningProvider} from '../server/planner/ai-provider';
import {entryMechanics} from '../src/mechanics';import type {Entry} from '../src/types';import type {StrategyContent,AiContext} from '../src/ai-planning-types';
import {CONTEXT_LIMIT_CHARACTERS,CONTEXT_LIMIT_WIRE_BYTES} from '../server/planner/ai-context';
const content=():StrategyContent=>({name:'Fixture monarchist route',secondaryObjectives:['Build economic capacity'],focusIds:['A','B'],recommendations:[{category:'research',text:'Consider basic tools; actual research state unknown.',references:['tools'],conditions:['Inspect prerequisites and slots']},{category:'economy',text:'Keep construction adaptable.',references:[],conditions:['Manual scenario']}],assumptions:['No prior completion asserted'],risks:['Conditional civil war; allocation unknown'],milestones:['Sequential nominal timing only'],alternatives:['Different political route remains unranked'],unknowns:['Current campaign conditions']});
const tree:Entry={uid:'tree',id:'tree',title:'Fixture Portugal tree',kind:'focus_tree',source:'fixture.txt',line:1,hash:'fixture',version:'fixture',description:'',data:{countries:['POR']}};
const focus=(id:string,script='',extra:object={}):Entry=>({...tree,uid:id,id,title:id==='B'?'Monarchist restoration':id,kind:'focus',data:{treeId:'tree',days:70,nodes:parseScript('cost=10 '+script),prerequisites:[],exclusive:[],...extra}});
async function fixture(provider:PlanningProvider,fn:(v:any)=>Promise<void>){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-ai-'));let app=await startServer({dataDir:dir,port:0,autoIndex:false,aiProvider:provider});
 const post=async(route:string,body:any)=>{const r=await fetch(app.url+'/api/v1/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,value:await r.json()};};
 try{
  app.store.insert(tree);app.store.insert({...tree,uid:'idea:A',id:'A',kind:'idea'});app.store.insert(focus('A','completion_reward={add_stability=0.1}'));app.store.insert(focus('B','prerequisite={focus=A} completion_reward={if={limit={has_stability<0.4} start_civil_war={ideology=fascism size=unqualified}} country_event={id=choice.1}}',{prerequisites:[['A']]}));app.store.insert(focus('C','mutually_exclusive={focus=A}',{exclusive:['A']}));
  app.store.insert({...tree,uid:'tools',id:'tools',kind:'technology',data:{nodes:parseScript('research_cost=1 start_year=1936')}});
  app.store.insert({...tree,uid:'event',id:'choice.1',kind:'event',data:{eventType:'country_event',nodes:parseScript('option={name=join POR={annex_country={target=ROOT transfer_troops=yes}} ai_chance={factor=99}} option={name=refuse POR={create_wargoal={target=ROOT type=annex_everything}}}')}});
  app.store.setSetting('meta',{version:'fixture',indexRevision:'fixture',dlcs:[],mods:[]});
  const profile=app.store.saveProfile(validateProfile({id:'test',country:'POR',tree:'tree',notes:{private:'NEVER TRANSMIT PRIVATE NOTE'},completed:[]})).saved!;
  const input={profile,indexRevision:'fixture',objective:'Monarchist Portugal',manualContext:'Manually asserted peace',instruction:''};
  await fn({app,post,input,dir,restart:async()=>{await app.close();app=await startServer({dataDir:dir,port:0,autoIndex:false,aiProvider:provider});return app;}});
 }finally{await app.close();assert.ok(dir.startsWith(os.tmpdir()+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
}
test('unconfigured HTTP stays offline; configured fixture generation reviews, repairs, saves, reopens and preserves revisions',async()=>{
 let calls=0;const provider:PlanningProvider={name:'fixture-not-a-model',async generate(ctx){calls++;assert.ok(!JSON.stringify(ctx).includes('PRIVATE NOTE'));assert.equal(ctx.manualContext,'Manually asserted peace');return {content:content(),usage:{input:100,output:200}};}};
 await fixture(provider,async({app,post,input,dir})=>{
  assert.match((await post('ai/generate',input)).value.error,/unconfigured/);assert.equal(calls,0);
  for(const intent of ['rank','optimize'])assert.notEqual((await post('ai/review',{...input,intent,content:content()})).status,200);
  const configured=await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'test-secret',maxOutputTokens:1000});assert.equal(configured.value.configured,true);assert.ok(!JSON.stringify(configured).includes('test-secret'));
  const ctx=(await post('ai/context',input)).value;assert.ok(ctx.references.some((r:any)=>r.id==='choice.1'));assert.ok(JSON.stringify(ctx).includes('event recipient'));
  const request={...input,contextFingerprint:ctx.fingerprint,quoteFingerprint:ctx.quoteFingerprint,overThresholdApproved:true,requestId:randomUUID(),disclosureAccepted:true};
  assert.notEqual((await post('ai/generate',{...request,contextFingerprint:'old'})).status,200);assert.equal(calls,0);
  const generated=await post('ai/generate',request);assert.equal(generated.status,200,JSON.stringify(generated.value));const draft=generated.value.strategy;assert.ok(draft,JSON.stringify(generated.value));
  assert.equal(draft.provider.name,'fixture-not-a-model');assert.equal(draft.review.coverage.structuralValidity,'valid');assert.equal(draft.review.coverage.policy.rankingAllowed,false);assert.ok(draft.review.coverage.gaps.some((g:any)=>g.code==='start_civil_war'));assert.ok(draft.repairs.length);assert.equal(draft.classification,'provisional');
  assert.notEqual((await post('ai/generate',request)).status,200);assert.equal(calls,1);
  const saved=await post('ai/save',{...input,id:draft.id,expectedRevision:0,content:draft.content});assert.equal(saved.status,200);assert.equal(saved.value.revision,1);
  const rows=await fetch(app.url+'/api/v1/ai/strategies?profile=test').then(r=>r.json());assert.equal(rows[0].content.name,draft.content.name);
  assert.notEqual((await post('ai/save',{...input,id:draft.id,expectedRevision:0,content:draft.content})).status,200);
  const edited={...draft.content,name:'Edited economy',risks:['User revision retained']};const second=await post('ai/save',{...input,id:draft.id,expectedRevision:1,content:edited});assert.equal(second.value.revision,2);
  const evaluations=await fetch(app.url+'/api/v1/ai/evaluations?profile=test').then(r=>r.json());assert.ok(evaluations.some((e:any)=>e.strategy?.content.risks.includes('User revision retained')));
  assert.equal(app.store.profile('test').queue.length,0);assert.ok(!fs.readFileSync(path.join(dir,'companion.sqlite')).includes(Buffer.from('test-secret')));
  assert.equal((await post('ai/clear',{})).value.configured,false);
 });
});
test('fabricated IDs, wrong reference kinds, outside-tree paths, malformed output and stale sources cannot become proposals',async()=>{
 let output:any=content();await fixture({name:'fixture',async generate(){return {content:output};}},async({post,input,app})=>{
  await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'test-key',maxOutputTokens:1000});
  for(const invalid of [{...content(),focusIds:['invented']},{...content(),rank:'best'},'{malformed}',{...content(),recommendations:[{category:'research',text:'wrong kind',references:['A'],conditions:[]}]}]){
   input.instruction=JSON.stringify(invalid);const ctx=(await post('ai/context',input)).value;output=invalid;const r=await post('ai/generate',{...input,contextFingerprint:ctx.fingerprint,quoteFingerprint:ctx.quoteFingerprint,overThresholdApproved:true,requestId:randomUUID(),disclosureAccepted:true});assert.equal(r.status,200);assert.ok(!r.value.strategy);assert.ok(['failed','needs-correction'].includes(r.value.attempt.status));
  }
  app.store.setSetting('meta',{version:'changed',indexRevision:'changed',dlcs:[],mods:[]});assert.notEqual((await post('ai/context',input)).status,200);
 });
});
test('invalid ordering and exclusions remain editable but reject route adoption; observations never supply missing completions',async()=>{
 await fixture({name:'fixture',async generate(){return {content:content()};}},async({post,input})=>{
  for(const focusIds of [['B','A'],['A','C'],['B']]){const result=await post('ai/save',{...input,id:randomUUID(),expectedRevision:0,content:{...content(),focusIds}});assert.equal(result.status,200);assert.equal(result.value.review.allowed,false);assert.equal(result.value.review.coverage.structuralValidity,'invalid');}
 });
});
test('cancellation blocks adoption and concurrent generation; retrying a request ID does not spend twice',async()=>{
 await fixture({name:'fixture',generate:(_ctx,_cfg,signal)=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled'))))},async({post,input})=>{
  await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'test-key',maxOutputTokens:1000});const ctx=(await post('ai/context',input)).value;
  const req={...input,contextFingerprint:ctx.fingerprint,quoteFingerprint:ctx.quoteFingerprint,overThresholdApproved:true,requestId:randomUUID(),disclosureAccepted:true};const pending=post('ai/generate',req);
  await new Promise(r=>setTimeout(r,30));assert.notEqual((await post('ai/generate',{...req,requestId:randomUUID()})).status,200);await post('ai/cancel',{});assert.equal((await pending).value.attempt.status,'failed');assert.notEqual((await post('ai/generate',req)).status,200);
 });
});
test('real OpenAI transport uses bounded strict schema, private key header, store false and explicit failure paths',async()=>{
 const ctx={} as AiContext,config={key:'secret',model:'test-model',maxOutputTokens:1000};
 const transport:typeof fetch=async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.max_output_tokens,1000);assert.equal((init?.headers as any).Authorization,'Bearer secret');assert.equal(init?.redirect,'error');assert.ok(!JSON.stringify(body).includes('secret'));return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(content())}]}],usage:{input_tokens:1,output_tokens:2}}));};
 assert.equal((await new OpenAiPlanningProvider(transport).generate(ctx,config,new AbortController().signal)).usage?.output,2);
 await assert.rejects(new OpenAiPlanningProvider(async()=>new Response('SECRET NEVER ECHO',{status:401})).generate(ctx,config,new AbortController().signal),e=>!String(e).includes('SECRET NEVER ECHO'));
 for(const data of [{status:'incomplete'},{status:'completed',output:[{content:[{type:'refusal'}]}]}])assert.ok((await new OpenAiPlanningProvider(async()=>new Response(JSON.stringify(data))).generate(ctx,config,new AbortController().signal)).error);
});
test('event option explanations preserve conditional recipients, refusal siblings and unqualified weights',()=>{
 const e:Entry={...tree,kind:'event',data:{eventType:'country_event',nodes:parseScript('option={name=accept POR={annex_country={target=ROOT transfer_troops=yes}} ai_chance={factor=99}} option={name=refuse add_political_power=10 unsupported_effect=yes}')}};
 const summary=JSON.stringify(entryMechanics(e).summary);assert.match(summary,/event recipient/);assert.match(summary,/10 political power/);assert.match(summary,/unsupported_effect/);assert.match(summary,/not qualified probabilities/);assert.match(summary,/Option 2/);
});


test('recoverable partial proposal retains usage/cost, repairs locally, and deduplicates across UUIDs',async()=>{
 let calls=0;await fixture({name:'offline',async generate(){calls++;return {content:{...content(),focusIds:['A','missing'],name:'test-secret must be redacted'},metadata:{model:'gpt-6.1-sol',serviceTier:'default',completionStatus:'completed',usage:{input:1000,cachedInput:400,cacheWrite:100,output:200,reasoning:100}}};}},async({post,input,app})=>{
  await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'test-secret',maxOutputTokens:1000});
  const ctx=(await post('ai/context',input)).value,request={...input,contextFingerprint:ctx.fingerprint,quoteFingerprint:ctx.quoteFingerprint,overThresholdApproved:true,disclosureAccepted:true,requestId:randomUUID()};
  const result=(await post('ai/generate',request)).value;assert.equal(result.attempt.status,'needs-correction');assert.equal(result.attempt.metadata.usage.reasoning,100);assert.equal(result.attempt.cost.usd,.00329);assert.equal(result.attempt.problems[0].reference,'missing');assert.ok(!JSON.stringify(result).includes('test-secret'));
  const fresh=(await post('ai/context',input)).value;assert.match((await post('ai/generate',{...request,requestId:randomUUID(),quoteFingerprint:fresh.quoteFingerprint})).value.error,/already attempted/);assert.equal(calls,1);
  const saved=await post('ai/save',{...input,id:request.requestId,expectedRevision:0,content:{...result.attempt.content,focusIds:['A','B']}});assert.equal(saved.status,200);assert.equal(saved.value.origin,'provider');assert.equal(saved.value.review.coverage.policy.rankingAllowed,false);assert.equal(saved.value.content.focusIds[0],'definition:A');
  const configured=await fetch(app.url+'/api/v1/ai/config').then(r=>r.json());assert.equal(configured.budget.estimatedUsd,.00329);assert.equal(configured.budget.unknownRequests,0);
  assert.equal(calls,1);
 });
});
test('request ceiling, session budget, warning confirmation and stale quote refuse before dispatch',async()=>{
 let calls=0;await fixture({name:'offline',async generate(){calls++;return {content:content()};}},async({post,input,app})=>{
  await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'fixture',maxOutputTokens:1000});
  const config=await fetch(app.url+'/api/v1/ai/config').then(r=>r.json());const {provider,configured,busy,budget,...settings}=config;
  for(const change of [{requestCeilingUsd:.0001},{sessionBudgetUsd:.0001},{confirmationThresholdUsd:0}]){
   await post('ai/settings',{...settings,...change});const ctx=(await post('ai/context',input)).value;
   const r=await post('ai/generate',{...input,contextFingerprint:ctx.fingerprint,quoteFingerprint:ctx.quoteFingerprint,requestId:randomUUID(),disclosureAccepted:true});assert.notEqual(r.status,200);assert.equal(calls,0);
  }
 });
});


test('source change after dispatch retains structured response and usage without adopting it',async()=>{
 let mutate=()=>{};await fixture({name:'offline',async generate(){mutate();return {content:content(),metadata:{model:'gpt-6.1-sol',serviceTier:'default',completionStatus:'completed',usage:{input:100,output:50}}};}},async({post,input,app})=>{
  mutate=()=>app.store.setSetting('meta',{indexRevision:'new',version:'new',dlcs:[],mods:[]});await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'test-secret',maxOutputTokens:1000});const ctx=(await post('ai/context',input)).value;
  const result=(await post('ai/generate',{...input,contextFingerprint:ctx.fingerprint,quoteFingerprint:ctx.quoteFingerprint,overThresholdApproved:true,requestId:randomUUID(),disclosureAccepted:true})).value;
  assert.equal(result.attempt.status,'needs-correction');assert.ok(result.attempt.content);assert.ok(result.attempt.cost.usd>0);assert.ok(!result.strategy);assert.match(result.attempt.error,/Source index changed/);
  assert.notEqual((await post('ai/save',{...input,indexRevision:'new',id:result.attempt.requestId,expectedRevision:0,content:result.attempt.content})).status,200);
 });
});
test('unknown usage holds reservation and prevents spending the remaining session budget',async()=>{
 let calls=0;await fixture({name:'offline',async generate(){calls++;throw Error('fixture transport failure');}},async({post,input,app,restart})=>{
  await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'test-secret',maxOutputTokens:1000});let ctx=(await post('ai/context',input)).value;
  const config=await fetch(app.url+'/api/v1/ai/config').then(r=>r.json());const {provider,configured,busy,budget,...settings}=config;
  await post('ai/settings',{...settings,sessionBudgetUsd:ctx.costPreview.reservedUsd+.00001});ctx=(await post('ai/context',input)).value;
  const r=(await post('ai/generate',{...input,contextFingerprint:ctx.fingerprint,quoteFingerprint:ctx.quoteFingerprint,overThresholdApproved:true,requestId:randomUUID(),disclosureAccepted:true})).value;assert.equal(r.attempt.status,'failed');assert.equal(r.attempt.cost.usd,null);
  const after=await fetch(app.url+'/api/v1/ai/config').then(r=>r.json());assert.equal(after.budget.heldUsd,ctx.costPreview.reservedUsd);assert.equal(after.budget.unknownRequests,1);
  const reopened=await restart();const persisted=await fetch(reopened.url+'/api/v1/ai/config').then(r=>r.json());assert.equal(persisted.configured,false);assert.equal(persisted.budget.heldUsd,after.budget.heldUsd);assert.equal(persisted.budget.sessionId,after.budget.sessionId);await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'test-secret',maxOutputTokens:1000});
  input.instruction='Different request';ctx=(await post('ai/context',input)).value;const next=await post('ai/generate',{...input,contextFingerprint:ctx.fingerprint,quoteFingerprint:ctx.quoteFingerprint,overThresholdApproved:true,requestId:randomUUID(),disclosureAccepted:true});assert.match(next.value.error,/Session budget/);assert.equal(calls,1);
 });
});


test('outgoing context preserves source requirements, costs, years and explicit interpretation gaps',async()=>{
 await fixture({name:'offline-never-called',async generate(){throw Error('Provider must not be called');}},async({post,input,app})=>{
  app.store.insert(focus('B','available={has_government=neutrality OR={has_stability>0.4 has_war_support>0.5}} completion_reward={add_stability=0.1 unsupported_reward=yes\n unsupported_reward=no}',{prerequisites:[['A']]}));
  app.store.insert({...tree,uid:'decision',id:'POR_monarchist_fixture',title:'Monarchist fixture',kind:'decision',data:{nodes:parseScript('cost=25 available={has_government=neutrality} complete_effect={add_political_power=5}')}});
  const ctx=(await post('ai/context',input)).value;
  const b=ctx.references.find((r:any)=>r.id==='B'),tech=ctx.references.find((r:any)=>r.id==='tools'),decision=ctx.references.find((r:any)=>r.id==='POR_monarchist_fixture');
  assert.match(JSON.stringify(b.requirements),/Government must match/);assert.match(JSON.stringify(b.requirements),/At least one|Any of/i);assert.match(JSON.stringify(b.requirements),/40%|40 percent/);assert.match(JSON.stringify(b.requirements),/unsupported: has_war_support/);
  assert.match(JSON.stringify(b.costsAndTiming),/70 nominal days/);assert.match(JSON.stringify(tech.costsAndTiming),/1,936/);assert.match(JSON.stringify(decision.costsAndTiming),/25 political power/);
  assert.match(JSON.stringify(b.interpretationGaps),/unsupported_reward/);assert.equal(b.interpretationGaps.find((g:any)=>g.code==='unsupported_reward').locations.length,2);assert.match(JSON.stringify(b.summary),/10 percentage points/);
 });
});


test('outgoing uncertainty locations retain helper provenance and nearer idea provenance',async()=>{
 await fixture({name:'offline-never-called',async generate(){throw Error('Provider must not be called');}},async({post,input,app})=>{
  app.store.insert(focus('B','completion_reward={fixture_helper=yes}',{mechanicScripts:{fixture_helper:{nodes:parseScript('unsupported_reward=yes add_ideas=fixture_spirit'),source:'common/scripted_effects/fixture.txt',line:11,hash:'helper-hash',version:'helper-version'}},mechanicIdeas:{fixture_spirit:{modifiers:parseScript('unsupported_modifier=0.1'),source:'common/ideas/fixture.txt',line:21,hash:'idea-hash',version:'idea-version'}}}));
  const ctx=(await post('ai/context',input)).value,b=ctx.references.find((r:any)=>r.id==='B');
  assert.deepEqual(b.interpretationGaps.find((g:any)=>g.code==='unsupported_reward').locations,[{source:'common/scripted_effects/fixture.txt',line:1,hash:'helper-hash',version:'helper-version'}]);
  assert.deepEqual(b.interpretationGaps.find((g:any)=>g.code==='unsupported_modifier').locations,[{source:'common/ideas/fixture.txt',line:1,hash:'idea-hash',version:'idea-version'}]);
 });
});


test('manual save retains revision instructions and expanded references in stored strategy and legacy saves remain valid',async()=>{
 await fixture({name:'offline',async generate(){throw Error('No provider call authorized');}},async({post,input,app})=>{
  const id=randomUUID();const saved=await post('ai/save',{...input,id,expectedRevision:0,instruction:'Retain these revision instructions',additionalReferences:['definition:tools'],content:content()});assert.equal(saved.status,200);assert.equal(saved.value.instruction,'Retain these revision instructions');assert.deepEqual(saved.value.additionalReferences,['definition:tools']);
  const rows=await fetch(app.url+'/api/v1/ai/strategies?profile='+encodeURIComponent(input.profile.id)).then(r=>r.json());assert.equal(rows.find((s:any)=>s.id===id).instruction,'Retain these revision instructions');assert.deepEqual(rows.find((s:any)=>s.id===id).additionalReferences,['definition:tools']);
  const stored=JSON.parse(String(app.store.db.prepare('SELECT payload FROM ai_strategies WHERE id=?').get(id).payload));assert.deepEqual(stored.additionalReferences,['definition:tools']);
  const legacy=await post('ai/save',{...input,id,expectedRevision:1,content:content()});assert.equal(legacy.status,200);assert.deepEqual(legacy.value.additionalReferences,[]);
 });
});

test('source preview measures exact escaped UTF-8 provider wire and drops only whole optional groups',async()=>{
 let calls=0;await fixture({name:'offline',async generate(){calls++;return {content:content()};}},async({post,input,app})=>{
  app.store.insert({...focus('huge'),title:'Military infantry '+'Ω'.repeat(110000)});
  app.store.insert({...focus('small','prerequisite={focus=A} completion_reward={add_stability=0.1}',{prerequisites:[['A']]}),title:'Military "quoted" infantry \\ Ω 日本語'});
  const request={...input,objective:'Military infantry research production'};const result=await post('ai/context',request);assert.equal(result.status,200);const ctx=result.value as AiContext;
  const {fingerprint,contextBudget,costPreview,quoteFingerprint,budget,settings,...sourceEnvelope}=ctx;assert.ok(contextBudget);assert.equal(contextBudget.policyVersion,'dependency-groups-v1');
  const bytes=Buffer.byteLength(JSON.stringify(providerWire(ctx,settings!)));assert.equal(bytes,contextBudget.wireBytes);assert.equal(JSON.stringify(sourceEnvelope).length,contextBudget.sourceCharacters);
  assert.equal(contextBudget.limitCharacters,CONTEXT_LIMIT_CHARACTERS);assert.equal(contextBudget.limitWireBytes,CONTEXT_LIMIT_WIRE_BYTES);assert.ok(bytes<=CONTEXT_LIMIT_WIRE_BYTES);assert.ok(contextBudget.sourceCharacters<=CONTEXT_LIMIT_CHARACTERS);
  assert.ok(contextBudget.omittedGroups.some(g=>g.reference==='definition:huge'&&g.reason==='payload-budget'));assert.ok(!ctx.references.some(r=>r.id==='huge'));
  const small=ctx.references.find(r=>r.id==='small')!;assert.equal(small.title,'Military "quoted" infantry \\ Ω 日本語');assert.deepEqual(small.prerequisites,[['A']]);assert.equal(small.hash,'fixture');assert.ok(small.costsAndTiming?.some(t=>t.includes('70 nominal days')));assert.ok(ctx.references.some(r=>r.id==='A'));assert.ok(ctx.references.some(r=>r.kind==='technology'));
  assert.ok(bytes>JSON.stringify(providerWire(ctx,settings!)).length);assert.equal(costPreview?.conservativeInputTokens,bytes+512);assert.equal(calls,0);
  await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'fixture',maxOutputTokens:1000});
  const mandatory=await post('ai/context',{...request,additionalReferences:['definition:huge']});assert.equal(mandatory.status,400);assert.match(mandatory.value.error,/Required source context exceeds.*180,000-byte.*Remove additional references/);assert.match(mandatory.value.error,/\d+ characters; \d+ UTF-8 bytes; \d+ required definitions/);
  const blocked=await post('ai/generate',{...request,additionalReferences:['definition:huge'],requestId:randomUUID(),disclosureAccepted:true});assert.equal(blocked.status,400);assert.equal(calls,0);assert.equal(app.store.db.prepare('SELECT COUNT(*) n FROM ai_evaluations').get().n,0);
 });
});

test('changed mandatory selection invalidates the approved fingerprint and quote before dispatch',async()=>{
 let calls=0;await fixture({name:'offline',async generate(){calls++;return {content:content()};}},async({post,input,app})=>{
  app.store.insert({...tree,uid:'extra',id:'unrelated_extra',title:'Additional declaration',kind:'idea'});await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'fixture',maxOutputTokens:1000});
  const first=(await post('ai/context',input)).value,changedInput={...input,additionalReferences:['definition:extra']},second=(await post('ai/context',changedInput)).value;
  assert.notEqual(first.fingerprint,second.fingerprint);assert.notEqual(first.quoteFingerprint,second.quoteFingerprint);assert.ok(second.references.some((r:any)=>r.reference==='definition:extra'));
  const result=await post('ai/generate',{...changedInput,contextFingerprint:first.fingerprint,quoteFingerprint:first.quoteFingerprint,requestId:randomUUID(),disclosureAccepted:true,overThresholdApproved:true});assert.equal(result.status,400);assert.match(result.value.error,/Preview and approve/);assert.equal(calls,0);assert.equal(app.store.db.prepare('SELECT COUNT(*) n FROM ai_evaluations').get().n,0);
 });
});

test('saved revision references remain mandatory and oversized prior proposal refuses without dropping its content',async()=>{
 let calls=0;await fixture({name:'offline',async generate(){calls++;return {content:content()};}},async({post,input,app})=>{
  const id=randomUUID(),saved=await post('ai/save',{...input,id,expectedRevision:0,content:content()});assert.equal(saved.status,200);
  const context=await post('ai/context',{...input,parentId:id,objective:'A different military objective'});assert.equal(context.status,200);assert.deepEqual(context.value.previousProposal,saved.value.content);assert.ok(['A','B','tools'].every(id=>context.value.references.some((r:any)=>r.id===id)));assert.ok(context.value.contextBudget.mandatoryReferences>=4);
  const large={...content(),secondaryObjectives:Array(20).fill('x'.repeat(2000)),risks:Array(20).fill('x'.repeat(2000)),milestones:Array(20).fill('x'.repeat(2000)),alternatives:Array(20).fill('x'.repeat(2000)),unknowns:Array(20).fill('x'.repeat(2000))};
  const revision=await post('ai/save',{...input,id,expectedRevision:1,content:large});assert.equal(revision.status,200);await post('ai/config',{provider:'openai',model:'gpt-6.1-sol',key:'fixture',maxOutputTokens:1000});
  const oversized=await post('ai/context',{...input,parentId:id});assert.equal(oversized.status,400);assert.match(oversized.value.error,/smaller saved strategy/);assert.deepEqual(app.store.db.prepare('SELECT payload FROM ai_strategies WHERE id=?').get(id).payload,JSON.stringify(revision.value));
  const blocked=await post('ai/generate',{...input,parentId:id,requestId:randomUUID(),disclosureAccepted:true});assert.equal(blocked.status,400);assert.equal(calls,0);
 });
});

test('the exact final-wire byte boundary is admitted and one additional mandatory byte refuses',async()=>{
 await fixture({name:'offline-never-called',async generate(){throw Error('Provider must not be called');}},async({post,input,app})=>{
  app.store.db.prepare('DELETE FROM entries WHERE uid<>?').run(tree.uid);
  const padding={...tree,uid:'padding',id:'padding',kind:'idea' as const,title:'x'};app.store.insert(padding);const request={...input,additionalReferences:['definition:padding']};
  const probe=await post('ai/context',request);assert.equal(probe.status,200);const paddingLength=CONTEXT_LIMIT_WIRE_BYTES-probe.value.contextBudget.wireBytes+1;assert.ok(paddingLength>0);
  app.store.insert({...padding,title:'x'.repeat(paddingLength)});const boundary=await post('ai/context',request);assert.equal(boundary.status,200);assert.equal(boundary.value.contextBudget.wireBytes,CONTEXT_LIMIT_WIRE_BYTES);
  app.store.insert({...padding,title:'x'.repeat(paddingLength+1)});const overflow=await post('ai/context',request);assert.equal(overflow.status,400);assert.match(overflow.value.error,/No required reference was dropped/);
 });
});
