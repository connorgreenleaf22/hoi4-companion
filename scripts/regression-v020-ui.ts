import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {startServer} from '../server/api';
import type {Entry,Meta,Profile,Relationship,Coverage} from '../src/types';
import {SCHEMA_VERSION} from '../server/migrations';
import {createQaRun,assertOwnedStatus,browserOptions} from './qa/fixture';

// Developer integration checks only; these do not substitute for independent packaged QA.
const run=createQaRun('reference-ui','headless-renderer',process.env.HOI4_UI_EVIDENCE);
const output=run.output,directory=run.dataDirectory,results=run.results;const errors:string[]=[];
const check=(name:string,fn:()=>Promise<void>,requirements:string[]=[])=>run.check(name,requirements,fn);
const appVersion=JSON.parse(fs.readFileSync('package.json','utf8')).version;
let ownedService:Awaited<ReturnType<typeof startServer>>|undefined;
let ownedBrowser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
async function main(){
 let service=await startServer({dataDir:directory,port:0,autoIndex:false,staticDir:path.resolve('dist')});
 ownedService=service;
 run.write('preflight.json',assertOwnedStatus(await fetch(service.url+'/api/v1/status').then(r=>r.json()),directory));
 const store=service.store;const entries:Entry[]=[];
 const entry=(kind:string,id:string,title:string,data:Record<string,any>={},source=`fixture/${kind}.txt`)=>{const value:Entry={uid:`${kind}:${source}:${id}`,id,kind,title,description:`Fixture description for ${title}`,source,line:1,version:'fixture-1.19.4.1',hash:'f'.repeat(64),data:{...data,script:'fixture = { declaration = yes }'}};store.insert(value);entries.push(value);return value;};
 const old=entry('module','tank_medium_cannon','Medium cannon',{aliases:['medium cannon'],constraints:[{key:'count',op:'<',value:'2',line:8}]},'fixture/old-modules.txt');
 store.removeSource(old.source);
 const module=entry('module','tank_medium_cannon','Medium cannon',{aliases:['medium cannon'],constraints:[{key:'count',op:'<',value:'2',line:8}],addStats:{soft_attack:20,reliability:-0.025,production_cost:-0.015,zero:0,tiny:0.000015},multiplyStats:{reliability:-0.015,zero:0,tiny:0.0000001},missionStats:[{key:'mission_type_stats',value:[{key:'limit',value:[{key:'attack_logistics',value:'yes',line:12}],line:11},{key:'add_stats',value:[{key:'air_ground_attack',value:'1',line:15}],line:14}],line:10}]},'fixture/moved-modules.txt');
 const eventStart=entry('event','denmark_occupation_event.1','Occupation opening',{countries:['DEN']});
 const eventNext=entry('event','denmark_occupation_event.2','Occupation follow-up',{countries:['DEN']});
 entry('event','denmark_occupation_event.10','Different occupation event',{countries:['DEN']});
 entry('idea','professional_officer_corps_spirit','Professional Officer Corps',{countries:['GER'],ideaCategory:{id:'army_spirit',type:'army',declaredBaseCost:20,source:'fixture/idea.txt',line:1,hash:'f'.repeat(64)}});
 entry('country','GER','Germany',{tag:'GER',countries:['GER']});
 const tree=entry('focus_tree','test_tree','Fixture focus tree',{countries:['GER'],focusIds:['START'],sharedIds:[],countryScript:'tag = GER'});
 entry('focus','START','Starting focus',{treeId:'test_tree',days:70,x:0,y:0,prerequisites:[],exclusive:[],conditions:{}});
 entry('unit','infantry','Infantry',{stats:{combat_width:2,max_organisation:60,manpower:1000,supply_consumption:.07},need:{infantry_equipment:100}});
 const infantry=entry('equipment','infantry_equipment_1','Infantry equipment I',{stats:{build_cost_ic:.5,soft_attack:6},resources:{}});
 entry('equipment','infantry_equipment_2','Infantry equipment II',{stats:{build_cost_ic:.6,soft_attack:9},resources:{}});
 entry('equipment','convoy','Convoy',{type:'convoy',year:1910,stats:{build_cost_ic:70},resources:{}});
 for(let i=0;i<85;i++)entry('equipment',`catalog_${i}`,`Catalog entry ${String(i).padStart(2,'0')}`,{year:1936,countries:['GER'],stats:{build_cost_ic:1}});
 entry('character','GER_victoria','Victoria — first definition',{semanticScope:'first'},'fixture/character-first.txt');
 entry('character','GER_victoria','Victoria — second definition',{semanticScope:'second'},'fixture/character-second.txt');
 const reused=entry('character','RECYCLED','Retired semantic identity',{semanticScope:'retired'},'fixture/reused.txt');store.removeSource(reused.source);entry('character','RECYCLED','Current semantic identity',{semanticScope:'current'},'fixture/reused.txt');
 const edges:Relationship[]=[];
 edges.push({id:'occupation-follow-up',from:eventStart.uid,fromKey:eventStart.entityKey!,type:'triggers-event',targetRef:{kind:'event',id:eventNext.id},resolution:'unresolved',candidates:[],condition:[],scope:['immediate'],details:[{key:'hours',value:'6',line:3}],evidence:{class:'installed-script',source:eventStart.source,line:2,hash:eventStart.hash,gameVersion:eventStart.version,rule:'fixture-event-chain'}});
 for(let i=0;i<36;i++){
   const tech=entry('technology',`unlock_${String(i).padStart(2,'0')}`,`Unlock source ${String(i).padStart(2,'0')}`,{year:1936,countries:['GER']});
   edges.push({id:`unlock-${String(i).padStart(2,'0')}`,from:tech.uid,fromKey:tech.entityKey!,type:'enables-module',targetRef:{kind:'module',id:module.id},resolution:'unresolved',candidates:[],condition:[{key:'OR',value:[{key:'has_dlc',value:'Example Content',line:3},{key:'always',value:'yes',line:4}],line:2}],scope:['on_research_complete','ROOT'],group:'unlock-group',evidence:{class:'installed-script',source:tech.source,line:2,hash:tech.hash,gameVersion:tech.version,rule:'fixture-unlock'}});
 }
 edges.push({id:'missing-target',from:module.uid,fromKey:module.entityKey!,type:'requires-module-category',targetRef:{kind:'module_category',id:'category_not_indexed'},resolution:'unsupported',reason:'category-is-a-constraint',candidates:[],condition:[],scope:['module_slots'],evidence:{class:'installed-script',source:module.source,line:8,hash:module.hash,gameVersion:module.version,rule:'fixture-constraint'}});
 store.replaceRelationships(edges);
 const meta:Meta={root:'disposable-fixture',version:'fixture-1.19.4.1',gameVersion:'fixture-1.19.4.1',appVersion,dbSchemaVersion:SCHEMA_VERSION,importerRevision:5,indexRevision:'fixture-revision-1',indexedAt:new Date().toISOString(),counts:{country:1,module:1,equipment:88,technology:36,character:2,event:3,idea:1},files:2,warnings:[],mods:[],defines:{BASE_FACTORY_SPEED_MIL:3.5,FOCUS_POINT_DAYS:7},dlcs:[{id:'example',name:'Example Content',disabled:true,metadataKnown:true,installed:{value:'yes',source:'Fixture descriptor and content file'},owned:{value:'unknown',source:'No entitlement evidence'},enabled:{value:'no',source:'Fixture launcher disabled list'}},{id:'integrated',name:'Integrated Fixture',disabled:false,integrated:true,installed:{value:'yes',source:'Fixture integrated content'},owned:{value:'unknown',source:'Integrated does not assert entitlement'},enabled:{value:'yes',source:'Integrated content'}}]};
 store.setSetting('meta',meta);
 const coverage:Coverage={indexRevision:meta.indexRevision!,supportedRoots:['common/units/equipment/modules'],files:[{source:'fixture/moved-modules.txt',hash:module.hash,status:'complete',discovered:1,emitted:1,accounted:1,omissions:[],warnings:[],kinds:{module:1}},{source:'fixture/recovered.txt',hash:module.hash,status:'recovered',discovered:3,emitted:1,accounted:3,omissions:[{path:'structural',reason:'Metadata wrapper',line:1},{path:'unused',reason:'Unsupported declaration',line:4}],warnings:['Fixture parser recovery'],kinds:{module:1}}],unsupportedRoots:[{path:'common/not_supported',files:1,reason:'Outside agreed manifest'}],relationships:{resolved:37,unsupported:1},verification:'Fixture accounting; no engine validation.'};
 store.setSetting('coverage',coverage);
 const profile:Profile={id:'fixture-primary',revision:0,name:'Fixture campaign',country:'GER',startDate:'1936-01-01',historical:true,goals:'',dlcs:['Example Content'],dlcConfirmed:true,legacyDlcAssertions:['Example Content'],tree:tree.uid,queue:['START'],completed:[],bookmarks:[old.uid,'module:fixture/deleted.txt:missing','GER_victoria',reused.uid],notes:{[old.uid]:'Legacy note follows the moved definition',[reused.uid]:'This note belongs to the retired identity'},templates:[]};
 store.saveProfile(profile);store.setSetting('selectedProfileId',profile.id);
 run.write('fixture.json',{entries,profile,edges,meta,coverage});
 const browser=await chromium.launch(browserOptions());ownedBrowser=browser;
 const context=await browser.newContext({viewport:{width:1500,height:960},acceptDownloads:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const dialog=()=>page.getByRole('dialog');
 const getStatus=()=>fetch(service.url+'/api/v1/status').then(r=>r.json());
 try{
  await page.goto(service.url);await expect(page.getByRole('heading',{name:'Command center',exact:true})).toBeVisible();
  await check('SEARCH-01: ordinary event and short-cost queries retain exact subject controls',async()=>{
   await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();
   for(const query of ['What happens after Denmark occupation event 1?','denmark_occupation_event.1']){
    await page.getByLabel('Filter reference entries').fill(query);await expect(page.locator('.reference-card')).toHaveCount(1);await expect(page.locator('.reference-card').first().locator('code')).toHaveText('denmark_occupation_event.1');
   }
   await page.locator('.reference-card').click();await expect(dialog().getByRole('heading',{name:'Occupation opening',exact:true})).toBeVisible();await expect(dialog().locator('.relationship-row')).toHaveCount(1);await expect(dialog().locator('.relationship-row')).toContainText('Occupation follow-up');await expect(dialog().locator('.relationship-row')).toContainText('triggers event');await page.getByRole('button',{name:'Close reference',exact:true}).click();
   for(const query of ['professional officer corps cost','How much does professional officer corps cost?','professional_officer_corps_spirit']){
    await page.getByLabel('Filter reference entries').fill(query);await expect(page.locator('.reference-card')).toHaveCount(1);await expect(page.locator('.reference-card').first().locator('code')).toHaveText('professional_officer_corps_spirit');
   }
   await page.locator('.reference-card').click();await expect(dialog()).toContainText('Declared category base cost');await expect(dialog().locator('.data-table').filter({hasText:'Declared category base cost'}).locator('strong')).toHaveText('20');await page.getByRole('button',{name:'Close reference',exact:true}).click();
  },['SEARCH-01','RG04']);
  await check('PRECISION-01: actual reference renderer preserves fractional, zero and tiny source coefficients',async()=>{
   await page.getByLabel('Filter reference entries').fill('tank_medium_cannon');await expect(page.locator('.reference-card')).toHaveCount(1);await expect(page.locator('.reference-card').locator('code')).toHaveText('tank_medium_cannon');await page.locator('.reference-card').click();await expect(dialog().getByRole('heading',{name:'Medium cannon',exact:true})).toBeVisible();
   const added=dialog().locator('section').filter({has:page.getByRole('heading',{name:'Declared added values',exact:true})});
   const multiplied=dialog().locator('section').filter({has:page.getByRole('heading',{name:'Declared multipliers',exact:true})});
   for(const [key,value] of [['reliability','-0.025'],['production cost','-0.015'],['zero','0'],['tiny','0.000015']])await expect(added.locator('.data-table > div').filter({has:page.getByText(key,{exact:true})}).locator('strong')).toHaveText(value);
   for(const [key,value] of [['reliability','-0.015'],['zero','0'],['tiny','1e-7']])await expect(multiplied.locator('.data-table > div').filter({has:page.getByText(key,{exact:true})}).locator('strong')).toHaveText(value);
   await page.screenshot({path:path.join(output,'precision-regression.png'),fullPage:true});await page.getByRole('button',{name:'Close reference',exact:true}).click();
  },['PRECISION-01','RG05']);
  await check('COPY-01: convoy clears military estimate and uses version-neutral unsupported copy',async()=>{
   await page.getByRole('button',{name:'Division & production',exact:true}).click();await expect(page.locator('.production-result')).toBeVisible();await page.getByLabel('Production equipment',{exact:true}).selectOption('convoy');await expect(page.locator('.production-result')).toHaveCount(0);await expect(page.locator('.production-status')).toContainText('Naval production is unsupported. Ships and convoys use dockyards');expect(await page.locator('.production-status').innerText()).not.toMatch(/v\d+\.\d/);
   await page.screenshot({path:path.join(output,'naval-copy-regression.png'),fullPage:true});await page.getByLabel('Production equipment',{exact:true}).selectOption('infantry_equipment_1');await expect(page.locator('.production-result')).toBeVisible();
  },['COPY-01','RG07']);
  await check('Filters, pagination and originating list survive reference navigation',async()=>{
   await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();await page.getByLabel('Filter reference entries').fill('catalog');await page.getByLabel('Entry category').selectOption('equipment');await page.getByLabel('Reference country').selectOption('GER');await page.getByLabel('Reference year').fill('1936');
   await expect(page.locator('.reference-card')).toHaveCount(40);await expect(page.locator('.result-summary')).toContainText('85 entries');
   await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('.pagination')).toContainText('41-80');await expect(page.locator('.reference-card').first().locator('h3')).toHaveText('Catalog entry 40');
   await page.locator('.reference-card').first().click();await expect(dialog().getByRole('heading',{name:'Catalog entry 40',exact:true})).toBeVisible();await dialog().getByRole('button',{name:'Bookmark',exact:true}).click();await expect(dialog().getByRole('button',{name:'Bookmarked',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close reference',exact:true}).click();
   await expect(page.getByLabel('Filter reference entries')).toHaveValue('catalog');await expect(page.getByLabel('Entry category')).toHaveValue('equipment');await expect(page.getByLabel('Reference country')).toHaveValue('GER');await expect(page.getByLabel('Reference year')).toHaveValue('1936');await expect(page.locator('.pagination')).toContainText('41-80');
   const p=(await getStatus()).profiles[0];expect(p.bookmarks.some((key:string)=>key.startsWith('vanilla:equipment:')&&key.endsWith(':catalog_40'))).toBe(true);
  });
  await check('Exact links exceed old hit limits, preserve conditions, and Back restores drawer scroll',async()=>{
   await page.getByLabel('Filter reference entries').fill('tank_medium_cannon');await page.getByLabel('Entry category').selectOption('module');await page.getByLabel('Reference country').selectOption('');await page.getByLabel('Reference year').fill('');await expect(page.locator('.reference-card')).toHaveCount(1);await page.locator('.reference-card').click();
   await expect(page.getByLabel('Reference notes')).toHaveValue('Legacy note follows the moved definition');await page.getByLabel('Reference notes').fill('Unsaved note draft stays in reference history');await expect(page.locator('.relationship-row')).toHaveCount(37);await expect(dialog()).toContainText('Extracted declaration');
   const last=page.locator('.relationship-row').filter({hasText:'Unlock source 35'});await last.getByRole('button',{name:'Unlock source 35',exact:true}).scrollIntoViewIfNeeded();
   const previousScroll=await page.locator('.entry-drawer').evaluate(el=>el.scrollTop);await last.getByRole('button',{name:'Unlock source 35',exact:true}).click();await expect(dialog().getByRole('heading',{name:'Unlock source 35',exact:true})).toBeVisible();
   await page.getByRole('button',{name:'Back',exact:true}).click();await expect(dialog().getByRole('heading',{name:'Medium cannon',exact:true})).toBeVisible();await expect.poll(()=>page.locator('.entry-drawer').evaluate(el=>el.scrollTop)).toBeGreaterThan(previousScroll-4);await expect(page.getByLabel('Reference notes')).toHaveValue('Unsaved note draft stays in reference history');expect((await getStatus()).profiles[0].notes[old.uid]).toBe('Legacy note follows the moved definition');
   await page.locator('.relationship-row').filter({hasText:'Unlock source 35'}).getByText('Conditions — availability not evaluated',{exact:true}).click();await expect(page.locator('.relationship-row').filter({hasText:'Unlock source 35'}).locator('.script-block')).toContainText('OR');
   await page.screenshot({path:path.join(output,'desktop-relationships.png'),fullPage:true});await page.getByRole('button',{name:'Close reference',exact:true}).click();await expect(page.getByLabel('Filter reference entries')).toHaveValue('tank_medium_cannon');
  });
  await check('Missing and ambiguous bookmarks stay visible and require explicit definition selection',async()=>{
   await page.getByLabel('Filter reference entries').fill('');await page.getByLabel('Entry category').selectOption('');await page.getByRole('button',{name:'Bookmarks',exact:true}).click();
   await expect(page.getByRole('region',{name:'Unresolved bookmarks'})).toBeVisible();
   await expect(page.locator('.missing-references')).toContainText('module:fixture/deleted.txt:missing');await expect(page.locator('.missing-references')).toContainText('GER_victoria');
   await page.locator('.reference-missing').filter({hasText:'module:fixture/deleted.txt:missing'}).click();await expect(dialog().getByRole('heading',{name:'Reference unavailable',exact:true})).toBeVisible();await expect(dialog()).toContainText('Your saved reference has been kept');await page.getByRole('button',{name:'Close reference',exact:true}).click();
   await page.locator('.reference-missing').filter({hasText:'GER_victoria'}).click();await expect(dialog().getByRole('heading',{name:'Choose a definition',exact:true})).toBeVisible();await expect(dialog().locator('.reference-missing')).toHaveCount(2);await dialog().locator('.reference-missing').first().click();await expect(dialog().getByRole('heading',{name:'Victoria — first definition',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close reference',exact:true}).click();
   await page.locator('.reference-missing').filter({hasText:reused.uid}).click();await expect(dialog().getByRole('heading',{name:'Choose a definition',exact:true})).toBeVisible();await dialog().locator('.reference-missing').click();await expect(dialog().getByRole('heading',{name:'Current semantic identity',exact:true})).toBeVisible();await expect(page.getByLabel('Reference notes')).toHaveValue('');await expect(dialog().getByRole('heading',{name:'Legacy notes needing review',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close reference',exact:true}).click();
   expect((await getStatus()).profiles[0].bookmarks).toContain('module:fixture/deleted.txt:missing');
  });
  await check('Independent DLC assertions retain legacy assertion and evidence',async()=>{
   await page.locator('.profile-trigger').click();await dialog().getByText('DLC ownership & enabled content',{exact:false}).click();await expect(dialog()).toContainText('Legacy combined selection');await expect(dialog()).toContainText('Ownership evidence: unknown');
   await page.getByLabel('Ownership: Example Content',{exact:true}).selectOption('yes');await page.getByLabel('Enabled: Example Content',{exact:true}).selectOption('no');await page.getByRole('button',{name:'Save campaign',exact:true}).click();await expect(dialog()).toHaveCount(0);
   const p=(await getStatus()).profiles[0];expect(p.dlcStates.example.owned.value).toBe('yes');expect(p.dlcStates.example.enabled.value).toBe('no');expect(p.legacyDlcAssertions).toEqual(['Example Content']);expect(p.dlcs).toEqual(['Example Content']);
  });
  await check('Numeric wheel protection and index changes hide stale results while retaining laboratory inputs',async()=>{
   await page.getByRole('button',{name:'Division & production',exact:true}).click();await expect(page.locator('.production-result')).toBeVisible();const quantity=page.getByLabel('Equipment needed',{exact:true});await quantity.fill('12345');await quantity.focus();await quantity.hover();await page.mouse.wheel(0,-500);await expect(quantity).toHaveValue('12345');await expect(page.locator('.production-result')).toBeVisible();
   let release:()=>void=()=>{};const blocked=new Promise<void>(resolve=>{release=resolve;});await page.route('**/api/v1/equipment',async route=>{await blocked;await route.continue();});
   store.insert({...infantry,data:{...infantry.data,stats:{...infantry.data.stats,build_cost_ic:1}}});store.setSetting('meta',{...meta,indexRevision:'fixture-revision-2'});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.locator('.production-result')).toHaveCount(0);await expect(quantity).toHaveValue('12345');await expect(page.getByLabel('Production equipment')).toBeDisabled();
   release();await expect(page.locator('.production-result')).toBeVisible();await expect(quantity).toHaveValue('12345');await expect(page.locator('.production-result')).toContainText('17.5');await page.unroute('**/api/v1/equipment');
   await page.getByRole('button',{name:/^(Campaign planner|Countries & focuses)$/}).click();await expect(page.locator('.cp-steps > li')).toHaveCount(1);await page.screenshot({path:path.join(output,'desktop-planner.png'),fullPage:true});
  });
  await check('Import validation clears after success and coverage exports full accounting',async()=>{
   await page.getByRole('button',{name:'Sources & settings',exact:true}).click();const input=page.locator('input[type=file]');const p=(await getStatus()).profiles[0];
   await input.setInputFiles({name:'fixture-invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...p,startDate:'1936-02-30'}))});await expect(page.locator('.error-banner')).toBeVisible();await input.setInputFiles({name:'fixture-valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...p,name:'Imported fixture'}))});await expect(page.locator('.error-banner')).toHaveCount(0);expect((await getStatus()).profiles).toHaveLength(2);
   await expect(page.locator('.coverage-panel')).toContainText('Fixture accounting; no engine validation.');const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export coverage manifest',exact:true}).click();const manifest=await event;const destination=path.join(output,'coverage-export.json');await manifest.saveAs(destination);expect(JSON.parse(fs.readFileSync(destination,'utf8')).files).toHaveLength(2);
   await page.screenshot({path:path.join(output,'desktop-coverage.png'),fullPage:true});
  });
  await check('Phone-width reference filters and drawer stay within viewport',async()=>{
   const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(service.url);await mobile.getByRole('button',{name:'Encyclopedia',exact:true}).click();await mobile.getByLabel('Filter reference entries').fill('tank_medium_cannon');await expect(mobile.locator('.reference-card')).toHaveCount(1);expect(await mobile.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);await mobile.locator('.reference-card').click();await expect(mobile.locator('.relationship-row')).toHaveCount(37);expect(await mobile.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);await mobile.screenshot({path:path.join(output,'phone-reference.png'),fullPage:true});await mobileContext.close();
  });
  await check('Cached restart retains exact links and user references with game source unavailable and external HTTP blocked',async()=>{
   service.store.setSetting('gameRoot',path.join(directory,'unavailable-game-source'));await service.close();ownedService=undefined;service=await startServer({dataDir:directory,port:0,autoIndex:true,staticDir:path.resolve('dist')});ownedService=service;
   const cached=await getStatus();expect(cached.indexingError.length).toBeGreaterThan(0);expect(cached.selectedProfileId).toBe('fixture-primary');expect(cached.profiles[0].notes[old.uid]).toBe('Legacy note follows the moved definition');
   const externalAttempts:string[]=[];const offline=await browser.newContext({viewport:{width:1500,height:960}});await offline.route('**/*',route=>{if(new URL(route.request().url()).origin===service.url)return route.continue();externalAttempts.push(route.request().url());return route.abort('internetdisconnected');});
   const cachedPage=await offline.newPage();cachedPage.on('pageerror',e=>errors.push(e.message));await cachedPage.goto(service.url);await expect(cachedPage.locator('.profile-trigger')).toContainText('Fixture campaign');await cachedPage.getByRole('button',{name:'Encyclopedia',exact:true}).click();await cachedPage.getByLabel('Filter reference entries').fill('tank_medium_cannon');await expect(cachedPage.locator('.reference-card')).toHaveCount(1);await cachedPage.locator('.reference-card').click();await expect(cachedPage.locator('.relationship-row')).toHaveCount(37);await expect(cachedPage.getByLabel('Reference notes')).toHaveValue('Legacy note follows the moved definition');await cachedPage.getByRole('button',{name:'Close reference',exact:true}).click();await cachedPage.getByRole('button',{name:'Sources & settings',exact:true}).click();await expect(cachedPage.locator('.settings-grid')).toContainText(cached.indexingError);await cachedPage.screenshot({path:path.join(output,'cached-source-unavailable.png'),fullPage:true});expect(externalAttempts).toEqual([]);fs.writeFileSync(path.join(output,'offline-check.json'),JSON.stringify({externalHttpBlocked:true,externalAttempts,gameSourceUnavailable:true,indexingError:cached.indexingError,selectedProfileId:cached.selectedProfileId,physicalDisconnectTested:false,inGameParityTested:false},null,2));await offline.close();
  });
  if(errors.length)throw Error(errors.join('\n'));
 }catch(e){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});fs.writeFileSync(path.join(output,'failure-page.txt'),await page.locator('body').innerText());throw e;}finally{
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({kind:'developer-integration-ui',independentAcceptance:false,results,errors,dataDirectory:directory},null,2));await context.close();await browser.close();ownedBrowser=undefined;await service.close();ownedService=undefined;run.finish({errors,nativePortableUI:false,physicalDisconnectTested:false,inGameParityTested:false});run.cleanup();
 }
}
main().catch(async error=>{console.error(error);await Promise.allSettled([ownedBrowser?.close(),ownedService?.close()]);run.finish({startupOrCleanupError:String(error),nativePortableUI:false,physicalDisconnectTested:false,inGameParityTested:false});run.cleanup();process.exitCode=1;});
