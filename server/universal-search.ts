import type {Entry} from '../src/types';
import type {Store} from './store';
import {matchName,normalizeName} from '../src/search-model';
import {summary,searchEntries,questionTerms} from './search';
type Candidate={uid:string;id:string;title:string;kind:string;aliases:string[];countries:string[]};
const caches=new WeakMap<Store,{revision:string;values:Candidate[]}>();
export function universalSearch(store:Store,params:URLSearchParams){
 const meta=store.getSetting<any>('meta',null),revision=meta?.indexRevision||'legacy',q=(params.get('q')||'').slice(0,200),kind=params.get('kind'),country=params.get('country'),context=params.get('contextCountry');
 let cache=caches.get(store);
 if(!cache||cache.revision!==revision){
  const rows=store.db.prepare("SELECT uid,id,title,kind,json_extract(payload,'$.data.aliases') aliases,json_extract(payload,'$.data.countries') countries FROM entries").all();
  cache={revision,values:rows.map(r=>({uid:String(r.uid),id:String(r.id),title:String(r.title),kind:String(r.kind),aliases:JSON.parse(String(r.aliases||'[]')),countries:JSON.parse(String(r.countries||'[]'))}))};caches.set(store,cache);
 }
 const relevant=(e:Candidate,tag:string)=>e.id===tag||e.id.startsWith(tag+'_')||e.countries.includes(tag);
 const candidates=cache.values.filter(e=>(!kind||e.kind===kind)&&(!country||relevant(e,country)));
 const find=(spelling:boolean)=>candidates.flatMap(e=>{const m=matchName(q,e,spelling);return m?[{e,...m,rank:m.score+(context&&relevant(e,context)?5:0)}]:[];});
 let hits=find(false);if(!hits.length)hits=find(true);hits.sort((a,b)=>b.rank-a.rank||a.e.title.localeCompare(b.e.title)||a.e.uid.localeCompare(b.e.uid));

 if(!hits.length&&questionTerms(q).intent)return searchEntries(store,params);
 const limit=Math.max(1,Math.min(100,Number(params.get('limit'))||40)),offset=Math.max(0,Math.min(100000,Number(params.get('offset'))||0));
 return {total:hits.length,indexRevision:revision,entries:hits.slice(offset,offset+limit).map(h=>{const entry=summary(store.entry('definition:'+h.e.uid)!);return {...entry,data:{...entry.data,searchMatch:{name:h.matchedName,spelling:h.spelling,ambiguous:hits.some(other=>other.e.uid!==h.e.uid&&normalizeName(other.matchedName)===normalizeName(h.matchedName)),contextRelevant:!!context&&relevant(h.e,context)}} as Entry['data']};}),facets:{kinds:[...new Set(hits.map(h=>h.e.kind))].map(kind=>({kind,total:hits.filter(h=>h.e.kind===kind).length}))},sourceScope:'Base-game index; detected mod overrides are not merged.'};
}
