import type {BridgeSnapshot,CampaignIntelligence,Value} from './bridge-types';
export type RecordingOrigin='recording'|'fixture';
export function ageLabel(timestamp:string|undefined,now:number){
  const age=timestamp?now-Date.parse(timestamp):NaN;
  if(!Number.isFinite(age)||age<0)return 'Timestamp unavailable';
  if(age<=30000)return 'Recent (under 30 seconds)';
  const unit=age<60000?['seconds',1000]:age<3600000?['minutes',60000]:age<86400000?['hours',3600000]:['days',86400000];
  return `Stale · ${Math.floor(age/Number(unit[1]))} ${unit[0]} old`;
}
export function observationLabel(s:BridgeSnapshot,data:CampaignIntelligence|null,origin:RecordingOrigin|null,now:number){
  if(origin==='fixture'||s.dataOrigin==='fixture')return 'Offline test fixture';
  if(origin==='recording')return 'Imported recording · origin unverified';
  const recent=(timestamp:string)=>now-Date.parse(timestamp)>=0&&now-Date.parse(timestamp)<=30000;
  if(data?.session.state==='owned-connected'&&data.liveSnapshotId===s.id&&s.sessionId===data.session.id&&
    (recent(s.observedAt)||(s.focusObservation?.current.status==='observed'&&recent(s.focusObservation.observedAt))))return 'Live owned observation';
  return 'Historical log observation';
}
export function valueText(value:Value<string|number|null>|undefined):string {
  return value?.status==='observed'?(value.value===null?'No focus selected':String(value.value)):'Unavailable';
}
export function compareSnapshots(before:BridgeSnapshot,after:BridgeSnapshot){
  if(before.values.country.status!=='observed'||after.values.country.status!=='observed'||!before.gameVersion||!after.gameVersion||before.sessionId!==after.sessionId||before.values.country.value!==after.values.country.value||before.gameVersion!==after.gameVersion)return null;
  return (['politicalPower','stability'] as const).map(key=>{
    const a=before.values[key],b=after.values[key];
    return {key,delta:a.status==='observed'&&b.status==='observed'?b.value-a.value:null};
  });
}
