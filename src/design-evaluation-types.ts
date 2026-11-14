import type {Evidence} from './types';

export type DesignCandidateV1={schemaVersion:1;id:string;name:string;family:'infantry'|'medium-tank';rows:{unit:string;count:number}[];equipment:{archetype:string;model:string}[]};
export type DesignScenarioV1={schemaVersion:1;gameVersion:string;indexRevision:string;divisions:number;context:'manual-counterfactual';basis:'unmodified-base';dlcs:{'No Step Back':false};mods:[];researchedTechnologies:string[];modifiers:[]};
export type DesignRequestV1={schemaVersion:1;candidate:DesignCandidateV1;scenario:DesignScenarioV1};
export type DesignDiagnostic={code:string;message:string};
export type DesignTotals={combatWidth:number;manpower:number;industrialCost:number;equipment:Record<string,number>};
export type DesignResultV1={
  schemaVersion:1;formulaVersion:'base-design-v1';qualificationId:string;
  status:'evaluated'|'rejected'|'source-invalidated';request:DesignRequestV1|null;fingerprint:string|null;
  diagnostics:DesignDiagnostic[];
  provenance:{gameVersion:string;indexRevision:string;definitions:{reference:string;digest:string;evidence:Evidence}[]}|null;
  totals:{perDivision:DesignTotals;force:DesignTotals}|null;
  breakdown:{units:{reference:string;count:number;widthEach:number;manpowerEach:number;equipmentEach:Record<string,number>}[];equipment:{archetype:string;model:string;quantity:number;costEach:number;industrialCost:number;costSource:string}[]}|null;
  assumptions:string[];unsupportedMetrics:{metric:string;reason:string}[];
  assessment:'Base resource comparison only; no combat outcome, ranking or optimality assessment.';
};
export type DesignComparisonV1={schemaVersion:1;status:'compared'|'unavailable';left:DesignResultV1;right:DesignResultV1;deltaRightMinusLeft:DesignTotals|null};
