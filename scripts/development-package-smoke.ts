import {_electron,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {createQaRun,assertOwnedStatus,fileHash} from './qa/fixture';
import {captureRuntimeArchive} from './verify-package.mjs';

async function main(){
 const executable=path.resolve(process.argv[2]||'');if(!fs.existsSync(executable)||!executable.endsWith('.exe'))throw Error('Supply the newly packaged development executable.');
 const run=createQaRun('development-package','compiled-runtime');
 const env={...process.env,HOI4_DATA_DIR:run.dataDirectory};delete env.ELECTRON_RUN_AS_NODE;
 let app:Awaited<ReturnType<typeof _electron.launch>>|undefined;
 try{
  const archive=path.join(path.dirname(executable),'resources','app.asar');
  const manifest=captureRuntimeArchive(archive);run.write('runtime-manifest.json',manifest);
  // Compare compiled application bytes to the actual packaged archive, not merely its name.
  for(const member of manifest.members.filter((m:any)=>/^(build|dist|assets)\//.test(m.file)&&m.file!=='build/development.json')){
   if(fileHash(path.resolve(member.file))!==member.sha256)throw Error('Packaged runtime differs: '+member.file);
  }
  app=await _electron.launch({executablePath:executable,env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned unpacked Electron development build'});
  let p=await app.firstWindow({timeout:60000});const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
  let recordingId='';
  await run.check('packaged renderer, embedded API and installed references load',['M5-PACKAGE'],async()=>{
   await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible({timeout:60000});
   const status=await p.evaluate(()=>fetch('/api/v1/status').then(r=>r.json()));assertOwnedStatus(status,run.dataDirectory);if(!status.meta?.counts?.focus)throw Error('Installed focus resources unavailable');
   const security=await app!.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return w.webContents.getLastWebPreferences();});if(security.nodeIntegration||!security.contextIsolation||!security.sandbox)throw Error('Renderer isolation changed');
   if(process.env.HOI4_INTELLIGENCE_RECORDING){const panel=p.getByRole('region',{name:'Your observed campaign'});await panel.getByLabel('Open snapshot recording').setInputFiles(process.env.HOI4_INTELLIGENCE_RECORDING);await expect(panel.getByText('Recording saved locally and available after restart.')).toBeVisible();recordingId=await panel.getByLabel('Saved campaign recording').inputValue();}
   await p.screenshot({path:path.join(run.output,'packaged-command-center.png'),fullPage:true});
  });
  const oldUrl=p.url();await app.close();app=undefined;
  await run.check('closed packaged service stops and recording survives packaged restart',['M5-PACKAGE-REOPEN'],async()=>{
   let stopped=false;try{await fetch(oldUrl+'/api/v1/status');}catch{stopped=true;}if(!stopped)throw Error('Closed application left its service running');
   app=await _electron.launch({executablePath:executable,env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned restart of unpacked development build'});p=await app.firstWindow({timeout:60000});
   await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible({timeout:60000});
   if(recordingId){const panel=p.getByRole('region',{name:'Your observed campaign'});await panel.getByLabel('Saved campaign recording').selectOption(recordingId);await expect(panel.getByText('No focus selected',{exact:true})).toBeVisible();}
  });
  if(errors.length)throw Error(errors.join('\n'));run.finish({executable,executableSHA256:fileHash(executable),nativeGameLaunched:false,packagedElectronLaunched:true});console.log(run.output);
 }finally{await app?.close();run.finish();run.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
