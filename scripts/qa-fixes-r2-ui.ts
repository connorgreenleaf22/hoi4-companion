import {chromium,expect,type Browser} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startServer} from '../server/api';
import type {Entry} from '../src/types';

async function main(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-r2-ui-'));const output=path.resolve('artifacts/qa-fix-r2/ui');fs.mkdirSync(output,{recursive:true});
  let service:Awaited<ReturnType<typeof startServer>>|undefined,browser:Browser|undefined;const results:any[]=[],errors:string[]=[];
  const check=async(name:string,run:()=>Promise<void>)=>{try{await run();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});throw e;}};
  try{
    service=await startServer({dataDir:directory,port:0,autoIndex:false,staticDir:path.resolve('dist')});const store=service.store;
    const add=(kind:string,id:string,title:string,data:Entry['data']={})=>{const e:Entry={kind,id,uid:`${kind}:fixture:${id}`,title,data,description:'',source:'fixture',line:1,version:'fixture',hash:'fixture'};store.insert(e);return e;};
    add('country','GER','Germany',{tag:'GER'});
    const event=add('event','denmark_occupation_event.1','Someone attacked us'),next=add('event','denmark_occupation_event.2','Follow-up event');
    add('idea','professional_officer_corps_spirit','Professional Officer Corps',{modifiers:{experience_gain_army_unit_factor:.15,max_command_power:30},ideaCategory:{id:'academy_spirit',type:'army_spirit',declaredBaseCost:20,source:'fixture',line:1,hash:'fixture'}});
    add('module','heavy_mg_4x','4x Heavy Machine Gun',{stats:{reliability:-.025,weight:.000015},addStats:{reliability:-.025,air_attack:18},multiplyStats:{reliability:-.015},unknowns:['Final designer stacking remains unverified.']});
    add('equipment','infantry_equipment_1','Infantry equipment I',{type:'infantry',stats:{build_cost_ic:.5}});add('equipment','convoy','Convoy',{type:'convoy',year:1910,stats:{build_cost_ic:70}});add('unit','infantry','Infantry',{stats:{combat_width:2,max_organisation:60,manpower:1000},need:{infantry_equipment:100}});
    store.setSetting('meta',{root:'fixture',version:'fixture',indexRevision:'r2-fixture',indexedAt:new Date().toISOString(),files:1,counts:{event:2,idea:1,module:1,country:1,equipment:2,unit:1},warnings:[],dlcs:[],mods:[],defines:{BASE_FACTORY_SPEED_MIL:3.5}});
    store.replaceRelationships([{id:'event-next',from:event.uid,fromKey:event.entityKey!,type:'triggers-event',targetRef:{id:next.id,kind:'event'},resolution:'unresolved',candidates:[],condition:[],scope:['option[1]','FROM[1]'],details:[{key:'hours',value:'6',line:1}],evidence:event.evidence![0]}]);
    const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright');const cached=fs.readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).sort().at(-1)!;
    browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||path.join(cache,cached,'chrome-win64','chrome.exe')});
    const page=await browser.newPage({viewport:{width:1500,height:960}});page.on('pageerror',e=>errors.push(e.message));await page.goto(service.url);await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();const query=page.getByLabel('Filter reference entries');
    await check('SEARCH-01 event question and short cost query find entries and exact declared connections',async()=>{
      await query.fill('What happens after Denmark occupation event 1?');await expect(page.locator('.reference-card')).toHaveCount(1);await page.locator('.reference-card').click();await expect(page.locator('.relationship-row')).toHaveCount(1);await expect(page.locator('.relationship-row')).toContainText('Follow-up event');await page.screenshot({path:path.join(output,'event-question.png')});await page.getByRole('button',{name:'Close reference',exact:true}).click();
      await query.fill('professional officer corps cost');await expect(page.locator('.reference-card')).toHaveCount(1);await expect(page.locator('.reference-card')).toContainText('Professional Officer Corps');await page.locator('.reference-card').click();await expect(page.locator('.entry-drawer').getByRole('heading',{name:'Professional Officer Corps',exact:true})).toBeVisible();await expect(page.locator('.entry-drawer')).toContainText('Declared category base cost');await page.screenshot({path:path.join(output,'spirit-cost-question.png')});await page.getByRole('button',{name:'Close reference',exact:true}).click();
    });
    await check('PRECISION-01 added, multiplied and base source values retain exact coefficients',async()=>{
      await query.fill('heavy_mg_4x');await expect(page.locator('.reference-card')).toHaveCount(1);await expect(page.locator('.reference-card')).toContainText('4x Heavy Machine Gun');await page.locator('.reference-card').click();
      const section=(name:string)=>page.getByRole('heading',{name,exact:true}).locator('..');
      await expect(section('Declared added values').locator('.data-table>div').filter({hasText:'reliability'}).locator('strong')).toHaveText('-0.025');
      await expect(section('Declared multipliers').locator('.data-table>div').filter({hasText:'reliability'}).locator('strong')).toHaveText('-0.015');
      await expect(section('Scripted values').locator('.data-table>div').filter({hasText:'weight'}).locator('strong')).toHaveText('0.000015');
      await page.screenshot({path:path.join(output,'exact-source-coefficients.png'),fullPage:true});await page.getByRole('button',{name:'Close reference',exact:true}).click();
    });
    await check('COPY-01 naval state uses version-neutral copy and has no military estimate',async()=>{
      await page.getByRole('button',{name:'Division & production',exact:true}).click();await page.getByLabel('Production equipment').selectOption('convoy');await expect(page.locator('.production-panel')).toContainText('Naval production is unsupported. Ships and convoys use dockyards');await expect(page.locator('.production-panel')).not.toContainText('v0.1.1');await expect(page.locator('.production-result')).toHaveCount(0);await page.screenshot({path:path.join(output,'naval-copy.png')});
    });
    assert.deepEqual(errors,[]);
  }finally{
    if(browser)await browser.close();if(service)await service.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),results,errors,nativePortableUI:false,independentAcceptance:false},null,2));
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
