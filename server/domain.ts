import type { Entry, Node, Profile, DLCState } from '../src/types';
import { scalar } from './parser';
import {evaluatePlanner} from './planner/evaluate';
import {focusExclusions} from '../src/focus-structure';

export type Truth='yes'|'no'|'unknown';
const and=(v:Truth[]):Truth=>v.includes('no')?'no':v.includes('unknown')?'unknown':'yes';
const or=(v:Truth[]):Truth=>v.includes('yes')?'yes':v.includes('unknown')?'unknown':'no';
export function dlcFacts(profile:Profile,dlcs:DLCState[]):Record<string,Truth>|undefined{
  if(!profile.dlcStates)return undefined;
  const facts:Record<string,Truth>={};
  for(const dlc of dlcs){
    const user=profile.dlcStates[dlc.id]||profile.dlcStates[dlc.name];
    const installed=dlc.installed?.value||'unknown';const owned=user?.owned.value||dlc.owned?.value||'unknown';
    const enabled=dlc.enabled?.value==='no'||user?.enabled.value==='no'?'no':user?.enabled.value==='yes'||dlc.enabled?.value==='yes'?'yes':'unknown';
    facts[dlc.name]=dlc.integrated&&installed==='yes'?'yes':installed==='no'||owned==='no'||enabled==='no'?'no':installed==='yes'&&owned==='yes'&&enabled==='yes'?'yes':'unknown';
  }
  return facts;
}
export function evaluate(nodes:Node[],profile:Profile,mode='AND',knownDlcs:string[]=[],dlcAvailability?:Record<string,Truth>):Truth {
  const results=nodes.map((n:Node):Truth=>{
    if(Array.isArray(n.value)){
      if(['AND','OR','NOT'].includes(n.key.toUpperCase()))return evaluate(n.value,profile,n.key.toUpperCase(),knownDlcs,dlcAvailability);
      return 'unknown';
    }
    if(n.key==='always')return n.value==='yes'?'yes':'no';
    if(['tag','original_tag'].includes(n.key))return profile.country===n.value?'yes':'no';
    if(n.key==='has_dlc')return dlcAvailability?(dlcAvailability[n.value]||'unknown'):knownDlcs.includes(n.value)?'yes':profile.dlcConfirmed?(profile.dlcs.includes(n.value)?'yes':'no'):'unknown';
    if(n.key==='has_completed_focus')return profile.completed.includes(n.value)?'yes':'unknown';
    // A profile start date is not the current in-game date. Date gates remain manual checks.
    return 'unknown';
  });
  if(mode==='OR')return or(results);
  if(mode==='NOT')return or(results)==='yes'?'no':or(results)==='no'?'yes':'unknown';
  return and(results);
}
export type TreeReferenceIssue={id:string;status:'unresolved'|'ambiguous';reason:string;candidates:string[]};
export function treeFocuses(tree:Entry,all:Entry[],issues:TreeReferenceIssue[]=[]):Entry[]{
  const definitions=all.filter(e=>e.kind==='focus' && e.source===tree.source && e.data.treeId===tree.id);
  const duplicateIds=new Set(definitions.filter(e=>definitions.some(other=>other.id===e.id&&other.uid!==e.uid)).map(e=>e.id));
  for(const id of duplicateIds)issues.push({id,status:'ambiguous',reason:'Multiple focus definitions in this tree; inspect their conditions.',candidates:definitions.filter(e=>e.id===id).map(e=>e.uid)});
  const local=definitions.filter(e=>!duplicateIds.has(e.id));
  const seen=new Set(local.map(e=>e.id));
  const shared=all.filter(e=>['shared_focus','joint_focus'].includes(e.kind));
  const sharedById=new Map<string,Entry[]>();for(const e of shared)sharedById.set(e.id,[...(sharedById.get(e.id)||[]),e]);
  const pending=[...(tree.data.sharedIds||[])];
  const attempted=new Set<string>();
  while(pending.length){const id=pending.shift();if(seen.has(id)||attempted.has(id))continue;attempted.add(id);const candidates=sharedById.get(id)||[];
    if(candidates.length!==1){issues.push({id,status:candidates.length?'ambiguous':'unresolved',reason:candidates.length?'Shared focus has multiple definitions; applicability remains unknown.':'Shared focus definition is absent from this index.',candidates:candidates.map(e=>e.uid)});continue;}const entry=candidates[0];
    seen.add(id);local.push(entry);pending.push(...(entry.data.sharedIds||[]));
    // Shared branches are connected by prerequisites, not always enumerated in focus_tree.
    for(const e of shared)if((e.data.prerequisites||[]).some((g:string[])=>g.includes(id)))pending.push(e.id);
  }
  const byId=new Map(local.map(e=>[e.id,e]));
  function position(e:Entry,visited=new Set<string>()):{x:number;y:number}{
    if(visited.has(e.id))return {x:e.data.x||0,y:e.data.y||0};visited.add(e.id);
    const parent=byId.get(e.data.relative);const base=parent?position(parent,visited):{x:0,y:0};
    return {x:base.x+(e.data.x||0),y:base.y+(e.data.y||0)};
  }
  return local.map(e=>({...e,data:{...e.data,exclusive:focusExclusions(e.data.nodes,e.data.exclusive),position:position(e)}}));
}
export function validatePlan(profile:Profile,focuses:Entry[],knownDlcs:string[]=[],dlcAvailability?:Record<string,Truth>) {
  const dlcs=Object.entries(dlcAvailability||Object.fromEntries(knownDlcs.map(name=>[name,'yes']))).map(([name,value])=>({id:name,name,disabled:value==='no',integrated:value==='yes',installed:{value,source:'Evaluation context'},owned:{value,source:'Evaluation context'},enabled:{value,source:'Evaluation context'}})) as DLCState[];
  return evaluatePlanner(profile,{id:'legacy',name:'Legacy plan',tree:profile.tree,items:profile.queue.map(reference=>({reference,legacyId:reference})),startDate:profile.startDate,assumptions:[]},focuses,{dlcs,indexRevision:profile.referenceIndexRevision||'legacy'});
}
export function resolveEquipment(entry:Entry,all:Entry[],seen=new Set<string>()):Record<string,number>{
  if(seen.has(entry.id))return {};seen.add(entry.id);
  const parent=all.find(e=>e.id===entry.data.archetype);
  // parent is a research predecessor, not statistical inheritance. Only archetype supplies defaults.
  return {...(parent?resolveEquipment(parent,all,seen):{}),...entry.data.stats};
}
export function productionSupport(entry:Entry,all:Entry[]):{supported:boolean;reason?:string}{
  const navalTypes=new Set(['capital_ship','carrier','screen_ship','submarine','convoy','naval_support','support_ship']);
  const seen=new Set<string>();let current:Entry|undefined=entry;
  while(current&&!seen.has(current.id)){
    seen.add(current.id);
    if(navalTypes.has(current.data.type)||/interface_category_.*ships/.test(current.data.interface_category||'')||/^(ship_hull_|repair_ship_hull|support_ship_hull)/.test(current.id)){
      return {supported:false,reason:'Naval production is unsupported. Ships and convoys use dockyards; military-factory estimates do not apply.'};
    }
    current=all.find(e=>e.id===current!.data.archetype);
  }
  const cost=resolveEquipment(entry,all).build_cost_ic;
  if(!Number.isFinite(cost)||cost<=0)return {supported:false,reason:'Equipment IC cost is unresolved in the installed data. Choose equipment with a known cost.'};
  return {supported:true};
}
export function calculateTemplate(rows:{id:string;count:number}[],units:Entry[],divisions=1){
  if(!Number.isInteger(divisions)||divisions<1||divisions>10000)throw new Error('Divisions must be between 1 and 10,000.');
  let width=0,manpower=0,supply=0,organization=0,total=0,lineCount=0,supportCount=0;
  const needs:Record<string,number>={};const seen=new Set<string>();
  for(const row of rows){
    if(!Number.isInteger(row.count)||row.count<0||row.count>25)throw new Error('Unit counts must be whole numbers from 0 to 25.');
    if(!row.count)continue;if(seen.has(row.id))throw new Error('Each unit type may appear once.');seen.add(row.id);
    const unit=units.find(u=>u.id===row.id);if(!unit)throw new Error(`Unknown unit: ${row.id}`);
    if(unit.data.support){if(row.count>1)throw new Error('A support company can appear only once.');supportCount+=row.count;}else lineCount+=row.count;
    const s=unit.data.stats;total+=row.count;width+=(s.combat_width||0)*row.count;manpower+=(s.manpower||0)*row.count;supply+=(s.supply_consumption||0)*row.count;organization+=(s.max_organisation||0)*row.count;
    for(const [id,count] of Object.entries(unit.data.need||{}))needs[id]=(needs[id]||0)+Number(count)*row.count*divisions;
  }
  if(lineCount>25||supportCount>5)throw new Error('A division supports up to 25 line battalions and five support companies.');
  return {width,manpower,armyManpower:manpower*divisions,supply,organization:total?organization/total:0,needs,lineCount,supportCount};
}
export function production(input:{quantity:number;stockpile:number;cost:number;factories:number;efficiency:number;output:number;resourceFactor:number},base:number){
  for(const [k,v] of Object.entries(input))if(!Number.isFinite(v)||v<0)throw new Error(`Invalid ${k}.`);
  if(input.efficiency>1 || input.resourceFactor>1 || input.factories>10000)throw new Error('Efficiency/resource factors must be 0–1, with at most 10,000 factories.');
  const shortage=Math.max(0,input.quantity-input.stockpile);const dailyIC=base*input.factories*input.efficiency*input.output*input.resourceFactor;
  return {shortage,dailyIC,unitsPerDay:input.cost>0?dailyIC/input.cost:0,days:shortage===0?0:dailyIC>0&&input.cost>0?Math.ceil(shortage*input.cost/dailyIC):null};
}
