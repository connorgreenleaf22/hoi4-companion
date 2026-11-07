import type {Entry,RequirementResult} from './types';
import {entryMechanics,requirementExplanation,explanationPreview,type Explanation,type NameLookup,type ExplanationStatus} from './mechanics';
import {conditionSentence} from './mechanics-interpreter';
import {formatScript} from '../server/parser';
import {conditionState,conditionText} from './planner/condition-state';
export const explanationLabels:Record<ExplanationStatus,string>={explained:'Explained',conditional:'Conditional outcome','state-unknown':'Current condition unknown','missing-localization':'Name unavailable',unsupported:'Scripting not supported','ambiguous-scope':'Target unclear','parser-limitation':'Parser limitation'};
export function ExplanationList({items}:{items:Explanation[]}){return <ul className="mechanics-list">{items.map((item,i)=><li key={i} className={item.unknown?'mechanics-unknown':''}>{item.text}{item.children?.length?<ExplanationList items={item.children}/>:null}</li>)}</ul>;}
export function MechanicsView({entry,lookup,compact=false}:{entry:Entry;lookup?:NameLookup;compact?:boolean}){
 const value=entryMechanics(entry,lookup),preview=explanationPreview(value.summary,compact?3:5),costs=value.summary.filter(e=>e.role==='cost'||e.role==='timing');
 const flatten=(items:Explanation[]):Explanation[]=>items.flatMap(e=>[e,...flatten(e.children||[])]);
 const all=flatten([...value.summary,...value.requirements]);const problems=all.filter(e=>e.unknown||e.status==='missing-localization');
 const statuses=[...new Set(problems.map(e=>e.status||'unsupported'))];
 const semantic=preview.length>0;
 return <section aria-label="Game mechanics explained" className={compact?'mechanics-compact':''}>
  <h4>What it does</h4><div className="mechanics-costs">{costs.map((e,i)=><span key={i}>{e.text}</span>)}</div>
  <ExplanationList items={preview.length?preview:[{text:'No reliable outcome summary yet; the specific unsupported constructs are listed below.',status:'unsupported',unknown:true}]}/>
  <div className="explanation-status" aria-label="Explanation status">{semantic&&<span>{all.some(e=>e.status==='conditional')?'Conditionally explained':'Explained effects'}</span>}{statuses.map(s=><span key={s}>{explanationLabels[s]}</span>)}</div>
  {!!value.requirements.length&&<><h4>What it requires</h4><p className="requirement-preview">{conditionSentence(value.requirements.find(e=>e.code==='allowed')||value.requirements[0])}</p><p className="muted">Source rules only — current campaign conditions are not checked. Full eligibility, visibility and target rules are in details.</p></>}
  {compact?<details className="compact-mechanics-details"><summary>More effects, requirements and limitations</summary><MechanicsDetails value={value} problems={problems} all={all}/></details>:<MechanicsDetails value={value} problems={problems} all={all}/>}
  {!compact&&<p className="muted">Installed source definitions; campaign modifiers and final outcomes are not simulated.</p>}
  {(Object.keys(entry.data.mechanicScripts||{}).length>0||Object.keys(entry.data.mechanicDynamicModifiers||{}).length>0)&&<details><summary>Linked reward sources and provenance</summary>{Object.entries({...entry.data.mechanicScripts,...entry.data.mechanicDynamicModifiers}).map(([id,s]:[string,any])=><details key={id}><summary>{entry.data.mechanicNames?.[id]||id}</summary><p>{id} · {s.source}:{s.line} · HOI4 {s.version} · SHA256 {s.hash}</p>{s.ambiguous||s.recovered||s.limited?<p>Ambiguous, recovered or bounded-out source; expansion unavailable.</p>:<pre>{formatScript(s.nodes||[])}</pre>}</details>)}</details>}
 </section>;
}

function MechanicsDetails({value,problems,all}:{value:ReturnType<typeof entryMechanics>;problems:Explanation[];all:Explanation[]}){return <>  {!!value.requirements.length&&<><details><summary>Requirements and detailed mechanics</summary><ExplanationList items={value.requirements}/></details></>}
  <details><summary>Effect details and conditions</summary><ExplanationList items={value.summary}/></details>
  {(problems.length>0||all.some(e=>e.role==='administrative'||e.role==='tooltip'))&&<details className="mechanics-diagnostics"><summary>Explanation limitations and technical evidence</summary><p>Known rules with unknown campaign values are not unsupported scripts. Tooltips and bookkeeping do not count as explained benefits.</p>{[...new Map(problems.map(e=>[e.code+'|'+e.status,e])).values()].map((e,i)=><p key={i}><strong>{explanationLabels[e.status||'unsupported']}</strong>: {e.text} <code>{e.code}</code>{e.line?` · line ${e.line}`:''}</p>)}{all.filter(e=>e.role==='administrative').map((e,i)=><p key={'flag'+i}>{e.text} <code>{e.code}</code> · line {e.line}</p>)}</details>}
</>;}

export function RequirementView({result,lookup=(id:string)=>id}:{result:RequirementResult;lookup?:NameLookup}){return <div className="plain-requirement"><span className={`cp-truth ${result.truth}`}>{conditionText[conditionState(result)]}</span><p>{requirementExplanation(result,lookup)}</p>{!!result.assumptions.length&&<p className="mechanics-unknown">Planning assumption: {result.assumptions.join(' ')}</p>}{!result.scope?.length&&result.role!=='outcome'&&result.children.map((c,i)=><RequirementView key={i} result={c} lookup={lookup}/>)}<details><summary>Advanced condition evidence</summary><p>{result.reason}</p><code>{result.key} {result.op} {result.value}</code>{result.source&&<p>{result.source.source}:{result.source.line} · {result.source.gameVersion}</p>}</details></div>;}
