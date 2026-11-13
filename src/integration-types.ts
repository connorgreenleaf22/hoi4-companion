/** Platform v1: consumers render source/confidence, never infer live state from a timestamp. */
export type ObservationValue=string|number|boolean|null|string[]|{position:number;technology:string|null;researchPoints:number|null}[];
export interface ObservationField {
 status:'available'|'unavailable';value:ObservationValue;
 qualification:'native-verified'|'parsed-unqualified'|'unsupported';reason:string;
 location?:{path:string;line:number};
 raw?:string;
 qualificationEvidence?:{id:string;report:string;scope:string};
}
export interface GameObservation {
 schemaVersion:1;id:string;source:{kind:'telemetry'|'plaintext-save'|'native-readonly';path:string;hash:string};
 classification:'verified-live'|'historical'|'save-derived';
 sessionId:string|null;gameVersion:string|null;gameDate:string|null;country:string|null;capturedAt:string;
 fields:Record<string,ObservationField>;limitations:string[];
 provenance?:{readAt:string;fileModifiedAt:string;freshness:'persisted-state';sessionBinding:'unverified'|'independently-captured';captureId?:string};
}
/** Future observation adapters implement this contract, not a separate command gateway. */
export interface ObservationProvider {id:string;read():Promise<GameObservation|null>}
export interface IntegrationStatus {
 schemaVersion:1;connection:{state:'disconnected'|'log-monitoring'|'owned-connected'|'stopped';reason:string;logPath:string|null;polling:boolean;lastPollAt:string|null};
 detected:{logPath:string|null;gameVersion:string|null;ownedManifestHint:string};
 observations:GameObservation[];capabilities:{id:string;available:boolean;qualification:string;reason:string}[];
 diagnostics:string[];mcp?:{connectionFile:string;executionEnabled:false};
}
