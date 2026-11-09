import { app, BrowserWindow, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { startServer } from '../server/api';
import {dataDirectory} from '../server/store';
import {MigrationRequired,migrateStore} from '../server/migrations';
import {createCloseGuard} from './close-guard';

const stampPath=path.join(app.getAppPath(),'build','development.json');
const development=fs.existsSync(stampPath)?JSON.parse(fs.readFileSync(stampPath,'utf8')) as {label:string}:null;
if(development){
  if(!/^M\d+(?:\.\d+){0,2}-[a-f0-9]{12}$/.test(development.label))throw Error('Invalid development build identity');
  const isolated=path.join(app.getPath('appData'),'HOI4 Companion Development',development.label);
  fs.mkdirSync(path.join(isolated,'electron'),{recursive:true});
  app.setPath('userData',path.join(isolated,'electron'));
  process.env.HOI4_DATA_DIR ||= path.join(isolated,'data');
}
const diagnosticFile=process.env.HOI4_STARTUP_DIAGNOSTICS==='1'||development?path.join(dataDirectory(),'diagnostics',`startup-${Date.now()}-${process.pid}.jsonl`):null;
const diagnostic=(event:string,details:unknown={})=>{if(!diagnosticFile)return;try{fs.mkdirSync(path.dirname(diagnosticFile),{recursive:true});fs.appendFileSync(diagnosticFile,JSON.stringify({at:new Date().toISOString(),event,details})+'\n');}catch{/* Diagnostics must not replace the original failure. */}};
diagnostic('runtime',{versions:process.versions,packaged:app.isPackaged});
app.on('child-process-gone',(_event,details)=>diagnostic('child-process-gone',details));
app.on('render-process-gone',(_event,_contents,details)=>diagnostic('render-process-gone',details));
let service:Awaited<ReturnType<typeof startServer>>|undefined;
let mainWindow:BrowserWindow|undefined;
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{mainWindow?.show();mainWindow?.focus();});
  app.whenReady().then(async()=>{
    app.setName('HOI4 Companion');diagnostic('app-ready');
    const start=()=>startServer({port:0,staticDir:path.join(app.getAppPath(),'dist'),indexWorkerPath:path.join(app.getAppPath(),'build','index-worker.cjs')});
    try{diagnostic('service-start');service=await start();diagnostic('service-ready',{url:service.url});}catch(error){
      if(!(error instanceof MigrationRequired))throw error;
      const choice=await dialog.showMessageBox({type:'question',title:'Upgrade campaign storage for v0.3',message:'Close every other HOI4 Companion desktop and browser service before continuing.',detail:`The app will verify a closed-database backup in ${path.join(dataDirectory(),'migration-backups')} and then upgrade this database to schema 3. Saved campaigns, notes, templates and bookmarks are preserved. Cancel keeps the old database unchanged. v0.2 cannot open schema 3; downgrading requires restoring that backup with all services closed.`,buttons:['All other services are closed - back up and migrate','Cancel'],defaultId:1,cancelId:1,noLink:true});
      if(choice.response!==0){app.quit();return;}
      migrateStore(error.directory,{closedApps:true});service=await start();
    }
    mainWindow=new BrowserWindow({width:1500,height:960,minWidth:760,minHeight:600,backgroundColor:'#111b20',title:development?`HOI4 Companion ${development.label}`:'HOI4 Companion',icon:path.join(app.getAppPath(),'assets','icon.png'),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
    const window=mainWindow;diagnostic('window-created');
    window.webContents.on('did-fail-load',(_event,code,description,url)=>diagnostic('did-fail-load',{code,description,url}));
    const guard=createCloseGuard({
      read:async()=>{
        let timer:ReturnType<typeof setTimeout>|undefined;
        try{return await Promise.race([window.webContents.executeJavaScript('window.__hoi4CloseState'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Close state timed out.')),3000);})]);}finally{if(timer)clearTimeout(timer);}
      },
      choose:async()=>{
        const result=await dialog.showMessageBox(window,{type:'warning',title:'Unsaved campaign drafts',message:'Keep your unsaved drafts before closing?',detail:'Drafts are kept in this window, including plans on other pages or campaigns. Review and download them, stay in the app, or explicitly discard them. Saved campaigns will not be changed.',buttons:['Stay','Review / download drafts','Discard drafts and close'],defaultId:0,cancelId:0,noLink:true});
        return result.response===1?'review':result.response===2?'discard':'stay';
      },
      review:()=>{void window.webContents.executeJavaScript("window.dispatchEvent(new Event('hoi4:review-drafts'))").catch(()=>{});},
      pending:async()=>{await dialog.showMessageBox(window,{type:'info',title:'Campaign save in progress',message:'Wait for the campaign save to finish before closing.',detail:'The app is staying open so the pending write can complete. Close again after the save status clears.',buttons:['Stay'],defaultId:0,cancelId:0});},
      failed:async()=>{if(!window.isDestroyed())await dialog.showMessageBox(window,{type:'warning',title:'Could not check unsaved drafts',message:'The app is staying open to protect pending work.',detail:'Try closing again when the window responds. Saved campaigns have not been changed by this close attempt.',buttons:['Stay'],defaultId:0,cancelId:0});},
      close:()=>{if(!window.isDestroyed())window.close();}
    });
    window.on('close',event=>{if(!guard.isApproved()){event.preventDefault();void guard.request();}});
    window.webContents.on('will-prevent-unload',event=>{
      if(guard.discardConfirmed())event.preventDefault();
      else {guard.blocked();void guard.request(true);}
    });
    mainWindow.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('https://'))void shell.openExternal(url);return {action:'deny'};});
    mainWindow.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==service!.url)event.preventDefault();});
    diagnostic('renderer-load');await mainWindow.loadURL(service.url);diagnostic('renderer-ready');
    if(development){mainWindow.on('page-title-updated',event=>event.preventDefault());mainWindow.setTitle(`HOI4 Companion ${development.label}`);}
  }).catch(error=>{diagnostic('startup-failed',{message:String(error)});mainWindow?.destroy();void dialog.showMessageBox({type:'error',title:'Could not start HOI4 Companion',message:String(error),detail:diagnosticFile?`Diagnostics: ${diagnosticFile}`:'',buttons:['Close']}).finally(()=>app.quit());});
  app.on('window-all-closed',()=>app.quit());
  let closing=false;
  app.on('before-quit',event=>{
    // Keep the service usable if the user chooses Stay in the close guard.
    if(mainWindow&&!mainWindow.isDestroyed()){event.preventDefault();mainWindow.close();return;}
    if(service&&!closing){event.preventDefault();closing=true;void service.close().finally(()=>app.quit());}
  });
}
