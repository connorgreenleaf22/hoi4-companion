import {useEffect,useState} from 'react';
import type {Entry} from './types';
import {EntryPicker} from './EntryPicker';
import {api} from './api';
export function UniversalSearch({query,onQuery,country,indexRevision,onOpen,onAll}:{query:string;onQuery:(q:string)=>void;country?:string;indexRevision?:string;onOpen:(ref:string)=>void;onAll:()=>void}){
 const [result,setResult]=useState<{key:string;entries:Entry[]}>(),[busy,setBusy]=useState(false),[error,setError]=useState('');const key=JSON.stringify([query,country,indexRevision]);
 useEffect(()=>{let live=true;setError('');setBusy(false);if(!query.trim())return;setBusy(true);const timer=setTimeout(()=>{api<{entries:Entry[]}>(`search?q=${encodeURIComponent(query)}&contextCountry=${country||''}&limit=12`).then(value=>{if(live)setResult({key,entries:value.entries});}).catch(()=>{if(live)setError('Search could not load. Check Sources & settings or try again.');}).finally(()=>{if(live)setBusy(false);});},120);return()=>{live=false;clearTimeout(timer);};},[key]);
 return <div className="universal-search"><EntryPicker label="Search all game content" query={query} onQuery={onQuery} entries={result?.key===key?result.entries:[]} busy={busy} onSelect={e=>onOpen('definition:'+e.uid)} onAll={onAll}/>{error&&<p role="alert">{error}</p>}</div>;
}
