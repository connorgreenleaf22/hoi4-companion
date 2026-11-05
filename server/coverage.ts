import type {Node} from '../src/types';
import {scalar} from './parser';

export type RecordCandidate={path:string;line:number;id:string;kind:string;state?:'emitted'|'omitted';uid?:string;reason?:string;value?:Node[]};
/** Independent record census: does not call the importer or derive discovery from emitted counts. */
export function discoverRecords(source:string,nodes:Node[],text:string):RecordCandidate[]{
  const records:RecordCandidate[]=[];
  const seenPaths=new Map<string,number>();
  const add=(n:Node,kind:string,id=n.key,parent='')=>{const stem=`${parent}/${n.key||'item'}`;const ordinal=(seenPaths.get(stem)||0)+1;seenPaths.set(stem,ordinal);const r:RecordCandidate={path:`${stem}[${ordinal}]`,line:n.line,id,kind,value:Array.isArray(n.value)?n.value:undefined};if(kind==='metadata'){r.state='omitted';r.reason='Structural declaration/condition/constant retained in parent source AST; not a standalone entity.';}records.push(r);return r;};
  const gate=new Set(['limit','allowed','allow','available','visible','trigger','potential','enable','icon','priority','picture','custom_icon','on_map_mode','on_map_area','scripted_gui']);
  const wrapped=(key:string,kind:string)=>{for(const n of nodes)if(n.key===key&&Array.isArray(n.value)){for(const child of n.value)add(child,Array.isArray(child.value)&&!gate.has(child.key)?kind:'metadata',child.key,key);}else add(n,'unsupported');};
  if(source.startsWith('localisation/')||source.startsWith('common/defines/')||source.endsWith('.dlc')){records.push({path:source,line:1,id:source,kind:'metadata',state:'omitted',reason:'Hashed dependency or DLC descriptor; independently traced, not an entity definition.'});return records;}
  if(source.startsWith('documentation/')){for(const m of text.matchAll(/^## ([^\n]+)\r?\n([\s\S]*?)(?=^#{1,2} |$(?![\s\S]))/gm)){const id=m[1].trim();const kind=source.includes('console_commands_')?'command':source.includes('effects_')?'effect':source.includes('modifiers_')?'modifier':'trigger';const metadata=/^(Table of|All )/.test(id)||kind!=='command'&&!/^[\w.]+$/.test(id);records.push({path:`heading:${id}`,line:text.slice(0,m.index).split('\n').length,id,kind:metadata?'metadata':kind,...(metadata?{state:'omitted' as const,reason:'Non-entity documentation heading.'}:{})});}return records;}
  if(source.startsWith('companion/')){for(const m of JSON.parse(text))records.push({path:`editorial:${m.id}`,line:1,id:m.id,kind:'mechanic'});return records;}
  if(source.includes('/country_tags/')){for(const n of nodes)add(n,/^[A-Z0-9]{3}$/.test(n.key)&&typeof n.value==='string'?'country':'unsupported');return records;}
  if(source.startsWith('history/countries/')){records.push({path:source,line:1,id:source.split('/').at(-1)!.slice(0,3),kind:'country_history',value:nodes});return records;}
  if(source.includes('/national_focus/')||source.includes('/continuous_focus/')){
    for(const n of nodes)if(Array.isArray(n.value)&&['focus_tree','continuous_focus_palette'].includes(n.key)){const id=scalar(n.value,'id',source.split('/').at(-1)!.replace(/\.txt$/,''));const r=add(n,n.key==='focus_tree'?'focus_tree':'continuous_focus_palette',id);for(const child of n.value)if(child.key==='focus'&&Array.isArray(child.value))add(child,n.key==='focus_tree'?'focus':'continuous_focus',scalar(child.value,'id'),r.path);}
    else if(Array.isArray(n.value)&&['shared_focus','joint_focus'].includes(n.key))add(n,n.key,scalar(n.value,'id'));else add(n,n.key.startsWith('@')?'metadata':'unsupported');return records;
  }
  if(source.includes('/units/equipment/modules/')){wrapped('equipment_modules','module');return records;}
  if(source.includes('/units/equipment/upgrades/')){wrapped('upgrades','upgrade');return records;}
  if(source.includes('/units/equipment/')){wrapped('equipments','equipment');return records;}
  if(source.startsWith('common/units/')){wrapped('sub_units','unit');return records;}
  if(source.includes('/technologies/')){wrapped('technologies','technology');return records;}
  if(source.includes('/idea_tags/')){wrapped('idea_categories','idea_category');return records;}
  if(source.includes('/ideas/')){for(const n of nodes)if(n.key==='ideas'&&Array.isArray(n.value)){for(const group of n.value)if(Array.isArray(group.value))for(const child of group.value)add(child,Array.isArray(child.value)&&!gate.has(child.key)?'idea':'metadata',child.key,`ideas/${group.key}`);else add(group,'metadata',group.key,'ideas');}else add(n,'metadata');return records;}
  if(source.includes('/decisions/categories/')){for(const n of nodes)add(n,Array.isArray(n.value)?'decision_category':'metadata');return records;}
  if(source.includes('/decisions/')){for(const n of nodes)if(Array.isArray(n.value))for(const child of n.value)add(child,Array.isArray(child.value)&&!gate.has(child.key)?'decision':'metadata',child.key,n.key);else add(n,'metadata');return records;}
  if(source.includes('/doctrines/')){for(const n of nodes)if(Array.isArray(n.value)){const kind=source.includes('/folders/')?'doctrine_folder':source.includes('/tracks/')?'doctrine_track':'doctrine';const r=add(n,kind);for(const sub of n.value)if(Array.isArray(sub.value)&&sub.key==='rewards')for(const child of sub.value)add(child,Array.isArray(child.value)?'doctrine_reward':'unsupported',child.key,r.path+'/rewards');else if(Array.isArray(sub.value)&&sub.key==='milestones'){let i=0;for(const child of sub.value)if(Array.isArray(child.value))add(child,'doctrine_milestone',`${n.key}.milestone.${++i}`,r.path+'/milestones');else add(child,'unsupported',child.key,r.path+'/milestones');}}else add(n,'metadata');return records;}
  if(source.includes('/characters/')){
    const roles=new Set(['country_leader','field_marshal','corps_commander','navy_leader','advisor']);
    const censusRoles=(nodes:Node[],id:string,parent:string)=>{const counts=new Map<string,number>();for(const n of nodes)if(roles.has(n.key)&&Array.isArray(n.value)){const num=(counts.get(n.key)||0)+1;counts.set(n.key,num);add(n,'character_role',`${id}.${n.key}.${num}`,parent);}};
    for(const n of nodes)if(n.key==='characters'&&Array.isArray(n.value))for(const child of n.value)if(Array.isArray(child.value)){const r=add(child,'character');let i=0;for(const instance of child.value)if(instance.key==='instance'&&Array.isArray(instance.value)){const id=`${child.key}.instance.${++i}`;const ir=add(instance,'character_instance',id,r.path);censusRoles(instance.value,id,ir.path);}censusRoles(child.value,child.key,r.path);}else add(child,'unsupported',child.key,n.key);else add(n,'unsupported');return records;
  }
  if(source.startsWith('events/')){for(const n of nodes)if(Array.isArray(n.value)&&['country_event','news_event','state_event','unit_leader_event','operative_leader_event'].includes(n.key)){const id=scalar(n.value,'id');const r=add(n,'event',id);const counts=new Map<string,number>();for(const stage of n.value)if(Array.isArray(stage.value)&&['immediate','option','after'].includes(stage.key)){const num=(counts.get(stage.key)||0)+1;counts.set(stage.key,num);add(stage,stage.key==='option'?'event_option':'event_stage',scalar(stage.value,'name',`${id}.${stage.key}.${num}`),r.path);}}else add(n,n.key==='add_namespace'||n.key.startsWith('@')?'metadata':'unsupported');return records;}
  if(source.includes('/country_leader/')||source.includes('/unit_leader/')){wrapped('leader_traits','trait');return records;}
  if(source==='common/combat_tactics.txt'){for(const n of nodes)add(n,Array.isArray(n.value)&&n.key.startsWith('tactic_')?'tactic':'metadata');return records;}
  if(source.startsWith('dlc_metadata/')){wrapped('dlcs','dlc');return records;}
  if(source.includes('/terrain/')){wrapped('categories','terrain');return records;}
  if(source.includes('/buildings/')){wrapped('buildings','building');return records;}
  const kind=source.includes('/special_projects/')?'project':'organization';for(const n of nodes)add(n,Array.isArray(n.value)?kind:'metadata');return records;
}

export function reconcileRecords(records:RecordCandidate[],entries:{uid:string;id:string;kind:string;line:number;data:Record<string,any>}[],omissions:{path:string;reason:string;line?:number}[]){
  for(const e of entries){const kinds=e.kind==='formable'?['formable','decision']:[e.kind];const r=records.find(r=>r.state!=='emitted'&&r.id===e.id&&kinds.includes(r.kind)&&r.line===e.line);if(r){r.state='emitted';r.uid=e.uid;delete r.reason;e.data.recordPath=r.path;}else throw new Error(`Unaccounted importer emission ${e.uid}; no matching discovered record.`);}
  for(const r of records)if(!r.state){const reason=omissions.find(o=>o.path===r.id&&o.line===r.line)?.reason;r.state='omitted';r.reason=reason||'Discovered source record was not emitted by the supported extractor; inspect this construct.';}
  return records.map(({value,...r})=>r);
}
