import {api} from '../api';
import type {CampaignConversation,CampaignMessage} from '../campaign-types';
type MessageInput=Omit<CampaignMessage,'createdAt'>;
type State={value?:CampaignConversation;pending:MessageInput[][];writing:boolean;error:string};
const states=new Map<string,State>(),listeners=new Set<()=>void>();
let version=0;
function publish(){version++;for(const listener of listeners)listener();}
export const subscribeConversations=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const conversationVersion=()=>version;
export const getConversation=(id:string)=>{if(!states.has(id))states.set(id,{pending:[],writing:false,error:''});return states.get(id)!;};
export const pendingConversationWrites=()=>[...states.values()].reduce((n,s)=>n+(s.writing?1:0),0);
export const outstandingConversations=()=>[...states.entries()].filter(([,s])=>s.pending.length).map(([profileId,s])=>({profileId,...s}));
export const unsavedConversationCount=()=>outstandingConversations().length;
export function discardConversation(id:string){const s=getConversation(id);if(s.writing)return false;s.pending=[];s.error='';publish();return true;}
export async function loadConversation(id:string){const s=getConversation(id);try{const v=await api<CampaignConversation>('campaign/conversation?profile='+encodeURIComponent(id));if(!s.value||v.revision>=s.value.revision){s.value=v;publish();}}catch(e){s.error='Conversation could not be loaded. '+String(e);publish();}}
export async function flushConversation(id:string){
 const s=getConversation(id);if(s.writing)return;s.writing=true;s.error='';publish();
 try{while(s.pending.length){const batch=s.pending[0];s.value=await api<CampaignConversation>('campaign/conversation',{profileId:id,messages:batch});s.pending.shift();publish();}}
 catch(e){s.error='Conversation is kept in this window but could not be saved. '+String(e);}
 finally{s.writing=false;publish();}
}
export async function appendMessages(id:string,messages:Omit<MessageInput,'id'>[]){const s=getConversation(id);s.pending.push(messages.map(m=>({...m,id:crypto.randomUUID()})));publish();await flushConversation(id);}
