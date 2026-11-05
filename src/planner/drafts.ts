import type {PlannerView,Profile} from '../types';

export type CachedPlannerDraft={draft:Profile;selected:string;baseRevision:number;view:PlannerView;dirty:boolean};
const cache=new Map<string,CachedPlannerDraft>();
const listeners=new Set<()=>void>();const discardListeners=new Set<(id:string,current?:Profile)=>void>();
let outstanding:CachedPlannerDraft[]=[];
let pendingWrites=0;
export const getPendingPlannerWrites=()=>pendingWrites;
export function beginPlannerWrite(){pendingWrites++;publish();let done=false;return()=>{if(!done){done=true;pendingWrites--;publish();}};}
function publish(){outstanding=[...cache.values()].filter(value=>value.dirty);for(const listener of listeners)listener();}
export const getPlannerDraft=(id:string)=>cache.get(id);
export const getOutstandingPlannerDrafts=()=>outstanding;
export const subscribePlannerDrafts=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const subscribePlannerDiscard=(listener:(id:string,current?:Profile)=>void)=>{discardListeners.add(listener);return()=>{discardListeners.delete(listener);};};
export function rememberPlannerDraft(value:CachedPlannerDraft){
  const previous=cache.get(value.draft.id);if(previous&&JSON.stringify(previous)===JSON.stringify(value))return;
  cache.set(value.draft.id,structuredClone(value));publish();
}
export function forgetPlannerDraft(id:string){if(cache.delete(id))publish();}
/** Explicit discard is renderer-only. No profile save or reference operation occurs. */
export function discardPlannerDraft(id:string,current?:Profile){forgetPlannerDraft(id);for(const listener of discardListeners)listener(id,current);}
/** Preserve invalid editable values and the original revision in a downloadable draft. */
export function downloadablePlannerDraft(value:CachedPlannerDraft):Profile{
  const result=structuredClone(value.draft);const planner=result.planner,plan=planner?.plans.find(p=>p.id===value.selected);
  if(planner&&plan){planner.activePlanId=plan.id;result.tree=plan.tree;result.queue=plan.items.map(i=>i.legacyId??i.reference);result.startDate=plan.startDate;}
  return result;
}
