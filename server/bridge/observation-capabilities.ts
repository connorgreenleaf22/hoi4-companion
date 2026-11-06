import type {BridgeSnapshot,ObservationCapability} from '../../src/bridge-types';
import {telemetryManifest as manifest,telemetryNumbers} from '../../src/telemetry-manifest';
import {freshness} from './telemetry';
/** Populated only from documented independent native evidence, never from a recording's claims. */
export const nativeQualifiedFields:readonly string[]=['warSupport','researchSlots','civilianFactories','militaryFactories','dockyards','technologyResearching.basic_machine_tools'];
export function observationCapabilities(snapshot:BridgeSnapshot|null,ownedConnected:boolean,version:string|null):ObservationCapability[]{
 const fields=[...Object.keys(telemetryNumbers),'focusCompleted','technologyCompleted','technologyResearching','technologyResearching.basic_machine_tools'];
 return [...fields.map((id):ObservationCapability=>{
  const verified=nativeQualifiedFields.includes(id),numeric=id==='technologyResearching.basic_machine_tools'?snapshot?.campaign?.technologyResearching.basic_machine_tools:(snapshot?.values as any)?.[id],checks=(snapshot?.campaign as any)?.[id];
  const observed=snapshot?.schemaVersion===2&&(numeric?.status==='observed'||checks&&Object.values(checks).some((v:any)=>v.status==='observed'));
  const incompatible=version!==manifest.gameVersion;
  const current=ownedConnected&&snapshot?.dataOrigin!=='fixture'&&snapshot?.ownership?.sessionId===snapshot?.sessionId&&!!snapshot?.ownership;
  const coverage=id==='civilianFactories'?'GER available civilian total, including trade; not owned or free factories':id==='technologyResearching.basic_machine_tools'?'This technology only; empty-slot false and assigned true independently checked':id in telemetryNumbers?'GER country snapshot':'Explicit manifest ID subset; complete group not independently qualified';
  return {id,qualification:verified?'native-verified':'script-supported-unqualified',availability:incompatible?'version-incompatible':observed&&!current?'historical-only':observed&&freshness(snapshot).status==='recent-log-write'&&verified?'verified':'not-recently-observed',coverage,reason:incompatible?'Emitter manifest is pinned to '+manifest.gameVersion:observed&&!current?'Stored observation only; no current owned-session proof':!verified?'Documented script candidate; full field readback not qualified':'Qualified on '+manifest.gameVersion+'; freshness and ownership still required. See MILESTONE-6.5.md.',...(observed?{snapshotId:snapshot!.id}:{})};
 }),...['currentFocus','focusProgress','focusAvailability','completionEvents','researchProgress','completeFocusInventory','completeResearchInventory'].map((id):ObservationCapability=>({id,availability:'unsupported',qualification:'unsupported',coverage:'None',reason:'No qualified read-only exporter. Snapshot differences are not completion events.'}))];
}
