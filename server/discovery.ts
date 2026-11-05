import {randomUUID} from 'node:crypto';
import type {Store} from './store';
import type {CampaignGuide,GuideView,DiscoveryPreview} from '../src/discovery-types';
import type {Coverage,Entry,Meta,Profile} from '../src/types';
import content from './discovery-content.json';
import {ensurePlanner} from './planner/plans';
import {preparePlanDraft,makePreview,PlanConflict} from './planner/service';
import {captureChecklist} from './planner/checklists';
export const campaignGuides=content as CampaignGuide[];
function exact(store:Store,id:string,kind:string,source:string):Entry|undefined{
  const candidates=store.resolve(id,kind).candidates.filter(e=>e.source===source);
  return candidates.length===1?candidates[0]:undefined;
}
export function inspectGuide(store:Store,guide:CampaignGuide):GuideView{
  const meta=store.getSetting<Meta|null>('meta',null),coverage=store.getSetting<Coverage|null>('coverage',null);
  const hashes=new Map([...coverage?.files.map(f=>[f.source,f.hash] as const)||[],...Object.entries(store.getSetting<Record<string,string>>('guideSourceHashes',{}))]),reviewReasons:string[]=[];
  if(!meta)reviewReasons.push('No installed reference index is available.');
  else if(meta.version!==guide.supportedVersion)reviewReasons.push(`Authored for ${guide.supportedVersion}; indexed game is ${meta.version}.`);
  for(const source of guide.sources.filter(s=>s.kind==='installed-script')){
    if(!hashes.has(source.path))reviewReasons.push(`Source not represented in cached coverage: ${source.path}`);
    else if(hashes.get(source.path)!==source.hash)reviewReasons.push(`Source changed: ${source.path}`);
  }
  const resolvedReferences:GuideView['resolvedReferences']=[],referenceProblems:string[]=[];
  for(const ref of guide.references){const e=exact(store,ref.id,ref.kind,ref.source);if(e)resolvedReferences.push({id:e.id,title:e.title,uid:'definition:'+e.uid});else referenceProblems.push(`${ref.id}: missing or ambiguous exact source definition`);}
  const starter=guide.starter;
  let starterOkay=!!starter;
  if(starter){
    const tree=exact(store,starter.treeId,'focus_tree',starter.treeSource);
    if(!tree){referenceProblems.push('Suggested focus tree is missing or ambiguous.');starterOkay=false;}
    for(const id of starter.focusIds){if(!exact(store,id,'focus',starter.treeSource)){referenceProblems.push(`Suggested focus ${id} is missing or ambiguous.`);starterOkay=false;}}
  }
  return {...guide,freshness:!meta?'unavailable':reviewReasons.length||referenceProblems.length?'review-required':'matched',reviewReasons,resolvedReferences,referenceProblems,canPreview:starterOkay&&!reviewReasons.length&&!referenceProblems.length,indexRevision:meta?.indexRevision||'legacy'};
}
/** Filter secrets BEFORE matching. A hidden title, tag, source or snippet never becomes a result. */
export function listDiscovery(store:Store,options:{spoilers?:boolean;q?:string;country?:string}={}){
  const query=(options.q||'').trim().toLocaleLowerCase().slice(0,300);
  return campaignGuides.filter(g=>(!g.spoiler||options.spoilers===true)&&(!options.country||g.countries.includes(options.country))).filter(g=>!query||[g.title,g.summary,g.type,...g.countries,...g.objectives,...g.claims.map(c=>c.text)].join(' ').toLocaleLowerCase().includes(query)).map(g=>inspectGuide(store,g));
}
export function getDiscovery(store:Store,id:string,spoilers=false){const g=campaignGuides.find(g=>g.id===id&&(!g.spoiler||spoilers));return g?inspectGuide(store,g):undefined;}
/** A new alternative is proposed from current saved data. No campaign or selection write occurs. */
export function previewDiscovery(store:Store,guide:GuideView,profile:Profile,expectedIndexRevision:string):DiscoveryPreview{
  if(!guide.canPreview||!guide.starter)throw new PlanConflict('guide-review-required','This guide needs source/reference review before suggesting a plan.');
  if(!guide.countries.includes(profile.country))throw new Error('Choose a saved campaign for this guide country first.');
  if(guide.indexRevision!==expectedIndexRevision)throw new PlanConflict('reference-conflict','References changed. Reload the guide and preview again.');
  const planner=ensurePlanner(profile);
  const tree=exact(store,guide.starter.treeId,'focus_tree',guide.starter.treeSource)!;
  const plan={id:randomUUID(),name:(guide.title+' starter').slice(0,100),tree:'definition:'+tree.uid,startDate:profile.startDate,items:guide.starter.focusIds.map(id=>({reference:'definition:'+exact(store,id,'focus',guide.starter!.treeSource)!.uid,legacyId:id})),assumptions:[`Guide ${guide.id}, revision ${guide.revision}, reviewed ${guide.reviewedAt}; each claim retains its own verification status.`,...guide.starter.assumptions],referenceIndexRevision:expectedIndexRevision};
  const draft=preparePlanDraft({...profile,planner,referenceIndexRevision:expectedIndexRevision},plan);
  const initial=makePreview(store,draft.profile,draft.plan,profile.revision??0,expectedIndexRevision);
  const checklist=captureChecklist(draft.plan,initial.report,{indexRevision:expectedIndexRevision,gameVersion:guide.supportedVersion,appVersion:'0.4.0',name:(guide.title+' · guide r'+guide.revision).slice(0,100),actualCompleted:profile.completed});
  checklist.assumptions.push(`Original guide ${guide.id} r${guide.revision}; ${guide.rights}`);
  checklist.items.push(...guide.claims.map((claim,index)=>({id:'guide-'+index,text:`${claim.type.toUpperCase()} · ${claim.verification}: ${claim.text}`,checked:false,requirements:[],sources:claim.sourceIds.flatMap(id=>{const s=guide.sources.find(s=>s.id===id);return s?[{class:s.kind==='installed-script'?'installed-script' as const:'external' as const,source:s.path,line:s.line,hash:s.hash,gameVersion:guide.supportedVersion,rule:`Guide ${guide.id} r${guide.revision}, ${claim.id}`,capturedAt:guide.reviewedAt}]:[]})})));
  draft.profile.planner!.checklists.push(checklist);
  return {guideId:guide.id,guideRevision:guide.revision,profile:draft.profile,plan:draft.plan,preview:makePreview(store,draft.profile,draft.plan,profile.revision??0,expectedIndexRevision)};
}
