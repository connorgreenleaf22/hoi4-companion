export const integrationModes=['workspace','sidecar','hud','intel'] as const;
export type IntegrationMode=typeof integrationModes[number];
export type IntegrationPreferences={mode:IntegrationMode;expanded:boolean;pinned:boolean};
export type IntegrationState=IntegrationPreferences & {visible:boolean;native:true;shortcuts:{toggle:boolean;cycle:boolean}};
export type Rectangle={x:number;y:number;width:number;height:number};

export function isIntegrationMode(value:unknown):value is IntegrationMode{
  return integrationModes.some(mode=>mode===value);
}

/** Read only the small preference contract, including when old/corrupt settings are found. */
export function integrationPreferences(value:unknown):IntegrationPreferences{
  const data=value&&typeof value==='object'?value as Record<string,unknown>:{};
  return {mode:isIntegrationMode(data.mode)?data.mode:'sidecar',expanded:typeof data.expanded==='boolean'?data.expanded:true,pinned:typeof data.pinned==='boolean'?data.pinned:true};
}

export function nextIntegrationMode(mode:IntegrationMode):IntegrationMode{
  return integrationModes[(integrationModes.indexOf(mode)+1)%integrationModes.length];
}

/** Work-area coordinates may be negative on a secondary monitor. Never use primary-screen constants. */
export function integrationBounds(preferences:IntegrationPreferences,area:Rectangle):Rectangle{
  const {mode,expanded}=preferences;
  const margin=Math.min(12,Math.floor(Math.min(area.width,area.height)/10));
  // Leave the game's clock, speed and resource controls visible above the panel.
  // Small displays retain room for the minimum usable tool height instead.
  const top=mode==='workspace'?margin:Math.min(88,Math.max(margin,area.height-480-margin));
  const wanted=mode==='workspace'?{width:1280,height:860}:mode==='sidecar'?{width:460,height:area.height-top-margin}:mode==='hud'?{width:440,height:expanded?700:160}:{width:520,height:720};
  const width=Math.min(wanted.width,Math.max(1,area.width-margin*2));
  const height=Math.min(wanted.height,Math.max(1,area.height-top-margin));
  return {width,height,x:mode==='workspace'?area.x+Math.floor((area.width-width)/2):area.x+area.width-width-margin,y:mode==='workspace'?area.y+Math.floor((area.height-height)/2):mode==='intel'?area.y+Math.max(top,Math.floor((area.height-height)/2)):area.y+top};
}
