import {chromium} from '@playwright/test';import path from 'node:path';import assert from 'node:assert/strict';
import {startServer} from '../server/api';import {createQaRun,browserOptions,fileHash,assertOwnedStatus} from './qa/fixture';import {copyAiContextFixture} from './qa/ai-context-fixture';import {exerciseAiContext} from './qa/ai-context-journey';
async function main(){
 const run=createQaRun('ai-context','headless-renderer');let service:Awaited<ReturnType<typeof startServer>>|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined,page:import('@playwright/test').Page|undefined;const errors:string[]=[];let source='',before='';
 try{
  const original=path.join(run.sourceFixtures,'original');copyAiContextFixture(original,run.dataDirectory);source=path.join(original,'companion.sqlite');before=fileHash(source);
  service=await startServer({dataDir:run.dataDirectory,port:0,autoIndex:false,staticDir:path.resolve('dist')});browser=await chromium.launch(browserOptions());page=await (await browser.newContext({viewport:{width:1500,height:960}})).newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(service.url);assertOwnedStatus(await page.evaluate(()=>fetch('/api/v1/status').then(response=>response.json())),run.dataDirectory);
  await exerciseAiContext(page,run);assert.deepEqual(errors,[]);assert.equal(fileHash(source),before);
 }catch(error){await page?.screenshot({path:path.join(run.output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{await browser?.close();await service?.close();run.finish({originalFixtureUnchanged:!!before&&fileHash(source)===before,rendererErrors:errors,realProviderCalled:false,nativeGameLaunched:false});run.cleanup();console.log(run.output);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
