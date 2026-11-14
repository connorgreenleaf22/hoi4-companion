import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

test('desktop shows a local startup window before slow indexing, reuses it, and keeps failures visible',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-startup-'));
 const output=path.join(directory,'main.cjs');
 await build({entryPoints:['electron/main.ts'],outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent',plugins:[{name:'startup-isolation',setup(build){
  build.onResolve({filter:/^(electron|\.\.\/server\/api|\.\.\/server\/store|\.\.\/server\/migrations)$/},args=>({path:args.path,namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='electron'?'module.exports=globalThis.__startupFixture.electron;':args.path.endsWith('/api')?'exports.startServer=()=>globalThis.__startupFixture.start();':args.path.endsWith('/store')?'exports.dataDirectory=()=>globalThis.__startupFixture.directory;':'exports.MigrationRequired=class MigrationRequired extends Error {}; exports.migrateStore=()=>{};',loader:'js'}));
 }}]});
 const require=createRequire(import.meta.url);
 async function scenario(fail:boolean,cancel=false){
  let resolve!:(value:any)=>void,reject!:(error:Error)=>void;
  const pending=new Promise((r,j)=>{resolve=r;reject=j;});
  const events:string[]=[],windows:any[]=[],dialogs:any[]=[],external:string[]=[];
  let started=false,serviceClosed=false;
  class Window extends EventEmitter{
   destroyed=false;openHandler!:(input:{url:string})=>{action:string};webContents=Object.assign(new EventEmitter(),{executeJavaScript:async()=>({}),setWindowOpenHandler:(handler:any)=>{this.openHandler=handler;}});
   constructor(_options:any){super();windows.push(this);events.push('window');}
   async loadURL(url:string){events.push(url.startsWith('data:')?'startup':'workspace');if(url.startsWith('data:')){assert.match(decodeURIComponent(url),/several minutes/);assert.match(decodeURIComponent(url),/default-src 'none'/);}}
   isDestroyed(){return this.destroyed;} show(){events.push('show');} focus(){events.push('focus');} hide(){events.push('hide');}
   destroy(){this.destroyed=true;events.push('destroy');}close(){this.destroy();}setTitle(){}
  }
  const app=Object.assign(new EventEmitter(),{getAppPath:()=>directory,getPath:()=>directory,setPath:()=>{},requestSingleInstanceLock:()=>true,whenReady:async()=>{},setName:()=>{},quit:()=>{events.push('quit');}});
  const fixture={directory,electron:{app,BrowserWindow:Window,shell:{openExternal:(url:string)=>external.push(url)},dialog:{showMessageBox:async(value:any)=>{dialogs.push(value);events.push('dialog');return {response:0};}}},start:()=>{started=true;events.push('service');return pending;}};
  (globalThis as any).__startupFixture=fixture;delete require.cache[output];require(output);
  await new Promise(r=>setImmediate(r));
  assert.equal(started,true);assert.deepEqual(events.slice(0,3),['window','startup','service']);assert.equal(windows.length,1);
  const navigate=(url:string)=>{let prevented=false;windows[0].webContents.emit('will-navigate',{preventDefault:()=>{prevented=true;}},url);return prevented;};
  assert.equal(navigate('https://example.org'),true);assert.equal(navigate('http://127.0.0.1:12345'),true);
  assert.deepEqual(windows[0].openHandler({url:'https://example.org'}),{action:'deny'});assert.deepEqual(external,[]);
  app.emit('second-instance');assert.deepEqual(events.slice(-2),['show','focus']);
  if(cancel)windows[0].close();
  if(fail)reject(Error('Index startup failure'));else resolve({url:'http://127.0.0.1:12345',close:async()=>{serviceClosed=true;}});
  await new Promise(r=>setImmediate(r));
  if(fail){assert.equal(dialogs[0].message,'Error: Index startup failure');assert.ok(events.indexOf('dialog')<events.indexOf('destroy'));assert.ok(events.includes('quit'));}
  else{assert.equal(windows.length,1);assert.equal(events.includes('workspace'),!cancel);assert.equal(serviceClosed,cancel);if(!cancel){assert.equal(navigate('https://example.org'),true);assert.equal(navigate('http://127.0.0.1:12345/'),false);assert.deepEqual(windows[0].openHandler({url:'https://example.org'}),{action:'deny'});assert.deepEqual(external,['https://example.org']);}}
 }
 try{await scenario(false);await scenario(true);await scenario(false,true);}finally{delete (globalThis as any).__startupFixture;delete require.cache[output];fs.rmSync(directory,{recursive:true,force:true});}
});
