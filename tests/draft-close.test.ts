import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCloseGuard,closeState} from '../electron/close-guard';
import {rememberPlannerDraft,getPlannerDraft,getOutstandingPlannerDrafts,discardPlannerDraft,forgetPlannerDraft,subscribePlannerDiscard,downloadablePlannerDraft,beginPlannerWrite,getPendingPlannerWrites} from '../src/planner/drafts';
import {ensurePlanner,mirrorPlanner} from '../server/planner/plans';
import type {Profile} from '../src/types';
const profile=(id:string):Profile=>mirrorPlanner({id,revision:7,name:id,country:'GER',startDate:'1936-01-01',historical:true,goals:'committed',tree:'tree',queue:['A','B'],completed:[],bookmarks:[],notes:{A:'Ω\nkeep'},dlcs:[],dlcConfirmed:false});
function scenario(choice:'stay'|'review'|'discard'='stay'){
  const events:string[]=[];let state:unknown={pendingWrites:0,unsavedDrafts:2};
  const guard=createCloseGuard({read:async()=>state,choose:async()=>{events.push('prompt');return choice;},review:()=>{events.push('review');},pending:async()=>{events.push('pending');},failed:async()=>{events.push('failed');},close:()=>{events.push('close');}});
  return {guard,events,state:(value:unknown)=>{state=value;}};
}
test('dirty drafts stay protected until explicit close choice; review never saves or closes',async()=>{
  for(const choice of ['stay','review'] as const){const s=scenario(choice);await s.guard.request();assert.deepEqual(s.events,choice==='stay'?['prompt']:['prompt','review']);assert.equal(s.guard.isApproved(),false);assert.equal(s.guard.discardConfirmed(),false);}
});
test('only explicit discard permits ignoring the renderer unload guard; clean close needs no prompt',async()=>{
  const discard=scenario('discard');await discard.guard.request();assert.deepEqual(discard.events,['prompt','close']);assert.equal(discard.guard.isApproved(),true);assert.equal(discard.guard.discardConfirmed(),true);
  const clean=scenario();clean.state({pendingWrites:0,unsavedDrafts:0});await clean.guard.request();assert.deepEqual(clean.events,['close']);assert.equal(clean.guard.discardConfirmed(),false);
});
test('in-flight campaign writes block close even if discard was selected before a write began',async()=>{
  const pending=scenario('discard');pending.state({pendingWrites:1,unsavedDrafts:1});await pending.guard.request();assert.deepEqual(pending.events,['pending']);assert.equal(pending.guard.isApproved(),false);
  let reads=0,closed=false,notified=false;const guard=createCloseGuard({read:async()=>({pendingWrites:reads++?1:0,unsavedDrafts:1}),choose:async()=>'discard',review(){},pending:async()=>{notified=true;},failed:async()=>{},close(){closed=true;}});await guard.request();assert.equal(closed,false);assert.equal(notified,true);assert.equal(guard.discardConfirmed(),false);
});
test('close attempts coalesce while the actionable dialog is open',async()=>{
  let release!:(choice:'stay')=>void,readCount=0,prompts=0;const choice=new Promise<'stay'>(resolve=>{release=resolve;});const guard=createCloseGuard({read:async()=>{readCount++;return {pendingWrites:0,unsavedDrafts:1};},choose:async()=>{prompts++;return choice;},review(){},pending:async()=>{},failed:async()=>{},close(){throw Error('Must stay.');}});const first=guard.request();await Promise.resolve();await guard.request();release('stay');await first;assert.equal(prompts,1);assert.equal(readCount,1);
});
test('failed or invalid close-state reads keep the window open; renderer veto forces a fresh prompt',async()=>{
  const invalid=scenario();invalid.state({pendingWrites:-1,unsavedDrafts:0});await invalid.guard.request();assert.deepEqual(invalid.events,['failed']);assert.equal(invalid.guard.isApproved(),false);assert.throws(()=>closeState({pendingWrites:NaN,unsavedDrafts:1}));
  const fallback=scenario();fallback.state({pendingWrites:0,unsavedDrafts:0});await fallback.guard.request();fallback.guard.blocked();await fallback.guard.request(true);assert.deepEqual(fallback.events,['close','prompt']);assert.equal(fallback.guard.isApproved(),false);
});
test('cached planner drafts from multiple campaigns remain outstanding independently of the mounted page',()=>{
  const a=profile('cache-a'),b=profile('cache-b');a.planner!.plans[0].name='Unsaved navigation draft';const snapshot={draft:a,selected:'main',baseRevision:7,view:a.planner!.view,dirty:true};rememberPlannerDraft(snapshot);rememberPlannerDraft({draft:b,selected:'main',baseRevision:7,view:b.planner!.view,dirty:false});a.planner!.plans[0].name='mutated input';assert.equal(getOutstandingPlannerDrafts().find(d=>d.draft.id==='cache-a')!.draft.planner!.plans[0].name,'Unsaved navigation draft');assert.ok(!getOutstandingPlannerDrafts().some(d=>d.draft.id==='cache-b'));assert.ok(getPlannerDraft('cache-b'));forgetPlannerDraft('cache-a');forgetPlannerDraft('cache-b');
});
test('draft download preserves invalid editable values, selected alternative, exact queue and stale revision',()=>{
  const original=profile('download');original.planner!.plans.push({...structuredClone(original.planner!.plans[0]),id:'copy',name:'',items:[{reference:'missing',legacyId:'missing'},{reference:'A',legacyId:'A'},{reference:'A',legacyId:'A'}]});const before=JSON.stringify(original);const exported=downloadablePlannerDraft({draft:original,selected:'copy',baseRevision:7,view:original.planner!.view,dirty:true});assert.equal(exported.revision,7);assert.equal(exported.planner!.activePlanId,'copy');assert.equal(exported.planner!.plans[1].name,'');assert.deepEqual(exported.queue,['missing','A','A']);assert.equal(JSON.stringify(original),before);
});
test('explicit discard targets one campaign and notifies its mounted owner without persistence',()=>{
  for(const id of ['discard-a','discard-b']){const p=profile(id);rememberPlannerDraft({draft:p,selected:'main',baseRevision:7,view:p.planner!.view,dirty:true});}const discarded:string[]=[];const stop=subscribePlannerDiscard(id=>discarded.push(id));discardPlannerDraft('discard-a');assert.deepEqual(discarded,['discard-a']);assert.equal(getPlannerDraft('discard-a'),undefined);assert.equal(getPlannerDraft('discard-b')!.dirty,true);stop();forgetPlannerDraft('discard-b');
});
test('pending direct planner writes stay tracked outside the component and release only once',()=>{
  assert.equal(getPendingPlannerWrites(),0);const finish=beginPlannerWrite();assert.equal(getPendingPlannerWrites(),1);finish();finish();assert.equal(getPendingPlannerWrites(),0);
});
