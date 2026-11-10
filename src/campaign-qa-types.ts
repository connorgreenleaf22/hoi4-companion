import type {ObservationField} from './integration-types';

/** Shared by MCP, sanitized export and a future in-app assistant. No command vocabulary. */
export const QA_VERSION = 'hoi4-campaign-qa/1' as const;
export type QaClassification = 'verified-live'|'historical'|'save-derived';
export interface QaObservation {
 id:string; sessionId:string|null; country:string|null; gameVersion:string|null;
 gameDate:string|null; capturedAt:string; classification:QaClassification;
 source:{kind:string;hash:string};
 freshness:{ageMs:number|null;status:'recent'|'stale'|'unknown';basis:string};
 fields:Record<string,ObservationField>; limitations:string[];
}
export interface QaEnvelope<T=unknown> {
 schemaVersion:typeof QA_VERSION; generatedAt:string; data:T;
 policy:{readOnly:true;executionAvailable:false;referenceRulesAreCampaignFacts:false;instructions:string};
}
export const desiredFields=['currentFocus','completedFocuses','researchAssignments','researchSlots',
 'politicalPower','stability','warSupport','civilianFactories','militaryFactories','dockyards',
 'production','resources','manpower','diplomacy','atWar','supply'] as const;
