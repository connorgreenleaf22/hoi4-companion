import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {chromium,_electron,expect,type Page} from '@playwright/test';
import {openStore} from '../server/store';
import {startServer,validateProfile} from '../server/api';
import {fixtures,entry} from '../tests/fixtures/knowledge-engine';

async function main(){
const output=path.resolve('artifacts/knowledge-ui-'+Date.now());fs.mkdirSync(output,{recursive:true});
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-knowledge-ui-'));
const {entries,metadata,scenario,division}=fixtures();const store=openStore(directory);entries.forEach(e=>store.insert(e));store.insert(entry('country','SIA',''));store.insert(entry('focus_tree','sia_tree',''));store.setSetting('meta',metadata);store.setSetting('gameRoot',path.join(directory,'not-a-game'));store.saveProfile(validateProfile({id:'siam',name:'Synthetic Siam study',country:'SIA',startDate:'1938-01-01',tree:'sia_tree'}));store.setSetting('selectedProfileId','siam');store.db.close();
const executable=process.argv[2],errors:string[]=[],checks:string[]=[];
let service:Awaited<ReturnType<typeof startServer>>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,electron:Awaited<ReturnType<typeof _electron.launch>>|undefined;
let page:Page;
try{
 if(executable){const env={...process.env,HOI4_DATA_DIR:directory};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;delete env.NODE_PATH;electron=await _electron.launch({executablePath:path.resolve(executable),cwd:path.dirname(path.resolve(executable)),env,timeout:60000});page=await electron.firstWindow({timeout:60000});}
 else {service=await startServer({dataDir:directory,port:0,autoIndex:false});browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Program Files/Google/Chrome/Application/chrome.exe'});page=await browser.newPage({viewport:{width:1440,height:1100}});await page.goto(service.url);}
 page.on('pageerror',e=>errors.push(e.message));
 const nav=()=>page.locator('nav').getByRole('button',{name:/Division & production/});
 await nav().click();await page.getByRole('button',{name:/Open campaign design adviser/}).click();
 const work=page.locator('.knowledge-workbench');await expect(work.getByRole('heading',{name:'Design for your campaign'})).toBeVisible();
 await work.getByText('Advanced: edit or transfer complete inputs, including tank variants inside divisions',{exact:true}).click();
 const request={scenario,candidates:[division,{...division,name:'6 infantry',rows:[{unit:'infantry',count:6}]}],objective:{metric:'defense',direction:'maximize',perIndustrialCost:false},constraints:[]};
 await work.getByLabel('Complete comparison inputs').fill(JSON.stringify(request));await work.getByRole('button',{name:'Apply complete inputs',exact:true}).click();
 await work.getByRole('button',{name:'Compare candidates',exact:true}).click();await expect(work.getByRole('heading',{name:'Candidate comparison: compared'})).toBeVisible();await expect(work.locator('tbody tr')).toHaveCount(2);checks.push('real service-backed comparison and explicit estimate label');
 await work.locator('fieldset').first().getByLabel('Count infantry',{exact:true}).fill('8');await expect(work.getByRole('heading',{name:'Candidate comparison: compared'})).toHaveCount(0);checks.push('editing invalidates previous outputs');
 await work.getByText('Search a bounded set of alternatives',{exact:true}).click();await work.getByLabel('Minimum battalions',{exact:true}).fill('6');await work.getByLabel('Maximum battalions',{exact:true}).fill('9');await work.getByRole('button',{name:'Search declared alternatives',exact:true}).click();await expect(work.locator('tbody tr')).toHaveCount(4);checks.push('complete bounded count search reaches the UI');
 await work.getByLabel('Include this saved comparison in AI advice previews').check();await work.getByRole('button',{name:'Save comparison',exact:true}).click();await expect(work.getByRole('status')).toContainText('saved to this campaign');checks.push('campaign-specific canonical save');
 await page.locator('nav').getByRole('button',{name:/Command center/}).click();await nav().click();await work.getByRole('button',{name:/Open campaign design adviser/}).click();await expect(work.locator('fieldset')).toHaveCount(4);await expect(work.getByLabel('Include this saved comparison in AI advice previews')).toBeChecked();checks.push('navigation retains generated designs and sharing choice');
 await page.reload();await nav().click();await work.getByRole('button',{name:/Open campaign design adviser/}).click();await expect(work.locator('fieldset')).toHaveCount(4);checks.push('full renderer reload restores local draft');
 await work.scrollIntoViewIfNeeded();if(!executable)await page.setViewportSize({width:390,height:844});else await electron!.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(420,900));
 await expect.poll(()=>work.evaluate(el=>el.scrollWidth<=el.clientWidth+2)).toBe(true);await work.screenshot({path:path.join(output,'narrow-adviser.png')});checks.push('narrow adviser has no internal horizontal overflow');
 await work.getByRole('button',{name:'Inspect first candidate',exact:true}).click();await expect(work.locator('.knowledge-result')).toHaveCount(1);checks.push('metric explanation inspection');
 assertNoErrors();
 if(executable){
  const url=page.url();await electron!.close();electron=undefined;
  const refused=await fetch(url).then(()=>false,()=>true);if(!refused)throw new Error('Owned app service remained available after close.');
  const env={...process.env,HOI4_DATA_DIR:directory};delete env.ELECTRON_RUN_AS_NODE;delete env.NODE_OPTIONS;delete env.NODE_PATH;
  electron=await _electron.launch({executablePath:path.resolve(executable),cwd:path.dirname(path.resolve(executable)),env,timeout:60000});page=await electron.firstWindow({timeout:60000});page.on('pageerror',e=>errors.push(e.message));await nav().click();await page.getByRole('button',{name:/Open campaign design adviser/}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Load saved comparison',exact:true}).click();await expect(page.locator('.knowledge-workbench fieldset')).toHaveCount(4);checks.push('extracted Windows app shuts down service and reopens canonical saved study via explicit Load after full restart');
 }
 assertNoErrors();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors,mode:executable?'extracted-windows':'browser',gameCalls:0,providerCalls:0,fixture:'Original synthetic study; not HOI4 parity'},null,2));console.log(JSON.stringify({output,checks:checks.length,errors:errors.length}));
}catch(error){if(page!){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});console.error(JSON.stringify({errors,body:(await page.locator('body').innerText()).slice(-6000)}));}throw error;}finally{await electron?.close();await browser?.close();await service?.close();const safe=path.resolve(directory);if(!safe.startsWith(path.resolve(os.tmpdir())+path.sep+'hoi4-knowledge-ui-'))throw new Error('Refusing cleanup outside the isolated UI fixture.');fs.rmSync(safe,{recursive:true,force:true});}
function assertNoErrors(){if(errors.length)throw new Error('Renderer errors: '+errors.join('; '));}

}
main().catch(error=>{console.error(error);process.exitCode=1;});
