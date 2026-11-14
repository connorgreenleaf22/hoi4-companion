import type {Profile} from './types';

export type LabTemplateDraft={name:string;rows:{id:string;count:number|''}[];divisions:string};
export type CachedLabDraft={profileId:string;value:LabTemplateDraft;baseline:LabTemplateDraft;pending:number;dirty:boolean};
const cache=new Map<string,CachedLabDraft>(),listeners=new Set<()=>void>();
let outstanding:CachedLabDraft[]=[];
const same=(a:LabTemplateDraft,b:LabTemplateDraft)=>JSON.stringify(a)===JSON.stringify(b);
const initial=():LabTemplateDraft=>({name:'Infantry division',rows:[{id:'infantry',count:9}],divisions:'24'});
function publish(){outstanding=[...cache.values()].filter(d=>d.dirty);for(const listener of listeners)listener();}
export const subscribeLabDrafts=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getOutstandingLabDrafts=()=>outstanding;
export const getPendingLabWrites=()=>[...cache.values()].reduce((n,d)=>n+d.pending,0);
export function getLabDraft(profileId:string):CachedLabDraft{
  let value=cache.get(profileId);if(!value){const draft=initial();value={profileId,value:draft,baseline:structuredClone(draft),pending:0,dirty:false};cache.set(profileId,value);}return value;
}
function update(profileId:string,value:LabTemplateDraft,baseline=getLabDraft(profileId).baseline){
  cache.set(profileId,{...getLabDraft(profileId),value:structuredClone(value),baseline:structuredClone(baseline),dirty:!same(value,baseline)});publish();
}
export function editLabDraft(profileId:string,patch:Partial<LabTemplateDraft>){update(profileId,{...getLabDraft(profileId).value,...patch});}
export function discardLabDraft(profileId:string){const d=getLabDraft(profileId);if(d.pending)return false;update(profileId,d.baseline);return true;}
export function loadLabTemplate(profileId:string,template:NonNullable<Profile['templates']>[number]){
  const d=getLabDraft(profileId);if(d.dirty||d.pending)return false;
  const value={...d.value,name:template.name,rows:template.rows};update(profileId,value,value);return true;
}
export function acknowledgeLabSave(profileId:string,submitted:LabTemplateDraft){
  const d=getLabDraft(profileId),saved={...submitted,name:submitted.name.trim()};
  // A late save acknowledgement cannot erase edits made after dispatch.
  update(profileId,same(d.value,submitted)?saved:d.value,saved);
}
export function beginLabWrite(profileId:string){
  const d=getLabDraft(profileId);cache.set(profileId,{...d,pending:d.pending+1});publish();let finished=false;
  return()=>{if(finished)return;finished=true;const current=getLabDraft(profileId);cache.set(profileId,{...current,pending:current.pending-1});publish();};
}
export const downloadableLabDraft=(draft:CachedLabDraft)=>({schemaVersion:1,kind:'unsaved-lab-template',profileId:draft.profileId||null,...structuredClone(draft.value)});
