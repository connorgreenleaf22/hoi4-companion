import type {AiAttempt,AiStrategy,StrategyContent} from '../ai-planning-types';

export type StrategyDraftValue={objective:string;manualContext:string;instruction:string;extra:string;content?:StrategyContent;strategy?:AiStrategy;recovery?:AiAttempt};
export type StrategyDraftBasis={country:string;tree:string;startDate:string;indexRevision:string};
export type CachedStrategyDraft={profileId:string;value:StrategyDraftValue;baseline:StrategyDraftValue;basis:StrategyDraftBasis;pending:number;dirty:boolean};
const cache=new Map<string,CachedStrategyDraft>(),listeners=new Set<()=>void>();
let outstanding:CachedStrategyDraft[]=[];
const blank=():StrategyDraftValue=>({objective:'',manualContext:'',instruction:'',extra:''});
const editable=(value:StrategyDraftValue)=>JSON.stringify([value.objective,value.manualContext,value.instruction,value.extra,value.content]);
function publish(){outstanding=[...cache.values()].filter(d=>d.dirty);for(const listener of listeners)listener();}
export const subscribeStrategyDrafts=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getOutstandingStrategyDrafts=()=>outstanding;
export const getPendingStrategyWrites=()=>[...cache.values()].reduce((n,d)=>n+d.pending,0);
export function getStrategyDraft(profileId:string,basis:StrategyDraftBasis):CachedStrategyDraft{
 let draft=cache.get(profileId);if(!draft){const value=blank();draft={profileId,value,baseline:structuredClone(value),basis:structuredClone(basis),pending:0,dirty:false};cache.set(profileId,draft);}return draft;
}
export function editStrategyDraft(profileId:string,patch:Partial<StrategyDraftValue>){
 const d=cache.get(profileId);if(!d)throw Error('Open the strategy draft before editing.');
 const value=structuredClone({...d.value,...patch});cache.set(profileId,{...d,value,dirty:editable(value)!==editable(d.baseline)});publish();
}
/** Call only after the user has approved replacing dirty work. Pending operations cannot be replaced. */
export function replaceStrategyDraft(profileId:string,value:StrategyDraftValue,basis:StrategyDraftBasis,saved=false){
 const d=cache.get(profileId);if(!d||d.pending)return false;
 const baseline=saved?value:blank();cache.set(profileId,{...d,value:structuredClone(value),baseline:structuredClone(baseline),basis:structuredClone(basis),dirty:editable(value)!==editable(baseline)});publish();return true;
}
export function discardStrategyDraft(profileId:string){
 const d=cache.get(profileId);if(!d||d.pending)return false;
 cache.set(profileId,{...d,value:structuredClone(d.baseline),dirty:false});publish();return true;
}
/** Acknowledging a dispatched save never overwrites edits made after dispatch, even while unmounted. */
export function acknowledgeStrategySave(profileId:string,submitted:StrategyDraftValue,strategy:AiStrategy,basis:StrategyDraftBasis){
 const d=cache.get(profileId);if(!d)return;
 const baseline={...structuredClone(submitted),content:structuredClone(strategy.content),strategy:structuredClone(strategy),recovery:undefined};
 const value=editable(d.value)===editable(submitted)?baseline:{...d.value,strategy:structuredClone(strategy),recovery:undefined};
 cache.set(profileId,{...d,value,baseline,basis:structuredClone(basis),dirty:editable(value)!==editable(baseline)});publish();
}
export function beginStrategyWrite(profileId:string){
 const d=cache.get(profileId);if(!d)throw Error('Open the strategy draft before writing.');
 cache.set(profileId,{...d,pending:d.pending+1});publish();let finished=false;
 return()=>{if(finished)return;finished=true;const current=cache.get(profileId)!;cache.set(profileId,{...current,pending:current.pending-1});publish();};
}
export function strategyDraftMatches(profileId:string,submitted:StrategyDraftValue){const d=cache.get(profileId);return !!d&&editable(d.value)===editable(submitted);}
/** Deliberately excludes provider credentials, transmission consent and spending approvals. */
export const downloadableStrategyDraft=(draft:CachedStrategyDraft)=>{
 const {recovery,...value}=structuredClone(draft.value);
 return {schemaVersion:1,kind:'unsaved-whole-strategy',profileId:draft.profileId,basis:structuredClone(draft.basis),...value,...(recovery?{recovery:{requestId:recovery.requestId,status:recovery.status,content:recovery.content,problems:recovery.problems,error:recovery.error}}:{})};
};
