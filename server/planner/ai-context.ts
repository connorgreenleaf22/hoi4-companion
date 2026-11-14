import type {Entry,Profile,Node} from '../../src/types';
/** Bounded retrieval, not a strategy ranking. Closure omissions always remain visible. */
export function selectContext(entries:Entry[],tree:Entry,focuses:Entry[],profile:Profile,objective:string,extra:string[]){
 const omissions:string[]=[];const chosen=new Map<string,Entry>([[tree.uid,tree]]);
 const terms=objective.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>3&&!['portugal','germany','strategy','prepare','develop','build','want','with','then','country'].includes(t));
 if(terms.some(t=>t.startsWith('monarch')))terms.push('royal','duarte','kingdom','brazil','restoration');
 const relevance=(e:Entry)=>terms.filter(t=>(e.id+' '+e.title+' '+e.description).toLowerCase().includes(t.slice(0,6))).length;
 const add=(e:Entry)=>chosen.set(e.uid,e);
 const focusById=(id:string)=>focuses.filter(f=>f.id===id||'definition:'+f.uid===id);
 const seeds=[...focuses].filter(e=>relevance(e)>0).sort((a,b)=>relevance(b)-relevance(a)||a.uid.localeCompare(b.uid)).slice(0,18);
 if(!seeds.length){omissions.push('No objective-matched focuses: only root focuses supplied. Add canonical references to expand context.');seeds.push(...focuses.filter(e=>!(e.data.prerequisites||[]).flat().length).slice(0,8));}
 for(const ref of extra){const matches=entries.filter(e=>ref==='definition:'+e.uid||ref===e.id);if(matches.length!==1)throw Error('Additional context must identify one definition; use a canonical reference: '+ref);const e=matches[0];if(['focus','shared_focus','joint_focus'].includes(e.kind)&&!focuses.some(f=>f.uid===e.uid))throw Error('Additional focus is outside the selected tree: '+ref);add(e);if(focuses.includes(e))seeds.push(e);}
 const closure=(e:Entry,exclusions:boolean)=>{if(chosen.has(e.uid)&&!seeds.includes(e))return;add(e);for(const id of (e.data.prerequisites||[]).flat()){const candidates=focusById(id);if(candidates.length!==1){omissions.push('Unresolved prerequisite '+id);continue;}if(!chosen.has(candidates[0].uid))closure(candidates[0],false);}if(exclusions)for(const id of e.data.exclusive||[]){const candidates=focusById(id);if(candidates.length===1&&!chosen.has(candidates[0].uid))closure(candidates[0],false);else if(candidates.length!==1)omissions.push('Unresolved exclusion '+id);}};
 for(const seed of seeds)closure(seed,true);
 // Also expose exclusions of ancestors, including their prerequisite closure.
 for(const e of [...chosen.values()])for(const id of e.data.exclusive||[]){const matches=focusById(id);if(matches.length===1&&!chosen.has(matches[0].uid))closure(matches[0],false);}
 const decisions=entries.filter(e=>e.kind==='decision'&&(e.id.startsWith(profile.country+'_')||(e.data.countries||[]).includes(profile.country))&&relevance(e)>0).sort((a,b)=>relevance(b)-relevance(a)||a.uid.localeCompare(b.uid));decisions.slice(0,8).forEach(add);
 const techs=entries.filter(e=>e.kind==='technology');techs.filter(e=>relevance(e)>0).sort((a,b)=>relevance(b)-relevance(a)||a.uid.localeCompare(b.uid)).slice(0,5).forEach(add);
 for(const folder of ['industry_folder','electronics_folder','infantry_folder'])techs.filter(e=>Number(e.data.nodes?.find((n:Node)=>n.key==='start_year')?.value)<=Number(profile.startDate.slice(0,4))&&JSON.stringify(e.data.nodes?.filter((n:Node)=>n.key==='folder')).includes(folder)).sort((a,b)=>a.uid.localeCompare(b.uid)).slice(0,2).forEach(add);
 // Small fixtures and explicit basic-machine-tools identifier remain useful without folder metadata.
 techs.filter(e=>['basic_machine_tools','tools'].includes(e.id)).forEach(add);
 const events=(nodes:Node[]):string[]=>nodes.flatMap(n=>['country_event','news_event','state_event'].includes(n.key)?[typeof n.value==='string'?n.value:String(n.value.find(x=>x.key==='id')?.value||'')]:Array.isArray(n.value)?events(n.value):[]).filter(Boolean);
 const queue=[...chosen.values()];let eventCount=0;
 for(let i=0;i<queue.length;i++)for(const id of events(queue[i].data.nodes||[])){const matches=entries.filter(e=>e.kind==='event'&&e.id===id);if(matches.length!==1){omissions.push('Unresolved event '+id);continue;}const e=matches[0];if(chosen.has(e.uid))continue;if(eventCount>=24){omissions.push('Event closure limit: '+id);continue;}add(e);queue.push(e);eventCount++;}
 const omitted=entries.filter(e=>['focus','shared_focus','joint_focus','decision','technology','event'].includes(e.kind)&&!chosen.has(e.uid)).length;
 omissions.push(`${omitted} other definitions omitted by objective/country/dependency selection. This is not complete mechanical or event closure; hidden scripted helpers and state conditions remain subject to the coverage gate.`);
 return {chosen:[...chosen.values()].sort((a,b)=>a.uid.localeCompare(b.uid)),omitted,omissions:[...new Set(omissions)]};
}
