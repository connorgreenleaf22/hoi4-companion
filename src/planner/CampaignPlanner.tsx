import {useEffect,useRef,useState} from 'react';
import {AlertTriangle,ArrowDown,ArrowUp,Bookmark,Check,ChevronRight,Clock,Copy,GitBranch,List,Map as MapIcon,Plus,RefreshCw,Search,Trash2,X} from 'lucide-react';
import type {CampaignPlan,Entry,FocusRef,PlannerState,PlannerView,PlanPreview,Profile,RequirementResult,Resolution,Truth} from '../types';
import {api,download} from '../api';
import {ensurePlanner,mirrorPlanner} from '../../server/planner/plans';
import {captureChecklist} from '../../server/planner/checklists';
import {capturedGuideCorrections} from '../guide-corrections';
import './planner.css';
import {RequirementView} from '../MechanicsView';
import {StrategyWorkbench} from './StrategyWorkbench';
import {conditionState,conditionText} from './condition-state';
import {getPlannerDraft,rememberPlannerDraft,forgetPlannerDraft,subscribePlannerDiscard,beginPlannerWrite,downloadablePlannerDraft,type CachedPlannerDraft} from './drafts';

type Props={profile?:Profile;save:(p:Profile)=>Promise<Profile>;countries:Entry[];onCountry:(tag:string)=>void;openEntry:(ref:string)=>void;fail:(e:unknown)=>void;jump:string;onNew:()=>void;indexRevision?:string;onApplied:(p:Profile)=>void};
type CachedDraft=CachedPlannerDraft;
const normal=(p:Profile):Profile=>mirrorPlanner({...structuredClone(p),planner:ensurePlanner(p),exportSchemaVersion:3});
const focusRef=(e:Entry):FocusRef=>({reference:e.entityKey||`definition:${e.uid}`,legacyId:e.id});
const truthLabel=(v:Truth)=>v==='yes'?'Supported':v==='no'?'Blocked':'Check in game';
const unique=(values:string[])=>[...new Set(values)];
const describeError=(e:unknown)=>e instanceof Error?e.message:String(e);

export function CampaignPlanner({profile,save,countries,openEntry,fail,jump,onNew,indexRevision,onApplied}:Props){
  const [draft,setDraft]=useState<Profile|undefined>(()=>profile?(getPlannerDraft(profile.id)?.dirty?getPlannerDraft(profile.id)!.draft:normal(profile)):undefined);
  const [selected,setSelected]=useState(()=>profile?(getPlannerDraft(profile.id)?.dirty?getPlannerDraft(profile.id)!.selected:ensurePlanner(profile).activePlanId):'');
  const [view,setView]=useState<PlannerView>(()=>profile?(getPlannerDraft(profile.id)?.view||ensurePlanner(profile).view):{mode:'list',filter:'',zoom:.7,scrollLeft:0,scrollTop:0});
  const [trees,setTrees]=useState<Entry[]>([]);const [tree,setTree]=useState<Entry>();const [focuses,setFocuses]=useState<Entry[]>([]);
  const [preview,setPreview]=useState<{key:string;value:PlanPreview}>();const [busy,setBusy]=useState(false);const [checking,setChecking]=useState(false);
  const [error,setError]=useState('');const [message,setMessage]=useState('');const [retry,setRetry]=useState(0);const [deleteOpen,setDeleteOpen]=useState(false);const [replacement,setReplacement]=useState('');
  const [newChecklistName,setNewChecklistName]=useState('');const graph=useRef<HTMLDivElement>(null);const requests=useRef(0);const currentKey=useRef('');const latest=useRef<CachedDraft|undefined>(undefined);
  const previousId=useRef(profile?.id);const baseline=profile?normal(profile):undefined;
  const currentCampaign=useRef(profile?.id);currentCampaign.current=profile?.id;
  const planner=draft?.planner;const plan=planner?.plans.find(p=>p.id===selected);
  const contextRevision=indexRevision||'legacy';
  // Draft controls may temporarily contain a blank name/date. Validate at the API boundary,
  // keeping that editable draft visible instead of throwing during React rendering.
  const payload:Profile|undefined=draft&&plan?{...draft,revision:profile?.revision??0,planner:{...planner!,activePlanId:plan.id},tree:plan.tree,queue:plan.items.map(i=>i.legacyId??i.reference),startDate:plan.startDate,referenceIndexRevision:contextRevision,exportSchemaVersion:3}:undefined;
  const previewKey=payload&&plan?JSON.stringify({profile:payload,plan,revision:profile?.revision??0,index:contextRevision}):'';
  currentKey.current=previewKey;
  const report=preview?.key===previewKey?preview.value.report:undefined;
  const samePlanContent=(a?:Profile,b?:Profile)=>{if(!a||!b)return false;const clean=(p:Profile)=>({...p,revision:0,referenceIndexRevision:undefined,planner:p.planner?{...p.planner,view:undefined,plans:p.planner.plans.map(x=>({...x,referenceIndexRevision:undefined}))}:undefined});return JSON.stringify(clean(a))===JSON.stringify(clean(b));};
  const dirty=!!payload&&(!profile?.planner||!samePlanContent(payload,baseline));
  const staleBase=!!profile&&!!draft&&(draft.revision??0)!==(profile.revision??0);
  const needsPreservation=!!payload&&profile?.id===draft?.id&&!samePlanContent(payload,baseline);
  latest.current=draft?{draft,selected,baseRevision:draft.revision??0,view,dirty:profile?.id===draft.id?needsPreservation:latest.current?.dirty??false}:undefined;
  useEffect(()=>{if(profile?.id===draft?.id&&latest.current)rememberPlannerDraft(latest.current);},[draft,selected,view,needsPreservation,profile?.id]);

  useEffect(()=>{
    if(previousId.current!==profile?.id){
      const old=latest.current;if(previousId.current&&old)rememberPlannerDraft(old);
      previousId.current=profile?.id;const cached=profile?getPlannerDraft(profile.id):undefined;const p=profile?(cached?.dirty?cached.draft:normal(profile)):undefined;
      setDraft(p);setSelected(cached?.dirty?cached.selected:p?.planner?.activePlanId||'');if(p)setView(cached?.view||p.planner!.view);setError('');setPreview(undefined);requests.current++;return;
    }
    if(!profile)return;
    if(!draft||!needsPreservation){const p=normal(profile);setDraft(p);setSelected(p.planner!.activePlanId);}
  },[profile?.id,profile?.revision]);
  useEffect(()=>()=>{const current=latest.current;if(previousId.current&&current)rememberPlannerDraft(current);},[]);
  useEffect(()=>{if(jump){setView(v=>({...v,filter:jump,mode:'list'}));}},[jump]);
  useEffect(()=>{let live=true;if(!draft)return;api<Entry[]>(`trees?country=${encodeURIComponent(draft.country)}`).then(value=>{if(live)setTrees(value);}).catch(e=>{if(live)setError(describeError(e));});return()=>{live=false;};},[draft?.country,contextRevision]);
  useEffect(()=>{
    let live=true;setFocuses([]);setTree(undefined);if(!plan?.tree)return;
    api<{tree:Entry;focuses:Entry[]}>(`tree?uid=${encodeURIComponent(plan.tree)}`).then(value=>{if(live){setTree(value.tree);setFocuses(value.focuses);}}).catch(e=>{if(live)setError(describeError(e));});return()=>{live=false;};
  },[plan?.tree,contextRevision]);
  useEffect(()=>{
    const serial=++requests.current;setPreview(undefined);setChecking(false);if(!payload||!plan?.tree||staleBase)return;
    const timer=setTimeout(()=>{setChecking(true);api<PlanPreview>('plan/preview',{profile:payload,plan,expectedProfileRevision:profile?.revision??0,expectedIndexRevision:contextRevision}).then(value=>{if(serial===requests.current){setPreview({key:previewKey,value});setError('');}}).catch(e=>{if(serial===requests.current)setError(describeError(e));}).finally(()=>{if(serial===requests.current)setChecking(false);});},160);
    return()=>{clearTimeout(timer);};
  },[previewKey,retry,staleBase]);
  useEffect(()=>{const viewport=graph.current;if(viewport){viewport.scrollLeft=view.scrollLeft;viewport.scrollTop=view.scrollTop;}},[plan?.tree,view.mode,focuses.length]);

  const updatePlanner=(transform:(p:PlannerState)=>PlannerState)=>{if(!draft||!planner)return;setDraft({...draft,planner:transform(structuredClone(planner))});setPreview(undefined);setMessage('');};
  const editPlan=(patch:Partial<CampaignPlan>)=>updatePlanner(p=>({...p,plans:p.plans.map(x=>x.id===selected?{...x,...patch}:x)}));
  const cancel=()=>{if(!profile)return;requests.current++;const p=normal(profile);forgetPlannerDraft(profile.id);setDraft(p);setSelected(p.planner!.activePlanId);setDeleteOpen(false);setError('');setMessage('Preview cancelled. Saved campaign unchanged.');setPreview(undefined);};
  useEffect(()=>subscribePlannerDiscard((id,current)=>{if(id===profile?.id){if(current)committed(current);else cancel();}}),[profile]);
  const committed=(p:Profile)=>{const value=normal(p);setDraft(value);setSelected(value.planner!.activePlanId);forgetPlannerDraft(p.id);setPreview(undefined);onApplied(p);};
  const receivedSaved=(saved:Profile,submitted:Profile,message:string,key?:string)=>{
    const cached=getPlannerDraft(saved.id);const newer=!!cached?.dirty&&!samePlanContent(downloadablePlannerDraft(cached),submitted);
    if(!newer&&currentCampaign.current===saved.id&&(key===undefined||currentKey.current===key)){committed(saved);setMessage(message);}
    else {if(!newer)forgetPlannerDraft(saved.id);onApplied(saved);if(currentCampaign.current===saved.id){setMessage('The earlier save completed. Your newer draft is retained and needs a fresh preview.');setPreview(undefined);}}
  };
  const apply=async()=>{
    if(!payload||!plan||!preview||preview.key!==previewKey||staleBase)return;
    const submittedKey=previewKey;
    const finishWrite=beginPlannerWrite();
    setBusy(true);setError('');try{const result=await api<{profile:Profile;report:PlanPreview['report']}>('plan/apply',{profile:payload,plan,expectedProfileRevision:profile?.revision??0,expectedIndexRevision:contextRevision,fingerprint:preview.value.fingerprint});receivedSaved(result.profile,payload,'Reviewed plan applied. Actual completion history is unchanged.',submittedKey);}catch(e){setError(describeError(e)+' Your draft is retained. Review a fresh preview before applying.');setPreview(undefined);requests.current++;}finally{setBusy(false);finishWrite();}
  };
  const saveActual=async(transform:(p:Profile)=>Profile,success:string)=>{
    if(!profile||dirty||busy)return;const basis=payload||normal(profile);setBusy(true);setError('');try{const submitted=mirrorPlanner(transform(normal(profile)));const result=await save(submitted);receivedSaved(result,basis,success);}catch(e){setError(describeError(e));}finally{setBusy(false);}
  };
  const tickChecklist=(listId:string,itemId:string,checked:boolean)=>void saveActual(p=>({...p,planner:{...p.planner!,checklists:p.planner!.checklists.map(c=>c.id===listId?{...c,items:c.items.map(i=>i.id===itemId?{...i,checked}:i)}:c)}}),'Checklist progress saved. Actual completion history unchanged.');
  const useLatest=async()=>{if(!profile)return;const submitted=payload||normal(profile);setBusy(true);try{const status=await api<{profiles:Profile[]}>('status');const current=status.profiles.find(p=>p.id===profile.id);if(!current)throw new Error('This campaign was deleted. Download the retained draft to preserve it.');receivedSaved(current,submitted,'Latest saved campaign loaded. Preview again before making a change.');setError('');}catch(e){setError(describeError(e));}finally{setBusy(false);}};
  const copyAlternative=()=>{if(!plan||!planner||planner.plans.length>=20)return;const copy={...structuredClone(plan),id:crypto.randomUUID(),name:(plan.name+' copy').slice(0,100)};updatePlanner(p=>({...p,plans:[...p.plans,copy]}));setSelected(copy.id);};
  const removeAlternative=()=>{
    if(!planner||planner.plans.length<2)return;const next=selected===planner.activePlanId?replacement:planner.activePlanId;if(!planner.plans.some(p=>p.id===next&&p.id!==selected))return;
    updatePlanner(p=>({...p,activePlanId:next,plans:p.plans.filter(x=>x.id!==selected)}));setSelected(next);setDeleteOpen(false);setMessage('Deletion is in the draft. Review the replacement before Apply.');
  };
  const add=(focus:Entry)=>{if(plan&&plan.items.length<2000)editPlan({items:[...plan.items,focusRef(focus)]});};
  const move=(position:number,offset:number)=>{if(!plan)return;const items=[...plan.items];[items[position],items[position+offset]]=[items[position+offset],items[position]];editPlan({items});};
  const resolveLocal=(ref:FocusRef)=>{const candidates=focuses.filter(f=>[f.uid,`definition:${f.uid}`,f.entityKey].includes(ref.reference)||!ref.reference.includes(':')&&f.id===ref.reference);return candidates.length===1?candidates[0]:undefined;};
  const isEntryDone=(entry:Entry)=>!!profile?.completed.some(key=>[entry.id,entry.uid,`definition:${entry.uid}`,entry.entityKey].includes(key));
  const bookmarkKeys=(entry:Entry)=>[entry.entityKey,entry.uid,`definition:${entry.uid}`,...(entry.data.legacyAliases||[])].filter((key):key is string=>!!key&&!(entry.data.ambiguousAliases||[]).includes(key));
  const isEntryBookmarked=(entry:Entry)=>!!profile?.bookmarks.some(key=>bookmarkKeys(entry).includes(key));
  const toggleBookmark=async(entry:Entry)=>{
    if(!profile||dirty||busy)return;const basis=payload||normal(profile);setBusy(true);setError('');try{
      // Resolve the exact current definition before migrating/removing legacy keys.
      // Reused or ambiguous aliases remain attached to their original saved reference.
      const full=await api<Entry>(`entry?uid=${encodeURIComponent('definition:'+entry.uid)}`);const keys=bookmarkKeys(full);const p=normal(profile);const bookmarked=p.bookmarks.some(key=>keys.includes(key));
      const submitted={...p,bookmarks:bookmarked?p.bookmarks.filter(key=>!keys.includes(key)):[...p.bookmarks,full.entityKey||`definition:${full.uid}`]};const result=await save(submitted);receivedSaved(result,basis,'Bookmark updated.');
    }catch(e){setError(describeError(e));}finally{setBusy(false);}
  };
  const hasFocus=(focus:Entry)=>plan?.items.some(ref=>ref.reference===focusRef(focus).reference||ref.reference===focus.id||ref.reference===focus.uid);
  const filtered=focuses.filter(f=>`${f.title} ${f.id}`.toLowerCase().includes(view.filter.toLowerCase()));
  const minX=Math.min(0,...focuses.map(f=>Number(f.data.position?.x||0)));const maxX=Math.max(8,...focuses.map(f=>Number(f.data.position?.x||0)));const maxY=Math.max(5,...focuses.map(f=>Number(f.data.position?.y||0)));
  const pos=(f:Entry)=>({x:(Number(f.data.position?.x||0)-minX)*105+24,y:Number(f.data.position?.y||0)*100+24});
  const next=report?.steps.find(step=>!step.issues.some(issue=>issue.type==='completed'));
  const chooseDefinition=(position:number,entry:Entry)=>{if(!plan||busy)return;editPlan({items:plan.items.map((item,i)=>i===position?{reference:`definition:${entry.uid}`,legacyId:entry.id}:item)});};
  const rememberScroll=(element:HTMLDivElement)=>{const scrollTop=element.scrollTop,scrollLeft=element.scrollLeft;setView(v=>({...v,scrollTop,scrollLeft}));};
  const capture=()=>{
    if(!profile||!plan||!report||dirty)return;
    try{const checklist=captureChecklist(plan,report,{id:crypto.randomUUID(),name:(newChecklistName||`${plan.name} checks`).slice(0,100),indexRevision:report.indexRevision,gameVersion:report.steps.flatMap(s=>s.sources)[0]?.gameVersion||'unavailable',appVersion:'0.3.0',actualCompleted:[...profile.completed]});void saveActual(p=>({...p,planner:{...p.planner!,checklists:[...p.planner!.checklists,checklist]}}),'Sourced checklist captured. Ticks do not complete focuses.');}catch(e){setError(describeError(e));}
  };

  if(!profile||!draft||!planner||!plan)return <section className="panel campaign-planner empty"><GitBranch size={32}/><h1>Campaign planner</h1><p>Create a campaign to plan its focus sequence.</p><button className="button primary" onClick={onNew}>Create campaign</button></section>;
  return <div className="campaign-planner">
    <div className="page-heading"><div><div className="eyebrow">CAMPAIGN PLANNER</div><h1>Plan the next move</h1><p>Explore a route, review its conditions, then save the choice.</p></div><button className="button" disabled={busy} onClick={onNew}><Plus size={16}/>New campaign</button></div>
    <div className="cp-planbar panel">
      <label>Alternative<select aria-label="Plan alternative" value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setDeleteOpen(false);setPreview(undefined);}}>{planner.plans.map(p=><option key={p.id} value={p.id}>{p.name}{p.id===planner.activePlanId?' · active':''}</option>)}</select></label>
      <label>Plan name<input aria-label="Plan name" maxLength={100} value={plan.name} disabled={busy} onChange={e=>editPlan({name:e.target.value})}/></label>
      <button className="button" onClick={copyAlternative} disabled={planner.plans.length>=20||busy}><Copy size={15}/>Copy alternative</button>
      <button className="icon-button danger" aria-label="Delete alternative" disabled={planner.plans.length<2||busy} onClick={()=>{setDeleteOpen(v=>!v);setReplacement(planner.plans.find(p=>p.id!==selected)?.id||'');}}><Trash2 size={16}/></button>
    </div>
    {deleteOpen&&<section className="notice cp-delete" aria-label="Review alternative deletion"><div><strong>Delete “{plan.name}”?</strong><p>The saved plan changes only after preview and Apply.</p></div>{selected===planner.activePlanId&&<label>Replacement<select aria-label="Replacement plan" value={replacement} onChange={e=>setReplacement(e.target.value)}>{planner.plans.filter(p=>p.id!==selected).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}<button className="button" onClick={removeAlternative}>Preview deletion</button><button className="button" onClick={()=>setDeleteOpen(false)}>Keep alternative</button></section>}
    <div className="cp-context">
      <label>Country<select aria-label="Planner country" value={draft.country} disabled={busy} onChange={e=>setDraft({...draft,country:e.target.value})}>{countries.some(c=>c.id===draft.country)?null:<option value={draft.country}>{draft.country}</option>}{countries.map(c=><option key={c.uid} value={c.id}>{c.title} ({c.id})</option>)}</select></label>
      <label>Focus tree<select aria-label="Focus tree" value={plan.tree} disabled={busy} onChange={e=>editPlan({tree:e.target.value})}><option value="">Choose a focus tree</option>{plan.tree&&!trees.some(t=>t.uid===plan.tree)&&<option value={plan.tree}>{tree?.title||plan.tree} · saved reference</option>}{trees.map(t=><option key={t.uid} value={t.uid}>{t.title} · {t.source.split('/').at(-1)}</option>)}</select></label>
      <label>Planning baseline<input aria-label="Planning baseline" type="date" value={plan.startDate} disabled={busy} onChange={e=>editPlan({startDate:e.target.value})}/></label>
      {tree&&<button className="text-link" onClick={()=>openEntry(`definition:${tree.uid}`)}>Tree rules<ChevronRight size={14}/></button>}
    </div>
    {(dirty||error||staleBase)&&<section className={`cp-review ${error||staleBase?'cp-warning':''}`} aria-label="Plan review" role={error?'alert':'status'}>
      <div><strong>{staleBase?'The saved campaign changed':dirty?'Unsaved plan preview':'Review needs attention'}</strong><p>{error||(staleBase?'Your draft is retained. Download it or return to the latest saved campaign before reviewing again.':'Review the recalculated queue. Applying changes the active alternative; actual completion history stays separate.')}</p>{dirty&&<small>Saved active: {baseline?.planner?.plans.find(p=>p.id===baseline.planner?.activePlanId)?.name} · Preview: {plan.name}</small>}</div>
      <div className="button-row"><button className="button" disabled={checking||busy} onClick={()=>{setError('');setRetry(v=>v+1);}}><RefreshCw size={14}/>{checking?'Checking…':'Refresh preview'}</button><button className="button primary" onClick={()=>void apply()} disabled={!dirty||!report||busy||staleBase||checking}>Apply reviewed plan</button><button className="button" onClick={cancel} disabled={busy}>Cancel preview</button><button className="text-link" onClick={()=>download(`${draft.name} - planner draft.json`,payload)}>Download draft</button>{(error||staleBase)&&<button className="text-link" disabled={busy} onClick={()=>void useLatest()}>Use latest saved campaign</button>}</div>
    </section>}
    {message&&<p className="cp-message" role="status">{message}</p>}
    {checking&&<p className="muted" role="status">Rechecking queue order and source conditions…</p>}
    {report?.applicability&&report.applicability.truth!=='yes'&&<details className="notice small"><summary>Tree applicability needs review</summary><Requirement result={report.applicability} openEntry={openEntry}/></details>}
    {!!tree?.data.referenceIssues?.length&&<details className="notice small"><summary>{tree.data.referenceIssues.length} missing or ambiguous tree references</summary>{tree.data.referenceIssues.map((issue:any,i:number)=><p key={i}><button className="text-link" onClick={()=>openEntry(issue.id)}>{issue.id}</button> — {issue.reason}</p>)}</details>}
    <StrategyWorkbench profile={profile} draft={payload||draft} plan={plan} focuses={focuses} indexRevision={contextRevision} busy={busy} openEntry={openEntry} addAlternative={(items,name)=>{const id=crypto.randomUUID();updatePlanner(p=>({...p,plans:[...p.plans,{...structuredClone(plan),id,name:name.slice(0,100),items,referenceIndexRevision:contextRevision}]}));setSelected(id);setMessage('New route is a draft. Review conditions, then Apply to save it.');}}/>
    <div className="cp-workbench">
      <section className="panel cp-library" aria-label="Focus browser"><div className="tree-toolbar"><div><strong>Explore the tree</strong><small>{focuses.length} installed definitions</small></div><div className="segmented"><button aria-label="List view" className={view.mode==='list'?'selected':''} onClick={()=>setView({...view,mode:'list'})}><List size={17}/></button><button aria-label="Map view" className={view.mode==='map'?'selected':''} onClick={()=>setView({...view,mode:'map'})}><MapIcon size={17}/></button></div></div>
        <div className="tree-controls"><div className="search-box"><Search size={15}/><input aria-label="Find focus" placeholder="Find a focus…" value={view.filter} onChange={e=>setView({...view,filter:e.target.value})}/></div>{view.mode==='map'&&<label className="cp-zoom">Zoom<input aria-label="Map zoom" type="range" min=".3" max="1.3" step=".1" value={view.zoom} onChange={e=>setView({...view,zoom:Number(e.target.value)})}/></label>}<button className="text-link" disabled={dirty||busy} title={dirty?'Apply or cancel the preview first':'Save this view for next time'} onClick={()=>void saveActual(p=>({...p,planner:{...p.planner!,view}}),'View remembered for this campaign.')}>Remember view</button></div>
        {!plan.tree?<div className="empty compact"><GitBranch size={28}/><h3>Choose a focus tree</h3><p>Changing trees keeps existing references for review.</p></div>:view.mode==='list'?<div className="cp-focus-list" ref={graph} onScroll={e=>rememberScroll(e.currentTarget)}>{filtered.map(f=><div className="cp-focus" key={f.uid}><button className="cp-focus-title" onClick={()=>openEntry(`definition:${f.uid}`)}><span><strong>{f.title}</strong><small>{f.id} · {f.data.days??'?'} nominal days</small></span></button><button className="icon-button" aria-label={`Bookmark ${f.title}`} disabled={dirty||busy} aria-pressed={isEntryBookmarked(f)} onClick={()=>void toggleBookmark(f)}><Bookmark size={15}/></button><button className="icon-button" aria-label={`Add ${f.title} to queue`} disabled={!!hasFocus(f)||isEntryDone(f)||busy} onClick={()=>add(f)}>{isEntryDone(f)?<Check size={17}/>:<Plus size={17}/>}</button></div>)}{!filtered.length&&<p className="empty compact">{tree?'No matching focus definitions.':'The saved tree could not be resolved. Its references are preserved.'}</p>}</div>:<div className="focus-viewport" ref={graph} onScroll={e=>rememberScroll(e.currentTarget)}><div style={{width:((maxX-minX)*105+230)*view.zoom,height:(maxY*100+150)*view.zoom}}><div className="focus-canvas" style={{width:(maxX-minX)*105+230,height:maxY*100+150,transform:`scale(${view.zoom})`}}><svg className="focus-lines" width={(maxX-minX)*105+230} height={maxY*100+150} aria-hidden="true">{focuses.flatMap(f=>(f.data.prerequisites||[]).flatMap((group:string[])=>group.map(id=>{const found=focuses.filter(e=>e.id===id);if(found.length!==1)return null;const a=pos(found[0]),b=pos(f);return <path key={`${f.uid}-${id}`} d={`M ${a.x+83} ${a.y+65} L ${b.x+83} ${b.y}`} className={group.length>1?'optional-line':''}/>;})))}</svg>{focuses.map(f=>{const p=pos(f);return <button key={f.uid} className={`focus-node ${isEntryDone(f)?'done':hasFocus(f)?'queued':''} ${filtered.some(e=>e.uid===f.uid)?'':'dim'}`} style={{left:p.x,top:p.y}} onClick={()=>openEntry(`definition:${f.uid}`)}><GitBranch size={14}/><strong>{f.title}</strong><small>{f.data.days??'?'} nominal days</small></button>;})}</div></div></div>}
      </section>
      <section className="panel cp-queue" aria-label="Planned queue"><div className="section-label">{dirty?'PREVIEW QUEUE':'ACTIVE QUEUE'}<span className="tag">{plan.items.length}</span></div><h2>{next?`Next: ${next.title}`:'Your focus sequence'}</h2>{next&&<p><span className={`cp-truth ${next.reachability}`}>{truthLabel(next.reachability)}</span></p>}
        <div className="cp-timing"><Clock size={16}/><div><strong>{report?report.totalDays===null?`${report.knownDays} known nominal days · total unknown`:`${report.totalDays} nominal days`:'Timing awaits preview'}</strong><small>Baseline {plan.startDate} · {report?.finishDate?`nominal end ${report.finishDate}`:'end date unresolved'}</small></div></div>
        <p className="cp-limit">Assumes sequential completion. No live conditions, rewards, bypasses or stored progress are simulated. Nominal dates are planning estimates.</p>
        {!plan.items.length&&<div className="empty compact"><Plus size={24}/><p>Add a focus from the list. Open its reference to inspect the source first.</p></div>}
        <ol className="cp-steps">{plan.items.map((ref,position)=>{const focus=resolveLocal(ref);const step=report?.steps[position];const done=!!step?.issues.some(issue=>issue.type==='completed')||!!focus&&isEntryDone(focus);return <li key={`${position}-${ref.reference}`} className={step?.reachability==='no'?'cp-blocked':''}>
          <div className="cp-step-title"><span>{position+1}</span><button onClick={()=>openEntry(ref.reference)}>{step?.title||focus?.title||ref.legacyId||ref.reference}</button><button className="icon-button" aria-label={`Remove queue item ${position+1}`} disabled={busy} onClick={()=>editPlan({items:plan.items.filter((_,i)=>i!==position)})}><X size={14}/></button></div>
          <div className="cp-step-actions"><span className={`cp-truth ${done?'yes':step?.reachability||'unknown'}`}>{done?'Manually completed':step?truthLabel(step.reachability):'Awaiting preview'}</span><button className="icon-button" aria-label={`Move queue item ${position+1} up`} disabled={position===0||busy} onClick={()=>move(position,-1)}><ArrowUp size={14}/></button><button className="icon-button" aria-label={`Move queue item ${position+1} down`} disabled={position===plan.items.length-1||busy} onClick={()=>move(position,1)}><ArrowDown size={14}/></button>{!done&&<button className="text-link" disabled={dirty||busy||!step?.id||step.resolution!=='resolved'} title={dirty?'Apply or cancel the preview before recording actual completion':'Record a manual campaign completion'} onClick={()=>void saveActual(p=>({...p,completed:unique([...p.completed,step!.resolvedReference||step!.id!])}),'Manual completion recorded; all alternatives will be rechecked.')}><Check size={13}/>Done</button>}</div>
          {step&&<><small className="cp-step-time">{step.days===null?'Duration unknown':`${step.days} nominal days`} · {step.cumulativeDays===null?`${step.cumulativeKnownDays} known cumulative days`:`${step.cumulativeDays} cumulative days`}{step.finishDate?` · ${step.finishDate}`:''}</small>{step.eligibility!==step.reachability&&<p className="cp-causal">Own eligibility: {truthLabel(step.eligibility).toLowerCase()}; sequence depends on earlier steps.</p>}{step.issues.map((issue,i)=><p className="plan-issue" key={i}><AlertTriangle size={12}/>{issue.message}</p>)}{step.resolution==='ambiguous'&&<AmbiguityPicker reference={ref.reference} position={position} candidateUids={(tree?.data.referenceIssues||[]).find((issue:any)=>issue.id===(ref.legacyId||ref.reference))?.candidates||[]} disabled={busy} openEntry={openEntry} choose={entry=>chooseDefinition(position,entry)}/>} {!!step.requirements.length&&<details><summary>Conditions & evidence</summary>{step.requirements.map((requirement,i)=><Requirement key={i} result={requirement} openEntry={openEntry}/>)}{step.assumptions.map((a,i)=><p className="cp-assumption" key={i}>{a}</p>)}{step.sources.map((source,i)=><p className="cp-source" key={i}>{source.source}:{source.line??'?'} · {source.gameVersion}<code>SHA-256 {source.hash}</code></p>)}</details>}</>}
        </li>;})}</ol>
        <details className="cp-completed"><summary>Actual manual completions ({profile.completed.length})</summary>{profile.completed.map(id=><div className="completed-item" key={id}><Check size={13}/><button className="text-link" onClick={()=>openEntry(id)}>{resolveLocal({reference:id})?.title||id}</button><button className="icon-button" aria-label={`Unmark ${id} completed`} disabled={dirty||busy} onClick={()=>void saveActual(p=>({...p,completed:p.completed.filter(x=>x!==id)}),'Manual completion removed.')}><X size={13}/></button></div>)}<p className="cp-limit">Only explicit Done and Unmark actions change this history. Queue previews and checklist ticks do not.</p></details>
      </section>
    </div>
    <section className="panel cp-checklists" aria-label="Sourced checklists"><div className="cp-checklist-header"><div><div className="section-label">SAVED CHECKLISTS</div><h2>Keep the checks with their sources</h2></div><input aria-label="Checklist name" placeholder={`${plan.name} checks`} maxLength={100} value={newChecklistName} onChange={e=>setNewChecklistName(e.target.value)}/><button className="button" disabled={dirty||busy||!report||planner.checklists.length>=50||!plan.items.length} onClick={capture}>Capture checklist</button></div>
      {!planner.checklists.length&&<p className="muted">Capture the saved plan’s conditions and source context. Checking a task does not complete its focus.</p>}
      {planner.checklists.map(checklist=>{const corrections=capturedGuideCorrections(checklist);return <details key={checklist.id} className="cp-checklist"><summary>{checklist.name} · {checklist.items.filter(i=>i.checked).length}/{checklist.items.length}{checklist.indexRevision!==contextRevision?' · source context changed':''}{corrections.length?' · guide correction':''}</summary><p className="cp-limit">Captured {new Date(checklist.createdAt).toLocaleString()} · game {checklist.gameVersion} · app {checklist.appVersion} · index {checklist.indexRevision}</p>{checklist.indexRevision!==contextRevision&&<p className="plan-issue"><AlertTriangle size={13}/>This captured answer is stale. Its original wording and evidence are retained; review targets against the current index.</p>}{corrections.map((correction,i)=><p className="plan-issue" role="note" key={i}><AlertTriangle size={13}/>{correction}</p>)}{checklist.items.map(item=><div key={item.id} className="cp-check"><label><input type="checkbox" checked={item.checked} disabled={dirty||busy} onChange={e=>tickChecklist(checklist.id,item.id,e.currentTarget.checked)}/><span>{item.text}</span></label>{item.target&&<button className="text-link" onClick={()=>openEntry(item.target!.reference)}>Review reference<ChevronRight size={13}/></button>}<details><summary>Captured conditions & sources</summary>{item.requirements.map((requirement,i)=><Requirement key={i} result={requirement} openEntry={openEntry}/>)}{item.sources.map((source,i)=><p className="cp-source" key={i}>{source.source}:{source.line??'?'}<code>{source.hash}</code></p>)}</details></div>)}{checklist.assumptions.map((assumption,i)=><p className="cp-assumption" key={i}>{assumption}</p>)}<button className="text-link danger" disabled={dirty||busy} onClick={()=>void saveActual(p=>({...p,planner:{...p.planner!,checklists:p.planner!.checklists.filter(c=>c.id!==checklist.id)}}),'Checklist removed.')}>Remove checklist</button></details>;})}
    </section>
  </div>;
}

function AmbiguityPicker({reference,position,candidateUids,disabled,openEntry,choose}:{reference:string;position:number;candidateUids:string[];disabled:boolean;openEntry:(ref:string)=>void;choose:(entry:Entry)=>void}){
  const [entries,setEntries]=useState<Entry[]>([]);const [error,setError]=useState('');const key=JSON.stringify(candidateUids);
  useEffect(()=>{let live=true;setEntries([]);setError('');const load=async()=>{const uids=candidateUids.length?candidateUids:(await api<Resolution>(`resolve?ref=${encodeURIComponent(reference)}`)).candidates.filter(e=>['focus','shared_focus','joint_focus'].includes(e.kind)).map(e=>e.uid);const values=await Promise.all(uids.map(uid=>api<Entry>(`entry?uid=${encodeURIComponent('definition:'+uid)}`)));if(live)setEntries(values);};load().catch(e=>{if(live)setError(describeError(e));});return()=>{live=false;};},[reference,key]);
  return <section className="cp-definition-picker" aria-label={`Choose definition for queue item ${position+1}`}><strong>Choose the intended definition</strong><p>This updates only the preview. Inspect its source before Apply.</p>{error&&<p className="danger">{error}</p>}{!entries.length&&!error&&<p className="muted">Loading exact candidate definitions…</p>}{entries.map(entry=><div key={entry.uid}><strong>{entry.title}</strong><small>{entry.source}:{entry.line} · {entry.version}</small><code>{entry.uid}</code><div className="button-row"><button className="text-link" onClick={()=>openEntry(`definition:${entry.uid}`)}>Inspect source<ChevronRight size={12}/></button><button className="button" disabled={disabled} aria-label={`Use definition ${entry.uid} for queue item ${position+1}`} onClick={()=>choose(entry)}>Use this definition</button></div></div>)}</section>;
}

function Requirement({result}:{result:RequirementResult;openEntry:(ref:string)=>void}){return <RequirementView result={result}/>;}
