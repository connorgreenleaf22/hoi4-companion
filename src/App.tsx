import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Search, Flag, Compass, LayoutDashboard, Settings, Shield, Factory, ChevronDown, X, Plus, Check, Bookmark, GitBranch, Clock, ExternalLink, RefreshCw, Smartphone, Download, Trash2, Eye, EyeOff, List, Map as MapIcon, ZoomIn, ZoomOut, ArrowUp, ArrowDown, CircleHelp, CheckCircle2, AlertTriangle, Crosshair, ChevronRight, Globe } from 'lucide-react';
import type { Entry, Profile, Meta, Guide, Resolution, DLCState } from './types';
import { api, download } from './api';
import { sourceNumber } from './format';
import {UniversalSearch} from './UniversalSearch';
import {MechanicsView} from './MechanicsView';
import './usability.css';
import { DivisionLab } from './Lab';
import { CampaignIntelligence } from './CampaignIntelligence';
import {PlannerObservation} from './BaselineTransfer';
import { Discovery } from './Discovery';
import type {GuideView} from './discovery-types';
import { CampaignPlanner } from './planner/CampaignPlanner';
import {subscribePlannerDrafts,getOutstandingPlannerDrafts,getPlannerDraft,discardPlannerDraft,downloadablePlannerDraft,getPendingPlannerWrites} from './planner/drafts';
import { ReferenceLibrary, ReferenceIssue, RelationshipExplorer, DlcSetup, CoveragePanel, referenceLabels, sourceStatus } from './ReferenceTools';

type Page='overview'|'planner'|'encyclopedia'|'discover'|'lab'|'manual'|'settings';
type Recovery={key:number;draft:Profile;message:string;conflict:boolean};
type NoteDraft={key:string;text:string};
type DrawerHistory={entry:Entry;scroll:number;noteDraft?:NoteDraft};
type Status={selectedProfileId:string;meta:Meta|null;profiles:Profile[];local:boolean;root:string;dataDirectory:string;indexingError:string;network:any;roadmap:string[]};
const nav=[{id:'overview',label:'Command center',icon:LayoutDashboard},{id:'planner',label:'Campaign planner',icon:GitBranch},{id:'encyclopedia',label:'Encyclopedia',icon:BookOpen},{id:'discover',label:'Campaign ideas',icon:Compass},{id:'lab',label:'Division & production',icon:Shield},{id:'manual',label:'Field manual',icon:CircleHelp},{id:'settings',label:'Sources & settings',icon:Settings}] as const;
export const number=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
const labels=referenceLabels;
const blank=():Profile=>({id:crypto.randomUUID(),name:'My German campaign',country:'GER',startDate:'1936-01-01',historical:true,goals:'',tree:'',dlcs:[],dlcConfirmed:false,dlcStates:{},legacyDlcAssertions:[],exportSchemaVersion:3,queue:[],completed:[],bookmarks:[],notes:{},templates:[]});

export default function App(){
  const [status,setStatus]=useState<Status>();const [profiles,setProfiles]=useState<Profile[]>([]);
  const [selected,setSelected]=useState('');
  const [historyView,setHistoryView]=useState({recordingId:'',snapshotId:''});
  const [recoveries,setRecoveries]=useState<Recovery[]>([]);const [pendingSaves,setPendingSaves]=useState(0);
  const plannerDrafts=useSyncExternalStore(subscribePlannerDrafts,getOutstandingPlannerDrafts);
  const [draftReview,setDraftReview]=useState(false);
  const saveTail=useRef<Promise<unknown>>(Promise.resolve());const selectionTail=useRef<Promise<unknown>>(Promise.resolve());const recoveryKey=useRef(0);
  const [page,setPage]=useState<Page>('overview');const [countries,setCountries]=useState<Entry[]>([]);
  const [guideData,setGuideData]=useState<{guides:GuideView[];troubleshooting:any[]}>({guides:[],troubleshooting:[]});
  const [profileEditor,setProfileEditor]=useState<Profile>();const [detail,setDetail]=useState<Entry>();
  const [referenceIssue,setReferenceIssue]=useState<Resolution>();const [detailHistory,setDetailHistory]=useState<DrawerHistory[]>([]);const [drawerScroll,setDrawerScroll]=useState(0);
  const [drawerNoteDraft,setDrawerNoteDraft]=useState<NoteDraft>();
  const referenceRequest=useRef(0);const originScroll=useRef(0);
  const [error,setError]=useState('');const [pairing,setPairing]=useState(false);const [query,setQuery]=useState('');
  const [toast,setToast]=useState('');const [focusJump,setFocusJump]=useState('');
  const active=profiles.find(p=>p.id===selected)||profiles[0];
  const notify=(message:string)=>{setToast(message);setTimeout(()=>setToast(''),4500);};
  const fail=useCallback((e:unknown)=>setError(e instanceof Error?e.message:String(e)),[]);
  const load=useCallback(async()=>{
    try{
      const data=await api<Status>('status');setStatus(data);setProfiles(data.profiles);setSelected(previous=>data.local?data.selectedProfileId:(data.profiles.some(p=>p.id===previous)?previous:data.profiles[0]?.id||''));setPairing(false);setError('');
      const [c,g]=await Promise.all([api<Entry[]>('countries'),api<typeof guideData>('guides')]);setCountries(c);setGuideData(g);
    }catch(e){if((e as any).status===401)setPairing(true);else fail(e);}
  },[fail]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    let live=true;const refreshMetadata=()=>{void api<Status>('status').then(data=>{if(live)setStatus(data);}).catch(()=>{});};
    window.addEventListener('hoi4:index-revision',refreshMetadata);window.addEventListener('focus',refreshMetadata);
    const timer=setInterval(refreshMetadata,30000);return()=>{live=false;clearInterval(timer);window.removeEventListener('hoi4:index-revision',refreshMetadata);window.removeEventListener('focus',refreshMetadata);};
  },[]);
  useEffect(()=>{
    const preventWheelEdit=(event:WheelEvent)=>{if(event.target instanceof HTMLInputElement&&event.target.type==='number'&&document.activeElement===event.target)event.preventDefault();};
    document.addEventListener('wheel',preventWheelEdit,{passive:false});return()=>document.removeEventListener('wheel',preventWheelEdit);
  },[]);
  useEffect(()=>{
    const state={pendingWrites:pendingSaves+getPendingPlannerWrites(),unsavedDrafts:plannerDrafts.length+recoveries.length};
    (window as Window&{__hoi4CloseState?:typeof state}).__hoi4CloseState=state;
    const warn=(event:BeforeUnloadEvent)=>{if(pendingSaves||getPendingPlannerWrites()||recoveries.length||getOutstandingPlannerDrafts().length){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[pendingSaves,recoveries.length,plannerDrafts]);
  useEffect(()=>{const review=()=>setDraftReview(true);window.addEventListener('hoi4:review-drafts',review);return()=>window.removeEventListener('hoi4:review-drafts',review);},[]);
  const selectProfile=async(id:string)=>{
    setSelected(id);
    if(!status?.local)return;
    const task=selectionTail.current.catch(()=>{}).then(()=>api<{selectedProfileId:string}>('selection',{id}));
    selectionTail.current=task;
    try{await task;}catch(e){fail(new Error('Campaign is open, but its selection could not be remembered. '+(e as Error).message));}
  };
  useEffect(()=>{
    if(!detail&&!profileEditor&&!referenceIssue&&!draftReview)return;
    const previous=document.activeElement as HTMLElement|null;const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const panel=document.querySelector<HTMLElement>(draftReview?'.draft-review-modal':'.entry-drawer,.profile-modal');
    panel?.querySelector<HTMLElement>('button,input,select,textarea')?.focus();
    const handler=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){if(draftReview){e.preventDefault();e.stopPropagation();setDraftReview(false);}else{closeReference();setProfileEditor(undefined);}return;}
      if(e.key!=='Tab'||!panel)return;
      const elements=[...panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],summary')].filter(el=>el.getClientRects().length>0);
      const first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };document.addEventListener('keydown',handler);
    return()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',handler);previous?.focus();};
  },[detail?.uid,profileEditor?.id,referenceIssue?.reference,draftReview]);
  const preserveDraft=(draft:Profile,e:unknown)=>{
    const conflict=(e as any).status===409;
    setRecoveries(previous=>{const match=previous.find(r=>JSON.stringify(r.draft)===JSON.stringify(draft));const recovery={key:match?.key??++recoveryKey.current,draft:structuredClone(draft),message:(e as Error).message,conflict};return match?previous.map(r=>r.key===match.key?recovery:r):[...previous,recovery];});
    if(conflict){const current=(e as any).current as Profile|null|undefined;if(current!==undefined)setProfiles(previous=>current?previous.map(p=>p.id===current.id?current:p):previous.filter(p=>p.id!==draft.id));}
    setProfileEditor(undefined);setDetail(undefined);setReferenceIssue(undefined);setDetailHistory([]);
  };
  const save=async(p:Profile):Promise<Profile>=>{
    const draft=structuredClone({...p,exportSchemaVersion:3});setPendingSaves(n=>n+1);
    const task=saveTail.current.catch(()=>{}).then(async()=>{
      try{
        const saved=await api<Profile>('profile',draft);
        setProfiles(previous=>previous.some(p=>p.id===saved.id)?previous.map(p=>p.id===saved.id?saved:p):[...previous,saved]);
        await selectProfile(saved.id);return saved;
      }catch(e){preserveDraft(draft,e);throw e;}
      finally{setPendingSaves(n=>n-1);}
    });
    saveTail.current=task;return task;
  };
  const discardDraft=async(key:number)=>{
    try{const data=await api<Status>('status');setProfiles(data.profiles);setStatus(data);if(data.local)setSelected(data.selectedProfileId);setRecoveries(previous=>previous.filter(r=>r.key!==key));}catch(e){fail(e);}
  };
  const discardPlanner=async(id:string)=>{
    const reviewed=getPlannerDraft(id);if(!reviewed)return;
    try{const data=await api<Status>('status');if(JSON.stringify(getPlannerDraft(id))!==JSON.stringify(reviewed)){notify('The draft changed while loading saved data. Review it before discarding.');return;}discardPlannerDraft(id,data.profiles.find(p=>p.id===id));setProfiles(data.profiles);setStatus(data);if(!data.profiles.some(p=>p.id===selected))setSelected(data.selectedProfileId);}catch(e){fail(e);}
  };
  const closeReference=()=>{referenceRequest.current++;setDetail(undefined);setReferenceIssue(undefined);setDetailHistory([]);requestAnimationFrame(()=>window.scrollTo({top:originScroll.current}));};
  const backReference=()=>{const previous=detailHistory.at(-1);if(!previous)return;referenceRequest.current++;setDetail(previous.entry);setReferenceIssue(undefined);setDrawerScroll(previous.scroll);setDrawerNoteDraft(previous.noteDraft);setDetailHistory(history=>history.slice(0,-1));};
  const openEntry=async(reference:string)=>{
    const request=++referenceRequest.current;const noteInput=document.querySelector<HTMLTextAreaElement>('.entry-drawer textarea[aria-label="Reference notes"]');const previous=detail?{entry:detail,scroll:document.querySelector('.entry-drawer')?.scrollTop||0,noteDraft:noteInput?{key:noteInput.dataset.noteKey||detail.entityKey||detail.uid,text:noteInput.value}:undefined}:undefined;
    if(!detail&&!referenceIssue)originScroll.current=window.scrollY;
    try{
      const resolution=await api<Resolution>(`resolve?ref=${encodeURIComponent(reference)}`);if(request!==referenceRequest.current)return;
      const resolved=resolution.entry||(resolution.status==='resolved'?resolution.candidates[0]:undefined);
      const full=resolved?await api<Entry>(`entry?uid=${encodeURIComponent('definition:'+resolved.uid)}`):undefined;if(request!==referenceRequest.current)return;
      if(previous)setDetailHistory(history=>[...history,previous]);
      setDrawerScroll(0);setDrawerNoteDraft(undefined);setDetail(full?{...full,data:{...full.data,indexRevision:resolution.indexRevision}}:undefined);setReferenceIssue(full?undefined:resolution);
    }catch(e){if(request===referenceRequest.current)fail(e);}
  };
  const search=(text:string)=>{setQuery(text);setPage('encyclopedia');};
  const openCountry=async(tag:string)=>{
    if(active&&active.country!==tag){
      const country=countries.find(c=>c.id===tag);setProfileEditor({...blank(),country:tag,name:`${country?.title||tag} campaign`});return;
    }
    try{if(active)await save({...active,country:tag,tree:active.country===tag?active.tree:'',name:active.country===tag?active.name:`${countries.find(c=>c.id===tag)?.title||tag} campaign`});
    else {const p=blank();await save({...p,country:tag,name:`${countries.find(c=>c.id===tag)?.title||tag} campaign`});}}catch{return;}
    setPage('planner');
  };
  if(pairing)return <PairScreen onPaired={load}/>;
  return <div className="shell">
    <aside className="sidebar" inert={!!(detail||profileEditor||referenceIssue||draftReview)}>
      <a className="brand" href="#" onClick={e=>{e.preventDefault();setPage('overview');}}><div className="brand-mark"><Crosshair size={27}/></div><span>HOI4<span className="brand-sub">COMPANION</span></span></a>
      <div className="rail-label">WORKSPACE</div>
      <nav>{nav.map(n=><button key={n.id} className={`nav-item ${page===n.id?'active':''}`} aria-current={page===n.id?'page':undefined} onClick={()=>setPage(n.id)}><n.icon size={18}/><span>{n.label}<small className="nav-description" aria-hidden="true">{({overview:'Campaign overview & recordings',planner:'Focus routes & saved alternatives',encyclopedia:'Countries, focuses & mechanics',discover:'Starting ideas for campaigns',lab:'Unit & production calculations',manual:'Combat & supply help',settings:'Installation, data & access'})[n.id]}</small></span>{n.id==='discover'&&<span className="new-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="local-badge"><span className="status-dot"/> LOCAL & OFFLINE READY</div><p>Installed game data and saved plans.</p><span className="version">GAME {status?.meta?.version||'NOT INDEXED'} · v0.4.0</span></div>
    </aside>
    <div className="workspace" inert={!!(detail||profileEditor||referenceIssue||draftReview)}>
      <header className="topbar"><div className="breadcrumb">STRATEGY DESK <ChevronRight size={13}/><span>{nav.find(n=>n.id===page)?.label}</span></div>
        <UniversalSearch query={query} onQuery={setQuery} country={active?.country} indexRevision={status?.meta?.indexRevision} onOpen={openEntry} onAll={()=>setPage('encyclopedia')}/>

        <button className="profile-trigger" onClick={()=>setProfileEditor(active?structuredClone(active):blank())}><Flag size={16}/><span>{active?`${countries.find(c=>c.id===active.country)?.title||active.country} · ${active.name}`:'Choose a country / campaign'}</span><ChevronDown size={14}/></button>
      </header>
      {error&&<div className="error-banner" role="alert"><AlertTriangle size={18}/>{error}{!status&&<button className="button" onClick={()=>void load()}>Retry loading</button>}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={18}/></button></div>}
      {!!plannerDrafts.length&&<section role="region" aria-label="Planner drafts kept in this window" style={{display:'flex',alignItems:'center',gap:14,padding:'10px 30px',fontSize:12}}><span>{plannerDrafts.length} unsaved planner {plannerDrafts.length===1?'draft':'drafts'}</span><button className="text-link" onClick={()=>setDraftReview(true)}>Review unsaved drafts</button></section>}
      {!!recoveries.length&&<section className="conflict-banner" role="region" aria-label="Unsaved campaign drafts">
        {recoveries.map(r=><div key={r.key}><h2>{r.conflict?'Campaign changed in another window':'Campaign save did not finish'}</h2><p><strong>{r.draft.name}</strong>: {r.message}</p><p>Your draft is kept here. Save it as a separate campaign or download it before discarding.</p><div className="button-row">
          <button className="button" onClick={()=>download(r.draft.name+' — unsaved draft.json',r.draft)}><Download size={15}/>Download draft</button>
          <button className="button primary" disabled={pendingSaves>0} onClick={async()=>{try{await save({...r.draft,id:crypto.randomUUID(),revision:0,name:(r.draft.name+' — recovered').slice(0,150)});setRecoveries(previous=>previous.filter(v=>v.key!==r.key));notify('Draft saved as a separate campaign.');}catch{}}}>Save draft as new campaign</button>
          {!r.conflict&&<button className="button" disabled={pendingSaves>0} onClick={async()=>{try{await save(r.draft);setRecoveries(previous=>previous.filter(v=>v.key!==r.key));notify('Campaign saved.');}catch{}}}>Retry save</button>}
          <button className="button" disabled={pendingSaves>0} onClick={()=>void discardDraft(r.key)}>Discard draft and use saved campaign</button>
        </div></div>)}
      </section>}
      {pendingSaves>0&&<div className="save-status" role="status">Saving campaign…</div>}
      {!status?<div className="loading" role="status">Loading game data and campaigns…</div>:<main>
        {page==='overview'&&<>
          <div className="page-heading"><div><div className="eyebrow"><span className="tiny-line"/> CAMPAIGN WORKSPACE</div><h1>Command center</h1><p>Plan a focus route, look up a game mechanic, or review recorded campaign history.</p></div><div className="edition"><Globe size={38}/><span>HEARTS OF IRON IV</span><strong>FIELD COMPANION</strong><span>PERSONAL EDITION / {status.meta?.version||'SETUP'}</span></div></div>
          <section className="workflow-start" aria-label="Start here"><h2>What would you like to do?</h2><div className="button-row"><button className="button primary" onClick={()=>active?setPage('planner'):setProfileEditor(blank())}>{active?'Plan a focus route':'Choose a country and start planning'}</button><button className="button" onClick={()=>setPage('encyclopedia')}>Look up game content</button></div><p>Planning changes only companion plans. The campaign panel below imports recordings; it does not connect to a running game automatically.</p></section>
          <CampaignIntelligence local={status.local} openEntry={openEntry} view={historyView} onView={setHistoryView} onApplied={saved=>{setProfiles(previous=>[...previous,saved]);void selectProfile(saved.id);setPage('planner');}}/>
          <div className="stats-grid">{[{label:'COUNTRIES INDEXED',value:status.meta?.counts.country||0,icon:Flag},{label:'NATIONAL FOCUSES',value:(status.meta?.counts.focus||0)+(status.meta?.counts.shared_focus||0)+(status.meta?.counts.joint_focus||0),icon:GitBranch},{label:'REFERENCE ENTRIES',value:Object.values(status.meta?.counts||{}).reduce((a,b)=>a+b,0),icon:BookOpen},{label:'CAMPAIGN PLANS',value:profiles.length,icon:Compass}].map(s=><div className="stat" key={s.label}><s.icon size={20}/><strong>{number(s.value)}</strong><span>{s.label}</span></div>)}</div>
          {!status.meta&&<div className="notice">Connect your HOI4 installation to populate the encyclopedia. <button className="text-link" onClick={()=>setPage('settings')}>Open setup <ArrowRight size={14}/></button></div>}
          <div className="dashboard-columns"><section className="panel campaign-panel"><div className="section-label">ON YOUR DESK <span className="tag">MANUAL TRACKING</span></div><h2>{active?.name||'Create your first campaign'}</h2><p>{active?.goals||'Choose a country and build a focus queue.'}</p>{active?<><div className="campaign-facts"><span><Flag size={15}/>{countries.find(c=>c.id===active.country)?.title||active.country}</span><span><Clock size={15}/>{active.startDate}</span><span>{active.historical?'Historical AI':'Alternate AI'}</span></div><div className="progress-label"><span>{active.completed.length} focuses completed</span><span>{active.queue.length} planned</span></div><div className="progress-track"><div style={{width:`${active.completed.length?active.completed.length/Math.max(1,active.completed.length+active.queue.length)*100:0}%`}}/></div></>:null}<div className="button-row"><button className="button primary" onClick={()=>active?setPage('planner'):setProfileEditor(blank())}>{active?'Continue planning':'Create a campaign'}<ArrowRight size={16}/></button><button className="button" onClick={()=>setProfileEditor(blank())}><Plus size={16}/>New campaign</button></div></section>
            <section className="panel desk-tools"><div className="section-label">TOOLS</div>{[{title:'Explore a national focus tree',text:'Follow prerequisites. Compare the possibilities.',page:'planner',icon:GitBranch},{title:'Understand the numbers',text:'Compare units, equipment, and production.',page:'lab',icon:Factory},{title:'Find out what went wrong',text:'Work through combat and supply problems.',page:'manual',icon:Shield}].map(t=><button key={t.title} onClick={()=>setPage(t.page as Page)}><div className="tool-icon"><t.icon size={21}/></div><span><strong>{t.title}</strong><small>{t.text}</small></span><ArrowUpRight size={18}/></button>)}</section></div>
          <div className="section-heading"><div><div className="eyebrow">DISCOVER</div><h2>Campaign ideas</h2></div><button className="text-link" onClick={()=>setPage('discover')}>All campaign ideas <ArrowRight size={16}/></button></div>
          <div className="idea-grid">{guideData.guides.slice(0,3).map((g,i)=><button className={`idea-card landscape-${i}`} key={g.id} onClick={()=>setPage('discover')}><div className="card-grid-pattern"/><span className="tag">{g.type}</span><div><small>{g.countries.join(' / ')} · {g.difficulty.label.toUpperCase()}</small><h3>{g.spoiler?'An unexpected restoration':g.title}</h3><p>{g.spoiler?'Reveal unusual paths in the campaign catalog.':g.summary}</p></div><ArrowUpRight size={21}/></button>)}</div>
          <div className="source-strip"><span className="status-dot"/><strong>Grounded in your installation</strong><span>{status.meta?`${status.meta.files} source files · Indexed ${new Date(status.meta.indexedAt).toLocaleDateString()}`:'Waiting for game files'}</span><button className="text-link" onClick={()=>setPage('settings')}>View sources <ArrowRight size={14}/></button></div>
        </>}
        {page==='planner'&&active&&<PlannerObservation profileId={active.id} openEntry={openEntry} onHistory={(recordingId,snapshotId)=>{setHistoryView({recordingId,snapshotId});setPage('overview');}}/>}
        {page==='planner'&&<CampaignPlanner onApplied={saved=>{setProfiles(previous=>previous.map(p=>p.id===saved.id?saved:p));}} profile={active} save={save} countries={countries} onCountry={openCountry} openEntry={openEntry} fail={fail} jump={focusJump} onNew={()=>setProfileEditor(blank())} indexRevision={status.meta?.indexRevision}/>}
        {page==='encyclopedia'&&<ReferenceLibrary query={query} setQuery={setQuery} openEntry={openEntry} active={active} fail={fail} countries={countries} kinds={Object.keys(status.meta?.counts||{})}/>}
        {page==='discover'&&<Discovery profile={active} countries={countries} indexRevision={status.meta?.indexRevision} onCountry={openCountry} openEntry={openEntry} save={save} onApplied={saved=>setProfiles(previous=>previous.map(p=>p.id===saved.id?saved:p))} fail={fail}/>}
        {page==='lab'&&<DivisionLab profile={active} save={save} fail={fail} notify={notify} openEntry={openEntry} baseFactory={status.meta?.defines.BASE_FACTORY_SPEED_MIL} indexRevision={status.meta?.indexRevision}/>}
        {page==='manual'&&<><PageTitle eyebrow="UNDERSTAND THE BATTLEFIELD" title="The field manual" text="Combat, supply, air, and naval troubleshooting."/><div className="manual-grid">{guideData.troubleshooting.map(t=><section className="panel" key={t.id}><Shield className="gold" size={25}/><h2>{t.title}</h2><p>{t.intro}</p><ol className="checklist">{t.checks.map((c:string)=><li key={c}>{c}</li>)}</ol><div className="chip-row">{t.find.map((f:string)=><button className="chip" key={f} onClick={()=>search(f)}><Search size={12}/>{f}</button>)}</div><small className="muted">Editorial troubleshooting checklist. Verify modifiers in the in-game tooltips.</small></section>)}</div></>}
        {page==='settings'&&<SettingsPage status={status} load={load} fail={fail} notify={notify} active={active} onEdit={()=>setProfileEditor(active?structuredClone(active):blank())}/>}
      </main>}
      <footer><span>HOI4 COMPANION</span><span>Installed data · Campaign planning</span></footer>
    </div>
    {profileEditor&&<ProfileEditor value={profileEditor} countries={countries} profiles={profiles} dlcs={status?.meta?.dlcs||[]} onClose={()=>setProfileEditor(undefined)} onSave={async p=>{await save(p);setProfileEditor(undefined);notify('Campaign saved.');}} onSelect={id=>{void selectProfile(id);setProfileEditor(undefined);}} onDelete={async id=>{try{await api(`profile?id=${encodeURIComponent(id)}&revision=${profileEditor?.revision??0}`,undefined,'DELETE');setProfileEditor(undefined);await load();}catch(e){if((e as any).status===409&&profileEditor)preserveDraft(profileEditor,e);else fail(e);}}}/>}
    {detail&&<EntryDrawer entry={detail} profile={active} save={save} onClose={closeReference} onBack={detailHistory.length?backReference:undefined} initialScroll={drawerScroll} initialNoteDraft={drawerNoteDraft} currentIndexRevision={status?.meta?.indexRevision} onSearch={text=>{closeReference();search(text);}} onFocus={async id=>{setFocusJump(id);setPage('planner');closeReference();}} onOpen={openEntry} notify={notify}/>}
    {referenceIssue&&<ReferenceIssue resolution={referenceIssue} onClose={closeReference} onBack={detailHistory.length?backReference:undefined} onOpen={openEntry}/>}
    {draftReview&&<div className="modal-backdrop" style={{zIndex:150}}><section className="modal draft-review-modal" role="dialog" aria-modal="true" aria-label="Unsaved campaign drafts">
      <h2>Unsaved campaign drafts</h2><p>These drafts are kept in this window. Download them or explicitly discard them before closing. Saved campaigns are not changed by these actions.</p>
      {plannerDrafts.map(value=><article className="conflict-panel" key={value.draft.id}><h3>{value.draft.name}</h3><p>{value.draft.planner?.plans.find(p=>p.id===value.selected)?.name||'Planner draft'} · based on campaign revision {value.baseRevision}</p><div className="button-row"><button className="button" onClick={()=>download(value.draft.name+' - unsaved planner draft.json',downloadablePlannerDraft(value))}>Download planner draft</button><button className="button" disabled={pendingSaves>0||getPendingPlannerWrites()>0} onClick={()=>void discardPlanner(value.draft.id)}>Discard planner draft</button></div></article>)}
      {recoveries.map(value=><article className="conflict-panel" key={value.key}><h3>{value.draft.name}</h3><p>{value.message}</p><div className="button-row"><button className="button" onClick={()=>download(value.draft.name+' - unsaved campaign draft.json',value.draft)}>Download campaign draft</button><button className="button" disabled={pendingSaves>0||getPendingPlannerWrites()>0} onClick={()=>void discardDraft(value.key)}>Discard campaign draft</button></div></article>)}
      {!plannerDrafts.length&&!recoveries.length&&<p>No unsaved drafts remain.</p>}
      {(pendingSaves>0||getPendingPlannerWrites()>0)&&<p role="status">A campaign write is in progress. Wait for it to finish before discarding or closing.</p>}
      <div className="button-row"><button className="button primary" onClick={()=>setDraftReview(false)}>Stay in app</button></div>
    </section></div>}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}</div>}
  </div>;
}

export function PageTitle({eyebrow,title,text,action}:{eyebrow:string;title:string;text:string;action?:React.ReactNode}){return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}<span className="gold">.</span></h1><p>{text}</p></div>{action}</div>;}
function PairScreen({onPaired}:{onPaired:()=>void}){const [code,setCode]=useState('');const [error,setError]=useState('');return <div className="pair-screen"><div className="panel"><Crosshair size={40} className="gold"/><div className="eyebrow">HOI4 COMPANION</div><h1>Your strategy desk,<br/>on a second screen.</h1><p>Enter the six-digit code from Sources & settings in your desktop app.</p><form onSubmit={async e=>{e.preventDefault();try{await api('pair',{code});onPaired();}catch(e){setError((e as Error).message);}}}><label>Pairing code<input autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label><button className="button primary">Connect <ArrowRight size={17}/></button></form>{error&&<p role="alert" className="danger">{error}</p>}</div></div>;}

function ProfileEditor({value,countries,profiles,dlcs,onClose,onSave,onSelect,onDelete}:{value:Profile;countries:Entry[];profiles:Profile[];dlcs:Meta['dlcs'];onClose:()=>void;onSave:(p:Profile)=>Promise<void>;onSelect:(id:string)=>void;onDelete:(id:string)=>void}){
  const [p,setP]=useState(value);const [saving,setSaving]=useState(false);const [error,setError]=useState('');
  const update=(patch:Partial<Profile>)=>setP(p=>({...p,...patch}));
  return <div className="modal-backdrop" onClick={onClose}><section className="modal profile-modal" role="dialog" aria-modal="true" aria-label="Campaign setup" onClick={e=>e.stopPropagation()}><button className="close" onClick={onClose} aria-label="Close campaign setup"><X/></button><div className="eyebrow">MAKE IT YOUR CAMPAIGN</div><h2>Campaign setup</h2>
    {profiles.length>0&&<label>Open a saved campaign<select value="" onChange={e=>onSelect(e.target.value)}><option value="" disabled>Choose a campaign…</option>{profiles.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>}
    <form onSubmit={async e=>{e.preventDefault();setSaving(true);try{await onSave(p);}catch(e){setError((e as Error).message);}finally{setSaving(false);}}}>
      <label>Campaign name<input required maxLength={150} value={p.name} onChange={e=>update({name:e.target.value})}/></label><div className="form-grid"><label>Country<select value={p.country} disabled={profiles.some(v=>v.id===p.id)} title="Change country in a planner preview or create another campaign." onChange={e=>update({country:e.target.value})}>{countries.map(c=><option key={c.uid} value={c.id}>{c.title} ({c.id})</option>)}</select></label><label>Planning start date<input type="date" required disabled={!!p.planner} title={p.planner?'Change the baseline in a planner preview.':undefined} value={p.startDate} onChange={e=>update({startDate:e.target.value})}/></label></div>
      <label className="checkbox"><input type="checkbox" checked={p.historical} onChange={e=>update({historical:e.target.checked})}/>Historical AI focuses</label><label>Campaign goals<textarea rows={3} placeholder="What would make this campaign a success?" value={p.goals} onChange={e=>update({goals:e.target.value})}/></label>
      <DlcSetup profile={p} dlcs={dlcs} update={update}/>
      {error&&<p className="danger">{error}</p>}<div className="button-row"><button className="button primary" disabled={saving}>{saving?'Saving…':'Save campaign'}<Check size={16}/></button>{profiles.some(v=>v.id===p.id)&&<><button type="button" className="button" onClick={()=>download(`${p.name}.json`,{...p,exportSchemaVersion:3})}><Download size={16}/>Export</button><button type="button" className="icon-button danger" title="Delete campaign" onClick={()=>{if(confirm(`Delete “${p.name}” and its saved plans?`))onDelete(p.id);}}><Trash2 size={17}/></button></>}</div>
    </form></section></div>;
}

function CountryBrief({country,trees,onOpen}:{country?:Entry;trees:Entry[];guides:Guide[];onOpen:(uid:string)=>void}){if(!country)return null;return <section className="panel"><div className="eyebrow">COUNTRY BRIEF</div><h2>{country.title}</h2><p>{trees.length} tree variants. Inspect selection rules for country and DLC conditions.</p><div className="button-row"><button className="button" onClick={()=>onOpen(country.uid)}>Country reference</button>{trees.map(t=><button key={t.uid} className="button" onClick={()=>onOpen(t.uid)}>Inspect {t.id}</button>)}</div></section>;}

function EntryDrawer({entry:e,profile,save,onClose,onBack,initialScroll,initialNoteDraft,currentIndexRevision,onSearch,onFocus,onOpen,notify}:{entry:Entry;profile?:Profile;save:(p:Profile)=>Promise<Profile>;onClose:()=>void;onBack?:()=>void;initialScroll:number;initialNoteDraft?:NoteDraft;currentIndexRevision?:string;onSearch:(q:string)=>void;onFocus:(id:string)=>void;onOpen:(uid:string)=>void;notify:(s:string)=>void}){
  const ambiguousNoteKeys=(e.data.ambiguousAliases||[]).filter((key:string)=>profile?.notes[key]!==undefined);
  const referenceKeys=[...new Set([e.entityKey,e.uid,...(e.data.legacyAliases||[])].filter((key):key is string=>!!key&&!(e.data.ambiguousAliases||[]).includes(key)))];
  const savedNoteKeys=referenceKeys.filter(key=>profile?.notes[key]!==undefined);const defaultNoteKey=savedNoteKeys[0]||e.entityKey||e.uid;
  const [noteKey,setNoteKey]=useState(defaultNoteKey);const [note,setNote]=useState(profile?.notes[defaultNoteKey]||'');const [related,setRelated]=useState<Entry[]>([]);const [busy,setBusy]=useState(false);const panel=useRef<HTMLElement>(null);
  const bookmarked=profile?.bookmarks.some(key=>referenceKeys.includes(key));
  useEffect(()=>{setNoteKey(initialNoteDraft?.key||defaultNoteKey);setNote(initialNoteDraft?.text??profile?.notes[defaultNoteKey]??'');const ids=[...(e.data.prerequisites||[]).flat(),...(e.data.exclusive||[]),...(e.data.enables||[])];let live=true;
    Promise.all([...new Set(ids)].map(id=>api<{entries:Entry[]}>(`entries?id=${encodeURIComponent(String(id))}&limit=100`).then(r=>r.entries))).then(r=>{if(live)setRelated(r.flat());}).catch(()=>{});return()=>{live=false;};
  },[e.uid,profile?.id,initialNoteDraft?.key,initialNoteDraft?.text]);
  useEffect(()=>{
    const element=panel.current;if(!element)return;let done=false;
    const restore=()=>{if(done)return;element.scrollTop=initialScroll;if(element.scrollHeight-element.clientHeight>=initialScroll-2)stop();};
    const observer=new MutationObserver(restore);const stop=()=>{done=true;observer.disconnect();element.removeEventListener('wheel',stop);element.removeEventListener('pointerdown',stop);element.removeEventListener('keydown',stop);};
    observer.observe(element,{childList:true,subtree:true});element.addEventListener('wheel',stop,{passive:true});element.addEventListener('pointerdown',stop);element.addEventListener('keydown',stop);
    const frame=requestAnimationFrame(restore);return()=>{cancelAnimationFrame(frame);stop();};
  },[e.uid,initialScroll]);
  useEffect(()=>{const listener=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);},[onClose]);
  const action=async(patch:Partial<Profile>,message:string)=>{if(!profile)return;setBusy(true);try{await save({...profile,...patch});notify(message);}catch{}finally{setBusy(false);}};
  const stats=e.data.resolvedStats||e.data.stats||e.data.modifiers;
  const focus=['focus','shared_focus','joint_focus'].includes(e.kind);
  const completionKeys=[e.id,e.uid,e.entityKey,'definition:'+e.uid].filter((v):v is string=>!!v);const hasCompletion=!!profile?.completed.some(ref=>completionKeys.includes(ref));
  return <div className="drawer-backdrop" onClick={onClose}><aside ref={panel} className="entry-drawer" role="dialog" aria-modal="true" aria-label={e.title} onClick={event=>event.stopPropagation()}><div className="drawer-top"><div>{onBack&&<button className="text-link drawer-back" onClick={onBack}><ArrowUp size={16} style={{transform:"rotate(-90deg)"}}/>Back</button>}<span className="eyebrow">{labels[e.kind]||e.kind}</span></div><button className="icon-button" aria-label="Close reference" onClick={onClose}><X size={23}/></button></div><h1>{e.title}</h1><code className="entry-id">{e.id}</code><div className="chip-row"><span className={`tag ${e.verification==='game-verified'?'verified':''}`}>{sourceStatus(e)}</span><span className="tag">v{e.version}</span>{focus&&<span className="tag"><Clock size={12}/>{e.data.days??'?'} days</span>}</div>{e.data.importWarnings?.length>0&&<div className="notice small">Source syntax needed recovery: {e.data.importWarnings.join("; ")}. Check the original file when relying on these conditions.</div>}{e.description&&<p className="entry-description">{e.description}</p>}
    {e.data.indexRevision&&currentIndexRevision&&e.data.indexRevision!==currentIndexRevision&&<div className="notice small" role="status"><AlertTriangle size={17}/><span>This reference was opened from an older index. Your note draft remains here.</span><button className="button" onClick={()=>onOpen(e.entityKey||e.uid)}>Reload reference</button></div>}
    {e.data.anonymousIdentity&&<div className="notice small"><AlertTriangle size={17}/><span>Positional reference. {e.data.revalidation||'Revalidate this anonymous record when its source or index changes.'}</span></div>}
    <div className="button-row">{profile&&<button className={`button ${bookmarked?'selected':''}`} disabled={busy} onClick={()=>action({bookmarks:bookmarked?profile.bookmarks.filter(id=>!referenceKeys.includes(id)):[...profile.bookmarks,e.entityKey||e.uid]},'Bookmark updated.')}><Bookmark size={16}/>{bookmarked?'Bookmarked':'Bookmark'}</button>}{focus&&<button className="button" onClick={()=>onFocus(e.id)}><GitBranch size={16}/>Find in current tree</button>}</div>
    {focus&&<section><h3>Plan this focus</h3>{profile?.tree?<><p className="muted">Add to the selected campaign tree. The queue flags missing prerequisites and focuses outside that tree.</p><div className="button-row"><button className="button primary" disabled={busy||profile.queue.includes(e.id)||hasCompletion} onClick={()=>onFocus(e.id)}><Plus size={16}/>{hasCompletion?'Completed':profile.queue.includes(e.id)?'In your queue':'Review in planner'}</button><button className="button" disabled={busy} onClick={()=>action({completed:hasCompletion?profile.completed.filter(id=>!completionKeys.includes(id)):[...profile.completed,'definition:'+e.uid]},'Completion checklist updated.')}><Check size={16}/>{hasCompletion?'Unmark complete':'Mark complete'}</button></div></>:<p className="muted">Create a campaign and choose a focus tree to build a plan.</p>}
      {e.data.prerequisites?.length>0&&<><h4>Prerequisites</h4><p className="muted">Each row is required; choose at least one focus within each row.</p>{e.data.prerequisites.map((g:string[],i:number)=><div className="prerequisite-group" key={i}>{g.map((id,j)=><span key={id}>{j>0&&<small> OR </small>}<button className="chip" onClick={()=>onOpen(id)}>{related.find(v=>v.id===id)?.title||id}</button></span>)}</div>)}</>}
      {e.data.exclusive?.length>0&&<><h4>Mutually exclusive with</h4><div className="chip-row">{e.data.exclusive.map((id:string)=><button className="chip warning" key={id} onClick={()=>onOpen(id)}>{related.find(v=>v.id===id)?.title||id}</button>)}</div></>}
    </section>}
    {e.data.dlcs?.length>0&&<section><h3>DLC mentioned in this script</h3><p className="muted">Mentions can be alternatives or exclusions; read the conditions for the actual requirement.</p><div className="chip-row">{e.data.dlcs.map((d:string)=><span className="tag" key={d}>{d}</span>)}</div></section>}
    {!(focus||['decision','technology'].includes(e.kind))&&stats&&Object.keys(stats).length>0&&<section><h3>{e.kind==='equipment'?'Base equipment stats':'Scripted values'}</h3><div className="data-table">{Object.entries(stats).map(([key,value])=><div key={key}><span>{key.replaceAll('_',' ')}</span><strong>{typeof value==='number'?sourceNumber(value):String(value)}</strong></div>)}</div>{e.kind==='equipment'&&<small className="muted">Includes archetype defaults; excludes technologies, modules, designers, and campaign modifiers.</small>}</section>}
    {e.data.ideaCategory&&<section><h3>Idea category</h3><p>{e.data.ideaCategory.id} · {e.data.ideaCategory.type||'type unresolved'}</p><div className="data-table"><div><span>Declared category base cost</span><strong>{e.data.ideaCategory.declaredBaseCost??'unresolved'}</strong></div></div><p className="muted">Inherited category declaration; final campaign cost and eligibility require their conditions.</p><details><summary>Category cost evidence</summary><p>{e.data.ideaCategory.source}:{e.data.ideaCategory.line}</p><code className="evidence-hash">SHA-256 {e.data.ideaCategory.hash}</code></details></section>}
    {['addStats','multiplyStats'].map(key=>e.data[key]&&Object.keys(e.data[key]).length>0&&<section key={key}><h3>{key==='addStats'?'Declared added values':'Declared multipliers'}</h3><div className="data-table">{Object.entries(e.data[key]).map(([name,value])=><div key={name}><span>{name.replaceAll('_',' ')}</span><strong>{typeof value==='number'?sourceNumber(value):String(value)}</strong></div>)}</div><p className="muted">Source coefficients; units, stacking, and final designer values are not simulated.</p></section>)}
    {[['scopedStats','Scoped reward values'],['missionStats','Mission-specific values']].map(([key,title])=>Array.isArray(e.data[key])&&e.data[key].length>0&&<section key={key}><details><summary>{title}</summary><p className="muted">Values apply only within their declared scope and conditions.</p><Script text={formatNodes(e.data[key])}/></details></section>)}
    {(focus||['decision','technology'].includes(e.kind))?<MechanicsView entry={e}/>:<>
    {e.data.effectsSummary?.length>0&&<section><h3>At a glance</h3><ul className="checklist">{e.data.effectsSummary.map((s:string)=><li key={s}>{s}</li>)}</ul><small className="muted">Partial summary of top-level effects; inspect the full reward block for scopes and conditions.</small></section>}{e.data.effects&&<section><details><summary>Full completion effects</summary><Script text={e.data.effects}/></details></section>}{e.data.requirements&&<section><p className="muted">Eligibility is conditional. Check the installed requirements before planning this decision.</p><details><summary>Eligibility & requirements</summary><Script text={e.data.requirements}/></details></section>}
    {e.data.documentation&&<section><h3>{e.data.editorial?"Practical explanation":"Bundled documentation"}</h3><pre className="documentation">{e.data.documentation}</pre></section>}
    {Object.keys(e.data.conditions||{}).length>0&&<section><h3>Conditional rules</h3><p className="muted">Game script is shown directly. Unsupported conditions require a manual in-game check.</p>{Object.entries(e.data.conditions).map(([key,nodes])=><details key={key}><summary>{key.replaceAll('_',' ')}</summary><Script text={formatNodes(nodes as any[])}/></details>)}</section>}
    </>}
    {e.kind==='focus_tree'&&<section><p>Which tree applies depends on country, DLC and scripted selection rules. This has not been verified for your campaign.</p><details><summary>Advanced tree selection script</summary><Script text={e.data.countryScript||'Generic fallback or no explicit country rule.'}/></details></section>}
    {e.data.sourceConflicts?.length>0&&<section><h3>Source review</h3><div className="notice small"><AlertTriangle size={17}/><span>External wording or values differ from this installed declaration.</span></div>{e.data.sourceConflicts.map((conflict:any,index:number)=><details key={index}><summary>{conflict.claim} · {conflict.status}</summary><p><strong>Installed:</strong> {conflict.installed}<br/><strong>External:</strong> {conflict.external}</p><p>{conflict.review}</p>{conflict.url&&<a className="text-link" href={conflict.url} target="_blank" rel="noreferrer">Review cited source <ExternalLink size={14}/></a>}</details>)}</section>}
    {e.data.unknowns?.length>0&&<section><h3>Still unverified</h3><ul className="checklist">{e.data.unknowns.map((unknown:string,index:number)=><li key={index}>{unknown}</li>)}</ul></section>}
    <RelationshipExplorer entry={e} onOpen={onOpen}/>
    {profile&&ambiguousNoteKeys.length>0&&<section><h3>Legacy notes needing review</h3><p className="muted">These saved references match multiple identities. They have been retained without attaching them to this definition.</p>{ambiguousNoteKeys.map((key:string)=><details key={key}><summary>{key}</summary><pre className="documentation">{profile.notes[key]}</pre><button className="button" onClick={()=>{setNoteKey(e.entityKey||e.uid);setNote(profile.notes[key]);}}>Use this text in this definition's note</button><p className="muted">Review the text, then choose Save note below. The original reference is retained.</p></details>)}</section>}
    {profile&&<section><h3>Your notes</h3>{savedNoteKeys.length>1&&<label>Saved note reference<select aria-label="Saved note reference" value={noteKey} onChange={event=>{setNoteKey(event.target.value);setNote(profile.notes[event.target.value]||'');}}>{savedNoteKeys.map(key=><option key={key} value={key}>{key}</option>)}</select></label>}<textarea data-note-key={noteKey} aria-label="Reference notes" rows={4} value={note} onChange={event=>setNote(event.target.value)} placeholder="Keep a reminder for this campaign…"/><button className="button" disabled={busy} onClick={()=>action({notes:{...profile.notes,[noteKey]:note}},'Note saved.')}><Check size={15}/>Save note</button></section>}
    {e.data.constraints&&<section><details><summary>Constraints and scoped declarations</summary><p className="muted">Operators, repeated groups, and scope are retained. These declarations do not simulate a valid design or final campaign values.</p><Script text={Array.isArray(e.data.constraints)?formatNodes(e.data.constraints):JSON.stringify(e.data.constraints,null,2)}/></details></section>}
    {e.data.conflicts?.length>0&&<section><h3>Sources disagree</h3><div className="notice small"><AlertTriangle size={17}/><span>{e.data.conflicts.map((c:any)=>typeof c==='string'?c:JSON.stringify(c)).join('; ')}</span></div><p className="muted">Keep the stated patch and scope in view. An extraction is not proof that an external explanation is current.</p></section>}
    <section className="provenance"><p className="muted">{sourceStatus(e)} for game {e.version}. {e.verification==='game-verified'?'See verification evidence for tested conditions.':'Engine behavior and your campaign conditions have not been established by this extraction.'}</p><details><summary>Advanced technical source & provenance</summary>{e.data.references?.length>0&&<ul className="checklist">{e.data.references.map((r:string)=><li key={r}><code>{r}</code></li>)}</ul>}<p><strong>{e.source}:{e.line}</strong><br/>Installed build {e.version}</p><small>SHA-256 {e.hash}</small>{e.entityKey&&<><p>Logical identity</p><code className="evidence-hash">{e.entityKey}</code></>}{e.evidence?.map((proof,index)=><details key={index}><summary>{proof.class} · {proof.rule}</summary><p>{proof.source}:{proof.line??1}<br/>Game {proof.gameVersion}{proof.capturedAt&&<><br/>Captured {proof.capturedAt}</>}</p><small>SHA-256 {proof.hash}</small>{proof.dependencies?.map(dependency=><code className="evidence-hash" key={dependency}>{dependency}</code>)}</details>)}{e.data.localizationEvidence&&<details><summary>Localization evidence</summary><Script text={JSON.stringify(e.data.localizationEvidence,null,2)}/></details>}<details><summary>Inspect full source block</summary><Script text={e.data.script||'No script block; see documentation above.'}/></details><button className="text-link" onClick={()=>onSearch(e.id)}><Search size={14}/>Related references</button></details></section>
  </aside></div>;
}
function formatNodes(nodes:import('./types').Node[],depth=0):string{return nodes.map(n=>`${'  '.repeat(depth)}${n.key?`${n.key} ${n.op||'='} `:''}${Array.isArray(n.value)?`{\n${formatNodes(n.value,depth+1)}\n${'  '.repeat(depth)}}`:n.value.includes(' ')?JSON.stringify(n.value):n.value}`).join('\n');}
function Script({text}:{text:string}){return <pre className="script-block">{text}</pre>;}

function SettingsPage({status,load,fail,notify,active,onEdit}:{status:Status;load:()=>Promise<void>;fail:(e:unknown)=>void;notify:(s:string)=>void;active?:Profile;onEdit:()=>void}){
  const [root,setRoot]=useState(status.root||'');const [busy,setBusy]=useState(false);const [network,setNetwork]=useState(status.network);
  const refresh=async()=>{setBusy(true);try{const meta=await api<Meta>('reindex',{root});await load();notify(`Index updated: ${meta.changedFiles} changed source files.`);}catch(e){fail(e);}finally{setBusy(false);}};
  return <><PageTitle eyebrow="TRUST THE REFERENCE" title="Sources & settings" text="Manage the game index, campaigns, and local access."/><div className="settings-grid"><section className="panel"><div className="section-label">GAME DATA <span className="tag verified">READ ONLY</span></div><h2>Your installation</h2>{status.local&&<><label>HOI4 installation folder<input value={root} onChange={e=>setRoot(e.target.value)} placeholder="C:\…\Hearts of Iron IV"/></label><button className="button primary" disabled={busy} onClick={refresh}><RefreshCw size={16} className={busy?'spin':''}/>{busy?'Indexing game files…':'Refresh game data'}</button></>}{status.indexingError&&<p className="danger">{status.indexingError}</p>}<div className="data-table"><div><span>Game version</span><strong>{status.meta?.version||'Not indexed'}</strong></div><div><span>Source files</span><strong>{number(status.meta?.files||0)}</strong></div><div><span>Last indexed</span><strong>{status.meta?new Date(status.meta.indexedAt).toLocaleString():'—'}</strong></div><div><span>Enabled mods</span><strong>{status.meta?.mods.length||0}</strong></div></div>{(status.meta?.mods.length||0)>0&&<p className="notice">Mods are enabled in your launcher. This release indexes vanilla files; mod overrides are not applied.</p>}<p className="muted">Refresh checks content hashes, updates changed sources, and preserves your campaign plans and notes. Localization changes rebuild reference labels.</p>{status.meta && status.meta.warnings.length>0&&<details><summary>{status.meta.warnings.length} import warnings</summary><pre className="script-block">{status.meta.warnings.join('\n')}</pre></details>}</section>
    <section className="panel"><div className="section-label">SECOND SCREEN <Smartphone size={18}/></div><h2>Phone access</h2><p>Open the same reference and campaign plans on a phone over your home network. Your PC must stay on. Pairing lasts 24 hours; disabling access disconnects devices.</p>{status.local?<><button className={`button ${network.enabled?'':'primary'}`} disabled={busy} onClick={async()=>{setBusy(true);try{setNetwork(await api('network',{enabled:!network.enabled}));}catch(e){fail(e);}finally{setBusy(false);}}}><Smartphone size={16}/>{network.enabled?'Disable phone access':'Enable phone access'}</button>{network.enabled&&<div className="pairing-info"><div className="eyebrow">PAIRING CODE</div><strong>{network.code}</strong>{network.urls.map((url:string)=><p key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></p>)}<small>Use a trusted home network. This local connection uses HTTP.</small></div>}</>:<div className="notice">Paired to your PC. Manage network access in the desktop app.</div>}</section>
    <section className="panel"><div className="section-label">CAMPAIGNS & STORAGE</div><h2>Campaign storage</h2><p>Profiles, focus queues, bookmarks, templates, and notes are stored separately from HOI4. No game or save files are edited.</p>{status.local&&<code className="path-display">{status.dataDirectory}</code>}<div className="button-row"><button className="button" onClick={onEdit}>Campaign & DLC setup</button>{active&&<button className="button" onClick={()=>download(`${active.name}.json`,{...active,exportSchemaVersion:3})}><Download size={16}/>Export campaign</button>}</div><label className="import-label">Import campaign JSON<input type="file" accept=".json,application/json" onChange={async e=>{const input=e.currentTarget;const file=input.files?.[0];if(!file)return;try{const value=JSON.parse(await file.text());if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected a campaign profile.');if(value.exportSchemaVersion>3)throw new Error('This export needs a newer Companion version.');value.id=crypto.randomUUID();value.revision=0;value.exportSchemaVersion=3;await api('profile',value);await load();notify('Campaign imported as a new profile.');}catch(e){fail(e);}finally{input.value='';}}}/></label></section>
    <section className="panel"><div className="section-label">SOURCE ORDER</div><h2>Facts, explanations, advice.</h2><ol className="checklist"><li><strong>Installed scripts:</strong> Exact extracted values, conditions, identifiers, and localization.</li><li><strong>Bundled documentation:</strong> Console command reference and source material for effects and triggers.</li><li><strong>Bundled wiki:</strong> Available locally for future explanatory imports; not assumed current and not imported in this release.</li><li><strong>Paradox Wiki and official updates:</strong> External cross-checks; not automatically scraped.</li><li><strong>Editorial guides:</strong> Practical suggestions, clearly separated from scripted requirements.</li></ol><div className="reference-links"><a href="https://hoi4.paradoxwikis.com/Hearts_of_Iron_4_Wiki" target="_blank" rel="noreferrer">Paradox HOI4 Wiki <ExternalLink size={14}/></a><a href="https://steamcommunity.com/app/394360/announcements/" target="_blank" rel="noreferrer">Official updates <ExternalLink size={14}/></a></div></section>
    <CoveragePanel/>
    <section className="panel roadmap"><div className="section-label">THE ROAD AHEAD</div><h2>Future milestones</h2>{status.roadmap.map((r,i)=><div key={r}><span className="queue-number">0{i+1}</span><span>{r}</span><span className="tag">PLANNED</span></div>)}<p className="muted">No AI dependency or background external requests. Campaign Intelligence now reviews bridge observations and recordings. Continuous monitoring, broader planning and verified gameplay actions remain future work.</p></section></div>
  </>;
}




