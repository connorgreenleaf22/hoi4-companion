import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startServer,validateProfile} from '../server/api';
import {campaignGuides} from '../server/discovery';
import {ensurePlanner,mirrorPlanner} from '../server/planner/plans';
const output=path.resolve(process.env.HOI4_DISCOVERY_UI_EVIDENCE||'artifacts/v04/renderer');fs.mkdirSync(output,{recursive:true});
const installed=JSON.parse(fs.readFileSync('artifacts/v04/installed-source-audit.json','utf8'));
const data=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-v04-renderer-'));
fs.copyFileSync(path.join(installed.directory,'companion.sqlite'),path.join(data,'companion.sqlite'));
const results:any[]=[],errors:string[]=[];const check=async(name:string,fn:()=>Promise<void>)=>{const at=Date.now();try{await fn();results.push({name,status:'passed',ms:Date.now()-at});console.log('PASS '+name);}catch(error){results.push({name,status:'failed',ms:Date.now()-at,error:String(error)});throw error;}};
async function main(){
const service=await startServer({dataDir:data,port:0,autoIndex:false,staticDir:path.resolve(process.env.HOI4_DISCOVERY_UI_STATIC_DIR||'dist')});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'C:/Users/conno/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'});
const context=await browser.newContext({viewport:{width:1500,height:1000},acceptDownloads:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const usa=campaignGuides.find(g=>g.id==='usa-fascist')!,secret=campaignGuides.find(g=>g.id==='british-elizabeth')!;
let initial=validateProfile({id:'v04-renderer',name:'Discovery QA campaign',country:'USA',tree:'focus_tree:common/national_focus/usa.txt:usa_focus',queue:[],completed:['manual-completion'],notes:{'old':'Preserve Ω\nnotes'},bookmarks:['old-missing','guide:british-elizabeth'],templates:[{name:'Keep template',rows:[{id:'infantry',count:9}]}]});
initial=mirrorPlanner({...initial,planner:ensurePlanner(initial)});initial.planner!.plans.push({...initial.planner!.plans[0],id:'other',name:'Existing alternative'});initial=service.store.saveProfile(initial).saved!;service.store.setSetting('selectedProfileId',initial.id);
const saved=()=>service.store.profile(initial.id)!;const raw=()=>service.store.db.prepare('SELECT payload FROM profiles WHERE id=?').get(initial.id)!.payload;
const guide=(id:string)=>page.locator('article.discovery-guide').filter({has:page.locator('#guide-title-'+id)});
try{
 await page.goto(service.url);await expect(page.getByRole('heading',{name:'Command center'})).toBeVisible();
 await check('default overview, catalog and search exclude secret metadata',async()=>{
   for(const g of campaignGuides.filter(g=>g.spoiler))assert.ok(!(await page.content()).includes(g.title));
   await page.getByRole('button',{name:'Campaign ideas',exact:true}).click();await expect(guide(usa.id)).toBeVisible();
   for(const g of campaignGuides.filter(g=>g.spoiler))assert.ok(!(await page.content()).includes(g.title));
   await page.getByLabel('Search campaign ideas').fill('Elizabeth');await expect(page.getByRole('heading',{name:'No matching guides'})).toBeVisible();assert.ok(!(await page.content()).includes(secret.title));
   await page.getByRole('button',{name:'Secrets hidden',exact:true}).click();await expect(guide(secret.id)).toBeVisible();await guide(secret.id).locator('summary').first().click();await expect(guide(secret.id).getByRole('heading',{name:'Claims & verification'})).toBeVisible();await expect(guide(secret.id).getByText('Unverified research lead',{exact:true})).toBeVisible();
   await page.screenshot({path:path.join(output,'revealed-guide.png'),fullPage:true});
   await page.getByRole('button',{name:'Secrets shown',exact:true}).click();await expect(guide(secret.id)).toHaveCount(0);assert.ok(!(await page.content()).includes('MTG_Britain.txt'));await page.getByLabel('Search campaign ideas').fill('');await expect(guide(usa.id)).toBeVisible();
 });
 await check('guide preview and Cancel preserve saved bytes and selection',async()=>{
   const before=raw(),selection=service.store.selectedProfileId();const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/discovery/preview')&&r.request().method()==='POST');await guide(usa.id).getByRole('button',{name:'Preview starter plan'}).click();const payload=await (await response).json();const dialog=page.getByRole('dialog',{name:'Starter plan preview'});await expect(dialog).toBeVisible();await expect(dialog.getByText(/Check in game/).first()).toBeVisible();
   // R1 rendered each plan-wide assumption four times for this three-focus route.
   // Inspect actual text, not just new markup, so this regression fails on R1's frozen renderer.
   for(const text of payload.plan.assumptions)await expect(dialog.getByText(text,{exact:true})).toHaveCount(1);
   const expected=new Set<string>([...payload.plan.assumptions,...payload.preview.report.assumptions,...payload.preview.report.steps.flatMap((step:any)=>step.assumptions)]);
   const actual=await dialog.locator('.discovery-assumption-text').allTextContents();assert.equal(actual.length,expected.size);assert.deepEqual(new Set(actual),expected);
   const repeated=new Map<string,number>();for(const step of payload.preview.report.steps)for(const text of new Set<string>(step.assumptions))repeated.set(text,(repeated.get(text)||0)+1);
   for(const [index,step] of payload.preview.report.steps.entries())for(const text of step.assumptions.filter((text:string)=>!payload.plan.assumptions.includes(text)&&repeated.get(text)===1))await expect(dialog.locator('.discovery-preview-steps>li').nth(index).getByText(text,{exact:true})).toHaveCount(1);
   for(const message of new Set<string>(payload.preview.report.issues.map((issue:any)=>issue.message)))await expect(dialog.locator('.discovery-preview-issues').getByText(message,{exact:true})).toHaveCount(1);
   await page.screenshot({path:path.join(output,'starter-review-deduplicated.png'),fullPage:true});fs.writeFileSync(path.join(output,'review-regression.json'),JSON.stringify({distinctAssumptions:expected.size,displayedAssumptions:actual.length,sharedGuideAssumptions:payload.plan.assumptions,rawStepAssumptions:payload.preview.report.steps.map((step:any)=>({position:step.position,assumptions:step.assumptions})),capturedChecklist:payload.profile.planner.checklists.at(-1)},null,2));
   assert.equal(raw(),before);assert.equal(service.store.selectedProfileId(),selection);await dialog.getByRole('button',{name:'Cancel preview',exact:true}).click();await expect(dialog).toHaveCount(0);assert.equal(raw(),before);
 });
 await check('unverified USA timing remains qualified in the guide and new checklist; older captures warn without writes',async()=>{
   const claim=usa.claims.find(claim=>claim.id==='war-dispatch')!;await guide(usa.id).locator('summary').first().click();const claimView=guide(usa.id).locator('.discovery-claim').filter({hasText:claim.text});await expect(claimView.getByText('Unverified',{exact:true})).toBeVisible();assert.ok(claim.text.includes('compound NOT interpretation is unresolved'));await guide(usa.id).locator('summary').first().click();
   const historicalClaimText='Democratic-uprising event .2 sets the second warning flag. It schedules event .20 after 280 days if neither Voter Registration Act nor Ally with the Silver Shirts is complete, otherwise after 180 days. Event .20 contains the democratic civil-war start effect.';
   const captured={id:'old-guide-capture',name:'Historical USA guide r1',planId:initial.planner!.activePlanId,createdAt:'2026-11-03T00:00:00.000Z',indexRevision:service.store.getSetting<any>('meta',{}).indexRevision,gameVersion:'1.19.4.1',appVersion:'0.4.0',assumptions:['Original guide usa-fascist r1; original capture retained.'],items:[{id:'guide-4',text:'SCRIPTED · script-extracted: '+historicalClaimText,checked:true,requirements:[],sources:[]}]};
   const existing=saved();const updated=service.store.saveProfile({...existing,planner:{...existing.planner!,checklists:[...existing.planner!.checklists,captured]}}).saved!;const before=raw();await page.reload();await page.getByRole('button',{name:'Campaign planner',exact:true}).click();const historical=page.locator('.cp-checklist').filter({hasText:'Historical USA guide r1'});await expect(historical.locator('summary').first()).toContainText('guide correction');await historical.locator('summary').first().click();await expect(historical.getByRole('note')).toContainText('interpretation is unverified');await expect(historical.getByRole('checkbox')).toBeChecked();await expect(historical.getByText(captured.items[0].text,{exact:true})).toBeVisible();assert.equal(raw(),before);
   await page.getByRole('button',{name:'Campaign ideas',exact:true}).click();await expect(guide(usa.id)).toBeVisible();const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/discovery/preview'));await guide(usa.id).getByRole('button',{name:'Preview starter plan'}).click();const preview=await (await response).json();const checklist=preview.profile.planner.checklists.at(-1);assert.ok(checklist.items.some((item:any)=>item.text==='SCRIPTED · unverified: '+claim.text));assert.ok(checklist.assumptions.some((text:string)=>text.includes('compound NOT interpretation is unresolved')));assert.deepEqual(preview.profile.planner.checklists[0],captured);await page.getByRole('dialog',{name:'Starter plan preview'}).getByRole('button',{name:'Cancel preview',exact:true}).click();assert.equal(raw(),before);
 });
 await check('reviewed Apply is single revision, guarded while pending, and preserves existing state',async()=>{
   await guide(usa.id).getByRole('button',{name:'Preview starter plan'}).click();const dialog=page.getByRole('dialog',{name:'Starter plan preview'});await expect(dialog).toBeVisible();let release=()=>{};const held=new Promise<void>(r=>release=r);let committed=()=>{};const ready=new Promise<void>(r=>committed=r);
   await page.route('**/api/v1/plan/apply',async route=>{const response=await route.fetch();committed();await held;await route.fulfill({response});});
   await dialog.getByRole('button',{name:'Apply reviewed plan',exact:true}).click();await ready;
   try{await expect(dialog.getByRole('button',{name:'Apply reviewed plan',exact:true})).toBeDisabled();assert.ok((await page.evaluate(()=>(window as any).__hoi4CloseState)).pendingWrites>0);assert.equal(saved().revision,initial.revision!+2);}finally{release();}
   await expect(dialog).toHaveCount(0);await page.unroute('**/api/v1/plan/apply');const actual=saved();assert.equal(actual.revision,3);assert.equal(actual.planner!.plans.length,3);assert.equal(actual.planner!.checklists.length,2);assert.ok(actual.planner!.checklists[1].items.some(i=>i.text.includes('STRATEGY')));for(const key of ['notes','bookmarks','templates','completed'] as const)assert.deepEqual(actual[key],initial[key]);assert.equal((await page.evaluate(()=>(window as any).__hoi4CloseState)).pendingWrites,0);
   await page.getByRole('button',{name:'Campaign planner',exact:true}).click();await expect(page.getByRole('heading',{name:'Plan the next move'})).toBeVisible();await expect(page.getByLabel('Plan alternative')).toHaveValue(actual.planner!.activePlanId);await page.screenshot({path:path.join(output,'saved-starter-planner.png'),fullPage:true});
 });
 await check('guide bookmarks retain stable identity and stay out of unresolved reference lists',async()=>{
   await page.getByRole('button',{name:'Campaign ideas',exact:true}).click();await expect(guide(usa.id)).toBeVisible();await guide(usa.id).getByRole('button',{name:'Bookmark guide '+usa.title,exact:true}).click();await expect(guide(usa.id).getByRole('button',{name:'Remove bookmark for '+usa.title,exact:true})).toBeVisible();assert.ok(saved().bookmarks.includes('guide:'+usa.id));
   await page.getByRole('button',{name:'Encyclopedia',exact:true}).click();await page.getByRole('button',{name:'Bookmarks',exact:true}).click();await expect(page.getByRole('button').filter({hasText:'old-missing'})).toBeVisible();assert.ok(!(await page.content()).includes('guide:british-elizabeth'));assert.ok(!(await page.content()).includes('guide:usa-fascist'));
 });
 await check('formation browser requires explicit reveal; exact references open and hiding removes raw results',async()=>{
   await page.getByRole('button',{name:'Campaign ideas',exact:true}).click();await expect(guide(usa.id)).toBeVisible();let formationRequests=0;const count=(request:any)=>{if(request.url().includes('/entries?kind=formable'))formationRequests++;};page.on('request',count);
   await page.getByRole('button',{name:'Formations & restorations',exact:true}).click();await expect(page.locator('.discovery-formable')).toHaveCount(0);assert.equal(formationRequests,0);
   await page.getByRole('button',{name:'Secrets hidden',exact:true}).click();await expect(page.locator('.discovery-formable').first()).toBeVisible();assert.ok(formationRequests>0);await page.locator('.discovery-formable').first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Close reference',exact:true}).click();
   await page.getByRole('button',{name:'Secrets shown',exact:true}).click();await expect(page.locator('.discovery-formable')).toHaveCount(0);await page.getByRole('button',{name:'Campaign guides',exact:true}).click();await expect(guide(usa.id)).toBeVisible();page.off('request',count);
   await page.getByRole('button',{name:'Bookmarked guides',exact:true}).click();await expect(guide(usa.id)).toBeVisible();assert.equal(await page.locator('article.discovery-guide').count(),1);assert.ok(!(await page.content()).includes(secret.title));await page.getByRole('button',{name:'Bookmarked guides',exact:true}).click();
 });
 await check('cached reading and narrow layout use no external requests; source changes visibly block handoff',async()=>{
   const external:string[]=[];page.on('request',r=>{if(!r.url().startsWith(service.url)&&!r.url().startsWith('data:'))external.push(r.url());});await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Campaign ideas',exact:true}).click();await expect(guide(usa.id)).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,'narrow-catalog.png'),fullPage:true});assert.deepEqual(external,[]);
   const hashes=service.store.getSetting<Record<string,string>>('guideSourceHashes',{});hashes[usa.sources[0].path]='0'.repeat(64);service.store.setSetting('guideSourceHashes',hashes);await page.reload();await page.getByRole('button',{name:'Campaign ideas',exact:true}).click();await expect(guide(usa.id).getByText('Source review required',{exact:true})).toBeVisible();await expect(guide(usa.id).getByRole('button',{name:'Preview starter plan'})).toBeDisabled();
 });
 assert.deepEqual(errors,[]);
}finally{
 if(results.some(r=>r.status==='failed'))await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({at:new Date().toISOString(),level:'headless-renderer',independentAcceptance:false,native:false,physicalOffline:false,data,results,errors},null,2));await context.close();await browser.close();await service.close();
}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

