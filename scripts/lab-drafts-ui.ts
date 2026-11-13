import {chromium} from '@playwright/test';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {startServer} from '../server/api';import {createQaRun,browserOptions,fileHash,assertOwnedStatus} from './qa/fixture';import {copyLabFixture} from './qa/lab-fixture';import {exerciseLabDrafts} from './qa/lab-journey';
async function main(){
 const run=createQaRun('nav01-lab-drafts','headless-renderer'),original=path.join(run.sourceFixtures,'original');copyLabFixture(original,run.dataDirectory);const source=path.join(original,'companion.sqlite'),before=fileHash(source);
 const service=await startServer({dataDir:run.dataDirectory,port:0,autoIndex:false,staticDir:path.resolve('dist')});let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;let p:import('@playwright/test').Page|undefined;const errors:string[]=[];
 try{browser=await chromium.launch(browserOptions());p=await (await browser.newContext({viewport:{width:1500,height:960},acceptDownloads:true})).newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(service.url);assertOwnedStatus(await p.evaluate(()=>fetch('/api/v1/status').then(r=>r.json())),run.dataDirectory);await exerciseLabDrafts(p,run,true);assert.deepEqual(errors,[]);assert.equal(fileHash(source),before);}
 catch(e){await p?.screenshot({path:path.join(run.output,'failure.png'),fullPage:true}).catch(()=>{});throw e;}
 finally{await browser?.close();await service.close();run.finish({originalFixtureSha256:before,originalFixtureUnchanged:fileHash(source)===before,realProviderCalled:false,nativeGameLaunched:false,rendererErrors:errors,limits:['Browser reload choices are real beforeunload prompts. In-memory drafts do not survive crash/forced termination or an explicit Leave/discard. Saved templates persist through the existing API.']});run.cleanup();console.log(run.output);}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
