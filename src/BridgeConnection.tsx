import {useEffect,useState} from 'react';
import {api} from './api';
import type {IntegrationStatus,GameObservation} from './integration-types';

export function BridgeConnection(){
 const [status,setStatus]=useState<IntegrationStatus|null>(null),[source,setSource]=useState('detected-log'),[path,setPath]=useState(''),[save,setSave]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const refresh=async()=>{try{setStatus(await api('bridge/platform/status'));}catch(e){setError(String(e));}};
 useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>clearInterval(timer);},[]);
 const call=async(tool:string,args:unknown={})=>{setBusy(true);setError('');try{await api('bridge/platform',{tool,args});await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const saves=status?.observations.filter(o=>o.source.kind!=='telemetry')||[];
 return <details className="bridge-connection" aria-label="Game integration connection"><summary>Connect game observations · {status?.connection.state||'checking'}</summary>
  <p>Monitor supported telemetry or inspect a plaintext save. Installed references and your manual planning assumptions stay separate. The app works with HOI4 closed.</p>
  {error&&<p role="alert">{error}</p>}<p role="status">{status?.connection.reason}</p>
  <div className="intelligence-selects"><label>Observation source<select value={source} onChange={e=>setSource(e.target.value)}><option value="detected-log">Detected game log (ownership unverified)</option><option value="log">Choose game.log path (ownership unverified)</option><option value="owned">Owned read-only session manifest</option></select></label>
  {source!=='detected-log'&&<label>Observation source path<input value={path} onChange={e=>setPath(e.target.value)} placeholder="Absolute local path"/></label>}</div>
  <p>Detected log: {status?.detected.logPath||'Unavailable'}. A recent log alone is historical evidence, not proof of a running owned game.</p>
  <div className="button-row"><button className="button" disabled={busy||status?.connection.state==='stopped'} onClick={()=>void call('hoi4_bridge_connect',{source,...(source!=='detected-log'?{path}:{})})}>Connect read-only observations</button><button className="button" disabled={busy} onClick={()=>void call('hoi4_bridge_disconnect')}>Disconnect observations</button><button className="button" disabled={busy} onClick={()=>void refresh()}>Check connection</button></div>
  <p>{status?.connection.polling?'Monitoring every five seconds.':'Monitoring inactive.'} Last poll: {status?.connection.lastPollAt||'None'}. Verified live state additionally requires owned-session proof and field qualification.</p>
  <label>Plaintext save path<input value={save} onChange={e=>setSave(e.target.value)} placeholder="Absolute path to a disposable .hoi4 save"/></label><button className="button" disabled={busy||!save} onClick={()=>void call('hoi4_bridge_save_inspect',{path:save})}>Inspect save read-only</button>
  <p>Save-derived state is historical and remains unqualified where independent checks are missing. Binary and compressed saves are unsupported. Originals are never modified.</p>
  {saves.map(observation=><SaveObservation key={observation.id} observation={observation}/>)}
  <details><summary>Capabilities and MCP diagnostics</summary><p>MCP connection descriptor: {status?.mcp?.connectionFile||'Unavailable'}. Keep this credential file local. Command execution is disabled.</p><ul>{status?.capabilities.map(c=><li key={c.id}>{c.id}: {c.qualification} — {c.reason}</li>)}</ul>{status?.diagnostics.map(d=><p key={d}>{d}</p>)}</details>
  <button className="button danger" disabled={busy||status?.connection.state==='stopped'} onClick={()=>void call('hoi4_bridge_emergency_stop')}>Emergency stop integration</button><p>Stops monitoring and latches the shared command stop. It does not undo actions or close a regular game. This latch persists after restart.</p>
 </details>;
}
function SaveObservation({observation:o}:{observation:GameObservation}){return <details aria-label="Save-derived observation"><summary>{o.classification==='save-derived'?'Save-derived':o.classification} · {o.country} · {o.gameDate}</summary><p>Field-specific confidence shown below · HOI4 {o.gameVersion}</p><dl>{Object.entries(o.fields).map(([id,f])=><div key={id}><dt>{id}</dt><dd>{f.status==='available'?typeof f.value==='object'?JSON.stringify(f.value):String(f.value):'Unavailable'} · {f.qualification}</dd><dd>{f.reason}{f.location?` · ${f.location.path}:${f.location.line}`:''}</dd></div>)}</dl><p>Source: {o.source.path} · SHA256 {o.source.hash} · file timestamp {o.capturedAt}</p><p>{o.limitations.join('. ')}</p></details>;}
