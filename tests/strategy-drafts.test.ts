import {test} from 'node:test';import assert from 'node:assert/strict';
import {getStrategyDraft,editStrategyDraft,replaceStrategyDraft,discardStrategyDraft,beginStrategyWrite,acknowledgeStrategySave,getOutstandingStrategyDrafts,getPendingStrategyWrites,downloadableStrategyDraft,strategyDraftMatches,type StrategyDraftValue} from '../src/planner/strategy-drafts';
import type {AiStrategy,StrategyContent} from '../src/ai-planning-types';
import {createCloseGuard} from '../electron/close-guard';
const basis={country:'GER',tree:'fixture',startDate:'1936-01-01',indexRevision:'fixture'};
const content=():StrategyContent=>({name:'Unsaved strategy',focusIds:[],recommendations:[],secondaryObjectives:[],assumptions:[],risks:[],milestones:[],alternatives:[],unknowns:[]});
const strategy=(value:StrategyDraftValue,revision=1)=>({id:'fixture',revision,objective:value.objective,manualContext:value.manualContext,instruction:value.instruction,additionalReferences:value.extra.split('\n'),content:structuredClone(value.content!)} as AiStrategy);
test('objective and all editable inputs are isolated by campaign before any proposal exists',()=>{
 getStrategyDraft('s-a',basis);getStrategyDraft('s-b',basis);editStrategyDraft('s-a',{objective:'A objective',manualContext:'Manual A',instruction:'Keep this',extra:'definition:A'});editStrategyDraft('s-b',{objective:'B objective'});
 const a=getStrategyDraft('s-a',{...basis,tree:'different'});assert.equal(a.value.objective,'A objective');assert.equal(a.value.manualContext,'Manual A');assert.equal(a.value.instruction,'Keep this');assert.equal(a.value.extra,'definition:A');assert.equal(a.basis.tree,'fixture');assert.equal(a.dirty,true);assert.equal(getStrategyDraft('s-b',basis).value.objective,'B objective');
 discardStrategyDraft('s-a');assert.equal(getStrategyDraft('s-b',basis).dirty,true);discardStrategyDraft('s-b');
});
test('save acknowledgment advances revision without erasing newer edits, then subsequent save becomes clean',()=>{
 getStrategyDraft('s-save',basis);editStrategyDraft('s-save',{objective:'Save a strategy',content:content(),instruction:'Persist instructions',extra:'definition:A'});const submitted=structuredClone(getStrategyDraft('s-save',basis).value),finish=beginStrategyWrite('s-save');
 editStrategyDraft('s-save',{content:{...content(),name:'Newer edit'},manualContext:'Changed during save'});assert.equal(strategyDraftMatches('s-save',submitted),false);acknowledgeStrategySave('s-save',submitted,strategy(submitted,1),basis);finish();finish();
 const current=getStrategyDraft('s-save',basis);assert.equal(current.value.content?.name,'Newer edit');assert.equal(current.value.strategy?.revision,1);assert.equal(current.value.manualContext,'Changed during save');assert.equal(current.dirty,true);
 const next=structuredClone(current.value);acknowledgeStrategySave('s-save',next,strategy(next,2),basis);assert.equal(getStrategyDraft('s-save',basis).dirty,false);assert.equal(getStrategyDraft('s-save',basis).value.strategy?.revision,2);assert.equal(getPendingStrategyWrites(),0);
});
test('pending operations refuse replacement/discard, failed operation retains input, and downloads are detached',()=>{
 getStrategyDraft('s-pending',basis);editStrategyDraft('s-pending',{objective:'Keep failed draft',content:content()});const before=structuredClone(getStrategyDraft('s-pending',basis).value),finish=beginStrategyWrite('s-pending');
 assert.equal(discardStrategyDraft('s-pending'),false);assert.equal(replaceStrategyDraft('s-pending',{objective:'replacement',manualContext:'',instruction:'',extra:''},basis),false);finish();assert.deepEqual(getStrategyDraft('s-pending',basis).value,before);
 const exported=downloadableStrategyDraft(getStrategyDraft('s-pending',basis));exported.content!.name='mutated';assert.equal(getStrategyDraft('s-pending',basis).value.content?.name,'Unsaved strategy');assert.equal('key' in exported,false);assert.equal('consent' in exported,false);discardStrategyDraft('s-pending');
});
test('saved baseline restores provenance and all fields on explicit discard; unsaved generated content stays dirty',()=>{
 getStrategyDraft('s-open',basis);const value={objective:'Saved objective',manualContext:'Manual',instruction:'Instructions',extra:'definition:A',content:content()};const saved=strategy(value);assert.equal(replaceStrategyDraft('s-open',{...value,strategy:saved},basis,true),true);assert.equal(getStrategyDraft('s-open',basis).dirty,false);
 editStrategyDraft('s-open',{instruction:'Changed only instructions'});assert.equal(getStrategyDraft('s-open',basis).dirty,true);discardStrategyDraft('s-open');assert.equal(getStrategyDraft('s-open',basis).value.instruction,'Instructions');assert.equal(getStrategyDraft('s-open',basis).value.strategy?.revision,1);
 replaceStrategyDraft('s-open',{...value,strategy:saved},basis);assert.equal(getStrategyDraft('s-open',basis).dirty,true);discardStrategyDraft('s-open');
});
test('whole-strategy pending writes block close, and Stay/Review never discard cached text',async()=>{
 for(const choice of ['stay','review','discard'] as const){const id='s-close-'+choice;getStrategyDraft(id,basis);editStrategyDraft(id,{objective:'Objective-only close protection'});let closes=0,reviews=0,waiting=0;
 const guard=createCloseGuard({read:async()=>({pendingWrites:getPendingStrategyWrites(),unsavedDrafts:getOutstandingStrategyDrafts().filter(d=>d.profileId===id).length}),choose:async()=>choice,review:()=>{reviews++;},pending:async()=>{waiting++;},failed:async()=>{throw Error('Unexpected failure');},close:()=>{closes++;}});
 const finish=beginStrategyWrite(id);await guard.request();assert.equal(waiting,1);assert.equal(closes,0);finish();await guard.request();assert.equal(reviews,choice==='review'?1:0);assert.equal(closes,choice==='discard'?1:0);assert.equal(getStrategyDraft(id,basis).value.objective,'Objective-only close protection');discardStrategyDraft(id);}
});
