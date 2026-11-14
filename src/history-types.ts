import type {BridgeSnapshot} from './bridge-types';
import type {Profile,PlanPreview} from './types';
export type HistoryOrigin='recording'|'fixture';
export interface CampaignRecording {
  schemaVersion:1;id:string;name:string;origin:HistoryOrigin;importedAt:string;
  snapshots:BridgeSnapshot[];modContext:'unavailable';
}
export interface PlanningBaseline {schemaVersion:1;recordingId:string;recordingName:string;origin:HistoryOrigin;snapshot:BridgeSnapshot;indexRevision:string;modContext:'unavailable'}
export interface BaselineInput {recordingId:string;snapshotId:string;profileId:string;name:string;tree:string;indexRevision:string}
export interface BaselinePreview {input:BaselineInput;profile:Profile;baseline:PlanningBaseline;preview:PlanPreview;warnings:string[]}
