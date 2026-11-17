import {test} from 'node:test';import assert from 'node:assert/strict';
import {appendMessages,flushConversation,getConversation,pendingConversationWrites,loadConversation,unsavedConversationCount,discardConversation} from '../src/campaign/conversation';

test('failed and delayed conversation writes retain batches and campaign ownership without persisting approval data',async()=>{
 const original=globalThis.fetch;const sent:any[]=[];let release!:()=>void;const delay=new Promise<void>(resolve=>release=resolve);let fail=true;
 globalThis.fetch=async(_url,init)=>{
  const payload=JSON.parse(String(init?.body));sent.push(payload);
  if(payload.profileId==='campaign-a'&&fail){await delay;return Response.json({error:'fixture unavailable'},{status:503});}
  return Response.json({schemaVersion:1,profileId:payload.profileId,revision:1,messages:payload.messages.map((m:any)=>({...m,createdAt:'fixture'}))});
 };
 try{
  const pending=appendMessages('campaign-a',[{role:'player',kind:'question',text:'A objective'}]);
  await appendMessages('campaign-b',[{role:'player',kind:'question',text:'B objective'}]);
  assert.equal(getConversation('campaign-b').value?.messages[0].text,'B objective');assert.equal(pendingConversationWrites(),1);
  release();await pending;assert.equal(getConversation('campaign-a').pending[0][0].text,'A objective');assert.match(getConversation('campaign-a').error,/could not be saved/);assert.equal(pendingConversationWrites(),0);assert.equal(unsavedConversationCount(),1);
  fail=false;await flushConversation('campaign-a');assert.equal(pendingConversationWrites(),0);assert.equal(sent[0].messages[0].id,sent[2].messages[0].id);
  assert.deepEqual(Object.keys(sent[0]).sort(),['messages','profileId']);assert.deepEqual(Object.keys(sent[0].messages[0]).sort(),['id','kind','role','text']);
  assert.equal(getConversation('campaign-a').value?.profileId,'campaign-a');assert.equal(getConversation('campaign-b').value?.profileId,'campaign-b');
  // A slow initial GET cannot overwrite a newer write acknowledgement.
  let resolveGet!:(r:Response)=>void;globalThis.fetch=()=>new Promise<Response>(r=>resolveGet=r);const loading=loadConversation('campaign-a');
  resolveGet(Response.json({schemaVersion:1,profileId:'campaign-a',revision:0,messages:[]}));await loading;assert.equal(getConversation('campaign-a').value?.messages[0].text,'A objective');
 }finally{globalThis.fetch=original;}
});
