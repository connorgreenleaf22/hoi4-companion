import {chromium,expect,type Browser} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startServer} from '../server/api';
import type {Entry} from '../src/types';

async function main(){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-unicode-ui-r4-')),output=path.resolve('artifacts/unicode-year-r4/ui');fs.mkdirSync(output,{recursive:true});
  let service:Awaited<ReturnType<typeof startServer>>|undefined,browser:Browser|undefined;const results:any[]=[],errors:string[]=[];
  const check=async(name:string,run:()=>Promise<void>)=>{try{await run();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});throw e;}};
  try{
    service=await startServer({dataDir:directory,port:0,autoIndex:false,staticDir:path.resolve('dist')});const store=service.store;
    const add=(kind:string,id:string,title:string,data:Entry['data']={})=>{const e:Entry={kind,id,title,data,uid:`${kind}:fixture:${id}`,description:'',source:'fixture',line:1,hash:'fixture',version:'fixture'};store.insert(e);return e;};
    add('country','GER','Germany',{tag:'GER'});add('country','FRA','France',{tag:'FRA'});
    const items=[add('equipment','infantry_nbsp','Infantry NBSP year',{year:'\u00a01936\u00a0',countries:['GER']}),add('equipment','infantry_bom','Infantry BOM year',{year:'\ufeff1936\ufeff',countries:['GER']}),add('equipment','infantry_fallback','Infantry fallback year',{stats:{start_year:'\ufeff1936\u00a0'},countries:['GER']}),add('equipment','infantry_interior','Infantry invalid interior year',{year:'19\u00a036',countries:['GER']}),add('equipment','infantry_missing','Infantry missing year',{countries:['GER']}),add('equipment','infantry_past','Infantry 1935 year',{year:'\u00a01935\ufeff',countries:['GER']}),add('equipment','infantry_foreign','Infantry foreign year',{year:1936,countries:['FRA']})];
    add('technology','infantry_tech','Infantry technology',{year:'\ufeff1936\ufeff',countries:['GER']});store.setSetting('meta',{version:'fixture',root:'fixture',indexRevision:'unicode-r4',indexedAt:new Date().toISOString(),counts:{equipment:7,technology:1,country:2},files:1,warnings:[],dlcs:[],mods:[],defines:{}});
    store.saveProfile({id:'unicode-fixture',name:'Unicode year fixture',country:'GER',historical:true,startDate:'1936-01-01',goals:'',tree:'',queue:[],completed:[],bookmarks:items.map(e=>e.entityKey!),notes:{},dlcs:[],dlcConfirmed:false});
    const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright'),cached=fs.readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).sort().at(-1)!;
    browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||path.join(cache,cached,'chrome-win64','chrome.exe')});const page=await browser.newPage({viewport:{width:1500,height:960}});page.on('pageerror',e=>errors.push(e.message));await page.goto(service.url);await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();
    const query=page.getByLabel('Filter reference entries'),year=page.getByLabel('Reference year'),cards=page.locator('.reference-card');
    await check('YEAR-02 regular search accepts NBSP/BOM edge years with combined filters and rejects interior separators',async()=>{
      await query.fill('infantry');await page.getByLabel('Entry category').selectOption('equipment');await year.fill('1936');await expect(cards).toHaveCount(4);await expect(cards.filter({hasText:'Infantry NBSP year'})).toHaveCount(1);await expect(cards.filter({hasText:'Infantry BOM year'})).toHaveCount(1);
      await page.getByLabel('Reference country').selectOption('GER');await expect(cards).toHaveCount(3);await expect(cards.filter({hasText:'Infantry invalid interior year'})).toHaveCount(0);await page.screenshot({path:path.join(output,'regular-unicode-year.png')});
      await year.fill('1935');await expect(cards).toHaveCount(1);await expect(cards).toContainText('Infantry 1935 year');await year.fill('');await expect(cards).toHaveCount(6);
    });
    await check('YEAR-02 bookmark year policy agrees with regular search while retaining missing/invalid records unfiltered',async()=>{
      await page.getByRole('button',{name:'Bookmarks',exact:true}).click();await year.fill('1935');await expect(cards).toHaveCount(1);await expect(cards).toContainText('Infantry 1935 year');await year.fill('1936');await expect(cards).toHaveCount(3);await expect(cards.filter({hasText:'Infantry NBSP year'})).toHaveCount(1);await expect(cards.filter({hasText:'Infantry BOM year'})).toHaveCount(1);await page.screenshot({path:path.join(output,'bookmarked-unicode-year.png')});
      await year.fill('1937');await expect(cards).toHaveCount(0);await year.fill('');await expect(cards).toHaveCount(6);await expect(cards.filter({hasText:'Infantry missing year'})).toHaveCount(1);await expect(cards.filter({hasText:'Infantry invalid interior year'})).toHaveCount(1);
    });assert.deepEqual(errors,[]);
  }finally{if(browser)await browser.close();if(service)await service.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),results,errors,independentAcceptance:false,nativePortableUI:false},null,2));assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
