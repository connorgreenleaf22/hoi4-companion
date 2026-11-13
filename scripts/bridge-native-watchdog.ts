import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import type {ProcessIdentity} from '../server/bridge/owned-session';
import {runNativeSupervisor} from '../server/bridge/native-supervisor';
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
 const recovery=plan.milestone==='M7.2.1',m72=plan.milestone==='M7.2'||recovery,backup=process.argv.includes('--backup'),name=backup?'backup':'watchdog';
 const minutes=recovery?12:plan.milestone==='M7'||m72?20:25;
 if(plan.limits.minutes!==minutes)throw Error('Unexpected deadline plan');
 const budgetFile=path.resolve(plan.budgetFile||path.join(base,'m65-native-budget.json'));
 if(!budgetFile.startsWith(base+path.sep)||!['m65-native-budget.json','m7-native-budget.json','m72-native-budget.json','m721-native-budget.json'].includes(path.basename(budgetFile)))throw Error('Invalid budget path');
 // Reserve 30 seconds for OS identity checks and process shutdown before the hard limit.
 if(recovery&&plan.supervisedSeconds!==540)throw Error('Recovery requires the reviewed nine-minute deadline');
 if(m72&&(!Number.isInteger(plan.supervisedSeconds)||plan.supervisedSeconds<60||plan.supervisedSeconds>1170))throw Error('Invalid shorter supervised deadline');
 const initial=JSON.parse(fs.readFileSync(budgetFile,'utf8')),deadline=Date.parse(initial.startedAt)+(m72?plan.supervisedSeconds*1000:minutes*60000-30000);
 if(!Number.isFinite(deadline))throw Error('Missing deadline');
 if(path.basename(manifest.identity.executable_path).toLowerCase()!=='hoi4.exe')throw Error('Expected owned game executable');
 await runNativeSupervisor({run,budgetFile,sessionId:manifest.sessionId,identity:manifest.identity,startedAt:initial.startedAt,deadline,paired:m72,backup});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error);process.exitCode=1;});
