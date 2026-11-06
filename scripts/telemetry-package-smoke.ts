import {_electron,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {createQaRun,assertOwnedStatus,fileHash} from './qa/fixture';
import {captureRuntimeArchive} from './verify-package.mjs';
import {replaySnapshots} from '../server/bridge/telemetry';

async function main(){
 const executable=path.resolve(process.argv[2]||''),recording=path.resolve(process.argv[3]||'');
 if(!executable.endsWith('.exe')||!fs.existsSync(executable))throw Error('Supply isolated packaged executable and v2 JSONL recording');
 const snapshots=replaySnapshots(fs.readFileSync(recording,'utf8'));
 if(snapshots.length!==8||snapshots[0].schemaVersion!==2)throw Error('Expected retained eight-snapshot M6.5 recording');
 const run=createQaRun('telemetry-package','compiled-runtime');
 const env={...process.env,HOI4_DATA_DIR:run.dataDirectory,PATH:`${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`};
 delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;delete env.NODE_PATH;
 let app:Awaited<ReturnType<typeof _electron.launch>>|undefined;
 const errors:string[]=[];
 const launch=async()=>{
  app=await _electron.launch({executablePath:executable,cwd:path.dirname(executable),env,timeout:60000});
  run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned M6.5 packaged application'});
  const page=await app.firstWindow({timeout:60000});page.on('pageerror',e=>errors.push(e.message));
  await expect(page.getByRole('heading',{name:'Command center',exact:true})).toBeVisible({timeout:60000});return page;
 };
 try{
  const manifest=captureRuntimeArchive(path.join(path.dirname(executable),'resources','app.asar'));run.write('runtime-manifest.json',manifest);
  for(const member of manifest.members.filter((m:any)=>/^(build|dist|assets)\//.test(m.file)&&m.file!=='build/development.json'))if(fileHash(path.resolve(member.file))!==member.sha256)throw Error('Packaged runtime differs: '+member.file);
  let page=await launch(),id='';
  await run.check('packaged v2 import displays real values and bounded research transition',['M65-UI','M65-REPLAY'],async()=>{
   const status=await page.evaluate(()=>fetch('/api/v1/status').then(r=>r.json()));assertOwnedStatus(status,run.dataDirectory);if(!status.meta?.counts?.focus)throw Error('Installed resources missing');
   const prefs=await app!.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());if(prefs.nodeIntegration||!prefs.sandbox||!prefs.contextIsolation)throw Error('Renderer isolation changed');
   const panel=page.getByRole('region',{name:'Your observed campaign'});
   await panel.getByLabel('Open snapshot recording').setInputFiles(recording);
   await expect(panel.getByText('Recording saved locally and available after restart.')).toBeVisible();id=await panel.getByLabel('Saved campaign recording').inputValue();
   await expect(panel.getByLabel('Snapshot',{exact:true}).getByRole('option')).toHaveCount(8);
   const details=panel.getByLabel('Expanded scripted observations');await details.locator('summary').click();
   const research=details.locator('section').filter({has:page.getByRole('heading',{name:'Technology currently researching',exact:true})});
   await expect(research).toContainText('basic_machine_tools: Yes');await expect(details).toContainText('Current focus and research progress are unavailable.');
   await expect(details.locator('div').filter({has:page.locator('dt').filter({hasText:'War support (fraction)'})}).first()).toContainText('0.35');
   await expect(panel).toContainText('No owned game session connected');await expect(panel).toContainText('Imported recording; origin is not independently verified');
   await page.screenshot({path:path.join(run.output,'expanded-research-active.png'),fullPage:true});
   const first=await panel.getByLabel('Snapshot',{exact:true}).getByRole('option').filter({hasText:'1936.01.01.12'}).getAttribute('value');await panel.getByLabel('Snapshot',{exact:true}).selectOption(first!);
   await expect(research).toContainText('basic_machine_tools: No');
   const bridge=await page.evaluate(()=>fetch('/api/v1/bridge/status').then(r=>r.json()));if(bridge.mode!=='observer'||bridge.capabilities.some((c:any)=>c.id==='focus.select'&&c.available))throw Error('Unexpected gameplay access');
  });
  const origin=new URL(page.url()).origin;await app.close();app=undefined;
  await run.check('packaged service stops and expanded history survives restart',['M65-PERSISTENCE'],async()=>{
   let stopped=false;try{await fetch(origin+'/api/v1/status');}catch{stopped=true;}if(!stopped)throw Error('Service remained running');
   page=await launch();const panel=page.getByRole('region',{name:'Your observed campaign'});await panel.getByLabel('Saved campaign recording').selectOption(id);
   await expect(panel.getByLabel('Snapshot',{exact:true}).getByRole('option')).toHaveCount(8);
   const details=panel.getByLabel('Expanded scripted observations');await details.locator('summary').click();await expect(details).toContainText('manifest ger-m65-1');await expect(panel).toContainText('No owned game session connected');
   await page.screenshot({path:path.join(run.output,'expanded-history-reopened.png'),fullPage:true});
  });
  if(errors.length)throw Error(errors.join('\n'));
  run.finish({executable,recordingSHA256:fileHash(recording),nativeGameLaunched:false,packagedElectronLaunched:true});console.log(run.output);
 }finally{
  try{await app?.close();}finally{const logs=path.join(run.dataDirectory,'diagnostics');if(fs.existsSync(logs))for(const file of fs.readdirSync(logs))fs.copyFileSync(path.join(logs,file),path.join(run.output,file));run.finish();run.cleanup();}
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
