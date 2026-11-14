import type {Entry,Node} from '../src/types';
import type {ScriptDefinition} from '../src/mechanics-interpreter';

/** Bounded links into the existing index. No macro substitution or engine execution. */
export function attachScriptContext(entries:Entry[],localization:{has:(id:string)=>boolean;loc:(id:string)=>string;evidence:(id:string)=>unknown[]}){
 const helpers=new Map<string,Entry[]>(),dynamics=new Map<string,Entry[]>();
 for(const e of entries){const map=e.kind==='scripted_effect'?helpers:e.kind==='dynamic_modifier'?dynamics:null;if(map)map.set(e.id,[...(map.get(e.id)||[]),e]);}
 const native=new Set(entries.filter(e=>e.kind==='effect').map(e=>e.id));
 const definition=(found:Entry[]):ScriptDefinition=>found.length===1?{nodes:found[0].data.nodes,source:found[0].source,line:found[0].line,hash:found[0].hash,version:found[0].version,title:found[0].title,recovered:!!found[0].data.importWarnings?.length}:{nodes:[],ambiguous:true};
 for(const e of entries.filter(e=>['focus','shared_focus','joint_focus','decision','formable','technology'].includes(e.kind))){
  const links:Record<string,ScriptDefinition>={},mods:Record<string,ScriptDefinition>={};let remaining=12000,bytes=0;
  const scan=(nodes:Node[],depth=0)=>{if(depth>8)return;for(const n of nodes){if(--remaining<0)break;
   if(helpers.has(n.key)&&!native.has(n.key)&&!links[n.key]&&Object.keys(links).length<64){const link=definition(helpers.get(n.key)!);const size=JSON.stringify(link.nodes).length;bytes+=size;if(size>64000||bytes>160000){link.nodes=[];link.limited=true;}links[n.key]=link;if(n.value==='yes')scan(link.nodes,depth+1);}
   if(n.key==='modifier'&&typeof n.value==='string'&&dynamics.has(n.value))mods[n.value]=definition(dynamics.get(n.value)!);
   for(const id of [n.key,...(typeof n.value==='string'?[n.value]:[])])if(localization.has(id)){e.data.mechanicNames[id]=localization.loc(id);e.data.mechanicNameEvidence[id]=localization.evidence(id);}
   if(Array.isArray(n.value))scan(n.value,depth);
  }};
  scan(e.data.nodes||[]);e.data.mechanicScripts=links;e.data.mechanicDynamicModifiers=mods;
 }
}
