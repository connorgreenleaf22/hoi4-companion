import {expect,type Page} from '@playwright/test';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import type {createQaRun} from './fixture';
export async function exerciseLabDrafts(p:Page,run:ReturnType<typeof createQaRun>,browserReload:boolean){
 const nav=async(name:string)=>{await p.getByRole('button',{name,exact:true}).click();};
 const lab=()=>nav('Division & production');
 const status=()=>p.evaluate(()=>fetch('/api/v1/status').then(r=>r.json()));
 const closeState=()=>p.evaluate(()=>(window as any).__hoi4CloseState);
 const switchCampaign=async(id:string)=>{await p.locator('.profile-trigger').click();await p.getByLabel('Open a saved campaign').selectOption(id);await expect(p.getByRole('dialog',{name:'Campaign setup'})).toHaveCount(0);};
 const confirm=async(accept:boolean,act:()=>Promise<unknown>)=>{const next=p.waitForEvent('dialog'),action=act();const dialog=await next;assert.equal(dialog.type(),'confirm');if(accept)await dialog.accept();else await dialog.dismiss();await action;};
 const initial=(await status()).profiles;
 await run.check('dirty template survives tools and separate campaign drafts without saved-data writes',['NAV-01'],async()=>{
  await lab();await p.getByLabel('Template name',{exact:true}).fill('A unsaved');await p.getByLabel('Count 1',{exact:true}).fill('7');await p.getByLabel('Army division count').fill('30');await p.getByRole('button',{name:'Add unit type',exact:true}).click();
  await nav('Command center');await lab();await expect(p.getByLabel('Template name',{exact:true})).toHaveValue('A unsaved');await expect(p.getByLabel('Count 1',{exact:true})).toHaveValue('7');await expect(p.getByLabel('Count 2',{exact:true})).toHaveValue('1');
  await switchCampaign('nav-b');await p.getByLabel('Template name',{exact:true}).fill('B unsaved');await switchCampaign('nav-a');await expect(p.getByLabel('Template name',{exact:true})).toHaveValue('A unsaved');await expect(p.getByLabel('Army division count')).toHaveValue('30');
  assert.equal((await closeState()).unsavedDrafts,2);assert.deepEqual((await status()).profiles,initial);
 });
 if(browserReload)await run.check('actual browser reload Stay cancels unloading and retains unsaved template',['NAV-01-RELOAD'],async()=>{
  const next=p.waitForEvent('dialog');const reload=p.reload().catch(()=>{});const dialog=await next;assert.equal(dialog.type(),'beforeunload');await dialog.dismiss();await reload;await expect(p.getByLabel('Template name',{exact:true})).toHaveValue('A unsaved');assert.deepEqual((await status()).profiles,initial);
 });
 await run.check('global review downloads exact draft; discard Cancel stays, explicit discard targets one campaign',['NAV-01-DISCARD'],async()=>{
  await nav('Command center');await p.getByRole('button',{name:'Review unsaved drafts',exact:true}).click();const modal=p.getByRole('dialog',{name:'Unsaved campaign drafts',exact:true});
  const a=modal.locator('article').filter({has:p.getByRole('heading',{name:'A unsaved',exact:true})});const wait=p.waitForEvent('download');await a.getByRole('button',{name:'Download template draft',exact:true}).click();const file=path.join(run.output,'synthetic-template-draft.json');await (await wait).saveAs(file);const value=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(value.profileId,'nav-a');assert.equal(value.rows[0].count,7);assert.equal(value.divisions,'30');
  const b=modal.locator('article').filter({has:p.getByRole('heading',{name:'B unsaved',exact:true})});await confirm(false,()=>b.getByRole('button',{name:'Discard template draft',exact:true}).click());await expect(b).toBeVisible();await confirm(true,()=>b.getByRole('button',{name:'Discard template draft',exact:true}).click());await expect(modal.locator('article')).toHaveCount(1);
  await a.getByRole('button',{name:'Review template',exact:true}).click();await expect(p.getByLabel('Template name',{exact:true})).toHaveValue('A unsaved');assert.deepEqual((await status()).profiles,initial);
 });
 await run.check('Save persists template through existing API and keeps all legacy campaign fields/templates',['NAV-01-SAVE'],async()=>{
  await expect(p.getByRole('button',{name:'Save template',exact:true})).toBeEnabled();await p.getByRole('button',{name:'Save template',exact:true}).click();await expect.poll(async()=>(await closeState()).unsavedDrafts).toBe(0);
  const current=(await status()).profiles.find((x:any)=>x.id==='nav-a');const old=initial.find((x:any)=>x.id==='nav-a');assert.deepEqual(current.templates[0],old.templates[0]);for(const key of ['goals','notes','bookmarks','queue','completed'])assert.deepEqual(current[key],old[key]);assert.equal(current.templates[1].name,'A unsaved');assert.equal(current.templates[1].rows[0].count,7);
 });
 await run.check('same-name replacement Cancel keeps saved data and edited draft intact',['NAV-01-SAVE'],async()=>{
  await p.getByLabel('Count 1',{exact:true}).fill('6');const before=(await status()).profiles;await confirm(false,()=>p.getByRole('button',{name:'Save template',exact:true}).click());assert.deepEqual((await status()).profiles,before);await expect(p.getByLabel('Count 1',{exact:true})).toHaveValue('6');assert.equal((await closeState()).unsavedDrafts,1);
 });
 await run.check('confirmed replacement pending Save remains protected outside the Lab until actual response',['NAV-01-PENDING'],async()=>{
  let release!:()=>void,ready!:()=>void;const hold=new Promise<void>(r=>{release=r;}),committed=new Promise<void>(r=>{ready=r;});
  await p.route('**/api/v1/profile',async route=>{const response=await route.fetch();ready();await hold;await route.fulfill({response});});
  await confirm(true,()=>p.getByRole('button',{name:'Save template',exact:true}).click());await committed;
  try{assert.ok((await closeState()).pendingWrites>0);await nav('Command center');await lab();await expect(p.getByLabel('Template name',{exact:true})).toBeDisabled();await expect(p.getByRole('button',{name:'Discard template draft',exact:true})).toBeDisabled();}finally{release();}
  await expect.poll(async()=>(await closeState()).pendingWrites).toBe(0);await p.unroute('**/api/v1/profile');await expect.poll(async()=>(await closeState()).unsavedDrafts).toBe(0);
 });
 await run.check('failed Save preserves editable template and recovery without changing saved templates',['NAV-01-FAILURE'],async()=>{
  await p.getByLabel('Template name',{exact:true}).fill('Retained after failure');const before=(await status()).profiles;
  await p.route('**/api/v1/profile',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Injected fixture save failure'})}));await p.getByRole('button',{name:'Save template',exact:true}).click();await expect(p.getByRole('region',{name:'Unsaved campaign drafts',exact:true})).toBeVisible();await nav('Command center');await lab();await expect(p.getByLabel('Template name',{exact:true})).toHaveValue('Retained after failure');assert.deepEqual((await status()).profiles,before);await p.unroute('**/api/v1/profile');
  await p.getByRole('button',{name:'Discard draft and use saved campaign',exact:true}).click();
 });
 await run.check('loading a saved template requires explicit discard; Cancel leaves edits intact',['NAV-01-LOAD'],async()=>{
  const load=p.locator('.saved-template').filter({hasText:'Legacy saved'}).getByRole('button',{name:'Load',exact:true});
  await confirm(false,()=>load.click());await expect(p.getByLabel('Template name',{exact:true})).toHaveValue('Retained after failure');await confirm(true,()=>load.click());await expect(p.getByLabel('Template name',{exact:true})).toHaveValue('Legacy saved');await expect(p.getByLabel('Count 1',{exact:true})).toHaveValue('8');await expect.poll(async()=>(await closeState()).unsavedDrafts).toBe(0);
 });
 if(browserReload)await run.check('explicit browser Leave discards only unsaved editor state; saved template survives reload',['NAV-01-RELOAD'],async()=>{
  await p.getByLabel('Template name',{exact:true}).fill('Explicitly discarded on reload');const next=p.waitForEvent('dialog'),reload=p.reload();await (await next).accept();await reload;await lab();await expect(p.getByLabel('Template name',{exact:true})).toHaveValue('Infantry division');await expect(p.locator('.saved-template').filter({hasText:'A unsaved'})).toBeVisible();assert.equal((await status()).profiles.find((x:any)=>x.id==='nav-a').templates.find((t:any)=>t.name==='A unsaved').rows[0].count,6);
 });
 await p.screenshot({path:path.join(run.output,'lab-draft-final.png'),fullPage:true});
 return {initialProfiles:initial};
}
