export type CampaignMessage={id:string;role:'player'|'advisor'|'system';kind:'question'|'context'|'advice'|'saved';text:string;strategyId?:string;strategyRevision?:number;createdAt:string};
export type CampaignConversation={schemaVersion:1;profileId:string;revision:number;messages:CampaignMessage[]};
