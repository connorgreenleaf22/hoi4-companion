import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Crosshair,PanelRight,Minus,Pin,PinOff,ArrowUpRight,ChevronDown,HelpCircle,Monitor} from 'lucide-react';
import type {IntegrationMode,IntegrationState} from './desktop-integration-types';
import './integration.css';
import {IntegrationReadiness} from './IntegrationReadiness';

const modes:ReadonlyArray<{id:IntegrationMode;label:string;description:string}>=[
  {id:'sidecar',label:'Side panel',description:'A narrow desk beside your map. All tools stay within reach.'},
  {id:'hud',label:'Field HUD',description:'A small field radio. Expand it when you need a tool, collapse it when you return to the map.'},
  {id:'intel',label:'Quick Intel',description:'An on-demand reference panel. Quick Intel does not read the object under your cursor.'},
  {id:'workspace',label:'Full workspace',description:'The familiar strategy desk, with room for longer planning sessions.'}
];
const initial=():IntegrationState=>{
  let mode:IntegrationMode='sidecar';
  try{const saved=localStorage.getItem('hoi4.integration.preview.mode');if(modes.some(m=>m.id===saved))mode=saved as IntegrationMode;}catch{/* Storage can be unavailable in private previews. */}
  return {mode,expanded:true,pinned:false,visible:true,native:false,shortcuts:{toggle:false,cycle:false}};
};

export function IntegrationShell({children,tools,page,onPage,campaign,modalOpen=false}:{children:ReactNode;tools:ReadonlyArray<{id:string;label:string}>;page:string;onPage:(page:string)=>void;campaign?:string;modalOpen?:boolean}){
  const [state,setState]=useState(initial),[error,setError]=useState(''),[help,setHelp]=useState(false);
  const bar=useRef<HTMLElement>(null),restoreFocus=useRef<HTMLElement|null>(null);
  const compact=state.mode!=='workspace',collapsed=state.mode==='hud'&&!state.expanded;
  const hidden=collapsed||!state.visible;
  const current=modes.find(m=>m.id===state.mode)!;
  useEffect(()=>{
    const native=window.hoi4Integration;if(!native)return;
    let live=true,received=false;
    const unsubscribe=native.onState(value=>{received=true;if(live)setState(value);});
    void native.getState().then(value=>{if(live&&!received)setState(value);}).catch(e=>{if(live)setError(String(e));});
    return()=>{live=false;unsubscribe();};
  },[]);
  const update=async(operation:()=>Promise<IntegrationState>,fallback:Partial<IntegrationState>)=>{
    setError('');try{if(window.hoi4Integration)setState(await operation());else setState(value=>({...value,...fallback}));}catch(e){setError(e instanceof Error?e.message:String(e));}
  };
  const setMode=(mode:IntegrationMode)=>{
    try{localStorage.setItem('hoi4.integration.preview.mode',mode);}catch{}
    void update(()=>window.hoi4Integration!.setMode(mode),{mode,expanded:mode!=='hud',visible:true});
    setHelp(false);
  };
  const expand=()=>void update(()=>window.hoi4Integration!.setExpanded(true),{expanded:true,visible:true});
  const collapse=()=>void update(()=>window.hoi4Integration!.setExpanded(false),{expanded:false});
  const dismiss=()=>{setHelp(false);if(state.mode==='hud')collapse();else void update(()=>window.hoi4Integration!.hide(),{visible:false});};
  useEffect(()=>{
    const review=()=>{if(hidden)expand();};
    window.addEventListener('hoi4:review-drafts',review);return()=>window.removeEventListener('hoi4:review-drafts',review);
  },[hidden]);
  useEffect(()=>{
    if(hidden){restoreFocus.current=document.activeElement as HTMLElement|null;bar.current?.querySelector<HTMLElement>('[data-expand]')?.focus();}
    else if(restoreFocus.current?.isConnected){restoreFocus.current.focus({preventScroll:true});restoreFocus.current=null;}
  },[hidden]);
  useEffect(()=>{
    if(state.mode==='intel'&&!modalOpen&&!hidden){
      // Quick Intel opens ready for a lookup without navigating away from an editable tool.
      document.querySelector<HTMLInputElement>('.topbar .entry-picker input')?.focus({preventScroll:true});
    }
  },[state.mode,state.visible]);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||event.defaultPrevented||!compact||hidden||modalOpen||document.querySelector('[role="dialog"],.entry-suggestions [role="option"]'))return;
      if(help){setHelp(false);event.preventDefault();return;}
      // Editing fields keep their usual Escape behavior. A visible button always returns to the game.
      if(event.target instanceof HTMLElement&&event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      event.preventDefault();dismiss();
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[compact,hidden,modalOpen,help,state.mode]);
  const chooseTool=(id:string)=>{if(hidden)expand();onPage(id);};
  return <div className={`integration-shell ${compact?'integration-compact':'integration-full'} ${hidden?'integration-collapsed':''}`} data-integration-mode={state.mode}>
    <section className="integration-bar" aria-label="Game companion controls" ref={bar} inert={modalOpen&&!hidden}>
      <div className="integration-heading">
        <div className="integration-call-sign"><Crosshair size={18}/><span>FIELD COMPANION<small title={campaign||'No campaign selected'}>{campaign?`Planning · ${campaign}`:'Choose a campaign to start planning'}</small></span></div>
        <button className="integration-icon" aria-label="How to use game companion modes" aria-expanded={help} onClick={()=>setHelp(!help)}><HelpCircle size={17}/></button>
        {compact&&state.native&&<button className={`integration-icon ${state.pinned?'is-pinned':''}`} aria-label={state.pinned?'Unpin companion from game':'Keep companion above the game'} aria-pressed={state.pinned} title={state.pinned?'Unpin':'Keep above game'} onClick={()=>void update(()=>window.hoi4Integration!.setPinned(!state.pinned),{})}>{state.pinned?<Pin size={16}/>:<PinOff size={16}/>}</button>}
      </div>
      {!hidden&&!help&&compact&&<p className="integration-hint">{state.native?(state.shortcuts.toggle?'Ctrl+Shift+Space · show / hide':'Use the tray icon to reopen; show / hide shortcut unavailable'):'Browser preview · desktop app enables pinning and global shortcuts'}</p>}
      <div className="integration-controls">
        <label className="integration-mode"><span className="sr-only">Integration mode</span><PanelRight size={14}/><select aria-label="Integration mode" value={state.mode} onChange={e=>setMode(e.target.value as IntegrationMode)}>{modes.map(m=><option value={m.id} key={m.id}>{m.label}</option>)}</select><ChevronDown size={12}/></label>
        {hidden?<button className="integration-action primary" data-expand onClick={()=>state.visible?expand():setState(value=>({...value,visible:true,expanded:true}))}><ArrowUpRight size={15}/>Open tools</button>:<>
          {compact&&<label className="integration-tool"><span className="sr-only">Companion tool</span><select aria-label="Companion tool" value={page} onChange={e=>chooseTool(e.target.value)}>{tools.map(t=><option value={t.id} key={t.id}>{t.label}</option>)}</select></label>}
          {compact&&<button className="integration-action" onClick={dismiss} title={state.mode==='hud'?'Collapse to field radio':'Hide companion; reopen with Ctrl+Shift+Space'}><Minus size={15}/><span>{state.mode==='hud'?'Collapse':'Back to game'}</span></button>}
        </>}
      </div>
      {help&&!hidden&&<div className="integration-help">
        <strong>{current.label}</strong><p>{current.description}</p><p>Every mode has the same tools and saved plans. Switching modes keeps the current tool and unsaved work in this window.</p>
        {state.native?<p><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Space</kbd> {state.shortcuts.toggle?'shows or hides the companion':'is unavailable; another app may be using it'}.<br/><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> {state.shortcuts.cycle?'switches modes':'is unavailable; use the mode menu'}. Pin keeps the panel above other windows. Use HOI4 in borderless or windowed mode.</p>:<p><Monitor size={14}/> Browser layout preview. Pinning, game overlay and global shortcuts are available in the desktop app.</p>}
        <p className="integration-qualification">Campaign selection is planning context. Read connection and source labels in Command center before treating information as current game state.</p>
      </div>}
      {error&&<p className="integration-error" role="alert">Window controls could not update: {error}</p>}
    </section>
    {compact&&!hidden&&<div className="integration-observations" inert={modalOpen}><IntegrationReadiness onOpenConnection={()=>chooseTool('overview')}/></div>}
    <div className="integration-content" hidden={hidden}>{children}</div>
    {!state.native&&compact&&!hidden&&<div className="integration-preview">Layout preview · desktop app enables pinning and global shortcuts</div>}
  </div>;
}
