import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {startServer,validateProfile} from '../server/api';import {parseScript} from '../server/parser';
import {OpenAiPlanningProvider,type PlanningProvider} from '../server/planner/ai-provider';
import {entryMechanics} from '../src/mechanics';import type {Entry} from '../src/types';import type {StrategyContent,AiContext} from '../src/ai-planning-types';
const content=():StrategyContent=>({name:'Fixture monarchist route',secondaryObjectives:['Build economic capacity'],focusIds:['A','B'],recommendations:[{category:'research',text:'Consider basic tools; actual research state unknown.',references:['tools'],conditions:['Inspect prerequisites and slots']},{category:'economy',text:'Keep construction adaptable.',references:[],conditions:['Manual scenario']}],assumptions:['No prior completion asserted'],risks:['Conditional civil war; allocation unknown'],milestones:['Sequential nominal timing only'],alternatives:['Different political route remains unranked'],unknowns:['Current campaign conditions']});
const tree:Entry={uid:'tree',id:'tree',title:'Fixture Portugal tree',kind:'focus_tree',source:'fixture.txt',line:1,hash:'fixture',version:'fixture',description:'',data:{countries:['POR']}};
const focus=(id:string,script='',extra:object={}):Entry=>({...tree,uid:id,id,kind:'focus',data:{treeId:'tree',days:70,nodes:parseScript('cost=10 '+script),prerequisites:[],exclusive:[],...extra}});
async function fixture(provider:PlanningProvider,fn:(v:any)=>Promise<void>){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-ai-'));const app=await startServer({dataDir:dir,port:0,autoIndex:false,aiProvider:provider});
 const post=async(route:string,body:any)=>{const r=await fetch(app.url+'/api/v1/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,value:await r.json()};};
 try{
  app.store.insert(tree);app.store.insert(focus('A','completion_reward={add_stability=0.1}'));app.store.insert(focus('B','prerequisite={focus=A} completion_reward={if={limit={has_stability<0.4} start_civil_war={ideology=fascism size=unqualified}} country_event={id=choice.1}}',{prerequisites:[['A']]}));app.store.insert(focus('C','mutually_exclusive={focus=A}',{exclusive:['A']}));
  app.store.insert({...tree,uid:'tools',id:'tools',kind:'technology',data:{nodes:parseScript('research_cost=1 start_year=1936')}});
  app.store.insert({...tree,uid:'event',id:'choice.1',kind:'event',data:{eventType:'country_event',nodes:parseScript('option={name=join POR={annex_country={target=ROOT transfer_troops=yes}} ai_chance={factor=99}} option={name=refuse POR={create_wargoal={target=ROOT type=annex_everything}}}')}});
  app.store.setSetting('meta',{version:'fixture',indexRevision:'fixture',dlcs:[],mods:[]});
  const profile=app.store.saveProfile(validateProfile({id:'test',country:'POR',tree:'tree',notes:{private:'NEVER TRANSMIT PRIVATE NOTE'},completed:[]})).saved!;
  const input={profile,indexRevision:'fixture',objective:'Monarchist Portugal',manualContext:'Manually asserted peace',instruction:''};
  await fn({app,post,input,dir});
 }finally{await app.close();assert.ok(dir.startsWith(os.tmpdir()+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
}
test('unconfigured HTTP stays offline; configured fixture generation reviews, repairs, saves, reopens and preserves revisions',async()=>{
 let calls=0;const provider:PlanningProvider={name:'fixture-not-a-model',async generate(ctx){calls++;assert.ok(!JSON.stringify(ctx).includes('PRIVATE NOTE'));assert.equal(ctx.manualContext,'Manually asserted peace');return {content:content(),usage:{input:100,output:200}};}};
 await fixture(provider,async({app,post,input,dir})=>{
  assert.match((await post('ai/generate',input)).value.error,/unconfigured/);assert.equal(calls,0);
  for(const intent of ['rank','optimize'])assert.notEqual((await post('ai/review',{...input,intent,content:content()})).status,200);
  const configured=await post('ai/config',{provider:'openai',model:'fixture',key:'test-secret',maxOutputTokens:1000});assert.equal(configured.value.configured,true);assert.ok(!JSON.stringify(configured).includes('test-secret'));
  const ctx=(await post('ai/context',input)).value;assert.ok(ctx.references.some((r:any)=>r.id==='choice.1'));assert.ok(JSON.stringify(ctx).includes('event recipient'));
  const request={...input,contextFingerprint:ctx.fingerprint,requestId:randomUUID(),disclosureAccepted:true};
  assert.notEqual((await post('ai/generate',{...request,contextFingerprint:'old'})).status,200);assert.equal(calls,0);
  const generated=await post('ai/generate',request);assert.equal(generated.status,200,JSON.stringify(generated.value));const draft=generated.value;
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
  await post('ai/config',{provider:'openai',model:'fixture',key:'test-key',maxOutputTokens:1000});
  const ctx=(await post('ai/context',input)).value;
  for(const invalid of [{...content(),focusIds:['invented']},{...content(),rank:'best'},'{malformed}',{...content(),recommendations:[{category:'research',text:'wrong kind',references:['A'],conditions:[]}]}]){
   output=invalid;const r=await post('ai/generate',{...input,contextFingerprint:ctx.fingerprint,requestId:randomUUID(),disclosureAccepted:true});assert.notEqual(r.status,200);
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
  await post('ai/config',{provider:'openai',model:'fixture',key:'test-key',maxOutputTokens:1000});const ctx=(await post('ai/context',input)).value;
  const req={...input,contextFingerprint:ctx.fingerprint,requestId:randomUUID(),disclosureAccepted:true};const pending=post('ai/generate',req);
  await new Promise(r=>setTimeout(r,30));assert.notEqual((await post('ai/generate',{...req,requestId:randomUUID()})).status,200);await post('ai/cancel',{});assert.notEqual((await pending).status,200);assert.notEqual((await post('ai/generate',req)).status,200);
 });
});
test('real OpenAI transport uses bounded strict schema, private key header, store false and explicit failure paths',async()=>{
 const ctx={} as AiContext,config={key:'secret',model:'test-model',maxOutputTokens:1000};
 const transport:typeof fetch=async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.max_output_tokens,1000);assert.equal((init?.headers as any).Authorization,'Bearer secret');assert.equal(init?.redirect,'error');assert.ok(!JSON.stringify(body).includes('secret'));return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(content())}]}],usage:{input_tokens:1,output_tokens:2}}));};
 assert.equal((await new OpenAiPlanningProvider(transport).generate(ctx,config,new AbortController().signal)).usage?.output,2);
 for(const response of [new Response('SECRET NEVER ECHO',{status:401}),new Response(JSON.stringify({status:'incomplete'})),new Response(JSON.stringify({status:'completed',output:[{content:[{type:'refusal'}]}]}))])await assert.rejects(new OpenAiPlanningProvider(async()=>response).generate(ctx,config,new AbortController().signal),e=>!String(e).includes('SECRET NEVER ECHO'));
});
test('event option explanations preserve conditional recipients, refusal siblings and unqualified weights',()=>{
 const e:Entry={...tree,kind:'event',data:{eventType:'country_event',nodes:parseScript('option={name=accept POR={annex_country={target=ROOT transfer_troops=yes}} ai_chance={factor=99}} option={name=refuse add_political_power=10 unsupported_effect=yes}')}};
 const summary=JSON.stringify(entryMechanics(e).summary);assert.match(summary,/event recipient/);assert.match(summary,/10 political power/);assert.match(summary,/unsupported_effect/);assert.match(summary,/not qualified probabilities/);assert.match(summary,/Option 2/);
});
