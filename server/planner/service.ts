import {createHash} from 'node:crypto';
import type {CampaignPlan,Profile,Entry,Meta,PlanPreview} from '../../src/types';
import type {Store} from '../store';
import {treeFocuses,type TreeReferenceIssue} from '../domain';
import {ensurePlanner,mirrorPlanner} from './plans';
import {validatePlanner} from './validation';
import {evaluatePlanner} from './evaluate';

export class PlanConflict extends Error {
  constructor(public code:string,message:string,public context:Record<string,unknown>={}){super(message);}
}
function stable(value:any):string{
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
/** Validate the submitted alternative and build its canonical mirror without persisting. */
export function preparePlanDraft(profile:Profile,input:any):{profile:Profile;plan:CampaignPlan}{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Choose a valid plan to preview.');
  const state=ensurePlanner(profile);
  const found=state.plans.some(p=>p.id===input.id);
  state.plans=found?state.plans.map(p=>p.id===input.id?input:p):[...state.plans,input];
  state.activePlanId=input.id;
  const planner=validatePlanner(state);
  const draft=mirrorPlanner({...profile,planner,exportSchemaVersion:3});
  return {profile:draft,plan:planner.plans.find(p=>p.id===planner.activePlanId)!};
}
export function validatePreviewContext(input:any,profile:Profile){
  if(!Number.isSafeInteger(input.expectedProfileRevision)||input.expectedProfileRevision<0||input.expectedProfileRevision!==(profile.revision??0))throw new Error('A matching campaign revision is required for preview.');
  if(typeof input.expectedIndexRevision!=='string'||input.expectedIndexRevision.length<1||input.expectedIndexRevision.length>200)throw new Error('A reference revision is required for preview.');
}
export function makePreview(store:Store,profile:Profile,plan:CampaignPlan,expectedProfileRevision:number,expectedIndexRevision:string):PlanPreview{
  const meta=store.getSetting<Meta|null>('meta',null),indexRevision=meta?.indexRevision||'legacy';
  if(indexRevision!==expectedIndexRevision)throw new PlanConflict('reference-conflict','Installed references changed. Review a new preview before applying.',{expectedIndexRevision,currentIndexRevision:indexRevision,indexRevision});
  const current=store.profile(profile.id),deleted=!!store.db.prepare('SELECT id FROM profile_tombstones WHERE id=?').get(profile.id);
  if(current?(current.revision??0)!==expectedProfileRevision:expectedProfileRevision!==0||deleted)throw new PlanConflict('profile-conflict','This campaign changed or was deleted. Your draft is retained; review the current campaign before applying.',{current});
  const treeResolution=store.resolve(plan.tree,'focus_tree');
  const tree=treeResolution.entry;
  const all:Entry[]=store.db.prepare("SELECT payload FROM entries WHERE kind IN ('focus','shared_focus','joint_focus')").all().map(r=>JSON.parse(r.payload as string));
  const referenceIssues:TreeReferenceIssue[]=[];
  const visible=tree?treeFocuses(tree,all,referenceIssues):[];
  // Graph assembly omits ambiguous variants. Evaluation must retain them to explain
  // ambiguity and honor an explicitly reviewed definition without guessing.
  const candidates=new Set(referenceIssues.flatMap(issue=>issue.candidates));
  const focuses=[...new Map([...visible,...all.filter(e=>candidates.has(e.uid))].map(e=>[e.uid,e])).values()].map(e=>store.entry('definition:'+e.uid)||e);
  const report=evaluatePlanner(profile,plan,focuses,{tree,dlcs:meta?.dlcs||[],indexRevision});
  for(const step of report.steps){
    const item=plan.items[step.position];
    if(step.id&&item.legacyId!==undefined&&item.legacyId!==step.id&&item.legacyId!==item.reference)throw new Error('A focus legacy mirror does not match its resolved definition. Review the reference.');
  }
  // View controls do not affect meaning and are deliberately outside semantic identity.
  const semantic={...profile,planner:profile.planner?{...profile.planner,view:undefined}:undefined};
  const fingerprint=createHash('sha256').update(stable({profile:semantic,plan,report,expectedProfileRevision,expectedIndexRevision})).digest('hex');
  return {report,fingerprint,expectedProfileRevision,expectedIndexRevision};
}
