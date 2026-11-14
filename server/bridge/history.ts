import {createHash} from 'node:crypto';
import path from 'node:path';
import type {BridgeSnapshot} from '../../src/bridge-types';
import type {CampaignRecording,BaselineInput,BaselinePreview} from '../../src/history-types';
import type {Profile,Meta} from '../../src/types';
import type {Store} from '../store';
import {BridgeDatabase,replaySnapshots} from './telemetry';
import {telemetryNumbers} from '../../src/telemetry-manifest';
import {mirrorPlanner} from '../planner/plans';
import {makePreview} from '../planner/service';
import {validPlanDate} from '../planner/validation';

const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const basename=(s:string)=>path.win32.basename(s.replaceAll('/','\\'));
/** Deliberate allowlist: retain evidence, never arbitrary imported keys or local asset paths. */
function portable(s:BridgeSnapshot):BridgeSnapshot {
  const value=(v:any):any=>v.status==='observed'?{status:'observed',value:v.value}:{status:'unavailable',value:null,reason:v.reason};
  const o=s.ownership,f=s.focusObservation;
  return {schemaVersion:s.schemaVersion,id:s.id,sessionId:s.sessionId,producerId:s.producerId,observedAt:s.observedAt,gameVersion:s.gameVersion,
    ...(s.dataOrigin?{dataOrigin:s.dataOrigin}:{}),source:{kind:'game-log',path:basename(s.source.path),offset:s.source.offset,hash:s.source.hash},
    values:{country:value(s.values.country),gameDate:value(s.values.gameDate),politicalPower:value(s.values.politicalPower),stability:value(s.values.stability),...Object.fromEntries(Object.keys(telemetryNumbers).filter(k=>k in s.values).map(k=>[k,value((s.values as any)[k])]))},...(s.campaign?{campaign:{manifestId:s.campaign.manifestId,method:s.campaign.method,coverage:s.campaign.coverage,focusCompleted:Object.fromEntries(Object.entries(s.campaign.focusCompleted).map(([k,v])=>[k,value(v)])),technologyCompleted:Object.fromEntries(Object.entries(s.campaign.technologyCompleted).map(([k,v])=>[k,value(v)])),technologyResearching:Object.fromEntries(Object.entries(s.campaign.technologyResearching).map(([k,v])=>[k,value(v)]))}}:{}),unavailable:[...s.unavailable],
    ...(o?{ownership:{sessionId:o.sessionId,pid:o.pid,creationTime:o.creationTime,executable:basename(o.executable),executableHash:o.executableHash,logIdentity:o.logIdentity,beginOffset:o.beginOffset,sequence:o.sequence,correlation:o.correlation}}:{}),
    ...(f?{focusObservation:{current:value(f.current),observedAt:f.observedAt,sessionId:f.sessionId,verification:f.verification,source:{kind:'ui-ocr' as const,imagePath:basename(f.source.imagePath),imageHash:f.source.imageHash,text:f.source.text,panelText:''}}}:{})};
}
export class CampaignHistory {
  constructor(private database:BridgeDatabase){database.db.exec('CREATE TABLE IF NOT EXISTS imported_recordings(id TEXT PRIMARY KEY,payload TEXT NOT NULL);');}
  list():CampaignRecording[]{return this.database.db.prepare('SELECT payload FROM imported_recordings ORDER BY rowid DESC').all().map(row=>{const r=JSON.parse(String(row.payload));if(r.schemaVersion!==1||!Array.isArray(r.snapshots))throw Error('Incompatible saved recording. Use a compatible application; stored data has not been changed.');replaySnapshots(r.snapshots.map((s:BridgeSnapshot)=>JSON.stringify(s)).join('\n'));return r;});}
  get(id:string):CampaignRecording {const row=this.database.db.prepare('SELECT payload FROM imported_recordings WHERE id=?').get(id);if(!row)throw Error('Recording no longer exists.');const r=JSON.parse(String(row.payload));if(r.schemaVersion!==1)throw Error('Incompatible recording schema; use a compatible application.');return r;}
  import(input:any){
    if(!input||typeof input.text!=='string'||Buffer.byteLength(input.text)>700000||!['fixture','recording'].includes(input.origin)||typeof input.name!=='string'||!input.name.trim()||input.name.length>100)throw Error('Supply a name, recording/fixture origin and up to 700 KB of snapshot JSONL.');
    const snapshots=replaySnapshots(input.text).map(portable).sort((a,b)=>a.id.localeCompare(b.id));if(!snapshots.length)throw Error('Recording contains no snapshots.');
    const origin=input.origin==='fixture'||snapshots.some(s=>s.dataOrigin==='fixture')?'fixture':'recording';
    const id=hash({origin,snapshots});const existing=this.database.db.prepare('SELECT id FROM imported_recordings WHERE id=?').get(id);
    const record:CampaignRecording={schemaVersion:1,id,name:basename(input.name.trim()),origin,importedAt:new Date().toISOString(),snapshots,modContext:'unavailable'};
    this.database.db.prepare('INSERT OR IGNORE INTO imported_recordings VALUES(?,?)').run(id,JSON.stringify(record));
    return {recording:this.get(id),duplicate:!!existing};
  }
  remove(id:string,confirmation:string){const r=this.get(id);if(confirmation!==r.name)throw Error('Type the recording name to confirm removal.');this.database.db.prepare('DELETE FROM imported_recordings WHERE id=?').run(id);}
  preview(store:Store,input:BaselineInput):BaselinePreview {
    if(!input||typeof input.profileId!=='string'||!/^history-[a-f0-9-]{36}$/.test(input.profileId)||typeof input.name!=='string'||!input.name.trim()||input.name.length>100||typeof input.tree!=='string'||input.tree.length>800||typeof input.indexRevision!=='string')throw Error('Invalid baseline preview request.');
    if(store.profile(input.profileId)||store.db.prepare('SELECT id FROM profile_tombstones WHERE id=?').get(input.profileId))throw Error('This planning workspace already exists or was deleted. Preview a new workspace; existing plans are never overwritten.');
    const record=this.get(input.recordingId),snapshot=record.snapshots.find(s=>s.id===input.snapshotId);if(!snapshot)throw Error('Snapshot is not part of this recording.');
    const tag=snapshot.values.country,date=snapshot.values.gameDate;
    if(tag.status!=='observed'||!/^[A-Z0-9]{3}$/.test(tag.value)||date.status!=='observed'||!/^\d{4}\.\d{2}\.\d{2}(\.\d{1,2})?$/.test(date.value))throw Error('Observed country and a valid game date are required. Missing values cannot be inferred; create a manual campaign instead.');
    const startDate=validPlanDate(date.value.slice(0,10).replaceAll('.','-'));
    if(input.tree&&!store.resolve(input.tree,'focus_tree').entry)throw Error('Selected focus tree is missing or ambiguous. Choose a current installed definition.');
    const warnings=['Historical imported evidence; origin is not independently authenticated. No live game command.', 'Completed focuses, research, decisions, political conditions, DLC/playset and historical-AI setting are unavailable. Empty manual completions are not an in-game negative.', 'Active focus is context only: no completion or remaining duration is inferred. Hour 24 is retained in evidence; the planner uses the stated calendar day.'];
    if(snapshot.campaign)warnings.push('Recorded focus/research checks cover only the explicit manifest subset. They remain historical context and do not overwrite manual completions or assumptions.');
    const meta=store.getSetting<Meta|null>('meta',null);if(snapshot.gameVersion!==meta?.version)warnings.push('Recording game version differs from or cannot be checked against the installed reference index. Recheck source rules.');
    if(record.origin==='fixture')warnings.unshift('OFFLINE TEST FIXTURE: this workspace is not evidence of a real campaign.');
    const p:Profile=mirrorPlanner({id:input.profileId,revision:0,name:input.name.trim(),country:tag.value,startDate,historical:false,goals:'Historical baseline; review unsupported conditions before planning.',tree:input.tree,dlcs:[],dlcConfirmed:false,dlcStates:{},queue:[],completed:[],bookmarks:[],notes:{},templates:[],exportSchemaVersion:3,referenceIndexRevision:input.indexRevision});
    p.planner!.plans[0].assumptions=warnings;
    const baseline={schemaVersion:1 as const,recordingId:record.id,recordingName:record.name,origin:record.origin,snapshot,indexRevision:input.indexRevision,modContext:record.modContext};
    const preview=makePreview(store,p,p.planner!.plans[0],0,input.indexRevision);
    // Bind readback evidence as well as planner meaning to the reviewed fingerprint.
    preview.fingerprint=hash({planner:preview.fingerprint,baseline});
    return {input,profile:p,baseline,preview,warnings};
  }
  apply(store:Store,input:BaselineInput,fingerprint:string){
    const reviewed=this.preview(store,input);
    const result=store.saveProfile(reviewed.profile,{semanticApply:true,beforeWrite:()=>{
      const current=this.preview(store,input);if(current.preview.fingerprint!==fingerprint)throw Error('Baseline or references changed. Review a fresh preview.');
      store.setSetting('history-baseline:'+input.profileId,current.baseline);
    }});
    if(result.conflict)throw Error('Workspace changed. Review a fresh preview.');return result.saved!;
  }
}
