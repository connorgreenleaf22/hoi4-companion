import test from 'node:test';
import assert from 'node:assert/strict';
import type {Entry} from '../src/types';
import {evaluateDesign,compareDesigns,designResultIsCurrent} from '../server/design-evaluation';
import {digest} from '../server/design-evaluation/source';
import {entries,meta,fixtureSource,scenario,candidates,comparisonPairs,reference} from './fixtures/design-evaluation/corpus';
import golden from './fixtures/design-evaluation/golden.json';

const request=()=>({schemaVersion:1,candidate:structuredClone(candidates[2]),scenario:structuredClone(scenario)});
const modelId=(ref:string)=>entries.find(e=>'definition:'+e.uid===ref)!.id;
test('seven hand-worked golden candidates and five reproducible comparisons',()=>{
  const source=fixtureSource();
  for(const candidate of candidates){
    const r=evaluateDesign(source,{schemaVersion:1,candidate,scenario});assert.equal(r.status,'evaluated',JSON.stringify(r.diagnostics));
    const totals=r.totals!.perDivision;
    assert.deepEqual({...totals,equipment:Object.fromEntries(Object.entries(totals.equipment).map(([k,v])=>[modelId(k),v]))},golden.candidates[candidate.id as keyof typeof golden.candidates]);
    assert.deepEqual(r,evaluateDesign(source,JSON.parse(JSON.stringify(r.request))));
    assert.equal(designResultIsCurrent(source,JSON.parse(JSON.stringify(r))),true);
    assert.equal(r.provenance!.definitions.every(d=>d.evidence.hash.length===64&&d.evidence.line!>0),true);
    assert.equal('organization' in totals,false);assert.equal(r.unsupportedMetrics.length,4);
  }
  assert.equal(comparisonPairs.length,5);
  for(const pair of golden.comparisons){
    const r=compareDesigns(source,candidates.find(c=>c.id===pair.left),candidates.find(c=>c.id===pair.right),scenario);
    assert.equal(r.status,'compared');const {equipment,...d}=r.deltaRightMinusLeft!;
    assert.deepEqual(d,{combatWidth:pair.combatWidth,manpower:pair.manpower,industrialCost:pair.industrialCost});
    for(const k of Object.keys(equipment))assert.equal(equipment[k],(r.right.totals!.perDivision.equipment[k]||0)-(r.left.totals!.perDivision.equipment[k]||0));
  }
});
test('independent arithmetic vectors, inherited cost and force scaling',()=>{
  const input=request();input.scenario.divisions=17;
  const r=evaluateDesign(fixtureSource(),input);assert.equal(r.status,'evaluated');
  assert.equal(r.totals!.perDivision.combatWidth,9*2+1*3);
  assert.equal(r.totals!.perDivision.manpower,9*1000+1*500);
  assert.equal(r.totals!.perDivision.industrialCost,9*100*.5+24*3.5);
  assert.equal(r.totals!.force.industrialCost,534*17);assert.equal(r.totals!.force.manpower,9500*17);
  assert.equal(r.totals!.force.equipment[reference('artillery_equipment_1','equipment')],24*17);
  const art=r.breakdown!.equipment.find(e=>e.archetype==='artillery_equipment')!;
  assert.equal(art.costEach,3.5);assert.equal(art.costSource,reference('artillery_equipment','equipment'));
  assert.equal(r.provenance!.definitions.some(d=>d.reference===reference('artillery_equipment','equipment')),true);
  // Research parent is deliberately absent. It must never supply stats or be needed for inheritance.
  assert.equal(entries.some(e=>e.id==='infantry_equipment_0'),false);
});
const badInputs:[string,(r:any)=>void][]=[
  ['negative count',r=>r.candidate.rows[0].count=-1],['zero count',r=>r.candidate.rows[0].count=0],
  ['fractional count',r=>r.candidate.rows[0].count=1.5],['string count',r=>r.candidate.rows[0].count='9'],
  ['NaN count',r=>r.candidate.rows[0].count=NaN],['infinite divisions',r=>r.scenario.divisions=Infinity],
  ['empty template',r=>r.candidate.rows=[]],['too many line battalions',r=>r.candidate.rows[0].count=25],
  ['duplicate row',r=>r.candidate.rows.push({...r.candidate.rows[0]})],
  ['duplicate equipment',r=>r.candidate.equipment.push({...r.candidate.equipment[0]})],
  ['unassigned equipment',r=>r.candidate.equipment=[]],['duplicate research',r=>r.scenario.researchedTechnologies.push(r.scenario.researchedTechnologies[0])],
  ['contradictory family',r=>r.candidate.family='medium-tank'],['DLC contradicts fixed models',r=>r.scenario.dlcs['No Step Back']=true],
  ['unsupported modifier',r=>r.scenario.modifiers=[{id:'width',value:-.1}]],['unsupported mods',r=>r.scenario.mods=['example']],
  ['hidden doctrine assumption',r=>r.scenario.doctrine='mass_assault'],['caller-supplied price',r=>r.candidate.equipment[0].costEach=.01],
  ['wrong contract version',r=>r.schemaVersion=2],['unknown unit',r=>r.candidate.rows[0].unit='definition:unknown'],
  ['wrong reference kind',r=>r.candidate.rows[0].unit=reference('infantry_weapons','technology')],
  ['bare identifier',r=>r.candidate.rows[0].unit='infantry'],['unsupported designer variant',r=>r.candidate.equipment[0].modules=[]],
  ['archetype as concrete model',r=>r.candidate.equipment[0].model=reference('infantry_equipment','equipment')],
  ['mismatched equipment',r=>r.candidate.equipment[0].model=reference('motorized_equipment_1','equipment')],
  ['unused equipment',r=>r.candidate.equipment.push({archetype:'motorized_equipment',model:reference('motorized_equipment_1','equipment')})]
];
for(const [name,mutate] of badInputs)test('rejects '+name,()=>{
  const r=request();mutate(r);const result=evaluateDesign(fixtureSource(),r);
  assert.equal(result.status,'rejected',JSON.stringify(result));assert.equal(result.totals,null);assert.equal(result.fingerprint,null);assert.ok(result.diagnostics.length);
});
for(const tech of ['infantry_weapons','infantry_weapons1','gw_artillery','basic_medium_tank','motorised_infantry'])test('missing technology '+tech,()=>{
  const candidate=tech.includes('tank')||tech.includes('motorised')?candidates[4]:candidates[2];
  const result=evaluateDesign(fixtureSource(),{schemaVersion:1,candidate,scenario:{...scenario,researchedTechnologies:scenario.researchedTechnologies.filter(r=>r!==reference(tech,'technology'))}});
  assert.equal(result.status,'rejected');assert.equal(result.diagnostics[0].code,'missing-technology');
});
test('changes to version, file identity, numeric inputs or index invalidate results',()=>{
  const original=evaluateDesign(fixtureSource(),request());
  const mutations:((records:Entry[],m:typeof meta)=>void)[]=[
    (_,m)=>{m.gameVersion='1.20.0';},(_,m)=>{m.importerRevision=6;},(_,m)=>{m.indexRevision='changed';},
    e=>{e[0].hash='0'.repeat(64);},e=>{e[0].data.stats.manpower=123;},e=>{delete e[0].data.stats.combat_width;},
    e=>{delete e[0].data.need;},e=>{e.find(e=>e.id==='artillery_equipment')!.data.stats.build_cost_ic=0;},
    e=>{e.find(e=>e.id==='gw_artillery')!.data.nodes=[];}
  ];
  for(const mutate of mutations){
    const records=structuredClone(entries),m=structuredClone(meta);mutate(records,m);const source=fixtureSource(records,m),r=evaluateDesign(source,request());
    assert.equal(r.status,'source-invalidated');assert.equal(r.totals,null);assert.equal(designResultIsCurrent(source,original),false);
  }
  const altered=structuredClone(original);altered.totals!.perDivision.manpower=1;assert.equal(designResultIsCurrent(fixtureSource(),altered),false);
  assert.equal(digest({b:2,a:1}),digest({a:1,b:2}));
});
test('fresh index revision can be re-evaluated but cannot reuse an old result',()=>{
  const m={...meta,indexRevision:'new-snapshot-same-qualified-files'},source=fixtureSource(structuredClone(entries),m);
  const r=evaluateDesign(source,{...request(),scenario:{...scenario,indexRevision:m.indexRevision}});
  assert.equal(r.status,'evaluated');assert.equal(designResultIsCurrent(source,evaluateDesign(fixtureSource(),request())),false);
});
test('ambiguous dependencies, unsupported definitions, source mods and missing index fail closed',()=>{
  const records=structuredClone(entries),archetype=structuredClone(records.find(e=>e.id==='artillery_equipment')!);archetype.uid+=':duplicate';records.push(archetype);
  assert.equal(evaluateDesign(fixtureSource(records),request()).diagnostics[0].code,'unresolved-dependency');
  const unsupported={...structuredClone(entries[0]),id:'unqualified',uid:'unit:unqualified'};
  const req=request();req.candidate.rows[0].unit='definition:'+unsupported.uid;
  assert.equal(evaluateDesign(fixtureSource([...entries,unsupported]),req).diagnostics[0].code,'unqualified-definition');
  assert.equal(evaluateDesign(fixtureSource(entries,{...meta,mods:['unmerged-mod']}),request()).status,'rejected');
  const source=fixtureSource();assert.equal(evaluateDesign({...source,meta:()=>null},request()).status,'source-invalidated');
  const comparison=compareDesigns(source,candidates[0],{...candidates[4],family:'infantry'},scenario);
  assert.equal(comparison.status,'unavailable');assert.equal(comparison.deltaRightMinusLeft,null);
});
