import type {CampaignPlan, CapturedChecklist, ChecklistItem, Evidence, FocusRef, PlannerState, PlannerView, RequirementResult, Truth, RequirementRole} from '../../src/types';

const forbidden=new Set(['__proto__','prototype','constructor']);
const roles=new Set<RequirementRole>(['prerequisite','availability','branch','exclusion','bypass','cancel','outcome','applicability']);
const truths=new Set<Truth>(['yes','no','unknown']);
export const defaultPlannerView=():PlannerView=>({mode:'list',filter:'',zoom:1,scrollLeft:0,scrollTop:0});
function object(value:any,label:string):Record<string,any>{
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`Invalid ${label}.`);
  if(Object.keys(value).some(k=>forbidden.has(k)))throw new Error(`Unsafe ${label} key.`);
  return value;
}
function keys(value:Record<string,any>,allowed:string[],label:string){if(Object.keys(value).some(k=>!allowed.includes(k)))throw new Error(`Unsupported ${label} field.`);}
function str(value:any,label:string,max:number,empty=false):string{if(typeof value!=='string'||value.length>max||(!empty&&!value.trim()))throw new Error(`Invalid ${label}.`);return value;}
function array<T>(value:any,label:string,max:number,read:(v:any,index:number)=>T):T[]{if(!Array.isArray(value)||value.length>max)throw new Error(`Invalid ${label}.`);return value.map(read);}
function strings(value:any,label:string,max=100,length=1000):string[]{return array(value,label,max,v=>str(v,label,length,true));}
function unique<T extends {id:string}>(values:T[],label:string):T[]{if(new Set(values.map(v=>v.id)).size!==values.length)throw new Error(`Duplicate ${label} ID.`);return values;}
export function validPlanDate(value:any):string {
  const result=str(value,'plan start date',10);const date=new Date(`${result}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(result)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==result)throw new Error('Invalid plan start date.');return result;
}
export function validateFocusRef(value:any):FocusRef {
  const x=object(value,'focus reference');keys(x,['reference','legacyId'],'focus reference');
  return {reference:str(x.reference,'focus reference',800),...(x.legacyId===undefined?{}:{legacyId:str(x.legacyId,'legacy focus ID',800)})};
}
export function validateCampaignPlan(value:any):CampaignPlan {
  const x=object(value,'plan');keys(x,['id','name','tree','items','startDate','assumptions','referenceIndexRevision'],'plan');
  return {id:str(x.id,'plan ID',100),name:str(x.name,'plan name',100),tree:str(x.tree,'plan tree',800,true),items:array(x.items,'plan items',2000,validateFocusRef),startDate:validPlanDate(x.startDate),assumptions:strings(x.assumptions,'plan assumptions',200,2000),...(x.referenceIndexRevision===undefined?{}:{referenceIndexRevision:str(x.referenceIndexRevision,'plan reference revision',200)})};
}
function evidence(value:any):Evidence {
  const x=object(value,'source evidence');keys(x,['class','source','line','hash','gameVersion','rule','capturedAt','dependencies'],'source evidence');
  if(!['installed-script','bundled-doc','editorial','external'].includes(x.class))throw new Error('Invalid source evidence class.');
  if(x.line!==undefined&&(!Number.isSafeInteger(x.line)||x.line<0))throw new Error('Invalid source evidence line.');
  return {class:x.class,source:str(x.source,'source path',2000),hash:str(x.hash,'source hash',200,true),gameVersion:str(x.gameVersion,'source game version',200,true),rule:str(x.rule,'source rule',200),...(x.line===undefined?{}:{line:x.line}),...(x.capturedAt===undefined?{}:{capturedAt:str(x.capturedAt,'source capture date',100)}),...(x.dependencies===undefined?{}:{dependencies:strings(x.dependencies,'source dependencies',200,2000)})};
}
type Budget={nodes:number};
function requirement(value:any,budget:Budget,depth=0):RequirementResult {
  if(depth>16||++budget.nodes>20000)throw new Error('Checklist requirement tree exceeds the supported size.');
  const x=object(value,'requirement');keys(x,['truth','key','op','value','reason','role','children','assumptions','source','scope'],'requirement');
  if(!truths.has(x.truth)||!roles.has(x.role))throw new Error('Invalid checklist requirement truth or role.');
  // Anonymous script list members have an empty AST key; preserve their value and scope.
  return {truth:x.truth,key:str(x.key,'requirement key',500,true),reason:str(x.reason,'requirement reason',10000,true),role:x.role,children:array(x.children,'requirement children',2000,c=>requirement(c,budget,depth+1)),assumptions:strings(x.assumptions,'requirement assumptions',200,2000),...(x.op===undefined?{}:{op:str(x.op,'requirement operator',50,true)}),...(x.value===undefined?{}:{value:str(x.value,'requirement value',10000,true)}),...(x.source===undefined?{}:{source:evidence(x.source)}),...(x.scope===undefined?{}:{scope:strings(x.scope,'requirement scope',40,500)})};
}
function checklistItem(value:any,budget:Budget):ChecklistItem {
  const x=object(value,'checklist item');keys(x,['id','text','checked','target','requirements','sources','completionContext'],'checklist item');
  if(typeof x.checked!=='boolean')throw new Error('Invalid checklist tick.');
  let completionContext:ChecklistItem['completionContext'];
  if(x.completionContext!==undefined){const c=object(x.completionContext,'completion context');keys(c,['eligibility','reachability','projectedCompletion'],'completion context');if(!truths.has(c.eligibility)||!truths.has(c.reachability)||!truths.has(c.projectedCompletion))throw new Error('Invalid completion context.');completionContext={eligibility:c.eligibility,reachability:c.reachability,projectedCompletion:c.projectedCompletion};}
  return {id:str(x.id,'checklist item ID',100),text:str(x.text,'checklist text',20000),checked:x.checked,requirements:array(x.requirements,'checklist requirements',2000,r=>requirement(r,budget)),sources:array(x.sources,'checklist sources',200,evidence),...(x.target===undefined?{}:{target:validateFocusRef(x.target)}),...(completionContext?{completionContext}:{})};
}
export function validateChecklist(value:any,budget:Budget={nodes:0}):CapturedChecklist {
  const x=object(value,'checklist');keys(x,['id','name','planId','createdAt','indexRevision','gameVersion','appVersion','assumptions','items','actualCompleted'],'checklist');
  const createdAt=str(x.createdAt,'checklist capture date',100);
  if(!Number.isFinite(Date.parse(createdAt)))throw new Error('Invalid checklist capture date.');
  return {id:str(x.id,'checklist ID',100),name:str(x.name,'checklist name',100),planId:str(x.planId,'checklist plan ID',100),createdAt,indexRevision:str(x.indexRevision,'checklist reference revision',200),gameVersion:str(x.gameVersion,'checklist game version',200,true),appVersion:str(x.appVersion,'checklist app version',100,true),assumptions:strings(x.assumptions,'checklist assumptions',500,2000),items:unique(array(x.items,'checklist items',2000,i=>checklistItem(i,budget)),'checklist item'),...(x.actualCompleted===undefined?{}:{actualCompleted:strings(x.actualCompleted,'captured actual completion',2000,800)})};
}
/** View state is display-only. Recover invalid members without touching semantic references. */
export function validatePlannerView(value:any):PlannerView {
  const fallback=defaultPlannerView();if(!value||typeof value!=='object'||Array.isArray(value))return fallback;
  const finite=(v:any,min:number,max:number,otherwise:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:otherwise;
  return {mode:value.mode==='map'?'map':'list',filter:typeof value.filter==='string'&&value.filter.length<=500?value.filter:'',zoom:finite(value.zoom,.3,2,1),scrollLeft:finite(value.scrollLeft,0,1000000,0),scrollTop:finite(value.scrollTop,0,1000000,0),...(typeof value.selectedReference==='string'&&value.selectedReference.length<=800?{selectedReference:value.selectedReference}:{})};
}
export function validatePlanner(value:any):PlannerState {
  const x=object(value,'planner');keys(x,['schemaVersion','activePlanId','plans','checklists','view'],'planner');
  if(x.schemaVersion!==3)throw new Error('Unsupported planner schema. Use a compatible app.');
  const plans=unique(array(x.plans,'plans',20,validateCampaignPlan),'plan');
  if(!plans.length)throw new Error('A campaign needs at least one plan.');
  const activePlanId=str(x.activePlanId,'active plan ID',100);if(!plans.some(p=>p.id===activePlanId))throw new Error('The active plan is missing.');
  const budget={nodes:0};const checklists=unique(array(x.checklists,'checklists',50,c=>validateChecklist(c,budget)),'checklist');
  // A checklist may outlive its plan: preserve its captured name, references and sources.
  return {schemaVersion:3,activePlanId,plans,checklists,view:validatePlannerView(x.view)};
}
