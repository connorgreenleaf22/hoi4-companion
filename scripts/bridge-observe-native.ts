import fs from 'node:fs';import path from 'node:path';import {spawn,execFileSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
import {verifyProfileLease} from '../server/bridge/native-profile';
import {readProcessIdentity} from '../server/bridge/process-identity';
import {digest,replaySnapshots} from '../server/bridge/telemetry';
import {GameBridge} from '../server/bridge/service';import {openStore} from '../server/store';
import type {OwnedManifest} from '../server/bridge/owned-session';
import {telemetryManifest} from '../src/telemetry-manifest';
/** Bounded READ-ONLY M6.5 lifecycle. No input/OCR/control adapter is registered or invoked. */
async function main(){
 const [command,argument,label]=process.argv.slice(2),run=path.resolve(argument||''),base=path.resolve('.bridge-local');
 if(!argument||!run.startsWith(base+path.sep))throw Error('Use launch|poll|status|count|stop RUN [action-label] under .bridge-local');
 const plan=JSON.parse(fs.readFileSync(path.join(run,'plan.json'),'utf8')),lease=JSON.parse(fs.readFileSync(path.join(run,'profile-lease.json'),'utf8'));
 if(plan.purpose!=='telemetry'||plan.limits.actions!==10||plan.limits.minutes!==25||plan.environment.version!==telemetryManifest.gameVersion)throw Error('Expected reviewed M6.5 read-only plan');
 const budgetFile=path.join(base,'m65-native-budget.json'),manifestFile=path.join(run,'observation-session.json');
 const budget=fs.existsSync(budgetFile)?JSON.parse(fs.readFileSync(budgetFile,'utf8')):{launches:0,actions:[],startedAt:null,stopped:false};
 const saveBudget=()=>fs.writeFileSync(budgetFile,JSON.stringify(budget,null,2));
 const withinBudget=()=>{if(budget.stopped||budget.startedAt&&Date.now()-Date.parse(budget.startedAt)>25*60000)throw Error('M6.5 native budget stopped or timed out');};
 if(command==='launch'){
  withinBudget();verifyProfileLease(lease);if(fs.existsSync(manifestFile)||budget.launches>=2)throw Error('Native launch already used / maximum two launches');
  if(digest(fs.readFileSync(plan.environment.executable))!==plan.executableHash)throw Error('Installed executable changed');
  const active=execFileSync('tasklist.exe',['/FI','IMAGENAME eq hoi4.exe','/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true});if(/"hoi4\.exe"/i.test(active))throw Error('Existing game process must be left alone');
  const logPath=path.join(lease.profileRoot,'logs','game.log');if(fs.existsSync(logPath))throw Error('Log exists before launch');
  const launchedAt=new Date().toISOString();budget.startedAt||=launchedAt;budget.launches++;saveBudget();
  const child=spawn(plan.environment.executable,plan.launchArguments,{cwd:plan.environment.gameRoot,detached:true,stdio:'ignore',windowsHide:false});await new Promise<void>((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
  const manifest:OwnedManifest={schemaVersion:1,purpose:'telemetry',sessionId:randomUUID(),producerId:lease.token,identity:readProcessIdentity(child.pid!),executableHash:plan.executableHash,gameVersion:plan.environment.version,launchedAt,logPath,lease,controllerId:'no-controller',python:''};
  fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2),{flag:'wx'});console.log(JSON.stringify({run,manifest,budget},null,2));return;
 }
 if(command==='count'){withinBudget();if(!label||budget.actions.length>=10)throw Error('Supply a labeled ordinary action within the ten-action limit');budget.actions.push({at:new Date().toISOString(),label});saveBudget();console.log(JSON.stringify(budget));return;}
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
