import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parseScript, block, scalar, children, collect, numeric, plain, formatScript } from './parser';
import type { Node, Entry, Meta, Coverage, CoverageItem, DLCState } from '../src/types';
import type { Store } from './store';
import {mechanics} from './content';
import {buildRelationships,buildCategoryEntries} from './knowledge';
import {attachScriptContext} from './mechanic-context';
import {discoverRecords,reconcileRecords} from './coverage';
import {sourceNotes,applySourceNotes} from './source-notes';
import guideContent from './discovery-content.json';
import type {CampaignGuide} from '../src/discovery-types';

export function loadLocalization(root:string){
  const values=new Map<string,string>();const origins=new Map<string,{key:string;source:string;hash:string;line:number}>();
  const files=walk(path.join(root,'localisation','english'),'.yml');const dependencies=new Map<string,{text:string;hash:string}>();
  files.sort((a,b)=>Number(a.includes(`${path.sep}replace${path.sep}`))-Number(b.includes(`${path.sep}replace${path.sep}`))||a.localeCompare(b));
  for(const file of files){const text=fs.readFileSync(file,'utf8');const digest=hash(text);const source=path.relative(root,file).replaceAll('\\','/');dependencies.set(source,{text,hash:digest});
    let line=0;for(const row of text.split('\n')){line++;const m=row.match(/^\s*([\w.\-]+):\d*\s*"((?:\\.|[^"\\])*)"/);if(m){values.set(m[1],cleanText(m[2]));origins.set(m[1],{key:m[1],source,hash:digest,line});}}
  }
  function loc(key:string,depth=0):string{const value=values.get(key);if(!value)return key.replaceAll('_',' ');return depth>5?value:value.replace(/\$([\w.\-]+)(?:\|[^$]*)?\$/g,(whole,k)=>values.has(k)?loc(k,depth+1):whole);}
  function evidence(key:string,seen=new Set<string>()):any[]{if(seen.has(key))return [];seen.add(key);const own=origins.get(key);return [own||{key,status:'unresolved'},...[...(values.get(key)||'').matchAll(/\$([\w.\-]+)(?:\|[^$]*)?\$/g)].flatMap(part=>evidence(part[1],seen))];}
  return {loc,has:(key:string)=>values.has(key),evidence,digest:hash([...dependencies].map(([p,f])=>`${p}:${f.hash}`).join('\n')),files:files.length,dependencies};
}
const safeJSON=(p:string)=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}};
const wrapped=(nodes:Node[],key:string):Node[]=>children(nodes,key).flatMap(n=>Array.isArray(n.value)?n.value:[]);
const blocks=(nodes:Node[])=>nodes.filter((n):n is Node&{value:Node[]}=>Array.isArray(n.value)&&!n.key.startsWith('@'));
const conditionKeys=new Set(['limit','allowed','available','allow','visible','trigger','enable','potential','allow_branch','bypass','cancel','target_trigger']);
export const supportedRoots=['common/scripted_effects','common/dynamic_modifiers','common/country_tags','common/national_focus','common/continuous_focus','common/technologies','common/ideas','common/idea_tags','common/doctrines','common/units','common/terrain','common/decisions','common/characters','common/country_leader','common/unit_leader','common/buildings','common/military_industrial_organization','common/special_projects','common/combat_tactics.txt','history/countries','events','dlc_metadata/dlc_info','dlc','integrated_dlc','localisation/english','common/defines','documentation'];
const RULES='knowledge-foundation-v5.7-scripted-rewards';

/** Publish a whole coherent reference snapshot or retain the preceding snapshot on failure. */
export function indexGame(store:Store,root:string,onProgress?:(source:string,completed:number,total:number)=>void):Meta{
  if(!root||!fs.existsSync(path.join(root,'common','national_focus')))throw new Error('Choose a Hearts of Iron IV installation containing common/national_focus.');
  const version=safeJSON(path.join(root,'launcher-settings.json')).rawVersion||'unknown';
  const localization=loadLocalization(root);const {loc}=localization;
  const oldMeta=store.getSetting<Meta|null>('meta',null);const fileMap=new Map<string,{text:string;hash:string}>();
  // Guide dependencies may live outside semantic extraction roots. Cache only hashes;
  // this neither claims those roots are interpreted nor reads game files on guide open.
  const guideSourceHashes:Record<string,string>={};
  for(const source of new Set((guideContent as CampaignGuide[]).flatMap(g=>g.sources.filter(s=>s.kind==='installed-script').map(s=>s.path)))){
    const file=path.resolve(root,source);
    if(!file.startsWith(path.resolve(root)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
    guideSourceHashes[source]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  const addFile=(file:string)=>{const text=fs.readFileSync(file,'utf8');fileMap.set(path.relative(root,file).replaceAll('\\','/'),{text,hash:hash(text)});};
  for(const area of supportedRoots.filter(r=>r.startsWith('common/')&&!r.endsWith('.txt')&&!r.endsWith('defines')))for(const file of walk(path.join(root,area),'.txt'))addFile(file);
  for(const area of ['history/countries','events','dlc_metadata/dlc_info'])for(const file of walk(path.join(root,area),'.txt'))addFile(file);
  for(const area of ['dlc','integrated_dlc'])for(const file of walk(path.join(root,area),'.dlc'))addFile(file);
  const tactics=path.join(root,'common','combat_tactics.txt');if(fs.existsSync(tactics))addFile(tactics);
  for(const name of ['console_commands_documentation.md','effects_documentation.md','modifiers_documentation.md','triggers_documentation.md']){const file=path.join(root,'documentation',name);if(fs.existsSync(file))addFile(file);}
  const defineFiles=walk(path.join(root,'common','defines'),'.lua');const defines:Record<string,number>={};
  for(const file of defineFiles){addFile(file);for(const m of fileMap.get(path.relative(root,file).replaceAll('\\','/'))!.text.matchAll(/^\s*(?:NDefines\.\w+\.)?(BASE_FACTORY_SPEED_MIL|FOCUS_POINT_DAYS|ARMOR_VS_AVERAGE|PEN_VS_AVERAGE)\s*=\s*([\d.]+)/gm))defines[m[1]]=Number(m[2]);}
  for(const [p,f]of localization.dependencies)fileMap.set(p,f);
  fileMap.set('companion/editorial/mechanics.json',{text:JSON.stringify(mechanics),hash:hash(JSON.stringify(mechanics))});
  const user=userGameDirectory();const launcherPath=user?path.join(user,'dlc_load.json'):'';const launcherKnown=!!launcherPath&&fs.existsSync(launcherPath);const load=launcherKnown?safeJSON(launcherPath):{};
  const launcherValid=launcherKnown&&Array.isArray(load.disabled_dlcs);
  const checkedAt=new Date().toISOString();
  const dlcPayload=(descriptors:string[])=>{
    const payloads=descriptors.flatMap(source=>{const b=parseScript(fileMap.get(source)!.text);const archive=scalar(b,'archive');const declaredPath=scalar(b,'path');const candidates=[archive,...(declaredPath?[declaredPath+`/${path.basename(source,'.dlc')}.zip`]:[])].filter(Boolean);return candidates.filter(p=>{const full=path.resolve(root,p);return full.startsWith(path.resolve(root)+path.sep)&&fs.existsSync(full);});});
    return {value:payloads.length?'yes' as const:'unknown' as const,source:payloads.length?`Payload archive present: ${payloads.join(', ')}`:descriptors.length?`Descriptor only (${descriptors.join(', ')}); payload installation unconfirmed`:'DLC metadata only; installation unconfirmed',checkedAt};
  };
  const payloadContext=[...fileMap.keys()].filter(p=>p.endsWith('.dlc')).map(p=>{const state=dlcPayload([p]);return {source:p,value:state.value,evidence:state.source};});
  const manifestHash=hash(JSON.stringify({rules:RULES,sourceNotes,version,root,files:[...fileMap].map(([p,f])=>[p,f.hash]),guideSourceHashes,payloadContext,launcher:launcherValid?{disabled_dlcs:load.disabled_dlcs,enabled_mods:load.enabled_mods}:null}));
  if(oldMeta?.manifestHash===manifestHash){
    store.db.exec('BEGIN IMMEDIATE');
    try{const committed=store.getSetting<Meta|null>('meta',null);if(committed?.manifestHash===manifestHash){const meta={...committed,appVersion:'0.4.0',dbSchemaVersion:3,checkedAt,changedFiles:0};store.setSetting('meta',meta);store.setSetting('guideSourceHashes',guideSourceHashes);store.db.exec('COMMIT');return meta;}store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}
  }
  const oldHashes=new Map(store.db.prepare('SELECT path,hash FROM sources').all().map(r=>[r.path as string,r.hash as string]));
  const changed=[...fileMap].filter(([p,f])=>oldHashes.get(p)!==f.hash).length+[...oldHashes.keys()].filter(p=>!fileMap.has(p)).length;
  const warnings:string[]=[];if(!defines.FOCUS_POINT_DAYS)warnings.push('FOCUS_POINT_DAYS was not found; focus durations are unresolved.');
  const coverage:Coverage={indexRevision:manifestHash,supportedRoots,files:[],unsupportedRoots:[],relationships:{},verification:'Extracted installed declarations. Record accounting is not engine or campaign parity; unsupported roots and recovery remain explicit.'};
  const supportedCommon=new Set(supportedRoots.filter(s=>s.startsWith('common/')).map(s=>s.split('/')[1]));
  for(const d of fs.readdirSync(path.join(root,'common'),{withFileTypes:true}))if(d.isDirectory()&&!supportedCommon.has(d.name))coverage.unsupportedRoots.push({path:`common/${d.name}`,files:walk(path.join(root,'common',d.name),'.txt').length,reason:'Outside the approved reference-record manifest; no semantic extraction.'});
  for(const d of fs.readdirSync(path.join(root,'common'),{withFileTypes:true}))if(d.isFile()&&d.name.endsWith('.txt')&&!supportedRoots.includes(`common/${d.name}`))coverage.unsupportedRoots.push({path:`common/${d.name}`,files:1,reason:'Standalone mechanic/metadata file outside the approved record manifest; no semantic extraction.'});
  for(const d of fs.existsSync(path.join(root,'history'))?fs.readdirSync(path.join(root,'history'),{withFileTypes:true}):[])if(d.isDirectory()&&d.name!=='countries')coverage.unsupportedRoots.push({path:`history/${d.name}`,files:walk(path.join(root,'history',d.name),'.txt').length,reason:'Map/state/unit history is outside this release reference manifest.'});
  for(const d of fs.existsSync(path.join(root,'localisation'))?fs.readdirSync(path.join(root,'localisation'),{withFileTypes:true}):[])if(d.isDirectory()&&d.name!=='english')coverage.unsupportedRoots.push({path:`localisation/${d.name}`,files:walk(path.join(root,'localisation',d.name),'.yml').length,reason:'This release indexes English localization only.'});
  const countryAliases=new Map<string,any[]>();
  const sameCountryCosmetics=(nodes:Node[]):string[]=>nodes.flatMap(n=>n.key==='set_cosmetic_tag'&&typeof n.value==='string'?[n.value]:Array.isArray(n.value)&&(['if','else_if','else','hidden_effect'].includes(n.key)||/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(n.key))?sameCountryCosmetics(n.value):[]);

  for(const [source,file] of fileMap)if(source.startsWith('history/countries/')){
    const tag=path.basename(source).slice(0,3),cosmetics=sameCountryCosmetics(parseScript(file.text,{recover:true}));
    const roots=[tag,...cosmetics];const keys=roots.flatMap(root=>[root,...['fascism','democratic','neutrality','communism'].map(ideology=>root+'_'+ideology)]);
    countryAliases.set(tag,[...new Set(keys)].filter(key=>localization.has(key)).map(key=>({key,name:loc(key),evidence:localization.evidence(key),...(cosmetics.some(root=>key===root||key.startsWith(root+'_'))?{mapping:{source,hash:file.hash,rule:'Country history declares cosmetic identity'}}:{})})).filter(a=>!/[\$\[\]]/.test(a.name)));
  }
  const allEntries:Entry[]=[];const dlcs:DLCState[]=[];
  store.db.exec('BEGIN IMMEDIATE');
  try{
    store.db.exec('DELETE FROM search; DELETE FROM entries; DELETE FROM sources;');
    for(const [source,file]of fileMap){
      const entries:Entry[]=[];const parseWarnings:string[]=[];const omitted:CoverageItem['omissions']=[];
      const seen=new Map<string,number>();let nodes:Node[]=[];let constants=new Map<string,string>();
      const add=(kind:string,id:string,b:Node[],line=1,data:Record<string,any>={},titleKey=id,title?:string):Entry|undefined=>{
        if(!id||id.startsWith('@')){omitted.push({path:id||'<anonymous>',reason:'Missing semantic identifier; retained in containing script.',line});return;}
        const base=`${kind}:${source}:${id}`;const variant=(seen.get(base)||0)+1;seen.set(base,variant);
        const nameKey=titleKey;const descriptionKey=scalar(b,'description',`${id}_desc`);const sourceClass=source.startsWith('companion/')?'editorial':source.startsWith('documentation/')?'bundled-doc':'installed-script';
        const localizationEvidence=[...localization.evidence(nameKey),...localization.evidence(descriptionKey)];
        const e:Entry={uid:base+(variant>1?`:variant:${variant}`:''),id,kind,title:title??loc(nameKey),description:localization.has(descriptionKey)?loc(descriptionKey):'',source,line,version,hash:file.hash,verification:'extracted',evidence:[{class:sourceClass,source,line,hash:file.hash,gameVersion:version,rule:RULES,dependencies:[...new Set(localizationEvidence.filter(x=>x.source).map(x=>x.source as string))]}],data:{...data,nodes:b,definitionVariant:variant,aliases:[id,id.replaceAll('_',' '),...(data.aliases||[])],localizationEvidence,...(parseWarnings.length?{importWarnings:parseWarnings}:{}),script:formatScript(b)}};
        if(['focus','shared_focus','joint_focus','decision','formable','technology'].includes(kind)){
          const refs:string[]=[data.category||''];
          const names=(ns:Node[])=>{for(const n of ns){refs.push(n.key);if(/^\d+$/.test(n.key))refs.push('STATE_'+n.key);if(Array.isArray(n.value))names(n.value);else {refs.push(n.value);if(/^\d+$/.test(n.value))refs.push('STATE_'+n.value);}}};names(b);for(const ref of [...refs])if(/^[A-Z0-9]{3}$/.test(ref))refs.push(ref+'_ADJ');
          for(const part of [loc(nameKey),localization.has(descriptionKey)?loc(descriptionKey):''].join(' ').matchAll(/\[([A-Z0-9]{3})\.Get(?:Name|NameDef|Adjective)\]/g))refs.push(part[1],part[1]+'_ADJ');
          e.data.mechanicNames=Object.fromEntries([...new Set(refs)].filter(id=>localization.has(id)).map(id=>[id,loc(id)]));
          e.data.mechanicNameEvidence=Object.fromEntries(Object.keys(e.data.mechanicNames).map(id=>[id,localization.evidence(id)]));
        }
        applySourceNotes(e);entries.push(e);return e;
      };
      const omit=(n:Node,reason:string)=>omitted.push({path:n.key||'<anonymous>',line:n.line,reason});
      const structured=(n:Node,kind:string,data:Record<string,any>={},titleKey?:string)=>Array.isArray(n.value)?add(kind,n.key,n.value,n.line,{...plain(n.value),stats:numeric(n.value,constants),...data},titleKey||scalar(n.value,'name',n.key)):undefined;
      if(source.startsWith('localisation/')||source.startsWith('common/defines/')){omitted.push({path:source,reason:'Dependency document, hashed and traced by derived fields; not an entity definition.'});}
      else if(source==='companion/editorial/mechanics.json'){for(const m of mechanics){const e=add('mechanic',m.id,[],1,{editorial:true,documentation:m.body,references:m.references,find:m.find},m.id,m.title);if(e)e.description=m.summary;}}
      else if(source.endsWith('.md')){
        const kind=source.includes('console_commands_')?'command':source.includes('effects_')?'effect':source.includes('modifiers_')?'modifier':'trigger';
        for(const m of file.text.matchAll(/^## ([^\n]+)\r?\n([\s\S]*?)(?=^#{1,2} |$(?![\s\S]))/gm)){const id=m[1].trim();if(/^(Table of|All )/.test(id)||kind!=='command'&&!/^[\w.]+$/.test(id)){omitted.push({path:id,reason:'Documentation heading, not a reference command/trigger/effect/modifier.'});continue;}add(kind,id,[],file.text.slice(0,m.index).split('\n').length,{documentation:m[2].trim()},id,kind==='command'?id:loc(id));}
      }else{
        try{nodes=parseScript(file.text,{recover:true,warnings:parseWarnings});}catch(e){throw new Error(`${source}: fatal parse failure; previous index retained. ${String(e)}`);}
        warnings.push(...parseWarnings.map(w=>`${source}: ${w}`));constants=new Map(nodes.filter(n=>n.key.startsWith('@')&&typeof n.value==='string').map(n=>[n.key,n.value as string]));
        if(source.includes('/scripted_effects/')||source.includes('/dynamic_modifiers/')){for(const n of blocks(nodes))structured(n,source.includes('/scripted_effects/')?'scripted_effect':'dynamic_modifier');for(const n of nodes)if(!Array.isArray(n.value))omit(n,'Script metadata/local constant retained in source.');}
        else if(source.includes('/country_tags/')){for(const n of nodes)if(typeof n.value==='string'&&/^[A-Z0-9]{3}$/.test(n.key))add('country',n.key,[n],n.line,{tag:n.key,aliases:[path.basename(n.value,'.txt'),...(countryAliases.get(n.key)||[]).map(a=>a.name)],nameAliases:countryAliases.get(n.key)||[]},n.key,localization.has(n.key)?loc(n.key):path.basename(n.value,'.txt'));else omit(n,'Not a country tag definition.');}
        else if(source.startsWith('history/countries/')){const tag=path.basename(source).slice(0,3);add('country_history',tag,nodes,1,{tag,countries:[tag],semanticScope:tag,sourceScope:[`history:${tag}`]},tag,`${loc(tag)} starting history`);}
        else if(source.includes('/national_focus/')||source.includes('/continuous_focus/')){
          for(const tree of nodes){
            if(['focus_tree','continuous_focus_palette'].includes(tree.key)&&Array.isArray(tree.value)){
              const b=tree.value;const id=scalar(b,'id',path.basename(source,'.txt'));const focusNodes=children(b,'focus').filter(n=>Array.isArray(n.value));const continuous=tree.key==='continuous_focus_palette';
              const parent=add(continuous?'continuous_focus_palette':'focus_tree',id,b.filter(n=>n.key!=='focus'),tree.line,{countries:[...new Set([...collect(block(b,'country'),'tag'),...collect(block(b,'country'),'original_tag')])],focusIds:focusNodes.map(n=>scalar(n.value as Node[],'id')),sharedIds:children(b,'shared_focus').map(n=>n.value).filter(v=>typeof v==='string'),countryScript:formatScript(block(b,'country')),childContainers:['focus']});
              for(const f of focusNodes)addFocus(f,continuous?'continuous_focus':'focus',id,parent?.uid);
            }else if(['shared_focus','joint_focus'].includes(tree.key)&&Array.isArray(tree.value))addFocus(tree,tree.key,'');else omit(tree,tree.key.startsWith('@')?'Local constant retained as dependency.':'Unsupported top-level focus construct.');
          }
          function addFocus(n:Node,kind:string,treeId:string,parentUid?:string){
            const b=n.value as Node[];const id=scalar(b,'id');const stats=numeric(b,constants);const rawCost=scalar(b,'cost','10');const cost=Number(rawCost.startsWith('@')?constants.get(rawCost):rawCost);const reward=block(b,'completion_reward');
            const labels:Record<string,string>={add_political_power:'Political power',add_stability:'Stability',add_war_support:'War support',add_manpower:'Manpower',army_experience:'Army experience',navy_experience:'Navy experience',air_experience:'Air experience'};
            const summary=reward.flatMap(n=>{if(n.key==='custom_effect_tooltip'&&typeof n.value==='string')return [loc(n.value)];if(n.key==='add_ideas'&&typeof n.value==='string')return [`Add idea: ${loc(n.value)}`];if(n.key==='remove_ideas'&&typeof n.value==='string')return [`Remove idea: ${loc(n.value)}`];if(labels[n.key]&&typeof n.value==='string'&&Number.isFinite(Number(n.value))){const v=Number(n.value);return [`${labels[n.key]}: ${v>=0?'+':''}${['add_stability','add_war_support'].includes(n.key)?Math.round(v*100)+'%':v}`];}if(['if','else_if','else','hidden_effect','random_list'].includes(n.key))return ['Conditional or hidden effects - inspect the script below.'];return [];});
            add(kind,id,b,n.line,{treeId,semanticScope:treeId,parentUid,cost:stats.cost??10,days:Number.isFinite(cost)&&defines.FOCUS_POINT_DAYS?cost*defines.FOCUS_POINT_DAYS:null,x:stats.x??0,y:stats.y??0,relative:scalar(b,'relative_position_id'),prerequisites:children(b,'prerequisite').map(p=>Array.isArray(p.value)?collect(p.value,'focus'):[]).filter(g=>g.length),exclusive:collect(block(b,'mutually_exclusive'),'focus'),sharedIds:children(b,'shared_focus').map(n=>n.value).filter(v=>typeof v==='string'),dlcs:[...new Set(collect(b,'has_dlc'))],conditions:Object.fromEntries([...conditionKeys].filter(k=>block(b,k).length).map(k=>[k,block(b,k)])),effects:formatScript(reward),effectsSummary:[...new Set(summary)],offsets:children(b,'offset').map(n=>n.value),durationEvidence:{rule:'local cost * FOCUS_POINT_DAYS',rawCost,constant:rawCost.startsWith('@')?constants.get(rawCost):undefined,definesHashes:defineFiles.map(f=>({source:path.relative(root,f).replaceAll('\\','/'),hash:fileMap.get(path.relative(root,f).replaceAll('\\','/'))?.hash}))}});
          }
        }
        else if(source.includes('/units/equipment/modules/')){
          for(const wrapper of children(nodes,'equipment_modules'))if(Array.isArray(wrapper.value)){const inherited=wrapper.value.filter(n=>conditionKeys.has(n.key));for(const n of wrapper.value)if(Array.isArray(n.value)&&!conditionKeys.has(n.key))structured(n,'module',{inheritedConditions:inherited,category:scalar(n.value,'category'),addStats:numeric(block(n.value,'add_stats'),constants),multiplyStats:numeric(block(n.value,'multiply_stats'),constants),missionStats:children(n.value,'mission_type_stats'),constraints:n.value.filter(c=>['allowed_module_categories','forbid_equipment_type','allow_equipment_type','allow_mission_type','mission_type_stats','add_equipment_type','module_count_limit','category_count_limit'].includes(c.key))});else omit(n,'Module-wrapper condition/metadata retained on each module.');}
          for(const n of nodes)if(n.key!=='equipment_modules')omit(n,'Unsupported module root/local constant.');
        }
        else if(source.includes('/units/equipment/upgrades/')){for(const n of wrapped(nodes,'upgrades'))if(Array.isArray(n.value))structured(n,'upgrade',{addStats:numeric(block(n.value,'add_stats'),constants),multiplyStats:numeric(block(n.value,'multiply_stats'),constants),levelRequirements:children(n.value,'level_requirements'),constraints:n.value.filter(c=>['level_requirements','resource_cost_thresholds','linear_cost'].includes(c.key))});for(const n of nodes)if(n.key!=='upgrades')omit(n,'Unsupported upgrade root/local constant.');}
        else if(source.includes('/units/equipment/')){for(const n of wrapped(nodes,'equipments'))if(Array.isArray(n.value))structured(n,'equipment',{resources:numeric(block(n.value,'resources'),constants),constraints:n.value.filter(c=>['module_slots','module_count_limit','category_count_limit','allowed_module_categories','default_modules','type_override'].includes(c.key))});for(const n of nodes)if(n.key!=='equipments')omit(n,'Unsupported equipment root/local constant.');}
        else if(source.startsWith('common/units/')){for(const n of wrapped(nodes,'sub_units'))if(Array.isArray(n.value))structured(n,'unit',{need:numeric(block(n.value,'need'),constants),support:scalar(n.value,'group')==='support'&&scalar(n.value,'regimental')==='no'});for(const n of nodes)if(n.key!=='sub_units')omit(n,'Unit metadata/category file retained as unsupported record.');}
        else if(source.includes('/technologies/')){for(const n of wrapped(nodes,'technologies'))if(Array.isArray(n.value))structured(n,'technology',{enables:collect(block(n.value,'enable_equipments'),''),year:numeric(n.value,constants).start_year,paths:children(n.value,'path'),conditions:n.value.filter(c=>conditionKeys.has(c.key))});for(const n of nodes)if(n.key!=='technologies')omit(n,'Technology metadata/local constant outside technologies wrapper.');}
        else if(source.includes('/idea_tags/')){for(const n of wrapped(nodes,'idea_categories'))structured(n,'idea_category',{slots:children(n.value as Node[],'slot'),characterSlots:children(n.value as Node[],'character_slot')});for(const n of nodes)if(n.key!=='idea_categories')omit(n,'Idea-slot ledger/metadata retained as raw unsupported record.');}
        else if(source.includes('/ideas/')){for(const group of blocks(wrapped(nodes,'ideas')))for(const n of blocks(group.value))if(!conditionKeys.has(n.key))structured(n,'idea',{group:group.key,modifiers:numeric(block(n.value,'modifier'),constants),inheritedConditions:group.value.filter(c=>conditionKeys.has(c.key)),constraints:n.value.filter(c=>conditionKeys.has(c.key))});for(const n of nodes)if(n.key!=='ideas')omit(n,'Idea metadata/local constant outside ideas wrapper.');}
        else if(source.includes('/decisions/categories/')){for(const n of blocks(nodes))structured(n,'decision_category');for(const n of nodes)if(!Array.isArray(n.value))omit(n,'Category metadata/local constant.');}
        else if(source.includes('/decisions/')){
          const metadata=new Set(['allowed','visible','available','icon','priority','picture','custom_icon','on_map_mode','on_map_area','scripted_gui']);
          for(const category of blocks(nodes))for(const n of category.value){if(!Array.isArray(n.value)||metadata.has(n.key)){omit(n,'Decision-category metadata retained in child inherited conditions or source.');continue;}const b=n.value;const formable=/formable|form_|reunif|restore|reintegrat/.test(source+' '+n.key)||collect(b,'set_cosmetic_tag').length>0;structured(n,formable?'formable':'decision',{subtype:'decision',category:category.key,semanticScope:category.key,countries:[...new Set([...collect(block(b,'allowed'),'original_tag'),...collect(block(b,'allowed'),'tag')])],inheritedConditions:category.value.filter(c=>conditionKeys.has(c.key)),dlcs:[...new Set(collect(b,'has_dlc'))],requirements:formatScript([...block(b,'allowed'),...block(b,'available')]),effects:formatScript(block(b,'complete_effect')),conditions:{allowed:block(b,'allowed'),available:block(b,'available')}});}
          for(const n of nodes)if(!Array.isArray(n.value))omit(n,'Decision file metadata/local constant.');
        }
        else if(source.includes('/doctrines/')){
          const kind=source.includes('/folders/')?'doctrine_folder':source.includes('/tracks/')?'doctrine_track':'doctrine';
          for(const n of blocks(nodes)){const parent=structured(n,kind,{subtype:source.includes('/grand_doctrines/')?'grand_doctrine':source.includes('/subdoctrines/')?'subdoctrine':kind,childContainers:['rewards','milestones']});if(!parent)continue;
            for(const reward of blocks(wrapped(n.value,'rewards')))structured(reward,'doctrine_reward',{parentUid:parent.uid,parentId:parent.id,semanticScope:parent.id,inheritedConditions:n.value.filter(c=>conditionKeys.has(c.key)),scopedStats:reward.value});
            let i=0;for(const milestone of wrapped(n.value,'milestones'))if(Array.isArray(milestone.value)){i++;add('doctrine_milestone',`${parent.id}.milestone.${i}`,milestone.value,milestone.line,{parentUid:parent.uid,parentId:parent.id,semanticScope:parent.id,anonymousIdentity:true,revalidation:'Parent-qualified positional locator; revalidate whenever index revision changes.',inheritedConditions:n.value.filter(c=>conditionKeys.has(c.key)),scopedStats:milestone.value},`${parent.id}.milestone.${i}`,`${parent.title}: milestone ${i}`);}
          }
          for(const n of nodes)if(!Array.isArray(n.value))omit(n,'Doctrine metadata/local constant.');
        }
        else if(source.includes('/characters/')){
          for(const n of blocks(wrapped(nodes,'characters'))){const roles=new Set(['country_leader','field_marshal','corps_commander','navy_leader','advisor']);const parent=structured(n,'character',{countries:[n.key.slice(0,3)],childContainers:['instance',...roles]});if(!parent)continue;
            let i=0;for(const instance of children(n.value,'instance'))if(Array.isArray(instance.value)){i++;const instanceId=`${n.key}.instance.${i}`;const child=add('character_instance',instanceId,instance.value,instance.line,{parentUid:parent.uid,parentId:n.key,semanticScope:n.key,anonymousIdentity:true,revalidation:'Positional instance; revalidate on reference refresh.',inheritedConditions:n.value.filter(c=>conditionKeys.has(c.key)),childContainers:[...roles]},scalar(instance.value,'name',n.key),`${loc(scalar(instance.value,'name',n.key))}: instance ${i}`);if(child)addRoles(instance.value,child,roles,n.value.filter(c=>conditionKeys.has(c.key)));}
            addRoles(n.value,parent,roles,[]);
          }
          function addRoles(b:Node[],parent:Entry,roles:Set<string>,inherited:Node[]){const seenRoles=new Map<string,number>();for(const role of blocks(b))if(roles.has(role.key)){const count=(seenRoles.get(role.key)||0)+1;seenRoles.set(role.key,count);add('character_role',`${parent.id}.${role.key}.${count}`,role.value,role.line,{parentUid:parent.uid,parentId:parent.id,semanticScope:parent.id,role:role.key,anonymousIdentity:true,revalidation:'Positional role; revalidate after source change.',traits:collect(block(role.value,'traits'),''),inheritedConditions:[...inherited,...b.filter(c=>conditionKeys.has(c.key))],countries:[parent.id.slice(0,3)]},parent.id,`${parent.title}: ${role.key.replaceAll('_',' ')}`);}}
          for(const n of nodes)if(n.key!=='characters')omit(n,'Character metadata outside characters wrapper.');
        }
        else if(source.startsWith('events/')){
          const namespaces=children(nodes,'add_namespace').map(n=>n.value);
          for(const n of nodes)if(Array.isArray(n.value)&&['country_event','news_event','state_event','unit_leader_event','operative_leader_event'].includes(n.key)){
            const b=n.value;const id=scalar(b,'id');const parent=add('event',id,b,n.line,{eventType:n.key,namespaces,trigger:block(b,'trigger'),isTriggeredOnly:scalar(b,'is_triggered_only'),childContainers:['immediate','option','after']},scalar(b,'title',id));if(!parent)continue;
            const stageCounts=new Map<string,number>();for(const stage of blocks(b))if(['immediate','option','after'].includes(stage.key)){const count=(stageCounts.get(stage.key)||0)+1;stageCounts.set(stage.key,count);const name=scalar(stage.value,'name',`${id}.${stage.key}.${count}`);add(stage.key==='option'?'event_option':'event_stage',name,stage.value,stage.line,{parentUid:parent.uid,parentId:id,semanticScope:id,stage:stage.key,sourceScope:[`${stage.key}[${count}]`],anonymousIdentity:!scalar(stage.value,'name'),revalidation:!scalar(stage.value,'name')?'Anonymous ordered stage; revalidate with index revision.':undefined,inheritedConditions:b.filter(c=>conditionKeys.has(c.key))},name,stage.key==='option'?loc(name):`${parent.title}: ${stage.key}`);}
          }else omit(n,n.key==='add_namespace'?'Namespace retained on event records.':'Unsupported event root/local constant.');
        }
        else if(source.includes('/country_leader/')||source.includes('/unit_leader/')){for(const n of blocks(wrapped(nodes,'leader_traits')))structured(n,'trait',{roleFamily:source.includes('/unit_leader/')?'unit-leader':'country-leader'});for(const n of nodes)if(n.key!=='leader_traits')omit(n,'Trait metadata/local constant.');}
        else if(source==='common/combat_tactics.txt'){for(const n of blocks(nodes))if(n.key.startsWith('tactic_'))structured(n,'tactic');else omit(n,'Tactic phase list/metadata, retained in source.');for(const n of nodes)if(!Array.isArray(n.value))omit(n,'Tactic scalar metadata.');}
        else if(source.startsWith('dlc_metadata/')){
          for(const n of blocks(wrapped(nodes,'dlcs'))){const name=scalar(n.value,'name',n.key);structured(n,'dlc',{},name);const descriptors=[...fileMap.keys()].filter(p=>(p.startsWith('dlc/')||p.startsWith('integrated_dlc/'))&&path.basename(p,'.dlc')===n.key);const integrated=descriptors.some(p=>p.startsWith('integrated_dlc/'));const disabled=launcherValid&&(load.disabled_dlcs as string[]).some(d=>d.includes(n.key));dlcs.push({id:n.key,name,disabled,integrated,metadataKnown:true,installed:integrated?{value:'yes',source:'Integrated base-game descriptor',checkedAt}:dlcPayload(descriptors),owned:{value:'unknown',source:'No entitlement API; user confirmation required'},enabled:{value:integrated?'yes':disabled?'no':'unknown',source:integrated?'Integrated descriptor':disabled?'Launcher disabled_dlcs':'Launcher does not independently prove enabled content',checkedAt}});}
          for(const n of nodes)if(n.key!=='dlcs')omit(n,'DLC metadata wrapper not supported.');
        }
        else if(source.endsWith('.dlc')){const id=path.basename(source,'.dlc');const name=scalar(nodes,'name',id);if(source.startsWith('integrated_dlc/')&&!dlcs.some(d=>d.id===id))dlcs.push({id,name,disabled:false,integrated:true,metadataKnown:false,installed:{value:'yes',source,checkedAt},owned:{value:'unknown',source:'Integrated files do not establish entitlement'},enabled:{value:'yes',source:'Integrated descriptor',checkedAt}});omitted.push({path:id,reason:'DLC descriptor used only as independent installed/integrated evidence; no ownership inferred.'});}
        else{
          const kind=source.includes('/terrain/')?'terrain':source.includes('/buildings/')?'building':source.includes('/special_projects/')?'project':'organization';const roots=kind==='terrain'?wrapped(nodes,'categories'):kind==='building'?wrapped(nodes,'buildings'):nodes;
          for(const n of blocks(roots))structured(n,kind);for(const n of nodes)if(!Array.isArray(n.value)||kind==='terrain'&&!['categories'].includes(n.key)||kind==='building'&&n.key!=='buildings')omit(n,'Structural metadata/local constant or unsupported root retained in source.');
        }
      }
      const records=reconcileRecords(discoverRecords(source,nodes,file.text),entries,omitted);
      for(const e of entries){store.insert(e);allEntries.push(e);}
      const kinds:Record<string,number>={};for(const e of entries)kinds[e.kind]=(kinds[e.kind]||0)+1;
      const missing=records.filter(r=>r.state==='omitted'&&r.kind!=='metadata');
      coverage.files.push({source,hash:file.hash,status:parseWarnings.length?'recovered':missing.length?'unsupported':'complete',discovered:records.length,emitted:entries.length,accounted:records.filter(r=>r.state==='emitted'||!!r.reason).length,omissions:records.filter(r=>r.state==='omitted').map(r=>({path:r.path,line:r.line,reason:r.reason!})),warnings:parseWarnings,kinds,records:records.map(({state,...r})=>({...r,disposition:state!}))});
      store.db.prepare('INSERT OR REPLACE INTO sources VALUES(?,?)').run(source,file.hash);
      onProgress?.(source,coverage.files.length,fileMap.size);
    }
    // Inherited spirit costs remain references to category evidence, not copied verified gameplay numbers.
    const categories=new Map(allEntries.filter(e=>e.kind==='idea_category').map(e=>[e.id,e]));
    for(const idea of allEntries.filter(e=>e.kind==='idea')){const category=categories.get(idea.data.group);if(category){idea.data.ideaCategory={id:category.id,type:category.data.type,declaredBaseCost:category.data.stats?.cost,source:category.source,line:category.line,hash:category.hash};store.db.prepare('UPDATE entries SET payload=? WHERE uid=?').run(JSON.stringify(idea),idea.uid);}}
    // Attach bounded, uniquely resolved idea modifiers and event names from this same reference snapshot.
    attachScriptContext(allEntries,localization);
    const related=new Map<string,Entry[]>();for(const e of allEntries)if(['idea','event','decision_category'].includes(e.kind)){const key=e.kind+':'+e.id;related.set(key,[...(related.get(key)||[]),e]);}
    for(const e of allEntries)if(['focus','shared_focus','joint_focus','decision','formable','technology'].includes(e.kind)){
      const ids=[...new Set(['idea','add_ideas','remove_ideas','add_idea','remove_idea'].flatMap(key=>collect([...(e.data.nodes||[]),...Object.values(e.data.mechanicScripts||{}).flatMap((s:any)=>s.nodes||[])],key)))];
      const links:Record<string,any>={};for(const id of ids.slice(0,64)){const found=related.get('idea:'+id)||[];if(found.length===1){const idea=found[0];const titleKey=scalar(idea.data.nodes||[],'name',idea.id);const ideaTitle=localization.has(titleKey)?loc(titleKey):idea.title;e.data.mechanicNames[id]=ideaTitle;e.data.mechanicNameEvidence[id]=localization.evidence(titleKey);links[id]={title:ideaTitle,modifiers:block(idea.data.nodes||[],'modifier'),source:idea.source,line:idea.line,hash:idea.hash,version:idea.version};}else if(found.length>1)links[id]={ambiguous:true};}
      e.data.mechanicIdeas=links;
      for(const id of collect([...(e.data.nodes||[]),...Object.values(e.data.mechanicScripts||{}).flatMap((s:any)=>s.nodes||[])],'id')){const events=related.get('event:'+id)||[];if(events.length===1)e.data.mechanicNames[id]=events[0].title;}
      const category=related.get('decision_category:'+e.data.category)||[];if(category.length===1){const c=category[0];e.data.categoryTitle=c.title;e.data.categoryConditions=(c.data.nodes||[]).filter((n:Node)=>['allowed','visible','available'].includes(n.key));e.data.categoryEvidence={source:c.source,line:c.line,hash:c.hash,version:c.version};}
      store.db.prepare('UPDATE entries SET payload=? WHERE uid=?').run(JSON.stringify(e),e.uid);
    }
    const categoryEntries=buildCategoryEntries(allEntries);for(const e of categoryEntries){store.insert(e);allEntries.push(e);}
    if(categoryEntries.length)coverage.files.push({source:'companion/derived/module_categories',hash:hash(categoryEntries.map(e=>e.hash).join('\n')),status:'complete',discovered:categoryEntries.length,emitted:categoryEntries.length,accounted:categoryEntries.length,omissions:[],warnings:[],kinds:{module_category:categoryEntries.length},records:categoryEntries.map(e=>({path:e.id,line:1,uid:e.uid,disposition:'emitted'}))});
    const edges=buildRelationships(allEntries);store.replaceRelationships(edges);
    for(const r of store.db.prepare('SELECT payload FROM relationships').all()){const edge=JSON.parse(r.payload as string);coverage.relationships[edge.resolution]=(coverage.relationships[edge.resolution]||0)+1;}
    const counts=Object.fromEntries(store.db.prepare('SELECT kind,COUNT(*) AS total FROM entries GROUP BY kind').all().map(r=>[r.kind as string,Number(r.total)]));
    const meta:Meta={root,version,gameVersion:version,appVersion:'0.4.0',dbSchemaVersion:3,importerRevision:5,indexRevision:manifestHash,manifestHash,indexedAt:checkedAt,checkedAt,counts,files:fileMap.size,changedFiles:changed,warnings,dlcs,mods:load.enabled_mods||[],defines};
    store.setSetting('coverage',coverage);store.setSetting('meta',meta);store.setSetting('gameRoot',root);store.setSetting('localizationHash',localization.digest);store.setSetting('indexerRevision',5);store.setSetting('guideSourceHashes',guideSourceHashes);
    store.db.exec('COMMIT');return meta;
  }catch(e){store.db.exec('ROLLBACK');throw e;}
}

export const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export function walk(root:string,extension:string):string[]{
  if(!fs.existsSync(root))return [];
  return fs.readdirSync(root,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(d=>d.isDirectory()?walk(path.join(root,d.name),extension):d.name.endsWith(extension)?[path.join(root,d.name)]:[]);
}
export function discoverGame():string {
  if(process.env.HOI4_GAME_DIR && fs.existsSync(path.join(process.env.HOI4_GAME_DIR,'hoi4.exe')))return process.env.HOI4_GAME_DIR;
  const roots=['C:\\Program Files (x86)\\Steam','C:\\Program Files\\Steam'];
  for(const root of [...roots]) {
    const libraries=path.join(root,'steamapps','libraryfolders.vdf');
    if(fs.existsSync(libraries)) for(const m of fs.readFileSync(libraries,'utf8').matchAll(/"path"\s+"([^"]+)"/g))roots.push(m[1].replaceAll('\\\\','\\'));
  }
  return roots.map(r=>path.join(r,'steamapps','common','Hearts of Iron IV')).find(r=>fs.existsSync(path.join(r,'hoi4.exe'))) || '';
}
export function userGameDirectory():string {
  const home=process.env.USERPROFILE || '';
  return [path.join(process.env.OneDrive || path.join(home,'OneDrive'),'Documents','Paradox Interactive','Hearts of Iron IV'),path.join(home,'Documents','Paradox Interactive','Hearts of Iron IV')].find(p=>fs.existsSync(p)) || '';
}
export function cleanText(text:string):string{return text.replace(/§./g,'').replace(/£[\w_]+/g,'').replace(/\\n/g,'\n').replace(/\\"/g,'"').trim();}
