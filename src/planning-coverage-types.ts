import type {CampaignPlan,Profile} from './types';
import type {Explanation,ExplanationEvidence} from './mechanics-interpreter';
import type {PlanningSources} from './strategy-types';

export type CoverageDimension='costs'|'prerequisites'|'branch-conflicts'|'rewards'|'downstream-events'|'source-context';
export type CoverageGap={reference:string;dimension:CoverageDimension;category:string;severity:'critical'|'high'|'low';kind:'semantics'|'campaign-state'|'structure'|'presentation';code:string;message:string;context:string[];evidence:ExplanationEvidence[]};
export type CoveragePriority={category:string;severity:CoverageGap['severity'];affectedDefinitions:number;affectedPlans:number;unresolvedSemanticsDefinitions:number;campaignStateDefinitions:number;priority:number;codes:string[]};
export type PlanCoverage={schemaVersion:1;policyVersion:'risk-gate-v1';reviewFingerprint:string;planId:string;structuralValidity:'valid'|'invalid'|'unknown';label:'provisional'|'needs-correction';editable:true;sources:PlanningSources;assumptions:string[];
 dimensions:Record<CoverageDimension,'reviewed'|'incomplete'>;gaps:CoverageGap[];priorities:CoveragePriority[];
 references:{reference:string;title:string;evidence:ExplanationEvidence[];summary:Explanation[];requirements:Explanation[]}[];
 events:{id:string;reference?:string;title?:string;evidence:ExplanationEvidence[];consequences:'unresolved'}[];
 policy:{provisionalAllowed:boolean;confidentRecommendationAllowed:false;rankingAllowed:false;optimizationAllowed:false;blockingGapCount:number;reasons:string[]};
};
/** Provider-neutral input: generated prose/confidence is never evidence. Review again after every edit. */
export type PlanningProposal={schemaVersion:1;plan:CampaignPlan;supportingReferences:string[];intent:'provisional'|'rank'|'optimize'};
export type ProposalReviewRequest=PlanningProposal&{profile:Profile;indexRevision:string};
export type ProposalReview={schemaVersion:1;allowed:boolean;intent:PlanningProposal['intent'];coverage:PlanCoverage};
