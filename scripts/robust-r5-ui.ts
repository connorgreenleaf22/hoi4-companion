import {chromium,expect,type Browser} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startServer} from '../server/api';
import type {Entry} from '../src/types';

// A disposable corrupt-cache reproduction, not a supported importer or engine claim.
async function main(){
  const mode=process.argv.includes('--before')?'before':'after';
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-robust-r5-')),output=path.resolve(`artifacts/robust-r5/${mode}`);fs.mkdirSync(output,{recursive:true});
  let service:Awaited<ReturnType<typeof startServer>>|undefined,browser:Browser|undefined;const results:any[]=[],errors:string[]=[];
  const check=async(name:string,run:()=>Promise<void>)=>{try{await run();results.push({name,passed:true});console.log('PASS '+name);}catch(e){results.push({name,passed:false,error:String(e)});throw e;}};
  try{
    service=await startServer({dataDir:directory,port:0,autoIndex:false,staticDir:path.resolve('dist')});const store=service.store;
    const add=(kind:string,id:string,title:string,data:Entry['data']={})=>{const e:Entry={kind,id,title,data,uid:`${kind}:robust-r5:${id}`,description:'Synthetic developer fixture; not installed game content.',source:'qa-fixtures/robust-r5.txt',line:1,hash:'synthetic-developer-r5',version:'QA-SYNTHETIC'};store.insert(e);return e;};
    const fixtures:{id:string;title:string;data:Entry['data'];label:string}[]=[
      {id:'qa_r4_base_object',title:'Synthetic object year',data:{year:{year:1936}},label:'Unknown year'},
      {id:'resolved_object',title:'Synthetic resolved object',data:{year:1936,stats:{year:{year:1937},build_cost_ic:.5}},label:'Unknown year'},
      {id:'array',title:'Synthetic array year',data:{year:[1936]},label:'Unknown year'},
      {id:'resolved_array',title:'Synthetic resolved array',data:{year:1936,stats:{year:[1937]}},label:'Unknown year'},
      {id:'true',title:'Synthetic true year',data:{year:true},label:'Unknown year'},
      {id:'resolved_false',title:'Synthetic resolved false',data:{year:1936,stats:{year:false}},label:'Unknown year'},
      {id:'null',title:'Synthetic null year',data:{year:null},label:'Unknown year'},
      {id:'missing',title:'Synthetic missing year',data:{},label:'Unknown year'},
      {id:'unknown',title:'Synthetic unknown text',data:{year:'unknown'},label:'Unknown year'},
      {id:'suffix',title:'Synthetic malformed year',data:{year:'1936x'},label:'Unknown year'},
      {id:'fraction',title:'Synthetic fractional year',data:{year:1936.5},label:'Unknown year'},
      {id:'nested_text',title:'Synthetic nested text',data:{year:'"1936"'},label:'Unknown year'},
      {id:'infantry_equipment_1',title:'Infantry equipment I',data:{year:'1936',stats:{year:1936,build_cost_ic:.5}},label:'1936'},
      {id:'infantry_equipment_2',title:'Infantry equipment II',data:{year:1939,stats:{build_cost_ic:.6}},label:'1939'},
      {id:'unicode',title:'Synthetic NBSP BOM year',data:{year:'\u00a01936\ufeff'},label:'1936'},
      {id:'resolved_priority',title:'Synthetic resolved priority',data:{year:1935,stats:{year:1938}},label:'1938'},
      {id:'resolved_null',title:'Synthetic resolved null',data:{year:1936,stats:{year:null}},label:'1936'},
      {id:'zero',title:'Synthetic zero year',data:{year:0},label:'0'},
    ];
    fixtures.forEach(f=>add('equipment',f.id,f.title,f.data));add('country','GER','Germany',{tag:'GER'});add('unit','infantry','Infantry',{stats:{combat_width:2,max_organisation:60,manpower:1000},need:{infantry_equipment:100}});
    store.setSetting('meta',{version:'QA-SYNTHETIC',root:'fixture',indexRevision:'robust-r5',indexedAt:new Date().toISOString(),counts:{equipment:fixtures.length,country:1,unit:1},files:1,warnings:[],dlcs:[],mods:[],defines:{BASE_FACTORY_SPEED_MIL:3.5}});
    store.saveProfile({id:'robust-fixture',name:'Robustness fixture',country:'GER',historical:true,startDate:'1936-01-01',goals:'Retain this campaign',tree:'',queue:[],completed:[],bookmarks:['vanilla:equipment::qa_r4_base_object'],notes:{qa_r4_base_object:'Retain the original metadata'},dlcs:[],dlcConfirmed:false});
    const snapshot=()=>({entries:store.db.prepare('SELECT uid,payload FROM entries ORDER BY uid').all(),profiles:store.db.prepare('SELECT * FROM profiles ORDER BY id').all(),selection:store.selectedProfileId()});const initial=snapshot();
    const cache=path.join(process.env.LOCALAPPDATA||'','ms-playwright'),cached=fs.readdirSync(cache).filter(n=>/^chromium-\d+$/.test(n)).sort().at(-1)!;
    browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||path.join(cache,cached,'chrome-win64','chrome.exe')});const page=await browser.newPage({viewport:{width:1500,height:960}});page.on('pageerror',e=>errors.push(e.message));await page.goto(service.url);await page.getByRole('button',{name:'Division & production',exact:true}).click();
    if(mode==='before'){
      await check('R4 corrupt object-year option reproduces React error 31 and blank renderer',async()=>{await expect.poll(()=>errors.join('\n')).toMatch(/(?:#31|Objects are not valid as a React child)/);await expect(page.locator('#root')).toBeEmpty();await page.screenshot({path:path.join(output,'blank-renderer.png')});});
    }else{
      const labels=['Production equipment','First comparison equipment','Second comparison equipment'];
      await check('ROBUST-01 all three equipment selectors render 18 metadata shapes with unknown labels for invalid years',async()=>{
        for(const label of labels){const select=page.getByLabel(label);await expect(select).toBeEnabled();await expect(select.locator('option')).toHaveCount(fixtures.length);for(const f of fixtures)await expect(select.locator(`option[value="${f.id}"]`)).toHaveText(`${f.title} (${f.label})`);}
        await expect(page.locator('.production-result')).toContainText('618 days');
      });
      await check('Corrupt selections remain usable, supported estimates recover and navigation/reload preserve raw records and campaign',async()=>{
        for(const label of labels)await page.getByLabel(label).selectOption('qa_r4_base_object');await expect(page.locator('.production-result')).toHaveCount(0);await expect(page.locator('.production-status')).toContainText('Equipment IC cost is unresolved');await page.screenshot({path:path.join(output,'unknown-year.png'),fullPage:true});
        await page.getByLabel('Production equipment').selectOption('infantry_equipment_1');await expect(page.locator('.production-result')).toContainText('618 days');
        await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();await page.getByLabel('Filter reference entries').fill('qa_r4_base_object');await expect(page.locator('.reference-card')).toHaveCount(1);await page.locator('.reference-card').click();await expect(page.locator('.entry-drawer')).toContainText('Synthetic object year');await page.getByRole('button',{name:'Close reference',exact:true}).click();
        await page.getByRole('button',{name:'Command center',exact:true}).click();await expect(page.getByRole('button',{name:'Division & production',exact:true})).toBeVisible();await page.reload();await page.getByRole('button',{name:'Division & production',exact:true}).click();await expect(page.getByLabel('Production equipment')).toBeEnabled();await expect(page.getByLabel('Production equipment').locator('option[value="qa_r4_base_object"]')).toHaveText('Synthetic object year (Unknown year)');await expect(page.locator('.production-result')).toContainText('618 days');assert.deepEqual(errors,[]);
      });
    }
    assert.deepEqual(snapshot(),initial);results.push({name:'Raw entry payloads, campaign fields/revision and selection remain exact',passed:true});
  }finally{
    if(browser)await browser.close();if(service)await service.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),mode,results,errors,fixtureShapes:18,independentAcceptance:false,nativePortableUI:false,supportedImporterClaim:false},null,2));assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(directory,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
