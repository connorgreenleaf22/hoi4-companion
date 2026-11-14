import {useEffect,useState} from 'react';
import {api} from './api';
import {beginPlannerWrite} from './planner/drafts';
import type {BridgeSnapshot} from './bridge-types';
import type {CampaignRecording,BaselinePreview,PlanningBaseline} from './history-types';
import type {Entry,Profile} from './types';
import {valueText,ageLabel} from './intelligence';

export function BaselineTransfer({recording,snapshot,onApplied}:{recording:CampaignRecording;snapshot:BridgeSnapshot;onApplied:(p:Profile)=>void}){
  const [trees,setTrees]=useState<Entry[]>([]),[tree,setTree]=useState(''),[name,setName]=useState(`${recording.name} plan`.slice(0,100));
  const [preview,setPreview]=useState<BaselinePreview>(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let live=true;api<Entry[]>(`trees?country=${encodeURIComponent(snapshot.values.country.value||'')}`).then(t=>{if(live)setTrees(t);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[snapshot.id]);
  return <section className="notice baseline-transfer" aria-label="Planning baseline transfer"><h3>Plan from this snapshot</h3><p>Create a new workspace after review. Existing plans and imported history stay intact. To change the baseline later, choose another snapshot and create a replacement workspace.</p>
    <label>New planning workspace<input aria-label="New planning workspace" maxLength={100} value={name} onChange={e=>{setName(e.target.value);setPreview(undefined);}}/></label>
    <label>Source-defined focus tree<select aria-label="Baseline focus tree" value={tree} onChange={e=>{setTree(e.target.value);setPreview(undefined);}}><option value="">Choose later (partial baseline)</option>{trees.map(t=><option key={t.uid} value={t.uid}>{t.title} · {t.source}</option>)}</select></label>
    <button className="button" disabled={busy||!name.trim()} onClick={async()=>{setBusy(true);setError('');try{const status=await api<{meta:{indexRevision?:string}|null}>('status');setPreview(await api<BaselinePreview>('history/preview',{recordingId:recording.id,snapshotId:snapshot.id,profileId:'history-'+crypto.randomUUID(),name,tree,indexRevision:status.meta?.indexRevision||'legacy'}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>Preview planning baseline</button>
    {error&&<p role="alert">{error}</p>}
    {preview&&<div role="region" aria-label="Baseline preview"><h4>Review new workspace</h4><p>Country: {preview.profile.country} · Planning date: {preview.profile.startDate} · {tree?'Selected installed focus tree':'Focus tree not yet selected'}</p><p>Political power: {valueText(snapshot.values.politicalPower)} · Stability: {valueText(snapshot.values.stability)} · Focus: {valueText(snapshot.focusObservation?.current)}</p><p>New empty plan; no completion history or queued focuses will be inferred. Political/economic values and active focus are shown as context, not simulated by the planner.</p>{preview.warnings.map(w=><p key={w}>{w}</p>)}<button className="button primary" disabled={busy} onClick={async()=>{const finish=beginPlannerWrite();setBusy(true);setError('');try{const r=await api<{profile:Profile}>('history/apply',{input:preview.input,fingerprint:preview.preview.fingerprint});onApplied(r.profile);}catch(e){setError((e as Error).message);setPreview(undefined);}finally{setBusy(false);finish();}}}>Confirm and open planner</button><button className="button" disabled={busy} onClick={()=>setPreview(undefined)}>Cancel baseline preview</button></div>}
  </section>;
}

export function PlannerObservation({profileId,onHistory,openEntry}:{profileId:string;onHistory:(recordingId:string,snapshotId:string)=>void;openEntry:(id:string)=>void}){
  const [baseline,setBaseline]=useState<PlanningBaseline|null>(null),[error,setError]=useState('');
  useEffect(()=>{let live=true;setBaseline(null);setError('');api<PlanningBaseline|null>('history/baseline?profile='+encodeURIComponent(profileId)).then(b=>{if(live)setBaseline(b);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[profileId]);
  if(error)return <p className="notice">Recorded baseline unavailable: {error}</p>;
  if(!baseline)return null;const s=baseline.snapshot,focus=s.focusObservation?.current;
  return <section className="panel intelligence" aria-label="Recorded planning baseline"><h2>Recorded planning baseline</h2><p>{baseline.recordingName} · {baseline.origin==='fixture'?'Offline test fixture':'Historical import · origin unverified'} · {ageLabel(s.observedAt,Date.now())}</p><p>Observed country: {valueText(s.values.country)} · Engine date: {valueText(s.values.gameDate)} · Political power: {valueText(s.values.politicalPower)} · Stability: {valueText(s.values.stability)}</p><p>Focus at capture: {valueText(focus)}. {s.focusObservation&&ageLabel(s.focusObservation.observedAt,Date.now())}</p><p>Unavailable: research, completed focuses, decisions, political conditions, DLC/playset and historical-AI setting. Manual plan changes below are assumptions separate from this preserved observation. Empty completion history is not proof of no completed focuses.</p><p>Source: {s.source.path} · {s.source.hash} · game {s.gameVersion||'Unavailable'} · session {s.sessionId}</p><button className="button" onClick={()=>onHistory(baseline.recordingId,s.id)}>Return to recorded campaign / change baseline</button>{focus?.status==='observed'&&focus.value&&<button className="button" onClick={()=>openEntry(focus.value!)}>Inspect observed focus</button>}</section>;
}
