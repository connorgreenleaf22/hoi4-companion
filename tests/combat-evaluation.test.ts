import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateCombatDesign,compareCombatDesigns,inspectCombatInputs,combatResultIsCurrent} from '../server/combat-evaluation';
import {evaluateDesign} from '../server/design-evaluation';
import {digest} from '../server/design-evaluation/source';
import {projectCombatInput} from '../server/combat-evaluation/source';
import {combatEntries,combatSource,combatPairs,scenario,candidates,supportReferences,meta,reference} from './fixtures/combat-evaluation/corpus';
import golden from './fixtures/design-evaluation/golden.json';
const request=()=>({schemaVersion:1,design:{schemaVersion:1,candidate:structuredClone(candidates[2]),scenario:structuredClone(scenario)}});
test('base resource benchmarks remain unchanged for all seven candidates; combat totals never fabricated',()=>{
  const source=combatSource();
  for(const candidate of candidates){
    const r=evaluateCombatDesign(source,{schemaVersion:1,design:{schemaVersion:1,candidate,scenario}});
    assert.equal(r.status,'partial',JSON.stringify(r.diagnostics));assert.equal(r.qualifiedCombatMetricCount,0);
    const {equipment,...numbers}=r.resourceEvaluation!.totals!.perDivision;
    const {equipment:_,...expected}=golden.candidates[candidate.id as keyof typeof golden.candidates];assert.deepEqual(numbers,expected);
    assert.deepEqual(r.resourceEvaluation,evaluateDesign(source,r.request!.design));
    assert.ok(r.inputs.length>0);assert.equal(Object.keys(r.metrics).length,5);
    for(const metric of Object.values(r.metrics)){assert.equal(metric.status,'unsupported');assert.equal(metric.value,null);assert.ok(metric.reason&&metric.dependencies.length&&metric.inputReferences.length);}
    assert.ok(r.inputs.every(i=>i.evidence.hash.length===64&&i.projectionDigest.length===64));
    assert.equal(combatResultIsCurrent(source,JSON.parse(JSON.stringify(r))),true);
    assert.deepEqual(evaluateCombatDesign(source,JSON.parse(JSON.stringify(r.request))),r);
  }
});
test('three representative comparisons expose qualified resource deltas but null combat deltas',()=>{
  for(const pair of combatPairs){
    const result=compareCombatDesigns(combatSource(),candidates.find(c=>c.id===pair.left),candidates.find(c=>c.id===pair.right),scenario);
    assert.equal(result.status,'partial');assert.equal(result.resourceComparison!.status,'compared');
    const expected=golden.comparisons.find(p=>p.left===pair.left&&p.right===pair.right)!;
    const {equipment,...delta}=result.resourceComparison!.deltaRightMinusLeft!;assert.deepEqual(delta,{combatWidth:expected.combatWidth,manpower:expected.manpower,industrialCost:expected.industrialCost});
    assert.ok(Object.values(result.combatDelta).every(v=>v===null));assert.match(result.inferences.join(' '),/No division combat-stat totals/);
  }
});
test('declared organization/equipment values are source facts, absent fields remain null',()=>{
  const r=evaluateCombatDesign(combatSource(),request());
  const infantry=r.inputs.find(i=>i.id==='infantry')!,gun=r.inputs.find(i=>i.id==='artillery_equipment')!;
  assert.deepEqual(infantry.declarations.max_organisation,{status:'declared',value:60});
  assert.deepEqual(infantry.declarations.soft_attack,{status:'not-declared',value:null});
  assert.equal(gun.declarations.soft_attack.status,'declared');assert.equal(r.metrics.softAttack.value,null);
  assert.equal(r.inputs.every(i=>i.interpretation.includes('not a battalion or division')),true);
  for(const e of combatEntries.filter(e=>['unit','equipment'].includes(e.kind)))assert.equal(digest(projectCombatInput(e)),digest(projectCombatInput(projectCombatInput(e))));
});
test('three support inputs preserve category effects and essential equipment without applying them',()=>{
  const r=inspectCombatInputs(combatSource(),{schemaVersion:1,expectedIndexRevision:scenario.indexRevision,references:supportReferences});
  assert.equal(r.status,'inputs-qualified');assert.equal(r.divisionAggregationQualified,false);assert.equal(r.inputs.length,3);
  const artillery=r.inputs.find(i=>i.id==='artillery')!,engineer=r.inputs.find(i=>i.id==='engineer')!,recon=r.inputs.find(i=>i.id==='recon')!;
  assert.equal(artillery.declarations.soft_attack.value,-.5);assert.equal(artillery.declarations.max_organisation.value,0);
  assert.deepEqual(artillery.equipmentRequirements,{artillery_equipment:12});assert.equal(engineer.equipmentRequirements!.support_equipment,30);
  assert.ok(engineer.context.some(n=>n.key==='essential'));assert.ok(recon.context.some(n=>n.key==='battalion_mult'));assert.ok(engineer.context.some(n=>n.key==='battalion_mult'));
  const candidate=structuredClone(candidates[0]);candidate.rows.push({unit:supportReferences[0].reference,count:1});
  const result=evaluateCombatDesign(combatSource(),{schemaVersion:1,design:{schemaVersion:1,candidate,scenario}});
  assert.equal(result.status,'rejected');assert.equal(result.resourceEvaluation!.totals,null);assert.ok(result.inputs.length===0);
});
const bad:[string,(r:any)=>void][]=[
  ['unsupported doctrine',r=>r.design.scenario.doctrine='superior_firepower'],['country modifier',r=>r.design.scenario.modifiers=[{soft_attack:.2}]],
  ['designer variant',r=>r.design.candidate.equipment[0].modules=[]],['fractional count',r=>r.design.candidate.rows[0].count=1.5],
  ['empty row set',r=>r.design.candidate.rows=[]],['mixed equipment',r=>r.design.candidate.equipment[0].share=.5],
  ['caller certification',r=>r.divisionAggregationQualified=true],['fake metric result',r=>r.design.metrics={organization:60}],
  ['terrain input',r=>r.terrain='plains'],['simulator execution',r=>r.execution='simulate'],
  ['missing tech',r=>r.design.scenario.researchedTechnologies=[]],['unknown version',r=>r.schemaVersion=2]
];
for(const [label,mutate] of bad)test('rejects '+label,()=>{const input=request();mutate(input);const r=evaluateCombatDesign(combatSource(),input);assert.equal(r.status,'rejected');assert.equal(r.fingerprint,null);assert.ok(Object.values(r.metrics).every(m=>m.value===null));});
test('changed combat-only fields invalidate even when the retained resource projection still matches',()=>{
  const records=structuredClone(combatEntries);records.find(e=>e.id==='infantry')!.data.stats.max_organisation=61;
  const source=combatSource(records);assert.equal(evaluateDesign(source,request().design).status,'evaluated');
  const result=evaluateCombatDesign(source,request());assert.equal(result.status,'source-invalidated');assert.equal(result.fingerprint,null);assert.equal(result.inputs.length,0);
  assert.equal(combatResultIsCurrent(source,evaluateCombatDesign(combatSource(),request())),false);
});
test('hash, missing input, version and index changes cannot reuse a combat-input result',()=>{
  for(const change of ['hash','missing-field','equipment','version','importer','index']){
    const records=structuredClone(combatEntries),metadata=structuredClone(meta);
    if(change==='hash')records[0].hash='0'.repeat(64);
    if(change==='missing-field')delete records[0].data.stats.max_organisation;
    if(change==='equipment')records.find(e=>e.id==='artillery_equipment')!.data.stats.defense=999;
    if(change==='version')metadata.gameVersion='1.20.0';if(change==='importer')metadata.importerRevision=6;if(change==='index')metadata.indexRevision='changed';
    assert.equal(evaluateCombatDesign(combatSource(records,metadata),request()).status,'source-invalidated');
  }
  const result=evaluateCombatDesign(combatSource(),request());result.metrics.organization={...result.metrics.organization,value:60} as any;assert.equal(combatResultIsCurrent(combatSource(),result),false);
});
test('inspection refuses malformed, stale, unqualified, ambiguous and mutated support sources',()=>{
  const input={schemaVersion:1,expectedIndexRevision:scenario.indexRevision,references:supportReferences};
  assert.equal(inspectCombatInputs(combatSource(),{...input,expectedIndexRevision:'old'}).status,'source-invalidated');
  assert.equal(inspectCombatInputs(combatSource(),{...input,references:[...supportReferences,supportReferences[0]]}).status,'rejected');
  assert.equal(inspectCombatInputs(combatSource(),{...input,references:[{reference:reference('infantry_weapons','technology'),kind:'unit'}]}).status,'rejected');
  const records=structuredClone(combatEntries);records.find(e=>e.id==='recon')!.data.context=[];
  assert.equal(inspectCombatInputs(combatSource(records),input).status,'source-invalidated');
  const source=combatSource();assert.equal(inspectCombatInputs({...source,resolve:(reference,kind)=>({...source.resolve(reference,kind),status:'ambiguous'})},input).status,'rejected');
  assert.equal(compareCombatDesigns(source,{},candidates[0],scenario).status,'unavailable');
});
