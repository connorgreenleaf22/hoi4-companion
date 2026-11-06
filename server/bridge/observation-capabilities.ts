import type {BridgeSnapshot,ObservationCapability} from '../../src/bridge-types';
import {telemetryManifest as manifest,telemetryNumbers} from '../../src/telemetry-manifest';
import {freshness} from './telemetry';
/** Populated only from documented independent native evidence, never from a recording's claims. */
export const nativeQualifiedFields:readonly string[]=[];
export function observationCapabilities(snapshot:BridgeSnapshot|null,ownedConnected:boolean,version:string|null):ObservationCapability[]{
 const fields=[...Object.keys(telemetryNumbers),'focusCompleted','technologyCompleted','technologyResearching'];
 return [...fields.map((id):ObservationCapability=>{
  const verified=nativeQualifiedFields.includes(id),numeric=(snapshot?.values as any)?.[id],checks=(snapshot?.campaign as any)?.[id];
  const observed=snapshot?.schemaVersion===2&&(numeric?.status==='observed'||checks&&Object.values(checks).some((v:any)=>v.status==='observed'));
  const incompatible=version!==manifest.gameVersion;
  return {id,qualification:verified?'native-verified':'script-supported-unqualified',availability:incompatible?'version-incompatible':observed&&!ownedConnected?'historical-only':observed&&freshness(snapshot).status==='recent-log-write'&&verified?'verified':'not-recently-observed',coverage:id in telemetryNumbers?'GER country snapshot':'Explicit manifest ID subset only',reason:incompatible?'Emitter manifest is pinned to '+manifest.gameVersion:observed&&!ownedConnected?'Stored observation only; no current owned-session proof':!verified?'Documented script candidate; native readback not qualified':'Qualified on '+manifest.gameVersion+'; freshness and ownership still required',...(observed?{snapshotId:snapshot!.id}:{})};
 }),...['currentFocus','focusProgress','focusAvailability','completionEvents','researchProgress','completeFocusInventory','completeResearchInventory'].map((id):ObservationCapability=>({id,availability:'unsupported',qualification:'unsupported',coverage:'None',reason:'No qualified read-only exporter. Snapshot differences are not completion events.'}))];
}
