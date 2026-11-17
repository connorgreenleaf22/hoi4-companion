import {createHash} from 'node:crypto';
import type {Entry,Node} from '../../src/types';
import type {KnowledgeDesign,KnowledgeIssue,KnowledgeMetric,KnowledgeResult,KnowledgeScenario,KnowledgeSearchResult,StatContribution,TankDesign,DivisionDesign} from '../../src/knowledge-engine-types';
import {block,scalar,numeric} from '../parser';
import {evaluationSchema,searchSchema} from './schema';
import {atPath,nodes,reference,type KnowledgeSource} from './source';

export const FORMULA_VERSION='knowledge-estimates-v1';
const digest=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const stats=new Set(['soft_attack','hard_attack','air_attack','defense','breakthrough','armor_value','ap_attack','hardness','maximum_speed','reliability','build_cost_ic','fuel_consumption','combat_width','manpower','max_organisation','max_strength','supply_consumption','default_morale']);
const combat=['soft_attack','hard_attack','air_attack','defense','breakthrough','armor_value','ap_attack','hardness','maximum_speed','fuel_consumption'];
const asList=(ns:Node[])=>ns.flatMap(n=>typeof n.value==='string'?[n.value]:[]);
const num=(n:Node)=>typeof n.value==='string'&&n.value.trim()!==''&&Number.isFinite(Number(n.value))?Number(n.value):undefined;
const gates=new Set(['allowed','available','allow','can_be_produced','limit','visible','potential']);
const metaKeys=new Set(['name','description','icon','picture','sprite','category','categories','type','group','research_cost','start_year','year','xp_cost','xp_type','x','y','position','folder','path','ai_will_do','ai_weight','ai_research_weights','research_weight','research_categories','tracks','track','milestones','rewards','cost','enable_tactic','enable_equipments','enable_subunits','enable_equipment_modules','enable_building','show_effect_as_desc','doctrine_name','mutually_exclusive','prerequisites','prerequisite','dependencies','relative_position_id','parent','token']);
type Adjustment={stat:string;value:number;operation:'add'|'factor';target:string;layer:'equipment'|'unit'|'scenario';entry:Entry;line:number};
type Context={source:KnowledgeSource;scenario:KnowledgeScenario;issues:KnowledgeIssue[];used:Map<string,Entry>;techs:Entry[];adjustments:Adjustment[];units:Entry[];equipment:Entry[]};
function issue(c:Context,code:string,message:string,blocking=true,e?:Entry,line?:number){c.issues.push({code,message,blocking,reference:e?reference(e):undefined,line});}
function resolve(c:Context,r:string,kind?:string):Entry {
  const result=c.source.resolve(r,kind);if(result.status!=='resolved'||!result.entry)throw new Error(`Missing or ambiguous ${kind||'definition'}: ${r}`);
  const e=result.entry;if(e.version!==c.scenario.gameVersion)throw new Error(`Source version mismatch for ${e.id}. Refresh the source index.`);
  c.used.set(e.uid,e);if(e.data.importWarnings?.length)issue(c,'recovered-source',`Parser recovery in ${e.id}; inspect the original definition.`,true,e);
  return e;
}
function condition(c:Context,ns:Node[],mode='AND'):boolean|undefined {
  let branchTaken:boolean|undefined=false;
  const values=ns.map((n):boolean|undefined=>{
    if(n.op&&n.op!=='=')return undefined;
    if(Array.isArray(n.value)&&['if','else_if','else'].includes(n.key)){
      if(n.key!=='if'&&branchTaken===true)return true;
      if(n.key!=='if'&&branchTaken===undefined)return undefined;
      const gate=n.key==='else'?true:condition(c,block(n.value,'limit'));
      branchTaken=gate;
      return gate===false?true:gate===undefined?undefined:condition(c,n.value.filter(v=>v.key!=='limit'));
    }
    if(Array.isArray(n.value))return ['AND','OR','NOT'].includes(n.key)?condition(c,n.value,n.key):undefined;
    if(n.key==='always')return n.value==='yes';
    if(n.key==='tag'||n.key==='original_tag')return n.value===c.scenario.country;
    if(n.key==='has_dlc')return true; // Explicit all-DLC scenario assumption, never entitlement evidence.
    if(n.key==='has_tech')return c.techs.some(e=>e.id===n.value);
    if(n.key==='has_idea')return c.scenario.modifiers.some(s=>{const r=c.source.resolve(s.reference,'idea');return r.status==='resolved'&&r.entry?.id===n.value;});
    return undefined;
  });
  const any=values.includes(true)?true:values.includes(undefined)?undefined:false;
  if(mode==='NOT')return any===undefined?undefined:!any;
  if(mode==='OR')return any;
  return values.includes(false)?false:values.includes(undefined)?undefined:true;
}
function checkGates(c:Context,e:Entry,ns=nodes(e)){
  const conditions=[...ns.filter(n=>gates.has(n.key)),...(e.data.inheritedConditions||[])];
  for(const n of conditions){const v=Array.isArray(n.value)?condition(c,n.value):undefined;if(v!==true)issue(c,v===false?'condition-failed':'condition-unresolved',`${e.title}: ${n.key} ${v===false?'does not pass':'needs a manual engine check'}.`,true,e,n.line);}
}
function unlock(c:Context,e:Entry,key:string){
  const active=scalar(nodes(e),'active');
  if(active==='yes'||e.data.is_archetype==='yes')return;
  const declares=c.techs.some(t=>nodes(t).filter(n=>n.key===key&&Array.isArray(n.value)).some(n=>asList(n.value as Node[]).includes(e.id)));
  if(!declares)issue(c,'research-unlock',`${e.title}: no selected researched technology explicitly unlocks this ${e.kind}.`,true,e);
}
function lineage(c:Context,e:Entry,seen=new Set<string>()):Entry[]{
  if(seen.has(e.uid))throw new Error('Equipment archetype inheritance cycle.');seen.add(e.uid);
  const archetype=scalar(nodes(e),'archetype');return [...(archetype?lineage(c,resolve(c,archetype,'equipment'),seen):[]),e];
}
function baseEquipment(c:Context,e:Entry){
  const family=lineage(c,e);const values:Record<string,number>={};
  for(const p of family)for(const [k,v] of Object.entries(p.data.stats||numeric(nodes(p))))if(stats.has(k))values[k]=v as number;
  return {family,values};
}
function contribution(e:Entry,label:string,operation:StatContribution['operation'],value:number,line=e.line):StatContribution {
  return {label,reference:reference(e),operation,value,evidence:{class:'installed-script',source:e.source,line,hash:e.hash,gameVersion:e.version,rule:FORMULA_VERSION}};
}
function metric(value:number|null,rule:string,contributions:StatContribution[]=[],quality:KnowledgeMetric['quality']='estimate'):KnowledgeMetric{return {value,quality:value===null?'unsupported':quality,rule,contributions};}
function sumContributions(items:StatContribution[]){return items.filter(i=>i.operation==='aggregate').reduce((n,i)=>n+i.value,0);}
function targetMatches(target:string,e:Entry,family:Entry[]=[]){
  return target==='*'||[...family,e].some(p=>p.id===target||asList(block(nodes(p),'categories')).includes(target)||asList(block(nodes(p),'type')).includes(target)||scalar(nodes(p),'type')===target);
}
const countryFactors:Record<string,string>={army_org_factor:'max_organisation',army_attack_factor:'attack_factor',army_defence_factor:'defence_factor',army_speed_factor:'maximum_speed',supply_consumption_factor:'supply_consumption'};
function extractAdjustments(c:Context,e:Entry,ns:Node[],target='*',equipmentMode=false){
  for(const n of ns){
    if(gates.has(n.key)||metaKeys.has(n.key))continue;
    if(n.key==='modifier'||n.key==='equipment_bonus'){if(Array.isArray(n.value))extractAdjustments(c,e,n.value,target,n.key==='equipment_bonus'||equipmentMode);continue;}
    if(n.key==='production_bonus'||n.key==='organization_modifier'){issue(c,'non-design-effect',`${e.title}: ${n.key} affects production/MIO progression, outside this stat estimate.`,false,e,n.line);continue;}
    if(Array.isArray(n.value)){
      const knownTarget=c.units.some(u=>u.id===n.key||asList(block(nodes(u),'categories')).includes(n.key))||c.equipment.some(p=>p.id===n.key||scalar(nodes(p),'type')===n.key);
      if(knownTarget){extractAdjustments(c,e,n.value,n.key,equipmentMode);continue;}
      issue(c,'unmodeled-effect',`${e.title}: block ${n.key} is not applied.`,true,e,n.line);continue;
    }
    const mapped=countryFactors[n.key]||n.key,v=num(n);
    if(v===undefined||!stats.has(mapped)&&!['attack_factor','defence_factor'].includes(mapped)){
      issue(c,'unmodeled-effect',`${e.title}: ${n.key} is not applied.`,true,e,n.line);continue;
    }
    const layer=equipmentMode||target!=='*'&&c.equipment.some(p=>p.id===target)?'equipment':target==='*'?'scenario':'unit';
    c.adjustments.push({stat:mapped,value:v,operation:!equipmentMode&&n.key==='max_organisation'?'add':'factor',target,layer,entry:e,line:n.line});
  }
}
function adjustments(c:Context){
  for(const e of c.techs){checkGates(c,e);extractAdjustments(c,e,nodes(e));}
  const seen=new Set<string>();
  for(const selection of c.scenario.modifiers){
    const e=resolve(c,selection.reference);if(!['idea','doctrine','doctrine_reward','doctrine_milestone','organization'].includes(e.kind))throw new Error('Select a doctrine, spirit or MIO modifier.');
    const key=e.uid+JSON.stringify(selection.path||[]);if(seen.has(key))throw new Error('Duplicate modifier selection.');seen.add(key);
    checkGates(c,e);const ns=atPath(e,selection.path);
    if(selection.path?.length&&e.kind!=='organization')throw new Error('Nested selections are supported for MIO traits only.');
    if(e.kind==='organization'){
      if(!e.source.includes('/organizations/'))throw new Error('Select a real MIO organization, not AI weighting metadata.');
      if(!selection.path?.length){issue(c,'mio-select-trait','Select individual MIO traits, including the initial trait; the whole organization is not an active bonus.',true,e);continue;}
      const original=nodes(e)[selection.path[0]];
      if(selection.path.length!==1||!['initial_trait','trait'].includes(original?.key))throw new Error('Select an initial MIO trait or an individual trait block.');
      checkGates(c,e,ns);
      const targets=asList(block(ns,'limit_to_equipment_type'));const organizationTargets=asList(block(nodes(e),'equipment_type'));
      const matching=targets.length?targets:organizationTargets;
      if(!matching.length){issue(c,'mio-target-unresolved',`${e.title}: MIO equipment targets are absent or inherited.`,true,e);continue;}
      for(const target of matching)if(!c.equipment.some(p=>targetMatches(target,p)))issue(c,'mio-target-unresolved',`${e.title}: equipment group ${target} is not resolved by this index.`,true,e);
      for(const target of new Set(matching))extractAdjustments(c,e,block(ns,'equipment_bonus'),target,true);
      if(block(ns,'production_bonus').length)issue(c,'non-design-effect',`${e.title}: production bonuses excluded from design stats.`,false,e);
      issue(c,'manual-mio-traits',`${e.title}: selected trait ownership, parent choices and mutual exclusions are manual assertions.`,false,e);
    }else extractAdjustments(c,e,ns);
  }
}
function apply(c:Context,key:string,value:number,e:Entry,family:Entry[],trace:StatContribution[],phase:'equipment'|'unit'){
  // Country factors apply once at division level; targeted tech/doctrine modifiers apply to their declared unit/equipment.
  const selected=[...new Map(c.adjustments.filter(a=>a.layer===phase&&targetMatches(a.target,e,family)&&a.stat===key).map(a=>[a.entry.uid+':'+a.line,a])).values()];
  const adds=selected.filter(a=>a.operation==='add'),factors=selected.filter(a=>a.operation==='factor');
  for(const a of [...adds,...factors])trace.push(contribution(a.entry,`${a.target}: ${key} (${phase})`,a.operation,a.value,a.line));
  return (value+adds.reduce((n,a)=>n+a.value,0))*(1+factors.reduce((n,a)=>n+a.value,0));
}
function globalAdjust(c:Context,key:string,value:number,trace:StatContribution[]){
  const aliases=[key,...(['soft_attack','hard_attack'].includes(key)?['attack_factor']:[]),...(['defense','breakthrough'].includes(key)?['defence_factor']:[])];
  const selected=c.adjustments.filter(a=>a.layer==='scenario'&&aliases.includes(a.stat));
  for(const a of selected)trace.push(contribution(a.entry,`Scenario ${key}`,a.operation,a.value,a.line));
  return (value+selected.filter(a=>a.operation==='add').reduce((n,a)=>n+a.value,0))*(1+selected.filter(a=>a.operation==='factor').reduce((n,a)=>n+a.value,0));
}
function tank(c:Context,d:TankDesign):Record<string,KnowledgeMetric>{
  const e=resolve(c,d.chassis,'equipment'),{family,values}=baseEquipment(c,e);
  if(!family.some(p=>p.id.endsWith('_tank_chassis')))throw new Error('Select a modular tank chassis.');
  if(e.data.is_archetype==='yes')throw new Error('Select a concrete chassis, not an archetype.');
  unlock(c,e,'enable_equipments');for(const p of family)checkGates(c,p);
  let slotNodes:Node[]=[];for(const p of family){const b=block(nodes(p),'module_slots');if(b.length)slotNodes=b;}
  const slots=new Map<string,Node[]>();
  for(const n of slotNodes){if(Array.isArray(n.value))slots.set(n.key,n.value);else if(n.value==='inherit')issue(c,'slot-inheritance',`Unresolved inherited slot ${n.key}.`,true,e,n.line);else if(slots.has(n.value))slots.set(n.key,slots.get(n.value)!);else issue(c,'slot-alias',`Unresolved slot alias ${n.key}.`,true,e,n.line);}
  const assigned=new Map<string,Entry>();
  for(const picked of d.modules){
    if(assigned.has(picked.slot))throw new Error('A tank slot can have only one module.');
    const module=resolve(c,picked.module,'module'),slot=slots.get(picked.slot);assigned.set(picked.slot,module);
    if(!slot){issue(c,'unknown-slot',`Unknown tank slot ${picked.slot}.`,true,module);continue;}
    unlock(c,module,'enable_equipment_modules');checkGates(c,module);
  }
  for(const [slot,ns] of slots)if(scalar(ns,'required')==='yes'&&!assigned.has(slot))issue(c,'required-slot',`Choose a module for required slot ${slot}.`,true,e);
  // Modules can add accepted categories to another slot (e.g. medium turret enables a medium gun).
  const effectiveCategories=new Map([...slots].map(([id,ns])=>[id,new Set(asList(block(ns,'allowed_module_categories')))]));
  for(const module of assigned.values())for(const constraint of nodes(module).filter(n=>n.key==='allowed_module_categories'&&Array.isArray(n.value))){
    for(const n of constraint.value as Node[]){const categories=effectiveCategories.get(n.key);if(!categories||!Array.isArray(n.value))issue(c,'module-constraint',`Unresolved constrained slot ${n.key}.`,true,module,n.line);else for(const category of asList(n.value))categories.add(category);}
  }
  for(const [slot,module] of assigned)if(!effectiveCategories.get(slot)?.has(scalar(nodes(module),'category')))issue(c,'module-category',`${module.title} does not fit ${slot} with the selected modules.`,true,module);
  const limits=new Map<string,{entry:Entry;node:Node}>();
  for(const p of family)for(const n of nodes(p).filter(n=>n.key==='module_count_limit'&&Array.isArray(n.value))){const ns=n.value as Node[];limits.set(JSON.stringify(ns.filter(x=>x.key==='module'||x.key==='category').map(x=>[x.key,x.value])),{entry:p,node:n});}
  for(const {entry:p,node:n} of limits.values()){
    const ns=n.value as Node[],rule=ns.find(n=>n.key==='count'),selectors=ns.filter(n=>n.key==='module'||n.key==='category');
    if(!rule||!selectors.length){issue(c,'module-count-rule','Unresolved module count rule.',true,p,n.line);continue;}
    if(rule.value==='any')continue;
    let count=0;for(const [slot] of slots){const m=assigned.get(slot);if(selectors.some(s=>s.value==='any'&&!!m||s.value==='empty'&&!m||m&&(s.key==='module'?s.value===m.id:s.value===scalar(nodes(m),'category'))))count++;}
    const expected=num(rule),op=rule.op||'=';const pass=expected!==undefined&&(op==='<'?count<expected:op==='>'?count>expected:op==='<='?count<=expected:op==='>='?count>=expected:op==='='?count===expected:false);
    if(!pass)issue(c,'module-count',`Module count ${count} fails ${op} ${rule.value}.`,true,p,n.line);
  }
  const add:Record<string,number>={},factor:Record<string,number>={},trace:Record<string,StatContribution[]>={};
  const record=(entry:Entry,key:string,value:number,operation:'add'|'factor',line:number)=>{if(!stats.has(key)){issue(c,'unmodeled-stat',`${entry.title}: ${key} omitted.`,true,entry,line);return;}const dest=operation==='add'?add:factor;dest[key]=(dest[key]||0)+value;(trace[key]||=[]).push(contribution(entry,entry.title,operation,value,line));};
  const multipliers=Object.assign({},...family.map(p=>numeric(block(nodes(p),'module_add_stats_multiplier'))));
  for(const module of assigned.values()){
    for(const n of nodes(module)){
      if(n.key==='add_stats'||n.key==='multiply_stats')for(const stat of Array.isArray(n.value)?n.value:[]){const v=num(stat);if(v===undefined)issue(c,'dynamic-stat',`${module.title}: dynamic ${stat.key}.`,true,module,stat.line);else record(module,stat.key,v*(n.key==='add_stats'?1+(multipliers[stat.key]||0):1),n.key==='add_stats'?'add':'factor',stat.line);}
      else if(['add_average_stats','mission_type_stats','forbid_equipment_type','forbid_equipment_type_exact_match_for_category','allow_equipment_type','category_count_limit','module_count_limit'].includes(n.key))issue(c,'unmodeled-module-rule',`${module.title}: ${n.key} needs an engine check.`,true,module,n.line);
    }
  }
  const upgrades=new Set<string>();
  for(const picked of d.upgrades){
    const u=resolve(c,picked.reference,'upgrade');if(upgrades.has(u.uid))throw new Error('Duplicate upgrade.');upgrades.add(u.uid);
    if(!asList(block(nodes(family[0]),'upgrades')).includes(u.id))issue(c,'unsupported-upgrade',`${u.title} is not declared for this chassis.`,true,u);
    const max=Number(scalar(nodes(u),'max_level','0'));if(picked.level>max)issue(c,'upgrade-level',`${u.title} exceeds maximum level ${max}.`,true,u);
    for(const threshold of block(nodes(u),'level_requirements'))if(Number(threshold.key)<=picked.level&&(!Array.isArray(threshold.value)||condition(c,threshold.value)!==true))issue(c,'upgrade-requirement',`${u.title} level ${picked.level}: requirement at ${threshold.key} is not met.`,true,u,threshold.line);
    for(const n of nodes(u)){
      if(stats.has(n.key)){const v=num(n);if(v!==undefined)record(u,n.key,v*picked.level,'factor',n.line);}
      if(n.key==='add_stats'||n.key==='multiply_stats')for(const stat of Array.isArray(n.value)?n.value:[]){const v=num(stat);if(v===undefined)issue(c,'dynamic-upgrade',`${u.title}: dynamic ${stat.key}.`,true,u,stat.line);else record(u,stat.key,v*picked.level,n.key==='add_stats'?'add':'factor',stat.line);}
    }
  }
  const result:Record<string,KnowledgeMetric>={};
  for(const key of new Set([...Object.keys(values),...Object.keys(add),...Object.keys(factor)])){
    const traces=[contribution(e,`Archetype defaults overlaid by ${e.title}`,'base',values[key]||0),...(trace[key]||[])];
    let value=((values[key]||0)+(add[key]||0))*(1+(factor[key]||0));
    value=apply(c,key,value,e,family,traces,'equipment');
    result[key]=metric(value,'(archetype/chassis base + module/upgrade additions) × (1 + summed module/upgrade factors); then selected scenario factors.',traces);
  }
  return result;
}
function division(c:Context,d:DivisionDesign):Record<string,KnowledgeMetric>{
  const equipment=new Map<string,{entry:Entry;variant?:Record<string,KnowledgeMetric>}>();
  for(const pick of d.equipment){if(equipment.has(pick.archetype))throw new Error('Duplicate equipment assignment.');equipment.set(pick.archetype,{entry:resolve(c,pick.variant?.chassis||pick.model!,'equipment'),...(pick.variant?{variant:tank(c,pick.variant)}:{})});}
  const seen=new Set<string>(),totals:Record<string,StatContribution[]>={},org:StatContribution[]=[],speed:StatContribution[]=[],armor:number[]=[],piercing:number[]=[],hardness:number[]=[];
  let count=0,lineCount=0,supportCount=0;
  const push=(key:string,value:number,e:Entry,label:string)=>{(totals[key]||=[]).push(contribution(e,label,'aggregate',value));};
  for(const row of d.rows){
    const u=resolve(c,row.unit,'unit');if(seen.has(u.uid))throw new Error('Combine repeated unit rows before evaluating.');seen.add(u.uid);count+=row.count;
    if(scalar(nodes(u),'group')==='support'){supportCount+=row.count;if(row.count!==1)issue(c,'support-count','Each support company may appear once.',true,u);}else lineCount+=row.count;
    checkGates(c,u);unlock(c,u,'enable_subunits');
    const unitStats=u.data.stats||numeric(nodes(u)),needs=u.data.need||numeric(block(nodes(u),'need'));
    if(!Object.keys(needs).length)issue(c,'unit-equipment','Unit has no indexed equipment requirements.',true,u);
    const rowStats:Record<string,number>={};
    for(const [archetype,qty] of Object.entries(needs) as [string,number][]){
      const picked=equipment.get(archetype);if(!picked){issue(c,'equipment-missing',`Choose equipment for ${archetype}.`,true,u);continue;}
      const model=picked.entry;const base=baseEquipment(c,model),family=base.family,values=picked.variant?Object.fromEntries(Object.entries(picked.variant).flatMap(([k,m])=>m.value===null?[]:[[k,m.value]])):base.values;
      if(!family.some(p=>p.id===archetype))issue(c,'equipment-incompatible',`${model.title} does not belong to ${archetype}.`,true,model);
      if(!picked.variant&&family.some(p=>nodes(p).some(n=>n.key==='module_slots')))issue(c,'modular-equipment','Choose a fully designed tank variant instead of a bare chassis.',true,model);
      unlock(c,model,'enable_equipments');for(const p of family)checkGates(c,p);
      if(values.build_cost_ic===undefined)issue(c,'missing-cost',`Missing equipment cost for ${model.title}.`,true,model);
      else {const t:StatContribution[]=[];const cost=picked.variant?values.build_cost_ic:apply(c,'build_cost_ic',values.build_cost_ic,model,family,t,'equipment');push('build_cost_ic',cost*qty*row.count,model,`${qty} × ${row.count} equipment`);(totals.build_cost_ic||=[]).push(...t);}
      for(const key of combat){const t:StatContribution[]=[];const v=picked.variant?values[key]||0:apply(c,key,values[key]||0,model,family,t,'equipment');rowStats[key]=(rowStats[key]||0)+v;for(const trace of t)(totals[key]||=[]).push({...trace,label:'Applied equipment adjustment: '+trace.label});}
    }
    for(const key of ['combat_width','manpower','max_strength','supply_consumption']){
      if(unitStats[key]===undefined){issue(c,'missing-unit-stat',`${u.title}: ${key} is missing.`,true,u);continue;}
      const t:StatContribution[]=[];const value=apply(c,key,unitStats[key],u,[],t,'unit');push(key,value*row.count,u,`${row.count} × ${u.title}`);(totals[key]||=[]).push(...t);
    }
    if(unitStats.max_organisation===undefined)issue(c,'missing-organization',`${u.title}: organization is missing.`,true,u);
    else {const t:StatContribution[]=[];const v=apply(c,'max_organisation',unitStats.max_organisation,u,[],t,'unit');org.push(contribution(u,`${row.count} × ${u.title}`,'aggregate',v*row.count),...t);}
    for(const key of ['soft_attack','hard_attack','air_attack','defense','breakthrough']){
      const t:StatContribution[]=[];const base=(rowStats[key]||0)*(1+(unitStats[key]||0));const value=apply(c,key,base,u,[],t,'unit');push(key,value*row.count,u,`${row.count} × full-equipment ${u.title}`);(totals[key]||=[]).push(...t);
    }
    const modified=(key:string,v:number)=>{const t:StatContribution[]=[];const value=apply(c,key,v,u,[],t,'unit');return {value,traces:t};};
    const unitArmor=modified('armor_value',rowStats.armor_value||0),unitPiercing=modified('ap_attack',rowStats.ap_attack||0),unitHardness=modified('hardness',rowStats.hardness||0);
    for(const [key,v] of [['armor_value',unitArmor],['ap_attack',unitPiercing],['hardness',unitHardness]] as const)(totals[key]||=[]).push(...v.traces);
    for(let i=0;i<row.count;i++){armor.push(unitArmor.value);piercing.push(unitPiercing.value);if(scalar(nodes(u),'group')!=='support')hardness.push(unitHardness.value);}
    const declaredSpeed=unitStats.maximum_speed;const v=declaredSpeed===undefined?rowStats.maximum_speed:declaredSpeed;
    if(v>0&&scalar(nodes(u),'affects_speed')!=='no'){const adjusted=modified('maximum_speed',v);speed.push(contribution(u,u.title,'aggregate',adjusted.value),...adjusted.traces);}
    if(block(nodes(u),'battalion_mult').length||nodes(u).some(n=>n.key==='battalion_mult'))issue(c,'battalion-adjuster',`${u.title}: category-targeted support effects are not applied.`,true,u);
  }
  if(lineCount<1||lineCount>25||supportCount>5)issue(c,'template-layout','Templates need 1–25 line battalions and at most 5 support companies; regiment placement remains manual.');
  const result:Record<string,KnowledgeMetric>={};
  for(const [key,trace] of Object.entries(totals))result[key]=metric(globalAdjust(c,key,sumContributions(trace),trace),'Sum full-establishment battalion contributions, with selected target and scenario modifiers.',trace);
  const orgValue=count?globalAdjust(c,'max_organisation',sumContributions(org)/count,org):null;
  result.max_organisation=metric(orgValue,'Estimated count-weighted mean including support companies, then scenario modifiers.',org);
  const unitSpeeds=speed.filter(s=>s.operation==='aggregate');
  result.maximum_speed=metric(unitSpeeds.length?globalAdjust(c,'maximum_speed',Math.min(...unitSpeeds.map(s=>s.value)),speed):null,'Estimated slowest unit speed with selected scenario modifiers; no terrain, fuel or supply penalties.',speed);
  const blend=(key:string,values:number[],weight:number|undefined)=>{const trace=totals[key]||[];result[key]=metric(weight!==undefined&&values.length?globalAdjust(c,key,weight*Math.max(...values)+(1-weight)*values.reduce((a,b)=>a+b,0)/values.length,trace):null,'Installed highest/average define with estimated battalion inputs.',trace);};
  blend('armor_value',armor,c.source.meta()?.defines.ARMOR_VS_AVERAGE);blend('ap_attack',piercing,c.source.meta()?.defines.PEN_VS_AVERAGE);
  const hardnessTrace=totals.hardness||[];result.hardness=metric(hardness.length?globalAdjust(c,'hardness',hardness.reduce((a,b)=>a+b,0)/hardness.length,hardnessTrace):null,'Estimated mean of line battalion equipment hardness.',hardnessTrace);
  return result;
}
function run(source:KnowledgeSource,scenario:KnowledgeScenario,design:KnowledgeDesign):KnowledgeResult {
  const c:Context={source,scenario,issues:[],used:new Map(),techs:[],adjustments:[],units:source.entries(['unit']),equipment:source.entries(['equipment'])};
  let metrics:Record<string,KnowledgeMetric>={},rejected=false;
  try{
    const meta=source.meta();if(!meta||meta.gameVersion!==scenario.gameVersion||meta.indexRevision!==scenario.indexRevision)throw new Error('Source revision or game version changed. Refresh and evaluate again.');
    if(meta.mods.length)throw new Error('Modded source contexts are not supported.');
    const selected=new Set<string>();for(const r of scenario.researched){const t=resolve(c,r,'technology');if(selected.has(t.uid))throw new Error('Duplicate researched technology.');selected.add(t.uid);c.techs.push(t);}
    adjustments(c);metrics=design.kind==='tank'?tank(c,design):division(c,design);
    for(const [key,value] of Object.entries(metrics))if(value.value!==null&&!Number.isFinite(value.value)){issue(c,'nonfinite-result',`${key} has no finite estimate.`);metrics[key]=metric(null,value.rule);}
    if(metrics.build_cost_ic?.value!==null&&metrics.build_cost_ic?.value!==undefined&&metrics.build_cost_ic.value<=0)issue(c,'nonpositive-cost','Industrial cost is not positive.');
  }catch(error){rejected=true;issue(c,'evaluation-rejected',error instanceof Error?error.message:String(error));metrics={};}
  const definitions=[...c.used.values()].sort((a,b)=>a.uid.localeCompare(b.uid)).map(e=>({reference:reference(e),hash:e.hash,source:e.source,line:e.line}));
  const result:KnowledgeResult={schemaVersion:1,formulaVersion:FORMULA_VERSION,status:rejected?'rejected':c.issues.some(i=>i.blocking)?'partial':'estimated',design,scenario,fingerprint:'',metrics,issues:c.issues,assumptions:[
    'Experimental mathematical model; numerical estimates are not independently validated engine results.',
    'Country/date, all DLC enabled, research and selected doctrine/spirit/MIO traits are player assertions, not live observations.',
    'The selected research list is treated as complete for unlock checks. Research dates and prerequisites are not simulated.',
    'Only explicitly selected modifiers apply. Missing spirits, MIO assignments, commander traits or doctrine rewards can change the comparison.',
    'Selected idea/spirit IDs are treated as the complete active idea list for manual condition checks.',
    'Full-strength, fully equipped units; no mixed equipment, experience, terrain, weather, opponent, air support, supply or battle simulation.',
    'Tank estimates sum module additions and factors before target modifiers. Caps, resources and XP costs are not calculated.',
    'Division equipment contributes once per required archetype before unit scalars; organization/support weighting and modifier ordering remain estimates.'
  ],provenance:{gameVersion:scenario.gameVersion,indexRevision:scenario.indexRevision,definitions},qualification:'experimental-estimate',campaignEligibility:'manual-unverified'};
  result.fingerprint=digest(result);return result;
}
export function evaluateKnowledgeDesign(source:KnowledgeSource,input:unknown):KnowledgeResult {const parsed=evaluationSchema.parse(input);return run(source,parsed.scenario,parsed.design);}
export function knowledgeResultIsCurrent(source:KnowledgeSource,result:KnowledgeResult):boolean {
  try{const current=evaluateKnowledgeDesign(source,{scenario:result.scenario,design:result.design});return JSON.stringify(current)===JSON.stringify(result);}catch{return false;}
}
export function compareKnowledgeDesigns(source:KnowledgeSource,input:unknown):KnowledgeSearchResult {
  const request=searchSchema.parse(input);if(new Set(request.candidates.map(c=>c.kind)).size!==1)throw new Error('Compare designs of the same kind.');
  if(new Set(request.candidates.map(c=>c.name)).size!==request.candidates.length)throw new Error('Candidate names must be unique.');
  const ranking:KnowledgeSearchResult['ranking']=[],excluded:KnowledgeSearchResult['excluded']=[];
  for(const design of request.candidates){
    const result=run(source,request.scenario,design);
    const acknowledgedGaps=new Set(['unmodeled-effect','battalion-adjuster','non-design-effect']);
    const reasons=result.issues.filter(i=>i.blocking&&!(request.includePartialEstimates&&acknowledgedGaps.has(i.code))).map(i=>i.message);const objective=result.metrics[request.objective.metric]?.value;
    if(objective===null||objective===undefined)reasons.push('Objective metric is unavailable.');
    for(const constraint of request.constraints){const v=result.metrics[constraint.metric]?.value;if(v===null||v===undefined)reasons.push(`Constraint ${constraint.metric} is unavailable.`);else if(constraint.min!==undefined&&v<constraint.min||constraint.max!==undefined&&v>constraint.max)reasons.push(`Constraint ${constraint.metric} is not satisfied.`);}
    const cost=result.metrics.build_cost_ic?.value;if(request.objective.perIndustrialCost&&(cost===undefined||cost===null||cost<=0))reasons.push('Positive industrial cost is required for a per-IC objective.');
    if(reasons.length){excluded.push({name:design.name,reasons:[...new Set(reasons)]});continue;}
    const score=objective!/(request.objective.perIndustrialCost?cost!:1);if(!Number.isFinite(score)){excluded.push({name:design.name,reasons:['Objective score is not finite.']});continue;}
    ranking.push({name:design.name,score,result});
  }
  ranking.sort((a,b)=>(request.objective.direction==='maximize'?b.score-a.score:a.score-b.score)||a.name.localeCompare(b.name));
  return {schemaVersion:1,status:ranking.length?'compared':'unavailable',objective:request.objective,candidatesEvaluated:request.candidates.length,feasible:ranking.length,best:ranking[0]?.result||null,ranking,excluded,claim:'Best estimated score among the explicitly supplied candidates and constraints; not a global optimum or battle prediction.'};
}
