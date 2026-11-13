import type {CampaignPlan,Entry,PlannerReport,RequirementResult} from './types';

export type PlanningSources={version:string;indexRevision:string;mode:'base-game';playset:'detected'|'unavailable';mods:string[];warnings:string[]};
export type FocusPath={items:CampaignPlan['items'];report:PlannerReport;coverage:import('./planning-coverage-types').PlanCoverage};
export type PathExploration={schemaVersion:1;goal:string;paths:FocusPath[];diagnostics:string[];truncated:boolean;sources:PlanningSources};
export type StrategyComparison={schemaVersion:1;sources:PlanningSources;shared:string[];conflicts:{left:string;right:string}[];plans:{plan:CampaignPlan;report:PlannerReport;coverage:import('./planning-coverage-types').PlanCoverage;unique:string[];rewards:{reference:string;title:string;script:string;explanation:import('./mechanics').Explanation[];source:string;line:number;version:string}[]}[]};
export type PlanningReference={entry:Entry;relevance:string;conditions:{name:string;result:RequirementResult}[]};
export type PlanningReferences={schemaVersion:1;sources:PlanningSources;total:number;entries:PlanningReference[]};
