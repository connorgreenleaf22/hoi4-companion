import {z} from 'zod';
import type {Entry, Node} from '../../src/types';
import type {DesignRequestV1, DesignResultV1, DesignComparisonV1, DesignTotals} from '../../src/design-evaluation-types';
import {calculateTemplate, resolveEquipment, productionSupport} from '../domain';
import {digest, projectDefinition, type DesignSource} from './source';
import qualification from './qualification.json';

export {indexedDesignSource} from './source';
export type {DesignSource} from './source';
export type * from '../../src/design-evaluation-types';
const ref=z.string().min(12).max(500).startsWith('definition:');
const candidateSchema=z.strictObject({schemaVersion:z.literal(1),id:z.string().min(1).max(100),name:z.string().min(1).max(200),family:z.enum(['infantry','medium-tank']),rows:z.array(z.strictObject({unit:ref,count:z.number().int().min(1).max(25)})).min(1).max(25),equipment:z.array(z.strictObject({archetype:z.string().min(1).max(100),model:ref})).min(1).max(10)});
const scenarioSchema=z.strictObject({schemaVersion:z.literal(1),gameVersion:z.string().min(1).max(100),indexRevision:z.string().min(1).max(128),divisions:z.number().int().min(1).max(10000),context:z.literal('manual-counterfactual'),basis:z.literal('unmodified-base'),dlcs:z.strictObject({'No Step Back':z.literal(false)}),mods:z.array(z.never()).max(0),researchedTechnologies:z.array(ref).max(100),modifiers:z.array(z.never()).max(0)});
export const designRequestSchema=z.strictObject({schemaVersion:z.literal(1),candidate:candidateSchema,scenario:scenarioSchema});
const assumptions=[
  'Manual counterfactual: No Step Back disabled, no mods, fixed equipment models and zero variant upgrades.',
  'Unmodified base requirements at full establishment; no doctrine, country, MIO, designer, leader, terrain or combat modifiers.',
  'Research entries assert unlock membership only; research time, prerequisites and campaign eligibility are not evaluated.',
  'Industrial cost is equipment count times unmodified build_cost_ic; no stockpile, losses, production time, efficiency or factory-output adjustment.',
  'Static source declarations and deterministic arithmetic are validated; no live campaign or engine combat verification is implied.'
];
const unsupportedMetrics=[
  {metric:'organization',reason:'Support weighting, doctrine and technology aggregation not independently qualified.'},
  {metric:'attack / defense / breakthrough / armor / piercing',reason:'Equipment-to-unit aggregation and relevant modifiers not independently qualified.'},
  {metric:'supply / fuel',reason:'Final consumption, equipment contribution and operating conditions not independently qualified.'},
  {metric:'combat performance / terrain / production time',reason:'Requires independently validated scenario, combat and production models.'}
];
class Refusal extends Error {constructor(public code:string,message:string,public invalidated=false){super(message);}}
const fail=(code:string,message:string,invalidated=false):never=>{throw new Refusal(code,message,invalidated);};
const unique=(values:string[],label:string)=>{if(new Set(values).size!==values.length)fail('duplicate-input',`Duplicate ${label}.`);};

/** Pure synchronous evaluation. The qualification is application-owned, never supplied by the caller. */
export function evaluateDesign(source:DesignSource,input:unknown):DesignResultV1 {
  const result:DesignResultV1={schemaVersion:1,formulaVersion:'base-design-v1',qualificationId:qualification.id,status:'rejected',request:null,fingerprint:null,diagnostics:[],provenance:null,totals:null,breakdown:null,assumptions:[...assumptions],unsupportedMetrics:unsupportedMetrics.map(x=>({...x})),assessment:'Base resource comparison only; no combat outcome, ranking or optimality assessment.'};
  const parsed=designRequestSchema.safeParse(input);
  if(!parsed.success){result.diagnostics=parsed.error.issues.map(i=>({code:'invalid-input',message:`${i.path.join('.')}: ${i.message}`}));return result;}
  const request=parsed.data as DesignRequestV1;result.request=request;
  try {
    const {candidate,scenario}=request,meta=source.meta();
    if(!meta?.indexRevision)fail('missing-index','A versioned source index is required.',true);
    const snapshot=meta!;
    if((snapshot.gameVersion||snapshot.version)!==qualification.gameVersion||scenario.gameVersion!==qualification.gameVersion||snapshot.importerRevision!==5)fail('source-version-changed','Game or importer version is outside this qualification.',true);
    if(scenario.indexRevision!==snapshot.indexRevision)fail('source-index-changed','Re-evaluate against the current index revision.',true);
    if(!Array.isArray(snapshot.mods)||snapshot.mods.length)fail('unsupported-source-configuration','The existing base index does not merge mod overrides.');
    result.provenance={gameVersion:scenario.gameVersion,indexRevision:scenario.indexRevision,definitions:[]};
    const used=new Map<string,Entry>();
    const read=(reference:string,kind:string):Entry=>{
      if(used.has(reference))return used.get(reference)!;
      const r=source.resolve(reference,kind);
      if(r.status!=='resolved'||!r.entry)fail('unresolved-reference',`${reference}: ${r.status}; a unique ${kind} definition is required.`);
      const entry=r.entry!;
      if(reference!=='definition:'+entry.uid||entry.kind!==kind)fail('noncanonical-reference','Use an exact definition reference of the required kind.');
      const pin=qualification.entries.find(p=>p.id===entry.id&&p.kind===kind);
      if(!pin)fail('unqualified-definition',`${entry.id} has no validated base-design rule.`);
      if(entry.version!==qualification.gameVersion||entry.hash!==pin!.hash||entry.source!==pin!.source||digest(projectDefinition(entry))!==pin!.digest)fail('definition-changed',`${entry.id}: source identity or calculation inputs changed.`,true);
      used.set(reference,entry);
      result.provenance!.definitions.push({reference,digest:pin!.digest,evidence:{class:'installed-script',source:entry.source,line:entry.line,hash:entry.hash,gameVersion:entry.version,rule:'base-design-v1: indexed declarations; unmodified base arithmetic only'}});
      return entry;
    };
    // Resolve dependencies through the existing ambiguity-aware index reader.
    const readId=(id:string,kind:string):Entry=>{
      const resolved=source.resolve(id,kind);
      if(resolved.status!=='resolved'||!resolved.entry)fail('unresolved-dependency',`${id}: ${resolved.status}.`);
      return read('definition:'+resolved.entry!.uid,kind);
    };
    unique(candidate.rows.map(r=>r.unit),'unit row');unique(candidate.equipment.map(e=>e.archetype),'equipment assignment');unique(scenario.researchedTechnologies,'technology assertion');
    if(candidate.rows.reduce((sum,row)=>sum+row.count,0)>25)fail('invalid-unit-count','A division supports up to 25 line battalions.');
    const technologies=scenario.researchedTechnologies.map(reference=>read(reference,'technology'));
    const unlocks=(key:string,id:string)=>technologies.some(t=>(t.data.nodes as Node[]||[]).some(n=>n.key===key&&Array.isArray(n.value)&&n.value.some(v=>v.key===''&&v.value===id)));
    const units=candidate.rows.map(row=>read(row.unit,'unit'));
    if(candidate.family==='infantry'&&(!units.some(u=>u.id==='infantry')||units.some(u=>!['infantry','artillery_brigade'].includes(u.id))))fail('contradictory-family','Infantry candidates require infantry and may include qualified line artillery.');
    if(candidate.family==='medium-tank'&&(!units.some(u=>u.id==='medium_armor')||units.some(u=>!['medium_armor','motorized'].includes(u.id))))fail('contradictory-family','Medium-tank candidates require medium armor and may include motorized infantry.');
    for(const unit of units){
      for(const key of ['combat_width','manpower'])if(!Number.isFinite(unit.data.stats?.[key])||unit.data.stats[key]<0)fail('missing-base-stat',`${unit.id}.${key} must be explicitly resolved.`);
      if(!unit.data.need||!Object.keys(unit.data.need).length||Object.values(unit.data.need).some(v=>!Number.isInteger(v)||Number(v)<=0))fail('missing-equipment-requirement',`${unit.id} has unresolved equipment requirements.`);
      if(unit.data.active!=='yes'&&!unlocks('enable_subunits',unit.id))fail('missing-technology',`No asserted technology unlocks ${unit.id}.`);
    }
    const rows=candidate.rows.map((r,i)=>({id:units[i].id,count:r.count}));
    const base=calculateTemplate(rows,units,1);
    const models:Entry[]=[],allEquipment:Entry[]=[];
    for(const assignment of candidate.equipment){
      if(!Object.hasOwn(base.needs,assignment.archetype))fail('unused-equipment',`${assignment.archetype} is not required by this candidate.`);
      const model=read(assignment.model,'equipment');
      if(model.data.is_archetype==='yes')fail('equipment-archetype','Select a concrete equipment model.');
      if(!unlocks('enable_equipments',model.id))fail('missing-technology',`No asserted technology unlocks ${model.id}.`);
      const lineage:Entry[]=[model],seen=new Set([model.id]);let current=model;
      while(current.data.archetype){
        const id=String(current.data.archetype);
        if(seen.has(id))fail('equipment-cycle','Equipment archetype cycle.');
        seen.add(id);current=readId(id,'equipment');lineage.push(current);
      }
      if(model.data.archetype!==assignment.archetype)fail('equipment-mismatch',`${model.id} does not directly fulfill ${assignment.archetype}.`);
      models.push(model);allEquipment.push(...lineage);
    }
    for(const id of Object.keys(base.needs))if(!candidate.equipment.some(a=>a.archetype===id))fail('missing-equipment',`Choose a concrete model for ${id}.`);
    const equipmentBreakdown=candidate.equipment.map((a,i)=>{
      const model=models[i],support=productionSupport(model,allEquipment);
      if(!support.supported)fail('unsupported-cost',support.reason!);
      const costEach=resolveEquipment(model,allEquipment).build_cost_ic,quantity=base.needs[a.archetype];
      const costOwner=[model,...allEquipment.filter(e=>e.id===model.data.archetype)].find(e=>e.data.stats?.build_cost_ic!==undefined)!;
      return {archetype:a.archetype,model:a.model,quantity,costEach,industrialCost:quantity*costEach,costSource:'definition:'+costOwner.uid};
    });
    const perDivision:DesignTotals={combatWidth:base.width,manpower:base.manpower,industrialCost:equipmentBreakdown.reduce((sum,e)=>sum+e.industrialCost,0),equipment:Object.fromEntries(equipmentBreakdown.map(e=>[e.model,e.quantity]))};
    const force:DesignTotals={combatWidth:perDivision.combatWidth*scenario.divisions,manpower:perDivision.manpower*scenario.divisions,industrialCost:perDivision.industrialCost*scenario.divisions,equipment:Object.fromEntries(Object.entries(perDivision.equipment).map(([k,v])=>[k,v*scenario.divisions]))};
    if(source.meta()?.indexRevision!==snapshot.indexRevision)fail('source-index-changed','Index changed during evaluation.',true);
    result.status='evaluated';result.totals={perDivision,force};
    result.breakdown={units:units.map((u,i)=>({reference:candidate.rows[i].unit,count:candidate.rows[i].count,widthEach:u.data.stats.combat_width,manpowerEach:u.data.stats.manpower,equipmentEach:{...u.data.need}})),equipment:equipmentBreakdown};
    result.provenance!.definitions.sort((a,b)=>a.reference.localeCompare(b.reference));
    result.fingerprint=digest({request,formulaVersion:result.formulaVersion,qualificationId:result.qualificationId,provenance:result.provenance});
  }catch(error){
    if(!(error instanceof Refusal))throw error;
    result.status=error.invalidated?'source-invalidated':'rejected';result.diagnostics=[{code:error.code,message:error.message}];result.totals=null;result.breakdown=null;result.fingerprint=null;
  }
  return result;
}

/** Both sides share a scenario, avoiding cross-version or contradictory comparisons. */
export function compareDesigns(source:DesignSource,left:unknown,right:unknown,scenario:unknown):DesignComparisonV1 {
  const a=evaluateDesign(source,{schemaVersion:1,candidate:left,scenario}),b=evaluateDesign(source,{schemaVersion:1,candidate:right,scenario});
  const result:DesignComparisonV1={schemaVersion:1,status:'unavailable',left:a,right:b,deltaRightMinusLeft:null};
  if(a.status==='evaluated'&&b.status==='evaluated'&&a.provenance!.indexRevision===b.provenance!.indexRevision){
    const x=a.totals!.perDivision,y=b.totals!.perDivision;
    result.status='compared';result.deltaRightMinusLeft={combatWidth:y.combatWidth-x.combatWidth,manpower:y.manpower-x.manpower,industrialCost:y.industrialCost-x.industrialCost,equipment:Object.fromEntries([...new Set([...Object.keys(x.equipment),...Object.keys(y.equipment)])].sort().map(k=>[k,(y.equipment[k]||0)-(x.equipment[k]||0)]))};
  }
  return result;
}

/** Saved results are reusable only if the exact request, rules and current sources reproduce them. */
export function designResultIsCurrent(source:DesignSource,result:DesignResultV1):boolean {
  if(result.status!=='evaluated'||!result.request||!result.fingerprint)return false;
  const fresh=evaluateDesign(source,result.request);
  return fresh.status==='evaluated'&&fresh.fingerprint===result.fingerprint&&digest(fresh)===digest(result);
}
