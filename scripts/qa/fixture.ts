import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

export type QaLevel='source-function'|'source-http'|'headless-renderer'|'compiled-runtime'|'package-identity'|'installed-source';
export type QaCase={name:string;status:'passed'|'failed';level:QaLevel;requirements:string[];ms:number;error?:string};
const sha=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
export const fileHash=(file:string)=>sha(fs.readFileSync(file));
const within=(parent:string,child:string)=>{const rel=path.relative(parent,child);return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);};
function canonical(file:string):string{
  let ancestor=path.resolve(file),tail:string[]=[];
  while(!fs.existsSync(ancestor)){tail.unshift(path.basename(ancestor));const next=path.dirname(ancestor);if(next===ancestor)throw Error('No existing path ancestor.');ancestor=next;}
  return path.resolve(fs.realpathSync.native(ancestor),...tail);
}
export function sourceIdentity(root=process.cwd()){
  const files:string[]=[];
  const walk=(directory:string)=>{if(!fs.existsSync(directory))return;for(const item of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isSymbolicLink())throw Error('QA source identity refuses symbolic links: '+file);if(item.isDirectory())walk(file);else if(item.isFile())files.push(file);}};
  for(const directory of ['src','server','electron','scripts','tests','build','dist','assets'])walk(path.join(root,directory));
  for(const name of ['package.json','package-lock.json','tsconfig.json'])if(fs.existsSync(path.join(root,name)))files.push(path.join(root,name));
  const members=files.sort().map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:fileHash(file)}));
  return {sha256:sha(JSON.stringify(members)),members};
}
/** One run owns one temporary root and DB. Evidence directories are never reused. */
export function createQaRun(suite:string,level:QaLevel,outputOverride?:string){
  const slug=suite.toLowerCase().replace(/[^a-z0-9-]/g,'-');
  const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),`hoi4-qa-${slug}-`));
  const directories=Object.fromEntries(['hoi4-data','source-fixtures','renderer','downloads','evidence'].map(name=>{const directory=path.join(root,name);fs.mkdirSync(directory);return [name,directory];}));
  // Keep evidence in the workspace by default: sandbox temporary directories may be ephemeral.
  const requested=outputOverride||process.env.HOI4_QA_OUTPUT||path.resolve('artifacts/qa');
  const output=path.join(canonical(requested),slug+'-'+id);
  const project=canonical(process.cwd()),temporary=canonical(os.tmpdir());
  if(!within(project,output)&&!within(temporary,output))throw Error('QA output must be inside this workspace or the temporary directory.');
  fs.mkdirSync(output,{recursive:true});
  const source=sourceIdentity();const startedAt=new Date().toISOString();
  const results:QaCase[]=[];const ownedProcesses:{pid:number;kind:string}[]=[{pid:process.pid,kind:'Owned QA harness and in-process loopback services, if any'}];let finished=false;
  const write=(name:string,value:unknown)=>{if(path.basename(name)!==name)throw Error('Evidence filename must be a basename.');fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2));};
  const check=async(name:string,requirements:string[],fn:()=>Promise<void>|void)=>{const start=Date.now();try{await fn();results.push({name,status:'passed',level,requirements,ms:Date.now()-start});console.log('PASS '+name);}catch(error){results.push({name,status:'failed',level,requirements,ms:Date.now()-start,error:String(error)});throw error;}};
  const finish=(extra:Record<string,unknown>={})=>{if(finished)return;finished=true;const after=sourceIdentity();const artifacts=fs.readdirSync(output).filter(name=>fs.statSync(path.join(output,name)).isFile()).map(name=>({file:name,sha256:fileHash(path.join(output,name))}));write('run-record.json',{runId:id,suite,owner:'developer',independentAcceptance:false,level,startedAt,finishedAt:new Date().toISOString(),node:process.version,platform:process.platform,root,dataDirectory:directories['hoi4-data'],output,source,sourceUnchangedDuringRun:after.sha256===source.sha256,ownedProcesses,results,artifacts,...extra});};
  const cleanup=()=>{assert.ok(within(canonical(os.tmpdir()),canonical(root)));for(const name of ['hoi4-data','renderer','source-fixtures','downloads']){const target=path.join(root,name);assert.ok(within(root,canonical(target)));fs.rmSync(target,{recursive:true,force:true});}};
  return {id,root,dataDirectory:directories['hoi4-data'],output,renderer:directories.renderer,downloads:directories.downloads,sourceFixtures:directories['source-fixtures'],results,ownedProcesses,write,check,finish,cleanup};
}
export function assertOwnedStatus(status:any,dataDirectory:string){
  assert.equal(canonical(status.dataDirectory),canonical(dataDirectory));
  assert.equal(status.local,true);assert.equal(status.network.enabled,false);
  return {dataDirectory:status.dataDirectory,network:status.network,meta:status.meta};
}
/** Use an explicit override when needed; otherwise let Playwright resolve its installed browser. */
export const browserOptions=()=>({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
