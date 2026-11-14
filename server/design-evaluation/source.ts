import {createHash} from 'node:crypto';
import type {Entry, Meta, Resolution} from '../../src/types';
import type {Store} from '../store';

/** Read-only seam: no second database, importer, observation or provider lifecycle. */
export type DesignSource = {meta:()=>Meta|null;resolve:(reference:string,kind:string)=>Resolution};
export const indexedDesignSource=(store:Store):DesignSource=>({
  meta:()=>store.getSetting<Meta|null>('meta',null),
  resolve:(reference,kind)=>store.resolve(reference,kind)
});
export function canonical(value:unknown):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
  return JSON.stringify(value);
}
export const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');

/** The public corpus contains only these calculation inputs, not licensed source scripts. */
export function projectDefinition(entry:Entry):Entry {
  const keys=entry.kind==='unit'?['combat_width','manpower']:entry.kind==='equipment'?['build_cost_ic']:[];
  const fields=entry.kind==='unit'?['active','group','regimental']:entry.kind==='equipment'?['archetype','parent','is_archetype','active']:[];
  const data:Entry['data']={stats:Object.fromEntries(keys.filter(k=>entry.data.stats?.[k]!==undefined).map(k=>[k,entry.data.stats[k]]))};
  for(const key of fields)if(entry.data[key]!==undefined)data[key]=entry.data[key];
  if(entry.kind==='unit'){data.need=entry.data.need;data.support=entry.data.support;}
  if(entry.kind==='technology')data.nodes=(entry.data.nodes||[]).filter((n:any)=>['enable_equipments','enable_subunits'].includes(n.key));
  return {uid:entry.uid,id:entry.id,kind:entry.kind,title:entry.id,description:'',source:entry.source,line:entry.line,version:entry.version,hash:entry.hash,data};
}
