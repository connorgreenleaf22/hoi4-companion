import type {AiContext} from '../ai-planning-types';

export function ContextBudgetView({context}:{context:AiContext}){
 const budget=context.contextBudget;if(!budget)return null;
 const number=(value:number)=>value.toLocaleString('en-US');
 return <section className="notice small" aria-label="Source context budget">
  <h3>Limited source selection</h3>
  <p>{context.references.length} definitions included. {budget.omittedGroups.length} optional source {budget.omittedGroups.length===1?'group was':'groups were'} left out by size or dependency limits. This selection does not establish complete strategy coverage.</p>
  <p>Requirements, costs and interpretation gaps remain intact in the included records. To prioritize a missing definition, add its exact reference under Expand source context locally and preview again.</p>
  <details><summary>Inspect selection limits and omissions</summary>
   <p>Source context: {number(budget.sourceCharacters)} / {number(budget.limitCharacters)} characters. Provider request body: {number(budget.wireBytes)} / {number(budget.limitWireBytes)} UTF-8 bytes.</p>
   <p>{budget.mandatoryReferences} required definitions retained; {budget.selectedGroups} optional groups included. The spending estimate and request ceiling remain separate controls.</p>
   {budget.omittedGroups.length>0&&<ul>{budget.omittedGroups.map((group,i)=><li key={group.reference+':'+i}><code>{group.reference}</code> — {group.reason==='payload-budget'?'complete group would exceed the size limit':'dependency expansion reached its limit'}</li>)}</ul>}
  </details>
 </section>;
}
