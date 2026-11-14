import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {startServer} from '../server/api';
import {parseTelemetry} from '../server/bridge/telemetry';
import {DatabaseSync} from 'node:sqlite';
import {createQaRun,browserOptions,assertOwnedStatus} from './qa/fixture';

async function main(){
const run=createQaRun('campaign-intelligence','headless-renderer');
const app=await startServer({dataDir:run.dataDirectory,port:0,autoIndex:false,staticDir:path.resolve('dist'),bridge:{gameRoot:process.env.HOI4_UI_GAME_ROOT||path.join(run.root,'missing-game'),userRoot:run.root}});
if(process.env.HOI4_UI_REFERENCE_DB){const reference=new DatabaseSync(process.env.HOI4_UI_REFERENCE_DB,{readOnly:true});try{for(const row of reference.prepare("SELECT payload FROM entries WHERE id IN ('GER','GER_prioritize_economic_growth') AND kind IN ('country','focus')").all())app.store.insert(JSON.parse(String(row.payload)));}finally{reference.close();}}
const browser=await chromium.launch(browserOptions());const errors:string[]=[];
try{
 assertOwnedStatus(await fetch(app.url+'/api/v1/status').then(r=>r.json()),run.dataDirectory);
 const p=await browser.newPage({viewport:{width:1440,height:1100}});p.on('pageerror',e=>errors.push(e.message));await p.goto(app.url);
 const panel=p.getByRole('region',{name:'Your observed campaign'});
 if(!process.argv.includes('--recorded-only')){
 await run.check('existing Command center exposes disconnected dashboard',['M4-UI'],async()=>{
   await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible();await expect(panel.getByText('No campaign observations yet')).toBeVisible();await expect(panel.getByText('No owned game session connected',{exact:true})).toBeVisible();
   await p.screenshot({path:path.join(run.output,'empty.png'),fullPage:true});
 });
 const fixture=(pp:number,date:string)=>({...parseTelemetry(`[${date}]: HC_BRIDGE|v1|state|producer=fixture|tag=GER|pp=${pp}|stability=0.81|END`,{sessionId:'offline-ui-fixture',observedAt:'2020-01-01T00:00:00Z',gameVersion:'fixture',path:'offline-fixture.log',offset:pp})!,dataOrigin:'fixture' as const});
 const snapshots=[fixture(2,'1936.01.01.24'),fixture(4,'1936.01.02.24')];
 const upload={name:'offline-fixture.jsonl',mimeType:'text/plain',buffer:Buffer.from(snapshots.map(s=>JSON.stringify(s)).join('\n'))};
 await run.check('fixture upload, stale values, missing focus and historical comparison',['M4-EVIDENCE'],async()=>{
   await panel.getByLabel('File provenance').selectOption('fixture');await panel.getByLabel('Open snapshot recording').setInputFiles(upload);
   await expect(panel.locator('.intelligence-evidence strong')).toBeVisible();await expect(panel.getByText('1936.01.02.24',{exact:true})).toBeVisible();await expect(panel.getByText('No supported focus observation')).toBeVisible();await expect(panel.getByText(/Log data: Stale/)).toBeVisible();
   await panel.getByLabel('Compare with').selectOption(snapshots[0].id);await expect(panel.getByRole('region',{name:'Snapshot comparison'})).toContainText('Political power: +2');
   await panel.getByRole('button',{name:'Country reference'}).click();await expect(p.getByRole('dialog')).toBeVisible();await p.getByRole('button',{name:'Close reference'}).click();
   await p.screenshot({path:path.join(run.output,'fixture-comparison.png'),fullPage:true});
 });
 await run.check('invalid import retains recording; bridge outage removes connection claim',['M4-FAILURE'],async()=>{
   await panel.getByLabel('Open snapshot recording').setInputFiles({name:'bad.jsonl',mimeType:'text/plain',buffer:Buffer.from('{}')});await expect(panel.getByRole('alert')).toBeVisible();await expect(panel.getByText('1936.01.02.24',{exact:true})).toBeVisible();
   await p.route('**/api/v1/bridge/intelligence',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"Offline test outage"}'}));await panel.getByRole('button',{name:'Refresh observations'}).click();await expect(panel.getByText('Local bridge disconnected',{exact:true})).toBeVisible();await expect(panel.locator('.intelligence-evidence strong')).toBeVisible();await p.unroute('**/api/v1/bridge/intelligence');
 });
 await run.check('mobile layout, navigation and return to real bridge history',['M4-NAVIGATION'],async()=>{
   await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(run.output,'mobile.png'),fullPage:true});
   if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
   await panel.getByRole('button',{name:'Return to bridge history'}).click();await expect(panel.getByText('No campaign observations yet')).toBeVisible();
   await p.getByRole('button',{name:'Field manual',exact:true}).click();await p.getByRole('button',{name:'Command center',exact:true}).click();await expect(panel.getByText('No campaign observations yet')).toBeVisible();
 });
 }
 if(process.env.HOI4_INTELLIGENCE_RECORDING)await run.check('retained native recording is displayed as historical with installed reference navigation',['M4-RECORDED'],async()=>{
   await p.setViewportSize({width:1440,height:1100});await panel.getByLabel('File provenance').selectOption('recording');await panel.getByLabel('Open snapshot recording').setInputFiles(process.env.HOI4_INTELLIGENCE_RECORDING!);
   await expect(panel.locator('.intelligence-evidence strong')).toHaveText('Imported recording · origin unverified');await expect(panel.getByText('No focus selected',{exact:true})).toBeVisible();await expect(panel.getByText('1936.01.01.12',{exact:true})).toBeVisible();
   await panel.getByRole('button',{name:'Country reference'}).click();await expect(p.getByRole('dialog',{name:'Germany',exact:true})).toBeVisible();await p.getByRole('button',{name:'Close reference'}).click();
   await p.screenshot({path:path.join(run.output,'retained-native-recording.png'),fullPage:true});
 });
 if(errors.length)throw Error(errors.join('\n'));run.finish({nativeGameLaunched:false});console.log(run.output);
}finally{await browser.close();await app.close();run.finish();run.cleanup();}

}
main().catch(e=>{console.error(e);process.exitCode=1;});
