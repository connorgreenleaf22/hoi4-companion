import type {CampaignPlan,CapturedChecklist,Entry,Evidence,PlannerReport,RequirementResult,ResolutionStatus} from '../../src/types';
import {validateCampaignPlan,validateChecklist} from './validation';

export type ChecklistCaptureContext={indexRevision:string;gameVersion:string;appVersion:string;createdAt?:string;id?:string;name?:string;actualCompleted?:string[]};
const uniqueSources=(sources:Evidence[])=>[...new Map(sources.map(s=>[JSON.stringify(s),s])).values()];
function requirementSources(requirements:RequirementResult[]):Evidence[]{return requirements.flatMap(r=>[...(r.source?[r.source]:[]),...requirementSources(r.children)]);}
/** Captures an answer. Later source changes never overwrite this text or its evidence. */
export function captureChecklist(plan:CampaignPlan,report:PlannerReport,context:ChecklistCaptureContext):CapturedChecklist {
  const draft=validateCampaignPlan(plan);if(report.treeReference!==draft.tree||report.indexRevision!==context.indexRevision)throw new Error('Checklist context differs from the reviewed plan. Preview again before capturing.');
  if(report.steps.length!==draft.items.length||report.steps.some((step,i)=>step.reference!==draft.items[i].reference))throw new Error('Checklist sequence differs from the reviewed plan.');
  const items=report.steps.map((step,index)=>{
    const requirements=[...(index===0&&report.applicability?[report.applicability]:[]),...step.requirements];
    const original=draft.items[index];const target=step.resolvedReference?{reference:step.resolvedReference,legacyId:original.legacyId??original.reference}:{...original};
    return {id:`step-${index+1}`,text:[`${index+1}. ${step.title}`,`Eligibility: ${step.eligibility}; sequence reachability: ${step.reachability}; hypothetical completion: ${step.projectedCompletion}.`,...step.issues.map(i=>i.message),...step.assumptions,...(requirements.some(r=>r.truth==='unknown')?['Confirm unresolved conditions in the game before following this step.']:[])].join('\n'),checked:false,target,requirements:structuredClone(requirements),sources:uniqueSources([...step.sources,...requirementSources(requirements)]),completionContext:{eligibility:step.eligibility,reachability:step.reachability,projectedCompletion:step.projectedCompletion}};
  });
  const assumptions=[...new Set([`Planning baseline: ${draft.startDate}.`,...draft.assumptions,...report.assumptions])];
  return validateChecklist({id:context.id??globalThis.crypto.randomUUID(),name:context.name??`${draft.name} checklist`.slice(0,100),planId:draft.id,createdAt:context.createdAt??new Date().toISOString(),indexRevision:context.indexRevision,gameVersion:context.gameVersion,appVersion:context.appVersion,assumptions,items,...(context.actualCompleted?{actualCompleted:[...context.actualCompleted]}:{})});
}
export type ChecklistStatus={stale:boolean;reasons:string[];items:{id:string;status:ResolutionStatus;reasons:string[]}[]};
/** Exact identity only. Caller may supply the current entries; a missing corpus is not resolution proof. */
export function checklistStatus(checklist:CapturedChecklist,indexRevision:string,entries?:Entry[]):ChecklistStatus {
  const captured=validateChecklist(checklist);const reasons:string[]=[];
  if(captured.indexRevision!==indexRevision)reasons.push('Installed reference revision changed; review the captured answer.');
  const items=captured.items.map(item=>{
    const itemReasons:string[]=[];let status:ResolutionStatus='unsupported';
    if(!item.target){status='unsupported';itemReasons.push('Captured manual task has no target reference.');}
    else if(!entries){itemReasons.push('Current target resolution has not been checked.');}
    else {
      const ref=item.target.reference;const explicit=ref.startsWith('definition:');const exact=explicit?ref.slice(11):ref;
      const matches=entries.filter(e=>explicit?e.uid===exact:e.uid===ref||e.entityKey===ref||e.id===ref||e.data.legacyAliases?.includes(ref)||e.data.ambiguousAliases?.includes(ref));
      const candidates=[...new Map(matches.map(e=>[e.uid,e])).values()];
      status=candidates.length>1||(!explicit&&candidates.some(e=>e.data.ambiguousAliases?.includes(ref)))?'ambiguous':candidates.length?'resolved':'unresolved';
      if(status==='ambiguous')itemReasons.push('Target now matches multiple definitions; the captured task remains attached to its original reference.');
      else if(status==='unresolved')itemReasons.push('Captured target is absent; its text and source evidence are preserved.');
      else {
        const current=candidates[0];const expected=item.sources.filter(s=>s.class==='installed-script');
        const targetSources=expected.filter(s=>s.source===current.source);
        if(targetSources.some(s=>s.hash!==current.hash)||(!targetSources.length&&expected.length&&expected.every(s=>s.hash!==current.hash))){status='stale';itemReasons.push('Captured source hash differs from the current target.');}
      }
      for(const source of item.sources.filter(s=>s.class==='installed-script')){
        const sourceEntries=entries.filter(e=>e.source===source.source);
        if(sourceEntries.length&&sourceEntries.some(e=>e.hash!==source.hash)){if(status==='resolved')status='stale';itemReasons.push(`Captured requirement source changed: ${source.source}`);}
      }
    }
    return {id:item.id,status,reasons:[...new Set(itemReasons)]};
  });
  return {stale:reasons.length>0||items.some(i=>['stale','ambiguous','unresolved'].includes(i.status)),reasons,items};
}
