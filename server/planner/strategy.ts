import type {CampaignPlan,Entry,Meta,Profile} from '../../src/types';
import type {PathExploration,PlanningSources,StrategyComparison} from '../../src/strategy-types';
import type {BridgeEnvironment} from '../../src/bridge-types';
import {entryMechanics} from '../../src/mechanics';
import {resolveFocus,actualCompletionContext} from './projection';
import {evaluatePlanner} from './evaluate';

export function planningSources(meta:Meta|null,environment:BridgeEnvironment):PlanningSources{
 const mods=[...new Set([...environment.configuration.enabledMods,...(meta?.mods||[])])];
 return {version:meta?.version||'unavailable',indexRevision:meta?.indexRevision||'legacy',mode:'base-game',playset:environment.configuration.status,mods,warnings:[
  'Installed base-game declarations. Tree selection, DLC entitlement and historical playset need independent confirmation.',
  ...(environment.configuration.status==='unavailable'?['Launcher selection unavailable; no active-playset claim is made.']:[]),
  ...(mods.length?['Selected mods are not merged into this index. Paths and comparisons describe base-game scenarios only; inspect mod overrides before using them in that campaign.']:[])
 ]};
}
const ref=(e:Entry)=>({reference:`definition:${e.uid}`,legacyId:e.id});
const exclusive=(a:Entry,b:Entry)=>(a.data.exclusive||[]).includes(b.id)||(b.data.exclusive||[]).includes(a.id);
const unique=(sequence:Entry[])=>[...new Map(sequence.map(e=>[e.uid,e])).values()];

/** Enumerates AND-of-OR prerequisite routes. This is a bounded structural search, not an engine simulation. */
export function explorePaths(profile:Profile,plan:CampaignPlan,goal:string,focuses:Entry[],tree:Entry,meta:Meta|null,sources:PlanningSources):PathExploration{
 const diagnostics=new Set<string>();let truncated=false,expansions=0;
 const actual=actualCompletionContext(profile,focuses),completed=focuses.filter(e=>actual.has(e.uid));
 const valid=(seq:Entry[])=>{const all=unique([...completed,...seq]);for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)if(exclusive(all[i],all[j])){diagnostics.add(`Excluded mutually exclusive combination: ${all[i].id} / ${all[j].id}.`);return false;}return true;};
 const cap=(routes:Entry[][])=>{const seen=new Set<string>();return routes.filter(r=>{const key=r.map(e=>e.uid).join('\n');if(seen.has(key))return false;seen.add(key);return true;}).filter((_,i)=>{if(i>=32){truncated=true;return false;}return true;});};
 const visit=(reference:string,ancestors:Set<string>):Entry[][]=>{
  if(++expansions>5000||ancestors.size>=64){truncated=true;return [];}
  const resolved=resolveFocus(reference,focuses),entry=resolved.entry;
  if(!entry){diagnostics.add(`${reference}: ${resolved.status}; no definition was guessed.`);return [];}
  if(ancestors.has(entry.uid)){diagnostics.add(`Cycle at ${entry.id}; no executable sequence inferred.`);return [];}
  if(actual.has(entry.uid)||actual.has(entry.id))return [[]];
  if(!['focus','shared_focus'].includes(entry.kind)){diagnostics.add(`${entry.id}: unsupported dynamic/joint focus structure.`);return [];}
  const raw=(entry.data.nodes||[]).filter((n:any)=>n.key==='prerequisite');
  if(raw.some((n:any)=>!Array.isArray(n.value)||!n.value.length||n.value.some((c:any)=>c.key!=='focus'||typeof c.value!=='string'||c.op&&c.op!=='='))){diagnostics.add(`${entry.id}: unsupported prerequisite syntax; inspect source.`);return [];}
  const groups:unknown=entry.data.prerequisites||[];
  if(!Array.isArray(groups)||groups.some(g=>!Array.isArray(g)||!g.length||g.some(id=>typeof id!=='string'))){diagnostics.add(`${entry.id}: invalid prerequisite groups.`);return [];}
  const next=new Set([...ancestors,entry.uid]);let routes:Entry[][]=[[]];
  for(const group of groups as string[][]){
   const choices=cap(group.flatMap(id=>visit(id,next)));const merged:Entry[][]=[];
   for(const route of routes)for(const choice of choices){const sequence=unique([...route,...choice]);if(valid([...sequence,entry]))merged.push(sequence);}
   routes=cap(merged);if(!routes.length)break;
  }
  return cap(routes.map(r=>unique([...r,entry])).filter(r=>{if(r.length>200){truncated=true;return false;}return valid(r);}));
 };
 const paths=visit(goal,new Set()).map(sequence=>{const items=sequence.map(ref);return {items,report:evaluatePlanner(profile,{...plan,items},focuses,{tree,dlcs:meta?.dlcs||[],indexRevision:sources.indexRevision})};});
 if(truncated)diagnostics.add('Search bounded to 32 routes, 5,000 expansions, depth 64 and 200 focuses per route. Results are partial, not exhaustive or ranked.');
 if(tree.data.referenceIssues?.length)diagnostics.add('The tree contains missing or ambiguous shared references; inspect Tree rules.');
 return {schemaVersion:1,goal,paths,diagnostics:[...diagnostics],truncated,sources};
}

export function compareStrategies(profile:Profile,plans:CampaignPlan[],catalog:(tree:string)=>{tree:Entry;focuses:Entry[]},meta:Meta|null,sources:PlanningSources):StrategyComparison{
 if(plans.length<2||plans.length>4||new Set(plans.map(p=>p.id)).size!==plans.length)throw Error('Choose two to four distinct alternatives.');
 const resolved=plans.map(plan=>{const {tree,focuses}=catalog(plan.tree);return {plan,tree,focuses,entries:plan.items.flatMap(i=>{const entry=resolveFocus(i.reference,focuses).entry;return entry?[entry]:[];})};});
 const shared=resolved[0].entries.filter(e=>resolved.every(p=>p.entries.some(other=>other.uid===e.uid))).map(e=>e.uid);
 const conflicts=new Map<string,{left:string;right:string}>();
 for(let i=0;i<resolved.length;i++)for(let j=i+1;j<resolved.length;j++)for(const a of resolved[i].entries)for(const b of resolved[j].entries)if(a.uid!==b.uid&&exclusive(a,b))conflicts.set([a.uid,b.uid].sort().join('|'),{left:a.id,right:b.id});
 return {schemaVersion:1,sources,shared,conflicts:[...conflicts.values()],plans:resolved.map(({plan,tree,focuses,entries},i)=>({plan,report:evaluatePlanner(profile,plan,focuses,{tree,dlcs:meta?.dlcs||[],indexRevision:sources.indexRevision}),unique:entries.filter(e=>!resolved.some((p,j)=>i!==j&&p.entries.some(other=>other.uid===e.uid))).map(e=>e.uid),rewards:entries.map(e=>({reference:`definition:${e.uid}`,title:e.title,script:String(e.data.effects||'No completion reward extracted.'),explanation:entryMechanics(e).summary,source:e.source,line:e.line,version:e.version}))}))};
}
