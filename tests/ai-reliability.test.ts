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

test('budget packing rejects a large optional group atomically and still admits a smaller relevant group',()=>{
 const tree=e('tree','GER','focus_tree'),large={...e('a-large','military_infantry'),title:'Military infantry '+ 'x'.repeat(1000)},small={...e('b-small','military'),title:'Military'},parent={...e('parent','parent'),title:'Parent'};
 large.data.prerequisites=[['parent']];
 const entries=[tree,large,small,parent],profile={country:'GER',startDate:'1936-01-01'} as Profile;
 const fits=(value:{chosen:Entry[]})=>value.chosen.reduce((n,e)=>n+e.title.length,0)<=100;
 const result=selectContext(entries,tree,[large,small,parent],profile,'Military infantry',[],{fits});
 assert.ok(result.chosen.some(e=>e.uid==='b-small'));assert.ok(!result.chosen.some(e=>['a-large','parent'].includes(e.uid)));
 assert.deepEqual(result.omittedGroups,[{reference:'definition:a-large',reason:'payload-budget'}]);assert.equal(result.mandatoryReferences,1);assert.equal(result.selectedGroups,1);
 assert.throws(()=>selectContext(entries,tree,[large,small,parent],profile,'Military infantry',['definition:a-large'],{fits}),/Required source context exceeds.*Remove additional references/);
});

test('mandatory focus references use corrected tree clones and preserve cyclic OR ancestors and reverse exclusions',()=>{
 const tree=e('tree','GER','focus_tree'),raw=e('a','goal'),b=e('b','parent'),c=e('c','other-parent'),excluded=e('x','excluded'),ancestor=e('d','excluded-parent'),reverse=e('y','reverse');
 const corrected={...raw,data:{...raw.data,prerequisites:[['parent','other-parent']],exclusive:['excluded']}};
 b.data.prerequisites=[['goal']];excluded.data.prerequisites=[['excluded-parent']];reverse.data.exclusive=['parent'];
 const canonicalLookingRaw=e('alias','definition:a','technology');
 const entries=[tree,raw,b,c,excluded,ancestor,reverse,canonicalLookingRaw],focuses=[corrected,b,c,excluded,ancestor,reverse];
 const result=selectContext(entries,tree,focuses,{country:'GER',startDate:'1936-01-01'} as Profile,'No relevant objective',['definition:a']);
 assert.deepEqual(result.chosen.find(e=>e.uid==='a')?.data.exclusive,['excluded']);assert.equal(result.mandatoryReferences,7);
 assert.ok(['a','b','c','x','d','y'].every(uid=>result.chosen.some(e=>e.uid===uid)));assert.ok(!result.chosen.some(e=>e.uid==='alias'));
});

test('budget selection is insertion-order independent and reports ambiguous prerequisites instead of choosing one',()=>{
 const tree=e('tree','GER','focus_tree'),a=e('a','military'),b=e('b','military_second'),d1=e('d1','duplicate'),d2=e('d2','duplicate');a.data.prerequisites=[['duplicate']];
 const entries=[tree,a,b,d1,d2],focuses=[a,b,d1,d2],profile={country:'GER',startDate:'1936-01-01'} as Profile,options={fits:(value:{chosen:Entry[]})=>value.chosen.length<=2};
 const left=selectContext(entries,tree,focuses,profile,'Military',[],options),right=selectContext([...entries].reverse(),tree,[...focuses].reverse(),profile,'Military',[],options);
 assert.deepEqual(left,right);assert.ok(left.omissions.some(x=>x.includes('Unresolved prerequisite duplicate')));assert.ok(!left.chosen.some(e=>['d1','d2'].includes(e.uid)));
 const noFocus=selectContext(entries,tree,focuses,profile,'Military',[],{fits:value=>value.chosen.length===1});assert.ok(noFocus.omissions.some(x=>x.includes('No objective-matched focus dependency group fits')));
});

test('dependency traversal remains bounded for long cycles and wide event-source node arrays',()=>{
 const tree=e('tree','GER','focus_tree'),chain=Array.from({length:1025},(_,i)=>e('f'+i,'focus'+i));chain.forEach((f,i)=>{f.data.prerequisites=[['focus'+((i+1)%chain.length)]];});
 assert.throws(()=>selectContext([tree,...chain],tree,chain,{country:'GER',startDate:'1936-01-01'} as Profile,'No match',['definition:f0']),/dependency limit/);
 const wide=e('wide','military'),event=e('event','choice.1','event');wide.data.nodes=[{key:'wrapper',value:Array.from({length:150000},()=>({key:'country_event',value:'choice.1',line:1})),line:1}];
 const result=selectContext([tree,wide,event],tree,[wide],{country:'GER',startDate:'1936-01-01'} as Profile,'Military',[]);assert.ok(result.chosen.some(e=>e.uid==='event'));assert.ok(result.omissions.some(x=>x.includes('scan limit')));
});

test('retrieval diversity considers research before large focus groups can starve its budget',()=>{
 const tree=e('tree','GER','focus_tree'),large={...e('a','military_infantry'),title:'Military infantry '+ 'x'.repeat(80)},small={...e('b','military'),title:'Military'},tech={...e('tech','infantry_research','technology'),title:'Infantry research'};
 const result=selectContext([tree,large,small,tech],tree,[large,small],{country:'GER',startDate:'1936-01-01'} as Profile,'Military infantry research',[],{fits:value=>value.chosen.reduce((n,e)=>n+e.title.length,0)<=110});
 assert.ok(result.chosen.some(e=>e.uid==='tech'));assert.ok(result.chosen.some(e=>e.uid==='b'));assert.ok(!result.chosen.some(e=>e.uid==='a'));
});

test('reverse-conflict traversal is deterministic even when a bounded event closure is saturated',()=>{
 const tree=e('tree','GER','focus_tree'),a=e('a','military'),b=e('b','branch-b'),c=e('c','branch-c'),events:Entry[]=[];
 for(const branch of [b,c]){branch.data.exclusive=['military'];branch.data.nodes=Array.from({length:13},(_,i)=>({key:'country_event',value:branch.uid+i,line:1}));events.push(...Array.from({length:13},(_,i)=>e(branch.uid+i,branch.uid+i,'event')));}
 const entries=[tree,a,b,c,...events],profile={country:'GER',startDate:'1936-01-01'} as Profile;
 const left=selectContext(entries,tree,[a,b,c],profile,'Military',[]),right=selectContext([...entries].reverse(),tree,[c,b,a],profile,'Military',[]);
 assert.deepEqual(left,right);assert.equal(left.chosen.filter(e=>e.kind==='event').length,24);assert.ok(left.omissions.some(x=>x.includes('Event closure limit')));
});
