import fs from 'node:fs';
import path from 'node:path';
import {superviseOwnedTest,peerHealth} from './deadline';
import {readHeartbeat,writeHeartbeat,writeNativeJson} from './native-files';
import {terminateOwnedProcess} from './process-identity';
import type {ProcessIdentity} from './owned-session';

/** Shared production I/O lifecycle. The native CLI validates its game/profile/plan before entering. */
export async function runNativeSupervisor(options:{run:string;budgetFile:string;sessionId:string;identity:ProcessIdentity;startedAt:string;deadline:number;paired:boolean;backup:boolean}){
 const {run,budgetFile,sessionId,identity,startedAt,deadline,paired,backup}=options;
 const name=backup?'backup':'watchdog';
 writeNativeJson(path.join(run,name+'-ready.json'),{pid:process.pid,deadline,sessionId});
 let sequence=0;
 const healthy=paired?peerHealth(()=>readHeartbeat(path.join(run,(backup?'watchdog':'backup')+'-heartbeat.jsonl')),sessionId,()=>performance.now()):undefined;
 await superviseOwnedTest(identity,deadline,{
  now:Date.now,monotonic:()=>performance.now(),sleep:ms=>new Promise(resolve=>setTimeout(resolve,ms)),healthy,
  stopped:()=>{
   if(paired)writeHeartbeat(path.join(run,name+'-heartbeat.jsonl'),sessionId,sequence++);
   const current=JSON.parse(fs.readFileSync(budgetFile,'utf8'));
   if(current.startedAt!==startedAt||typeof current.stopped!=='boolean')throw Error('Budget identity or stop state changed');
   return current.stopped;
  },
  terminate:terminateOwnedProcess,
  finish:result=>{
   writeNativeJson(path.join(run,backup?'backup-deadline-receipt.json':'deadline-receipt.json'),{at:new Date().toISOString(),deadline:new Date(deadline).toISOString(),sessionId,identity,...result});
   try{const budget=JSON.parse(fs.readFileSync(budgetFile,'utf8'));budget.stopped=true;writeNativeJson(budgetFile,budget);}catch{/* Termination receipt survives unavailable/corrupt budget. */}
  },
 });
}
