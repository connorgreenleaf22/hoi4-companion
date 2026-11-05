import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {startServer} from '../server/api';

const workspace='C:/Users/conno/Documents/Codex/2026-11-02/task-5';
const repo='C:/Users/conno/OneDrive/Documents/Hoi4/companion';
const evidence=path.join(workspace,'evidence');
const dataDir=fs.mkdtempSync(path.join(workspace,'developer-ui-data-'));
const records:any[]=[];const errors:string[]=[];
const check=async(name:string,fn:()=>Promise<void>)=>{const started=Date.now();try{await fn();records.push({name,status:'passed',ms:Date.now()-started});console.log('PASS '+name);}catch(error){records.push({name,status:'failed',error:String(error),ms:Date.now()-started});throw error;}};
async function main(){
 process.env.HOI4_GAME_DIR='G:/Steam Games/steamapps/common/Hearts of Iron IV';
 fs.mkdirSync(evidence,{recursive:true});
 let service=await startServer({dataDir,port:0,staticDir:path.join(repo,'dist')});
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/conno/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 const context=await browser.newContext({viewport:{width:1500,height:960},acceptDownloads:true});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const api=async(route:string,body?:any,method?:string)=>{const response=await fetch(service.url+'/api/v1/'+route,{method:method||(body===undefined?'GET':'POST'),body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(response.status+': '+JSON.stringify(data));return data;};
 let primary:any;
 try{
  await check('Desktop creation, saved selection, compact overview',async()=>{
   const status=await api('status');if(path.resolve(status.dataDirectory)!==path.resolve(dataDir))throw Error('Data isolation mismatch');if(status.network.enabled)throw Error('Unexpected LAN');
   await page.goto(service.url);await expect(page.getByRole('heading',{name:'Command center',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Create a campaign',exact:true}).click();
   await page.getByLabel('Campaign name',{exact:true}).fill('Developer Germany');
   await page.getByRole('button',{name:'Save campaign',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
   primary=(await api('status')).profiles[0];expect((await api('status')).selectedProfileId).toBe(primary.id);
   await page.screenshot({path:path.join(evidence,'after-01-command-center.png'),fullPage:true});
  });
  await check('Focus map/list keyboard, queue, notes, bookmark, reload persistence',async()=>{
   await page.getByRole('button',{name:'Countries & focuses',exact:true}).click();
   await page.getByLabel('Focus tree',{exact:true}).selectOption('focus_tree:common/national_focus/germany.txt:german_focus');
   await expect(page.locator('.focus-node').first()).toBeVisible();
   const node=page.locator('.focus-node').first();await node.focus();await expect(node).toBeFocused();await page.keyboard.press('Enter');
   await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Close reference'})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
   await page.getByRole('button',{name:'List view',exact:true}).click();await page.getByLabel('Find focus',{exact:true}).fill('GER_oppose_hitler_ww');
   await expect(page.locator('.focus-list-row')).toHaveCount(1);await page.locator('.focus-list-row>button').first().click();
   await expect(page.getByRole('dialog')).toBeVisible();
   await page.getByRole('dialog').getByRole('button',{name:'Add to queue',exact:true}).click();await expect(page.getByRole('button',{name:'In your queue',exact:true})).toBeVisible();
   await page.getByRole('dialog').getByRole('button',{name:'Bookmark',exact:true}).click();await page.getByLabel('Reference notes').fill('Developer regression note — preserved');await page.getByRole('dialog').getByRole('button',{name:'Save note',exact:true}).click();
   await expect(page.getByRole('status').filter({hasText:'Note saved.'})).toBeVisible();await page.getByRole('button',{name:'Close reference'}).click();
   await page.screenshot({path:path.join(evidence,'after-02-focus-planner.png'),fullPage:true});await page.reload();
   await page.getByRole('button',{name:'Countries & focuses',exact:true}).click();await expect(page.locator('.queue-item')).toHaveCount(1);
   primary=(await api('status')).profiles.find((p:any)=>p.id===primary.id);expect(primary.notes['focus:common/national_focus/germany.txt:GER_oppose_hitler_ww']).toBe('Developer regression note — preserved');
  });
  await check('Simultaneous window conflict preserves server work and downloadable draft',async()=>{
   const other=await context.newPage();other.on('pageerror',e=>errors.push(e.message));await other.goto(service.url);
   await page.locator('.profile-trigger').click();await other.locator('.profile-trigger').click();
   await page.getByLabel('Campaign goals').fill('Window A current saved goal');await page.getByRole('button',{name:'Save campaign',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
   await other.getByLabel('Campaign goals').fill('Window B preserved draft');await other.getByRole('button',{name:'Save campaign',exact:true}).click();
   await expect(other.getByRole('region',{name:'Unsaved campaign drafts'})).toBeVisible();await expect(other.getByRole('heading',{name:'Campaign changed in another window'})).toBeVisible();
   expect((await api('status')).profiles.find((p:any)=>p.id===primary.id).goals).toBe('Window A current saved goal');
   const downloaded=other.waitForEvent('download');await other.getByRole('button',{name:'Download draft',exact:true}).click();const download=await downloaded;const draftPath=path.join(evidence,'conflict-draft.json');await download.saveAs(draftPath);expect(JSON.parse(fs.readFileSync(draftPath,'utf8')).goals).toBe('Window B preserved draft');
   await other.screenshot({path:path.join(evidence,'after-03-save-conflict.png'),fullPage:true});
   await other.getByRole('button',{name:'Save draft as new campaign',exact:true}).click();await expect(other.getByRole('region',{name:'Unsaved campaign drafts'})).toHaveCount(0);
   const all=(await api('status')).profiles;expect(all).toHaveLength(2);expect(all.find((p:any)=>p.id!==primary.id).goals).toBe('Window B preserved draft');
   await other.close();
  });
  await check('Save response interrupted after commit is recoverable without overwrite',async()=>{
   await page.reload();await page.locator('.profile-trigger').click();await page.getByLabel('Open a saved campaign').selectOption(primary.id);await expect(page.getByRole('dialog')).toHaveCount(0);
   await page.locator('.profile-trigger').click();await page.getByLabel('Campaign goals').fill('Committed despite interrupted response');
   let intercepted=false;await page.route('**/api/v1/profile',async route=>{if(!intercepted&&route.request().method()==='POST'){intercepted=true;await route.fetch();await route.abort('failed');}else await route.continue();});
   await page.getByRole('button',{name:'Save campaign',exact:true}).click();await expect(page.getByRole('heading',{name:'Campaign save did not finish'})).toBeVisible();
   expect((await api('status')).profiles.find((p:any)=>p.id===primary.id).goals).toBe('Committed despite interrupted response');
   await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('heading',{name:'Campaign changed in another window'})).toBeVisible();
   await page.unroute('**/api/v1/profile');
   await page.getByRole('button',{name:'Discard draft and use saved campaign',exact:true}).click();await expect(page.getByRole('region',{name:'Unsaved campaign drafts'})).toHaveCount(0);
  });
  await check('Production unknown cost/naval/blank/zero states and late-response suppression',async()=>{
   await page.getByRole('button',{name:'Division & production',exact:true}).click();await expect(page.locator('.production-result')).toContainText('618 days');
   await page.screenshot({path:path.join(evidence,'after-04-division-production.png'),fullPage:true});
   const all=await api('equipment');const unknown=all.find((e:any)=>e.id==='railway_gun_equipment');if(!unknown)throw Error('Railway archetype fixture not indexed');
   await page.getByLabel('Production equipment').selectOption(unknown.id);await expect(page.locator('.production-result')).toHaveCount(0);await expect(page.locator('.production-panel')).toContainText(/cost.*unresolved/i);
   await page.screenshot({path:path.join(evidence,'after-05-unknown-cost.png'),fullPage:true});
   await page.getByLabel('Production equipment').selectOption('ship_hull_carrier');await expect(page.locator('.production-result')).toHaveCount(0);await expect(page.locator('.production-panel')).toContainText(/naval.*unsupported/i);
   await page.screenshot({path:path.join(evidence,'after-06-naval-unsupported.png'),fullPage:true});
   await page.getByLabel('Production equipment').selectOption('infantry_equipment_1');await expect(page.locator('.production-result')).toContainText('618 days');
   let release:()=>void=()=>{};const gate=new Promise<void>(r=>release=r);let delayed=false;
   await page.route('**/api/v1/production',async route=>{if(!delayed){delayed=true;await gate;}await route.continue();});
   await page.getByLabel('Equipment needed',{exact:true}).fill('1000');await expect(page.locator('.production-result')).toHaveCount(0);
   await page.getByLabel('Production equipment').selectOption('ship_hull_carrier');release();await expect(page.locator('.production-result')).toHaveCount(0);await page.unroute('**/api/v1/production');
   await page.getByLabel('Production equipment').selectOption('infantry_equipment_1');await page.getByLabel('Military factories',{exact:true}).fill('');await expect(page.locator('.production-result')).toHaveCount(0);await expect(page.getByLabel('Military factories',{exact:true})).toHaveValue('');
   await page.getByLabel('Military factories',{exact:true}).fill('0');await expect(page.locator('.production-panel')).toContainText('No output');
   await page.getByLabel('Available stockpile',{exact:true}).fill('1000');await expect(page.locator('.production-result')).toContainText('0 days');
   await page.getByLabel('Army division count').fill('');await expect(page.getByRole('button',{name:'Save template',exact:true})).toBeDisabled();
  });
  await check('Selected campaign survives source refresh and service restart with changed port',async()=>{
   await page.locator('.profile-trigger').click();await page.getByLabel('Open a saved campaign').selectOption(primary.id);await expect(page.getByRole('dialog')).toHaveCount(0);
   await expect.poll(async()=>(await api('status')).selectedProfileId).toBe(primary.id);
   await page.getByRole('button',{name:'Sources & settings',exact:true}).click();await page.getByRole('button',{name:'Refresh game data',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Index updated'})).toBeVisible({timeout:60000});
   primary=(await api('status')).profiles.find((p:any)=>p.id===primary.id);expect(primary.queue).toContain('GER_oppose_hitler_ww');
   const oldUrl=service.url;await service.close();service=await startServer({dataDir,port:0,staticDir:path.join(repo,'dist')});expect(service.url).not.toBe(oldUrl);
   await page.goto(service.url);await expect(page.locator('.profile-trigger')).toContainText('Developer Germany');expect((await api('status')).selectedProfileId).toBe(primary.id);
   records.push({name:'Restart origins',status:'evidence',before:oldUrl,after:service.url});
  });
  await check('Saved selection deletion uses sensible remaining fallback',async()=>{
   await page.locator('.profile-trigger').click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete campaign',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.profile-trigger')).toContainText('Developer Germany — recovered');
   const status=await api('status');expect(status.profiles).toHaveLength(1);expect(status.selectedProfileId).toBe(status.profiles[0].id);
  });
  if(errors.length)throw Error('Renderer errors: '+errors.join('\n'));
 }catch(error){await page.screenshot({path:path.join(evidence,'developer-ui-failure.png'),fullPage:true});throw error;}finally{
  fs.writeFileSync(path.join(evidence,'developer-ui-results.json'),JSON.stringify({at:new Date().toISOString(),dataDir,records,rendererErrors:errors,independentQA:false},null,2));
  await context.close();await browser.close();await service.close();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
