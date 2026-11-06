import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {terminateOwnedProcess} from '../server/bridge/process-identity';
import type {ProcessIdentity} from '../server/bridge/owned-session';
import {superviseOwnedTest} from '../server/bridge/deadline';
import {verifyProfileLease} from '../server/bridge/native-profile';

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
 verifyProfileLease(manifest.lease);if(manifest.producerId!==manifest.lease.token)throw Error('Owned producer mismatch');
 const plan=JSON.parse(fs.readFileSync(path.join(run,'plan.json'),'utf8'));
 const minutes=plan.milestone==='M7'?20:25;
 if(plan.limits.minutes!==minutes)throw Error('Unexpected deadline plan');
 const budgetFile=path.resolve(plan.budgetFile||path.join(base,'m65-native-budget.json'));
 if(!budgetFile.startsWith(base+path.sep)||!['m65-native-budget.json','m7-native-budget.json'].includes(path.basename(budgetFile)))throw Error('Invalid budget path');
 // Reserve 30 seconds for OS identity checks and process shutdown before the hard limit.
 const initial=JSON.parse(fs.readFileSync(budgetFile,'utf8')),deadline=Date.parse(initial.startedAt)+minutes*60000-30000;
 if(!Number.isFinite(deadline))throw Error('Missing deadline');
 fs.writeFileSync(path.join(run,'watchdog-ready.json'),JSON.stringify({pid:process.pid,deadline,sessionId:manifest.sessionId}));
 await superviseOwnedTest(manifest.identity,deadline,{
  now:Date.now,monotonic:()=>performance.now(),sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  stopped:()=>{const current=JSON.parse(fs.readFileSync(budgetFile,'utf8'));if(current.startedAt!==initial.startedAt||typeof current.stopped!=='boolean')throw Error('Budget changed');return current.stopped;},
  terminate:expected=>{if(path.basename(expected.executable_path).toLowerCase()!=='hoi4.exe')throw Error('Expected owned game executable');terminateOwnedProcess(expected);},
  finish:result=>{fs.writeFileSync(path.join(run,'deadline-receipt.json'),JSON.stringify({at:new Date().toISOString(),deadline:new Date(deadline).toISOString(),...result},null,2));try{const budget=JSON.parse(fs.readFileSync(budgetFile,'utf8'));budget.stopped=true;fs.writeFileSync(budgetFile,JSON.stringify(budget,null,2));}catch{/* Receipt survives an unavailable budget file. */}}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error);process.exitCode=1;});
