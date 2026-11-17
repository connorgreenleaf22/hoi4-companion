import {useEffect,useState} from 'react';
import type {Entry,Meta,Profile} from '../types';
import {api} from '../api';
import {getPlannerDraft,rememberPlannerDraft} from '../planner/drafts';
import {ensurePlanner,mirrorPlanner} from '../../server/planner/plans';
import {AiPlanner} from '../planner/AiPlanner';
import '../planner/planner.css';
import './campaign.css';

export function CampaignWorkspace({profile,meta,onNew,onSetup,onEdit,openEntry,view='campaign'}:{profile?:Profile;meta:Meta|null;onNew:()=>void;onSetup:()=>void;onEdit:()=>void;openEntry:(ref:string)=>void;view?:'campaign'|'chat'|'saved'}){
 const [source,setSource]=useState<{key:string;tree:Entry;focuses:Entry[]}>();
 const [error,setError]=useState('');
 const planner=profile?ensurePlanner(profile):undefined;
 const plan=planner?.plans.find(p=>p.id===planner.activePlanId);
 const key=JSON.stringify([profile?.id,plan?.tree,meta?.indexRevision]);
 useEffect(()=>{let live=true;setError('');if(plan?.tree)void api<{tree:Entry;focuses:Entry[]}>(`tree?uid=${encodeURIComponent(plan.tree)}`).then(v=>{if(live)setSource({key,...v});}).catch(e=>{if(live)setError(String(e));});return()=>{live=false;};},[key]);
 function addAlternative(items:import('../types').CampaignPlan['items'],name:string,assumptions?:string[]){
  if(!profile||!plan)return;const previous=getPlannerDraft(profile.id);const draft=structuredClone(previous?.dirty?previous.draft:profile);const state=ensurePlanner(draft);if(state.plans.length>=20){window.alert('This campaign already has 20 focus alternatives. Review or remove one in the planner before adding another.');return;}const id=crypto.randomUUID();state.plans.push({...plan,id,name:name.slice(0,100),items,assumptions:assumptions||plan.assumptions,referenceIndexRevision:meta?.indexRevision});draft.planner=state;
  rememberPlannerDraft({draft:mirrorPlanner(draft),selected:id,baseRevision:previous?.dirty?previous.baseRevision:profile.revision||0,view:previous?.view||state.view,dirty:true});onSetup();
 }
 const current=source?.key===key?source:undefined;
 return <section className="campaign-home" aria-label="Campaign workspace">
  <header className="campaign-heading"><div><small>DEVELOPMENT ALPHA · CAMPAIGN FIRST</small><h1>{view==='saved'?'Saved plans & conversation':view==='chat'?'Strategy conversation':profile?.name||'Your next campaign starts here'}</h1><p>Fun → Winning → Efficiency. Plans stay provisional and editable.</p></div><button className="button" onClick={onNew}>Create / select campaign</button></header>
  {!profile?<section className="panel"><h2>Choose a campaign</h2><p>Create Germany or select existing saved work. Local planning works without an AI provider.</p><button className="button primary" onClick={onNew}>Choose Germany</button></section>:<>
   <div className="campaign-context"><strong>{profile.country} · {profile.startDate}</strong><span>Indexed patch {meta?.version||'unavailable'}</span><span>Tree: {current?.tree.title||plan?.tree||'choose a tree'}</span><span>Manual scenario · no qualified live context</span></div>
   <details><summary>Sources, configuration and limits</summary><p>Owner default: all DLC enabled, no mods. Declare campaign exceptions in the composer context; installed files alone do not prove DLC activation.</p><p>{current?.tree.source}:{current?.tree.line} · {current?.tree.version} · SHA256 {current?.tree.hash}</p><p>Campaign assertions: {Object.values(profile.dlcStates||{}).filter(d=>d.owned.value==='yes'&&d.enabled.value==='yes').length} DLC entries declared owned and enabled; {Object.values(profile.dlcStates||{}).filter(d=>d.owned.value!=='yes'||d.enabled.value!=='yes').length} declared exceptions/unknowns. Missing declarations remain unknown.</p><button className="button" onClick={onEdit}>Review declared DLC & campaign</button><p>Index {meta?.indexRevision||'unavailable'}. {meta?.mods.length?'Detected mods are not merged; applicability requires review.':'No indexed mod overrides.'} Current-patch calculations and combat outcomes are not qualified. Historical or manual information never becomes a live fact.</p><button className="button" onClick={onSetup}>Review campaign & tree in planner</button></details>
   {(!plan?.tree||error)&&<section className="notice"><p>{error||'Choose the active tree before source preview and strategy review. Existing campaigns and drafts remain available.'}</p><button className="button primary" onClick={onSetup}>Set up focus tree</button></section>}
   {plan&&<AiPlanner key={profile.id+'|'+plan.tree} profile={profile} plan={plan} focuses={current?.focuses||[]} indexRevision={meta?.indexRevision||'legacy'} openEntry={openEntry} addAlternative={addAlternative} campaignFirst view={view}/>}
  </>}
 </section>;
}
