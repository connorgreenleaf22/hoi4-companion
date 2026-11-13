import {test} from 'node:test';import assert from 'node:assert/strict';
import {normalizeStrategy,StrategyReferenceError} from '../server/planner/ai-resolution';
import {usageCost,costPreview} from '../server/planner/ai-cost';
import {selectContext} from '../server/planner/ai-context';
import {OpenAiPlanningProvider,providerWire} from '../server/planner/ai-provider';
import type {Entry,Profile} from '../src/types';import type {StrategyContent,AiSource,AiContext} from '../src/ai-planning-types';
const e=(uid:string,id:string,kind='focus',treeId='POR'):Entry=>({uid,id,kind:kind as Entry['kind'],title:'Same name',description:'',source:'fixture.txt',line:1,hash:'hash',version:'fixture',data:{treeId,prerequisites:[],exclusive:[]}});
const content=(ids=['POR_estado_novo']):StrategyContent=>({name:'Offline',focusIds:ids,secondaryObjectives:[],recommendations:[],assumptions:[],risks:[],milestones:[],alternatives:[],unknowns:[]});
const source=(e:Entry)=>({reference:'definition:'+e.uid,id:e.id,kind:e.kind,hash:e.hash,version:e.version}) as AiSource;
test('canonical and raw IDs share kind/tree/disclosure contract; titles never resolve',()=>{
 const f=e('focus:POR','POR_estado_novo'),idea=e('idea:POR','POR_estado_novo','idea'),foreign=e('focus:GER','POR_estado_novo','focus','GER');
 const entries=[f,idea,foreign];assert.equal(normalizeStrategy(content(),entries,[f],[source(f)]).content.focusIds[0],'definition:focus:POR');
 assert.equal(normalizeStrategy(content(['definition:focus:POR']),entries,[f],[source(f)]).repairs.length,0);
 for(const [ref,reason] of [['Same name','missing-or-stale'],['definition:idea:POR','wrong-kind'],['definition:focus:GER','different-tree'],['invented','missing-or-stale']])assert.throws(()=>normalizeStrategy(content([ref]),entries,[f],[source(f)]),(err:any)=>err instanceof StrategyReferenceError&&err.problems[0].reason===reason);
 const sibling=e('focus:override','POR_estado_novo');assert.throws(()=>normalizeStrategy(content(),[...entries,sibling],[f,sibling],[source(f)]),(err:any)=>err.problems[0].reason==='ambiguous'&&err.problems[0].candidates.length===4);
 assert.throws(()=>normalizeStrategy(content(),entries,[f],[]),(err:any)=>err.problems[0].reason==='not-disclosed');
 assert.throws(()=>normalizeStrategy(content(),entries,[f],[{...source(f),hash:'old'}]),(err:any)=>err.problems[0].reason==='stale-source');
});
test('usage prices cache subsets and reasoning once; unknown or inconsistent counters retain uncertainty',()=>{
 assert.equal(usageCost('gpt-6.1-sol','default',{input:1000,cachedInput:400,cacheWrite:100,output:200,reasoning:100}).usd,.00329);
 assert.equal(usageCost('gpt-6.1-sol','default',{input:1000,cachedInput:400,cacheWrite:100,output:200,reasoning:0}).usd,.00329);
 for(const usage of [undefined,{input:1000},{input:1,output:2,reasoning:3},{input:1,output:1,cachedInput:2}])assert.equal(usageCost('gpt-6.1-sol','default',usage).usd,null);
 assert.equal(usageCost('unpriced','default',{input:1,output:1}).usd,null);assert.equal(usageCost('gpt-6.1-sol','unknown',{input:1,output:1}).usd,null);
 assert.ok(usageCost('gpt-6.1-sol','default',{input:1000,output:200}).reason.includes('conservatively'));
});
test('retrieval retains OR ancestors, exclusions and event chain; avoids irrelevant filler',()=>{
 const tree=e('tree','POR','focus_tree'),a=e('a','root'),b=e('b','other-root'),goal=e('goal','monarchy'),excluded=e('excluded','alternative'),irrelevant=e('irrelevant','unrelated');
 goal.data.prerequisites=[['root','other-root']];goal.data.exclusive=['alternative'];goal.data.nodes=[{key:'country_event',value:[{key:'id',value:'choice.1',line:1}],line:1}];
 const event=e('event','choice.1','event');const result=selectContext([tree,a,b,goal,excluded,irrelevant,event],tree,[a,b,goal,excluded,irrelevant],{country:'POR',startDate:'1936-01-01'} as Profile,'Monarchy',[]);
 assert.deepEqual(new Set(result.chosen.map(e=>e.uid)),new Set(['tree','a','b','goal','excluded','event']));assert.ok(result.omissions.length);
});
test('incomplete/malformed/refused transport outputs preserve usage, model, tier and status without retries',async()=>{
 for(const output of [[],[{content:[{type:'refusal'}]}],[{content:[{type:'output_text',text:JSON.stringify(content())}]}]]){
  let calls=0;const provider=new OpenAiPlanningProvider(async()=>{calls++;return new Response(JSON.stringify({model:'gpt-6.1-sol',service_tier:'default',status:'incomplete',output,usage:{input_tokens:100,output_tokens:50,input_tokens_details:{cached_tokens:20,cache_write_tokens:10},output_tokens_details:{reasoning_tokens:30}}}));});
  const result=await provider.generate({} as AiContext,{key:'fixture',model:'gpt-6.1-sol',maxOutputTokens:1000},new AbortController().signal);assert.equal(calls,1);assert.equal(result.metadata?.usage?.reasoning,30);assert.equal(result.metadata?.completionStatus,'incomplete');assert.ok(result.error);
 }
 const a={disclosure:'policy',references:[],sources:{},objective:'A',manualContext:''} as unknown as AiContext,b={...a,objective:'B',fingerprint:'different',budget:{}} as AiContext;
 const config={model:'gpt-6.1-sol',maxOutputTokens:1000};assert.deepEqual(providerWire(a,config).input[0],providerWire(b,config).input[0]);
});
