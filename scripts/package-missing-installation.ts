import {_electron,expect} from '@playwright/test';
import path from 'node:path';
import {openStore} from '../server/store';
import {createQaRun,assertOwnedStatus} from './qa/fixture';

async function main(){
 const executable=path.resolve(process.argv[2]||'');const run=createQaRun('package-missing-installation','compiled-runtime');
 const store=openStore(run.dataDirectory);store.setSetting('gameRoot',path.join(run.root,'absent-game'));store.db.close();
 const env={...process.env,HOI4_DATA_DIR:run.dataDirectory,PATH:`${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;delete env.NODE_PATH;
 let app:Awaited<ReturnType<typeof _electron.launch>>|undefined;
 try{
  app=await _electron.launch({executablePath:executable,cwd:path.dirname(executable),env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned extracted build, missing configured installation'});const p=await app.firstWindow();
  await run.check('missing configured installation loads UI and exposes path recovery without developer PATH',['M6-PORTABILITY'],async()=>{
   await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible();const status=await p.evaluate(()=>fetch('/api/v1/status').then(r=>r.json()));assertOwnedStatus(status,run.dataDirectory);if(status.meta||!status.indexingError)throw Error('Missing installation was not reported');await p.getByRole('button',{name:'Sources & settings',exact:true}).click();await expect(p.getByLabel('HOI4 installation folder')).toHaveValue(path.join(run.root,'absent-game'));await expect(p.getByText(/Choose a Hearts of Iron IV installation containing/)).toBeVisible();await expect(p.getByRole('button',{name:'Refresh game data',exact:true})).toBeEnabled();await p.screenshot({path:path.join(run.output,'missing-installation.png'),fullPage:true});
  });run.finish({nativeGameLaunched:false,executable});console.log(run.output);
 }finally{await app?.close();run.finish();run.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
