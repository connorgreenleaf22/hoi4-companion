import type { Resolution } from './types';

export type BridgeMode = 'observer' | 'telemetry' | 'control';
export type Value<T> = { value:T; status:'observed' } | { value:null; status:'unavailable'; reason:string };
export interface BridgeSnapshot {
  dataOrigin?:'game-log'|'fixture';
  schemaVersion:1|2; id:string; sessionId:string; producerId:string;
  observedAt:string; gameVersion:string|null;
  source:{kind:'game-log'; path:string; offset:number; hash:string};
  values:{country:Value<string>; gameDate:Value<string>; politicalPower:Value<number>; stability:Value<number>; warSupport?:Value<number>;researchSlots?:Value<number>;civilianFactories?:Value<number>;militaryFactories?:Value<number>;dockyards?:Value<number>};
  campaign?:{manifestId:string;method:'scripted-snapshot';coverage:'explicit-id-subset';focusCompleted:Record<string,Value<boolean>>;technologyCompleted:Record<string,Value<boolean>>;technologyResearching:Record<string,Value<boolean>>};
  unavailable:string[];
  ownership?:{sessionId:string;pid:number;creationTime:string;executable:string;executableHash:string;logIdentity:string;beginOffset:number;sequence:number;correlation:'owned-profile-and-launch-token'};
  focusObservation?:{current:Value<string|null>;observedAt:string;sessionId:string;source:{kind:'ui-ocr';imagePath:string;imageHash:string;text:string;panelText:string};verification:'exact-localized-ui-label'|'unverified'};
}
export interface CampaignIntelligence {
  schemaVersion:1;checkedAt:string;mode:BridgeMode;environment:BridgeEnvironment;
  session:{state:'owned-connected'|'disconnected';id:string|null;reason:string};
  liveSnapshotId:string|null;snapshots:BridgeSnapshot[];emergencyStop:boolean;observationCapabilities?:ObservationCapability[];
}
export interface BridgeCapability { id:string; available:boolean; reason:string; evidence:'implemented'|'native-verified'|'unverified'; }
export interface BridgeEnvironment {
  schemaVersion:1; checkedAt:string; gameRoot:string|null; executable:string|null;
  version:string|null; versionSource:string|null; userRoot:string|null;
  logs:string|null; saves:string|null; configuration:{source:string|null; status:'detected'|'unavailable'; enabledMods:string[]; disabledDlc:string[]};
  dlcDescriptors:string[]; mods:DetectedMod[]; diagnostics:string[];
}
export interface DetectedMod { descriptor:string; name:string; root:string|null; archive:string|null; replacePaths:string[]; selected:boolean; }
export interface BridgeReference {
  schemaVersion:1; reference:Resolution; interpretation:'installed-declarations';
  overrides:{status:'none-detected'|'potential-overrides'|'unknown'; candidates:{descriptor:string; source:string; reason:string}[]; limitations:string[]};
}
export interface BridgeAction {
  schemaVersion:1; requestId:string; sessionId:string; controllerId:string;
  command:string; parameters:Record<string,unknown>; requiredCapability:string;
  mode:'control'; authorization:'local-grant';
  expected:{snapshotId:string; country:string; gameVersion:string};
  verification:{policy:'independent-readback'; timeoutMs:number};
}
export interface ActionReceipt {
  schemaVersion:1; requestId:string; sessionId:string; command:string;
  status:'confirmed-success'|'confirmed-failure'|'rejected'|'timeout'|'uncertain';
  reason:string; recordedAt:string; beforeSnapshotId?:string; afterSnapshotId?:string;
}

export interface ObservationCapability {
 id:string; availability:'verified'|'not-recently-observed'|'historical-only'|'unsupported'|'version-incompatible';
 qualification:'native-verified'|'script-supported-unqualified'|'unsupported';
 reason:string; coverage:string; snapshotId?:string;
}
