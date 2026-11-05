import { startServer } from './api';
import { openStore,dataDirectory } from './store';
import {migrateStore,restoreStore} from './migrations';
import { discoverGame, indexGame } from './importer';

async function main(){
  if(process.argv.includes('--migrate')){console.log(JSON.stringify(migrateStore(dataDirectory(),{closedApps:process.argv.includes('--closed-apps')}),null,2));return;}
  const restore=process.argv.indexOf('--restore');
  if(restore>=0){if(!process.argv[restore+1])throw new Error('Supply the verified .sqlite backup after --restore.');console.log(JSON.stringify(restoreStore(dataDirectory(),process.argv[restore+1],{closedApps:process.argv.includes('--closed-apps')}),null,2));return;}
  if(process.argv.includes('--index-only')){
    const store=openStore();try{console.log(JSON.stringify(indexGame(store,store.getSetting('gameRoot','')||discoverGame()),null,2));}finally{store.db.close();}return;
  }
  const service=await startServer({port:process.env.PORT===undefined?39436:Number(process.env.PORT)});
  console.log(`HOI4 Companion: ${service.url}`);
  console.log(`User data: ${service.store.directory}`);
  for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>void service.close().then(()=>process.exit()));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
