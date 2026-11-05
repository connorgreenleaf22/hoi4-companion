import {chromium,expect,type Browser} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startServer} from '../server/api';
import type {Entry} from '../src/types';

async function main(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-year-ui-r3-')),output=path.resolve('artifacts/year-fix-r3/ui');fs.mkdirSync(output,{recursive:true});
  let service:Awaited<ReturnType<typeof startServer>>|undefined,browser:Browser|undefined;const results:any[]=[],errors:string[]=[];
  const check=async(name:string,run:()=>Promise<void>)=>{try{await run();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});throw e;}};
  try{
    service=await startServer({dataDir:directory,port:0,autoIndex:false,staticDir:path.resolve('dist')});const store=service.store;
    const add=(kind:string,id:string,title:string,data:Entry['data']={})=>{const e:Entry={kind,id,title,data,uid:`${kind}:fixture:${id}`,description:'',source:'fixture',line:1,hash:'fixture',version:'fixture'};store.insert(e);return e;};
    add('country','GER','Germany',{tag:'GER'});add('country','FRA','France',{tag:'FRA'});
    const items=[
      add('equipment','infantry_equipment_1','Infantry Equipment I',{year:'1936',stats:{year:1936},countries:['GER']}),
      add('equipment','infantry_numeric','Infantry numeric year',{year:1936,countries:['GER']}),
      add('equipment','infantry_decimal','Infantry decimal year',{year:'1936.0',countries:['GER']}),
      add('equipment','infantry_1935','Infantry 1935',{year:'1935',countries:['GER']}),
      add('equipment','infantry_1937','Infantry 1937',{year:1937,countries:['GER']}),
      add('equipment','infantry_missing','Infantry missing year',{countries:['GER']}),
      add('equipment','infantry_foreign','Infantry foreign',{year:1936,countries:['FRA']})
    ];
    add('technology','infantry_technology','Infantry technology',{year:1936,countries:['GER']});
    store.setSetting('meta',{version:'fixture',root:'fixture',indexRevision:'year-r3',indexedAt:new Date().toISOString(),counts:{equipment:7,technology:1,country:2},files:1,warnings:[],dlcs:[],mods:[],defines:{}});
    store.saveProfile({id:'year-fixture',name:'Year filter fixture',country:'GER',historical:true,startDate:'1936-01-01',goals:'',tree:'',queue:[],completed:[],bookmarks:items.map(e=>e.entityKey!),notes:{},dlcs:[],dlcConfirmed:false});
    const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright'),cached=fs.readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).sort().at(-1)!;
    browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||path.join(cache,cached,'chrome-win64','chrome.exe')});const page=await browser.newPage({viewport:{width:1500,height:960}});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(service.url);await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();const query=page.getByLabel('Filter reference entries'),year=page.getByLabel('Reference year'),cards=page.locator('.reference-card');
    await check('YEAR-01 regular text/category/year query retains text and numeric 1936 equipment, boundaries and unknowns',async()=>{
      await query.fill('infantry');await page.getByLabel('Entry category').selectOption('equipment');await year.fill('1936');await expect(cards).toHaveCount(4);await expect(cards.filter({hasText:'Infantry Equipment I'})).toHaveCount(1);await expect(cards.filter({hasText:'Infantry missing year'})).toHaveCount(0);
      await page.getByLabel('Reference country').selectOption('GER');await expect(cards).toHaveCount(3);await page.screenshot({path:path.join(output,'combined-year-1936.png')});
      await year.fill('1935');await expect(cards).toHaveCount(1);await expect(cards).toContainText('Infantry 1935');await year.fill('1937');await expect(cards).toHaveCount(1);await expect(cards).toContainText('Infantry 1937');
      await year.fill('');await expect(cards).toHaveCount(6);await expect(cards.filter({hasText:'Infantry missing year'})).toHaveCount(1);
      await year.fill('1936');await query.fill('infantry_equipment_1');await expect(cards).toHaveCount(1);await expect(cards).toContainText('Infantry Equipment I');await cards.click();await expect(page.locator('.entry-drawer')).toContainText('infantry_equipment_1');await page.getByRole('button',{name:'Close reference',exact:true}).click();
    });
    await check('bookmarks apply the same normalized year and retain missing-year records only when year is cleared',async()=>{
      await query.fill('infantry');await page.getByRole('button',{name:'Bookmarks',exact:true}).click();await year.fill('1935');await expect(cards).toHaveCount(1);await expect(cards).toContainText('Infantry 1935');
      await year.fill('1936');await expect(cards).toHaveCount(3);await expect(cards.filter({hasText:'Infantry decimal year'})).toHaveCount(1);await page.screenshot({path:path.join(output,'bookmarked-year-1936.png')});
      await year.fill('');await expect(cards).toHaveCount(6);await expect(cards.filter({hasText:'Infantry missing year'})).toHaveCount(1);
    });
    assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();if(service)await service.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),results,errors,independentAcceptance:false,nativePortableUI:false},null,2));assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
