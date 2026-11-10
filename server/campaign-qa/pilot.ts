import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {z} from 'zod';
import type {GameObservation} from '../../src/integration-types';
import type {BridgeDatabase} from '../bridge/telemetry';
import {parsePlayerLine,PLAYER_VERSION,sha} from './telemetry';

export const pilotConfig=z.object({
 logPath:z.string().min(1).max(4096),country:z.string().regex(/^[A-Z0-9]{3}$/),producer:z.string().regex(/^[a-f0-9]{16}$/),
 minutes:z.union([z.literal(2),z.number().int().min(30).max(60)]),
 dedicatedPlayset:z.literal(true),singlePlayer:z.literal(true),
 checksum:z.string().max(32).default('unknown'),configurationNote:z.string().max(500).default('unknown'),
}).strict();
export type PilotConfig=z.infer<typeof pilotConfig>;
const MAX_SOURCE=64*1024*1024,MAX_RAW=32*1024*1024,CHUNK=256*1024,ROTATE=4*1024*1024;
export const SAMPLE_MS=5000;
export class CampaignPilot {
 private timer?:ReturnType<typeof setInterval>;
 private config?:PilotConfig;private directory='';private offset=0;private identity='';private partial:Buffer=Buffer.alloc(0);private partialOffset=0;
 private startMono=0;private lastMono=0;private deadline=0;private initialSize=0;private rawPart=0;private partBytes=0;
 private cpu=process.cpuUsage();private generation=0;private session='';private lastDate:string|null=null;private seenBegin=false;
 private records:GameObservation[]=[];
 private outputBytes=0;
 private anchor='';private fieldAvailability:Record<string,{available:number;unavailable:number}>={};
 private metrics={samples:0,rawBytes:0,accepted:0,rejected:0,duplicates:0,connectionFailures:0,samplingGaps:0,estimatedMissedDays:0,maxSampleMs:0,maxRssBytes:0,cpuMicros:0,logGrowthBytes:0,sourceBacklogBytes:0};
 private state='idle';private reason='Not started';private runId='';private startedAt:string|null=null;private stoppedAt:string|null=null;
 constructor(private db:BridgeDatabase,private root:string,private gameVersion:()=>string|null,private now=()=>Date.now(),private mono=()=>performance.now()){}
 start(input:unknown){
  if(this.state==='recording')throw Error('A recording is already running');
  const c=pilotConfig.parse(input);
  if(this.gameVersion()!==PLAYER_VERSION)throw Error('Player telemetry candidate requires installed 1.19.4.2');
  if(!path.isAbsolute(c.logPath)||path.basename(c.logPath).toLowerCase()!=='game.log')throw Error('Select an absolute dedicated profile game.log path');
  const st=fs.statSync(c.logPath);if(!st.isFile()||st.size>MAX_SOURCE)throw Error('Select an existing regular game.log below 64 MiB');
  this.config=c;this.runId=randomUUID();this.session=this.runId;this.directory=path.join(this.root,'qa-pilots',this.runId);
  fs.mkdirSync(this.directory,{recursive:true});
  this.offset=st.size;this.initialSize=st.size;this.identity=this.fileIdentity(st);this.partial=Buffer.alloc(0);this.partialOffset=this.offset;
  const initial=fs.openSync(c.logPath,'r');try{this.anchor=this.readAnchor(initial,this.offset);}finally{fs.closeSync(initial);}this.fieldAvailability={};
  this.startMono=this.lastMono=this.mono();this.deadline=this.startMono+c.minutes*60000;this.cpu=process.cpuUsage();
  this.records=[];this.generation=0;this.seenBegin=false;this.lastDate=null;this.rawPart=0;this.partBytes=0;this.outputBytes=0;
  this.metrics={samples:0,rawBytes:0,accepted:0,rejected:0,duplicates:0,connectionFailures:0,samplingGaps:0,estimatedMissedDays:0,maxSampleMs:0,maxRssBytes:0,cpuMicros:0,logGrowthBytes:0,sourceBacklogBytes:0};
  this.state='recording';this.reason='Waiting for a new startup marker; pre-existing log bytes are excluded';
  this.startedAt=new Date(this.now()).toISOString();this.stoppedAt=null;
  fs.writeFileSync(path.join(this.directory,'manifest.json'),JSON.stringify({schemaVersion:1,runId:this.runId,startedAt:this.startedAt,config:c,gameVersion:PLAYER_VERSION,sourceIdentity:this.identity,startOffset:this.offset,sourceAttribution:'user-selected dedicated single-player profile, process binding unverified',bounds:{sampleMs:SAMPLE_MS,chunkBytes:CHUNK,rawBytes:MAX_RAW,sourceBytes:MAX_SOURCE,minutes:c.minutes}},null,2),{mode:0o600});
  this.timer=setInterval(()=>this.sample(),SAMPLE_MS);this.timer.unref();return this.status();
 }
 private fileIdentity(st:fs.Stats){return `${st.dev}:${st.ino}:${st.birthtimeMs}`;}
 private readAnchor(fd:number,offset:number){const size=Math.min(offset,512),b=Buffer.alloc(size);return sha(b.subarray(0,fs.readSync(fd,b,0,size,offset-size)));}
 private append(name:string,bytes:string|Buffer){const size=Buffer.byteLength(bytes);if(this.outputBytes+size>60*1024*1024)throw Error('total-storage-limit');fs.appendFileSync(path.join(this.directory,name),bytes,{mode:0o600});this.outputBytes+=size;}
 private boundary(){this.session=this.runId+':'+ ++this.generation;this.lastDate=null;this.seenBegin=false;}
 observations(){return this.runId?this.records:this.db.get<GameObservation[]>('qa:pilot-observations',[]);}
 status(){return {state:this.state,reason:this.reason,runId:this.runId||null,startedAt:this.startedAt,stoppedAt:this.stoppedAt,remainingSeconds:this.state==='recording'?Math.max(0,Math.ceil((this.deadline-this.mono())/1000)):0,country:this.config?.country??null,metrics:{...this.metrics},localDirectory:this.directory||null,limitations:['Process CPU is the entire companion process, not HOI4 CPU','Frame rate and causal performance impact require user baseline/during measurements','Stopping this monitor does not disable the playset or stop game-side logging','No process binding or same-date save reload qualification']};}
 sample(){
  if(this.state!=='recording'||!this.config)return;
  if(this.mono()>=this.deadline){this.stop('duration-limit');return;}
  const began=this.mono();let fd:number|undefined;
  try{
   if(this.gameVersion()!==PLAYER_VERSION)throw Error('game-version-changed');
   fd=fs.openSync(this.config.logPath,'r');const st=fs.fstatSync(fd);
   if(!st.isFile()||st.size>MAX_SOURCE)throw Error('source-size-limit');
   if(this.fileIdentity(st)!==this.identity||st.size<this.offset||this.readAnchor(fd,this.offset)!==this.anchor){this.boundary();this.identity=this.fileIdentity(st);this.offset=0;this.partial=Buffer.alloc(0);this.partialOffset=0;this.reason='Log replaced/truncated; awaiting startup marker';}
   const len=Math.min(CHUNK,Math.max(0,st.size-this.offset));
   if(this.metrics.rawBytes+len>MAX_RAW)throw Error('raw-storage-limit');
   const bytes=Buffer.alloc(len),count=fs.readSync(fd,bytes,0,len,this.offset),chunk=bytes.subarray(0,count);
   if(count){
    if(this.partBytes+count>ROTATE){this.rawPart++;this.partBytes=0;}
    this.append(`raw-${this.rawPart}.log`,chunk);this.partBytes+=count;this.metrics.rawBytes+=count;
    const text=Buffer.concat([this.partial,chunk]);let consumed=0;
    while(consumed<text.length){
     const end=text.indexOf(10,consumed);if(end<0)break;
     const offset=this.partialOffset+consumed,line=text.subarray(consumed,end+1).toString('utf8');consumed=end+1;
     if(line.includes(`HC_QA|v1|begin|p=${this.config.producer}|END`)){this.boundary();this.seenBegin=true;continue;}
     if(!line.includes('HC_QA|'))continue;
     if(!this.seenBegin){this.metrics.rejected++;continue;}
     const record=parsePlayerLine(line.trimEnd(),{producer:this.config.producer,country:this.config.country,sessionId:this.session,observedAt:new Date(this.now()).toISOString(),offset,sourcePath:this.config.logPath});
     if(!record){this.metrics.rejected++;if(/\|state\|/.test(line))throw Error('telemetry-identity-or-schema-mismatch');continue;}
     if(record.gameDate&&this.lastDate&&record.gameDate<this.lastDate){this.boundary();throw Error('date-rollback-restart-recording');}
     const previous=this.records.at(-1);
     if(previous&&previous.sessionId===record.sessionId&&previous.gameDate===record.gameDate&&JSON.stringify(previous.fields)===JSON.stringify(record.fields)){this.metrics.duplicates++;continue;}
     const engine=(date:string)=>{const [y,m,d,h]=date.split('.').map(Number);return Date.UTC(y,m-1,d,h);};
     if(this.lastDate&&record.gameDate)this.metrics.estimatedMissedDays+=Math.max(0,Math.floor((engine(record.gameDate)-engine(this.lastDate))/86400000)-1);
     if(this.metrics.accepted>=10000)throw Error('observation-count-limit');
     this.append('observations.jsonl',JSON.stringify(record)+'\n');
     this.lastDate=record.gameDate;this.records.push(record);this.records=this.records.slice(-200);this.metrics.accepted++;
     for(const [key,field] of Object.entries(record.fields)){const stats=this.fieldAvailability[key]??={available:0,unavailable:0};stats[field.status]++;}
    }
    this.partial=Buffer.from(text.subarray(consumed));this.partialOffset+=consumed;this.offset+=count;
    if(Buffer.byteLength(this.partial)>16384)throw Error('unterminated-record-limit');
    this.db.set('qa:pilot-observations',this.records);
   }
   this.metrics.logGrowthBytes=Math.max(this.metrics.logGrowthBytes,st.size-this.initialSize);
   this.metrics.sourceBacklogBytes=Math.max(0,st.size-this.offset);
   this.anchor=this.readAnchor(fd,this.offset);
   this.reason=this.seenBegin?'Recording appended observations; qualification remains unverified':'Waiting for new startup marker';
  }catch(error){this.metrics.connectionFailures++;try{fs.writeFileSync(path.join(this.directory,'failure.json'),JSON.stringify({at:new Date(this.now()).toISOString(),error:String(error)}),{mode:0o600});}catch{}this.stop('source-lost-or-limit-reached; inspect local diagnostics');}
  finally{
   if(fd!==undefined)fs.closeSync(fd);
   const elapsed=this.mono()-this.lastMono,delta=process.cpuUsage(this.cpu);this.cpu=process.cpuUsage();
   this.metrics.cpuMicros+=delta.user+delta.system;this.metrics.samples++;this.metrics.maxRssBytes=Math.max(this.metrics.maxRssBytes,process.memoryUsage().rss);
   this.metrics.maxSampleMs=Math.max(this.metrics.maxSampleMs,this.mono()-began);if(elapsed>SAMPLE_MS*2)this.metrics.samplingGaps+=Math.max(1,Math.floor(elapsed/SAMPLE_MS)-1);
   this.lastMono=this.mono();
   const last=this.records.at(-1);
   try{this.append('samples.jsonl',JSON.stringify({at:new Date(this.now()).toISOString(),elapsedMs:elapsed,processCpuMicros:delta.user+delta.system,processCpuPercent:elapsed>0?(delta.user+delta.system)/elapsed/10:null,rssBytes:process.memoryUsage().rss,sourceOffset:this.offset,latestObservationId:last?.id??null,latestObservationAgeMs:last?this.now()-Date.parse(last.capturedAt):null,...this.metrics})+'\n');}catch{this.stop('storage-write-failed');}
   if(this.state!=='recording')this.report();
  }
 }
 stop(reason='user-stop'){
  if(this.timer)clearInterval(this.timer);this.timer=undefined;
  if(this.state==='recording'){this.state='stopped';this.reason=reason;this.stoppedAt=new Date(this.now()).toISOString();this.report();}
  return this.status();
 }
 note(input:unknown){
  const {text}=z.object({text:z.string().min(1).max(2000)}).strict().parse(input);
  if(!this.directory)throw Error('Start a pilot before saving a note');
  const target=path.join(this.directory,'user-notes.jsonl');
  if(fs.existsSync(target)&&fs.statSync(target).size>128*1024)throw Error('Local note storage limit reached');
  fs.appendFileSync(target,JSON.stringify({at:new Date(this.now()).toISOString(),classification:'user-assertion',text})+'\n',{mode:0o600});return {saved:true,classification:'user-assertion'};
 }
 auditQuery(tool:string,ok:boolean){
  if(this.state!=='recording')return;
  try{this.append('qa-requests.jsonl',JSON.stringify({at:new Date(this.now()).toISOString(),tool,ok})+'\n');}catch{this.stop('request-audit-storage-limit');}
 }
 private report(){
  try{
  const report={schemaVersion:1,...this.status(),fieldAvailability:this.fieldAvailability,availabilityWindow:'all accepted observations; full records retained in observations.jsonl',countries:[...new Set(this.records.map(r=>r.country))],capturedObservations:this.metrics.accepted,gameCpuImpact:'unavailable without independent baseline/during measurement',fpsImpact:'unavailable',nativeCountryVerification:'pending',usefulnessAcceptance:'pending real user questions and paired comparison',rawFiles:fs.readdirSync(this.directory).filter(f=>/^raw-\d+\.log$/.test(f)).map(name=>({name,bytes:fs.statSync(path.join(this.directory,name)).size,sha256:sha(fs.readFileSync(path.join(this.directory,name)))}))};
  fs.writeFileSync(path.join(this.directory,'report.json'),JSON.stringify(report,null,2),{mode:0o600});
  }catch{this.reason='storage-write-failed; raw records retained where available';}
 }
 close(){this.stop('application-shutdown');}
}
