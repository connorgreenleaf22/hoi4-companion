import type {Entry,Profile,Node} from '../../src/types';

export const CONTEXT_POLICY='dependency-groups-v1' as const;
export const CONTEXT_LIMIT_CHARACTERS=180000,CONTEXT_LIMIT_WIRE_BYTES=180000;
export type ContextOmission={reference:string;reason:'payload-budget'|'dependency-limit'};
export type ContextSelection={chosen:Entry[];omitted:number;omissions:string[];mandatoryReferences:number;selectedGroups:number;omittedGroups:ContextOmission[]};
type Group={entry:Entry;objectiveFocus:boolean;chosen:Entry[];warnings:string[];limited:boolean};
type Options={fits?:(selection:ContextSelection)=>boolean};
const focusKind=(e:Entry)=>['focus','shared_focus','joint_focus'].includes(e.kind);
const byUid=(a:Entry,b:Entry)=>a.uid<b.uid?-1:a.uid>b.uid?1:0;
const ref=(e:Entry)=>'definition:'+e.uid;
const MAX_GROUP_DEFINITIONS=1024,MAX_EVENT_CLOSURE=24,MAX_NODE_SCAN=100000,MAX_EVENT_TARGETS=256;

/** Atomic dependency-group retrieval. The caller measures the complete serialized payload. */
export function selectContext(entries:Entry[],tree:Entry,focuses:Entry[],profile:Profile,objective:string,extra:string[],options:Options={}):ContextSelection{
 const terms=[...new Set(objective.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>3&&!['portugal','germany','strategy','prepare','develop','build','want','with','then','country'].includes(t)))];
 if(terms.some(t=>t.startsWith('monarch')))terms.push('royal','duarte','kingdom','brazil','restoration');
 const relevanceCache=new Map<string,number>();
 const relevance=(e:Entry)=>{if(!relevanceCache.has(e.uid))relevanceCache.set(e.uid,terms.filter(t=>(e.id+' '+e.title+' '+e.description).toLowerCase().includes(t.slice(0,6))).length);return relevanceCache.get(e.uid)!;};
 const ranked=(values:Entry[])=>[...values].sort((a,b)=>relevance(b)-relevance(a)||byUid(a,b));
 const focusUids=new Map(focuses.map(e=>[e.uid,e]));
 const resolve=(values:Entry[],id:string)=>id.startsWith('definition:')?values.filter(e=>ref(e)===id):values.filter(e=>e.id===id);
 // Use the selected tree's corrected clones, not raw entries or object identity.
 const canonical=(e:Entry)=>focusUids.get(e.uid)||e;
 const eventsById=new Map<string,Entry[]>();for(const e of entries)if(e.kind==='event')eventsById.set(e.id,[...(eventsById.get(e.id)||[]),e]);
 const reverseExclusions=new Map<string,Entry[]>();
 for(const e of focuses)for(const id of e.data.exclusive||[]){const matches=resolve(focuses,id);if(matches.length===1)reverseExclusions.set(matches[0].uid,[...(reverseExclusions.get(matches[0].uid)||[]),e]);}
 for(const values of reverseExclusions.values())values.sort(byUid);
 const eventCache=new Map<string,{ids:string[];limited:boolean}>();
 const eventIds=(entry:Entry)=>{
  let cached=eventCache.get(entry.uid);if(cached)return cached;
  const roots=entry.data.nodes||[],stack:Node[]=roots.slice(0,MAX_NODE_SCAN),ids=new Set<string>();let scanned=0,limited=roots.length>MAX_NODE_SCAN;
  while(stack.length&&scanned++<MAX_NODE_SCAN){const n=stack.pop()!;if(['country_event','news_event','state_event'].includes(n.key)){const id=typeof n.value==='string'?n.value:n.value.find(x=>x.key==='id')?.value;if(typeof id==='string'&&id){if(ids.size<MAX_EVENT_TARGETS||ids.has(id))ids.add(id);else limited=true;}}if(Array.isArray(n.value))for(const child of n.value){if(scanned+stack.length<MAX_NODE_SCAN)stack.push(child);else{limited=true;break;}}}
  cached={ids:[...ids].sort(),limited:limited||stack.length>0};eventCache.set(entry.uid,cached);return cached;
 };
 const closure=(seeds:Entry[])=>{
  const chosen=new Map<string,Entry>(),queue:Entry[]=[],warnings=new Set<string>();let limited=false;
  const add=(entry:Entry)=>{const e=canonical(entry);if(chosen.has(e.uid))return;if(chosen.size>=MAX_GROUP_DEFINITIONS){limited=true;return;}chosen.set(e.uid,e);queue.push(e);};
  seeds.forEach(add);let eventCount=0;
  for(let i=0;i<queue.length;i++){
   const e=queue[i];
   if(focusKind(e)){
    for(const [kind,ids] of [['prerequisite',(e.data.prerequisites||[]).flat()],['exclusion',e.data.exclusive||[]]] as const)for(const id of ids){const matches=resolve(focuses,id);if(matches.length!==1)warnings.add('Unresolved '+kind+' '+id+' for '+ref(e));else add(matches[0]);}
    // Conflict declarations may exist only on the opposite branch.
    (reverseExclusions.get(e.uid)||[]).forEach(add);
   }
   const events=eventIds(e);if(events.limited)warnings.add('Event-reference scan limit for '+ref(e)+'; event closure is incomplete.');
   for(const id of events.ids){const matches=eventsById.get(id)||[];if(matches.length!==1){warnings.add('Unresolved event '+id+' for '+ref(e));continue;}const event=matches[0];if(chosen.has(event.uid))continue;if(eventCount>=MAX_EVENT_CLOSURE){warnings.add('Event closure limit: '+id);continue;}add(event);eventCount++;}
  }
  return {chosen:[...chosen.values()].sort(byUid),warnings:[...warnings].sort(),limited};
 };
 const explicit:Entry[]=[];
 for(const id of [...new Set(extra)].sort()){
  const matches=resolve(entries,id);if(matches.length!==1)throw Error('Additional context must identify one definition; use a canonical reference: '+id);
  const e=matches[0];if(focusKind(e)&&!focusUids.has(e.uid))throw Error('Additional focus is outside the selected tree: '+id);explicit.push(canonical(e));
 }
 const mandatory=closure([tree,...explicit]);
 if(mandatory.limited)throw Error('Required source context exceeds the dependency limit. Remove additional references or create a smaller saved strategy before previewing again. No provider request was sent.');
 const matched=ranked(focuses.filter(e=>relevance(e)>0)).slice(0,18),roots=[...focuses].filter(e=>!(e.data.prerequisites||[]).flat().length).sort(byUid).slice(0,8);
 const decisions=ranked(entries.filter(e=>e.kind==='decision'&&(e.id.startsWith(profile.country+'_')||(e.data.countries||[]).includes(profile.country))&&relevance(e)>0)).slice(0,8);
 const techs=entries.filter(e=>e.kind==='technology'),technology=ranked(techs.filter(e=>relevance(e)>0)).slice(0,5);
 for(const folder of ['industry_folder','electronics_folder','infantry_folder'])technology.push(...techs.filter(e=>Number(e.data.nodes?.find((n:Node)=>n.key==='start_year')?.value)<=Number(profile.startDate.slice(0,4))&&JSON.stringify(e.data.nodes?.filter((n:Node)=>n.key==='folder')).includes(folder)).sort(byUid).slice(0,2));
 technology.push(...techs.filter(e=>['basic_machine_tools','tools'].includes(e.id)).sort(byUid));
 // One family cannot consume the whole budget before research/preparation is considered.
 // This is retrieval diversity, not a ranking of strategy quality or campaign outcomes.
 const focusSeeds=matched.length?matched:roots,techSeeds=[...new Map(technology.map(e=>[e.uid,e])).values()];
 const rounds=Array.from({length:Math.max(techSeeds.length,focusSeeds.length,decisions.length)},(_,i)=>[techSeeds[i],focusSeeds[i],decisions[i]].filter((e):e is Entry=>!!e)).flat();
 const seeds=[...new Map(rounds.map(e=>[e.uid,e])).values()].filter(e=>!mandatory.chosen.some(m=>m.uid===e.uid));
 const groups:Group[]=seeds.map(entry=>({entry,objectiveFocus:matched.some(e=>e.uid===entry.uid),...closure([entry])}));
 const included=new Set<string>(),omittedGroups:ContextOmission[]=groups.map(g=>({reference:ref(g.entry),reason:g.limited?'dependency-limit':'payload-budget'}));
 const make=():ContextSelection=>{
  const active=groups.filter(g=>included.has(g.entry.uid)),chosen=new Map(mandatory.chosen.map(e=>[e.uid,e]));
  for(const g of active)for(const e of g.chosen)chosen.set(e.uid,e);
  const omissions=[...new Set([...mandatory.warnings,...active.flatMap(g=>g.warnings)])].sort();
  omissions.push('Event links add at most 24 automatic definitions per dependency group. Their union is not complete event or mechanical closure.');
  if(!matched.length)omissions.push('No objective-matched focuses: only root focuses and relevant supporting definitions were considered. Add canonical references to expand context.');
  else if(!active.some(g=>g.objectiveFocus)&&!mandatory.chosen.some(e=>focusKind(e)&&relevance(e)>0))omissions.push('No objective-matched focus dependency group fits the source budget. No objective focus route is supplied; this subset is not a complete strategy. Add a narrower canonical focus reference or split the objective.');
  if(techSeeds.length&&!active.some(g=>g.entry.kind==='technology')&&!mandatory.chosen.some(e=>e.kind==='technology'))omissions.push('No research technology dependency group fits the source budget. Research preparation is missing from this subset; narrow the objective or add a smaller canonical technology reference.');
  if(omittedGroups.length)omissions.push(`${omittedGroups.length} optional dependency groups omitted by the payload/dependency budget. No selected source record was clipped. Omitted groups: ${omittedGroups.slice(0,8).map(g=>g.reference+' ('+g.reason+')').join('; ')}${omittedGroups.length>8?'; further groups listed in the local budget details.':''}`);
  const omitted=entries.filter(e=>['focus','shared_focus','joint_focus','decision','technology','event'].includes(e.kind)&&!chosen.has(e.uid)).length;
  omissions.push(`${omitted} other definitions omitted by objective/country/dependency selection. This is not complete mechanical or event closure; hidden scripted helpers and state conditions remain subject to the coverage gate.`);
  return {chosen:[...chosen.values()].sort(byUid),omitted,omissions,mandatoryReferences:mandatory.chosen.length,selectedGroups:active.length,omittedGroups:omittedGroups.map(g=>({...g}))};
 };
 if(options.fits&&!options.fits(make()))throw Error('Required source context exceeds the 180,000-character or 180,000-byte provider payload budget. Remove additional references, shorten manual context/revision instructions, or create a smaller saved strategy before previewing again. No required reference was dropped and no provider request was sent.');
 for(const group of groups){
  if(group.limited)continue;
  const position=omittedGroups.findIndex(g=>g.reference===ref(group.entry)),omission=omittedGroups[position];included.add(group.entry.uid);omittedGroups.splice(position,1);
  if(options.fits&&!options.fits(make())){included.delete(group.entry.uid);omittedGroups.splice(position,0,omission);}
 }
 const result=make();
 if(options.fits&&!options.fits(result))throw Error('Source budget changed during selection. Preview a narrower objective; no provider request was sent.');
 return result;
}
