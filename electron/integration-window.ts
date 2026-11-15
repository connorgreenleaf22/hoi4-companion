import {app,BrowserWindow,globalShortcut,ipcMain,Menu,screen,Tray} from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {integrationBounds,integrationModes,integrationPreferences,isIntegrationMode,nextIntegrationMode,type IntegrationState} from './integration-model';

/** A single renderer and service across modes: resizing never reloads or duplicates the workspace. */
export function installIntegrationWindow(window:BrowserWindow,trustedOrigin:string){
  const settings=path.join(app.getPath('userData'),'integration-window.json');
  let preferences=integrationPreferences(null);
  try{preferences=integrationPreferences(JSON.parse(fs.readFileSync(settings,'utf8')));}catch{/* New/corrupt preferences use the compact default. */}
  const shortcuts={toggle:false,cycle:false};
  let tray:Tray|undefined;
  let disposed=false;
  let pinSuspensions=0;
  const pinnedCompact=()=>preferences.mode!=='workspace'&&preferences.pinned;
  const setPinLevel=()=>window.setAlwaysOnTop(pinnedCompact(),'screen-saver');
  // HOI4 can promote its borderless window when it regains focus. Restore only Z-order;
  // moveTop deliberately leaves keyboard focus with the game and never shows a hidden window.
  const reassertPin=()=>{
    if(disposed||window.isDestroyed()||pinSuspensions||!pinnedCompact()||!window.isVisible()||window.isMinimized())return;
    if(window.getChildWindows().some(child=>child.isVisible()&&child.isModal()))return;
    setPinLevel();window.moveTop();
  };
  const state=():IntegrationState=>({...preferences,native:true,visible:window.isVisible(),shortcuts:{...shortcuts}});
  const notify=()=>{if(!window.isDestroyed())window.webContents.send('hoi4:integration:state',state());};
  const persist=()=>{
    try{fs.mkdirSync(path.dirname(settings),{recursive:true});fs.writeFileSync(settings+'.tmp',JSON.stringify(preferences));fs.renameSync(settings+'.tmp',settings);}catch{/* Window controls remain usable when preferences cannot be stored. */}
  };
  const trayMenu=()=>tray?.setContextMenu(Menu.buildFromTemplate([
    {label:window.isVisible()?'Hide companion':'Show companion',click:()=>toggle()},
    {type:'separator'},
    ...integrationModes.map(mode=>({label:({workspace:'Full workspace',sidecar:'Side panel',hud:'Field HUD',intel:'Quick Intel'})[mode],type:'radio' as const,checked:preferences.mode===mode,click:()=>{setMode(mode);window.show();window.focus();}})),
    {type:'separator'},
    {label:'Close companion',click:()=>{window.show();window.focus();window.close();}}
  ]));
  const applyBounds=()=>{
    const area=screen.getDisplayMatching(window.getBounds()).workArea;
    const bounds=integrationBounds(preferences,area);
    if(window.isFullScreen())window.setFullScreen(false);
    if(window.isMaximized())window.unmaximize();
    window.setMinimumSize(1,1);
    window.setBounds(bounds);
    window.setMinimumSize(Math.min(preferences.mode==='workspace'?760:360,bounds.width),Math.min(preferences.mode==='hud'&&!preferences.expanded?160:480,bounds.height));
    window.setMaximizable(preferences.mode==='workspace');
    window.setFullScreenable(preferences.mode==='workspace');
    setPinLevel();
  };
  const setMode=(mode:typeof preferences.mode)=>{
    if(mode!==preferences.mode)preferences={...preferences,mode,expanded:mode!=='hud'};
    applyBounds();persist();notify();trayMenu();
  };
  const toggle=()=>{if(window.isVisible())window.hide();else{window.show();window.focus();}notify();trayMenu();};
  const requireTrusted=(event:Electron.IpcMainInvokeEvent)=>{
    if(window.isDestroyed()||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||new URL(event.senderFrame.url).origin!==trustedOrigin)throw Error('Window control is limited to the local companion.');
  };
  const handlers:{channel:string;run:(value:unknown)=>void}[]=[
    {channel:'get',run:()=>{}},
    {channel:'mode',run:value=>{if(!isIntegrationMode(value))throw Error('Unknown integration mode.');setMode(value);}},
    {channel:'expanded',run:value=>{if(typeof value!=='boolean')throw Error('Expanded must be boolean.');preferences={...preferences,expanded:value};applyBounds();persist();notify();}},
    {channel:'pinned',run:value=>{if(typeof value!=='boolean')throw Error('Pinned must be boolean.');preferences={...preferences,pinned:value};setPinLevel();persist();notify();}},
    {channel:'hide',run:()=>{if(!tray&&!shortcuts.toggle)throw Error('No background recovery control is available. Minimize using the title bar instead.');window.hide();notify();trayMenu();}}
  ];
  for(const {channel,run} of handlers)ipcMain.handle(`hoi4:integration:${channel}`,(event,value)=>{requireTrusted(event);run(value);return state();});
  // Tray recovery remains available when another application owns either global shortcut.
  try{tray=new Tray(path.join(app.getAppPath(),'assets','icon.png'));tray.setToolTip('HOI4 Companion — show or switch integration');tray.on('double-click',()=>{window.show();window.focus();notify();});trayMenu();}catch{/* A registered shortcut or OS minimize remains available. */}
  try{shortcuts.toggle=globalShortcut.register('CommandOrControl+Shift+Space',toggle);}catch{/* Report unavailable instead of pretending registration succeeded. */}
  try{shortcuts.cycle=globalShortcut.register('CommandOrControl+Shift+M',()=>{setMode(nextIntegrationMode(preferences.mode));window.show();window.focus();});}catch{/* Tray and visible selector remain available. */}
  const onDisplayChanged=()=>{if(!window.isDestroyed())applyBounds();};
  const onShowHide=()=>{notify();trayMenu();};
  window.on('show',onShowHide);window.on('hide',onShowHide);
  window.on('blur',reassertPin);
  const pinTimer=setInterval(reassertPin,750);pinTimer.unref?.();
  screen.on('display-removed',onDisplayChanged);screen.on('display-metrics-changed',onDisplayChanged);
  applyBounds();notify();
  const dispose=()=>{
    if(disposed)return;disposed=true;
    clearInterval(pinTimer);window.removeListener('blur',reassertPin);
    for(const {channel} of handlers)ipcMain.removeHandler(`hoi4:integration:${channel}`);
    if(shortcuts.toggle)globalShortcut.unregister('CommandOrControl+Shift+Space');
    if(shortcuts.cycle)globalShortcut.unregister('CommandOrControl+Shift+M');
    screen.removeListener('display-removed',onDisplayChanged);screen.removeListener('display-metrics-changed',onDisplayChanged);
    tray?.destroy();
  };
  window.once('closed',dispose);
  const reveal=()=>{
    if(preferences.mode==='hud'&&!preferences.expanded){preferences={...preferences,expanded:true};applyBounds();persist();}
    window.show();window.focus();notify();trayMenu();
  };
  const suspendPin=()=>{
    pinSuspensions++;
    let resumed=false;
    return ()=>{if(resumed)return;resumed=true;pinSuspensions--;reassertPin();};
  };
  return {state,dispose,reveal,suspendPin};
}
