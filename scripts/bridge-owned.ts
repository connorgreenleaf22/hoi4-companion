import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {openStore} from '../server/store';
import {GameBridge} from '../server/bridge/service';
import {queryIdentity,type OwnedManifest} from '../server/bridge/owned-session';
import {verifyProfileLease} from '../server/bridge/native-profile';
import {digest} from '../server/bridge/telemetry';

async function main(){
  const [command,runArgument,arg]=process.argv.slice(2);if(!runArgument)throw new Error('Use launch|poll|observe|select|status|stop|count RUN [request-id/count]');
  const run=path.resolve(runArgument),base=path.resolve('.bridge-local');
  if(!run.startsWith(base+path.sep))throw new Error('Owned run must be under .bridge-local');
  const plan=JSON.parse(fs.readFileSync(path.join(run,'plan.json'),'utf8'));
  const manifestFile=path.join(run,'owned-session.json'),budgetFile=path.join(run,'native-budget.json');
  if(command==='launch'){
    if(fs.existsSync(manifestFile))throw new Error('A launch manifest already exists; never adopt/relaunch it');
    const lease=JSON.parse(fs.readFileSync(path.join(run,'profile-lease.json'),'utf8'));verifyProfileLease(lease);
    const pin=JSON.parse(fs.readFileSync('integrations/hoi4-live-tools.json','utf8'));
    if(plan.executableHash!==pin.executableHash||plan.environment.version!==pin.gameVersion||digest(fs.readFileSync(plan.environment.executable))!==pin.executableHash)throw new Error('Unqualified installed executable');
    const active=execFileSync('tasklist.exe',['/FI','IMAGENAME eq hoi4.exe','/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true});
    if(/"hoi4\.exe"/i.test(active))throw new Error('Another HOI4 process is running');
    const logPath=path.join(lease.profileRoot,'logs/game.log');if(fs.existsSync(logPath))throw new Error('Log exists before launch; stale session risk');
    const budget=JSON.parse(fs.readFileSync(budgetFile,'utf8'));if(budget.launches>=2||budget.inputs>=20||budget.stopped)throw new Error('Native budget unavailable');
    const launchedAt=new Date().toISOString();budget.launches++;budget.startedAt=launchedAt;fs.writeFileSync(budgetFile,JSON.stringify(budget,null,2));
    const game=spawn(plan.environment.executable,plan.launchArguments,{cwd:plan.environment.gameRoot,detached:true,stdio:'ignore',windowsHide:false});
    await new Promise<void>((resolve,reject)=>{game.once('spawn',resolve);game.once('error',reject);});game.unref();
    const python=process.env.HOI4_BRIDGE_PYTHON||'python';
    const manifest:OwnedManifest={schemaVersion:1,sessionId:randomUUID(),producerId:lease.token,identity:queryIdentity(python,game.pid!,plan.environment.executable),executableHash:pin.executableHash,gameVersion:plan.environment.version,launchedAt,logPath,lease,controllerId:'bounded-native-test',python};
    fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2),{flag:'wx'});console.log(JSON.stringify(manifest,null,2));return;
  }
  if(command==='count'){
    const b=JSON.parse(fs.readFileSync(budgetFile,'utf8')),n=Number(arg||1);if(!Number.isInteger(n)||n<1||b.inputs+n>20)throw new Error('Input budget exhausted');
    if(b.stopped||Date.now()-Date.parse(b.startedAt)>20*60*1000)throw new Error('Native session stopped or timed out');
    b.inputs+=n;fs.writeFileSync(budgetFile,JSON.stringify(b,null,2));console.log(JSON.stringify(b));return;
  }
  const manifest:OwnedManifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  const store=openStore(path.join(run,'bridge-db'));
  const bridge=new GameBridge(store,{mode:'control',gameRoot:plan.environment.gameRoot,userRoot:plan.user,logPath:manifest.logPath,ownedSession:manifest});
  try{
    let result:unknown;
    if(command==='poll')result=bridge.poll();
    else if(command==='observe')result=await bridge.observeFocus();
    else if(command==='status')result={status:bridge.status(),ownershipError:bridge.owned!.check(),live:bridge.owned!.latest()};
    else if(command==='stop'){bridge.owned!.stop();result=bridge.gateway.stop();const b=JSON.parse(fs.readFileSync(budgetFile,'utf8'));b.stopped=true;fs.writeFileSync(budgetFile,JSON.stringify(b,null,2));}
    else if(command==='select'){
      const id=arg||'m3-first-focus',requestFile=path.join(run,'focus-request.json');
      // Retry the persisted exact request, never silently attach it to a newer snapshot.
      let action;
      if(fs.existsSync(requestFile))action=JSON.parse(fs.readFileSync(requestFile,'utf8'));
      else{
        const before=bridge.owned!.latest();if(!before)throw new Error('No owned observation');
        action={schemaVersion:1,requestId:id,sessionId:manifest.sessionId,controllerId:manifest.controllerId,command:'focus.select',parameters:{focusId:'GER_prioritize_economic_growth'},requiredCapability:'focus.select',mode:'control',authorization:'local-grant',expected:{snapshotId:before.id,country:'GER',gameVersion:manifest.gameVersion},verification:{policy:'independent-readback',timeoutMs:30000}};
        fs.writeFileSync(requestFile,JSON.stringify(action,null,2),{flag:'wx'});
      }
      result=await bridge.gateway.submit(action);fs.writeFileSync(path.join(run,'focus-receipt.json'),JSON.stringify(result,null,2));
    }else throw new Error('Unknown owned-session command');
    console.log(JSON.stringify(result,null,2));
  }finally{bridge.close();store.db.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
