// Isolated desktop exercise: synthetic campaign data; no game/provider control.
import {_electron,expect} from '@playwright/test';
import assert from 'node:assert/strict';import path from 'node:path';
import {createQaRun,assertOwnedStatus} from './qa/fixture';import {seedLabFixture} from './qa/lab-fixture';

async function main(){
 const exe=process.argv[2]?path.resolve(process.argv[2]):undefined;
 const run=createQaRun('in-game-modes','compiled-runtime');seedLabFixture(run.dataDirectory);
 const env={...process.env,HOI4_DATA_DIR:run.dataDirectory,HOI4_ELECTRON_DATA_DIR:run.renderer};delete env.ELECTRON_RUN_AS_NODE;
 let app:Awaited<ReturnType<typeof _electron.launch>>|undefined,p:import('@playwright/test').Page|undefined;const errors:string[]=[];
 const launch=async()=>{app=await _electron.launch({...(exe?{executablePath:exe,args:[]}:{args:['.']}),cwd:exe?path.dirname(exe):process.cwd(),env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Isolated integration desktop'});p=await app.firstWindow();p.on('pageerror',e=>errors.push(e.message));await expect(p.getByLabel('Integration mode',{exact:true})).toBeVisible();await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible();await app.evaluate(({dialog})=>{dialog.showMessageBox=(async()=>({response:2,checkboxChecked:false})) as any;});};
 const native=async(method:string,value?:unknown)=>p!.evaluate(async({method,value})=>{const api=(window as any).hoi4Integration;return await api[method](value);},{method,value});
 const tool=async(id:string)=>{const mode=await native('getState');if(mode.mode==='workspace')await p!.locator('.sidebar .nav-item').nth(['overview','planner','encyclopedia','discover','lab','manual','settings'].indexOf(id)).click();else await p!.getByLabel('Companion tool',{exact:true}).selectOption(id);};
 const capture=async(name:string)=>p!.screenshot({path:path.join(run.output,name+'.png')});
 try{
  await launch();
  await run.check('isolated desktop and sandboxed preload use a compact default',['MODES-NATIVE'],async()=>{assertOwnedStatus(await p!.evaluate(()=>fetch('/api/v1/status').then(r=>r.json())),run.dataDirectory);assert.equal(await app!.evaluate(({app})=>app.getPath('userData')),run.renderer);assert.equal((await native('getState')).mode,'sidecar');assert.equal(await p!.evaluate(()=>typeof (window as any).require),'undefined');assert.ok(await p!.evaluate(()=>innerWidth)<600);});
  const titles={overview:'Command center',planner:'Campaign planner',encyclopedia:'The encyclopedia',discover:'Campaign ideas',lab:'Division & production',manual:'The field manual',settings:'Sources & settings'};
  for(const mode of ['sidecar','hud','intel'])await run.check(mode+' exposes all seven existing tools within the panel',['MODES-PARITY'],async()=>{
   await native('setMode',mode);await native('setExpanded',true);
   for(const id of Object.keys(titles)){
    await tool(id);await expect(p!.locator('main')).toBeVisible();assert.equal(await p!.getByLabel('Companion tool',{exact:true}).inputValue(),id);
    assert.ok(await p!.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Unexpected horizontal page overflow on '+mode+'/'+id);
    await capture(mode+'-'+id);
   }
  });
  await run.check('dirty template and focus survive mode switches, hide, collapse and reopen',['MODES-DRAFTS'],async()=>{
   await tool('lab');await p!.getByLabel('Template name',{exact:true}).fill('Retained between integration modes');await p!.getByLabel('Count 1',{exact:true}).fill('9');
   for(const mode of ['workspace','hud','intel','sidecar']){await native('setMode',mode);await native('setExpanded',true);await expect(p!.getByLabel('Template name',{exact:true})).toHaveValue('Retained between integration modes');}
   await native('setMode','hud');await p!.getByRole('button',{name:'Open tools',exact:true}).click();await p!.getByRole('button',{name:'Collapse',exact:true}).click();await expect(p!.getByLabel('Template name',{exact:true})).toBeHidden();await capture('hud-collapsed');
   await p!.getByRole('button',{name:'Open tools',exact:true}).click();await expect(p!.getByLabel('Count 1',{exact:true})).toHaveValue('9');
   await native('hide');assert.equal((await native('getState')).visible,false);await app!.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].show());await expect(p!.getByLabel('Template name',{exact:true})).toHaveValue('Retained between integration modes');
   await p!.getByRole('button',{name:'Save template',exact:true}).click();await expect.poll(()=>p!.evaluate(()=>(window as any).__hoi4CloseState.unsavedDrafts)).toBe(0);
  });
  await run.check('collapsed HUD with open modal remains recoverable and Escape keeps companion open',['MODES-MODAL'],async()=>{
   await native('setMode','hud');await native('setExpanded',false);await native('setMode','sidecar');await p!.getByRole('button',{name:/GER · nav-a/}).click();await expect(p!.getByRole('dialog',{name:'Campaign setup',exact:true})).toBeVisible();await native('setMode','hud');
   await p!.getByRole('button',{name:'Open tools',exact:true}).click();await expect(p!.getByRole('dialog',{name:'Campaign setup',exact:true})).toBeVisible();await p!.keyboard.press('Escape');assert.equal((await native('getState')).visible,true);await expect(p!.getByRole('dialog',{name:'Campaign setup',exact:true})).toBeHidden();
  });
  await run.check('browser fallback retains every tool and never advertises native pinning',['MODES-BROWSER'],async()=>{
   const next=app!.waitForEvent('window');const url=p!.url();await app!.evaluate(async({BrowserWindow},url)=>{const preview=new BrowserWindow({show:false,width:440,height:760,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});await preview.loadURL(url);},url);const preview=await next;
   try{await expect(preview.getByLabel('Integration mode',{exact:true})).toBeVisible();assert.equal(await preview.evaluate(()=>typeof window.hoi4Integration),'undefined');await expect(preview.getByText('Layout preview · desktop app enables pinning and global shortcuts',{exact:true})).toBeVisible();await expect(preview.getByRole('button',{name:'Keep companion above the game',exact:true})).toHaveCount(0);
    for(const id of Object.keys(titles)){await preview.getByLabel('Companion tool',{exact:true}).selectOption(id);await expect(preview.locator('main')).toBeVisible();assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
    await preview.getByLabel('Integration mode',{exact:true}).selectOption('hud');await preview.getByRole('button',{name:'Open tools',exact:true}).click();await expect(preview.getByLabel('Companion tool',{exact:true})).toBeVisible();await preview.getByLabel('Integration mode',{exact:true}).selectOption('intel');await preview.getByRole('button',{name:'Back to game',exact:true}).click();await preview.getByRole('button',{name:'Open tools',exact:true}).click();await expect(preview.getByLabel('Companion tool',{exact:true})).toBeVisible();
   }finally{await preview.close();}
  });
  await run.check('pin and mode persist through full app/service restart; saved template survives',['MODES-PERSIST'],async()=>{
   await native('setMode','intel');await native('setPinned',false);const origin=new URL(p!.url()).origin;await app!.close();app=undefined;assert.equal(await fetch(origin+'/api/v1/status').then(()=>true,()=>false),false);
   // Restart waits for saved mode instead of asserting the first-launch default.
   app=await _electron.launch({...(exe?{executablePath:exe,args:[]}:{args:['.']}),cwd:exe?path.dirname(exe):process.cwd(),env,timeout:60000});run.ownedProcesses.push({pid:app.process().pid!,kind:'Restarted isolated desktop'});p=await app.firstWindow();p.on('pageerror',e=>errors.push(e.message));await expect(p.getByLabel('Integration mode',{exact:true})).toHaveValue('intel');assert.equal((await native('getState')).pinned,false);await tool('lab');await expect(p.locator('.saved-template').filter({hasText:'Retained between integration modes'})).toBeVisible();await capture('restart-intel');
  });
  assert.deepEqual(errors,[]);
 }catch(error){await capture('failure').catch(()=>{});throw error;}
 finally{await app?.close();run.finish({rendererErrors:errors,realProviderCalled:false,nativeGameLaunched:false,gameControlsDispatched:false,executable:exe||'local Electron with isolated renderer profile'});run.cleanup();console.log(run.output);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
