import {z} from 'zod';
import type {CombatMetric,CombatInputV1,CombatDesignResultV1,CombatComparisonV1} from '../../src/combat-evaluation-types';
import {designRequestSchema,evaluateDesign,compareDesigns,type DesignSource} from '../design-evaluation';
import {digest} from '../design-evaluation/source';
import {combatFields,projectCombatInput} from './source';
import qualification from './qualification.json';

export type * from '../../src/combat-evaluation-types';
export const combatRequestSchema=z.strictObject({schemaVersion:z.literal(1),design:designRequestSchema});
const referenceSchema=z.string().min(12).max(500).startsWith('definition:');
const inspectionSchema=z.strictObject({schemaVersion:z.literal(1),expectedIndexRevision:z.string().min(1),references:z.array(z.strictObject({reference:referenceSchema,kind:z.enum(['unit','equipment'])})).min(1).max(100)});
const dependencies:Record<CombatMetric,string[]>={
  organization:['organization-denominator-and-weighting','support-organization-weighting','technology-and-doctrine-organization-order'],
  softAttack:['equipment-to-battalion-normalization','unit-scalar-and-category-modifier-order','essential-equipment-scaling','division-attack-aggregation'],
  hardAttack:['equipment-to-battalion-normalization','unit-scalar-and-category-modifier-order','essential-equipment-scaling','division-attack-aggregation'],
  defense:['equipment-to-battalion-normalization','unit-scalar-and-category-modifier-order','essential-equipment-scaling','division-defense-aggregation'],
  breakthrough:['rifle-truck-normalization','unit-scalar-and-category-modifier-order','essential-equipment-scaling','division-breakthrough-aggregation']
};
const reasons:Record<CombatMetric,string>={
  organization:'Unit max_organisation declarations are indexed; division averaging and support weighting lack independent patch-matched rule validation.',
  softAttack:'Declared equipment values and unit scalars do not establish equipment-to-battalion normalization or division soft-attack totals.',
  hardAttack:'Declared equipment values and unit scalars do not establish equipment-to-battalion normalization or division hard-attack totals.',
  defense:'Declared equipment defense and unit scalars do not establish the full normalization, modifier order and division defense equation.',
  breakthrough:'Motorized rifles and trucks both declare equipment stats; their normalization and the division breakthrough equation are not independently qualified.'
};
const metricKeys=Object.keys(dependencies) as CombatMetric[];
const metrics=(refs:string[]=[])=>Object.fromEntries(metricKeys.map(metric=>[metric,{status:'unsupported',value:null,reason:reasons[metric],dependencies:[...dependencies[metric]],inputReferences:[...refs]}])) as CombatDesignResultV1['metrics'];
const limitations=[
  'Partial delivery: zero qualified division combat metrics. Source inputs are not computed battalion/division contributions.',
  'Resource evaluation retains M7.4.2 base-only manual assumptions; asserted research unlocks do not apply technology combat effects.',
  'Support-company aggregation is unsupported: category-targeted battalion_mult, essential equipment and stacking need validation.',
  'No doctrine, country, MIO, designer, upgrade, terrain, supply/fuel, entrenchment, planning or combat simulation is applied.'
];
type Diagnostic={code:string;message:string};
export type CombatInspectionV1={schemaVersion:1;status:'inputs-qualified'|'rejected'|'source-invalidated';qualificationId:string;indexRevision:string|null;divisionAggregationQualified:false;inputs:CombatInputV1[];diagnostics:Diagnostic[];fingerprint:string|null};

/** Qualifies declarations only. The qualification cannot be supplied or promoted by a caller. */
export function inspectCombatInputs(source:DesignSource,input:unknown):CombatInspectionV1 {
  const result:CombatInspectionV1={schemaVersion:1,status:'rejected',qualificationId:qualification.id,indexRevision:null,divisionAggregationQualified:false,inputs:[],diagnostics:[],fingerprint:null};
  const parsed=inspectionSchema.safeParse(input);
  if(!parsed.success){result.diagnostics=parsed.error.issues.map(i=>({code:'invalid-input',message:`${i.path.join('.')}: ${i.message}`}));return result;}
  const refuse=(status:CombatInspectionV1['status'],code:string,message:string):CombatInspectionV1=>({...result,status,inputs:[],diagnostics:[{code,message}],fingerprint:null});
  const meta=source.meta();
  if(!meta?.indexRevision||meta.indexRevision!==parsed.data.expectedIndexRevision||(meta.gameVersion||meta.version)!==qualification.gameVersion||meta.importerRevision!==qualification.importerRevision)return refuse('source-invalidated','source-version-changed','Game, importer or expected index revision is outside this input qualification.');
  result.indexRevision=meta.indexRevision;
  if(!Array.isArray(meta.mods)||meta.mods.length)return refuse('rejected','unsupported-mods','Mod override semantics are not qualified.');
  if(new Set(parsed.data.references.map(r=>r.reference)).size!==parsed.data.references.length)return refuse('rejected','duplicate-reference','Each input reference may occur once.');
  for(const {reference,kind} of parsed.data.references){
    const resolved=source.resolve(reference,kind),entry=resolved.entry;
    if(resolved.status!=='resolved'||!entry||reference!=='definition:'+entry.uid||entry.kind!==kind)return refuse('rejected','unresolved-reference',`${reference}: a unique canonical ${kind} is required.`);
    const pin=qualification.entries.find(p=>p.id===entry.id&&p.kind===entry.kind);
    if(!pin)return refuse('rejected','unqualified-input',`${entry.id} is outside the reviewed combat-input projection.`);
    const projected=projectCombatInput(entry);
    if(entry.version!==qualification.gameVersion||entry.hash!==pin.hash||entry.source!==pin.source||digest(projected)!==pin.digest)return refuse('source-invalidated','combat-input-changed',`${entry.id}: source identity or combat declarations changed.`);
    result.inputs.push({reference,id:entry.id,kind,evidence:{class:'installed-script',source:entry.source,line:entry.line,hash:entry.hash,gameVersion:entry.version,rule:'combat-inputs-v1: declaration extraction only; division aggregation unsupported'},projectionDigest:pin.digest,declarations:Object.fromEntries(combatFields.map(field=>[field,projected.data.stats[field]===undefined?{status:'not-declared',value:null}:{status:'declared',value:projected.data.stats[field]}])),equipmentRequirements:projected.data.need?structuredClone(projected.data.need):null,context:structuredClone(projected.data.context||[]),transport:projected.data.transport||null,archetype:projected.data.archetype||null,interpretation:'Source declarations only; not a battalion or division combat contribution.'});
  }
  if(source.meta()?.indexRevision!==meta.indexRevision)return refuse('source-invalidated','index-changed','Index changed during input inspection.');
  result.inputs.sort((a,b)=>a.reference.localeCompare(b.reference));result.status='inputs-qualified';
  result.fingerprint=digest({qualificationId:result.qualificationId,indexRevision:result.indexRevision,inputs:result.inputs});
  return result;
}

export function evaluateCombatDesign(source:DesignSource,input:unknown):CombatDesignResultV1 {
  const result:CombatDesignResultV1={schemaVersion:1,layerVersion:'combat-inputs-v1',qualificationId:qualification.id,status:'rejected',request:null,resourceEvaluation:null,qualifiedCombatMetricCount:0,metrics:metrics(),inputs:[],diagnostics:[],fingerprint:null,limitations:[...limitations]};
  const parsed=combatRequestSchema.safeParse(input);
  if(!parsed.success){result.diagnostics=parsed.error.issues.map(i=>({code:'invalid-input',message:`${i.path.join('.')}: ${i.message}`}));return result;}
  result.request=parsed.data as NonNullable<CombatDesignResultV1['request']>;
  const resources=evaluateDesign(source,result.request.design);result.resourceEvaluation=resources;
  if(resources.status!=='evaluated'){result.status=resources.status;result.diagnostics=[...resources.diagnostics];return result;}
  const references:{reference:string;kind:'unit'|'equipment'}[]=[];
  for(const d of resources.provenance!.definitions){
    // Resolve through the existing reader; never drop a dependency that became unavailable.
    const unit=source.resolve(d.reference,'unit');
    if(unit.status==='resolved'){references.push({reference:d.reference,kind:'unit'});continue;}
    const equipment=source.resolve(d.reference,'equipment');
    if(equipment.status==='resolved'){references.push({reference:d.reference,kind:'equipment'});continue;}
    if(source.resolve(d.reference,'technology').status!=='resolved'){
      result.status='source-invalidated';result.diagnostics=[{code:'dependency-changed',message:`${d.reference}: dependency changed after resource evaluation.`}];return result;
    }
  }
  const inspection=inspectCombatInputs(source,{schemaVersion:1,expectedIndexRevision:resources.provenance!.indexRevision,references});
  if(inspection.status!=='inputs-qualified'){result.status=inspection.status;result.diagnostics=inspection.diagnostics;return result;}
  result.status='partial';result.inputs=inspection.inputs;result.metrics=metrics(references.map(r=>r.reference));
  result.diagnostics=[{code:'combat-aggregation-unqualified',message:'Resource comparison and source-input inspection succeeded; all five prioritized division combat totals remain unsupported.'}];
  result.fingerprint=digest({request:result.request,resourceFingerprint:resources.fingerprint,inputFingerprint:inspection.fingerprint,layerVersion:result.layerVersion,metrics:result.metrics});
  return result;
}

export function compareCombatDesigns(source:DesignSource,left:unknown,right:unknown,scenario:unknown):CombatComparisonV1 {
  const a=evaluateCombatDesign(source,{schemaVersion:1,design:{schemaVersion:1,candidate:left,scenario}}),b=evaluateCombatDesign(source,{schemaVersion:1,design:{schemaVersion:1,candidate:right,scenario}});
  const result:CombatComparisonV1={schemaVersion:1,status:'unavailable',left:a,right:b,resourceComparison:null,combatDelta:Object.fromEntries(metricKeys.map(m=>[m,null])) as Record<CombatMetric,null>,inferences:['No division combat-stat totals, deltas, winner or military-effectiveness ranking are established.']};
  if(a.status!=='partial'||b.status!=='partial')return result;
  const resources=compareDesigns(source,left,right,scenario);
  if(resources.status!=='compared'||resources.left.fingerprint!==a.resourceEvaluation!.fingerprint||resources.right.fingerprint!==b.resourceEvaluation!.fingerprint)return result;
  result.status='partial';result.resourceComparison=resources;
  result.inferences.push('The nested resource delta establishes only differences in nominal width, full-establishment manpower, equipment and unmodified IC under the shared manual scenario.');
  return result;
}

export function combatResultIsCurrent(source:DesignSource,result:CombatDesignResultV1):boolean {
  if(result.status!=='partial'||!result.request||!result.fingerprint)return false;
  return digest(evaluateCombatDesign(source,result.request))===digest(result);
}
