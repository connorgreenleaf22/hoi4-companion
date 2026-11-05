import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {startServer} from '../server/api';
import {ensurePlanner,mirrorPlanner} from '../server/planner/plans';
import type {Entry,Meta,Profile} from '../src/types';

// Isolated developer renderer evidence. This is neither native nor independent QA.
const evidence=path.resolve(process.env.HOI4_PLANNER_UI_EVIDENCE||'artifacts/v03-planner-ui');fs.mkdirSync(evidence,{recursive:true});
const data=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-planner-ui-'));
const results:{name:string;status:'passed'|'failed';ms:number;error?:string}[]=[];
const errors:string[]=[];
const hashes=(directory:string,prefix=''):Record<string,string>=>Object.fromEntries(fs.readdirSync(directory,{withFileTypes:true}).flatMap(file=>file.isDirectory()?Object.entries(hashes(path.join(directory,file.name),prefix+file.name+'/')):[[prefix+file.name,createHash('sha256').update(fs.readFileSync(path.join(directory,file.name))).digest('hex')]]));
const rendererAtStart=hashes(path.resolve('dist'));
const sourceHashes=()=>({...hashes(path.resolve('src'),'src/'),...hashes(path.resolve('server'),'server/'),...Object.fromEntries(['scripts/planner-ui.ts','package.json','package-lock.json'].map(file=>[file,createHash('sha256').update(fs.readFileSync(path.resolve(file))).digest('hex')]))});
const sourceAtStart=sourceHashes();
const check=async(name:string,fn:()=>Promise<void>)=>{const start=Date.now();try{await fn();results.push({name,status:'passed',ms:Date.now()-start});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',ms:Date.now()-start,error:String(e)});throw e;}};
async function main(){
const service=await startServer({dataDir:data,port:0,autoIndex:false,staticDir:path.resolve('dist')});
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
let diagnosticPage:import('@playwright/test').Page|undefined;
try{
 const entry=(kind:string,id:string,title:string,details:Record<string,unknown>={}):Entry=>{const e:Entry={uid:`${kind}:fixture/planner.txt:${id}`,id,kind,title,description:'Synthetic developer fixture only',source:'fixture/planner.txt',line:1,version:'fixture-game',hash:'f'.repeat(64),data:details};service.store.insert(e);return e;};
 entry('country','GER','Germany',{countries:['GER'],major:true,europe:true});
 const tree=entry('focus_tree','fixture_tree','Planner fixture tree',{countries:['GER'],sharedIds:[],focusIds:['A','B','C','D']});
 const first=entry('focus','A','First focus',{treeId:tree.id,prerequisites:[],exclusive:[],days:70,position:{x:0,y:0},conditions:{available:[{key:'always',value:'yes',line:3}]}});
 entry('focus','B','Second focus',{treeId:tree.id,prerequisites:[['A']],exclusive:[],days:35,position:{x:0,y:1},conditions:{available:[{key:'has_completed_focus',value:'A',line:4}]}});
 entry('focus','C','Manual check focus',{treeId:tree.id,prerequisites:[['B']],exclusive:[],days:null,position:{x:0,y:2},conditions:{available:[{key:'date',op:'>',value:'1937.1.1',line:5}]}});
 const duplicate=(suffix:string,line:number,title:string)=>{const focus:Entry={uid:`focus:fixture/planner.txt:D:${suffix}`,id:'D',kind:'focus',title,description:'Ambiguous synthetic focus definition',source:'fixture/planner.txt',line,version:'fixture-game',hash:'f'.repeat(64),data:{treeId:tree.id,prerequisites:[],exclusive:[],days:7,conditions:{available:[{key:'always',value:'yes',line:line+1}]}}};service.store.insert(focus);return focus;};
 duplicate('one',10,'First ambiguous variant');const secondVariant=duplicate('two',20,'Second ambiguous variant');
 const meta:Meta={root:'synthetic-only',version:'fixture-game',gameVersion:'fixture-game',appVersion:'0.3.0',dbSchemaVersion:3,importerRevision:5,indexRevision:'planner-fixture-index-A',indexedAt:new Date().toISOString(),counts:{country:1,focus_tree:1,focus:3},files:1,warnings:[],dlcs:[],mods:[],defines:{FOCUS_POINT_DAYS:7,BASE_FACTORY_SPEED_MIL:4.5}};
 service.store.setSetting('meta',meta);
 let profile:Profile={id:'planner-ui',revision:0,name:'Planner renderer fixture',country:'GER',startDate:'1936-01-01',historical:true,goals:'Preserve this goal',dlcs:[],dlcConfirmed:false,tree:tree.uid,queue:['A','B'],completed:[],bookmarks:[],notes:{A:'Unicode note: 日本語\nline two'},templates:[],exportSchemaVersion:3};
 profile=mirrorPlanner({...profile,planner:ensurePlanner(profile)});profile.planner!.plans.push({...structuredClone(profile.planner!.plans[0]),id:'other',name:'Other route',items:[{reference:'B',legacyId:'B'}]},{...structuredClone(profile.planner!.plans[0]),id:'ambiguous',name:'Ambiguous route',items:[{reference:'D',legacyId:'D'}]});
 profile.bookmarks=[first.uid];
 const saved=service.store.saveProfile(profile);if(!saved.saved)throw new Error('Fixture campaign seed failed');service.store.setSetting('selectedProfileId',profile.id);
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Users/conno/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
 const context=await browser.newContext({viewport:{width:1500,height:960},acceptDownloads:true});const page=await context.newPage();diagnosticPage=page;page.on('pageerror',e=>errors.push(e.message));
 const current=()=>service.store.profile(profile.id)!;
 const openPlanner=async()=>{await page.getByRole('button',{name:'Campaign planner',exact:true}).click();await expect(page.getByRole('heading',{name:'Plan the next move'})).toBeVisible();};
 const settled=async()=>{await expect(page.getByText('Rechecking queue order and source conditions…')).toHaveCount(0);await expect(page.getByText('Timing awaits preview')).toHaveCount(0);};
 await page.goto(service.url);await openPlanner();await settled();
 await check('alternative preview, queue reevaluation and cancel do not write',async()=>{
   const before=JSON.stringify(current());await page.getByLabel('Plan alternative').selectOption('other');await expect(page.getByText('Unsaved plan preview')).toBeVisible();await settled();await expect(page.getByRole('region',{name:'Planned queue'}).getByText('Blocked',{exact:true}).first()).toBeVisible();assertUnchanged(before);await page.getByRole('button',{name:'Cancel preview',exact:true}).click();await expect(page.getByLabel('Plan alternative')).toHaveValue('main');await settled();assertUnchanged(before);
   await page.getByRole('button',{name:'Move queue item 2 up',exact:true}).click();await settled();assertUnchanged(before);await page.getByRole('button',{name:'Cancel preview',exact:true}).click();await settled();assertUnchanged(before);
 });
 await check('copy, rename and apply persist once; pending response locks semantic controls',async()=>{
   const before=current().revision!,beforeCount=current().planner!.plans.length;await page.getByRole('button',{name:'Copy alternative',exact:true}).click();await page.getByRole('textbox',{name:'Plan name',exact:true}).fill('Supply route');await settled();await expect(page.getByRole('button',{name:'Apply reviewed plan',exact:true})).toBeEnabled();
   let release=()=>{};const held=new Promise<void>(resolve=>{release=resolve;});let committedResponse=()=>{};const responseReady=new Promise<void>(resolve=>{committedResponse=resolve;});
   await page.route('**/api/v1/plan/apply',async route=>{const response=await route.fetch();committedResponse();await held;await route.fulfill({response});});
   await page.getByRole('button',{name:'Apply reviewed plan',exact:true}).click();await responseReady;
   try{for(const label of ['Plan alternative','Plan name','Planner country','Focus tree','Planning baseline'])await expect(page.getByLabel(label,{exact:true})).toBeDisabled();if(current().revision!==before+1)throw new Error('Held response did not follow a real committed apply');}finally{release();}
   await expect(page.getByText('Reviewed plan applied. Actual completion history is unchanged.')).toBeVisible();await page.unroute('**/api/v1/plan/apply');await settled();const p=current();if(p.revision!==before+1||p.planner!.plans.length!==beforeCount+1||p.planner!.plans.find(x=>x.id===p.planner!.activePlanId)?.name!=='Supply route')throw new Error('Reviewed apply did not preserve exact alternative state');if(p.completed.length)throw new Error('Apply changed actual completion');
 });
 await check('ambiguous queued reference requires an explicit definition; selection and cancel do not write',async()=>{
   const before=JSON.stringify(current());await page.getByLabel('Plan alternative',{exact:true}).selectOption('ambiguous');await settled();const picker=page.getByRole('region',{name:'Choose definition for queue item 1'});await expect(picker).toBeVisible();await expect(picker.getByRole('button',{name:'Use this definition',exact:true})).toHaveCount(0);await expect(picker.locator('button[aria-label^="Use definition"]')).toHaveCount(2);await picker.getByRole('button',{name:`Use definition ${secondVariant.uid} for queue item 1`,exact:true}).click();await settled();await expect(page.getByRole('region',{name:'Planned queue'}).getByRole('button',{name:'Second ambiguous variant',exact:true})).toBeVisible();if(await picker.count())throw new Error('Explicit definition remained ambiguous');assertUnchanged(before);await page.getByRole('button',{name:'Cancel preview',exact:true}).click();await settled();assertUnchanged(before);
 });
 await check('blank draft name remains editable and recoverable',async()=>{
   const before=JSON.stringify(current());await page.getByRole('textbox',{name:'Plan name',exact:true}).fill('');await expect(page.getByRole('textbox',{name:'Plan name',exact:true})).toHaveValue('');await page.waitForTimeout(350);assertUnchanged(before);await page.getByRole('button',{name:'Cancel preview',exact:true}).click();await settled();
 });
 await check('unknown duration and manual state remain explicit; cancellation preserves data',async()=>{
   const before=JSON.stringify(current());await page.getByRole('button',{name:'Add Manual check focus to queue',exact:true}).click();await settled();await expect(page.getByText('105 known nominal days · total unknown')).toBeVisible();await expect(page.getByText('Duration unknown',{exact:false})).toBeVisible();await expect(page.getByText('end date unresolved',{exact:false})).toBeVisible();assertUnchanged(before);await page.getByRole('button',{name:'Cancel preview',exact:true}).click();await settled();
 });
 await check('checklist ticks, source capture and manual Done have separate state',async()=>{
   await page.getByRole('textbox',{name:'Checklist name',exact:true}).fill('My sourced checks');await page.getByRole('button',{name:'Capture checklist',exact:true}).click();await expect(page.getByText('Sourced checklist captured. Ticks do not complete focuses.')).toBeVisible();await settled();const captured=current().planner!.checklists[0];if(!captured||captured.indexRevision!==meta.indexRevision||captured.actualCompleted?.length!==0||!captured.items[0].sources.length)throw new Error('Checklist lost capture context');
   await page.getByText('My sourced checks · 0/2',{exact:true}).click();await page.locator('.cp-check input[type=checkbox]').first().click();await expect(page.getByText('Checklist progress saved. Actual completion history unchanged.')).toBeVisible();await expect(page.locator('.cp-check input[type=checkbox]').first()).toBeChecked();if(current().completed.length||!current().planner!.checklists[0].items[0].checked)throw new Error('Checklist tick affected actual completion');await settled();await page.locator('.cp-step-actions').first().getByRole('button',{name:'Done',exact:true}).click();await expect(page.getByText('Manual completion recorded; all alternatives will be rechecked.')).toBeVisible();await settled();if(current().completed.length!==1||!current().completed.some(ref=>[first.entityKey,`definition:${first.uid}`].includes(ref))||current().queue.length!==2)throw new Error('Manual Done lost exact identity or silently rewrote plan order');await expect(page.getByText('Manually completed',{exact:true})).toBeVisible();
 });
 await check('conflict retains draft and download; newer saved state wins',async()=>{
   await page.getByRole('textbox',{name:'Plan name',exact:true}).fill('Retained conflict draft');await settled();const p=current();const write=service.store.saveProfile({...p,goals:'Committed from another client'});if(write.conflict)throw new Error('Fixture competing write failed');await page.getByRole('button',{name:'Apply reviewed plan',exact:true}).click();await expect(page.getByText(/Your draft is retained/)).toBeVisible();if(current().goals!=='Committed from another client'||current().planner!.plans.find(x=>x.id===current().planner!.activePlanId)?.name==='Retained conflict draft')throw new Error('Stale draft overwrote current campaign');const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'Download draft',exact:true}).click();const artifact=await waiting;const target=path.join(evidence,'retained-conflict-draft.json');await artifact.saveAs(target);const exported=JSON.parse(fs.readFileSync(target,'utf8'));if(exported.planner.plans.find((x:any)=>x.id===exported.planner.activePlanId).name!=='Retained conflict draft')throw new Error('Draft download did not retain submitted edits');await page.getByRole('button',{name:'Use latest saved campaign',exact:true}).click();await expect(page.getByText('Latest saved campaign loaded. Preview again before making a change.')).toBeVisible();await settled();
 });
 await check('view context survives navigation and reload; changed sources mark capture stale',async()=>{
   const bookmark=page.getByRole('button',{name:'Bookmark First focus',exact:true});await expect(bookmark).toHaveAttribute('aria-pressed','true');await bookmark.click();await expect(bookmark).toHaveAttribute('aria-pressed','false');if(current().bookmarks.length)throw new Error('Legacy UID bookmark was duplicated instead of toggled');await settled();await bookmark.click();await expect(bookmark).toHaveAttribute('aria-pressed','true');if(JSON.stringify(current().bookmarks)!==JSON.stringify([first.entityKey]))throw new Error('Bookmark did not retain stable logical identity');await settled();await page.getByRole('textbox',{name:'Find focus',exact:true}).fill('First');await page.getByRole('button',{name:'Remember view',exact:true}).click();await expect(page.getByText('View remembered for this campaign.')).toBeVisible();await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();await openPlanner();await expect(page.getByRole('textbox',{name:'Find focus',exact:true})).toHaveValue('First');await page.reload();await openPlanner();await expect(page.getByRole('textbox',{name:'Find focus',exact:true})).toHaveValue('First');service.store.setSetting('meta',{...meta,indexRevision:'planner-fixture-index-B'});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByText(/My sourced checks.*source context changed/)).toBeVisible();await settled();await page.screenshot({path:path.join(evidence,'planner-final.png'),fullPage:true});
 });
 if(errors.length)throw new Error('Renderer errors: '+errors.join('\n'));
 function assertUnchanged(before:string){if(JSON.stringify(current())!==before)throw new Error('Preview or Cancel wrote campaign state');}
}catch(error){console.error(error);process.exitCode=1;if(diagnosticPage){await diagnosticPage.screenshot({path:path.join(evidence,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(evidence,'failure.html'),await diagnosticPage.content().catch(()=>''));}fs.writeFileSync(path.join(evidence,'failure.txt'),String(error));}
finally{
 await browser?.close();await service.close();
 const script=fs.readFileSync(process.argv[1]);const inputsUnchanged=JSON.stringify(rendererAtStart)===JSON.stringify(hashes(path.resolve('dist')))&&JSON.stringify(sourceAtStart)===JSON.stringify(sourceHashes());if(!inputsUnchanged){console.error('Source or dist changed during renderer execution; evidence cannot qualify one fixed input.');process.exitCode=1;}fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify({kind:'developer-headless-renderer',native:false,independentQA:false,scriptSha256:createHash('sha256').update(script).digest('hex'),inputsUnchanged,sourceHashes:sourceAtStart,rendererHashes:rendererAtStart,dataDirectory:data,servicePort:service.port,results,rendererErrors:errors,processesClosed:true,limits:['Synthetic fixtures only','No native portable, screen-reader, high-DPI, physical offline or game-engine checks','Normal-restart view restoration is for an explicitly remembered view; in-memory drafts are not crash durable']},null,2));
 if(!process.env.HOI4_KEEP_PLANNER_UI_DATA){const resolved=fs.realpathSync(data),root=fs.realpathSync(os.tmpdir());if(path.dirname(resolved).toLowerCase()!==root.toLowerCase()||!path.basename(resolved).startsWith('hoi4-planner-ui-'))throw new Error('Cleanup target escaped the owned disposable fixture root.');fs.rmSync(resolved,{recursive:true,force:true});}
}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

