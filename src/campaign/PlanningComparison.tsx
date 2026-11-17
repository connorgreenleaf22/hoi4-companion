import {useState,useRef,useEffect} from 'react';
import type {Profile,Entry} from '../types';
import type {StrategyContent} from '../ai-planning-types';
type CombatInputInspection=ReturnType<typeof import('../../server/combat-evaluation').inspectCombatInputs>;
import {api} from '../api';
import {EntryPicker} from '../EntryPicker';

export function PlanningComparison({profile,indexRevision,content,edit}:{profile:Profile;indexRevision:string;content:StrategyContent;edit:(value:StrategyContent)=>void}){
 const [query,setQuery]=useState(''),[entries,setEntries]=useState<Entry[]>([]);
 useEffect(()=>{let live=true;void api<{entries:Entry[]}>('entries?kind=unit&q='+encodeURIComponent(query)).then(v=>{if(live)setEntries(v.entries);}).catch(()=>{});return()=>{live=false;};},[query,indexRevision]);
 const [references,setReferences]=useState<string[]>([]),[result,setResult]=useState<{key:string;value:CombatInputInspection}>(),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const key=JSON.stringify([profile.id,indexRevision,content.alternatives,content.assumptions,references]);const latest=useRef(key);latest.current=key;
 const current=result?.key===key?result.value:undefined;
 async function review(){const requested=key;setBusy(true);setError('');try{const value=await api<CombatInputInspection>('campaign/comparison',{schemaVersion:1,expectedIndexRevision:indexRevision,references:references.map(reference=>({reference,kind:'unit'}))});if(latest.current===requested)setResult({key:requested,value});}catch(e){if(latest.current===requested)setError(String(e));}finally{setBusy(false);}}
 const alternative=(position:number,text:string)=>{const next=[...content.alternatives];while(next.length<2)next.push('');next[position]=text;edit({...content,alternatives:next});};
 return <details><summary>Compare preparation compositions</summary><p>Manual qualitative comparison. Enter composition, equipment choices and intended roles. These alternatives and assumptions save with this strategy. No calculated winner or optimization is available.</p>
  <div className="comparison-grid">{[0,1].map(i=><label key={i}>Composition {i===0?'A':'B'}<textarea aria-label={`Composition ${i===0?'A':'B'}`} value={content.alternatives[i]||''} maxLength={1500} onChange={e=>alternative(i,e.target.value)}/></label>)}</div>
  <label>Shared comparison assumptions<textarea aria-label="Comparison assumptions" value={content.assumptions.join('\n')} onChange={e=>edit({...content,assumptions:e.target.value.split('\n')})}/></label>
  <table aria-label="Qualitative preparation tradeoffs"><thead><tr><th>Review question</th><th>Player checks for both compositions</th></tr></thead><tbody><tr><td>Role and flexibility</td><td>Can each composition do the job you intend? State the expected opponent and terrain.</td></tr><tr><td>Production and replacements</td><td>Check actual equipment availability and replacement capacity; a larger equipment commitment may constrain other forces.</td></tr><tr><td>Mobility and logistics</td><td>If you add motorized or armored elements, verify fuel and supply for the chosen route. No consumption or speed is calculated.</td></tr><tr><td>Combat and resource totals</td><td>Unavailable for the current-patch all-DLC configuration. No attack, defense, organization, breakthrough, cost or winner is inferred.</td></tr></tbody></table>
  <EntryPicker label="Inspect composition source" query={query} onQuery={setQuery} entries={entries} onSelect={(entry:Entry)=>setReferences(previous=>[...new Set([...previous,'definition:'+entry.uid])].slice(0,12))}/>
  {references.map(ref=><button className="button" key={ref} onClick={()=>setReferences(v=>v.filter(r=>r!==ref))}>Remove {ref}</button>)}
  <button className="button" disabled={busy||!references.length} onClick={()=>void review()}>{busy?'Reviewing…':'Re-review selected source inputs'}</button>
  {error&&<p role="alert">{error}</p>}{current&&<section aria-label="Comparison source review"><p>{current.status}. Source input inspection does not qualify a division calculation.</p>{current.diagnostics.map((d,i)=><p key={i}>{d.message}</p>)}<p>Calculations remain unavailable for this campaign. Edit the alternatives above and use the manual tradeoff questions.</p><details><summary>Advanced source inspection</summary><pre>{JSON.stringify(current,null,2)}</pre></details></section>}
  {!current&&references.length>0&&<p>Review is missing or stale. Re-review after changes. A paid strategy revision always requires a separate preview and approval.</p>}
 </details>;
}
