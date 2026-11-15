export type IntegrationMode='workspace'|'sidecar'|'hud'|'intel';
export type IntegrationState={mode:IntegrationMode;expanded:boolean;pinned:boolean;visible:boolean;native:boolean;shortcuts:{toggle:boolean;cycle:boolean}};
export type IntegrationApi={
  getState:()=>Promise<IntegrationState>;
  setMode:(mode:IntegrationMode)=>Promise<IntegrationState>;
  setExpanded:(expanded:boolean)=>Promise<IntegrationState>;
  setPinned:(pinned:boolean)=>Promise<IntegrationState>;
  hide:()=>Promise<IntegrationState>;
  onState:(listener:(state:IntegrationState)=>void)=>()=>void;
};
declare global {interface Window {hoi4Integration?:IntegrationApi}}
