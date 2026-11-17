import type {Evidence} from './types';

export type KnowledgeScenario = {
  schemaVersion:1; gameVersion:string; indexRevision:string;
  configuration:'all-dlc-no-mods'; stateSource:'manual'; country:string; date:string;
  researched:string[]; modifiers:KnowledgeSelection[];
};
export type KnowledgeSelection = {reference:string; path?:number[]};
export type TankDesign = {kind:'tank'; name:string; chassis:string; modules:{slot:string; module:string}[]; upgrades:{reference:string; level:number}[]};
export type DivisionDesign = {kind:'division'; name:string; rows:{unit:string; count:number}[]; equipment:{archetype:string; model?:string; variant?:TankDesign}[]};
export type KnowledgeDesign = TankDesign|DivisionDesign;
export type KnowledgeIssue = {code:string; message:string; blocking:boolean; reference?:string; line?:number};
export type StatContribution = {label:string; reference:string; operation:'base'|'add'|'factor'|'aggregate'; value:number; evidence?:Evidence};
export type KnowledgeMetric = {value:number|null; quality:'estimate'|'declaration'|'unsupported'; rule:string; contributions:StatContribution[]};
export type KnowledgeResult = {
  schemaVersion:1; formulaVersion:string; status:'estimated'|'partial'|'rejected';
  design:KnowledgeDesign; scenario:KnowledgeScenario; fingerprint:string;
  metrics:Record<string,KnowledgeMetric>; issues:KnowledgeIssue[]; assumptions:string[];
  provenance:{gameVersion:string; indexRevision:string; definitions:{reference:string; hash:string; source:string; line:number}[]};
  qualification:'experimental-estimate'; campaignEligibility:'manual-unverified';
};
export type KnowledgeObjective = {metric:string; direction:'maximize'|'minimize'; perIndustrialCost:boolean};
export type KnowledgeSearchRequest = {
  scenario:KnowledgeScenario; candidates:KnowledgeDesign[]; objective:KnowledgeObjective;
  constraints:{metric:string; min?:number; max?:number}[];
  includePartialEstimates?:boolean;
  shareWithAdvisor?:boolean;
};
export type KnowledgeSearchResult = {
  schemaVersion:1; status:'compared'|'unavailable'; objective:KnowledgeObjective;
  candidatesEvaluated:number; feasible:number; best:KnowledgeResult|null;
  ranking:{name:string; score:number; result:KnowledgeResult}[];
  excluded:{name:string; reasons:string[]}[];
  claim:'Best estimated score among the explicitly supplied candidates and constraints; not a global optimum or battle prediction.';
};
export type KnowledgeChoice = {reference:string; id:string; title:string; kind:string; path?:number[]; category?:string; year?:number; needs?:string[]};
export type KnowledgeCatalog = {
  gameVersion:string; indexRevision:string; choices:KnowledgeChoice[];
  counts:Record<string,number>; capabilities:{domain:string; status:string; limitation:string}[];
};
export type DesignAdviceStudy = {
  classification:'experimental-estimates'; status:'available'|'unavailable'; manualCountry:string; manualDate:string;
  gameVersion:string; indexRevision:string; formulaVersion:string; objective?:KnowledgeObjective;
  candidatesEvaluated:number; feasible:number; comparisons:{name:string;score:number;quality:string;metrics:Record<string,number|null>;gaps:string[];omittedGaps:number}[];
  limitations:string[]; studyFingerprint:string;
  constraints:{metric:string;min?:number;max?:number}[];
  scenarioAssumptions:{researchCount:number;researchNames:string[];omittedResearch:number;modifierCount:number;modifierNames:string[];omittedModifiers:number;fullEstablishment:true;includePartialEstimates:boolean};
};
