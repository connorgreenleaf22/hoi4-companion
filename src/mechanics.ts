import type {Entry,Node,RequirementResult} from './types';
import {explainConditions,explainEffects,explainModifiers,defaultContext,literal,number,unresolved,type Explanation,type NameLookup,type ExplainContext} from './mechanics-interpreter';
export {explainConditions,explainEffects,explanationPreview} from './mechanics-interpreter';
export type {Explanation,NameLookup,ExplanationStatus} from './mechanics-interpreter';
const named=(id:string,lookup:NameLookup)=>lookup(id)||id;
export function entryMechanics(entry:Entry,lookup:NameLookup=id=>entry.data.mechanicNames?.[id]||id){
 const nodes=(entry.data.nodes||[]) as Node[],focus=['focus','shared_focus','joint_focus'].includes(entry.kind),decision=entry.kind==='decision'||entry.data.subtype==='decision';
 const ctx:ExplainContext={...defaultContext(),ideas:entry.data.mechanicIdeas};
 if(nodes.some(n=>n.key==='state_target'))ctx.from={kind:'state',label:'the selected state (campaign target unknown)'};
 else if(nodes.some(n=>['targets','target_array','target_root_trigger'].includes(n.key)))ctx.from={kind:'country',label:'the selected country (campaign target unknown)'};
 const summary:Explanation[]=[],requirements:Explanation[]=[];
 const atom=(n:Node,text:string,role:Explanation['role']='timing'):Explanation=>({text,status:'explained',code:n.key,line:n.line,role});
 const val=(key:string)=>nodes.find(n=>n.key===key)?.value;
 if(focus)summary.push(typeof entry.data.days==='number'?{text:`${number(entry.data.days)} nominal days to complete, before stored progress, bypasses or delays.`,status:'explained',role:'timing'}:unresolved({key:'cost',value:'',line:entry.line},'unsupported','Completion time is not known from the indexed source.'));
 if(decision){
  const cost=nodes.find(n=>n.key==='cost');if(cost)summary.push(literal(cost.value)!==null&&Number(cost.value)>=0?atom(cost,`${number(Number(cost.value))} political power (base cost).`,'cost'):unresolved(cost,'unsupported','Political-power cost uses a dynamic formula; the payable amount is unknown.'));
  if(nodes.some(n=>n.key==='custom_cost_trigger'))summary.push({text:'Additional resource requirement; spending must be checked in the effects.',status:'state-unknown',role:'cost',code:'custom_cost_trigger'});
  for(const [key,label] of [['days_remove','Active duration'],['days_re_enable','Repeat cooldown'],['days_mission_timeout','Mission timeout']] as const){const n=nodes.find(x=>x.key===key);if(n)summary.push(literal(n.value)!==null&&Number(n.value)>=0?atom(n,`${label}: ${number(Number(n.value))} days.`):unresolved(n,'unsupported',`${label} is dynamic or unspecified.`));}
  if(val('selectable_mission')==='no')summary.push({text:'Automatic mission; not a manually selectable decision.',status:'explained',role:'timing'});
 }
 if(entry.kind==='technology'){
  for(const [key,label] of [['research_cost','Base research-cost factor'],['start_year','Technology year']] as const){const n=nodes.find(n=>n.key===key);if(n)summary.push(literal(n.value)!==null?atom(n,`${label}: ${number(Number(n.value))}${key==='research_cost'?'. Actual days depend on research speed and ahead-of-time penalties.':'.'}`,'cost'):unresolved(n));}
  const metadata=new Set(['research_cost','start_year','categories','folder','path','ai_will_do','allow','allowed','available','visible','on_research_complete','on_research_complete_limit','enable_equipment','enable_subunits']);
  const modifiers=nodes.filter(n=>!metadata.has(n.key));summary.push(...explainModifiers(modifiers,lookup));
  for(const n of nodes.filter(n=>['enable_equipment','enable_subunits'].includes(n.key)))summary.push(Array.isArray(n.value)&&n.value.every(x=>typeof x.value==='string')?atom(n,`Unlocks ${n.key==='enable_equipment'?'equipment':'units'}: ${n.value.map(x=>named(x.value as string,lookup)).join(', ')}.`,'effect'):unresolved(n));
 }
 const phases:Record<string,string>={completion_reward:'On completion:',complete_effect:decision?(val('days_mission_timeout')?'When the mission completes:':'When selected:'):'On completion:',remove_effect:literal(val('days_remove'))!==null?`When removed (normally after ${val('days_remove')} days):`:'When the decision is removed:',timeout_effect:'When the mission times out:',cancel_effect:'When cancelled:',on_research_complete:'When research completes:'};
 for(const n of nodes){if(phases[n.key])summary.push({text:phases[n.key],status:'explained',code:n.key,line:n.line,role:'effect',children:Array.isArray(n.value)?[...(n.key==='on_research_complete'&&Array.isArray(val('on_research_complete_limit'))?[{text:'Only if the research-completion conditions hold:',status:'conditional' as const,role:'condition' as const,children:explainConditions(val('on_research_complete_limit') as Node[],lookup,ctx)}]:[]),...explainEffects(n.value,lookup,0,ctx)]:[unresolved(n,'parser-limitation')]});
  if(n.key==='modifier'&&decision&&Array.isArray(n.value)&&n.value.length)summary.push({text:`While active${literal(val('days_remove'))!==null?' for '+val('days_remove')+' days':''}:`,status:'explained',role:'modifier',code:n.key,children:explainModifiers(n.value,lookup)});
 }
 requirements.push(...(entry.data.prerequisites||[]).map((g:string[],i:number)=>({text:`Requirement ${i+1} — ${g.length>1?'complete at least one of':'complete'}: ${g.map(id=>named(id,lookup)).join(' OR ')}.`,status:'state-unknown' as const,role:'condition' as const})));
 if(requirements.length>1)requirements.unshift({text:'Every numbered requirement below is required (AND).',status:'state-unknown',role:'condition'});
 if(entry.data.exclusive?.length)requirements.push({text:`Choose a different branch if already completed: ${entry.data.exclusive.map((id:string)=>named(id,lookup)).join(', ')}. These focuses are mutually exclusive.`,status:'state-unknown',role:'condition'});
 const labels:Record<string,string>={available:'To start',allowed:'Eligibility',allow:'Eligibility',visible:'To appear',activation:'Mission activation',allow_branch:'For this branch to appear',bypass:'May be skipped if',cancel:'May be cancelled if',cancel_trigger:'Cancelled when',target_trigger:'Target requirements',custom_cost_trigger:'Additional resource requirement'};
 const addRequirements=(ns:Node[],prefix='')=>{for(const n of ns)if(labels[n.key]&&Array.isArray(n.value)&&n.value.length)requirements.push({text:prefix+labels[n.key]+':',status:'state-unknown',role:'condition',code:n.key,line:n.line,children:explainConditions(n.value,lookup,ctx)});};
 addRequirements(nodes);addRequirements(entry.data.inheritedConditions||[],'Category: ');addRequirements(entry.data.categoryConditions||[],'Category: ');
 if(entry.data.localizationEvidence?.[0]?.status==='unresolved'||referenceTitle(entry).includes('[dynamic name]'))summary.push({text:'The title lacks a resolved name or uses a runtime naming function.',status:'missing-localization',code:'title-localization'});
 if(entry.data.importWarnings?.length)summary.push({text:'The source parser recovered this definition with warnings; interpretation may be incomplete.',status:'parser-limitation',unknown:true,code:'importWarnings'});
 if(entry.data.definitionVariant>1)summary.push({text:'This definition is one of multiple variants; source identity matters.',status:'ambiguous-scope',unknown:true,code:'definitionVariant'});
 return {summary:summary.length?summary:[{text:'No supported mechanical summary is available for this definition.',status:'unsupported' as const,unknown:true}],requirements};
}
/** Only render named source placeholders; never invent a current country identity or selected target. */
export function referenceTitle(e:Entry):string{
 const lookup=(id:string)=>e.data.mechanicNames?.[id]||id;const state=(e.data.nodes||[]).some((n:Node)=>n.key==='state_target');
 return e.title.replace(/\[([^\]]+)\]/g,(_whole,token:string)=>{
  if(token==='FROM.GetName'||token==='FROM.GetNameDef')return state?'the selected state':'the selected country';
  if(token==='FROM.GetAdjective')return 'the selected country’s';
  if(/^FROM\.OWNER\.Get/.test(token))return 'the selected state’s owner';
  if(token==='ROOT.GetFactionName')return 'the acting country’s faction';
  if(token==='ROOT.GetAdjective')return 'the acting country’s';
  const m=token.match(/^([A-Z0-9]{3})\.(GetName|GetNameDef|GetAdjective)$/);if(m){const key=m[1]+(m[2]==='GetAdjective'?'_ADJ':'');return lookup(key)!==key?lookup(key):'a country name';}
  return '[dynamic name]';
 });
}
export function requirementExplanation(r:RequirementResult,lookup:NameLookup):string{
 if(r.scope?.length)return 'A rule applies in a different country, state or script scope; the companion cannot verify it.';
 if(r.key.startsWith('prerequisite_row_'))return `Complete at least one of: ${r.children.map(c=>named(c.value||'',lookup)).join(' OR ')}. Every prerequisite group is required.`;
 if(r.key==='focus'||r.key==='has_completed_focus')return `Completion of ${named(r.value||'',lookup)} is required.`;
 if(r.key==='mutually_exclusive')return `Cannot combine with ${named(r.value||'',lookup)}.`;
 if(r.role==='outcome')return 'Completion effects are described separately; the planner does not execute or simulate them.';
 if(r.key==='exclusions')return 'Check mutually exclusive branches below.';
 if(r.key==='AND'||r.key==='OR'||r.key==='NOT')return r.key==='OR'?'At least one condition must hold:':r.key==='NOT'?'None of these conditions may hold:':'All conditions in this group must hold:';
 if(r.key==='has_dlc')return `Requires ${named(r.value||'',lookup)} DLC.`;
 if(r.key==='always')return r.value==='yes'?'This rule adds no restriction.':'This rule prevents availability.';
 return 'This requirement needs additional campaign information or script support before it can be checked.';
}
