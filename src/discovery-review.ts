import type {CampaignPlan,PlannerIssue,PlannerReport} from './types';

export type ReviewAssumption={text:string;positions:number[];planWide:boolean};
export type ReviewFinding={message:string;occurrences:Pick<PlannerIssue,'position'|'id'|'type'>[]};
/** Presentation only: retain the original report and checklist/fingerprint inputs unchanged. */
export function discoveryReview(plan:Pick<CampaignPlan,'assumptions'>,report:Pick<PlannerReport,'assumptions'|'steps'|'issues'>){
  const planWide=new Set(plan.assumptions),positions=new Map<string,Set<number>>();
  for(const step of report.steps)for(const text of step.assumptions){
    let found=positions.get(text);if(!found){found=new Set();positions.set(text,found);}found.add(step.position);
  }
  const all=[...new Set([...plan.assumptions,...report.assumptions,...report.steps.flatMap(step=>step.assumptions)])];
  const sharedAssumptions:ReviewAssumption[]=all.filter(text=>planWide.has(text)||(positions.get(text)?.size||0)!==1).map(text=>({text,positions:[...positions.get(text)||[]].sort((a,b)=>a-b),planWide:planWide.has(text)||!positions.has(text)}));
  const shared=new Set(sharedAssumptions.map(item=>item.text));
  const steps=report.steps.map(step=>({position:step.position,assumptions:[...new Set(step.assumptions)].filter(text=>!shared.has(text))}));
  const grouped=new Map<string,ReviewFinding>();
  for(const issue of report.issues){
    let finding=grouped.get(issue.message);if(!finding){finding={message:issue.message,occurrences:[]};grouped.set(issue.message,finding);}
    if(!finding.occurrences.some(item=>item.position===issue.position&&item.id===issue.id&&item.type===issue.type))finding.occurrences.push({position:issue.position,id:issue.id,type:issue.type});
  }
  return {sharedAssumptions,steps,findings:[...grouped.values()]};
}
export function reviewScope(positions:number[],allPositions:number[]){
  const unique=[...new Set(positions)].sort((a,b)=>a-b);
  if(!unique.length||unique.every(position=>position<0))return 'Plan';
  const steps=unique.filter(position=>position>=0);
  const label=allPositions.length&&allPositions.every(position=>steps.includes(position))?'All steps':`${steps.length===1?'Step':'Steps'} ${steps.map(position=>position+1).join(', ')}`;
  return unique.some(position=>position<0)?'Plan; '+label:label;
}
