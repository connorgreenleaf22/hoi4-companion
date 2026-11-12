import type {DesignRequestV1,DesignResultV1,DesignComparisonV1,DesignCandidateV1,DesignScenarioV1} from './design-evaluation-types';
import type {Evidence,Node} from './types';

export type CombatMetric='organization'|'softAttack'|'hardAttack'|'defense'|'breakthrough';
export type UnsupportedCombatMetric={status:'unsupported';value:null;reason:string;dependencies:string[];inputReferences:string[]};
export type CombatInputV1={reference:string;id:string;kind:'unit'|'equipment';evidence:Evidence;projectionDigest:string;declarations:Record<string,{status:'declared'|'not-declared';value:number|null}>;equipmentRequirements:Record<string,number>|null;context:Node[];transport:string|null;archetype:string|null;interpretation:'Source declarations only; not a battalion or division combat contribution.'};
export type CombatDesignRequestV1={schemaVersion:1;design:DesignRequestV1};
export type CombatDesignResultV1={schemaVersion:1;layerVersion:'combat-inputs-v1';qualificationId:string;status:'partial'|'rejected'|'source-invalidated';request:CombatDesignRequestV1|null;resourceEvaluation:DesignResultV1|null;qualifiedCombatMetricCount:0;metrics:Record<CombatMetric,UnsupportedCombatMetric>;inputs:CombatInputV1[];diagnostics:{code:string;message:string}[];fingerprint:string|null;limitations:string[]};
export type CombatComparisonV1={schemaVersion:1;status:'partial'|'unavailable';left:CombatDesignResultV1;right:CombatDesignResultV1;resourceComparison:DesignComparisonV1|null;combatDelta:Record<CombatMetric,null>;inferences:string[]};
export type CombatComparisonInputV1={left:DesignCandidateV1;right:DesignCandidateV1;scenario:DesignScenarioV1};

/** Future interface/dependency plan only. No simulator accepts or executes this contract. */
export type ScenarioFactV1<T>={status:'manual-assumption';value:T;source:string}|{status:'unavailable';value:null;reason:string};
export type FutureCombatScenarioV1={
  schemaVersion:1;execution:'not-implemented';gameVersion:string;indexRevision:string;
  attacker:FutureCombatSideV1;defender:FutureCombatSideV1;
  terrain:ScenarioFactV1<{reference:string;riverCrossing:boolean;fortLevel:number;weather:string}>;
  unresolvedDependencies:string[];
};
export type FutureCombatSideV1={
  design:DesignCandidateV1;technology:ScenarioFactV1<string[]>;doctrine:ScenarioFactV1<string[]>;
  equipmentModels:ScenarioFactV1<{archetype:string;model:string;variant:string|null}[]>;
  strength:ScenarioFactV1<number>;supply:ScenarioFactV1<number>;fuel:ScenarioFactV1<number>;
  entrenchment:ScenarioFactV1<number>;planning:ScenarioFactV1<number>;
  modifiers:ScenarioFactV1<{reference:string;scope:string;operation:'add'|'multiply';value:number}[]>;
};
