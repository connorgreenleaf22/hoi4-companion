import type {GameObservation,IntegrationStatus} from './integration-types';

export function summarizeIntegration(status:IntegrationStatus){
  // Keep sessions/countries separate: the newest observation is a record, not
  // permission to combine fields from unrelated campaigns into a live picture.
  const observation=status.observations.reduce<GameObservation|undefined>((latest,item)=>
    !latest||Date.parse(item.capturedAt)>Date.parse(latest.capturedAt)?item:latest,undefined);
  const fields=Object.entries(observation?.fields||{});
  return {
    state:status.connection.state,
    label:status.connection.state==='owned-connected'?'Owned observation connection':status.connection.state==='log-monitoring'?'Log monitoring · ownership unverified':status.connection.state==='stopped'?'Integration stopped':'No game observations connected',
    observation,
    available:fields.filter(([,field])=>field.status==='available'),
    unavailable:fields.filter(([,field])=>field.status!=='available'),
    versionMismatch:!!(observation?.gameVersion&&status.detected.gameVersion&&observation.gameVersion!==status.detected.gameVersion),
  };
}

export const observationLabel=(observation:GameObservation)=>observation.classification==='verified-live'?'Verified live observation':observation.classification==='save-derived'?'Saved game snapshot':'Historical observation';
export const fieldValue=(value:unknown)=>value===null?'Unknown':typeof value==='object'?JSON.stringify(value):String(value);
