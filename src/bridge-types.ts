import type { Resolution } from './types';

export type BridgeMode = 'observer' | 'telemetry' | 'control';
export type Value<T> = { value:T; status:'observed' } | { value:null; status:'unavailable'; reason:string };
export interface BridgeSnapshot {
  schemaVersion:1; id:string; sessionId:string; producerId:string;
  observedAt:string; gameVersion:string|null;
  source:{kind:'game-log'; path:string; offset:number; hash:string};
  values:{country:Value<string>; gameDate:Value<string>; politicalPower:Value<number>; stability:Value<number>};
  unavailable:string[];
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
