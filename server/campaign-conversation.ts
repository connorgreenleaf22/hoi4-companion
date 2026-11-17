import {z} from 'zod';
import type {Store} from './store';
import type {AiStrategy} from '../src/ai-planning-types';
import type {CampaignConversation} from '../src/campaign-types';

const message=z.object({id:z.string().uuid(),role:z.enum(['player','advisor','system']),kind:z.enum(['question','context','advice','saved']),text:z.string().trim().min(1).max(6500),strategyId:z.string().max(100).optional(),strategyRevision:z.number().int().positive().optional()}).strict();
export const conversationAppendSchema=z.object({profileId:z.string().min(1).max(100),messages:z.array(message).min(1).max(4)}).strict();
const namespace=(id:string)=>'campaign-conversation:v1:'+id;
export function readConversation(store:Store,profileId:string):CampaignConversation{
 if(!store.profile(profileId))throw Error('Campaign no longer exists.');
 return store.getSetting(namespace(profileId),{schemaVersion:1,profileId,revision:0,messages:[]} as CampaignConversation);
}
/** One additive settings namespace; append-only batches are atomic and retry-idempotent. */
export function appendConversation(store:Store,input:unknown,getStrategy:(id:string,profileId:string)=>AiStrategy|undefined):CampaignConversation{
 const {profileId,messages}=conversationAppendSchema.parse(input);
 store.db.exec('BEGIN IMMEDIATE');
 try{
  const value=readConversation(store,profileId);
  for(const item of messages){
   if(!!item.strategyId!==!!item.strategyRevision)throw Error('A strategy link requires both identity and revision.');
   if(item.strategyId){const strategy=getStrategy(item.strategyId,profileId);if(!strategy||item.strategyRevision!>strategy.revision)throw Error('Strategy revision is unavailable in this campaign.');}
   const old=value.messages.find(m=>m.id===item.id);
   if(old){const {createdAt,...previous}=old;if(JSON.stringify(previous)!==JSON.stringify(item))throw Error('Conversation message ID already has different content.');continue;}
   value.messages.push({...item,createdAt:new Date().toISOString()});
  }
  if(value.messages.length>160)throw Error('Conversation is full (160 entries). Saved strategies remain available; download the conversation before continuing in a new campaign.');
  value.revision++;store.setSetting(namespace(profileId),value);store.db.exec('COMMIT');return value;
 }catch(e){store.db.exec('ROLLBACK');throw e;}
}
