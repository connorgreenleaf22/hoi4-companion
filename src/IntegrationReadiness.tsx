import {useEffect,useState} from 'react';
import {api} from './api';
import type {IntegrationStatus} from './integration-types';
import {fieldValue,observationLabel,summarizeIntegration} from './integration-readiness';
import './integration-readiness.css';

export function IntegrationReadiness({onOpenConnection}:{onOpenConnection:()=>void}){
 const [status,setStatus]=useState<IntegrationStatus>(),[error,setError]=useState(''),[checked,setChecked]=useState('');
 useEffect(()=>{let alive=true,busy=false;const refresh=async()=>{if(busy)return;busy=true;try{const next=await api<IntegrationStatus>('bridge/platform/status');if(alive){setStatus(next);setChecked(new Date().toISOString());setError('');}}catch{if(alive){setStatus(undefined);setError('Observation connection could not be checked.');}}finally{busy=false;}};void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>{alive=false;clearInterval(timer);};},[]);
 const summary=status?summarizeIntegration(status):undefined,o=summary?.observation;
 return <details className="integration-readiness"><summary><span className="integration-signal" aria-hidden="true"/>{error?'Observation status unavailable':summary?.label||'Checking observation connection…'}</summary>
   {error&&<p role="status">{error}</p>}
   <p>{status?.connection.reason||'The companion works offline with installed references and your saved plans.'}</p>
   {checked&&<p>Last successful connection check: {checked}. Capture time below describes the record; checking the connection does not refresh that record.</p>}
   {o?<><p><strong>{observationLabel(o)}</strong> · {o.country||'Country unknown'} · {o.gameDate||'Date unavailable'}</p><p>Source: {o.source.kind} · HOI4 {o.gameVersion||'version unknown'} · Captured {o.capturedAt}. {summary?.versionMismatch&&<strong>Version differs from the detected installation. Do not treat these fields as qualified for the current game.</strong>}</p>
     <p>{summary?.available.length} available fields in this record. Availability and native qualification are shown separately.</p>
     <dl>{summary?.available.map(([id,field])=><div key={id}><dt>{id.replaceAll('_',' ')}</dt><dd>{fieldValue(field.value)} · {field.qualification}</dd><dd>{field.reason}</dd></div>)}</dl>
     {!!summary?.unavailable.length&&<details><summary>{summary.unavailable.length} unavailable fields</summary><ul>{summary.unavailable.map(([id,field])=><li key={id}>{id}: {field.reason}</li>)}</ul></details>}
     {o.limitations.length>0&&<ul>{o.limitations.map((text,index)=><li key={index}>{text}</li>)}</ul>}
   </>:<p>No captured campaign record is available. The selected planning campaign does not establish which country you are playing.</p>}
   <p>Game hover targets and process memory are not connected. Production queues, supply, armies and diplomacy are not fully observed.</p>
   {!!status?.capabilities.length&&<details><summary>What can the bridge access?</summary><ul>{status.capabilities.map(c=><li key={c.id}><strong>{c.id}</strong> · {c.available?'Available':'Unavailable'} · {c.qualification}<br/>{c.reason}</li>)}</ul></details>}
   <button type="button" onClick={onOpenConnection}>Open connection tools</button>
 </details>;
}
