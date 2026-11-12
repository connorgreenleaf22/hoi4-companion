import type {Node} from './types';
export type ExplanationStatus='explained'|'conditional'|'state-unknown'|'missing-localization'|'unsupported'|'ambiguous-scope'|'parser-limitation';
export type ExplanationEvidence={source:string;line:number;hash:string;version:string};
export type ScriptDefinition={nodes:Node[];source?:string;line?:number;hash?:string;version?:string;title?:string;ambiguous?:boolean;recovered?:boolean;limited?:boolean};
export type EventDefinition=ScriptDefinition&{eventType?:string};
export type Explanation={text:string;status?:ExplanationStatus;unknown?:boolean;children?:Explanation[];code?:string;line?:number;evidence?:ExplanationEvidence[];role?:'effect'|'condition'|'administrative'|'tooltip'|'cost'|'timing'|'modifier';};
export type NameLookup=(id:string)=>string;
type Scope={label:string;kind:'country'|'state'|'unknown'};
export type ExplainContext={current:Scope;root:Scope;from?:Scope;previous?:Scope;ideas?:Record<string,any>;scripts?:Record<string,ScriptDefinition>;dynamicModifiers?:Record<string,ScriptDefinition>;scriptStack?:string[];budget?:{remaining:number};version?:string;resolveEvent?:(id:string)=>EventDefinition|undefined;eventStack?:string[]};
export const defaultContext=():ExplainContext=>({current:{label:'the acting country',kind:'country'},root:{label:'the acting country',kind:'country'},budget:{remaining:4096}});
const proof=(s:ScriptDefinition):ExplanationEvidence[]=>s.source&&s.hash&&s.version?[{source:s.source,line:s.line||1,hash:s.hash,version:s.version}]:[];
export const literal=(v:unknown):number|null=>typeof v==='string'&&/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(v)&&Number.isFinite(Number(v))?Number(v):null;
export const number=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:3}).format(n);
const scalar=(ns:Node[],key:string)=>{const found=ns.filter(n=>n.key===key);return found.length===1&&typeof found[0].value==='string'?found[0].value:'';};
const valid=(ns:Node[],keys:string[])=>ns.every(n=>keys.includes(n.key))&&new Set(ns.map(n=>n.key)).size===ns.length;
export const unresolved=(n:Node,status:ExplanationStatus='unsupported',text='This script is not yet interpreted. No outcome is assumed.'):Explanation=>({text,status,unknown:true,code:n.key,line:n.line});
const item=(n:Node,text:string,status:ExplanationStatus='explained',role:Explanation['role']='effect',children?:Explanation[]):Explanation=>({text,status,role,code:n.key,line:n.line,...(children?{children}:{})});
function entity(id:string,lookup:NameLookup,context:ExplainContext):Scope|undefined{
 if(id==='ROOT')return context.root;if(id==='THIS')return context.current;if(id==='PREV')return context.previous;if(id==='FROM')return context.from;
 if(/^[A-Z0-9]{3}$/.test(id)&&!/^\d+$/.test(id))return {label:lookup(id)||id,kind:'country'};
 if(/^\d+$/.test(id))return {label:lookup('STATE_'+id)!=='STATE_'+id?lookup('STATE_'+id):`state ${id}`,kind:'state'};
 if(id==='OWNER'||id==='CONTROLLER'||id==='owner'||id==='controller')return context.current.kind==='state'?{label:`the ${id.toLowerCase()} of ${context.current.label}`,kind:'country'}:undefined;
 return undefined;
}
const target=(id:string,lookup:NameLookup,c:ExplainContext)=>entity(id,lookup,c)?.label;
const scopeContext=(scope:Scope,c:ExplainContext):ExplainContext=>({...c,previous:c.current,current:scope});
const missingScope=(n:Node)=>unresolved(n,'ambiguous-scope','The recipient or script scope cannot be identified reliably.');
const localizedName=(id:string,lookup:NameLookup)=>(lookup(id)||id).replace(/\[([A-Z0-9]{3})\.(GetName|GetNameDef|GetAdjective)\]/g,(whole,tag:string,method:string)=>{const key=tag+(method==='GetAdjective'?'_ADJ':'');return lookup(key)!==key?lookup(key):whole;});
const name=(id:string,lookup:NameLookup)=>localizedName(id,lookup).replace(/\[[^\]]+\]/g,'[name depends on campaign]');
const namedItem=(n:Node,text:string,id:string,lookup:NameLookup,role:Explanation['role']='effect')=>item(n,text,localizedName(id,lookup)===id||/[\[\]$]/.test(localizedName(id,lookup))?'missing-localization':'explained',role);
const condition=(n:Node,text:string)=>item(n,text,'state-unknown','condition');
const characterGap=(n:Node)=>unresolved(n,'unsupported','Character existence, nationality and country-leader role eligibility are unresolved; no actual leader transition is certified.');
const namedCondition=(n:Node,text:string,id:string,lookup:NameLookup)=>({...namedItem(n,text,id,lookup,'condition'),status:localizedName(id,lookup)===id||/[\[\]$]/.test(localizedName(id,lookup))?'missing-localization' as const:'state-unknown' as const});
function boundedMap(nodes:Node[],c:ExplainContext,explain:(n:Node)=>Explanation):Explanation[]{
 const out:Explanation[]=[];
 for(const n of nodes){if(c.budget&&c.budget.remaining--<=0){out.push(unresolved(n,'parser-limitation','Explanation work limit reached; remaining rules are not interpreted.'));break;}out.push(explain(n));}
 return out;
}
/** Interpret choices in an explicit delivery context. Never evaluate which choice occurs. */
export function explainEvent(nodes:Node[],lookup:NameLookup,c:ExplainContext,depth=0):{summary:Explanation[];requirements:Explanation[]}{
 const summary:Explanation[]=[],requirements:Explanation[]=[];
 const metadata=new Set(['id','title','desc','picture']);
 const optionMetadata=new Set(['name','ai_chance','trigger','highlighted','default','original_tag','fire_only_once']);let option=0;
 for(const key of ['id','is_triggered_only','trigger','immediate','after'])if(nodes.filter(n=>n.key===key).length>1)summary.push(unresolved(nodes.find(n=>n.key===key)!,'parser-limitation','Repeated event control field; its engine precedence is unresolved.'));
 for(const n of nodes){
  if(c.budget&&--c.budget.remaining<0){summary.push(unresolved(n,'parser-limitation','Event explanation work limit reached; remaining stages are unresolved.'));break;}
  if(n.op&&n.op!=='='){summary.push(unresolved(n,'parser-limitation'));continue;}
  if(n.key==='is_triggered_only'&&['yes','no'].includes(String(n.value))){summary.push(item(n,n.value==='yes'?'This event is triggered externally; its presence does not establish delivery.':'This event permits automatic trigger checks; polling and delivery are not simulated.','explained','timing'));continue;}
  if(n.key==='trigger'){
   requirements.push({...unresolved(n,'unsupported','Source event trigger; applicability to immediate, delayed or automatic delivery is not qualified. These rules are not an evaluated delivery gate.'),role:'administrative',children:Array.isArray(n.value)?explainConditions(n.value,lookup,c,depth+1):[unresolved(n,'parser-limitation')]});continue;
  }
  if(['immediate','option','after'].includes(n.key)){
   if(!Array.isArray(n.value)||n.op&&n.op!=='='){summary.push(unresolved(n,'parser-limitation'));continue;}
   const body=n.value,choice=n.key==='option',id=scalar(body,'name');
   const children:Explanation[]=[];
   if(choice){
    for(const key of optionMetadata)if(body.filter(n=>n.key===key).length>1)children.push(unresolved(body.find(n=>n.key===key)!,'parser-limitation','Repeated option control field; its engine precedence is unresolved.'));
    children.push(...boundedMap(body.filter(x=>x.key==='trigger'),c,gate=>item(gate,'This option is available only if:','state-unknown','condition',Array.isArray(gate.value)?explainConditions(gate.value,lookup,c,depth+1):[unresolved(gate,'parser-limitation')])));
    children.push(...boundedMap(body.filter(x=>optionMetadata.has(x.key)&&!['name','trigger'].includes(x.key)),c,x=>{
     const rule=unresolved(x,'unsupported',x.key==='ai_chance'?'AI choice weights and their modifiers are not qualified probabilities; no acceptance chance is inferred.':'This option-selection rule is not interpreted.');
     if(x.key==='ai_chance'&&Array.isArray(x.value))rule.children=boundedMap(x.value,c,weight=>{
      if(weight.key==='factor'&&literal(weight.value)!==null)return item(weight,`Source AI weight factor: ${weight.value}; not a percentage or evaluated chance.`,'explained','administrative');
      if(weight.key==='modifier'&&Array.isArray(weight.value))return item(weight,'Conditional AI weight modifier; applicability and resulting weight are not evaluated:','conditional','administrative',[
       ...boundedMap(weight.value.filter(v=>v.key==='factor'),c,v=>literal(v.value)!==null?item(v,`Source multiplier: ${v.value}; no probability is calculated.`,'explained','administrative'):unresolved(v)),
       ...explainConditions(weight.value.filter(v=>v.key!=='factor'),lookup,c,depth+1)
      ]);
      return unresolved(weight);
     });
     return rule;
    }));
   }
   children.push(...explainEffects(choice?body.filter(x=>!optionMetadata.has(x.key)):body,lookup,depth+1,c));
   const label=choice?`Option ${++option}${id?': '+name(id,lookup):' (name unresolved)'}`:n.key==='immediate'?'On event delivery':'After the selected option';
   summary.push(item(n,label+'. Effects apply only if this event/stage/choice occurs.','conditional','effect',children));continue;
  }
  // Unknown event-level mechanics must not disappear behind metadata handling.
  if(!metadata.has(n.key))summary.push(unresolved(n,'unsupported','This event-level declaration is not interpreted; delivery behavior remains uncertain.'));
 }
 if(!nodes.some(n=>n.key==='option'))summary.push(unresolved({key:'event-options',value:'',line:nodes[0]?.line||0},'unsupported','No event options are present; terminal behavior is not established.'));
 return {summary,requirements};
}

function eventCall(n:Node,lookup:NameLookup,c:ExplainContext,depth:number):Explanation{
 if(c.current.kind!=='country')return missingScope(n);
 const ns=typeof n.value==='string'?[{key:'id',value:n.value,line:n.line}]:n.value;
 const id=scalar(ns,'id'),units=['hours','days','months','random_hours','random_days','random'];
 if(ns.some(x=>x.key==='random')&&ns.some(x=>x.key==='random_hours'))return unresolved(n,'unsupported','Both legacy random and random_hours are present; alias precedence/additivity is unqualified.');
 if(!valid(ns,['id','tooltip',...units])||!id||!/^\w+\.\d+$/.test(id)||ns.some(x=>typeof x.value!=='string')||units.some(k=>ns.some(x=>x.key===k)&&(literal(scalar(ns,k))===null||Number(scalar(ns,k))<0||!Number.isInteger(Number(scalar(ns,k))))))return unresolved(n,'unsupported','Event ID, delay or parameters are dynamic, duplicated or unsupported; no dispatch or outcome is assumed.');
 const base=Number(scalar(ns,'hours'))+24*Number(scalar(ns,'days'))+720*Number(scalar(ns,'months'));
 const random=Number(scalar(ns,'random_hours'))+24*Number(scalar(ns,'random_days'))+Number(scalar(ns,'random'));
 if(!Number.isSafeInteger(base+random))return unresolved(n);
 const baseText=['hours','days','months'].filter(k=>scalar(ns,k)).map(k=>`${scalar(ns,k)} ${k}${k==='months'?' (30 days each)':''}`).join(' + ');
 const timing=random?` after ${baseText||'0 hours'} plus a random delay from 0 up to ${number(random)} hours (upper bound excluded; conservative combined bound that may exceed the reachable range, not a uniform probability)`:(baseText?` after ${baseText}`:' immediately');
 const result=item(n,`Trigger ${n.key==='news_event'?'news ':''}event “${name(id,lookup)}” for ${c.current.label}${timing}. Event choices and later outcomes are separate; delivery remains conditional.`,'conditional');
 if(!c.resolveEvent)return result;
 const linked=c.resolveEvent(id),fail=(status:ExplanationStatus,text:string)=>{result.children=[unresolved(n,status,text)];return result;};
 if(!linked)return fail('unsupported','Event definition is missing or ambiguous in this index; downstream outcomes remain unknown.');
 if(linked.ambiguous)return fail('ambiguous-scope','Multiple event definitions match; no branch is chosen.');
 if(linked.recovered||linked.limited||!linked.source||!linked.hash||!linked.version||!linked.nodes.length)return fail('parser-limitation','Event source is absent, recovered or bounded; expansion refused.');
 if(c.version&&linked.version!==c.version)return fail('unsupported','Event source version differs from the caller; patch-mismatched outcomes are not interpreted.');
 if(linked.eventType!==n.key)return fail('unsupported','Event type differs from the dispatch command; no delivery semantics are assumed.');
 if(linked.nodes.some(n=>n.key==='id')&&scalar(linked.nodes,'id')!==id)return fail('ambiguous-scope','Event identity is duplicated or differs from the requested ID; expansion refused.');
 if(depth>=16||(c.eventStack||[]).includes(id)||(c.eventStack||[]).length>=8)return fail('parser-limitation','Recursive or bounded event chain; remaining outcomes are unknown.');
 // ROOT is the scoped recipient of this call. Do not inherit PREV or invent FROM chains.
 // Event helpers/ideas need their own linked context; caller-local bindings cannot certify them.
 const eventContext:ExplainContext={...c,root:c.current,previous:undefined,from:undefined,ideas:undefined,scripts:undefined,dynamicModifiers:undefined,eventStack:[...(c.eventStack||[]),id]};
 const body=explainEvent(linked.nodes,lookup,eventContext,depth+1);
 result.children=[{text:`Event ${id} delivered to ${c.current.label}; ROOT denotes this recipient. FROM and deeper event scopes remain unresolved.`,status:'conditional',role:'effect',evidence:proof(linked),children:[...body.requirements,...body.summary]}];
 return result;
}
export function explainConditions(nodes:Node[],lookup:NameLookup=id=>id,c=defaultContext(),depth=0):Explanation[]{
 if(depth>16)return [unresolved(nodes[0]||{key:'depth',value:'',line:0},'parser-limitation','Condition nesting exceeds the explanation limit.')];
 return boundedMap(nodes,c,n=>{
  const k=n.key.toLowerCase();if(Array.isArray(n.value)){
   if(n.op&&n.op!=='=')return unresolved(n);
   if(['and','or','not'].includes(k))return {...condition(n,k==='or'?'At least one of these conditions must hold:':k==='not'?'None of these conditions may hold:':'All of these conditions must hold:'),children:explainConditions(n.value,lookup,c,depth+1)};
   if(['hidden_trigger','custom_trigger_tooltip'].includes(k))return {...condition(n,'All of these conditions must hold:'),children:explainConditions(n.value.filter(x=>x.key!=='tooltip'),lookup,c,depth+1)};
   if(k==='all_core_state'&&c.current.kind==='country')return {...condition(n,`Every core state of ${c.current.label} must meet all of:`),children:explainConditions(n.value.filter(x=>x.key!=='tooltip'),lookup,scopeContext({kind:'state',label:`each core state of ${c.current.label}`},c),depth+1)};
   if(k==='has_dynamic_modifier'&&valid(n.value,['modifier','scope'])&&scalar(n.value,'modifier')){const id=scalar(n.value,'modifier'),restricted=scalar(n.value,'scope');if(restricted&&!target(restricted,lookup,c))return missingScope(n);return condition(n,`${c.current.label} must have modifier ${name(id,lookup)}${restricted?' targeted at '+target(restricted,lookup,c):''}.`);}
   const iterations:Record<string,Scope>={any_country_with_original_tag:{label:`a country with original identity ${name(scalar(n.value,'original_tag_to_check'),lookup)}`,kind:'country'},any_controlled_state:{label:`a state controlled by ${c.current.label}`,kind:'state'},any_owned_state:{label:`a state owned by ${c.current.label}`,kind:'state'}};
   if(iterations[k])return {...condition(n,`There must be ${iterations[k].label} meeting all of:`),children:explainConditions(n.value.filter(x=>x.key!=='original_tag_to_check'),lookup,scopeContext(iterations[k],c),depth+1)};
   const scope=entity(n.key,lookup,c);if(scope)return {...condition(n,`For ${scope.label}:`),children:explainConditions(n.value,lookup,scopeContext(scope,c),depth+1)};
   return /^(FROM|PREV|ROOT|THIS|event_target:)/.test(n.key)?missingScope(n):unresolved(n,'unsupported','This scripted condition is not interpreted; availability cannot be decided.');
  }
  const v=n.value;
  if(['state','is_core_of','is_fully_controlled_by','is_controlled_by'].includes(k)&&c.current.kind!=='state')return missingScope(n);
  if(['has_completed_focus','has_tech','has_government','has_idea','has_war','is_subject','has_war_with','is_in_faction_with','has_full_control_of_state','is_subject_of'].includes(k)&&c.current.kind!=='country')return missingScope(n);
  const amount=literal(v),comparison:Record<string,string>={'=':'at least','>':'more than','<':'less than','>=':'at least','<=':'at most'};
  if(['neutrality','democratic','fascism','communism'].includes(k)&&c.current.kind==='country'&&amount!==null&&amount>=0&&amount<=1&&comparison[n.op||'='])return condition(n,`${c.current.label} must have ${comparison[n.op||'=']} ${number(amount*100)}% ${name(k,lookup)} popularity.`);
  if(k==='has_stability'&&c.current.kind==='country'&&amount!==null&&amount>=0&&amount<=1&&comparison[n.op||'='])return condition(n,`${c.current.label} must have ${comparison[n.op||'=']} ${number(amount*100)}% stability.`);
  const amounts:Record<string,string>={political_power:'political power',command_power:'command power',num_of_civilian_factories_available_for_projects:'civilian factories available for projects'};
  if(amounts[k]&&amount!==null&&comparison[n.op||'='])return condition(n,`${c.current.label} needs ${comparison[n.op||'=']} ${number(amount)} ${amounts[k]}.`);
  if(n.op&&n.op!=='=')return unresolved(n);
  if(k==='always'&&['yes','no'].includes(v))return item(n,v==='yes'?'No restriction from this rule.':'This rule prevents availability.','explained','condition');
  if(k==='has_completed_focus')return namedCondition(n,`Complete ${name(v,lookup)}.`,v,lookup);
  if(k==='has_tech')return namedCondition(n,`Research ${name(v,lookup)}.`,v,lookup);
  if(k==='has_dlc')return condition(n,`Requires ${name(v,lookup)} DLC. Ownership and enabled state must be confirmed.`);
  if(['tag','original_tag'].includes(k)){const who=target(v,lookup,c);return who?condition(n,`${k==='original_tag'?'Original country identity':'Country'} must be ${who}.`):missingScope(n);}
  if(k==='state'&&/^\d+$/.test(v))return condition(n,`State must be ${entity(v,lookup,c)!.label}.`);
  const yesNo:Record<string,[string,string]>={has_war:['Must be at war.','Must be at peace.'],is_subject:['Must be a subject country.','Must be independent.'],has_civil_war:['Must be in a civil war.','Must not be in a civil war.'],is_faction_leader:['Must lead a faction.','Must not lead a faction.'],exists:['Must exist.','Must not exist.']};
  if(yesNo[k]&&['yes','no'].includes(v))return condition(n,yesNo[k][v==='yes'?0:1]);
  const relations:Record<string,string>={is_subject_of:'be a subject of',has_war_with:'be at war with',is_in_faction_with:'share a faction with',is_core_of:'be a core of',is_fully_controlled_by:'be fully controlled by',is_controlled_by:'be controlled by',has_full_control_of_state:'fully control'};
  if(relations[k]){const who=target(v,lookup,c);return who?condition(n,`${c.current.label} must ${relations[k]} ${who}.`):missingScope(n);}
  if(k==='country_exists'){const who=target(v,lookup,c);return who?condition(n,`${who} must exist.`):missingScope(n);}
  if(['owns_state','controls_state'].includes(k)&&c.current.kind==='country'&&/^\d+$/.test(v))return condition(n,`${c.current.label} must ${k==='owns_state'?'own':'control'} ${entity(v,lookup,c)!.label}. Ownership and control are separate requirements.`);
  if(k==='has_government')return condition(n,`Government must match ${target(v,lookup,c)||name(v,lookup)}.`);
  if(k==='has_idea')return namedCondition(n,`Must have national spirit / idea: ${name(v,lookup)}.`,v,lookup);
  if(k==='has_active_mission')return namedCondition(n,`Mission must be active: ${name(v,lookup)}.`,v,lookup);
  if(['has_country_flag','has_global_flag','has_state_flag'].includes(k))return {...condition(n,`A ${k==='has_global_flag'?'global':k==='has_state_flag'?'state':'country'} script flag must be set; its current value is unknown.`),role:'administrative',code:k+':'+v};
  return unresolved(n,'unsupported','This scripted condition is not interpreted; availability cannot be decided.');
 }).map(e=>({...e,role:e.role||'condition'}));
}
const modifierUnits:Record<string,[string,'percent'|'points'|'count']>={political_power_factor:['Political power gain','percent'],political_power_gain:['Daily political power','count'],stability_factor:['Stability','points'],war_support_factor:['War support','points'],consumer_goods_factor:['Consumer goods factor','percent'],industrial_capacity_factory:['Factory output','percent'],industrial_capacity_dockyard:['Dockyard output','percent'],production_speed_buildings_factor:['Construction speed','percent'],production_speed_infrastructure_factor:['Infrastructure construction speed','percent'],production_speed_industrial_complex_factor:['Civilian factory construction speed','percent'],production_speed_arms_factory_factor:['Military factory construction speed','percent'],production_speed_dockyard_factor:['Dockyard construction speed','percent'],production_speed_bunker_factor:['Land fort construction speed','percent'],recruitable_population_factor:['Recruitable population factor','percent'],recruitable_population:['Recruitable population','points'],equipment_conversion_speed:['Equipment conversion speed','percent'],weekly_manpower:['Weekly manpower','count'],mobilization_laws_cost_factor:['Mobilization law cost','percent'],civilian_factory_use:['Civilian factories committed','count'],production_factory_max_efficiency_factor:['Production efficiency cap','percent'],production_factory_efficiency_gain_factor:['Production efficiency growth','percent'],research_speed_factor:['Research speed','percent']};
export function explainModifiers(nodes:Node[],lookup:NameLookup=id=>id):Explanation[]{return nodes.map(n=>{const amount=literal(n.value),known=modifierUnits[n.key];return known&&amount!==null?item(n,`${known[0]}: ${amount>=0?'+':''}${number(amount*(known[1]==='count'?1:100))}${known[1]==='points'?' percentage points':known[1]==='percent'?'%':''}.`,'explained','modifier'):unresolved(n,'unsupported','This modifier or its formula is not yet interpreted.');});}
function idea(n:Node,id:string,lookup:NameLookup,c:ExplainContext,duration=''):Explanation{
 const linked=c.ideas?.[id];if(linked?.ambiguous)return unresolved(n,'ambiguous-scope','Multiple idea definitions match; no modifier values are chosen.');
 const result=namedItem(n,`Add national spirit / idea ${name(id,lookup)} to ${c.current.label}${duration}.`,id,lookup);
 result.children=linked?explainModifiers(linked.modifiers||[],lookup).map(x=>({...x,evidence:proof({...linked,line:x.line||linked.line})})):[unresolved(n,'unsupported','The idea’s modifiers are not resolved in this reference snapshot.')];return result;
}
export function explainEffects(nodes:Node[],lookup:NameLookup=id=>id,depth=0,c=defaultContext()):Explanation[]{
 if(depth>16)return [unresolved(nodes[0]||{key:'depth',value:'',line:0},'parser-limitation','Effect nesting exceeds the explanation limit.')];
 return nodes.flatMap((n,index):Explanation[]=>{
  if(c.budget&&--c.budget.remaining<0)return c.budget.remaining===-1?[unresolved(n,'parser-limitation','Explanation work limit reached; remaining effects are not interpreted.')]:[];
  const k=n.key.toLowerCase();if(n.op&&n.op!=='=')return [unresolved(n)];
  if(['country_event','news_event'].includes(k))return [eventCall(n,lookup,c,depth)];
  if(k==='effect_tooltip'&&Array.isArray(n.value))return [item(n,'Game tooltip describes effects; those effects are not executed by this tooltip block. Inspect the advanced source for its display content.','explained','tooltip')];
  const script=c.scripts?.[n.key];if(script){
   if(script.ambiguous)return [unresolved(n,'ambiguous-scope','Multiple scripted-effect definitions match; no expansion chosen.')];
   if(script.limited)return [unresolved(n,'parser-limitation','Scripted-effect source exceeds the bounded reference context; expansion refused.')];
   if(script.recovered)return [unresolved(n,'parser-limitation','Scripted-effect source has parser recovery warnings; expansion refused.')];
   if(n.value!=='yes'||JSON.stringify(script.nodes).includes('$'))return [unresolved(n,'unsupported','Parameterized scripted effects are not expanded.')];
   if((c.scriptStack||[]).includes(n.key)||(c.scriptStack||[]).length>=8)return [unresolved(n,'parser-limitation','Recursive or excessively nested scripted effect; expansion stopped.')];
   return [{...item(n,'Source-defined scripted rewards:','explained','effect',explainEffects(script.nodes,lookup,depth+1,{...c,scriptStack:[...(c.scriptStack||[]),n.key]})),evidence:proof(script)}];
  }
  if(Array.isArray(n.value)){
   const ns=n.value,get=(key:string)=>scalar(ns,key);
   if(k==='set_politics'&&c.current.kind==='country'&&valid(ns,['ruling_party','elections_allowed','long_name','name'])&&ns.every(x=>typeof x.value==='string'&&(!x.op||x.op==='='))&&['neutrality','democratic','fascism','communism'].includes(get('ruling_party'))&&['','yes','no'].includes(get('elections_allowed'))&&!ns.some(x=>/[\[\]$?]/.test(String(x.value))))return [item(n,`Set ${c.current.label}’s ruling party to ${name(get('ruling_party'),lookup)}${get('elections_allowed')?`; ${get('elections_allowed')==='yes'?'allow':'disallow'} elections`:''}. This does not set party popularity or identify the country leader.`)];
   if(k==='set_popularities'&&c.current.kind==='country'&&valid(ns,['neutrality','democratic','fascism','communism'])&&ns.length&&ns.every(x=>(!x.op||x.op==='=')&&literal(x.value)!==null&&Number(x.value)>=0&&Number(x.value)<=100)&&Math.abs(ns.reduce((sum,x)=>sum+Number(x.value),0)-100)<1e-9)return [item(n,`Set party popularities in ${c.current.label}: ${ns.map(x=>`${name(x.key,lookup)} ${number(Number(x.value))}%`).join(', ')}; omitted ideologies become 0%. These are assigned shares, not percentage-point changes.`)];
   if(k==='promote_character'&&c.current.kind==='country'&&valid(ns,['character','ideology'])&&ns.every(x=>!x.op||x.op==='=')&&get('character')&&get('ideology')&&/^[A-Za-z0-9_]+$/.test(get('character'))&&/^[A-Za-z0-9_]+$/.test(get('ideology')))return [item(n,`Promote ${name(get('character'),lookup)} to head of the ${name(get('ideology'),lookup)} party in ${c.current.label}; becomes country leader only if that party rules and the character has the required role. Role eligibility and current leadership are not evaluated.`,'conditional','effect',[characterGap(n)])];
   if(k==='start_civil_war'&&c.current.kind==='country'&&get('ideology')&&!/[\[\]$?]/.test(get('ideology'))){
    // Installed effect documentation confirms the consequence, not runtime force allocation or victory.
    return [item(n,`Start a ${name(get('ideology'),lookup)} civil war in ${c.current.label}. Force allocation and outcome remain unresolved.`,'conditional','effect',[
     unresolved(n,'unsupported','Civil-war strength, territorial allocation, leaders and subsequent outcomes are not evaluated; do not treat this path as a safe transition.')
    ])];
   }
   if(['if','else_if','else'].includes(k)){
    const previous=nodes[index-1]?.key.toLowerCase();if(k!=='if'&&!['if','else_if'].includes(previous))return [unresolved(n,'parser-limitation','Conditional branch has no matching predecessor.')];
    const limits=ns.filter(x=>x.key==='limit');if(limits.length>1||limits.some(x=>!Array.isArray(x.value)))return [unresolved(n,'parser-limitation','Conditional limit is malformed or ambiguous.')];
    return [item(n,k==='if'?'Only if all conditions below hold:':k==='else_if'?'Otherwise, if all conditions below hold:':'Otherwise (when earlier branches do not apply):','conditional','effect',[...explainConditions(limits.flatMap(x=>x.value as Node[]),lookup,c,depth+1),...explainEffects(ns.filter(x=>x.key!=='limit'),lookup,depth+1,c)])];
   }
   if(k==='hidden_effect')return [item(n,'Effects hidden by the game tooltip (same scope and conditions):','explained','effect',explainEffects(ns,lookup,depth+1,c))];
   if(['every_country','every_other_country','every_subject_country','every_state'].includes(k)){
    const state=k==='every_state',label=state?'each matching state':k==='every_subject_country'?`each matching subject of ${c.current.label}`:k==='every_other_country'?`each matching country other than ${c.current.label}`:'each matching country';
    const child=scopeContext({label,kind:state?'state':'country'},c),limits=ns.filter(x=>x.key==='limit');if(limits.some(x=>!Array.isArray(x.value))||limits.length>1)return [unresolved(n,'parser-limitation')];
    return [item(n,`For ${label}${limits.length?', only where all these conditions hold':''}:`,'conditional','effect',[...explainConditions(limits.flatMap(x=>x.value as Node[]),lookup,child,depth+1),...explainEffects(ns.filter(x=>x.key!=='limit'),lookup,depth+1,child)])];
   }
   const scope=entity(n.key,lookup,c);if(scope)return [item(n,`For ${scope.label}:`,'explained','effect',explainEffects(ns,lookup,depth+1,scopeContext(scope,c)))];
   if(/^(FROM|ROOT|PREV|THIS|event_target:)/.test(n.key))return [missingScope(n)];
   if(k==='add_timed_idea'&&c.current.kind==='country'&&valid(ns,['idea','days','months','years'])&&get('idea')){const units=['years','months','days'].filter(key=>get(key));if(!units.length||units.some(key=>literal(get(key))===null||!Number.isInteger(Number(get(key)))||Number(get(key))<=0))return [unresolved(n)];return [idea(n,get('idea'),lookup,c,' for '+units.map(key=>`${number(Number(get(key)))} ${key}`).join(', '))];}
   if(k==='add_ideas'&&c.current.kind==='country'&&ns.every(x=>x.key===''&&typeof x.value==='string'))return ns.map(x=>idea(n,x.value as string,lookup,c));
   if(k==='swap_ideas'&&c.current.kind==='country'&&valid(ns,['remove_idea','add_idea'])&&get('remove_idea')&&get('add_idea')){const added=idea(n,get('add_idea'),lookup,c);if(added.unknown)return [added];return [{...added,text:`Replace national spirit / idea ${name(get('remove_idea'),lookup)} with the replacement version ${name(get('add_idea'),lookup)} in ${c.current.label}. Replacement idea values (not net changes):`}];}
   if(k==='remove_dynamic_modifier'&&['state','country'].includes(c.current.kind)&&valid(ns,['modifier','scope'])&&get('modifier')){if(get('scope')&&!target(get('scope'),lookup,c))return [missingScope(n)];return [namedItem(n,`Remove modifier ${name(get('modifier'),lookup)} from ${c.current.label}${get('scope')?', targeted at '+target(get('scope'),lookup,c):''}.`,get('modifier'),lookup)];}
   if(['set_variable','add_to_variable'].includes(k)&&c.current.kind==='country'){
    const values=ns.filter(x=>x.key!=='tooltip');if(values.length!==1||literal(values[0].value)===null||ns.filter(x=>x.key==='tooltip').length>1)return [unresolved(n,'unsupported','Variable formula or parameters are not interpreted; final values remain unknown.')];
    const variable=values[0].key,amount=Number(values[0].value);const bindings=Object.values(c.dynamicModifiers||{}).filter(s=>!s.ambiguous&&!s.recovered).flatMap(s=>s.nodes.filter(x=>x.value===variable&&modifierUnits[x.key]).map(x=>({s,key:x.key})));
    const keys=[...new Set(bindings.map(x=>x.key))];if(keys.length!==1)return [unresolved(n,'unsupported','This variable has no unique supported modifier meaning in the linked sources.')];
    const [label,unit]=modifierUnits[keys[0]],value=number(amount*(unit==='count'?1:100)),suffix=unit==='count'?'':k==='add_to_variable'?' percentage points':'%';
    return [{...item(n,`${k==='set_variable'?'Set':'Change'} the stored ${label.toLowerCase()} contribution for ${c.current.label} ${k==='set_variable'?'to':'by'} ${k==='add_to_variable'&&amount>=0?'+':''}${value}${suffix}. Applies through matching active dynamic modifiers; activation and final campaign totals are unknown.`,'conditional'),evidence:bindings.flatMap(x=>proof(x.s))}];
   }
   if(k==='add_dynamic_modifier'&&valid(ns,['modifier','days','scope'])&&get('modifier')){if(get('days')&&(literal(get('days'))===null||Number(get('days'))<0))return [unresolved(n)];if(get('scope')&&!target(get('scope'),lookup,c))return [missingScope(n)];return [namedItem(n,`Add modifier ${name(get('modifier'),lookup)} to ${c.current.label}${get('scope')?', applying only to '+target(get('scope'),lookup,c):''}${get('days')?' for '+number(Number(get('days')))+' days':''}. Its dynamic values are not evaluated.`,get('modifier'),lookup)];}
   if(k==='add_autonomy_score'&&c.current.kind==='country'&&valid(ns,['value','localization'])&&literal(get('value'))!==null)return [item(n,`Change ${c.current.label}’s autonomy score by ${Number(get('value'))>=0?'+':''}${number(Number(get('value')))}.`)];
   if(k==='add_popularity'&&c.current.kind==='country'&&valid(ns,['ideology','popularity'])&&get('ideology')&&literal(get('popularity'))!==null)return [item(n,`Change ${name(get('ideology'),lookup)} popularity in ${c.current.label} by ${Number(get('popularity'))>=0?'+':''}${number(Number(get('popularity'))*100)} percentage points.`)];
   if(k==='create_wargoal'&&c.current.kind==='country'&&valid(ns,['target','type'])&&get('type')==='annex_everything'){
    const who=entity(get('target'),lookup,c);return who?.kind==='country'?[item(n,`${c.current.label} gains an annexation war goal against ${who.label}. This does not declare war or annex territory.`)]:[missingScope(n)];
   }
   if(k==='annex_country'&&c.current.kind==='country'&&valid(ns,['target','transfer_troops'])&&target(get('target'),lookup,c)&&['','yes','no'].includes(get('transfer_troops')))return [item(n,`${c.current.label} annexes ${target(get('target'),lookup,c)}${get('transfer_troops')==='yes'?' and receives its troops':get('transfer_troops')==='no'?' without transferring its troops':''}.`)];
   if(k==='add_resource'&&valid(ns,['type','amount','state','days','show_state_in_tooltip'])&&get('type')&&literal(get('amount'))!==null){const state=get('state')?entity(get('state'),lookup,c):c.current;if(!state||state.kind!=='state')return [missingScope(n)];if(get('days')&&(literal(get('days'))===null||Number(get('days'))<0))return [unresolved(n)];return [item(n,`Change ${name(get('type'),lookup)} production in ${state.label} by ${Number(get('amount'))>=0?'+':''}${number(Number(get('amount')))}${get('days')?' for '+get('days')+' days':''}.`)];}
   if(k==='add_building_construction'&&c.current.kind==='state'&&valid(ns,['type','level','instant_build'])&&get('type')&&literal(get('level'))!==null&&Number.isInteger(Number(get('level')))&&Number(get('level'))>0&&['','yes','no'].includes(get('instant_build')))return [item(n,`${get('instant_build')==='yes'?'Instantly add':'Begin construction of'} ${get('level')} level(s) of ${name(get('type'),lookup)} in ${c.current.label}.`)];
   return [unresolved(n)];
  }
  const v=n.value,amount=literal(v);
  if(['custom_effect_tooltip','event_option_tooltip','effect_tooltip','show_ideas_tooltip','unlock_decision_tooltip'].includes(k))return [item(n,`Game tooltip: ${name(v,lookup)}. Descriptive text only; not an independently interpreted outcome or unlock.`,'explained','tooltip')];
  if(['set_country_flag','clr_country_flag','set_global_flag','clr_global_flag','set_state_flag','clr_state_flag'].includes(k))return [item(n,`${k.startsWith('set')?'Set':'Clear'} a ${k.includes('global')?'global':k.includes('state')?'state':'country'} script flag. This is bookkeeping, not a quantified reward.`,'explained','administrative')];
  if(k==='add_core_of'&&c.current.kind==='state'){const who=entity(v,lookup,c);return who?.kind==='country'?[item(n,`${c.current.label} becomes a core of ${who.label}.`)]:[missingScope(n)];}
  if(c.current.kind!=='country')return [missingScope(n)];
  if(k==='promote_character'&&/^[A-Za-z0-9_]+$/.test(v))return [item(n,`Promote ${name(v,lookup)} to head of their political party in ${c.current.label}; becomes country leader only if that party rules. Multiple leader roles require an explicit ideology; character eligibility and current leadership are not evaluated.`,'conditional','effect',[characterGap(n)])];
  const units:Record<string,string>={add_political_power:'political power',add_manpower:'manpower',add_command_power:'command power',army_experience:'army experience',navy_experience:'naval experience',air_experience:'air experience'};
  if(units[k]&&amount!==null)return [item(n,`${amount<0?'Lose':'Gain'} ${number(Math.abs(amount))} ${units[k]}.`)];
  if(['add_stability','add_war_support'].includes(k)&&amount!==null)return [item(n,`${amount<0?'Decrease':'Increase'} ${k==='add_stability'?'stability':'war support'} by ${number(Math.abs(amount)*100)} percentage points.`)];
  if(k==='add_ideas'&&!/[\[\]$?]/.test(v))return [idea(n,v,lookup,c)];
  if(k==='remove_ideas'&&!/[\[\]$?]/.test(v))return [namedItem(n,`Remove national spirit / idea ${name(v,lookup)} from ${c.current.label}.`,v,lookup)];
  return [unresolved(n)];
 });
}
/** Compact paths preserve every condition/scope ancestor; bookkeeping/tooltips are never ranked as benefits. */
export function explanationPreview(items:Explanation[],limit=3):Explanation[]{
 const paths:Explanation[]=[];
 const visit=(e:Explanation,parents:Explanation[])=>{if(e.role==='administrative'||e.role==='tooltip'||e.role==='condition')return;
  if(e.children?.length===0&&!['add_ideas','add_timed_idea','swap_ideas','add_dynamic_modifier'].includes(e.code||''))return;
  if(e.children?.length){const conditions=e.children.filter(x=>x.role==='condition'||x.status==='state-unknown');const other=e.children.filter(x=>!conditions.includes(x));
   const label=conditions.length?{...e,text:e.text.replace(', only where all these conditions hold:', ' where:')+' '+conditions.map(x=>conditionSentence(x)).join(' ')}:e;
   // An idea award is itself meaningful even when its modifier definitions remain unsupported.
   if(e.code==='add_timed_idea'||e.code==='add_ideas'||e.code==='add_dynamic_modifier'||e.code==='swap_ideas'||e.code==='start_civil_war'){paths.push({...e,text:[...parents.map(p=>p.text),e.text,...other.filter(x=>!x.unknown&&!x.children).map(x=>x.text)].join(' '),status:parents.some(p=>p.status==='conditional')?'conditional':e.status,children:undefined});return;}
   for(const child of other)visit(child,e.code==='hidden_effect'||e.text==='Source-defined scripted rewards:'?parents:[...parents,label]);
  }else if(!e.unknown&&e.role!=='cost'&&e.role!=='timing')paths.push({...e,text:[...parents.map(p=>p.text),e.text].join(' '),status:parents.some(p=>p.status==='conditional')?'conditional':e.status,children:undefined});};
 for(const e of items)visit(e,[]);return paths.slice(0,limit);
}
export function conditionSentence(e:Explanation):string{if(e.code==='any_controlled_state'&&e.children?.length===1)return 'Controls '+conditionSentence(e.children[0]);if(e.code?.toLowerCase()==='or'&&e.children&&e.children.length>4&&e.children.every(x=>x.code==='state'))return `One of ${e.children.length} listed states (${e.children.slice(0,3).map(x=>x.text.replace('State must be ','').replace(/\.$/,'')).join(', ')}, …; full list in details).`;return e.text+(e.children?.length?' '+e.children.map(conditionSentence).join(' '):'');}
