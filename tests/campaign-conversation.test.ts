import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {openStore} from '../server/store';
import {appendConversation,readConversation} from '../server/campaign-conversation';
import type {Profile} from '../src/types';
import type {AiStrategy} from '../src/ai-planning-types';

test('conversation namespace is campaign-scoped, atomic, bounded, idempotent and survives SQLite reopen',()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-conversation-'));let store=openStore(directory);
 try{
  for(const id of ['a','b'])store.saveProfile({id,name:id,country:'GER',startDate:'1936-01-01',historical:true,goals:'',dlcs:[],dlcConfirmed:false,tree:'',queue:[],completed:[],bookmarks:[],notes:{}} as Profile);
  const message={id:randomUUID(),role:'player',kind:'question',text:'Prepare for 1941'};
  const batch={profileId:'a',messages:[message]};const get=()=>undefined;
  appendConversation(store,batch,get);appendConversation(store,batch,get);
  assert.equal(readConversation(store,'a').messages.length,1);assert.equal(readConversation(store,'b').messages.length,0);
  assert.throws(()=>appendConversation(store,{...batch,messages:[{...message,text:'changed'}]},get),/different content/);
  for(const forbidden of ['key','consent','quoteFingerprint','costPreview','context'])assert.throws(()=>appendConversation(store,{...batch,[forbidden]:'excluded'},get));
  assert.throws(()=>appendConversation(store,{...batch,messages:[{...message,id:randomUUID(),strategyId:'wrong',strategyRevision:1}]},get),/unavailable/);
  assert.equal(readConversation(store,'a').messages.length,1);
  const link={id:randomUUID(),role:'system',kind:'saved',text:'Saved revision',strategyId:'strategy-a',strategyRevision:2};
  const strategy={id:'strategy-a',profileId:'a',revision:2} as AiStrategy;
  appendConversation(store,{profileId:'a',messages:[link]},(id,profile)=>id===strategy.id&&profile===strategy.profileId?strategy:undefined);
  assert.throws(()=>appendConversation(store,{profileId:'b',messages:[{...link,id:randomUUID()}]},()=>undefined),/unavailable/);
  store.db.close();store=openStore(directory);assert.equal(readConversation(store,'a').messages[1].strategyRevision,2);assert.equal(readConversation(store,'b').messages.length,0);
  assert.throws(()=>readConversation(store,'missing'),/no longer exists/);
  const value=readConversation(store,'a');value.messages=Array.from({length:160},()=>({...value.messages[0],id:randomUUID()}));store.setSetting('campaign-conversation:v1:a',value);
  assert.throws(()=>appendConversation(store,{profileId:'a',messages:[{...message,id:randomUUID()}]},get),/full/);assert.equal(readConversation(store,'a').messages.length,160);
 }finally{store.db.close();fs.rmSync(directory,{recursive:true,force:true});}
});
