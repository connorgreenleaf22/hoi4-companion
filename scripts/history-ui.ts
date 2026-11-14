import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {startServer} from '../server/api';
import {parseTelemetry} from '../server/bridge/telemetry';
import {createQaRun,browserOptions} from './qa/fixture';

async function main(){
 const run=createQaRun('campaign-history','headless-renderer');
 const options={dataDir:run.dataDirectory,port:0,autoIndex:false,staticDir:path.resolve('dist')};
 let app=await startServer(options);let browser=await chromium.launch(browserOptions());
 const real=process.env.HOI4_INTELLIGENCE_RECORDING;
 if(process.env.HOI4_UI_REFERENCE_DB){const reference=new DatabaseSync(process.env.HOI4_UI_REFERENCE_DB,{readOnly:true});try{
  for(const row of reference.prepare("SELECT payload FROM entries WHERE source='common/national_focus/germany.txt' OR (id='GER' AND kind='country')").all())app.store.insert(JSON.parse(String(row.payload)));
  const row=reference.prepare("SELECT value FROM settings WHERE key='meta'").get();if(row)app.store.setSetting('meta',JSON.parse(String(row.value)));
 }finally{reference.close();}}
 const errors:string[]=[];let p=await browser.newPage({viewport:{width:1440,height:1100}});p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(app.url);let panel=p.getByRole('region',{name:'Your observed campaign'});
  const s=parseTelemetry('[1936.01.01.24]: HC_BRIDGE|v1|state|producer=fixture|tag=GER|pp=2|stability=0.81|END',{sessionId:'history-fixture',observedAt:'2020-01-01T00:00:00Z',gameVersion:'fixture',path:'fixture.log',offset:0})!;
  const upload=real||{name:'offline-history.jsonl',mimeType:'text/plain',buffer:Buffer.from(JSON.stringify({...s,dataOrigin:'fixture'}))};
  let recordingId='';
  await run.check('import recording, inspect values and reject duplicate storage',['M5-HISTORY'],async()=>{
   await panel.getByLabel('File provenance').selectOption(real?'recording':'fixture');await panel.getByLabel('Open snapshot recording').setInputFiles(upload);
   await expect(panel.getByText('Recording saved locally and available after restart.')).toBeVisible();recordingId=await panel.getByLabel('Saved campaign recording').inputValue();
   await expect(panel.getByText(/Log data: Stale/)).toBeVisible();
   await panel.getByLabel('Open snapshot recording').setInputFiles(upload);await expect(panel.getByText('Recording already saved; opened the existing copy.')).toBeVisible();
   if(real){const opts=panel.getByLabel('Compare with').locator('option');await expect(opts).toHaveCount(2);await panel.getByLabel('Compare with').selectOption({index:1});await expect(panel.getByRole('region',{name:'Snapshot comparison'})).toContainText('Political power: +0');}
  });
  await browser.close();await app.close();app=await startServer(options);browser=await chromium.launch(browserOptions());p=await browser.newPage({viewport:{width:1440,height:1100}});p.on('pageerror',e=>errors.push(e.message));await p.goto(app.url);panel=p.getByRole('region',{name:'Your observed campaign'});
  await run.check('reopen persisted history after renderer and service restart; preview and apply baseline',['M5-BASELINE'],async()=>{
   await panel.getByLabel('Saved campaign recording').selectOption(recordingId);await expect(panel.getByLabel('Snapshot',{exact:true})).toBeVisible();
   await panel.getByLabel('New planning workspace').fill('M5 historical strategy');
   if(process.env.HOI4_UI_REFERENCE_DB){await expect(panel.getByLabel('Baseline focus tree').locator('option')).not.toHaveCount(1);await panel.getByLabel('Baseline focus tree').selectOption({index:1});}
   await panel.getByRole('button',{name:'Preview planning baseline'}).click();const preview=panel.getByRole('region',{name:'Baseline preview'});await expect(preview).toContainText('Country: GER');await expect(preview).toContainText('1936-01-01');await expect(preview).toContainText('unavailable');
   await p.screenshot({path:path.join(run.output,'baseline-preview.png'),fullPage:true});
   await p.setViewportSize({width:390,height:844});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('History preview mobile overflow');await p.screenshot({path:path.join(run.output,'history-mobile.png'),fullPage:true});await p.setViewportSize({width:1440,height:1100});
   await panel.getByRole('button',{name:'Confirm and open planner'}).click();await expect(p.getByRole('heading',{name:'Plan the next move'})).toBeVisible();
   await expect(p.getByLabel('Planner country')).toHaveValue('GER');await expect(p.getByLabel('Planning baseline',{exact:true})).toHaveValue('1936-01-01');
   const evidence=p.getByRole('region',{name:'Recorded planning baseline'});await expect(evidence).toContainText('Unavailable: research, completed focuses');await expect(evidence).toContainText(real?'Political power: 2.324':'Offline test fixture');
   if(real)await expect(evidence).toContainText('No focus selected');
   if(process.env.HOI4_UI_REFERENCE_DB){await p.getByRole('button',{name:'Add Prioritize Economic Growth to queue',exact:true}).click();await expect(p.getByRole('button',{name:'Apply reviewed plan'})).toBeEnabled();await p.getByRole('button',{name:'Apply reviewed plan'}).click();await expect(p.getByText('Reviewed plan applied. Actual completion history is unchanged.')).toBeVisible();}
   await p.screenshot({path:path.join(run.output,'planner-baseline.png'),fullPage:true});
   await p.getByRole('button',{name:'Return to recorded campaign / change baseline'}).click();await expect(panel.getByLabel('Saved campaign recording')).toHaveValue(recordingId);
   await p.reload();await p.getByRole('button',{name:'Campaign planner',exact:true}).click();await expect(p.getByRole('region',{name:'Recorded planning baseline'})).toBeVisible();
  });
  if(errors.length)throw Error(errors.join('\n'));run.finish({nativeGameLaunched:false,recordedNativeData:!!real});console.log(run.output);
 }finally{await browser.close();await app.close();run.finish();run.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
