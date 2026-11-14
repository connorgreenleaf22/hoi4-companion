import { startServer } from './api';
import { openStore,dataDirectory } from './store';
import {migrateStore,restoreStore} from './migrations';
import { discoverGame, indexGame } from './importer';
import fs from 'node:fs';
import {GameBridge} from './bridge/service';
import {inspectEnvironment} from './bridge/environment';
import {replaySnapshots} from './bridge/telemetry';
import type {BridgeMode} from '../src/bridge-types';

async function main(){
  const bridgeIndex=process.argv.indexOf('--bridge');
  if(bridgeIndex>=0){
    const command=process.argv[bridgeIndex+1],arg=process.argv[bridgeIndex+2];
    if(command==='inspect'){console.log(JSON.stringify(inspectEnvironment(),null,2));return;}
    if(command==='replay'){if(!arg)throw new Error('Supply an exported snapshot JSONL file');console.log(JSON.stringify({schemaVersion:1,mode:'replay',snapshots:replaySnapshots(fs.readFileSync(arg,'utf8'))},null,2));return;}
    const store=openStore();const bridge=new GameBridge(store,{mode:(process.env.HOI4_BRIDGE_MODE||'observer') as BridgeMode,logPath:process.env.HOI4_BRIDGE_LOG});
    try{
      if(command==='reference')console.log(JSON.stringify(bridge.reference(arg||'',process.argv[bridgeIndex+3]),null,2));
      else if(command==='poll')console.log(JSON.stringify(bridge.poll(),null,2));
      else if(command==='status')console.log(JSON.stringify(bridge.status(),null,2));
      else if(command==='export')console.log(bridge.database.snapshots(arg,10000).map(s=>JSON.stringify(s)).join('\n'));
      else if(command==='stop')console.log(JSON.stringify(bridge.gateway.stop()));
      else throw new Error('Bridge commands: inspect, reference ID [kind], poll, status, export [session], replay FILE, stop');
    }finally{bridge.close();store.db.close();}return;
  }
  if(process.argv.includes('--migrate')){console.log(JSON.stringify(migrateStore(dataDirectory(),{closedApps:process.argv.includes('--closed-apps')}),null,2));return;}
  const restore=process.argv.indexOf('--restore');
  if(restore>=0){if(!process.argv[restore+1])throw new Error('Supply the verified .sqlite backup after --restore.');console.log(JSON.stringify(restoreStore(dataDirectory(),process.argv[restore+1],{closedApps:process.argv.includes('--closed-apps')}),null,2));return;}
  if(process.argv.includes('--index-only')){
    const store=openStore();try{console.log(JSON.stringify(indexGame(store,store.getSetting('gameRoot','')||discoverGame()),null,2));}finally{store.db.close();}return;
  }
  const service=await startServer({port:process.env.PORT===undefined?39436:Number(process.env.PORT),bridge:{mode:(process.env.HOI4_BRIDGE_MODE||'observer') as BridgeMode,logPath:process.env.HOI4_BRIDGE_LOG}});
  console.log(`HOI4 Companion: ${service.url}`);
  console.log(`User data: ${service.store.directory}`);
  for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void service.close().then(()=>process.exit()));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
