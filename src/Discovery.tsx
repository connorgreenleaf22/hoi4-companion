import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Bookmark,CheckCircle2,Eye,EyeOff,Search,X} from 'lucide-react';
import type {Entry,Profile,Truth} from './types';
import type {DiscoveryPreview,GuideView,GuideClaim} from './discovery-types';
import {discoveryReview,reviewScope} from './discovery-review';
import {api,download} from './api';
import {beginPlannerWrite,forgetPlannerDraft,getOutstandingPlannerDrafts,getPlannerDraft,rememberPlannerDraft,subscribePlannerDrafts} from './planner/drafts';
import './discovery.css';

type Props={profile?:Profile;countries:Entry[];indexRevision?:string;openEntry:(uid:string)=>void;onCountry:(tag:string)=>void;save:(p:Profile)=>Promise<Profile>;onApplied:(p:Profile)=>void;fail:(e:unknown)=>void};
type OpenPreview={guide:GuideView;value:DiscoveryPreview;failed:boolean};
const describe=(error:unknown)=>error instanceof Error?error.message:String(error);
const truth=(value:Truth)=>value==='yes'?'Supported':value==='no'?'Blocked':'Check in game';
const claimLabels:Record<GuideClaim['type'],string>={scripted:'Scripted requirement or effect',mechanics:'Mechanics explanation',strategy:'Strategy advice',lead:'Unverified research lead'};
const verificationLabels:Record<GuideClaim['verification'],string>={'script-extracted':'Installed-script evidence',unverified:'Unverified',editorial:'Editorial advice'};

export function Discovery({profile,countries,indexRevision,openEntry,onCountry,save,onApplied,fail}:Props){
  // Reveal is deliberate for this visit. A previously stored preference never reveals a guide by itself.
  const [spoilers,setSpoilers]=useState(false),[query,setQuery]=useState(''),[countryOnly,setCountryOnly]=useState(false);
  const [tab,setTab]=useState<'guides'|'formables'>('guides'),[bookmarkedOnly,setBookmarkedOnly]=useState(false);
  const [formables,setFormables]=useState<Entry[]>([]),[formableQuery,setFormableQuery]=useState(''),[formableOffset,setFormableOffset]=useState(0),[formableTotal,setFormableTotal]=useState(0),[formablesLoading,setFormablesLoading]=useState(false);
  const [guides,setGuides]=useState<GuideView[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [preview,setPreview]=useState<OpenPreview>(),[checking,setChecking]=useState(''),[writing,setWriting]=useState(false),[retry,setRetry]=useState(0);
  useSyncExternalStore(subscribePlannerDrafts,getOutstandingPlannerDrafts);
  const current=useRef({profile,indexRevision,spoilers});current.current={profile,indexRevision,spoilers};
  const reads=useRef(0),formableReads=useRef(0),previewReads=useRef(0),operation=useRef(false),mounted=useRef(true);
  const modal=useRef<HTMLElement>(null),returnFocus=useRef<HTMLElement|null>(null);
  const hasDraft=!!profile&&!!getPlannerDraft(profile.id)?.dirty;
  const visible=guides.filter(guide=>(spoilers||!guide.spoiler)&&(!bookmarkedOnly||!!profile?.bookmarks.includes('guide:'+guide.id)));
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;reads.current++;formableReads.current++;previewReads.current++;};},[]);
  useEffect(()=>{
    const request=++reads.current;setLoading(true);setError('');
    const params=new URLSearchParams({q:query,spoilers:spoilers?'show':'hide'});
    if(countryOnly)params.set('country',profile?.country||'---');
    const timer=setTimeout(()=>{void api<{guides:GuideView[]}>(`guides?${params}`).then(data=>{if(mounted.current&&request===reads.current)setGuides(data.guides);}).catch(error=>{if(mounted.current&&request===reads.current){setGuides([]);setError(describe(error));}}).finally(()=>{if(mounted.current&&request===reads.current)setLoading(false);});},140);
    return()=>{clearTimeout(timer);reads.current++;};
  },[query,spoilers,countryOnly,profile?.country,indexRevision,retry]);
  useEffect(()=>{
    const request=++formableReads.current;
    if(tab!=='formables'||!spoilers){setFormables([]);setFormableTotal(0);setFormablesLoading(false);return;}
    setFormablesLoading(true);setError('');
    const params=new URLSearchParams({kind:'formable',q:formableQuery,offset:String(formableOffset),limit:'40'});
    const timer=setTimeout(()=>{void api<{entries:Entry[];total:number}>(`entries?${params}`).then(data=>{if(mounted.current&&request===formableReads.current){setFormables(data.entries);setFormableTotal(data.total);}}).catch(error=>{if(mounted.current&&request===formableReads.current){setFormables([]);setFormableTotal(0);setError(describe(error));}}).finally(()=>{if(mounted.current&&request===formableReads.current)setFormablesLoading(false);});},140);
    return()=>{clearTimeout(timer);formableReads.current++;};
  },[tab,spoilers,formableQuery,formableOffset,indexRevision,retry]);
  useEffect(()=>{if(!operation.current){previewReads.current++;setChecking('');setPreview(undefined);}},[profile?.id,profile?.revision,indexRevision]);
  useEffect(()=>{
    if(!preview)return;
    const root=modal.current;root?.querySelector<HTMLElement>('button:not([disabled])')?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'&&!operation.current){event.preventDefault();setPreview(undefined);return;}
      if(event.key!=='Tab'||!root)return;
      const items=[...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);
      if(!items.length){event.preventDefault();root.focus();return;}
      const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('keydown',onKey);returnFocus.current?.focus();};
  },[preview?.value.plan.id]);

  const toggleSpoilers=()=>{
    if(operation.current)return;
    // Clear old responses synchronously with the control change, including a visible secret preview.
    reads.current++;formableReads.current++;previewReads.current++;setGuides([]);setFormables([]);setFormableTotal(0);setFormableOffset(0);setFormableQuery('');setQuery('');setCountryOnly(false);setBookmarkedOnly(false);setPreview(undefined);setChecking('');setError('');setMessage('');setSpoilers(value=>!value);
  };
  const requestPreview=async(guide:GuideView)=>{
    const basis=current.current.profile;
    if(operation.current||!basis||!guide.canPreview||!guide.countries.includes(basis.country)||getPlannerDraft(basis.id)?.dirty)return;
    const request=++previewReads.current,revision=basis.revision??0,sourceRevision=current.current.indexRevision||guide.indexRevision;
    returnFocus.current=document.activeElement as HTMLElement;setChecking(guide.id);setError('');setMessage('');
    try{
      const value=await api<DiscoveryPreview>('discovery/preview',{guideId:guide.id,profileId:basis.id,expectedProfileRevision:revision,expectedIndexRevision:sourceRevision,spoilers:current.current.spoilers?'show':'hide'});
      if(!mounted.current||request!==previewReads.current)return;
      if(current.current.profile?.id!==basis.id||(current.current.profile.revision??0)!==revision||current.current.indexRevision!==sourceRevision&&current.current.indexRevision!==undefined||guide.spoiler&&!current.current.spoilers||getPlannerDraft(basis.id)?.dirty)return;
      setPreview({guide,value,failed:false});
    }catch(error){if(mounted.current&&request===previewReads.current)setError(describe(error));}
    finally{if(mounted.current&&request===previewReads.current)setChecking('');}
  };
  const apply=async()=>{
    if(operation.current||!preview||preview.failed)return;
    const basis=current.current.profile,value=preview.value,existing=getPlannerDraft(value.profile.id);
    if(!basis||basis.id!==value.profile.id||(basis.revision??0)!==value.preview.expectedProfileRevision||current.current.indexRevision&&current.current.indexRevision!==value.preview.expectedIndexRevision||existing?.dirty){setError('Campaign or draft context changed. Cancel and review a new preview.');return;}
    operation.current=true;setWriting(true);setError('');
    // Preserve the exact submitted draft before the request. A lost response can mean that it committed.
    rememberPlannerDraft({draft:value.profile,selected:value.plan.id,baseRevision:value.preview.expectedProfileRevision,view:value.profile.planner!.view,dirty:true});
    const finish=beginPlannerWrite();
    try{
      const result=await api<{profile:Profile}>('plan/apply',{profile:value.profile,plan:value.plan,...value.preview});
      const cached=getPlannerDraft(value.profile.id);
      if(cached?.selected===value.plan.id&&JSON.stringify(cached.draft)===JSON.stringify(value.profile))forgetPlannerDraft(value.profile.id);
      onApplied(result.profile);
      if(mounted.current){setPreview(undefined);setMessage('Reviewed starter plan and sourced checklist saved. Existing alternatives and actual completion history are preserved.');}
    }catch(error){if(mounted.current){setError(describe(error)+' The submitted draft is retained. Review the latest saved campaign before another Apply.');setPreview(value=>value?{...value,failed:true}:value);}else fail(error);}
    finally{operation.current=false;finish();if(mounted.current)setWriting(false);}
  };
  const bookmark=async(guide:GuideView)=>{
    const basis=current.current.profile;
    if(!basis||operation.current||getPlannerDraft(basis.id)?.dirty)return;
    const key='guide:'+guide.id,isSaved=basis.bookmarks.includes(key);
    operation.current=true;setWriting(true);setError('');
    try{await save({...basis,bookmarks:isSaved?basis.bookmarks.filter(value=>value!==key):[...basis.bookmarks,key]});if(mounted.current)setMessage(isSaved?'Guide bookmark removed.':'Guide bookmarked for this campaign.');}
    catch(error){if(mounted.current)setError(describe(error));else fail(error);}
    finally{operation.current=false;if(mounted.current)setWriting(false);}
  };
  const countryName=(tag:string)=>countries.find(country=>country.id===tag)?.title||tag;
  const previewStale=!!preview&&(!profile||profile.id!==preview.value.profile.id||(profile.revision??0)!==preview.value.preview.expectedProfileRevision||!!indexRevision&&indexRevision!==preview.value.preview.expectedIndexRevision);
  const review=preview?discoveryReview(preview.value.plan,preview.value.preview.report):undefined;
  const reviewPositions=preview?.value.preview.report.steps.map(step=>step.position)||[];

  return <>
    <section className="discovery-page" inert={!!preview} aria-label="Campaign discovery">
      <div className="page-title"><div><div className="eyebrow">DISCOVERY & GUIDES</div><h1>Campaign ideas<span className="gold">.</span></h1><p>Explore sourced routes and create a reviewed starter plan.</p></div></div>
      <div className="segmented discovery-tabs" role="group" aria-label="Discovery catalog"><button className={tab==='guides'?'selected':''} aria-pressed={tab==='guides'} disabled={writing} onClick={()=>{previewReads.current++;setChecking('');setPreview(undefined);setError('');setTab('guides');}}>Campaign guides</button><button className={tab==='formables'?'selected':''} aria-pressed={tab==='formables'} disabled={writing} onClick={()=>{previewReads.current++;setChecking('');setPreview(undefined);setError('');setTab('formables');}}>Formations & restorations</button></div>
      <div className="filter-bar discovery-filters">{tab==='guides'?<><label className="search-box"><Search size={16}/><input aria-label="Search campaign ideas" placeholder="Search countries or objectives" value={query} maxLength={300} onChange={event=>setQuery(event.target.value)}/></label><button className={`button ${countryOnly?'selected':''}`} aria-pressed={countryOnly} onClick={()=>setCountryOnly(value=>!value)} disabled={writing||!profile}>My country</button><button className={`button ${bookmarkedOnly?'selected':''}`} aria-pressed={bookmarkedOnly} onClick={()=>setBookmarkedOnly(value=>!value)} disabled={writing||!profile}><Bookmark size={14}/>Bookmarked guides</button></>:spoilers?<label className="search-box"><Search size={16}/><input aria-label="Search formation candidates" placeholder="Search installed formation decisions" value={formableQuery} maxLength={300} onChange={event=>{formableReads.current++;setFormables([]);setFormableTotal(0);setFormableOffset(0);setFormableQuery(event.target.value);}}/></label>:null}<button className="button" aria-pressed={spoilers} onClick={toggleSpoilers} disabled={writing}>{spoilers?<Eye size={16}/>:<EyeOff size={16}/>}Secrets {spoilers?'shown':'hidden'}</button></div>
      <p className="notice small"><BookOpen size={17}/>{tab==='guides'?'Installed declarations support individual claims. Full campaign outcomes and in-game behavior have not been verified.':'Raw formation and restoration candidates come from installed decision scripts. They include cosmetic transformations and other decisions; not every result creates a new nation. Inspect eligibility, availability and effects in context.'}</p>
      {!spoilers&&<p className="discovery-spoiler-note"><EyeOff size={15}/>{tab==='guides'?'Secret guides, their search snippets, tags and suggested plans remain hidden until you reveal them.':'Formation candidates can reveal secret outcomes. Use Secrets hidden to reveal the raw catalog; no raw candidates are loaded while secrets are hidden.'}</p>}
      {hasDraft&&<p className="notice small">An unsaved planner draft needs review. Apply or discard it in the Campaign planner before previewing another route or changing guide bookmarks.</p>}
      {error&&<p className="discovery-error" role="alert">{error}<button className="text-link" disabled={writing} onClick={()=>setRetry(value=>value+1)}>Reload guides</button></p>}
      {message&&<p className="discovery-message" role="status"><CheckCircle2 size={16}/>{message}</p>}
      {tab==='guides'?<>{loading&&<p className="muted" role="status">Loading campaign guides…</p>}
      {!loading&&!visible.length&&!error&&<div className="panel"><h2>No matching guides</h2><p>Try another search or country filter. Secret guides require an explicit reveal.</p></div>}
      <div className="discovery-grid">{visible.map(guide=>{
        const matches=!!profile&&guide.countries.includes(profile.country),saved=!!profile?.bookmarks.includes('guide:'+guide.id);
        return <article className="panel discovery-guide" key={guide.id} aria-labelledby={'guide-title-'+guide.id}>
          <div className="section-label"><span>{guide.type}</span><span className="tag">{guide.difficulty.label}</span></div>
          <h2 id={'guide-title-'+guide.id}>{guide.title}</h2><p className="discovery-countries">{guide.countries.map(countryName).join(' / ')}</p><p>{guide.summary}</p>
          <div className="discovery-context"><span>Patch {guide.supportedVersion}</span><span>Guide r{guide.revision}</span><strong className={guide.freshness==='matched'?'discovery-current':'discovery-stale'}>{guide.freshness==='matched'?'Source hashes match':guide.freshness==='unavailable'?'Reference index unavailable':'Source review required'}</strong></div>
          <p className="discovery-dlc"><strong>DLC context:</strong> {guide.dlcContext}</p>
          <details className="discovery-details"><summary>Read guide, requirements & sources</summary>
            <h3>Objectives</h3><ul>{guide.objectives.map((item,index)=><li key={index}>{item}</li>)}</ul>
            <h3>Preparation</h3><ul>{guide.preparation.map((item,index)=><li key={index}>{item}</li>)}</ul>
            <p><strong>Difficulty rationale:</strong> {guide.difficulty.rationale}</p>
            <h3>Claims & verification</h3><div className="discovery-claims">{guide.claims.map(claim=><section className={'discovery-claim discovery-claim-'+claim.type} key={claim.id}><div><strong>{claimLabels[claim.type]}</strong><span>{verificationLabels[claim.verification]}</span></div><p>{claim.text}</p>{!!claim.sourceIds.length&&<p className="discovery-source-links">Evidence: {claim.sourceIds.map((id,index)=><span key={id}>{index>0?' · ':''}<a href={`#guide-${guide.id}-source-${id}`}>{guide.sources.find(source=>source.id===id)?.label||id}</a></span>)}</p>}</section>)}</div>
            <h3>Known limits</h3><ul>{guide.limits.map((item,index)=><li key={index}>{item}</li>)}</ul>
            {!!guide.reviewReasons.length&&<><h3>Review needed</h3><ul className="discovery-stale">{guide.reviewReasons.map(reason=><li key={reason}>{reason}</li>)}</ul></>}
            {!!guide.referenceProblems.length&&<><h3>Reference issues</h3><ul className="discovery-stale">{guide.referenceProblems.map(reason=><li key={reason}>{reason}</li>)}</ul></>}
            {!!guide.resolvedReferences.length&&<><h3>Installed references</h3><div className="reference-links">{guide.resolvedReferences.map(reference=><button key={reference.uid} className="text-link" disabled={writing} onClick={()=>openEntry(reference.uid)}><BookOpen size={14}/>{reference.title}<ArrowUpRight size={13}/></button>)}</div></>}
            <h3>Sources & review record</h3><p>Reviewed {guide.reviewedAt} by {guide.author}. {guide.rights}</p>
            <div className="discovery-sources">{guide.sources.map(source=><section key={source.id} id={`guide-${guide.id}-source-${source.id}`}><strong>{source.label}</strong><p>{source.kind==='external'&&source.path.startsWith('https://')?<a href={source.path} target="_blank" rel="noreferrer">{source.path}</a>:<code>{source.path}:{source.line}–{source.endLine}</code>}</p><code className="discovery-hash">SHA-256 {source.hash||'Not captured'}</code>{source.author&&<p>Author: {source.author}</p>}{source.accessedAt&&<p>Accessed: {source.accessedAt}</p>}{source.reviewStatus&&<p>Review: {source.reviewStatus}</p>}{source.rights&&<p>Reuse: {source.rights}</p>}</section>)}</div>
          </details>
          <div className="button-row discovery-guide-actions"><button className="button primary" disabled={!guide.canPreview||!matches||hasDraft||writing||!!checking} onClick={()=>void requestPreview(guide)}>{checking===guide.id?'Checking suggested route…':'Preview starter plan'}<ArrowRight size={15}/></button><button className={`button ${saved?'selected':''}`} aria-pressed={saved} aria-label={`${saved?'Remove bookmark for':'Bookmark guide'} ${guide.title}`} disabled={!profile||writing||hasDraft} onClick={()=>void bookmark(guide)}><Bookmark size={15}/>{saved?'Bookmarked':'Bookmark'}</button>{!matches&&<button className="text-link" disabled={writing} onClick={()=>onCountry(guide.countries[0])}>Plan this country <ArrowRight size={14}/></button>}</div>
          {!guide.starter&&<p className="discovery-footnote">This research guide has no suggested focus queue.</p>}{guide.starter&&!guide.canPreview&&<p className="discovery-footnote">Source or reference review is required before a suggested queue is available.</p>}{guide.canPreview&&!matches&&<p className="discovery-footnote">Choose a saved {guide.countries.map(countryName).join(' / ')} campaign to preview this route.</p>}
        </article>;
      })}</div></>:spoilers?<section aria-label="Formation candidates">
        {formablesLoading&&<p className="muted" role="status">Loading formation candidates.</p>}
        {!formablesLoading&&!formables.length&&!error&&<div className="panel"><h2>No matching formations</h2><p>Try another decision name or script ID.</p></div>}
        <div className="reference-grid">{formables.map(entry=><button key={entry.uid} className="reference-card discovery-formable" disabled={writing} onClick={()=>openEntry('definition:'+entry.uid)}><div className="section-label">SCRIPTED DECISION<ArrowUpRight size={16}/></div><h3>{entry.title}</h3><p>{entry.description||'Inspect country eligibility, territorial requirements, availability and completion effects.'}</p><code>{entry.id}</code><small>{entry.source}{entry.line?':'+entry.line:''}</small></button>)}</div>
        {!!formableTotal&&<div className="pagination"><button className="button" aria-label="Previous formations" disabled={!formableOffset||formablesLoading} onClick={()=>{setFormables([]);setFormableOffset(offset=>Math.max(0,offset-40));}}>Previous formations</button><span>{formableOffset+1}-{Math.min(formableOffset+40,formableTotal)} of {formableTotal}</span><button className="button" aria-label="Next formations" disabled={formableOffset+40>=formableTotal||formablesLoading} onClick={()=>{setFormables([]);setFormableOffset(offset=>offset+40);}}>Next formations</button></div>}
      </section>:null}
    </section>
    {preview&&<div className="modal-backdrop"><section className="modal discovery-preview" ref={modal} role="dialog" aria-modal="true" aria-labelledby="discovery-preview-title" tabIndex={-1}>
      <button className="close" aria-label="Close guide preview" disabled={writing} onClick={()=>setPreview(undefined)}><X/></button><div className="eyebrow">REVIEW BEFORE SAVING</div><h2 id="discovery-preview-title">Starter plan preview</h2><p><strong>{preview.guide.title}</strong> · guide r{preview.value.guideRevision}</p>
      <p>This proposes a new active alternative and a captured sourced checklist. Existing alternatives, notes, bookmarks and actual focus completion are preserved. Cancel leaves the saved campaign unchanged.</p>
      <p className="notice small">A starter queue is a planning aid. It does not execute events, guarantee unlocks or certify live campaign eligibility.</p>
      <dl className="discovery-preview-facts"><div><dt>Campaign</dt><dd>{preview.value.profile.name}</dd></div><div><dt>Alternative</dt><dd>{preview.value.plan.name}</dd></div><div><dt>Baseline</dt><dd>{preview.value.plan.startDate}</dd></div><div><dt>Nominal effort</dt><dd>{preview.value.preview.report.totalDays===null?`${preview.value.preview.report.knownDays} known days; total unknown`:`${preview.value.preview.report.totalDays} days`}</dd></div><div><dt>Conditional finish</dt><dd>{preview.value.preview.report.finishDate||'Not established'}</dd></div></dl>
      {!!review!.findings.length&&<div className="discovery-preview-issues"><h3>Planner findings</h3><ul>{review!.findings.map((finding,index)=><li key={index}><span className="discovery-finding-text">{finding.message}</span> <small className="muted">({reviewScope(finding.occurrences.map(item=>item.position),reviewPositions)})</small></li>)}</ul></div>}
      <ol className="discovery-preview-steps">{preview.value.preview.report.steps.map(step=>{const assumptions=review!.steps.find(item=>item.position===step.position)!.assumptions;return <li key={step.position}><h3>{step.title}</h3><div className="discovery-context"><span>Eligibility: {truth(step.eligibility)}</span><span>Sequence: {truth(step.reachability)}</span><span>Resolution: {step.resolution}</span></div><p>{step.days===null?'Duration unknown':`${step.days} nominal days`}{step.finishDate?` · ${step.finishDate}`:''}</p>{!!assumptions.length&&<ul className="discovery-step-assumptions">{assumptions.map((item,index)=><li key={index}><span className="discovery-assumption-text">{item}</span></li>)}</ul>}{!!step.requirements.length&&<details><summary>Requirement explanation</summary><RequirementList requirements={step.requirements}/></details>}</li>;})}</ol>
      {!!review!.sharedAssumptions.length&&<section aria-label="Shared assumptions and manual checks"><h3>Shared assumptions & manual checks</h3><ul>{review!.sharedAssumptions.map((item,index)=><li key={index}><span className="discovery-assumption-text">{item.text}</span>{!item.planWide&&<small className="muted"> ({reviewScope(item.positions,reviewPositions)})</small>}</li>)}</ul></section>}
      <p className="discovery-footnote">The captured checklist also retains the guide’s claim wording, verification labels, source hashes and review revision.</p>
      {(error||previewStale)&&<p className="discovery-error" role="alert">{error||'Campaign or reference context changed. Cancel and request a fresh preview.'}</p>}
      {writing&&<p role="status">Saving reviewed plan… Keep this window open.</p>}
      <div className="button-row"><button className="button primary" disabled={writing||preview.failed||previewStale||hasDraft} onClick={()=>void apply()}>Apply reviewed plan</button><button className="button" disabled={writing} onClick={()=>{setPreview(undefined);setMessage('Preview cancelled. Saved campaign unchanged.');}}>Cancel preview</button><button className="text-link" onClick={()=>download(`${preview.value.profile.name} - guide preview.json`,preview.value.profile)}>Download preview</button></div>
      {preview.failed&&<p className="discovery-footnote">The submitted draft remains in the app’s unsaved-draft review after this preview closes. A missing acknowledgement may follow a committed save; check saved data before retrying.</p>}
    </section></div>}
  </>;
}

function RequirementList({requirements}:{requirements:DiscoveryPreview['preview']['report']['steps'][number]['requirements']}){
  return <ul className="discovery-requirements">{requirements.map((item,index)=><li key={index}><strong>{truth(item.truth)}:</strong> {item.key}{item.op?` ${item.op}`:''}{item.value?` ${item.value}`:''} — {item.reason}{!!item.children.length&&<RequirementList requirements={item.children}/>}</li>)}</ul>;
}
