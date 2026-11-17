import type {Entry,Meta,Node,Resolution} from '../../src/types';
import type {Store} from '../store';
import type {KnowledgeCatalog,KnowledgeChoice} from '../../src/knowledge-engine-types';
import {scalar,block} from '../parser';

export interface KnowledgeSource {meta():Meta|null; resolve(reference:string,kind?:string):Resolution; entries(kinds:string[]):Entry[]}
export function indexedKnowledgeSource(store:Store):KnowledgeSource {
  const cache=new Map<string,Entry[]>();
  return {meta:()=>store.getSetting<Meta|null>('meta',null),resolve:(r,k)=>store.resolve(r,k),entries:kinds=>{const key=kinds.join(',');let entries=cache.get(key);if(!entries){entries=store.db.prepare(`SELECT payload FROM entries WHERE kind IN (${kinds.map(()=>'?').join(',')}) ORDER BY uid`).all(...kinds).map(r=>JSON.parse(String(r.payload)));cache.set(key,entries);}return entries;}};
}
export const reference=(entry:Entry)=>'definition:'+entry.uid;
export const nodes=(entry:Entry):Node[]=>entry.data.nodes||[];
export function atPath(entry:Entry,path:number[]=[]):Node[] {
  let current=nodes(entry);for(const index of path){const n=current[index];if(!n||!Array.isArray(n.value))throw new Error('Selected modifier block no longer exists.');current=n.value;}return current;
}
export function knowledgeCatalog(source:KnowledgeSource,kind?:string,query='',offset=0,limit=100):KnowledgeCatalog & {total:number;offset:number;limit:number} {
  const metadata=source.meta();const kinds=['unit','equipment','module','upgrade','technology','doctrine','doctrine_reward','doctrine_milestone','idea','organization'];
  if(kind&&!kinds.includes(kind))throw new Error('Unknown knowledge catalog kind.');
  const entries=source.entries(kind?[kind]:kinds).filter(e=>e.kind!=='organization'||e.source.includes('/organizations/')),choices:KnowledgeChoice[]=[],counts:Record<string,number>={};
  for(const e of entries){
    counts[e.kind]=(counts[e.kind]||0)+1;
    const add=(title:string,path?:number[])=>choices.push({reference:reference(e),id:e.id,title,kind:e.kind,...(path?{path}:{}),category:e.data.category||e.data.archetype,year:e.data.year??e.data.stats?.year,needs:e.kind==='unit'?Object.keys(e.data.need||{}):undefined});
    add(e.title);
    if(e.kind==='organization')nodes(e).forEach((n,i)=>{if(['initial_trait','trait'].includes(n.key)&&Array.isArray(n.value))add(e.title+' — '+(scalar(n.value,'name')||scalar(n.value,'token')||n.key),[i]);});
  }
  const q=query.trim().toLowerCase();const filtered=choices.filter(c=>!q||`${c.title} ${c.id} ${c.category||''}`.toLowerCase().includes(q));
  return {gameVersion:metadata?.gameVersion||'unknown',indexRevision:metadata?.indexRevision||'legacy',counts,total:filtered.length,offset,limit,choices:filtered.slice(offset,offset+limit),capabilities:[
    {domain:'Division and tank stats',status:'experimental-estimates',limitation:'Explicit manual research/modifiers, full equipment, approximate aggregation. No engine parity claim.'},
    {domain:'Candidate comparison',status:'bounded-search',limitation:'Explicit candidates and objective; incomplete or illegal candidates excluded. No global optimum.'},
    {domain:'Doctrines, spirits and MIOs',status:'partial-modifier-support',limitation:'Selected numeric blocks only. Unhandled effects, inheritance and conditions remain visible.'},
    {domain:'Focus routes and events',status:'existing-interpreter',limitation:'Use existing planner review and its coverage gate; this estimator cannot approve a strategy.'},
    {domain:'Aircraft, ships and battle outcomes',status:'not-evaluated',limitation:'Definitions remain searchable in Encyclopedia. This slice does not calculate these designs or outcomes.'}
  ]};
}
export function chassisBlueprint(source:KnowledgeSource,r:string,moduleRefs:string[]=[]){
  const selected=source.resolve(r,'equipment');if(!selected.entry||selected.status!=='resolved')throw new Error('Choose an unambiguous chassis.');
  const family:Entry[]=[],seen=new Set<string>();let current:Entry|undefined=selected.entry;
  while(current){if(seen.has(current.uid))throw new Error('Equipment inheritance cycle.');seen.add(current.uid);family.unshift(current);const archetype=scalar(nodes(current),'archetype');if(!archetype)break;const next=source.resolve(archetype,'equipment');if(next.status!=='resolved'||!next.entry)throw new Error('Equipment archetype is missing or ambiguous.');current=next.entry;}
  if(!family.some(e=>e.id.endsWith('_tank_chassis')))throw new Error('Select a modular tank chassis.');
  let slotNodes:Node[]=[];for(const e of family){const ns=block(nodes(e),'module_slots');if(ns.length)slotNodes=ns;}
  const resolved=new Map<string,Node[]>();for(const n of slotNodes){if(Array.isArray(n.value))resolved.set(n.key,n.value);else if(resolved.has(n.value))resolved.set(n.key,resolved.get(n.value)!);else throw new Error('Unresolved slot inheritance.');}
  const slots=[...resolved].map(([id,ns])=>({id,required:scalar(ns,'required')==='yes',categories:block(ns,'allowed_module_categories').flatMap(n=>typeof n.value==='string'?[n.value]:[])}));
  for(const r of moduleRefs){const m=source.resolve(r,'module');if(m.status!=='resolved'||!m.entry)throw new Error('Selected module is missing or ambiguous.');for(const n of block(nodes(m.entry),'allowed_module_categories')){const slot=slots.find(s=>s.id===n.key);if(slot&&Array.isArray(n.value))slot.categories=[...new Set([...slot.categories,...n.value.flatMap(c=>typeof c.value==='string'?[c.value]:[])])];}}
  return {reference:r,slots,upgrades:block(nodes(family[0]),'upgrades').flatMap(n=>typeof n.value==='string'?[n.value]:[])};
}
