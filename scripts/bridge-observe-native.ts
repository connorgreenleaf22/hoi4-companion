import fs from 'node:fs';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
import {verifyProfileLease} from '../server/bridge/native-profile';
import {readProcessIdentity,terminateOwnedProcess} from '../server/bridge/process-identity';
import {digest,replaySnapshots} from '../server/bridge/telemetry';
import {GameBridge} from '../server/bridge/service';import {openStore} from '../server/store';
import type {OwnedManifest} from '../server/bridge/owned-session';
import {telemetryManifest} from '../src/telemetry-manifest';
import {writeNativeJson} from '../server/bridge/native-files';
/** Bounded READ-ONLY milestone lifecycle. No input/OCR/control adapter is registered or invoked. */
async function main(){
 const [command,argument,label]=process.argv.slice(2),run=path.resolve(argument||''),base=path.resolve('.bridge-local');
 if(!argument||!run.startsWith(base+path.sep))throw Error('Use launch|poll|status|count|stop RUN [action-label] under .bridge-local');
 const plan=JSON.parse(fs.readFileSync(path.join(run,'plan.json'),'utf8')),lease=JSON.parse(fs.readFileSync(path.join(run,'profile-lease.json'),'utf8'));
 if(plan.purpose!=='telemetry'||!((plan.limits.actions===10&&plan.limits.minutes===25&&plan.limits.launches===2)||(['M7','M7.2'].includes(plan.milestone)&&plan.limits.actions===8&&plan.limits.minutes===20&&plan.limits.launches===1)||(plan.milestone==='M7.2.1'&&plan.limits.actions===4&&plan.limits.minutes===12&&plan.limits.launches===1&&plan.supervisedSeconds===540))||(plan.environment.version!==telemetryManifest.gameVersion))throw Error('Expected reviewed bounded read-only plan');
 const budgetFile=path.resolve(plan.budgetFile||path.join(base,'m65-native-budget.json')),manifestFile=path.join(run,'observation-session.json');
 if(!budgetFile.startsWith(base+path.sep)||!['m65-native-budget.json','m7-native-budget.json','m72-native-budget.json','m721-native-budget.json'].includes(path.basename(budgetFile)))throw Error('Invalid milestone budget path');
 const budget=fs.existsSync(budgetFile)?JSON.parse(fs.readFileSync(budgetFile,'utf8')):{launches:0,actions:[],startedAt:null,stopped:false};
 const saveBudget=()=>writeNativeJson(budgetFile,budget);
 const withinBudget=()=>{if(typeof budget.stopped!=='boolean'||!Number.isInteger(budget.launches)||budget.launches<0||!Array.isArray(budget.actions)||budget.startedAt&&!Number.isFinite(Date.parse(budget.startedAt)))throw Error('Invalid native budget');if(budget.stopped||budget.startedAt&&Date.now()-Date.parse(budget.startedAt)>plan.limits.minutes*60000)throw Error('Native milestone budget stopped or timed out');};
 if(command==='launch'){
  withinBudget();verifyProfileLease(lease);if(fs.existsSync(manifestFile)||budget.launches>=plan.limits.launches)throw Error('Native launch limit exhausted');
  if(digest(fs.readFileSync(plan.environment.executable))!==plan.executableHash)throw Error('Installed executable changed');
  const active=execFileSync('tasklist.exe',['/FI','IMAGENAME eq hoi4.exe','/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true});if(/"hoi4\.exe"/i.test(active))throw Error('Existing game process must be left alone');
  const logPath=path.join(lease.profileRoot,'logs','game.log');if(fs.existsSync(logPath))throw Error('Log exists before launch');
  const launchedAt=new Date().toISOString();budget.startedAt||=launchedAt;budget.launches++;saveBudget();
  const child=spawn(plan.environment.executable,plan.launchArguments,{cwd:plan.environment.gameRoot,detached:true,stdio:'ignore',windowsHide:false});await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
  let manifest:OwnedManifest|undefined,watchdogPid:number|undefined;
  try{
   manifest={schemaVersion:1,purpose:'telemetry',sessionId:randomUUID(),producerId:lease.token,identity:readProcessIdentity(child.pid!),executableHash:plan.executableHash,gameVersion:plan.environment.version,launchedAt,logPath,lease,controllerId:'no-controller',python:''};
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2),{flag:'wx'});
   const watchdog=spawn(process.execPath,['--import','tsx',path.resolve('scripts/bridge-native-watchdog.ts'),run],{cwd:process.cwd(),detached:true,stdio:'ignore',windowsHide:true});
   await new Promise<void>((resolve,reject)=>{watchdog.once('spawn',resolve);watchdog.once('error',reject);});watchdog.unref();watchdogPid=watchdog.pid;
   const readyFile=path.join(run,'watchdog-ready.json'),readyDeadline=Date.now()+10000;
   while(!fs.existsSync(readyFile)&&Date.now()<readyDeadline)await new Promise(resolve=>setTimeout(resolve,100));
   if(!fs.existsSync(readyFile))throw Error('Watchdog did not acknowledge readiness');
   const ready=JSON.parse(fs.readFileSync(readyFile,'utf8'));if(ready.sessionId!==manifest.sessionId||ready.pid!==watchdogPid)throw Error('Watchdog readiness identity mismatch');
  }catch(error){budget.stopped=true;saveBudget();if(manifest)terminateOwnedProcess(manifest.identity);else child.kill();throw error;}
  if(['M7.2','M7.2.1'].includes(plan.milestone))try{
   const backup=spawn(process.execPath,['--import','tsx',path.resolve('scripts/bridge-native-watchdog.ts'),run,'--backup'],{cwd:process.cwd(),detached:true,stdio:'ignore',windowsHide:true});
   await new Promise<void>((resolve,reject)=>{backup.once('spawn',resolve);backup.once('error',reject);});backup.unref();
   const file=path.join(run,'backup-ready.json'),end=Date.now()+8000;while(!fs.existsSync(file)&&Date.now()<end)await new Promise(r=>setTimeout(r,100));
   if(!fs.existsSync(file))throw Error('Backup supervisor did not acknowledge readiness');const ready=JSON.parse(fs.readFileSync(file,'utf8'));if(ready.sessionId!==manifest!.sessionId||ready.pid!==backup.pid)throw Error('Backup identity mismatch');
  }catch(error){budget.stopped=true;saveBudget();terminateOwnedProcess(manifest!.identity);throw error;}
  console.log(JSON.stringify({run,manifest,budget,watchdogPid},null,2));return;
 }
 if(command==='count'){withinBudget();if(!label||budget.actions.length>=plan.limits.actions)throw Error('Supply a labeled ordinary action within the declared action limit');budget.actions.push({at:new Date().toISOString(),label});saveBudget();console.log(JSON.stringify(budget));return;}
 const manifest:OwnedManifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));if(manifest.purpose!=='telemetry')throw Error('Not a read-only session');
 const store=openStore(path.join(run,'bridge-db')),bridge=new GameBridge(store,{mode:'telemetry',gameRoot:plan.environment.gameRoot,userRoot:lease.profileRoot,logPath:manifest.logPath,ownedSession:manifest});
 try{
  if(bridge.gateway.capabilities().some(c=>c.available))throw Error('Unexpected gameplay capability');
  if(command==='stop'){bridge.owned!.stop();bridge.gateway.stop();budget.stopped=true;saveBudget();console.log(JSON.stringify({stopped:true,budget}));return;}
  withinBudget();
  if(command==='poll'){
   const result=bridge.poll();fs.writeFileSync(path.join(run,'last-poll.json'),JSON.stringify(result,null,2));
   const snapshots=bridge.database.snapshots(manifest.sessionId,10000),text=snapshots.map(s=>JSON.stringify(s)).join('\n')+'\n';replaySnapshots(text);fs.writeFileSync(path.join(run,'observations.jsonl'),text);
   console.log(JSON.stringify({added:result.added.length,total:snapshots.length,diagnostic:result.diagnostic,latest:snapshots.at(-1)},null,2));
  }else if(command!=='status')throw Error('Unknown read-only command');
  fs.writeFileSync(path.join(run,'observation-status.json'),JSON.stringify(bridge.status(),null,2));
 }finally{bridge.close();store.db.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
