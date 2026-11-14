import type {CampaignPlan,Entry,Node,PlannerReport,Profile} from '../../src/types';
import type {Explanation,ExplanationEvidence} from '../../src/mechanics-interpreter';
import {entryMechanics} from '../../src/mechanics';
import {conditionSentence} from '../../src/mechanics-interpreter';
import type {PlanningSources} from '../../src/strategy-types';
import type {CoverageDimension,CoverageGap,CoveragePriority,PlanCoverage,PlanningProposal,ProposalReview} from '../../src/planning-coverage-types';
import {actualCompletionContext,resolveFocus} from './projection';
import {createHash} from 'node:crypto';
import {formatScript} from '../parser';

const evidence=(e:Entry,line=e.line):ExplanationEvidence[]=>[{source:e.source,line,hash:e.hash,version:e.version}];
const weights={critical:5,high:3,low:1};
/** Engineering triage only. Critical vetoes are never averaged into a confidence score. */
export function rankCoverageGaps(reviews:Pick<PlanCoverage,'planId'|'gaps'>[]):CoveragePriority[]{
 const groups=new Map<string,{severity:CoverageGap['severity'];definitions:Set<string>;plans:Set<string>;semantics:Set<string>;campaign:Set<string>;codes:Set<string>}>();
 for(const r of reviews)for(const g of r.gaps){if(g.kind==='structure')continue;let v=groups.get(g.category);if(!v){v={severity:g.severity,definitions:new Set(),plans:new Set(),semantics:new Set(),campaign:new Set(),codes:new Set()};groups.set(g.category,v);}if(weights[g.severity]>weights[v.severity])v.severity=g.severity;v.definitions.add(g.reference);if(g.kind==='semantics')v.semantics.add(g.reference);if(g.kind==='campaign-state')v.campaign.add(g.reference);v.plans.add(r.planId);v.codes.add(g.code);}
 return [...groups].map(([category,v])=>({category,severity:v.severity,affectedDefinitions:v.definitions.size,affectedPlans:v.plans.size,unresolvedSemanticsDefinitions:v.semantics.size,campaignStateDefinitions:v.campaign.size,priority:weights[v.severity]*v.definitions.size,codes:[...v.codes].sort()})).sort((a,b)=>weights[b.severity]-weights[a.severity]||b.priority-a.priority||b.affectedPlans-a.affectedPlans||a.category.localeCompare(b.category));
}
const category=(code:string,dimension:CoverageDimension):[string,CoverageGap['severity']]=>{
 if(/^(start_civil_war|create_wargoal|declare_war_on|annex_country|puppet|set_autonomy|transfer_state|white_peace|create_faction|add_to_faction)$/.test(code))return ['War, territory and diplomatic consequences','critical'];
 if(/event/.test(code))return ['Event choices and downstream consequences','critical'];
 if(dimension==='costs')return ['Costs and duration','critical'];
 if(dimension==='prerequisites'||dimension==='branch-conflicts')return ['Eligibility and branch conditions','critical'];
 if(/variable|resource|dynamic_modifier/.test(code))return ['Dynamic economy and variable formulas','high'];
 if(/idea|modifier|_factor$|_drift$|stability_weekly|lend_lease_tension|min_export/.test(code))return ['National spirits and modifiers','high'];
 if(/tech_bonus|equipment|unit|division|research/.test(code))return ['Research and military preparation','high'];
 if(/set_popularities|country_leader|set_rule|set_politics/.test(code))return ['Government and political transitions','high'];
 if(code==='alternate_icon')return ['Names and localization','low'];
 if(/scope|FROM|PREV|ROOT|state|country/.test(code))return ['Recipients and scoped effects','high'];
 return ['Other uninterpreted mechanics','high'];
};
const focusMetadata=new Set(['id','icon','text','x','y','relative_position_id','offset','search_filters','ai_will_do','will_lead_to_war_with','prerequisite','mutually_exclusive','cost']);
const interpreted=new Set(['completion_reward','complete_effect','remove_effect','timeout_effect','cancel_effect','on_research_complete','on_research_complete_limit','modifier','available','allowed','allow','visible','activation','allow_branch','bypass','cancel','cancel_trigger','target_trigger','custom_cost_trigger']);

/** Source-only review, never a game-state simulator. Caller supplies the entire selected tree. */
export function reviewPlanCoverage(profile:Profile,plan:CampaignPlan,focuses:Entry[],tree:Entry,report:PlannerReport,sources:PlanningSources,supporting:Entry[]=[],resolve?:(id:string)=>Entry|undefined):PlanCoverage{
 const gaps:CoverageGap[]=[],references:PlanCoverage['references']=[],events:PlanCoverage['events']=[];
 let structuralValidity:PlanCoverage['structuralValidity']='valid';
 const add=(reference:string,dimension:CoverageDimension,code:string,message:string,proof:ExplanationEvidence[],context:string[]=[],kind:CoverageGap['kind']='semantics',override?:[string,CoverageGap['severity']])=>{const [cat,severity]=override||category(code,dimension);const resolved=resolveFocus(reference,focuses).entry;if(resolved)reference='definition:'+resolved.uid;gaps.push({reference,dimension,category:cat,severity,kind,code,message,context,evidence:proof});};
 const selected=plan.items.flatMap(i=>{const r=resolveFocus(i.reference,focuses);if(!r.entry){structuralValidity='unknown';add(i.reference,'prerequisites',r.status,'Missing or ambiguous focus; no definition chosen.',[]);}return r.entry?[r.entry]:[];});
 const actual=actualCompletionContext(profile,focuses),prior=new Set(actual),seen=new Set<string>();
 for(const e of selected){
  const ref='definition:'+e.uid,ns=e.data.nodes as Node[]|undefined;
  if(seen.has(e.uid)){structuralValidity='invalid';add(ref,'prerequisites','duplicate','Repeated focus in submitted sequence.',evidence(e),[],'structure');}seen.add(e.uid);
  const raw=ns?.filter(n=>['prerequisite','mutually_exclusive'].includes(n.key))||[];
  if(!ns||!['focus','shared_focus'].includes(e.kind)||raw.some(n=>!Array.isArray(n.value)||n.value.some(c=>c.key!=='focus'||typeof c.value!=='string'||c.op&&c.op!=='='))){if(structuralValidity!=='invalid')structuralValidity='unknown';add(ref,'prerequisites','raw-structure','Raw prerequisite/exclusion syntax is absent or unsupported.',evidence(e));}
  if(!actual.has(e.uid))for(const group of e.data.prerequisites||[]){if(!Array.isArray(group)||!group.length||group.some(id=>typeof id!=='string')){if(structuralValidity!=='invalid')structuralValidity='unknown';add(ref,'prerequisites','prerequisite','Malformed prerequisite group.',evidence(e));continue;}
   if(!group.some(id=>{const r=resolveFocus(id,focuses);return !!r.entry&&(prior.has(r.entry.uid)||prior.has(id));})){structuralValidity='invalid';add(ref,'prerequisites','order','No supported earlier or manually completed member of prerequisite group: '+group.join(' OR '),evidence(e),[],'structure');}}
  const conflicts=focuses.filter(other=>other.uid!==e.uid&&((e.data.exclusive||[]).includes(other.id)||(other.data.exclusive||[]).includes(e.id))&&(selected.some(s=>s.uid===other.uid)||actual.has(other.uid)));
  for(const other of conflicts){structuralValidity='invalid';add(ref,'branch-conflicts','mutually_exclusive','Conflicts with '+other.id,[...evidence(e),...evidence(other)],[],'structure');}
  prior.add(e.uid);if(focuses.filter(x=>x.id===e.id).length===1)prior.add(e.id);
 }
 for(const step of report.steps)for(const r of step.requirements){if(r.role==='outcome'||r.truth==='yes')continue;const dim:CoverageDimension=r.role==='exclusion'?'branch-conflicts':'prerequisites';add(step.resolvedReference||step.reference,dim,r.key,r.reason,r.source?[{source:r.source.source,line:r.source.line||1,hash:r.source.hash,version:r.source.gameVersion}]:[],[],r.truth==='no'?'structure':'campaign-state');if(r.truth==='no'&&['availability','branch','prerequisite','exclusion'].includes(r.role))structuralValidity='invalid';}
 const entries=[...new Map([...selected,...supporting].map(e=>[e.uid,e])).values()];
 for(const e of entries){
  const ref='definition:'+e.uid,base=evidence(e),ns=e.data.nodes as Node[]|undefined;
  const m=entryMechanics(e,undefined,{resolveEvent:resolve?id=>{const target=resolve(id);return target?.kind==='event'?{nodes:target.data.nodes||[],eventType:target.data.eventType,source:target.source,line:target.line,hash:target.hash,version:target.version,recovered:!!target.data.importWarnings?.length,ambiguous:target.data.definitionVariant>1}:undefined;}:undefined});
  references.push({reference:ref,title:e.title,evidence:base,summary:m.summary,requirements:m.requirements});
  const walk=(items:Explanation[],dimension:CoverageDimension,parents:string[]=[],proof=base)=>{for(const x of items){
   const p=x.evidence?.length?x.evidence:proof.map(v=>({...v,line:x.line||v.line})),code=x.code||'unresolved',dim=x.role==='cost'||x.role==='timing'||/cost|days_remove|days_re_enable|days_mission_timeout/.test(code)?'costs':x.role==='condition'?'prerequisites':dimension;
   if(x.status==='missing-localization')add(ref,dim,code,x.text,p,parents,'presentation',['Names and localization','low']);
   else if(x.unknown||['unsupported','ambiguous-scope','parser-limitation'].includes(x.status||''))add(ref,dim,code,x.text,p,parents);
   else if(x.status==='state-unknown'&&!x.children?.length&&x.code)add(ref,dim,code,x.text,p,parents,'campaign-state');
   if(code==='add_dynamic_modifier'||['set_variable','add_to_variable'].includes(code))add(ref,'rewards',code,'Activation and final modifier totals are not evaluated.',p,parents);
   if(x.children)walk(x.children,dim,[...parents,x.text,...x.children.filter(c=>c.role==='condition').map(conditionSentence)],p);
  }};
  walk(m.summary,'rewards');walk(m.requirements,'prerequisites');
  if(!ns)add(ref,'rewards','missing-ast','No source AST available for complete coverage inspection.',base);
  const costs=(ns||[]).filter(n=>n.key==='cost'||n.key==='research_cost');
  if(costs.length>1||costs.some(n=>typeof n.value!=='string'||!/^\d+(?:\.\d+)?$/.test(n.value)))add(ref,'costs','cost','Cost is dynamic, duplicated or malformed; no payable total is inferred.',base);
  for(const n of ns||[]){
   if(['focus','shared_focus'].includes(e.kind)&&!focusMetadata.has(n.key)&&(!interpreted.has(n.key)||n.key==='modifier'))add(ref,/cost|duration|time/.test(n.key)?'costs':'rewards',n.key,'Top-level declaration is not accounted for by this coverage policy.',evidence(e,n.line));
   if(['available','allowed','allow','visible','activation','allow_branch','bypass','cancel','cancel_trigger','target_trigger','custom_cost_trigger'].includes(n.key)&&!Array.isArray(n.value))add(ref,'prerequisites',n.key,'Malformed condition container cannot be treated as absent.',evidence(e,n.line));
  }
  if(e.kind==='technology')add(ref,'prerequisites','research-schedule','Research-slot availability, dependency paths and actual research duration are not simulated.',base);
  if(e.kind==='decision'||e.data.subtype==='decision'){
   const known=new Set([...interpreted,'id','icon','cost','days_remove','days_re_enable','days_mission_timeout','selectable_mission','ai_will_do','fire_only_once','is_good','highlight_states','highlight_provinces','state_target','targets','target_array','target_root_trigger','custom_cost_text']);
   for(const n of ns||[])if(!known.has(n.key))add(ref,/cost/.test(n.key)?'costs':'prerequisites',n.key,'Decision declaration requires review.',evidence(e,n.line));
   if(!ns?.some(n=>n.key==='cost'))add(ref,'costs','default-cost','No explicit cost; engine default not qualified by this policy.',base);
  }
  // Follow event references even inside unsupported wrappers/helpers. Finding a target is not interpreting its choices.
  let budget=12000;
  const scan=(nodes:Node[],proof:ExplanationEvidence[],context:string[],depth=0,stack:string[]=[])=>{if(depth>16||budget<=0){add(ref,'downstream-events','scan-limit','Dependency scan bounded; remaining consequences unknown.',proof,context);return;}
   for(const n of nodes){if(--budget<0){add(ref,'downstream-events','scan-limit','Dependency scan budget exhausted.',proof,context);break;}
    if(['effect_tooltip','custom_effect_tooltip','event_option_tooltip','show_ideas_tooltip','unlock_decision_tooltip'].includes(n.key))continue;
    const p=proof.map(v=>({...v,line:n.line||v.line}));
    if(['country_event','news_event','state_event'].includes(n.key)){
     const id=typeof n.value==='string'?n.value:n.value.find(x=>x.key==='id'&&typeof x.value==='string')?.value;
     const target=typeof id==='string'?resolve?.(id):undefined;
     const targetProof=target?.kind==='event'?evidence(target):[];
     add(ref,'downstream-events',n.key,`Event ${typeof id==='string'?id:'(dynamic ID)'}: source branches may be explained, but delivery, choice probabilities and complete downstream consequences remain unqualified.`,[...p,...targetProof],context);
     if(typeof id==='string'&&!events.some(x=>x.id===id))events.push({id,reference:target?.kind==='event'?'definition:'+target.uid:undefined,title:target?.title,evidence:targetProof,consequences:'unresolved'});
     if(target?.kind==='event'){
      const key='event:'+target.uid;
      if(stack.includes(key))add(ref,'downstream-events','recursive-event','Recursive event dependency; complete closure is not established.',[...p,...targetProof],context);
      else if(target.version!==e.version||target.data.importWarnings?.length)add(ref,'downstream-events','event-source','Changed-version or parser-recovered event source; dependency expansion refused.',[...p,...targetProof],context);
      else scan(target.data.nodes||[],targetProof,[...context,'event '+id],depth+1,[...stack,key]);
     }
    }
    const helper=e.data.mechanicScripts?.[n.key];if(helper&&!helper.ambiguous){if(stack.includes(n.key))add(ref,'downstream-events','recursive-helper','Recursive dependency; event closure not established.',p,context);else scan(helper.nodes||[],helper.source?[{source:helper.source,line:helper.line,hash:helper.hash,version:helper.version}]:p,[...context,'scripted effect '+n.key],depth+1,[...stack,n.key]);}
    if(Array.isArray(n.value)){const guard=n.value.find(x=>x.key==='limit');const guards=guard&&Array.isArray(guard.value)?['Source guard: '+formatScript(guard.value)]:[];scan(n.value,p,[...context,n.key,...guards],depth+1,stack);}
   }};
  scan(ns||[],base,[]);
 }
 if(tree.data.referenceIssues?.length){if(structuralValidity!=='invalid')structuralValidity='unknown';add('definition:'+tree.uid,'prerequisites','tree-references','Tree has missing or ambiguous shared references.',evidence(tree));}
 if(report.applicability?.truth==='unknown')add('definition:'+tree.uid,'source-context','tree-applicability','Tree selection weights and campaign applicability are unverified.',evidence(tree),[],'campaign-state',['Campaign applicability','high']);
 if(sources.mods.length||sources.playset==='unavailable')add('definition:'+tree.uid,'source-context','playset','Active playset authority is unavailable or mod overrides are not merged.',evidence(tree),[],'campaign-state',['Campaign applicability','high']);
 add('definition:'+tree.uid,'source-context','whole-strategy-scope','Review covers the submitted focuses and explicit supporting references. Required decisions, research, military preparation and external event chains may still be omitted.',evidence(tree),[],'semantics',['Whole-strategy completeness','high']);
 const dimensions=Object.fromEntries((['costs','prerequisites','branch-conflicts','rewards','downstream-events','source-context'] as CoverageDimension[]).map(d=>[d,gaps.some(g=>g.dimension===d&&g.severity!=='low')?'incomplete':'reviewed'])) as PlanCoverage['dimensions'];
 const blockingGapCount=gaps.filter(g=>g.severity!=='low').length;
 const result:PlanCoverage={schemaVersion:1,policyVersion:'risk-gate-v1',reviewFingerprint:createHash('sha256').update(JSON.stringify({policy:'risk-gate-v1',interpreter:'bounded-events-v1',profile,plan,sources,definitions:[tree,...entries].map(e=>[e.uid,e.hash]),dependencies:events.map(e=>[e.id,e.reference,e.evidence])})).digest('hex'),planId:plan.id,structuralValidity,label:structuralValidity==='invalid'?'needs-correction':'provisional',editable:true,sources,assumptions:[...new Set([...plan.assumptions,...report.assumptions])],dimensions,gaps,priorities:[],references,events,policy:{provisionalAllowed:structuralValidity!=='invalid',confidentRecommendationAllowed:false,rankingAllowed:false,optimizationAllowed:false,blockingGapCount,reasons:[...(blockingGapCount?['Strategy-critical interpretation or campaign-state gaps remain.']:[]),'No qualified objective/utility model or whole-campaign simulator exists. A coverage review is not an optimality proof.']}};
 result.priorities=rankCoverageGaps([result]);return result;
}
export function reviewProposal(intent:PlanningProposal['intent'],coverage:PlanCoverage):ProposalReview{
 return {schemaVersion:1,intent,allowed:intent==='provisional'&&coverage.policy.provisionalAllowed,coverage};
}
