import {createHash} from 'node:crypto';
import type {DesignAdviceStudy} from '../../src/knowledge-engine-types';
import {compareKnowledgeDesigns,FORMULA_VERSION} from './index';
import {searchSchema} from './schema';
import type {KnowledgeSource} from './source';

/** Opt-in, bounded, re-evaluated estimate context. Never changes the strategy coverage gate. */
export function designAdviceStudy(source:KnowledgeSource,input:unknown,country:string):DesignAdviceStudy|undefined {
  const parsed=searchSchema.safeParse(input);if(!parsed.success||!parsed.data.shareWithAdvisor)return undefined;
  const request=parsed.data;
  const name=(r:string)=>{const e=source.resolve(r).entry;return (e?.title||r).slice(0,120);};
  const base={classification:'experimental-estimates' as const,manualCountry:request.scenario.country,manualDate:request.scenario.date,gameVersion:request.scenario.gameVersion,indexRevision:request.scenario.indexRevision,formulaVersion:FORMULA_VERSION,objective:request.objective,constraints:request.constraints,scenarioAssumptions:{researchCount:request.scenario.researched.length,researchNames:request.scenario.researched.slice(0,16).map(name),omittedResearch:Math.max(0,request.scenario.researched.length-16),modifierCount:request.scenario.modifiers.length,modifierNames:request.scenario.modifiers.slice(0,12).map(s=>name(s.reference)+(s.path?' trait path '+s.path.join('.') :'')),omittedModifiers:Math.max(0,request.scenario.modifiers.length-12),fullEstablishment:true as const,includePartialEstimates:request.includePartialEstimates===true},candidatesEvaluated:request.candidates.length,feasible:0,comparisons:[],limitations:[
    'Opt-in saved design study: scenario inputs are manual assertions. Values are experimental estimates, not verified game stats or live observations.',
    'Only the supplied candidates and numeric objective are compared. This is not a global optimum or a battle prediction.',
    'Report omissions and assumptions. Never use this study to approve strategy coverage, confidence or campaign eligibility.'
    ,'Full-strength, fully equipped mathematical designs. Organization/support weighting, equipment normalization and modifier order are approximate. Terrain, opponent, supply, production time and battle outcomes are excluded.'
  ]};
  let study:Omit<DesignAdviceStudy,'studyFingerprint'>;
  if(country!==request.scenario.country)study={...base,status:'unavailable',limitations:[...base.limitations,'Saved design country differs from this campaign; no numerical results supplied.']};
  else{
    try{
    const result=compareKnowledgeDesigns(source,request);
    const metricKeys=['soft_attack','hard_attack','defense','breakthrough','max_organisation','build_cost_ic','combat_width','maximum_speed','armor_value','ap_attack'];
    study={...base,status:result.best?'available':'unavailable',feasible:result.feasible,comparisons:result.ranking.slice(0,3).map(r=>({name:r.name,score:r.score,quality:r.result.status,metrics:Object.fromEntries(metricKeys.flatMap(k=>r.result.metrics[k]?[[k,r.result.metrics[k].value]]:[])),gaps:r.result.issues.slice(0,6).map(i=>i.message.slice(0,200)),omittedGaps:Math.max(0,r.result.issues.length-6)})),limitations:[...base.limitations,`${result.excluded.length} candidates excluded. At most three candidate summaries and six gaps per candidate are supplied. Full evidence remains in the local design adviser.`,...(!result.best?['No feasible current estimate: stale source context or unresolved eligibility/metrics. Revisit the design adviser.']:[])]};
    }catch{study={...base,status:'unavailable',limitations:[...base.limitations,'Saved comparison cannot be evaluated. Repair it in the design adviser; other AI planning remains available.']};}
  }
  return {...study,studyFingerprint:createHash('sha256').update(JSON.stringify([request,study])).digest('hex')};
}
