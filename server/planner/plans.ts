import type {CampaignPlan, PlannerState, Profile} from '../../src/types';
import {defaultPlannerView,validateCampaignPlan,validatePlanner} from './validation';

/** Reading a legacy campaign is a projection only; it does not upgrade or mutate its payload. */
export function ensurePlanner(profile:Profile):PlannerState {
  if(profile.planner)return validatePlanner(profile.planner);
  return validatePlanner({schemaVersion:3,activePlanId:'main',plans:[{id:'main',name:'Main',tree:profile.tree,items:profile.queue.map(reference=>({reference,legacyId:reference})),startDate:profile.startDate,assumptions:[],...(profile.referenceIndexRevision?{referenceIndexRevision:profile.referenceIndexRevision}:{})}],checklists:[],view:defaultPlannerView()});
}
/** The planner namespace is canonical. The legacy fields are one atomic compatibility mirror. */
export function mirrorPlanner(profile:Profile):Profile {
  const planner=ensurePlanner(profile);const active=planner.plans.find(p=>p.id===planner.activePlanId)!;
  return {...structuredClone(profile),planner,tree:active.tree,queue:active.items.map(i=>i.legacyId??i.reference),startDate:active.startDate,exportSchemaVersion:3};
}
function getPlan(planner:PlannerState,id:string):CampaignPlan{const plan=planner.plans.find(p=>p.id===id);if(!plan)throw new Error('Plan no longer exists.');return plan;}
export function copyPlan(planner:PlannerState,sourceId:string,newId:string,name:string):PlannerState {
  const result=validatePlanner(planner);const source=getPlan(result,sourceId);
  if(result.plans.some(p=>p.id===newId))throw new Error('Plan ID already exists.');
  result.plans.push(validateCampaignPlan({...source,id:newId,name}));return validatePlanner(result);
}
export function renamePlan(planner:PlannerState,id:string,name:string):PlannerState {
  const result=validatePlanner(planner);const source=getPlan(result,id);const changed=validateCampaignPlan({...source,name});
  result.plans=result.plans.map(p=>p.id===id?changed:p);return result;
}
export function activatePlan(planner:PlannerState,id:string):PlannerState {
  const result=validatePlanner(planner);getPlan(result,id);return {...result,activePlanId:id};
}
export function deletePlan(planner:PlannerState,id:string,replacementId?:string):PlannerState {
  const result=validatePlanner(planner);getPlan(result,id);
  if(result.plans.length===1)throw new Error('Keep at least one campaign plan.');
  if(result.activePlanId===id){if(!replacementId||replacementId===id)throw new Error('Review and choose a replacement before deleting the active plan.');getPlan(result,replacementId);result.activePlanId=replacementId;}
  result.plans=result.plans.filter(p=>p.id!==id);return result;
}
/** A comparison draft does not select, save or evaluate either alternative. */
export function comparePlans(left:CampaignPlan,right:CampaignPlan){
  const a=validateCampaignPlan(left),b=validateCampaignPlan(right);const key=(i:{reference:string})=>i.reference;
  let commonPrefix=0;while(commonPrefix<Math.min(a.items.length,b.items.length)&&key(a.items[commonPrefix])===key(b.items[commonPrefix]))commonPrefix++;
  const counts=(items:CampaignPlan['items'])=>{const result=new Map<string,number>();for(const item of items)result.set(key(item),(result.get(key(item))||0)+1);return result;};
  const difference=(from:CampaignPlan['items'],other:CampaignPlan['items'])=>{const remaining=counts(other);return from.filter(i=>{const n=remaining.get(key(i))||0;if(n){remaining.set(key(i),n-1);return false;}return true;});};
  return {left:a,right:b,commonPrefix,firstDifference:commonPrefix<a.items.length||commonPrefix<b.items.length?commonPrefix:null,leftOnly:difference(a.items,b.items),rightOnly:difference(b.items,a.items),treeChanged:a.tree!==b.tree,startDateChanged:a.startDate!==b.startDate};
}
export function setChecklistItem(planner:PlannerState,checklistId:string,itemId:string,checked:boolean):PlannerState {
  const result=validatePlanner(planner);const list=result.checklists.find(c=>c.id===checklistId);if(!list)throw new Error('Checklist no longer exists.');
  const item=list.items.find(i=>i.id===itemId);if(!item)throw new Error('Checklist item no longer exists.');if(typeof checked!=='boolean')throw new Error('Invalid checklist tick.');item.checked=checked;return result;
}
