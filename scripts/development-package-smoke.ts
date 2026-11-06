import {_electron,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {createQaRun,assertOwnedStatus,fileHash} from './qa/fixture';
import {captureRuntimeArchive} from './verify-package.mjs';
import {verifyReferenceExplanations} from './qa/reference-journey';
import {createAndCompareStrategies,verifyStrategyComparison,verifyUniversalSearch} from './qa/strategy-journey';

async function main(){
 const executable=path.resolve(process.argv[2]||'');if(!fs.existsSync(executable)||!executable.endsWith('.exe'))throw Error('Supply the newly packaged development executable.');
 const run=createQaRun('development-package','compiled-runtime');
 const env={...process.env,HOI4_DATA_DIR:run.dataDirectory};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_PATH;delete env.NODE_OPTIONS;
 if(process.env.HOI4_STRATEGY_SMOKE==='1')env.PATH=`${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`;
 let app:Awaited<ReturnType<typeof _electron.launch>>|undefined;
 const retainDiagnostics=()=>{const directory=path.join(run.dataDirectory,'diagnostics');if(fs.existsSync(directory))for(const name of fs.readdirSync(directory))fs.copyFileSync(path.join(directory,name),path.join(run.output,name));};
 try{
  const archive=path.join(path.dirname(executable),'resources','app.asar');
  const manifest=captureRuntimeArchive(archive);run.write('runtime-manifest.json',manifest);
  // Compare compiled application bytes to the actual packaged archive, not merely its name.
  for(const member of manifest.members.filter((m:any)=>/^(build|dist|assets)\//.test(m.file)&&m.file!=='build/development.json')){
   if(fileHash(path.resolve(member.file))!==member.sha256)throw Error('Packaged runtime differs: '+member.file);
  }
  app=await _electron.launch({executablePath:executable,cwd:path.dirname(executable),env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned unpacked Electron development build'});
  app.process().stdout?.on('data',bytes=>fs.appendFileSync(path.join(run.output,'electron-stdout.txt'),bytes));app.process().stderr?.on('data',bytes=>fs.appendFileSync(path.join(run.output,'electron-stderr.txt'),bytes));
  let p!:Awaited<ReturnType<typeof app.firstWindow>>;await run.check('packaged first window appears',['M6.1-STARTUP'],async()=>{p=await app!.firstWindow({timeout:60000});});const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
  let recordingId='';
  await run.check('packaged renderer, embedded API and installed references load',['M5-PACKAGE'],async()=>{
   await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible({timeout:60000});
   const status=await p.evaluate(()=>fetch('/api/v1/status').then(r=>r.json()));assertOwnedStatus(status,run.dataDirectory);if(!status.meta?.counts?.focus)throw Error('Installed focus resources unavailable');
   if(process.env.HOI4_STRATEGY_SMOKE==='1'){const runtime=await app!.evaluate(()=>({cwd:process.cwd(),path:process.env.PATH,nodePath:process.env.NODE_PATH,nodeOptions:process.env.NODE_OPTIONS}));run.write('isolated-runtime-environment.json',runtime);if(path.resolve(runtime.cwd)!==path.dirname(executable)||runtime.path!==env.PATH||runtime.nodePath||runtime.nodeOptions)throw Error('Packaged runtime inherited development environment');}
   const security=await app!.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return w.webContents.getLastWebPreferences();});if(security.nodeIntegration||!security.contextIsolation||!security.sandbox)throw Error('Renderer isolation changed');
   if(process.env.HOI4_STRATEGY_SMOKE==='1')await verifyUniversalSearch(p);
   if(process.env.HOI4_INTELLIGENCE_RECORDING){const panel=p.getByRole('region',{name:'Your observed campaign'});await panel.getByLabel('Open snapshot recording').setInputFiles(process.env.HOI4_INTELLIGENCE_RECORDING);await expect(panel.getByText('Recording saved locally and available after restart.')).toBeVisible();recordingId=await panel.getByLabel('Saved campaign recording').inputValue();
    const german=panel.getByLabel('Baseline focus tree').getByRole('option',{name:/German National Focus/});await expect(german).toHaveCount(1);
    await panel.getByLabel('Baseline focus tree').selectOption((await german.getAttribute('value'))!);
    await panel.getByLabel('New planning workspace').fill('M5.1 desktop baseline');
    await panel.getByRole('button',{name:'Preview planning baseline'}).click();await expect(panel.getByRole('region',{name:'Baseline preview'})).toContainText('Country: GER');
    await panel.getByRole('button',{name:'Confirm and open planner'}).click();await expect(p.getByLabel('Planner country')).toHaveValue('GER');await expect(p.getByLabel('Planning baseline',{exact:true})).toHaveValue('1936-01-01');
    await expect(p.getByRole('region',{name:'Recorded planning baseline'})).toContainText('Unavailable: research, completed focuses');
    await p.getByRole('button',{name:'Add Prioritize Economic Growth to queue',exact:true}).click();await expect(p.getByRole('button',{name:'Apply reviewed plan'})).toBeEnabled();await p.getByRole('button',{name:'Apply reviewed plan'}).click();await expect(p.getByText('Reviewed plan applied. Actual completion history is unchanged.')).toBeVisible();
    if(process.env.HOI4_STRATEGY_SMOKE==='1')await createAndCompareStrategies(p,run.output);
    if(process.env.HOI4_EXPLANATION_SMOKE==='1')await verifyReferenceExplanations(p,run.output);
    await p.screenshot({path:path.join(run.output,'packaged-planner.png'),fullPage:true});
    await p.getByRole('button',{name:'Command center',exact:true}).click();
   }
   await p.screenshot({path:path.join(run.output,'packaged-command-center.png'),fullPage:true});
  });
  const oldUrl=new URL(p.url()).origin;await app.close();app=undefined;
  await run.check('closed packaged service stops and recording survives packaged restart',['M5-PACKAGE-REOPEN'],async()=>{
   let stopped=false;try{await fetch(oldUrl+'/api/v1/status');}catch{stopped=true;}if(!stopped)throw Error('Closed application left its service running');
   app=await _electron.launch({executablePath:executable,cwd:path.dirname(executable),env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned restart of unpacked development build'});p=await app.firstWindow({timeout:60000});
   await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible({timeout:60000});
   if(recordingId){const panel=p.getByRole('region',{name:'Your observed campaign'});await panel.getByLabel('Saved campaign recording').selectOption(recordingId);await expect(panel.getByText('No focus selected',{exact:true})).toBeVisible();await p.getByRole('button',{name:'Campaign planner',exact:true}).click();await expect(p.getByRole('region',{name:'Recorded planning baseline'})).toContainText('Political power: 2.324');if(process.env.HOI4_STRATEGY_SMOKE==='1')await verifyStrategyComparison(p);else {await expect(p.getByLabel('Plan name')).toHaveValue('Main');await expect(p.locator('.cp-step-title').getByRole('button',{name:'Prioritize Economic Growth',exact:true})).toBeVisible();}await p.screenshot({path:path.join(run.output,'packaged-reopened.png'),fullPage:true});}
  });
  if(errors.length)throw Error(errors.join('\n'));const diagnostics=path.join(run.dataDirectory,'diagnostics');if(fs.existsSync(diagnostics))for(const name of fs.readdirSync(diagnostics))fs.copyFileSync(path.join(diagnostics,name),path.join(run.output,name));
  run.finish({executable,executableSHA256:fileHash(executable),nativeGameLaunched:false,packagedElectronLaunched:true});console.log(run.output);
 }finally{try{await app?.close();}finally{retainDiagnostics();run.finish();run.cleanup();}}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
