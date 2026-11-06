import type {Entry,Node,RequirementResult} from './types';
export type Explanation={text:string;unknown?:boolean;children?:Explanation[]};
export type NameLookup=(id:string)=>string;
const literal=(v:string)=>/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(v)?Number(v):null;
const number=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(n);
const named=(id:string,lookup:NameLookup)=>lookup(id)||id;
const unknown=(what='effect'):Explanation=>({text:`An additional scripted ${what} is not translated. Its scope, variables or command semantics need review in the advanced source.`,unknown:true});
export function explainConditions(nodes:Node[],lookup:NameLookup=id=>id):Explanation[]{
 return nodes.map(n=>{
  if(Array.isArray(n.value)){
   if(['AND','OR','NOT'].includes(n.key)&&(!n.op||n.op==='='))return {text:n.key==='OR'?'At least one of these conditions must hold:':n.key==='NOT'?'None of these conditions may hold:':'All of these conditions must hold:',children:explainConditions(n.value,lookup)};
   return unknown('condition');
  }
  if(n.op&&n.op!=='=')return unknown('comparison');
  const v=n.value;
  if(n.key==='always'&&['yes','no'].includes(v))return {text:v==='yes'?'No restriction from this rule.':'This rule prevents availability.'};
  if(n.key==='has_completed_focus')return {text:`Complete ${named(v,lookup)}.`};
  if(n.key==='has_tech')return {text:`Research ${named(v,lookup)}.`};
  if(n.key==='has_dlc')return {text:`Requires ${named(v,lookup)} DLC. Ownership and enabled state must be confirmed.`};
  if(['tag','original_tag'].includes(n.key))return {text:`${n.key==='original_tag'?'Original country identity':'Country'} must be ${named(v,lookup)}.`};
  if(n.key==='has_war'&&['yes','no'].includes(v))return {text:v==='yes'?'Must be at war.':'Must be at peace.'};
  return unknown('condition');
 });
}
/** Deliberately bounded translation. Never flatten unsupported scopes into unconditional effects. */
export function explainEffects(nodes:Node[],lookup:NameLookup=id=>id,depth=0):Explanation[]{
 if(depth>16)return [unknown('nested effect')];
 return nodes.flatMap((n,index):Explanation[]=>{
  if(n.op&&n.op!=='=')return [unknown()];
  if(Array.isArray(n.value)){
   if(['if','else_if','else'].includes(n.key)){
    const previous=nodes[index-1]?.key;
    if(n.key!=='if'&&!['if','else_if'].includes(previous))return [unknown('conditional effect')];
    const limits=n.value.filter(c=>c.key==='limit');if(limits.some(c=>!Array.isArray(c.value)))return [unknown('conditional effect')];
    return [{text:n.key==='if'?'Only if all conditions below hold:':n.key==='else_if'?'Otherwise, if all conditions below hold:':'Otherwise (when earlier branches do not apply):',children:[...explainConditions(limits.flatMap(c=>c.value as Node[]),lookup),...explainEffects(n.value.filter(c=>c.key!=='limit'),lookup,depth+1)]}];
   }
   if(n.key==='hidden_effect')return [{text:'Effects hidden by the game tooltip (same scope and conditions):',children:explainEffects(n.value,lookup,depth+1)}];
   // Unknown scopes, loops, random branches and bonus formulas retain their whole source block.
   return [unknown()];
  }
  const amount=literal(n.value);
  const units:Record<string,string>={add_political_power:'political power',add_manpower:'manpower',army_experience:'army experience',navy_experience:'naval experience',air_experience:'air experience'};
  if(units[n.key]&&amount!==null)return [{text:`${amount<0?'Lose':'Gain'} ${number(Math.abs(amount))} ${units[n.key]}.`}];
  if(['add_stability','add_war_support'].includes(n.key)&&amount!==null)return [{text:`${amount<0?'Decrease':'Increase'} ${n.key==='add_stability'?'stability':'war support'} by ${number(Math.abs(amount)*100)} percentage points.`}];
  if(['add_ideas','remove_ideas'].includes(n.key)&&!/[\[\]$?]/.test(n.value))return [{text:`${n.key==='add_ideas'?'Add':'Remove'} national spirit / idea: ${named(n.value,lookup)}. Its modifiers need separate inspection.`}];
  if(n.key==='custom_effect_tooltip')return [{text:'The game supplies an additional tooltip; it is descriptive text, not an independently evaluated effect.',unknown:true}];
  return [unknown()];
 });
}
export function entryMechanics(entry:Entry,lookup:NameLookup=id=>entry.data.mechanicNames?.[id]||id){
 const nodes=(entry.data.nodes||[]) as Node[];const focus=['focus','shared_focus','joint_focus'].includes(entry.kind);
 const effects=nodes.filter(n=>[focus?'completion_reward':'complete_effect','remove_effect'].includes(n.key));
 const summary:Explanation[]=[];
 if(focus)summary.push({text:typeof entry.data.days==='number'?`${number(entry.data.days)} nominal days to complete, before stored progress, bypasses or delays.`:'Completion time is not known from the indexed source.',unknown:typeof entry.data.days!=='number'});
 if(entry.kind==='decision'){
  const cost=nodes.find(n=>n.key==='cost');if(cost)summary.push(typeof cost.value==='string'&&literal(cost.value)!==null&&Number(cost.value)>=0?{text:`Listed decision cost: ${number(Number(cost.value))} political power. Modifiers and special cost scripts are not included.`}:unknown('decision cost'));
 }
 if(entry.kind==='technology'){
  for(const [key,label] of [['research_cost','Base research-cost factor'],['start_year','Technology year']] as const){const n=nodes.find(n=>n.key===key);if(n)summary.push(typeof n.value==='string'&&literal(n.value)!==null?{text:`${label}: ${number(Number(n.value))}${key==='research_cost'?'. Actual days depend on research speed and ahead-of-time penalties.':'.'}`}:unknown('research value'));}
  const categories=nodes.find(n=>n.key==='categories');if(categories&&Array.isArray(categories.value))summary.push({text:`Research categories: ${categories.value.map(n=>typeof n.value==='string'?named(n.value,lookup):'unresolved category').join(', ')}.`});
  const modifiers:Record<string,string>={production_factory_max_efficiency_factor:'Production efficiency cap',production_factory_efficiency_gain_factor:'Production efficiency growth',research_speed_factor:'Research speed'};
  for(const node of nodes)if(modifiers[node.key]&&typeof node.value==='string'&&literal(node.value)!==null)summary.push({text:`${modifiers[node.key]} modifier: ${Number(node.value)>=0?'+':''}${node.value} (source coefficient; final campaign value is not calculated).`});
  const known=new Set(['research_cost','start_year','categories','folder','path','ai_will_do',...Object.keys(modifiers)]);
  if(nodes.some(n=>!known.has(n.key)||modifiers[n.key]&&(typeof n.value!=='string'||literal(n.value)===null)))summary.push({text:'This technology has additional benefits or modifiers that are not yet translated; inspect advanced mechanics before relying on them.',unknown:true});
 }
 for(const n of effects)summary.push({text:n.key==='remove_effect'?'When the decision is removed:':'On completion:',children:Array.isArray(n.value)?explainEffects(n.value,lookup):[unknown()]});
 const requirements:Explanation[]=(entry.data.prerequisites||[]).map((g:string[],i:number)=>({text:`Requirement ${i+1} — ${g.length>1?'complete at least one of':'complete'}: ${g.map(id=>named(id,lookup)).join(' OR ')}.`}));
 if(requirements.length>1)requirements.unshift({text:'Every numbered requirement below is required (AND).'});
 if(entry.data.exclusive?.length)requirements.push({text:`Choose a different branch if already completed: ${entry.data.exclusive.map((id:string)=>named(id,lookup)).join(', ')}. These focuses are mutually exclusive.`});
 for(const n of nodes.filter(n=>['available','allowed','allow','visible','allow_branch','bypass','cancel'].includes(n.key))){const labels:Record<string,string>={available:'To start',allowed:'Eligibility',allow:'Eligibility',visible:'To appear',allow_branch:'For this branch to appear',bypass:'May be skipped if',cancel:'May be cancelled if'};requirements.push({text:labels[n.key]+':',children:Array.isArray(n.value)?explainConditions(n.value,lookup):[unknown('condition')]});}
 return {summary:summary.length?summary:[{text:'No supported mechanical summary is available for this definition yet. The source and its limitations remain available below.',unknown:true}],requirements};
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
