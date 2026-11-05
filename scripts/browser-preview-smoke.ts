import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {chromium,expect} from '@playwright/test';
import {createQaRun,browserOptions,assertOwnedStatus,fileHash} from './qa/fixture';

async function main(){
 const directory=path.resolve(process.argv[2]||'');const manifest=JSON.parse(fs.readFileSync(path.join(directory,'BUILD.json'),'utf8'));
 if(manifest.mode!=='browser-development-fallback'||fileHash(path.join(directory,'build','cli.cjs'))!==manifest.compiledServiceSHA256)throw Error('Unexpected or changed browser artifact');
 const run=createQaRun('browser-development-build','compiled-runtime');const browser=await chromium.launch(browserOptions());
 let wrapper:ReturnType<typeof spawn>|undefined,servicePid:number|undefined;
 const stop=async()=>{
  const pid=servicePid;servicePid=undefined;
  if(pid){try{process.kill(pid);}catch{}for(let i=0;i<40;i++){try{process.kill(pid,0);}catch{break;}await new Promise(r=>setTimeout(r,50));}}
  if(wrapper&&wrapper.exitCode===null){const exited=new Promise<void>(resolve=>wrapper!.once('exit',()=>resolve()));wrapper.kill();await exited;}wrapper=undefined;
 };
 const start=async()=>{
  wrapper=spawn(process.execPath,[path.join(directory,'launch.cjs')],{cwd:directory,env:{...process.env,HOI4_NO_OPEN:'1',HOI4_DATA_DIR:run.dataDirectory},stdio:['ignore','pipe','pipe']});
  const url=await new Promise<string>((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Browser artifact startup timeout')),60000);wrapper!.once('error',e=>{clearTimeout(timer);reject(e);});wrapper!.once('exit',code=>{clearTimeout(timer);reject(Error('Browser launcher exited: '+code));});wrapper!.stdout!.on('data',b=>{output+=b.toString();const match=output.match(/HOI4 Companion: (http:\/\/127\.0\.0\.1:\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
  // Only terminate the service launched into this test's owned disposable directory.
  for(let i=0;i<20;i++){const file=path.join(directory,'last-session.json');if(fs.existsSync(file)){const session=JSON.parse(fs.readFileSync(file,'utf8'));if(session.url===url&&session.dataDirectory===run.dataDirectory&&Number.isSafeInteger(session.pid)&&session.pid>0){servicePid=session.pid;run.ownedProcesses.push({pid:servicePid!,kind:'Owned compiled browser service'});break;}}await new Promise(r=>setTimeout(r,50));}
  if(!servicePid)throw Error('Could not establish owned service identity');return url;
 };
 try{
  let url=await start();const p=await browser.newPage({viewport:{width:1440,height:1100}});let recordingId='';
  await run.check('generated launcher starts compiled service, renderer and installed references',['M5-BROWSER-ARTIFACT'],async()=>{
   const status=await fetch(url+'/api/v1/status').then(r=>r.json());assertOwnedStatus(status,run.dataDirectory);if(!status.meta?.counts?.focus)throw Error('No installed focus references');await p.goto(url);await expect(p.getByRole('heading',{name:'Command center',exact:true})).toBeVisible();
   const panel=p.getByRole('region',{name:'Your observed campaign'});if(!process.env.HOI4_INTELLIGENCE_RECORDING)throw Error('Supply the retained native recording for this artifact smoke');await panel.getByLabel('Open snapshot recording').setInputFiles(process.env.HOI4_INTELLIGENCE_RECORDING);await expect(panel.getByText('Recording saved locally and available after restart.')).toBeVisible();recordingId=await panel.getByLabel('Saved campaign recording').inputValue();
   await p.screenshot({path:path.join(run.output,'browser-build.png'),fullPage:true});
  });
  await stop();url=await start();await p.goto(url);
  await run.check('compiled browser artifact reopens history and transfers baseline into planner',['M5-BROWSER-REOPEN'],async()=>{
   const panel=p.getByRole('region',{name:'Your observed campaign'});await panel.getByLabel('Saved campaign recording').selectOption(recordingId);await expect(panel.getByText('No focus selected',{exact:true})).toBeVisible();await panel.getByLabel('Baseline focus tree').selectOption({index:1});await panel.getByRole('button',{name:'Preview planning baseline'}).click();await expect(panel.getByRole('region',{name:'Baseline preview'})).toContainText('Country: GER');await panel.getByRole('button',{name:'Confirm and open planner'}).click();await expect(p.getByLabel('Planner country')).toHaveValue('GER');await expect(p.getByRole('region',{name:'Recorded planning baseline'})).toContainText('Political power: 2.324');await p.screenshot({path:path.join(run.output,'browser-planner.png'),fullPage:true});
  });
  run.finish({artifact:directory,manifest,nativeGameLaunched:false,electronRendererVerified:false,restartMethod:'Owned Node processes stopped; SQLite recovery/reopen exercised, not native Electron lifecycle'});console.log(run.output);
 }finally{await browser.close();await stop();run.finish();run.cleanup();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
