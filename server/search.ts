import {entryMechanics,explanationPreview,referenceTitle} from '../src/mechanics';
import type {Store} from './store';
import type {Entry} from '../src/types';
import {declaredYearWhitespaceCodePoints} from '../src/year';

export function summary(e:Entry):Entry{
  const {script,nodes,...data}=e.data;if(['decision','technology'].includes(e.kind)){const value=entryMechanics(e);data.mechanicPreview=explanationPreview(value.summary,2);data.mechanicCosts=value.summary.filter(x=>x.role==='cost'||x.role==='timing');data.mechanicTitle=referenceTitle(e);}return {...e,data};
}
const stopWords=new Set('what which who how when where why do does did can could would should i we you the a an is are was were to for of this that these those my me please unlock unlocks unlocked enable enables enabled gives give get grants grant change changes recruit recruits recruitment become becoming need needs required requirement requirements research researches reward rewards effect effects bonus bonuses stats improve improves much cost costs price prices happen happens happened occur occurs after afterward afterwards before next then'.split(' '));
export function questionTerms(q:string){
  const literalTerms:string[]=q.normalize('NFKC').match(/[\p{L}\p{N}_]+/gu)||[];
  const words=new Set(literalTerms.map(t=>t.toLowerCase()));
  const has=(terms:string[])=>terms.some(t=>words.has(t));
  const intent=has(['unlock','unlocks','unlocked','enable','enables','research'])?'unlock':has(['recruit','recruits','leader','become'])?'character':has(['cost','costs','price','prices'])?'cost':has(['happen','happens','happened','after','before','next'])?'event-chain':has(['bonus','bonuses','change','changes','reward','rewards','effect','effects','give','gives'])?'effects':undefined;
  const question=has(['what','which','who','how','when','where','why']);
  const terms=question||intent?literalTerms.filter(t=>!stopWords.has(t.toLowerCase())):literalTerms;
  return {terms,literalTerms,intent};
}
export function searchEntries(store:Store,params:URLSearchParams){
  const q=(params.get('q')||'').slice(0,200),kind=(params.get('kind')||'').slice(0,100),country=params.get('country')||'',year=params.get('year')||'',dlc=params.get('dlc')||'',id=params.get('id')||'';
  const limit=Math.max(1,Math.min(100,Number(params.get('limit'))||40));const offset=Math.max(0,Math.min(100000,Number(params.get('offset'))||0));
  const {terms,literalTerms,intent}=questionTerms(q);
  // Prefer literal names/IDs. A recognized question or short intent can retry its subject terms.
  // Exact numeric tokens distinguish event 1 from events 10/11 without guessing event behavior.
  const expression=(tokens:string[])=>tokens.map(t=>`"${t}"${/^\d+$/.test(t)?'':'*'}`).join(' AND ');
  const conditions:string[]=[];const args:(string|number)[]=[];
  if(id){conditions.push('e.id=?');args.push(id);}
  if(kind){conditions.push('e.kind=?');args.push(kind);}
  if(country){conditions.push("(json_extract(e.payload,'$.data.tag')=? OR e.id LIKE ? OR EXISTS(SELECT 1 FROM json_each(json_extract(e.payload,'$.data.countries')) WHERE value=?))");args.push(country,country+'_%',country);}
  if(year){
    if(!/^\d{4}$/.test(year))throw new Error('Use a four-digit year filter.');
    const primary="json_extract(e.payload,'$.data.year')",fallback="json_extract(e.payload,'$.data.stats.start_year')";
    const raw=`COALESCE(${primary},${fallback})`;
    const type=`CASE WHEN ${primary} IS NOT NULL THEN json_type(e.payload,'$.data.year') ELSE json_type(e.payload,'$.data.stats.start_year') END`;
    const trimmed=`trim(${raw},char(${declaredYearWhitespaceCodePoints.join(',')}))`;
    // JSON extraction preserves text/number types; normalize numeric text before equality.
    // Validate before casting so unknowns, booleans and '1936x' cannot become a year.
    const normalized=`CASE WHEN (${type}) IN ('integer','real') THEN ${raw} WHEN (${type})='text' AND instr(${raw},char(0))=0 AND json_valid(${trimmed}) THEN CASE WHEN json_type(${trimmed}) IN ('integer','real') THEN CAST(${trimmed} AS REAL) END END`;
    conditions.push(`(${normalized})=?`);args.push(Number(year));
  }
  if(dlc){conditions.push("(EXISTS(SELECT 1 FROM json_each(json_extract(e.payload,'$.data.dlcs')) WHERE value=?) OR e.id=?)");args.push(dlc,dlc);}
  const plan=(tokens:string[])=>{
    const query=id?'':expression(tokens),table=query?'search JOIN entries e ON search.uid=e.uid':'entries e';
    const clauses=[...(query?['search MATCH ?']:[]),...conditions],values=[...(query?[query]:[]),...args];
    const where=clauses.length?'WHERE '+clauses.join(' AND '):'';
    return {query,table,where,values,total:Number(store.db.prepare(`SELECT COUNT(*) AS total FROM ${table} ${where}`).get(...values)?.total||0)};
  };
  let usedTerms=literalTerms,result=plan(literalTerms);
  if(!id&&!result.total&&terms.length&&JSON.stringify(terms)!==JSON.stringify(literalTerms)){usedTerms=terms;result=plan(terms);}
  const {query,table,where,values,total}=result;
  const rows=store.db.prepare(`SELECT e.payload FROM ${table} ${where} ORDER BY ${query?'rank,':''}e.title,e.uid LIMIT ? OFFSET ?`).all(...values,limit,offset);
  const kinds=store.db.prepare(`SELECT e.kind AS kind,COUNT(*) AS total FROM ${table} ${where} GROUP BY e.kind ORDER BY e.kind`).all(...values);
  return {total,entries:rows.map(r=>summary(JSON.parse(r.payload as string))),indexRevision:store.getSetting<any>('meta',null)?.indexRevision||'legacy',facets:{kinds:kinds.map(r=>({kind:r.kind,total:Number(r.total)}))},question:intent?{intent,terms:usedTerms,verification:'Source declarations; inspect exact relationships and conditions. Engine applicability may remain unknown.'}:undefined};
}
