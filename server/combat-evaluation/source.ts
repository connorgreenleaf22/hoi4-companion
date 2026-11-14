import type {Entry,Node} from '../../src/types';

export const combatFields=['max_organisation','soft_attack','hard_attack','defense','breakthrough','armor_value','ap_attack','hardness','maximum_speed','supply_consumption','fuel_consumption','combat_width','manpower','build_cost_ic'] as const;
/** Source declarations only. Absence is preserved; it never implies a zero combat contribution. */
export function projectCombatInput(entry:Entry):Entry {
  const data:Entry['data']={stats:Object.fromEntries(combatFields.filter(k=>entry.data.stats?.[k]!==undefined).map(k=>[k,entry.data.stats[k]]))};
  if(entry.kind==='unit'){
    if(entry.data.need!==undefined)data.need=structuredClone(entry.data.need);
    for(const key of ['transport','affects_speed','group','regimental'])if(entry.data[key]!==undefined)data[key]=entry.data[key];
    data.context=(entry.data.nodes as Node[]||entry.data.context||[]).filter(n=>['essential','battalion_mult','categories','type'].includes(n.key));
  }
  if(entry.kind==='equipment')for(const key of ['archetype','parent'])if(entry.data[key]!==undefined)data[key]=entry.data[key];
  return {uid:entry.uid,id:entry.id,kind:entry.kind,title:entry.id,description:'',source:entry.source,line:entry.line,version:entry.version,hash:entry.hash,data};
}
