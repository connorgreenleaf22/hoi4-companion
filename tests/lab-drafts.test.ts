import {test} from 'node:test';import assert from 'node:assert/strict';
import {getLabDraft,getOutstandingLabDrafts,getPendingLabWrites,editLabDraft,discardLabDraft,loadLabTemplate,acknowledgeLabSave,beginLabWrite,downloadableLabDraft} from '../src/lab-drafts';
import {createCloseGuard} from '../electron/close-guard';

test('Lab drafts retain invalid editable values separately for each campaign across owner remounts',()=>{
  const rows=[{id:'infantry',count:'' as const}];editLabDraft('nav-a',{name:'A unsaved',rows,divisions:''});rows[0].id='mutated';
  editLabDraft('nav-b',{name:'B unsaved',rows:[{id:'artillery_brigade',count:2}]});
  assert.equal(getLabDraft('nav-a').value.rows[0].id,'infantry');assert.equal(getLabDraft('nav-a').value.rows[0].count,'');
  assert.equal(getLabDraft('nav-b').value.name,'B unsaved');assert.ok(getOutstandingLabDrafts().some(d=>d.profileId==='nav-a'));
  const exported=downloadableLabDraft(getLabDraft('nav-a'));exported.rows[0].id='changed download';assert.equal(getLabDraft('nav-a').value.rows[0].id,'infantry');assert.equal(exported.divisions,'');
  discardLabDraft('nav-a');assert.equal(getLabDraft('nav-a').dirty,false);assert.equal(getLabDraft('nav-b').dirty,true);discardLabDraft('nav-b');
});

test('loading another saved template refuses dirty or pending drafts until explicit discard',()=>{
  const template={name:'Legacy saved',rows:[{id:'infantry',count:8}]};editLabDraft('load',{name:'keep me'});
  assert.equal(loadLabTemplate('load',template),false);assert.equal(getLabDraft('load').value.name,'keep me');
  const finish=beginLabWrite('load');assert.equal(discardLabDraft('load'),false);finish();finish();
  assert.equal(discardLabDraft('load'),true);assert.equal(loadLabTemplate('load',template),true);template.rows[0].count=99;
  assert.equal(getLabDraft('load').value.rows[0].count,8);assert.equal(getLabDraft('load').dirty,false);
});

test('save acknowledgement normalizes the saved name without erasing newer cached edits',()=>{
  editLabDraft('save',{name:' Saved template ',rows:[{id:'infantry',count:7}]});const submitted=structuredClone(getLabDraft('save').value);
  acknowledgeLabSave('save',submitted);assert.equal(getLabDraft('save').dirty,false);assert.equal(getLabDraft('save').value.name,'Saved template');
  editLabDraft('save',{name:'earlier save'});const earlier=structuredClone(getLabDraft('save').value);const finish=beginLabWrite('save');
  editLabDraft('save',{name:'newer edit',rows:[{id:'infantry',count:''}]});acknowledgeLabSave('save',earlier);finish();
  assert.equal(getLabDraft('save').value.name,'newer edit');assert.equal(getLabDraft('save').value.rows[0].count,'');assert.equal(getLabDraft('save').dirty,true);
  discardLabDraft('save');assert.equal(getLabDraft('save').value.name,'earlier save');assert.equal(getPendingLabWrites(),0);
});

test('Lab pending writes block close; Stay and review preserve drafts; only explicit discard permits close',async()=>{
  for(const choice of ['stay','review','discard'] as const){
    const id='guard-'+choice;editLabDraft(id,{name:'Unsaved Lab'});let closes=0,reviews=0,pending=0;
    const guard=createCloseGuard({read:async()=>({pendingWrites:getPendingLabWrites(),unsavedDrafts:getOutstandingLabDrafts().filter(d=>d.profileId===id).length}),choose:async()=>choice,review:()=>{reviews++;},pending:async()=>{pending++;},failed:async()=>{throw Error('Unexpected guard failure');},close:()=>{closes++;}});
    const finish=beginLabWrite(id);await guard.request();assert.equal(closes,0);assert.equal(pending,1);finish();
    await guard.request();assert.equal(closes,choice==='discard'?1:0);assert.equal(reviews,choice==='review'?1:0);assert.equal(getLabDraft(id).value.name,'Unsaved Lab');
    assert.equal(guard.discardConfirmed(),choice==='discard');discardLabDraft(id);
  }
});
