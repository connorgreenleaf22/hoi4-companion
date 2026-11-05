import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Entry, Profile, Resolution, Relationship, TargetRef } from '../src/types';
import {ensureSchema,stampEntry} from './migrations';

export const dataDirectory=()=>process.env.HOI4_DATA_DIR || path.join(process.env.APPDATA || os.homedir(),'HOI4 Companion');
export class ProfileWriteRejected extends Error {
  constructor(public code:string,message:string,public current:Profile|null){super(message);}
}
export function openStore(directory=dataDirectory()) {
  mkdirSync(directory,{recursive:true});
  const db=new DatabaseSync(path.join(directory,'companion.sqlite'));
  try{ensureSchema(db,directory);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');}catch(e){db.close();throw e;}
  const getSetting=<T>(key:string,fallback:T):T=>{const r=db.prepare('SELECT value FROM settings WHERE key=?').get(key);return r?JSON.parse(r.value as string):fallback;};
  const setSetting=(key:string,value:unknown)=>db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run(key,JSON.stringify(value));
  const readEntry=(uid:string):Entry|undefined=>{const r=db.prepare('SELECT payload FROM entries WHERE uid=?').get(uid);return r?JSON.parse(r.payload as string):undefined;};
  function resolve(reference:string,kind?:string,scope?:string,includeAliases=true,kinds?:string[]):Resolution{
    const explicit=reference.startsWith('definition:');
    const direct=readEntry(explicit?reference.slice('definition:'.length):reference);
    const aliases=explicit?[]:db.prepare('SELECT entity_key FROM aliases WHERE alias=?').all(reference).map(r=>String(r.entity_key));
    const reused=aliases.length>1;
    let candidates:Entry[]=[];let known=false;
    if(direct&&!reused)candidates=[direct];
    else if(!explicit){
      const keys=reference.startsWith('vanilla:')?[reference]:aliases;known=keys.length>0;
      if(keys.length)candidates=keys.flatMap(k=>db.prepare('SELECT e.payload FROM entries e JOIN entity_definitions d ON e.uid=d.uid WHERE d.entity_key=?').all(k).map(r=>JSON.parse(r.payload as string)));
      else if(!reference.includes(':'))candidates=db.prepare('SELECT payload FROM entries WHERE id=?').all(reference).map(r=>JSON.parse(r.payload as string));
    }
    candidates=[...new Map(candidates.filter(e=>(!kind||e.kind===kind)&&(!kinds||kinds.includes(e.kind))&&(!scope||[e.data.semanticScope,e.data.treeId,e.data.parentKey].includes(scope))).map(e=>[e.uid,e])).values()].sort((a,b)=>a.uid.localeCompare(b.uid));
    if(includeAliases)candidates=candidates.map(e=>{const refs=db.prepare('SELECT a.alias,(SELECT COUNT(*) FROM aliases b WHERE b.alias=a.alias) AS targets FROM aliases a WHERE a.entity_key=? ORDER BY a.alias').all(e.entityKey||'');return {...e,data:{...e.data,legacyAliases:refs.filter(r=>Number(r.targets)===1).map(r=>String(r.alias)),ambiguousAliases:refs.filter(r=>Number(r.targets)>1).map(r=>String(r.alias))}};});
    const status=reused||candidates.length>1?'ambiguous':candidates.length===1?'resolved':known?'stale':'unresolved';
    return {reference,status,reason:reused?'legacy-alias-reused':status==='resolved'?'exact-reference':status==='ambiguous'?'multiple-definitions':status==='stale'?'definition-removed-or-renamed':'target-not-indexed',candidates,entry:status==='resolved'?candidates[0]:undefined,indexRevision:getSetting<any>('meta',null)?.indexRevision||'legacy'};
  }
  const entry=(uid:string)=>resolve(uid).entry;
  const putEntry=db.prepare('INSERT OR REPLACE INTO entries VALUES(?,?,?,?,?,?,?)');
  const putSearch=db.prepare('INSERT INTO search VALUES(?,?,?,?)');
  const existsEntry=db.prepare('SELECT 1 FROM entries WHERE uid=?');
  const putDefinition=db.prepare('INSERT OR REPLACE INTO entity_definitions VALUES(?,?)');
  const putAlias=db.prepare('INSERT OR REPLACE INTO aliases VALUES(?,?,?)');
  const deleteSearch=db.prepare('DELETE FROM search WHERE uid=?');
  function insert(e:Entry){stampEntry(e);const replacing=!!existsEntry.get(e.uid);putEntry.run(e.uid,e.id,e.kind,e.title,e.description,e.source,JSON.stringify(e));if(replacing)deleteSearch.run(e.uid);putSearch.run(e.uid,[e.id,...(e.data.aliases||[])].join(' '),e.title,e.description);putDefinition.run(e.uid,e.entityKey!);putAlias.run(e.uid,e.entityKey!,JSON.stringify({id:e.id,title:e.title,kind:e.kind,source:e.source}));}
  function removeSource(source:string){db.prepare('DELETE FROM search WHERE uid IN (SELECT uid FROM entries WHERE source=?)').run(source);db.prepare('DELETE FROM entries WHERE source=?').run(source);}
  const readProfile=(payload:string):Profile=>{const p=JSON.parse(payload);return {...p,revision:p.revision??0,...(!p.dlcStates&&p.dlcConfirmed?{legacyDlcAssertions:p.legacyDlcAssertions||p.dlcs}:{} )};};
  function resolveTarget(ref:TargetRef){
    const primary=resolve(ref.entityKey||ref.id,ref.kind,ref.scope,false,ref.kinds);
    // Shared/joint definitions are global records even when referenced by a particular focus tree.
    if(!primary.candidates.length&&ref.scope&&ref.kinds?.includes('focus'))return resolve(ref.entityKey||ref.id,undefined,undefined,false,ref.kinds.filter(k=>['shared_focus','joint_focus'].includes(k)));
    return primary;
  }
  function replaceRelationships(edges:Relationship[]){
    db.exec('DELETE FROM relationships; DELETE FROM entity_definitions WHERE uid NOT IN (SELECT uid FROM entries);');
    const put=db.prepare('INSERT INTO relationships VALUES(?,?,?,?,?)');
    const cache=new Map<string,{status:Resolution['status'];reason:string;to?:string;candidates:string[]}>();
    for(const edge of edges){
      if(edge.resolution!=='unsupported'){
        const key=JSON.stringify(edge.targetRef);let resolved=cache.get(key);
        if(!resolved){const r=resolveTarget(edge.targetRef);resolved={status:r.status,reason:r.reason,to:r.entry?.uid,candidates:r.candidates.map(e=>e.uid)};cache.set(key,resolved);}
        edge.resolution=resolved.status;edge.reason=resolved.reason;edge.to=resolved.to;edge.candidates=resolved.candidates;
      }
      put.run(edge.id,edge.from,edge.to||null,edge.type,JSON.stringify(edge));
    }
  }
  const profile=(id:string):Profile|null=>{const r=db.prepare('SELECT payload FROM profiles WHERE id=?').get(id);return r?readProfile(r.payload as string):null;};
  const listProfiles=():Profile[]=>(db.prepare('SELECT payload FROM profiles ORDER BY rowid').all()).map(r=>readProfile(r.payload as string));
  const selectedProfileId=()=>{const profiles=listProfiles();const selected=getSetting('selectedProfileId','');return profiles.some(p=>p.id===selected)?selected:profiles[0]?.id||'';};
  // Lock before reading: separate desktop services must compare and write one revision atomically.
  function saveProfile(p:Profile,options:{semanticApply?:boolean;beforeWrite?:(current:Profile|null)=>void}={}):{saved?:Profile;current?:Profile|null;conflict:boolean}{
    db.exec('BEGIN IMMEDIATE');
    try{
      const current=profile(p.id);const expected=p.revision??0;
      const deleted=!!db.prepare('SELECT id FROM profile_tombstones WHERE id=?').get(p.id);
      if(current ? expected!==current.revision : expected!==0||deleted){db.exec('COMMIT');return {conflict:true,current};}
      if(current?.planner&&(!p.planner||p.exportSchemaVersion!==3))throw new ProfileWriteRejected('writer-incompatible','This campaign has v0.3 plans. Use a compatible client so saved alternatives and checklists are preserved.',current);
      if(current&&!current.planner&&p.planner&&!options.semanticApply)throw new ProfileWriteRejected('preview-required','Review and apply the first planner preview before saving alternatives to this legacy campaign.',current);
      if(current?.planner&&p.planner&&!options.semanticApply){
        const semantics=(v:Profile)=>JSON.stringify({country:v.country,activePlanId:v.planner!.activePlanId,plans:v.planner!.plans});
        if(semantics(current)!==semantics(p))throw new ProfileWriteRejected('preview-required','Review a new planner preview before applying changes to a plan or its active selection.',current);
      }
      options.beforeWrite?.(current);
      const saved={...p,revision:(current?.revision??0)+1};
      db.prepare('INSERT INTO profiles(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(saved.id,JSON.stringify(saved));
      db.exec('COMMIT');return {conflict:false,saved};
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  function deleteProfile(id:string,revision:number):{conflict:boolean;current?:Profile|null;selectedProfileId?:string}{
    db.exec('BEGIN IMMEDIATE');
    try{
      const current=profile(id);
      if(!current||current.revision!==revision){db.exec('COMMIT');return {conflict:true,current};}
      db.prepare('DELETE FROM profiles WHERE id=?').run(id);
      db.prepare('INSERT OR IGNORE INTO profile_tombstones(id) VALUES(?)').run(id);
      const selected=selectedProfileId();setSetting('selectedProfileId',selected);
      db.exec('COMMIT');return {conflict:false,selectedProfileId:selected};
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  return {db,directory,getSetting,setSetting,entry,resolve,resolveTarget,replaceRelationships,insert,removeSource,listProfiles,profile,saveProfile,deleteProfile,selectedProfileId};
}
export type Store=ReturnType<typeof openStore>;
