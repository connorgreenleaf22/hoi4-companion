import {useCallback,useEffect,useState} from 'react';
import {Activity,RefreshCw,Upload,BookOpen} from 'lucide-react';
import {api} from './api';
import type {BridgeSnapshot,CampaignIntelligence as Intelligence} from './bridge-types';
import {ageLabel,observationLabel,valueText,compareSnapshots,type RecordingOrigin} from './intelligence';
import './intelligence.css';

export function CampaignIntelligence({local,openEntry}:{local:boolean;openEntry:(id:string)=>void}){
  const [data,setData]=useState<Intelligence|null>(null),[error,setError]=useState(''),[connectionError,setConnectionError]=useState('');
  const [busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
  const [recording,setRecording]=useState<{name:string;origin:RecordingOrigin;snapshots:BridgeSnapshot[]}|null>(null);
  const [origin,setOrigin]=useState<RecordingOrigin>('recording'),[selected,setSelected]=useState(''),[baseline,setBaseline]=useState('');
  const refresh=useCallback(async()=>{if(!local)return;setBusy(true);try{setData(await api<Intelligence>('bridge/intelligence'));setConnectionError('');}catch(e){setData(null);setConnectionError((e as Error).message);}finally{setBusy(false);}},[local]);
  useEffect(()=>{void refresh();const timer=setInterval(()=>{setNow(Date.now());void refresh();},15000);return()=>clearInterval(timer);},[refresh]);
  const snapshots=recording?.snapshots??data?.snapshots??[];
  const snapshot=snapshots.find(s=>s.id===selected)??snapshots.at(-1);
  const previous=snapshots.find(s=>s.id===baseline);
  const comparison=previous&&snapshot?compareSnapshots(previous,snapshot):null;
  const focus=snapshot?.focusObservation;
  const label=(s:BridgeSnapshot)=>`${valueText(s.values.gameDate)} · ${valueText(s.values.country)} · ${new Date(s.focusObservation?.observedAt||s.observedAt).toLocaleString()} · ${s.id.slice(0,8)}`;
  return <section className="panel intelligence" aria-labelledby="intelligence-heading">
    <div className="intelligence-heading"><div><div className="section-label"><Activity size={16}/> CAMPAIGN INTELLIGENCE</div><h2 id="intelligence-heading">Your observed campaign</h2><p>Game observations and recording history. Your manually tracked plan stays separate.</p></div>
      <button className="button" disabled={busy||!local} onClick={()=>void refresh()}><RefreshCw size={15}/>{busy?'Refreshing…':'Refresh observations'}</button></div>
    {!local?<p className="notice">Open the desktop app to inspect the local game bridge. Game observations are not shared through phone pairing.</p>:<>
      {connectionError&&<p role="alert" className="notice">Bridge unavailable: {connectionError}. Displayed imports remain historical.</p>}{error&&<p role="alert" className="notice">Recording could not be opened: {error}</p>}
      <div className="intelligence-status" aria-live="polite"><strong>{data?'Local bridge connected':busy?'Connecting to local bridge…':'Local bridge disconnected'}</strong><span>{data?.session.state==='owned-connected'?'Owned game session connected':'No owned game session connected'}</span><span>{data?`${data.mode} mode`:'Mode unavailable'}</span></div>
      <div className="intelligence-environment"><BookOpen size={17}/><span><strong>Installed game · static information</strong><br/>{data?.environment.gameRoot?`HOI4 ${data.environment.version||'version unavailable'}`:'Game installation unavailable'}</span><details><summary>Installation & connection details</summary><p>{data?.session.reason||'Bridge has not returned session information.'}</p><p>{data?.environment.gameRoot||'Installation path unavailable'}</p><p>{data?.environment.configuration.status==='detected'?`${data.environment.configuration.enabledMods.length} configured mods (configuration is not proof of what a running game loaded).`:'Active playset unavailable.'}</p>{data?.environment.diagnostics.map((d,i)=><p key={i}>{d}</p>)}</details></div>
      <div className="intelligence-import"><label>File provenance<select value={origin} onChange={e=>setOrigin(e.target.value as RecordingOrigin)}><option value="recording">Recorded data (origin unverified)</option><option value="fixture">Offline test fixture</option></select></label><label className="intelligence-file"><Upload size={15}/>Open snapshot recording<input aria-label="Open snapshot recording" type="file" accept=".jsonl,.txt" disabled={busy} onChange={async e=>{
        const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy(true);
        try{if(file.size>700000)throw new Error('Recording exceeds the 700 KB viewer limit. Export a smaller session.');const result=await api<{snapshots:BridgeSnapshot[]}>('bridge/replay',{text:await file.text(),origin});setRecording({name:file.name,origin,snapshots:result.snapshots});setSelected('');setBaseline('');setError('');}
        catch(err){setError((err as Error).message);}finally{setBusy(false);}
      }}/></label>{recording&&<button className="button" onClick={()=>{setRecording(null);setSelected('');setBaseline('');}}>Return to bridge history</button>}</div>
      {recording&&<p className="notice">Viewing {recording.name} · {recording.origin==='fixture'?'Offline test fixture':'Imported recording; origin is not independently verified'}. This does not connect to HOI4 or update live state.</p>}
      {!snapshot?<div className="intelligence-empty"><h3>No campaign observations yet</h3><p>Open a bridge snapshot JSONL recording to review its history, or configure a telemetry reader. Observer Mode does not poll a mod log. Starting HOI4 alone does not connect an owned session.</p></div>:<>
        <div className="intelligence-selects"><label>Snapshot<select value={snapshot.id} onChange={e=>setSelected(e.target.value)}>{[...snapshots].reverse().map(s=><option key={s.id} value={s.id}>{label(s)}</option>)}</select></label><label>Compare with<select value={baseline} onChange={e=>setBaseline(e.target.value)}><option value="">Choose an earlier snapshot</option>{snapshots.filter(s=>s.id!==snapshot.id&&s.sessionId===snapshot.sessionId&&s.gameVersion===snapshot.gameVersion).map(s=><option key={s.id} value={s.id}>{label(s)}</option>)}</select></label></div>
        <div className="intelligence-evidence"><strong>{observationLabel(snapshot,data,recording?.origin??null,now)}</strong><span>Log data: {ageLabel(snapshot.observedAt,now)}</span><span>Session {snapshot.sessionId}</span></div>
        <dl className="intelligence-values"><div><dt>Last-observed country</dt><dd>{valueText(snapshot.values.country)}</dd></div><div><dt>Game date (engine text)</dt><dd>{valueText(snapshot.values.gameDate)}</dd></div><div><dt>Political power</dt><dd>{valueText(snapshot.values.politicalPower)}</dd></div><div><dt>Stability (fraction)</dt><dd>{valueText(snapshot.values.stability)}</dd></div><div><dt>Focus at capture</dt><dd>{valueText(focus?.current)}</dd><small>{focus?`${ageLabel(focus.observedAt,now)} · ${focus.verification==='unverified'?'Unverified recognition':'Recognized UI text'}`:'No supported focus observation'}</small></div></dl>
        <div className="button-row"><span>Static installed definitions:</span>{snapshot.values.country.status==='observed'&&<button className="button" onClick={()=>openEntry(snapshot.values.country.value!)}>Country reference</button>}{focus?.current.status==='observed'&&focus.current.value&&<button className="button" onClick={()=>openEntry(focus.current.value!)}>Focus reference</button>}</div>
        {previous&&<div className="intelligence-comparison" role="region" aria-label="Snapshot comparison"><h3>Change from comparison snapshot</h3>{comparison?comparison.map(c=><p key={c.key}>{c.key==='politicalPower'?'Political power':'Stability'}: {c.delta===null?'Unavailable':`${c.delta>=0?'+':''}${Number(c.delta.toFixed(6))}`}</p>):<p>Comparison unavailable across different sessions, countries or game versions.</p>}<p>Focus: {valueText(previous.focusObservation?.current)} → {valueText(focus?.current)}</p></div>}
        <details><summary>Observation provenance & unavailable fields</summary><p>Captured: {snapshot.observedAt} · Game version: {snapshot.gameVersion||'Unavailable'}</p><p>Log: {snapshot.source.path} · byte {snapshot.source.offset}</p><p>Source hash: {snapshot.source.hash}</p>{focus&&<p>Focus capture: {focus.observedAt} · OCR: {focus.source.text||'No text recognized'} · image hash: {focus.source.imageHash}</p>}<p>Unavailable: {snapshot.unavailable.join(', ')||'None reported for this schema'}</p><p>Log modification time is not proof of process liveness. No gameplay control is exposed here; native focus selection remains unverified.</p></details>
      </>}
    </>}
  </section>;
}
