import fs from 'node:fs';
import path from 'node:path';
import type {GameObservation,IntegrationStatus,ObservationField} from '../../src/integration-types';
import type {BridgeSnapshot} from '../../src/bridge-types';
import {GameBridge} from './service';
import {CampaignHistory} from './history';
import {inspectSaveFile} from './save-reader';
import {nativeQualifiedFields} from './observation-capabilities';
import {freshness} from './telemetry';
import type {OwnedManifest} from './owned-session';

export function telemetryObservation(s:BridgeSnapshot,currentId:string|null):GameObservation {
 const fields:Record<string,ObservationField>={};
 const put=(key:string,v:any)=>{fields[key]=v.status==='observed'?{status:'available',value:v.value,qualification:s.schemaVersion===2&&s.gameVersion==='1.19.4.2'&&s.dataOrigin!=='fixture'&&nativeQualifiedFields.includes(key)?'native-verified':'parsed-unqualified',reason:'Snapshot value; independent qualification applies only to documented version and field'}:{status:'unavailable',value:null,qualification:'unsupported',reason:v.reason};};
 for(const [key,v] of Object.entries(s.values))put(key,v);
 for(const group of ['focusCompleted','technologyCompleted','technologyResearching'] as const)for(const [id,v] of Object.entries(s.campaign?.[group]||{}))put(group+'.'+id,v);
 for(const key of s.unavailable)if(!fields[key])fields[key]={status:'unavailable',value:null,qualification:'unsupported',reason:'No qualified observation in this snapshot'};
 const live=s.id===currentId&&s.dataOrigin!=='fixture'&&!!s.ownership&&freshness(s).status==='recent-log-write';
 return {schemaVersion:1,id:s.id,source:{kind:'telemetry',path:s.source.path,hash:s.source.hash},classification:live?'verified-live':'historical',sessionId:s.sessionId,gameVersion:s.gameVersion,gameDate:s.values.gameDate.value,country:s.values.country.value,capturedAt:s.observedAt,fields,limitations:['Live classification requires current owned session; field qualification remains independent','Explicit telemetry manifest subset only','Planning assumptions are never replaced','File modification time is not engine time or process liveness']};
}

/** One application-owned bridge, database, session contract and action gateway for UI and MCP. */
export class BridgePlatform {
 private timer?:ReturnType<typeof setInterval>;private logPath:string|null=null;private lastPollAt:string|null=null;private diagnostic='Not connected';
 private attachedVersion:string|null=null;private kind:'log'|'owned'|null=null;
 readonly history:CampaignHistory;
 constructor(readonly bridge:GameBridge){this.history=new CampaignHistory(bridge.database);}
 connect(input:{source:string;path?:string}){
  if(this.bridge.database.get('emergency-stop',false))throw Error('Emergency stop is latched; observation connection remains stopped');
  const environment=this.bridge.environment();let log:string,manifest:OwnedManifest|undefined;
  if(input.source==='detected-log'){if(!environment.logs)throw Error('No detected game log directory; use an explicit log or owned manifest');log=path.join(environment.logs,'game.log');}
  else if(input.source==='log'){if(typeof input.path!=='string'||!path.isAbsolute(input.path))throw Error('Supply an absolute game.log path');log=input.path;}
  else if(input.source==='owned'){
   if(typeof input.path!=='string'||!path.isAbsolute(input.path))throw Error('Supply an absolute read-only owned manifest path');
   if(fs.statSync(input.path).size>65536)throw Error('Owned manifest too large');manifest=JSON.parse(fs.readFileSync(input.path,'utf8'));log=manifest!.logPath;
  }else throw Error('Unknown observation connection source');
  const stat=fs.statSync(log);if(!stat.isFile()||stat.size>64*1024*1024)throw Error('Expected regular bounded game log');
  this.bridge.attachTelemetry(log,manifest);this.stopTimer();this.logPath=log;this.kind=manifest?'owned':'log';this.attachedVersion=environment.version;
  this.poll();this.timer=setInterval(()=>{try{this.poll();}catch(error){this.diagnostic=String(error);this.stopTimer();}},5000);this.timer.unref();return this.status();
 }
 private stopTimer(){if(this.timer)clearInterval(this.timer);this.timer=undefined;}
 disconnect(){this.stopTimer();this.bridge.detachTelemetry();this.kind=null;this.logPath=null;this.diagnostic='Disconnected; retained observations remain historical';return this.status();}
 poll(){
  if(this.bridge.database.get('emergency-stop',false)){this.stopTimer();throw Error('Emergency stop is latched');}
  if(!this.kind)throw Error('Choose an observation connection first');
  if(this.bridge.environment().version!==this.attachedVersion){this.stopTimer();throw Error('Installed game version changed; reconnect after compatibility review');}
  const result=this.bridge.poll();this.lastPollAt=new Date().toISOString();this.diagnostic=result.diagnostic;return result;
 }
 observations(intelligence=this.bridge.intelligence()):GameObservation[]{
  const latest=intelligence.snapshots.at(-1);
  const telemetry=latest?[telemetryObservation(latest,intelligence.liveSnapshotId)]:[];
  return [...telemetry,...this.bridge.database.get<GameObservation[]>('platform:save-observations',[])];
 }
 inspectSave(input:{path:string;country?:string}){
  const observation=inspectSaveFile(input.path,input.country),saved=this.bridge.database.get<GameObservation[]>('platform:save-observations',[]);
  this.bridge.database.set('platform:save-observations',[observation,...saved.filter(s=>s.id!==observation.id)].slice(0,20));return observation;
 }
 snapshots(input:{sessionId?:string;recordingId?:string;limit?:number}={}){
  const limit=input.limit??100;if(!Number.isInteger(limit)||limit<1||limit>200)throw Error('History limit must be 1–200');
  const snapshots=input.recordingId?this.history.get(input.recordingId).snapshots:this.bridge.database.snapshots(input.sessionId,limit);
  return {schemaVersion:1,origin:input.recordingId?'imported-historical':'bridge-history',snapshots:snapshots.filter(s=>!input.sessionId||s.sessionId===input.sessionId).slice(-limit),recordings:this.history.list().map(r=>({id:r.id,name:r.name,origin:r.origin,count:r.snapshots.length}))};
 }
 compare(input:{before:string;after:string;recordingId?:string}){
  const list=input.recordingId?this.history.get(input.recordingId).snapshots:this.bridge.database.snapshots(undefined,10000),a=list.find(s=>s.id===input.before),b=list.find(s=>s.id===input.after);
  if(!a||!b||a.sessionId!==b.sessionId||a.gameVersion!==b.gameVersion||a.values.country.value!==b.values.country.value)throw Error('Comparison requires two snapshots from the same session, country and game version');
  const left=telemetryObservation(a,null),right=telemetryObservation(b,null);
  return {schemaVersion:1,before:a.id,after:b.id,interpretation:'Snapshot differences only, not completion events',changes:Object.keys({...left.fields,...right.fields}).filter(k=>JSON.stringify(left.fields[k]?.value)!==JSON.stringify(right.fields[k]?.value)).map(field=>({field,before:left.fields[field]??null,after:right.fields[field]??null}))};
 }
 stop(){const result=this.bridge.gateway.stop();this.stopTimer();this.bridge.owned?.stop();return {...result,monitoringStopped:true};}
 status():IntegrationStatus {
  const environment=this.bridge.environment(),intelligence=this.bridge.intelligence(),stopped=this.bridge.database.get('emergency-stop',false);
  return {schemaVersion:1,connection:{state:stopped?'stopped':this.kind==='owned'&&intelligence.session.state==='owned-connected'?'owned-connected':this.kind==='log'?'log-monitoring':'disconnected',reason:stopped?'Emergency stop latched; no undo':this.kind==='owned'?intelligence.session.reason:this.diagnostic,logPath:this.logPath,polling:!!this.timer,lastPollAt:this.lastPollAt},detected:{logPath:environment.logs?path.join(environment.logs,'game.log'):null,gameVersion:environment.version,ownedManifestHint:'Only an explicitly selected compatible read-only launch manifest can prove ownership'},observations:this.observations(intelligence),capabilities:[...intelligence.observationCapabilities!.map(c=>({id:c.id,available:c.availability==='verified'||c.availability==='historical-only',qualification:c.qualification,reason:c.reason})),{id:'save.inspect.plaintext',available:true,qualification:'parsed-unqualified',reason:'Player country on 1.19.4.2 only; persisted state, not live'},{id:'session.loaded-save',available:false,qualification:'unsupported',reason:'Date rollback and changed log/process quarantine are checked; same-date loaded-save lifecycle is not qualified'},{id:'commands.execute',available:false,qualification:'unsupported',reason:'No gameplay execution exposed by the M7 integration platform'}],diagnostics:[this.diagnostic,'Installed references and user assumptions are separate from observed campaign state','Save mappings and loaded-save lifecycle still require independent native qualification']};
 }
 close(){this.stopTimer();}
}
