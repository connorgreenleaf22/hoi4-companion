import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {openStore} from '../server/store';
import {createQaRun,assertOwnedStatus,fileHash} from './qa/fixture';

// Compiled backend in Electron's Node runtime. No native window or portable UI claim.
async function main(){
  const run=createQaRun('electron-node-runtime','compiled-runtime');const directory=run.dataDirectory;
  const cli=path.resolve(process.env.HOI4_QA_COMPILED_CLI||'build/cli.cjs');
  const executable=path.resolve(process.env.HOI4_QA_ELECTRON||'node_modules/electron/dist/electron.exe');
  let child:ReturnType<typeof spawn>|undefined,stdout='',stderr='',failure:unknown;
  try{
    for(const file of [cli,executable,path.resolve('dist/index.html')])assert.ok(fs.statSync(file).isFile(),'Missing runtime input: '+file);
    run.write('runtime-inputs.json',{compiledService:{file:cli,sha256:fileHash(cli)},electronRuntime:{file:executable,sha256:fileHash(executable)},html:{file:path.resolve('dist/index.html'),sha256:fileHash(path.resolve('dist/index.html'))}});
    const seed=openStore(directory);
    try{
      seed.setSetting('gameRoot',path.join(directory,'source-unavailable'));
      seed.setSetting('meta',{version:'runtime-fixture',indexRevision:'runtime-fixture',counts:{module:1},dlcs:[],defines:{}});
      seed.insert({uid:'module:runtime:cannon',id:'cannon',kind:'module',title:'Cached cannon',description:'Isolated runtime fixture',source:'fixture',line:1,version:'fixture',hash:'fixture',data:{}});
      seed.saveProfile({id:'runtime',name:'Runtime fixture',country:'GER',startDate:'1936-01-01',historical:true,goals:'',dlcs:[],dlcConfirmed:false,tree:'',queue:[],completed:[],bookmarks:['module:runtime:cannon'],notes:{'module:runtime:cannon':'Preserved'}});seed.setSetting('selectedProfileId','runtime');
    }finally{seed.db.close();}
    child=spawn(executable,[cli],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,ELECTRON_RUN_AS_NODE:'1',HOI4_DATA_DIR:directory,PORT:'0'}});
    if(child.pid)run.ownedProcesses.push({pid:child.pid,kind:'Electron Node compiled service (no native window)'});
    child.stdout!.on('data',chunk=>stdout+=chunk);child.stderr!.on('data',chunk=>stderr+=chunk);
    const url=await new Promise<string>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Runtime startup timed out: '+stderr)),15000);
      const ready=()=>{const match=stdout.match(/^HOI4 Companion: (http:\/\/127\.0\.0\.1:\d+)\r?$/m);if(match){clearTimeout(timer);resolve(match[1]);}};
      child!.stdout!.on('data',ready);child!.once('error',error=>{clearTimeout(timer);reject(error);});child!.once('exit',code=>{clearTimeout(timer);reject(Error(`Compiled service exited ${code}: ${stderr}`));});ready();
    });
    const status=await fetch(url+'/api/v1/status',{signal:AbortSignal.timeout(15000)}).then(r=>r.json());run.write('preflight.json',assertOwnedStatus(status,directory));
    await run.check('Compiled cached startup retains campaign selection and notes',['RG01','RG10'],()=>{
      assert.equal(status.selectedProfileId,'runtime');assert.equal(status.profiles[0].notes['module:runtime:cannon'],'Preserved');assert.ok(status.indexingError);
    });
    await run.check('Compiled exact reference, search and bundled HTML',['RG04'],async()=>{
      const results=await fetch(url+'/api/v1/entries?q=cannon').then(r=>r.json());assert.equal(results.total,1);
      const reference=await fetch(url+'/api/v1/resolve?ref=module%3Aruntime%3Acannon').then(r=>r.json());assert.equal(reference.status,'resolved');
      const html=await fetch(url+'/').then(r=>r.text());assert.match(html,/assets\/index-.*\.js/);
    });
    console.log(JSON.stringify({passed:true,output:run.output,level:'compiled-runtime',nativePortableUI:false}));
  }catch(error){failure=error;throw error;}finally{
    if(child&&child.exitCode===null){const ended=once(child,'exit');child.kill();await ended;}
    run.finish({failure:failure?String(failure):undefined,stdout,stderr,nativePortableUI:false,independentAcceptance:false});run.cleanup();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
