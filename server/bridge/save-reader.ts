import fs from 'node:fs';
import path from 'node:path';
import {parseScript,children,scalar,block} from '../parser';
import {digest} from './telemetry';
import type {Node} from '../../src/types';
import type {GameObservation,ObservationField,ObservationValue} from '../../src/integration-types';

interface Span {start:number;end:number;line:number;raw:string}
/** Shallow streaming token index; only selected subtrees are passed to the existing ordered parser. */
export function saveSpans(text:string,wanted:Set<string>):Map<string,Span[]> {
 const result=new Map<string,Span[]>(),stack:{key:string;start:number;line:number}[]=[];
 let i=7,line=1,pending:string|undefined,key:string|undefined;
 const put=(name:string,start:number,end:number,at:number)=>{if(wanted.has(name)){const spans=result.get(name)||[];spans.push({start,end,line:at,raw:end-start<=2*1024*1024?text.slice(start,end):''});result.set(name,spans);}};
 const location=(leaf?:string)=>[...stack.map(s=>s.key),...(leaf===undefined?[]:[leaf])].join('/');
 while(i<text.length){
  const c=text[i];if(c==='\n'){line++;i++;continue;}if(c===' '||c==='\r'||c==='\t'){i++;continue;}
  if(c==='#'){while(i<text.length&&text[i]!=='\n')i++;continue;}
  if(c==='='){if(pending===undefined||key!==undefined)throw Error('Malformed save assignment');key=pending;pending=undefined;i++;continue;}
  if(c==='{'){if(stack.length>=128)throw Error('Save nesting limit exceeded');stack.push({key:key??'',start:i+1,line});key=undefined;pending=undefined;i++;continue;}
  if(c==='}'){if(!stack.length||key!==undefined)throw Error('Unbalanced save block');const name=location(),scope=stack.pop()!;put(name,scope.start,i,scope.line);pending=undefined;i++;continue;}
  const start=i,at=line;let value='';
  if(c==='"'){i++;let closed=false;while(i<text.length){if(text[i]==='\\'){i+=2;continue;}if(text[i]==='"'){i++;closed=true;break;}if(text[i]==='\n')line++;i++;}if(!closed)throw Error('Unclosed save string');value=text.slice(start+1,i-1);}
  else {while(i<text.length&&!/[\s{}=#]/.test(text[i]))i++;if(i===start)throw Error('Invalid save token');value=text.slice(start,i);}
  if(key!==undefined){put(location(key),start,i,at);key=undefined;pending=undefined;}else pending=value;
 }
 if(stack.length||key!==undefined)throw Error('Incomplete save; wait for writing to finish');return result;
}
const missing=(reason:string):ObservationField=>({status:'unavailable',value:null,qualification:'unsupported',reason});
const identifier=(value:string)=>/^[A-Za-z0-9_:-]{1,200}$/.test(value);
export function inspectSaveBytes(bytes:Buffer,sourcePath:string,modifiedAt:string,country?:string):GameObservation {
 if(!bytes.subarray(0,7).equals(Buffer.from('HOI4txt')))throw Error(bytes.subarray(0,7).equals(Buffer.from('HOI4bin'))?'Binary saves unsupported; no token decoder qualified':bytes.subarray(0,2).toString()==='PK'?'Compressed saves unsupported; no container decoder qualified':'Expected HOI4txt plaintext save');
 if(bytes.length>128*1024*1024||bytes.includes(0))throw Error('Save exceeds plaintext limits or contains binary data');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
 // A header hint selects a subtree; the structural index below must confirm the root player.
 const tag=country||text.match(/^player\s*=\s*"?([A-Z0-9]{3})"?\s*$/m)?.[1];if(!tag||!/^[A-Z0-9]{3}$/.test(tag))throw Error('Choose an explicit three-character country tag');
 const root='countries/'+tag,targets=['player','date','version','countries',root,root+'/focus',root+'/technology',root+'/research_slot'];
 const spans=saveSpans(text,new Set(targets));
 const one=(name:string)=>{const found=spans.get(name)||[];if(found.length>1)throw Error('Ambiguous repeated save path: '+name);return found[0];};
 one('countries');if(!one(root))throw Error('Saved player country block missing');
 const headerValue=(key:string)=>{const span=one(key);return span?scalar(parseScript('v='+span.raw),'v'):null;};
 if(headerValue('player')!==tag)throw Error('M7 save inspection is limited to the saved player country');
 const version=headerValue('version'),gameVersion=version?.match(/\bv?(\d+\.\d+\.\d+\.\d+)(?:\.|\s|$)/)?.[1]??null;
 if(gameVersion!=='1.19.4.2')throw Error('Save field mapping supports only 1.19.4.2; detected '+(gameVersion||'unknown'));
 const gameDate=headerValue('date');if(!gameDate||!/^\d{4}\.\d{1,2}\.\d{1,2}\.\d{1,2}$/.test(gameDate))throw Error('Save date unavailable');
 const [year,month,day,hour]=gameDate.split('.').map(Number);if(year<1000||month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||hour<0||hour>23)throw Error('Invalid saved calendar date');
 const field=(value:ObservationValue,key:string,line:number,reason:string):ObservationField=>({status:'available',value,qualification:'parsed-unqualified',reason,location:{path:key,line}});
 const subtree=(key:string):{nodes:Node[];span?:Span}=>{const span=one(key);if(!span)return {nodes:[]};if(span.end-span.start>2*1024*1024)throw Error('Selected save subtree exceeds parsing limit');return {nodes:parseScript(span.raw),span};};
 const focus=subtree(root+'/focus'),technology=subtree(root+'/technology');
 const fields:Record<string,ObservationField>={};
 fields.playerCountry=field(tag,'player',one('player')!.line,'Saved player header; independent campaign identity comparison pending');
 fields.gameDate=field(gameDate,'date',one('date')!.line,'Saved campaign timestamp; not wall-clock freshness or live state');
 const unique=(nodes:Node[],key:string)=>{if(children(nodes,key).length>1)throw Error('Ambiguous save field '+key);return scalar(nodes,key);};
 const current=unique(focus.nodes,'current');
 fields.currentFocus=current&&current!=='none'&&identifier(current)?field(current,root+'/focus/current',focus.span!.line,'Parsed selection token; independent current-state readback pending'):missing('No explicit valid current token; stored progress is not selection proof');
 const progress=unique(focus.nodes,'progress');
 const progressNode=children(focus.nodes,'progress')[0];
 fields.storedFocusProgress=/^\d+(?:\.\d+)?$/.test(progress)&&Number.isFinite(Number(progress))?{...field(Number(progress),root+'/focus/progress',focus.span!.line+(progressNode?.line||1)-1,'Raw stored focus progress; may remain without an active focus. Units/remaining time unqualified.'),raw:progress}:missing('Stored focus progress absent or invalid');
 fields.focusProgress=fields.currentFocus.status==='available'&&/^\d+(?:\.\d+)?$/.test(progress)&&Number.isFinite(Number(progress))?field(Number(progress),root+'/focus/progress',focus.span!.line,'Saved raw progress; units/remaining time not independently qualified'):missing('No qualified current focus/progress pair');
 const completed=children(focus.nodes,'completed');
 fields.completedFocuses=completed.length&&completed.every(n=>typeof n.value==='string'&&identifier(n.value))?field([...new Set(completed.map(n=>n.value as string))],root+'/focus/completed',focus.span!.line,'Explicit saved completion entries; completeness not independently qualified'):missing('No explicit completion entries; absence is not an empty inventory');
 if(children(technology.nodes,'technologies').length>1||children(technology.nodes,'slots').length>1)throw Error('Repeated technology/slot container');
 const technologies=block(technology.nodes,'technologies'),slots=block(technology.nodes,'slots');
 const known:string[]=[];const points=new Map<string,number|null>(),seen=new Set<string>();
 for(const n of technologies){if(!identifier(n.key)||!Array.isArray(n.value)||seen.has(n.key))throw Error('Invalid or duplicate technology record');seen.add(n.key);const level=unique(n.value,'level'),pts=unique(n.value,'research_points');if(level&&!/^\d+$/.test(level))throw Error('Invalid technology level');if(Number(level)>0)known.push(n.key);points.set(n.key,/^\d+(?:\.\d+)?$/.test(pts)&&Number.isFinite(Number(pts))?Number(pts):null);}
 fields.completedTechnologies=children(technology.nodes,'technologies').length?field(known,root+'/technology/technologies',technology.span!.line,'Positive saved level values; no completion event inferred'):missing('Technology inventory absent');
 fields.researchAssignments=children(technology.nodes,'slots').length?field(slots.map((n,position)=>{if(!identifier(n.key)||!Array.isArray(n.value))throw Error('Invalid research slot');return {position,technology:n.key==='empty'?null:n.key,researchPoints:points.get(n.key)??null};}),root+'/technology/slots',technology.span!.line,'Serialized order only; not a verified UI slot index. Points are not a percentage'):missing('Slot container absent');
 const slotSpan=one(root+'/research_slot'),count=slotSpan?.raw;
 fields.researchSlots=count&&/^\d+$/.test(count)&&Number(count)<=100?field(Number(count),root+'/research_slot',slotSpan!.line,'Saved total count; independent readback pending'):missing('Research slot count absent or invalid');
 const hash=digest(bytes);
 for(const [key,token] of [['currentFocus','current'],['focusProgress','progress'],['completedFocuses','completed']] as const){const node=children(focus.nodes,token)[0];if(fields[key].location&&node){fields[key].location!.line=focus.span!.line+node.line-1;if(typeof node.value==='string')fields[key].raw=node.value;}}
 return {schemaVersion:1,id:digest(hash+':'+tag+':save-v2'),source:{kind:'plaintext-save',path:sourcePath,hash},classification:'save-derived',sessionId:null,gameVersion,gameDate,country:tag,capturedAt:modifiedAt,fields,provenance:{readAt:new Date().toISOString(),fileModifiedAt:modifiedAt,freshness:'persisted-state',sessionBinding:'unverified'},limitations:['Read-only persisted state, never live or session-owned','Save fields require independent capture-specific evidence before qualification','No binary/compressed decoding; no completion-event inference','Missing selection does not prove no focus; raw stored progress may survive completion/cancellation']};
}
export function inspectSaveFile(file:string,country?:string):GameObservation {
 if(typeof file!=='string'||!path.isAbsolute(file)||file.length>4096)throw Error('Supply an absolute plaintext save path');
 const fd=fs.openSync(file,'r');try{
  const before=fs.fstatSync(fd);if(!before.isFile()||before.size>128*1024*1024)throw Error('Expected regular save up to 128 MiB');
  const bytes=Buffer.alloc(before.size);let offset=0;while(offset<bytes.length){const read=fs.readSync(fd,bytes,offset,bytes.length-offset,offset);if(!read)throw Error('Save changed while reading');offset+=read;}
  const after=fs.fstatSync(fd);if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw Error('Save changed while reading; retry after the write finishes');
  return inspectSaveBytes(bytes,path.resolve(file),before.mtime.toISOString(),country);
 }finally{fs.closeSync(fd);}
}
