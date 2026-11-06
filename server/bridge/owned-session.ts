import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,execFile} from 'node:child_process';
import type {BridgeSnapshot} from '../../src/bridge-types';
import {BridgeDatabase,digest} from './telemetry';
import {verifyProfileLease,type ProfileLease} from './native-profile';
import {readProcessIdentity} from './process-identity';

export interface ProcessIdentity {pid:number;creation_time:string;executable_path:string;}
export interface OwnedManifest {
  schemaVersion:1;purpose?:'telemetry';sessionId:string;producerId:string;identity:ProcessIdentity;executableHash:string;gameVersion:string;
  launchedAt:string;logPath:string;lease:ProfileLease;controllerId:string;python:string;
}
export interface FocusCapture {known:boolean;focusId:string|null;text:string;panelText:string;imagePath:string;imageHash:string;observedAt:number;}
const helper=path.resolve('scripts/bridge-live-tools.py');
export function queryIdentity(python:string,pid:number,executable:string):ProcessIdentity {
  return JSON.parse(execFileSync(python,[helper],{input:JSON.stringify({operation:'identity',pid,executable}),encoding:'utf8',windowsHide:true,timeout:15000}));
}
export class OwnedSession {
  constructor(readonly manifest:OwnedManifest,private db:BridgeDatabase,private probe=()=>manifest.purpose==='telemetry'?readProcessIdentity(manifest.identity.pid):queryIdentity(manifest.python,manifest.identity.pid,manifest.identity.executable_path),private now=Date.now){}
  private key(suffix:string){return `owned:${this.manifest.sessionId}:${suffix}`;}
  check():string|null {
    try{
      const m=this.manifest;
      if(this.db.get(this.key('quarantined'),false))throw new Error('Owned session quarantined; create a new session');
      if(this.db.get(this.key('stopped'),false))throw new Error('Owned session stopped');
      if(this.now()-Date.parse(m.launchedAt)>(m.purpose==='telemetry'?25:20)*60*1000)throw new Error('Native time budget reached');
      if(JSON.stringify(this.probe())!==JSON.stringify(m.identity))throw new Error('Owned process identity changed or disconnected');
      verifyProfileLease(m.lease);
      if(m.producerId!==m.lease.token||path.resolve(m.logPath)!==path.join(m.lease.profileRoot,'logs','game.log'))throw new Error('Profile, producer or log binding mismatch');
      if(digest(fs.readFileSync(m.identity.executable_path))!==m.executableHash)throw new Error('Executable hash changed');
      const stat=fs.statSync(m.logPath),identity=`${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
      if(stat.birthtimeMs<Date.parse(m.launchedAt)-2000)throw new Error('Log predates owned launch');
      if(stat.size>64*1024*1024)throw new Error('Owned log exceeds bounded inspection size');
      const text=fs.readFileSync(m.logPath,'utf8');
      const markers=[...text.matchAll(/HC_BRIDGE\|v[12]\|begin\|producer=([a-zA-Z0-9_-]+)\|END/g)];
      if(markers.length!==1||markers[0][1]!==m.producerId)throw new Error('Missing, old or contradictory launch marker');
      const binding={identity,beginOffset:Buffer.byteLength(text.slice(0,text.lastIndexOf('\n',markers[0].index)+1))};
      const prior=this.db.get<{identity:string;beginOffset:number;size:number}|null>(this.key('log'),null);
      if(prior&&(prior.identity!==binding.identity||prior.beginOffset!==binding.beginOffset||stat.size<prior.size))throw new Error('Owned log rotated or truncated; a new launch/session is required');
      this.db.set(this.key('log'),{...binding,size:stat.size});
      return null;
    }catch(error){if(this.db.get(this.key('log'),null))this.db.set(this.key('quarantined'),true);return String(error);}
  }
  bind(snapshot:BridgeSnapshot):BridgeSnapshot {
    const error=this.check();if(error)throw new Error(error);
    const m=this.manifest,binding=this.db.get<{identity:string;beginOffset:number}>(this.key('log'),{identity:'',beginOffset:-1});
    if(snapshot.producerId!==m.producerId||snapshot.gameVersion!==m.gameVersion||path.resolve(snapshot.source.path)!==path.resolve(m.logPath)||snapshot.source.offset<=binding.beginOffset||snapshot.values.country.value!=='GER')throw new Error('Observation is not from the owned campaign');
    const bytes=fs.readFileSync(m.logPath),end=bytes.indexOf(10,snapshot.source.offset);
    if(end<0||digest(bytes.subarray(snapshot.source.offset,end).toString('utf8').trimEnd())!==snapshot.source.hash)throw new Error('Observation source bytes no longer match');
    const sequence=this.db.get(this.key('sequence'),0)+1;this.db.set(this.key('sequence'),sequence);
    const result:BridgeSnapshot={...snapshot,id:digest(m.sessionId+snapshot.id),sessionId:m.sessionId,ownership:{sessionId:m.sessionId,pid:m.identity.pid,creationTime:m.identity.creation_time,executable:m.identity.executable_path,executableHash:m.executableHash,logIdentity:binding.identity,beginOffset:binding.beginOffset,sequence,correlation:'owned-profile-and-launch-token'}};
    this.db.db.prepare('INSERT OR IGNORE INTO snapshots VALUES(?,?,?)').run(result.id,result.sessionId,JSON.stringify(result));this.db.set(this.key('latest'),result);return result;
  }
  latest():BridgeSnapshot|null {return this.check()?null:this.db.get<BridgeSnapshot|null>(this.key('latest'),null);}
  focusFresh(s:BridgeSnapshot):boolean {
    const f=s.focusObservation;
    return !this.check()&&s.sessionId===this.manifest.sessionId&&s.ownership?.sessionId===this.manifest.sessionId&&!!f&&f.sessionId===s.sessionId&&f.current.status==='observed'&&this.now()-Date.parse(f.observedAt)>=0&&this.now()-Date.parse(f.observedAt)<30000;
  }
  recordFocus(c:FocusCapture):BridgeSnapshot {
    const previous=this.latest();if(!previous)throw new Error('No owned log anchor');
    const when=c.observedAt*1000;if(!Number.isFinite(when)||Math.abs(this.now()-when)>30000)throw new Error('Stale UI capture');
    const sequence=this.db.get(this.key('sequence'),0)+1;this.db.set(this.key('sequence'),sequence);
    const result:BridgeSnapshot={...previous,id:digest(`${previous.id}:${sequence}:${c.imageHash}`),ownership:{...previous.ownership!,sequence},focusObservation:{current:c.known?{value:c.focusId,status:'observed'}:{value:null,status:'unavailable',reason:'Politics panel / exact focus label not recognized'},observedAt:new Date(when).toISOString(),sessionId:previous.sessionId,source:{kind:'ui-ocr',imagePath:c.imagePath,imageHash:c.imageHash,text:c.text,panelText:c.panelText},verification:c.known?'exact-localized-ui-label':'unverified'},unavailable:previous.unavailable.filter(v=>v!=='focus')};
    if(!c.known)result.unavailable.push('focus');
    this.db.db.prepare('INSERT OR IGNORE INTO snapshots VALUES(?,?,?)').run(result.id,result.sessionId,JSON.stringify(result));this.db.set(this.key('latest'),result);return result;
  }
  async tool(operation:'observe'|'select',signal?:AbortSignal):Promise<any>{
    if(this.manifest.purpose==='telemetry')throw new Error('Read-only telemetry session cannot invoke an input/OCR adapter');
    const error=this.check();if(error)throw new Error(error);
    const m=this.manifest;
    const input={operation,pid:m.identity.pid,executable:m.identity.executable_path,identity:m.identity,evidenceRoot:path.join(m.lease.runRoot,'focus-evidence'),focusId:'GER_prioritize_economic_growth'};
    const child=execFile(m.python,[helper],{windowsHide:true,timeout:25000,maxBuffer:1024*1024,signal});
    const result=new Promise<string>((resolve,reject)=>{let out='',err='';child.stdout?.on('data',b=>out+=b);child.stderr?.on('data',b=>err+=b);child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(new Error(err||`Adapter exited ${code}`)));});
    child.stdin!.end(JSON.stringify(input));const value=JSON.parse(await result);
    const after=this.check();if(after)throw new Error(after);return value;
  }
  reserveInput(){
    if(this.manifest.purpose==='telemetry')throw new Error('Read-only telemetry session cannot reserve adapter input');
    const error=this.check();if(error)throw new Error(error);
    const file=path.join(this.manifest.lease.runRoot,'native-budget.json');
    const budget=JSON.parse(fs.readFileSync(file,'utf8'));
    if(budget.stopped||budget.inputs>=20)throw new Error('Native input budget exhausted/stopped');
    budget.inputs++;fs.writeFileSync(file,JSON.stringify(budget,null,2));
  }
  stop(){this.db.set(this.key('stopped'),true);}
}
