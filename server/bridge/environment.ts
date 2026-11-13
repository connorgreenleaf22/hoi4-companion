import fs from 'node:fs';
import path from 'node:path';
import {discoverGame,userGameDirectory,walk} from '../importer';
import {parseScript,scalar,collect} from '../parser';
import type {Store} from '../store';
import type {BridgeEnvironment,BridgeReference,DetectedMod} from '../../src/bridge-types';

export function inspectEnvironment(gameRoot=discoverGame(),userRoot=process.env.HOI4_USER_DIR||userGameDirectory()):BridgeEnvironment {
  const diagnostics:string[]=[];
  const readJSON=(file:string):any=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
  const valid=!!gameRoot&&fs.existsSync(path.join(gameRoot,'hoi4.exe'));
  if(!valid)diagnostics.push('Game executable not found. Set HOI4_GAME_DIR to the installed root.');
  const versionFile=path.join(gameRoot,'launcher-settings.json');
  const version=valid?readJSON(versionFile)?.rawVersion:null;
  const configFile=userRoot?path.join(userRoot,'dlc_load.json'):null;
  const config=configFile?readJSON(configFile):null;
  const strings=(v:unknown):string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string')?v:[];
  const configValid=!!config&&Array.isArray(config.enabled_mods)&&Array.isArray(config.disabled_dlcs);
  if(!configValid)diagnostics.push('Launcher selection unavailable; installed content does not establish active mods or DLC entitlement.');
  const enabledMods=strings(config?.enabled_mods);
  const mods:DetectedMod[]=[];
  const descriptors=userRoot?new Set([...walk(path.join(userRoot,'mod'),'.mod'),...enabledMods.map(p=>path.resolve(userRoot,p))]):new Set<string>();
  for(const descriptor of descriptors){
    try{
      const nodes=parseScript(fs.readFileSync(descriptor,'utf8'));
      const declared=scalar(nodes,'path');
      mods.push({descriptor,name:scalar(nodes,'name',path.basename(descriptor)),root:declared?path.resolve(userRoot,declared):null,archive:scalar(nodes,'archive')||null,replacePaths:collect(nodes,'replace_path'),selected:enabledMods.some(p=>path.resolve(userRoot,p)===descriptor)});
    }catch{diagnostics.push(`Cannot inspect mod descriptor: ${descriptor}`);}
  }
  return {schemaVersion:1,checkedAt:new Date().toISOString(),gameRoot:valid?gameRoot:null,executable:valid?path.join(gameRoot,'hoi4.exe'):null,version:typeof version==='string'?version:null,versionSource:version?versionFile:null,userRoot:userRoot||null,logs:userRoot?path.join(userRoot,'logs'):null,saves:userRoot?path.join(userRoot,'save games'):null,configuration:{source:configFile,status:configValid?'detected':'unavailable',enabledMods,disabledDlc:strings(config?.disabled_dlcs)},dlcDescriptors:valid?[...walk(path.join(gameRoot,'dlc'),'.dlc'),...walk(path.join(gameRoot,'integrated_dlc'),'.dlc')].map(p=>path.relative(gameRoot,p).replaceAll('\\','/')):[],mods,diagnostics};
}

export function queryReference(store:Store,environment:BridgeEnvironment,ref:string,kind?:string):BridgeReference {
  if(!ref||ref.length>1600||kind&&kind.length>80)throw new Error('Invalid reference query.');
  const reference=store.resolve(ref,kind);
  const candidates:BridgeReference['overrides']['candidates']=[];
  const limitations=['The existing index contains installed base-game declarations, not a merged mod index. Detected launcher selection is not proof of a running playset.'];
  let unknown=environment.configuration.status==='unavailable';
  for(const mod of environment.mods.filter(m=>m.selected)){
    if(mod.archive||!mod.root||!fs.existsSync(mod.root)){unknown=true;limitations.push(`Uninspected archive/missing mod: ${mod.name}`);continue;}
    for(const e of reference.candidates){
      if(mod.replacePaths.some(p=>e.source===p||e.source.startsWith(p.replace(/\/$/,'')+'/')))candidates.push({descriptor:mod.descriptor,source:e.source,reason:'replace_path may suppress this installed definition'});
      const same=path.join(mod.root,e.source);
      if(fs.existsSync(same))candidates.push({descriptor:mod.descriptor,source:same,reason:'Same relative source file may replace installed file'});
      // Detect ID collisions in differently named focus/technology files without guessing load order.
      const area=e.kind==='technology'?'common/technologies':['focus','shared_focus','joint_focus'].includes(e.kind)?'common/national_focus':null;
      if(!area){unknown=true;continue;}
      for(const file of walk(path.join(mod.root,area),'.txt')){
        try{const nodes=parseScript(fs.readFileSync(file,'utf8'));const has=(ns:typeof nodes):boolean=>ns.some(n=>(n.key==='id'&&n.value===e.id)||(e.kind==='technology'&&n.key===e.id)||Array.isArray(n.value)&&has(n.value));
          if(has(nodes))candidates.push({descriptor:mod.descriptor,source:file,reason:'Matching identifier; effective engine precedence not asserted'});
        }catch{unknown=true;}
      }
    }
  }
  return {schemaVersion:1,reference,interpretation:'installed-declarations',overrides:{status:candidates.length?'potential-overrides':unknown?'unknown':'none-detected',candidates,limitations}};
}
