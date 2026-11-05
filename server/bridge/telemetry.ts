import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import type {BridgeSnapshot,Value} from '../../src/bridge-types';

export const digest=(text:string|Buffer)=>createHash('sha256').update(text).digest('hex');
const unavailable=(reason:string):Value<never>=>({value:null,status:'unavailable',reason});
const numberValue=(value:string|undefined):Value<number>=>value!==undefined&&/^-?\d+(?:\.\d+)?$/.test(value)&&Number.isFinite(Number(value))?{value:Number(value),status:'observed'}:unavailable('Missing or unexpanded numeric token');

/** Only terminated v1 wire records are accepted. Never coerce an unknown token to zero. */
export function parseTelemetry(line:string,context:{sessionId:string;observedAt:string;gameVersion:string|null;path:string;offset:number}):BridgeSnapshot|null {
  const match=line.match(/HC_BRIDGE\|v1\|state\|([^\r\n]*?)\|END\s*$/);
  if(!match)return null;
  const fields:Record<string,string>=Object.create(null);
  for(const part of match[1].split('|')){const pair=part.match(/^([a-z]+)=([^|]*)$/);if(!pair||fields[pair[1]]!==undefined)return null;fields[pair[1]]=pair[2];}
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(fields.producer||''))return null;
  const gameDate=line.match(/\[(\d{4}\.\d{2}\.\d{2}\.\d{2})\]/)?.[1];
  const country=/^[A-Z0-9]{3}$/.test(fields.tag||'')?{value:fields.tag,status:'observed' as const}:unavailable('Missing or unexpanded country tag');
  const values={country,gameDate:gameDate?{value:gameDate,status:'observed' as const}:unavailable('Engine date prefix unavailable'),politicalPower:numberValue(fields.pp),stability:numberValue(fields.stability)};
  const hash=digest(line);
  return {schemaVersion:1,id:digest(context.sessionId+'\n'+line),sessionId:context.sessionId,producerId:fields.producer,observedAt:context.observedAt,gameVersion:context.gameVersion,source:{kind:'game-log',path:context.path,offset:context.offset,hash},values,unavailable:['research','focus','production','construction','diplomacy','military','pause',...Object.entries(values).filter(([,v])=>v.status==='unavailable').map(([k])=>k)]};
}

export class BridgeDatabase {
  readonly db:DatabaseSync;
  constructor(directory:string){
    fs.mkdirSync(directory,{recursive:true});
    this.db=new DatabaseSync(path.join(directory,'bridge.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS bridge_meta(key TEXT PRIMARY KEY,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,session TEXT NOT NULL,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS controller_lock(id INTEGER PRIMARY KEY CHECK(id=1),request TEXT NOT NULL);`);
  }
  get<T>(key:string,fallback:T):T{const r=this.db.prepare('SELECT payload FROM bridge_meta WHERE key=?').get(key);return r?JSON.parse(String(r.payload)):fallback;}
  set(key:string,value:unknown){this.db.prepare('INSERT OR REPLACE INTO bridge_meta VALUES(?,?)').run(key,JSON.stringify(value));}
  snapshots(session?:string,limit=1000):BridgeSnapshot[]{return this.db.prepare(`SELECT payload FROM (SELECT rowid,payload FROM snapshots ${session?'WHERE session=?':''} ORDER BY rowid DESC LIMIT ?) ORDER BY rowid`).all(...(session?[session]:[]),Math.min(10000,Math.max(1,limit))).map(r=>JSON.parse(String(r.payload)));}
  latest():BridgeSnapshot|null{return this.snapshots(undefined,1)[0]||null;}
  close(){this.db.close();}
}

interface Cursor {offset:number;anchor:string;generation:string;sessionId:string;identity:string;version:string|null;}
export class TelemetryReader {
  diagnostic='Not polled';
  constructor(private storage:BridgeDatabase,readonly logPath:string,private version:string|null){}
  poll():BridgeSnapshot[]{
    if(!this.logPath){this.diagnostic='No telemetry log configured';return [];}
    let fd:number;
    try{fd=fs.openSync(this.logPath,'r');}catch{this.diagnostic='Telemetry log unavailable';return [];}
    try{
      const stat=fs.fstatSync(fd),key='cursor:'+path.resolve(this.logPath),identity=`${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
      let cursor=this.storage.get<Cursor|null>(key,null);
      const read=(start:number,length:number)=>{const b=Buffer.alloc(length);return b.subarray(0,fs.readSync(fd,b,0,length,start));};
      const anchor=(offset:number)=>digest(read(Math.max(0,offset-512),Math.min(offset,512)));
      if(!cursor||cursor.identity!==identity||stat.size<cursor.offset||cursor.anchor!==anchor(cursor.offset)||cursor.version!==this.version){
        const generation=randomUUID();cursor={offset:0,anchor:digest(''),generation,sessionId:generation,identity,version:this.version};
      }
      const buffer=read(cursor.offset,Math.min(4*1024*1024,stat.size-cursor.offset));
      const end=buffer.lastIndexOf(10);
      if(end<0){this.diagnostic=buffer.length>=4*1024*1024?'Oversized unterminated log record; reader stopped':'Waiting for complete records';return [];}
      const snapshots:BridgeSnapshot[]=[];let consumed=0;let malformed=0;
      this.storage.db.exec('BEGIN IMMEDIATE');
      try{
        for(const chunk of buffer.subarray(0,end+1).toString('utf8').split(/(?<=\n)/)){
          const offset=cursor.offset+consumed;consumed+=Buffer.byteLength(chunk);const line=chunk.trimEnd();
          if(line.length>16384){malformed++;continue;}
          if(/HC_BRIDGE\|v1\|begin\|producer=[a-zA-Z0-9_-]{1,80}\|END\s*$/.test(line))cursor.sessionId=digest(cursor.generation+':'+offset);
          const snapshot=parseTelemetry(line,{sessionId:cursor.sessionId,observedAt:new Date(stat.mtimeMs).toISOString(),gameVersion:this.version,path:this.logPath,offset});
          if(snapshot){
            // Repeated emissions at the same game date with identical values are one observation.
            const duplicate=digest(JSON.stringify([snapshot.sessionId,snapshot.producerId,snapshot.values]));
            snapshot.id=duplicate;
            const inserted=this.storage.db.prepare('INSERT OR IGNORE INTO snapshots VALUES(?,?,?)').run(snapshot.id,snapshot.sessionId,JSON.stringify(snapshot));
            if(inserted.changes)snapshots.push(snapshot);
          }else if(line.includes('HC_BRIDGE|')&&!line.includes('|begin|'))malformed++;
        }
        cursor.offset+=end+1;cursor.anchor=anchor(cursor.offset);this.storage.set(key,cursor);
        this.storage.db.exec('COMMIT');
      }catch(error){this.storage.db.exec('ROLLBACK');throw error;}
      this.diagnostic=`Read ${end+1} bytes; ${snapshots.length} new snapshots; ${malformed} rejected records`;
      return snapshots;
    }finally{fs.closeSync(fd);}
  }
}

export function freshness(snapshot:BridgeSnapshot|null,now=Date.now(),maxAgeMs=30000){
  const ageMs=snapshot?now-Date.parse(snapshot.observedAt):null;
  return {status:ageMs===null?'unavailable':ageMs<0||ageMs>maxAgeMs?'stale':'recent-log-write',ageMs,maxAgeMs,basis:'Log file modification time; not proof that a process is running or that historical records are current'};
}

/** Offline replay never imports into the live database, updates timestamps or enables control. */
export function replaySnapshots(text:string):BridgeSnapshot[]{
  const seen=new Map<string,string>();const results:BridgeSnapshot[]=[];
  for(const line of text.split(/\r?\n/).filter(s=>s.trim())){
    const s=JSON.parse(line) as BridgeSnapshot;
    if(s.schemaVersion!==1||typeof s.id!=='string'||!s.id||typeof s.sessionId!=='string'||!s.sessionId||typeof s.producerId!=='string'||!Number.isFinite(Date.parse(s.observedAt))||!(s.gameVersion===null||typeof s.gameVersion==='string')||s.source?.kind!=='game-log'||typeof s.source.path!=='string'||!Number.isSafeInteger(s.source.offset)||s.source.offset<0||typeof s.source.hash!=='string'||!Array.isArray(s.unavailable)||!s.unavailable.every(v=>typeof v==='string'))throw new Error('Invalid snapshot envelope');
    for(const [key,type] of [['country','string'],['gameDate','string'],['politicalPower','number'],['stability','number']] as const){const v=s.values?.[key];if(!v||(v.status==='observed'?(typeof v.value!==type||type==='number'&&!Number.isFinite(v.value)):v.status!=='unavailable'||v.value!==null||typeof v.reason!=='string'))throw new Error(`Invalid snapshot value: ${key}`);}
    const o=s.ownership,f=s.focusObservation;
    if(o&&(o.sessionId!==s.sessionId||!Number.isSafeInteger(o.pid)||o.pid<1||typeof o.creationTime!=='string'||typeof o.executable!=='string'||typeof o.executableHash!=='string'||typeof o.logIdentity!=='string'||!Number.isSafeInteger(o.beginOffset)||o.beginOffset<0||!Number.isSafeInteger(o.sequence)||o.sequence<0||o.correlation!=='owned-profile-and-launch-token'))throw new Error('Invalid ownership metadata');
    if(f&&(!o||f.sessionId!==s.sessionId||!Number.isFinite(Date.parse(f.observedAt))||f.source?.kind!=='ui-ocr'||!['imagePath','imageHash','text','panelText'].every(k=>typeof (f.source as unknown as Record<string,unknown>)[k]==='string')||!f.current||(f.current.status==='observed'?!(f.current.value===null||typeof f.current.value==='string')||f.verification!=='exact-localized-ui-label':f.current.status!=='unavailable'||f.current.value!==null||typeof f.current.reason!=='string'||f.verification!=='unverified')))throw new Error('Invalid focus observation');
    const serialized=JSON.stringify(s);if(seen.has(s.id)&&seen.get(s.id)!==serialized)throw new Error('Conflicting snapshot ID');
    if(!seen.has(s.id)){seen.set(s.id,serialized);results.push(s);}
  }
  return results;
}
