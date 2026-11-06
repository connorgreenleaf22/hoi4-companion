import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readProcessIdentity} from '../server/bridge/process-identity';
import type {ProcessIdentity} from '../server/bridge/owned-session';

/** Separate process: a stalled agent must not leave its disposable game running past budget. */
export function expireOwnedTest(expected:ProcessIdentity,probe:(pid:number)=>ProcessIdentity,terminate:(pid:number)=>void){
 if(path.basename(expected.executable_path).toLowerCase()!=='hoi4.exe')throw Error('Watchdog only accepts the owned game executable');
 const actual=probe(expected.pid);
 if(actual.pid!==expected.pid||actual.creation_time!==expected.creation_time||actual.executable_path!==expected.executable_path)throw Error('Owned process identity changed; no termination');
 terminate(expected.pid);
}
async function main(){
 const run=path.resolve(process.argv[2]||''),base=path.resolve('.bridge-local');
 if(!run.startsWith(base+path.sep))throw Error('Expected owned run under .bridge-local');
 const manifest=JSON.parse(fs.readFileSync(path.join(run,'observation-session.json'),'utf8'));
 if(manifest.purpose!=='telemetry'||path.resolve(manifest.lease.runRoot)!==run)throw Error('Expected read-only owned session');
 const budgetFile=path.join(base,'m65-native-budget.json');
 // Reserve 30 seconds for OS identity checks and process shutdown before the hard limit.
 const initial=JSON.parse(fs.readFileSync(budgetFile,'utf8')),deadline=Date.parse(initial.startedAt)+25*60000-30000;
 if(!Number.isFinite(deadline))throw Error('Missing deadline');
 while(Date.now()<deadline){
  if(JSON.parse(fs.readFileSync(budgetFile,'utf8')).stopped)return;
  await new Promise(resolve=>setTimeout(resolve,Math.min(1000,deadline-Date.now())));
 }
 const budget=JSON.parse(fs.readFileSync(budgetFile,'utf8'));
 const receipt:{at:string;deadline:string;result:string}={at:new Date().toISOString(),deadline:new Date(deadline).toISOString(),result:'No termination'};
 // An explicit stop hands cleanup back to the operator; never kill a reused PID.
 if(!budget.stopped){
  budget.stopped=true;fs.writeFileSync(budgetFile,JSON.stringify(budget,null,2));
  try{expireOwnedTest(manifest.identity,readProcessIdentity,pid=>process.kill(pid));receipt.result='Owned game terminated at deadline';}
  catch(error){receipt.result=String(error);}
 }else receipt.result='Session already stopped';
 fs.writeFileSync(path.join(run,'deadline-receipt.json'),JSON.stringify(receipt,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error);process.exitCode=1;});
