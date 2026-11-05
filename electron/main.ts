import { app, BrowserWindow, shell, dialog } from 'electron';
import path from 'node:path';
import { startServer } from '../server/api';
import {dataDirectory} from '../server/store';
import {MigrationRequired,migrateStore} from '../server/migrations';
import {createCloseGuard} from './close-guard';

let service:Awaited<ReturnType<typeof startServer>>|undefined;
let mainWindow:BrowserWindow|undefined;
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{mainWindow?.show();mainWindow?.focus();});
  app.whenReady().then(async()=>{
    app.setName('HOI4 Companion');
    const start=()=>startServer({port:0,staticDir:path.join(app.getAppPath(),'dist')});
    try{service=await start();}catch(error){
      if(!(error instanceof MigrationRequired))throw error;
      const choice=await dialog.showMessageBox({type:'question',title:'Upgrade campaign storage for v0.3',message:'Close every other HOI4 Companion desktop and browser service before continuing.',detail:`The app will verify a closed-database backup in ${path.join(dataDirectory(),'migration-backups')} and then upgrade this database to schema 3. Saved campaigns, notes, templates and bookmarks are preserved. Cancel keeps the old database unchanged. v0.2 cannot open schema 3; downgrading requires restoring that backup with all services closed.`,buttons:['All other services are closed - back up and migrate','Cancel'],defaultId:1,cancelId:1,noLink:true});
      if(choice.response!==0){app.quit();return;}
      migrateStore(error.directory,{closedApps:true});service=await start();
    }
    mainWindow=new BrowserWindow({width:1500,height:960,minWidth:760,minHeight:600,backgroundColor:'#111b20',title:'HOI4 Companion',icon:path.join(app.getAppPath(),'assets','icon.png'),autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
    const window=mainWindow;
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
    await mainWindow.loadURL(service.url);
  }).catch(error=>{dialog.showErrorBox('Could not start HOI4 Companion',String(error));app.quit();});
  app.on('window-all-closed',()=>app.quit());
  let closing=false;
  app.on('before-quit',event=>{
    // Keep the service usable if the user chooses Stay in the close guard.
    if(mainWindow&&!mainWindow.isDestroyed()){event.preventDefault();mainWindow.close();return;}
    if(service&&!closing){event.preventDefault();closing=true;void service.close().finally(()=>app.quit());}
  });
}
