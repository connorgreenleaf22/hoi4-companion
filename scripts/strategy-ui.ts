import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {startServer} from '../server/api';
import {createQaRun,browserOptions} from './qa/fixture';
import {createAndCompareStrategies,verifyStrategyComparison,verifyUniversalSearch} from './qa/strategy-journey';

async function main(){
 if(!process.env.HOI4_UI_REFERENCE_DB||!process.env.HOI4_INTELLIGENCE_RECORDING)throw Error('Supply retained installed-reference DB and native recording. This test never launches HOI4.');
 const run=createQaRun('strategy-planning','headless-renderer');const options={dataDir:run.dataDirectory,port:0,autoIndex:false,staticDir:path.resolve('dist')};let app=await startServer(options);let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
 try{
  browser=await chromium.launch(browserOptions());
  const reference=new DatabaseSync(process.env.HOI4_UI_REFERENCE_DB,{readOnly:true});try{
   app.store.db.exec('BEGIN');for(const row of reference.prepare("SELECT payload FROM entries WHERE source='common/national_focus/germany.txt' OR kind IN ('country','decision','technology')").all())app.store.insert(JSON.parse(String(row.payload)));const meta=reference.prepare("SELECT value FROM settings WHERE key='meta'").get();app.store.setSetting('meta',JSON.parse(String(meta!.value)));app.store.db.exec('COMMIT');
  }finally{reference.close();}
  let p=await browser.newPage({viewport:{width:1440,height:1100}});const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(app.url);
  await run.check('universal search resolves installed names, historical alias, ID and spelling locally',['M61-SEARCH'],()=>verifyUniversalSearch(p));
  await run.check('retained recording to installed German objective routes, alternatives and references',['M6-STRATEGY'],async()=>{
   const panel=p.getByRole('region',{name:'Your observed campaign'});await panel.getByLabel('Open snapshot recording').setInputFiles(process.env.HOI4_INTELLIGENCE_RECORDING!);await expect(panel.getByText('Recording saved locally and available after restart.')).toBeVisible();
   const german=panel.getByLabel('Baseline focus tree').getByRole('option',{name:/German National Focus/});await expect(german).toHaveCount(1);await panel.getByLabel('Baseline focus tree').selectOption((await german.getAttribute('value'))!);await panel.getByLabel('New planning workspace').fill('M6 historical strategies');await panel.getByRole('button',{name:'Preview planning baseline'}).click();await panel.getByRole('button',{name:'Confirm and open planner'}).click();
   await createAndCompareStrategies(p,run.output);
  });
  await browser.close();await app.close();app=await startServer(options);browser=await chromium.launch(browserOptions());p=await browser.newPage({viewport:{width:1440,height:1100}});p.on('pageerror',e=>errors.push(e.message));await p.goto(app.url);
  await run.check('universal search resolves installed names, historical alias, ID and spelling locally',['M61-SEARCH'],()=>verifyUniversalSearch(p));
  await run.check('saved alternatives and immutable baseline survive service and renderer restart',['M6-REOPEN'],async()=>{
   await p.getByRole('button',{name:'Campaign planner',exact:true}).click();await verifyStrategyComparison(p);await p.getByLabel('Plan alternative').selectOption({label:'Economic route'});await expect(p.getByLabel('Plan name')).toHaveValue('Economic route');await p.screenshot({path:path.join(run.output,'strategy-reopened.png'),fullPage:true});
   const status=await p.evaluate(()=>fetch('/api/v1/status').then(r=>r.json()));const profile=status.profiles.find((p:any)=>p.name==='M6 historical strategies');if(profile.completed.length||profile.planner.plans.length!==3)throw Error('History changed or alternatives lost');
  });
  if(errors.length)throw Error(errors.join('\n'));run.finish({nativeGameLaunched:false,recordedNativeData:true});console.log(run.output);
 }finally{await browser?.close();await app.close();run.finish();run.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
