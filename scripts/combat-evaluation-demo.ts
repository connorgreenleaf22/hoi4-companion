import {compareCombatDesigns,inspectCombatInputs} from '../server/combat-evaluation';
import {combatSource,combatPairs,scenario,candidates,supportReferences} from '../tests/fixtures/combat-evaluation/corpus';
const source=combatSource();
const comparisons=combatPairs.map(pair=>({purpose:pair.purpose,...compareCombatDesigns(source,candidates.find(c=>c.id===pair.left),candidates.find(c=>c.id===pair.right),scenario)}));
const supports=inspectCombatInputs(source,{schemaVersion:1,expectedIndexRevision:scenario.indexRevision,references:supportReferences});
if(comparisons.some(c=>c.status!=='partial')||supports.status!=='inputs-qualified')throw Error('Source-backed comparison failed.');
if(process.argv.includes('--json'))console.log(JSON.stringify({schemaVersion:1,delivery:'partial',qualifiedDivisionCombatMetrics:0,comparisons,supportInputAudit:supports},null,2));
else {
  console.log('M7.4.2b PARTIAL: source declarations qualified; division aggregation rules unqualified.');
  for(const pair of comparisons){
    console.log('\n'+pair.purpose);
    console.table([pair.left,pair.right].map(r=>({candidate:r.request!.design.candidate.name,...r.resourceEvaluation!.totals!.perDivision,equipment:JSON.stringify(r.resourceEvaluation!.totals!.perDivision.equipment),organization:'unsupported',softAttack:'unsupported',hardAttack:'unsupported',defense:'unsupported',breakthrough:'unsupported'})));
    console.log(pair.inferences.join('\n'));
  }
  console.log('\nSupport artillery, engineer and recon declarations are inspectable; their division contributions remain unsupported.');
  console.log('Use --json for source hashes/lines, per-metric dependencies, raw input declarations and resource breakdowns. No combat-effectiveness ranking is available.');
}
