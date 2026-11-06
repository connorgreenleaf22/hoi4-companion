import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
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
 const platform=process.env.HOI4_PLATFORM_SMOKE==='1';
 const run=createQaRun(platform?'platform-package':'telemetry-package','compiled-runtime');
 let client:Client|undefined,transport:StdioClientTransport|undefined;
 const savePath=process.env.HOI4_PLATFORM_SAVE,saveHash=savePath?fileHash(savePath):null;
 const call=async(name:string,args:Record<string,unknown>={})=>{const response=await client!.callTool({name,arguments:args});if(response.isError)throw Error(JSON.stringify(response));return (response.structuredContent as any).data;};
 const env={...process.env,HOI4_DATA_DIR:run.dataDirectory,PATH:`${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`};
 delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;delete env.NODE_PATH;
 let app:Awaited<ReturnType<typeof _electron.launch>>|undefined;
 const errors:string[]=[];
 const launch=async()=>{
  app=await _electron.launch({executablePath:executable,cwd:path.dirname(executable),env,timeout:60000});
  run.ownedProcesses.push({pid:app.process().pid!,kind:'Owned isolated packaged companion'});
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
  if(platform)await run.check('packaged UI, real save and external MCP share read-only state and stop',['M7-UI','M7-MCP','M7-SAVE'],async()=>{
   const connection=page.getByLabel('Game integration connection');await connection.locator(':scope > summary').click();
   const log=path.join(run.sourceFixtures,'game.log');
   fs.writeFileSync(log,['1936.01.01.24','1936.01.02.24'].map(date=>`[${date}] HC_BRIDGE|v2|state|producer=fixture|manifest=ger-m65-1|tag=GER|n=2,0.81,0.35,4,35,28,10|f=0,0|t=1,0,0|r=0,1,0|END`).join('\n')+'\n');
   await connection.getByRole('combobox',{name:'Observation source',exact:true}).selectOption('log');await connection.getByLabel('Observation source path').fill(log);await connection.getByRole('button',{name:'Connect read-only observations',exact:true}).click();
   await expect(connection.locator(':scope > summary')).toContainText('log-monitoring');
   if(!savePath)throw Error('Supply HOI4_PLATFORM_SAVE: existing disposable plaintext save');
   await connection.getByLabel('Plaintext save path').fill(savePath);await connection.getByRole('button',{name:'Inspect save read-only'}).click();
   const observation=connection.getByLabel('Save-derived observation');await expect(observation).toContainText('1936.4.1.1');await observation.locator(':scope > summary').click();await expect(observation).toContainText('parsed-unqualified');await expect(observation).toContainText('No explicit valid current token');
   const status=await page.evaluate(()=>fetch('/api/v1/bridge/platform/status').then(r=>r.json()));
   if(status.observations[0].classification!=='historical')throw Error('Unowned log mislabeled live');
   const entry=path.join(path.dirname(executable),'HOI4-Bridge-MCP.cjs');if(fileHash(entry)!==fileHash(path.resolve('build/bridge-mcp.cjs')))throw Error('MCP bundle differs');
   client=new Client({name:'m7-packaged-acceptance',version:'1.0.0'});transport=new StdioClientTransport({command:process.execPath,args:[entry],cwd:path.dirname(executable),env:{...process.env as Record<string,string>,HOI4_BRIDGE_CONNECTION:status.mcp.connectionFile},stderr:'pipe'});await client.connect(transport);
   if((await client.listTools()).tools.length!==15)throw Error('MCP catalog mismatch');
   const observed=await call('hoi4_bridge_observations'),saved=observed.find((o:any)=>o.source.kind==='plaintext-save');
   if(saved.source.hash!==saveHash||saved.fields.researchAssignments.value.length!==4||saved.fields.completedTechnologies.value.length!==55)throw Error('Real save extraction mismatch');
   if(saved.fields.currentFocus.status!=='unavailable'||saved.fields.focusProgress.status!=='unavailable')throw Error('Unproven focus inferred');
   const history=await call('hoi4_bridge_history',{recordingId:id});if(history.snapshots.length!==8)throw Error('MCP cannot see UI recording');
   const validation=await call('hoi4_bridge_action_validate',{action:{schemaVersion:1,requestId:'packaged-dry-run',sessionId:'not-live',command:'focus.select',mode:'control'}});if(validation.allowed!==false||await call('hoi4_bridge_receipt',{requestId:'packaged-dry-run'})!==null)throw Error('Dry-run mutated receipts');
   await call('hoi4_bridge_emergency_stop');await connection.getByRole('button',{name:'Check connection'}).click();await expect(connection.locator(':scope > summary')).toContainText('stopped');
   if(fileHash(savePath)!==saveHash)throw Error('Original save changed');
   run.write('platform-review.json',{tools:15,historyCount:history.snapshots.length,saveHash,saveFields:saved.fields,live:false,commandExecution:false,fixtureLog:true});
   await page.screenshot({path:path.join(run.output,'platform-save-and-diagnostics.png'),fullPage:true});
  });
  const origin=new URL(page.url()).origin;await app.close();app=undefined;
  await run.check('packaged service stops and expanded history survives restart',['M65-PERSISTENCE'],async()=>{
   let stopped=false;try{await fetch(origin+'/api/v1/status');}catch{stopped=true;}if(!stopped)throw Error('Service remained running');
   page=await launch();const panel=page.getByRole('region',{name:'Your observed campaign'});await panel.getByLabel('Saved campaign recording').selectOption(id);
   await expect(panel.getByLabel('Snapshot',{exact:true}).getByRole('option')).toHaveCount(8);
   const details=panel.getByLabel('Expanded scripted observations');await details.locator('summary').click();await expect(details).toContainText('manifest ger-m65-1');await expect(panel).toContainText('No owned game session connected');
   if(platform){
    const connection=page.getByLabel('Game integration connection');await connection.locator(':scope > summary').click();await expect(connection.locator(':scope > summary')).toContainText('stopped');await expect(connection.getByLabel('Save-derived observation')).toHaveCount(1);
    if((await call('hoi4_bridge_connection')).state!=='stopped'||(await call('hoi4_bridge_history',{recordingId:id})).snapshots.length!==8)throw Error('MCP failed refreshed app descriptor after restart');
   }
   await page.screenshot({path:path.join(run.output,'expanded-history-reopened.png'),fullPage:true});
  });
  if(errors.length)throw Error(errors.join('\n'));
  run.finish({executable,recordingSHA256:fileHash(recording),nativeGameLaunched:false,packagedElectronLaunched:true});console.log(run.output);
 }finally{
  if(app&&run.results.some(result=>result.status==='failed')){try{const page=await app.firstWindow();run.write('failure-accessibility.json',await page.locator('body').ariaSnapshot());await page.screenshot({path:path.join(run.output,'failure.png'),fullPage:true});}catch{/* Preserve the original failure if the renderer exited. */}}
  try{await client?.close();await transport?.close();await app?.close();}finally{const logs=path.join(run.dataDirectory,'diagnostics');if(fs.existsSync(logs))for(const file of fs.readdirSync(logs))fs.copyFileSync(path.join(logs,file),path.join(run.output,file));run.finish();run.cleanup();}
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
