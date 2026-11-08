import type {CampaignPlan,Profile} from './types';
import type {ProposalReview} from './planning-coverage-types';
import type {PlanningSources} from './strategy-types';
export type RecommendationCategory='decision'|'research'|'economy'|'military'|'event';
export type StrategyContent={name:string;secondaryObjectives:string[];focusIds:string[];recommendations:{category:RecommendationCategory;text:string;references:string[];conditions:string[]}[];assumptions:string[];risks:string[];milestones:string[];alternatives:string[];unknowns:string[]};
export type AiConfiguration={provider:'openai';model:string;configured:boolean;maxOutputTokens:number;busy:boolean};
export type AiStrategy={schemaVersion:1;id:string;profileId:string;revision:number;objective:string;content:StrategyContent;plan:CampaignPlan;review:ProposalReview;sources:PlanningSources;createdAt:string;updatedAt:string;origin:'provider'|'manual';provider:{name:string;model:string;usage?:{input:number;output:number}};repairs:string[];instruction:string;parentId?:string;manualContext:string;classification:'provisional';campaignContext:string;};
export type AiSource={reference:string;id:string;kind:string;title:string;source:string;line:number;hash:string;version:string;prerequisites:string[][];exclusions:string[];summary:string[];requirements:string[]};
export type AiContext={schemaVersion:1;fingerprint:string;country:string;startDate:string;sources:PlanningSources;references:AiSource[];omitted:number;disclosure:string;manualContext:string;dlcAssertions:unknown;objective:string;revisionInstruction:string;previousProposal?:StrategyContent};

export const aiCampaignContext=(p:Profile)=>JSON.stringify([p.id,p.revision,p.country,p.tree.replace(/^definition:/,''),p.startDate,p.completed,p.dlcStates,p.dlcs,p.dlcConfirmed,p.historical]);
