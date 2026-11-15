import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

test('native modes retain one renderer, enforce IPC ownership, disclose shortcut conflicts and recover hidden drafts',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'hoi4-integration-'));
  const output=path.join(directory,'integration.cjs');
  const handlers=new Map<string,(event:any,value?:unknown)=>any>();
  const shortcuts=new Map<string,()=>void>();
  const unregistered:string[]=[];
  const frame={url:'http://127.0.0.1:12345/'};
  const contents={mainFrame:frame,send:()=>{}};
  let visible=true,alwaysOnTop=false;
  let bounds={x:-1280,y:0,width:460,height:800};
  let trayMenu:any[]=[];
  const window=Object.assign(new EventEmitter(),{
    webContents:contents,isDestroyed:()=>false,isVisible:()=>visible,getBounds:()=>bounds,
    isFullScreen:()=>false,isMaximized:()=>false,setMinimumSize:()=>{},
    setBounds:(value:typeof bounds)=>{bounds=value;},setMaximizable:()=>{},setFullScreenable:()=>{},
    setAlwaysOnTop:(value:boolean)=>{alwaysOnTop=value;},show:()=>{visible=true;},hide:()=>{visible=false;},focus:()=>{},close:()=>{}
  });
  const screen=Object.assign(new EventEmitter(),{getDisplayMatching:()=>({workArea:{x:-1280,y:0,width:1280,height:680}})});
  const fixture={
    app:{getPath:()=>directory,getAppPath:()=>directory},screen,
    ipcMain:{handle:(channel:string,handler:any)=>handlers.set(channel,handler),removeHandler:(channel:string)=>handlers.delete(channel)},
    globalShortcut:{register:(key:string,callback:()=>void)=>{if(key.endsWith('+M'))return false;shortcuts.set(key,callback);return true;},unregister:(key:string)=>unregistered.push(key)},
    Menu:{buildFromTemplate:(menu:any[])=>menu},
    Tray:class extends EventEmitter{setToolTip(){}setContextMenu(menu:any[]){trayMenu=menu;}destroy(){}}
  };
  (globalThis as any).__integrationFixture=fixture;
  const require=createRequire(import.meta.url);
  try{
    await build({entryPoints:['electron/integration-window.ts'],outfile:output,bundle:true,platform:'node',format:'cjs',logLevel:'silent',plugins:[{name:'electron-isolation',setup(build){
      build.onResolve({filter:/^electron$/},()=>({path:'electron',namespace:'fixture'}));
      build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'module.exports=globalThis.__integrationFixture;',loader:'js'}));
    }}]});
    const {installIntegrationWindow}=require(output);
    const controller=installIntegrationWindow(window,'http://127.0.0.1:12345');
    const event={sender:contents,senderFrame:frame};
    const invoke=(name:string,value?:unknown)=>handlers.get(`hoi4:integration:${name}`)!(event,value);
    assert.deepEqual(controller.state().shortcuts,{toggle:true,cycle:false});
    assert.equal(alwaysOnTop,true);
    assert.equal(bounds.x+bounds.width<=0,true);
    assert.throws(()=>handlers.get('hoi4:integration:mode')!({...event,senderFrame:{url:frame.url}},'hud'),/limited to the local companion/);
    assert.throws(()=>handlers.get('hoi4:integration:hide')!({...event,sender:{}},undefined),/limited to the local companion/);
    frame.url='https://example.com';
    assert.throws(()=>invoke('get'),/limited to the local companion/);
    frame.url='http://127.0.0.1:12345/';
    assert.throws(()=>invoke('mode','__proto__'),/Unknown integration mode/);
    assert.throws(()=>invoke('expanded','false'),/must be boolean/);
    invoke('mode','hud');assert.equal(controller.state().expanded,false);invoke('expanded',false);
    assert.equal(bounds.height,160);
    invoke('hide');assert.equal(visible,false);
    controller.reveal();assert.equal(visible,true);assert.equal(controller.state().expanded,true);assert.ok(bounds.height>160);
    invoke('hide');trayMenu[0].click();assert.equal(visible,true);
    invoke('pinned',false);assert.equal(alwaysOnTop,false);
    invoke('mode','workspace');assert.equal(alwaysOnTop,false);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,'integration-window.json'),'utf8')),{mode:'workspace',expanded:true,pinned:false});
    shortcuts.get('CommandOrControl+Shift+Space')!();assert.equal(visible,false);
    controller.dispose();assert.equal(handlers.size,0);assert.deepEqual(unregistered,['CommandOrControl+Shift+Space']);
  }finally{delete (globalThis as any).__integrationFixture;delete require.cache[output];fs.rmSync(directory,{recursive:true,force:true});}
});
