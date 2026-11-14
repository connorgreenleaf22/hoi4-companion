import {compareDesigns,evaluateDesign} from '../server/design-evaluation';
import {fixtureSource,scenario,candidates,comparisonPairs} from '../tests/fixtures/design-evaluation/corpus';
const source=fixtureSource();
const results=candidates.map(candidate=>evaluateDesign(source,{schemaVersion:1,candidate,scenario}));
const comparisons=comparisonPairs.map(([left,right])=>compareDesigns(source,candidates.find(c=>c.id===left),candidates.find(c=>c.id===right),scenario));
if(results.some(r=>r.status!=='evaluated')||comparisons.some(c=>c.status!=='compared'))throw Error('Qualified corpus evaluation failed.');
if(process.argv.includes('--json'))console.log(JSON.stringify({schemaVersion:1,origin:'Installed-source numeric fixtures; manual counterfactual; no game or provider calls',results,comparisons},null,2));
else {
  console.log('HOI4 1.19.4.2 — unmodified base requirements; No Step Back disabled; no mods.');
  console.table(results.map(r=>({candidate:r.request!.candidate.name,width:r.totals!.perDivision.combatWidth,manpower:r.totals!.perDivision.manpower,IC:r.totals!.perDivision.industrialCost})));
  console.table(comparisons.map(c=>({from:c.left.request!.candidate.id,to:c.right.request!.candidate.id,widthChange:c.deltaRightMinusLeft!.combatWidth,manpowerChange:c.deltaRightMinusLeft!.manpower,ICChange:c.deltaRightMinusLeft!.industrialCost})));
  console.log(results[0].assessment+'\n'+results[0].assumptions.join('\n'));
  console.log('Use --json for complete inputs, per-unit breakdowns, equipment quantities, hashes, source lines and unsupported metrics.');
}
