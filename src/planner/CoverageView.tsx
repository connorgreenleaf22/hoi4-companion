import type {PlanCoverage} from '../planning-coverage-types';
export function CoverageView({value,openEntry}:{value:PlanCoverage;openEntry:(ref:string)=>void}){
 return <section aria-label="Planning coverage review" className="notice small planning-coverage">
  <strong>{value.label==='needs-correction'?'Plan needs correction':'Provisional plan — not a validated strategy'}</strong>
  <p>Sequence structure: {value.structuralValidity}. {value.policy.blockingGapCount} interpretation or campaign checks remain. Confident ranking and numerical optimization are unavailable.</p>
  <p>You can edit this plan. Review again after changing its steps or source references.</p>
  <details><summary>Coverage gaps and source evidence</summary>
   <p>Priorities combine distinct affected definitions with strategic significance. These are engineering priorities, not strategy scores. A rare civil-war risk takes precedence over cosmetic gaps.</p>
   <ul>{value.priorities.map(p=><li key={p.category}>{p.severity}: {p.category} — {p.affectedDefinitions} affected references</li>)}</ul>
   <p>Reviewed means no significant gap was found within this submitted scope; it does not mean campaign eligibility or an optimal outcome.</p>
   <ul>{Object.entries(value.dimensions).map(([dimension,state])=><li key={dimension}>{dimension}: {state}</li>)}</ul>
   {value.gaps.map((g,i)=><details key={i}><summary>{g.severity} · {g.dimension} · {g.message}</summary><p>{g.kind} · <code>{g.code}</code></p>{!!g.context.length&&<p>{g.context.join(' → ')}</p>}<button className="text-link" onClick={()=>openEntry(g.reference)}>Inspect affected reference</button>{g.evidence.map((e,j)=><p key={j}>{e.source}:{e.line} · {e.version} · SHA256 {e.hash}</p>)}</details>)}
   {!!value.events.length&&<><h4>Unresolved event consequences</h4>{value.events.map(e=><p key={e.id}>{e.reference?<button className="text-link" onClick={()=>openEntry(e.reference!)}>{e.title||e.id}</button>:e.id} — choices and later effects require review.</p>)}</>}
   <p>{value.policy.reasons.join(' ')}</p>
  </details>
 </section>;
}
