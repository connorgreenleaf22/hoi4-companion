import {contextBridge,ipcRenderer} from 'electron';
import type {IntegrationMode,IntegrationState} from './integration-model';

// Expose individual fixed channels, never raw Electron or arbitrary IPC to the renderer.
contextBridge.exposeInMainWorld('hoi4Integration',Object.freeze({
  getState:():Promise<IntegrationState>=>ipcRenderer.invoke('hoi4:integration:get'),
  setMode:(mode:IntegrationMode):Promise<IntegrationState>=>ipcRenderer.invoke('hoi4:integration:mode',mode),
  setExpanded:(expanded:boolean):Promise<IntegrationState>=>ipcRenderer.invoke('hoi4:integration:expanded',expanded),
  setPinned:(pinned:boolean):Promise<IntegrationState>=>ipcRenderer.invoke('hoi4:integration:pinned',pinned),
  hide:():Promise<IntegrationState>=>ipcRenderer.invoke('hoi4:integration:hide'),
  onState:(listener:(state:IntegrationState)=>void)=>{
    if(typeof listener!=='function')throw Error('A state listener is required.');
    const wrapped=(_event:Electron.IpcRendererEvent,state:IntegrationState)=>listener(state);
    ipcRenderer.on('hoi4:integration:state',wrapped);
    return ()=>{ipcRenderer.removeListener('hoi4:integration:state',wrapped);};
  }
}));
