// Explicit installed-source copy with synthetic campaigns; no personal profiles, provider state or game launches.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {DatabaseSync} from 'node:sqlite';
import {openStore} from '../../server/store';import {validateProfile} from '../../server/api';import type {Entry,Meta} from '../../src/types';

export const alphaObjective='Prepare Germany for a possible 1941 eastern campaign with infantry and medium tanks, research and production. Prioritize fun, then winning, then efficiency.';
export const alphaManualContext='TEST SCENARIO — manual inputs, not a real campaign: 1936-01-01; historical German political route; current research, production, forces and stockpiles remain unknown. Target 1941 is tentative. All DLC enabled, no mods, no declared exceptions. Prefer an infantry holding force and a separate mobile force.';
export const alphaName='ALPHA-01 synthetic Germany preparation';
export const alphaCompositionA='Player-entered proposal A: 9 infantry battalions with engineers; hold the line. Equipment, research and support availability unverified.';
export const alphaCompositionB='Player-entered proposal B: 6 medium armor and 4 motorized battalions; mobile role. Design modules, doctrine, supply and fuel unverified.';
export type AlphaFixture={sourceFile:string;sourceSha256:string;entriesCopied:number;meta:Meta;tree:Pick<Entry,'uid'|'id'|'source'|'hash'|'version'|'line'>;focus:Pick<Entry,'uid'|'id'|'source'|'hash'|'version'|'line'>;unit:Pick<Entry,'uid'|'id'|'source'|'hash'|'version'|'line'>};
export async function streamHash(file:string){const hash=createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex');}

export async function seedAlphaFixture(sourceIndex:string,directory:string):Promise<AlphaFixture>{
 if(!path.isAbsolute(sourceIndex)||!fs.statSync(sourceIndex).isFile())throw Error('An explicit absolute source-index path is required.');
 const sourceFile=fs.realpathSync.native(sourceIndex),sourceSha256=await streamHash(sourceFile),source=new DatabaseSync(sourceFile,{readOnly:true}),seed=openStore(directory);let entriesCopied=0;
 try{
  const metadata=source.prepare("SELECT value FROM settings WHERE key='meta'").get();assert.ok(metadata);const meta:Meta=JSON.parse(String(metadata.value));assert.equal(meta.version,'1.19.5.0','ALPHA-01 current-patch test refuses a substituted historical corpus.');assert.ok(meta.indexRevision);assert.deepEqual(meta.mods,[]);
  const find=(kind:string,id:string):Entry=>{const rows=source.prepare('SELECT payload FROM entries WHERE kind=? AND id=?').all(kind,id);assert.equal(rows.length,1,`Expected unique ${kind}:${id}`);return JSON.parse(String(rows[0].payload));};
  const tree=find('focus_tree','german_focus'),focus=find('focus','GER_prioritize_economic_growth'),unit=find('unit','infantry');assert.equal(tree.source,'common/national_focus/germany.txt');assert.equal(focus.source,tree.source);assert.equal(focus.data.treeId,tree.id);assert.equal(focus.version,meta.version);assert.ok(!focus.data.prerequisites?.flat().length);
  seed.setSetting('meta',meta);seed.setSetting('gameRoot',path.join(directory,'absent-game-installation'));
  seed.db.exec('BEGIN');try{for(const row of source.prepare('SELECT payload FROM entries').iterate()){seed.insert(JSON.parse(String(row.payload)));entriesCopied++;}const putRelationship=seed.db.prepare('INSERT INTO relationships VALUES(?,?,?,?,?)');for(const row of source.prepare('SELECT id,from_uid,to_uid,type,payload FROM relationships').iterate())putRelationship.run(row.id,row.from_uid,row.to_uid,row.type,row.payload);seed.db.exec('COMMIT');}catch(error){seed.db.exec('ROLLBACK');throw error;}
  const fact={value:'yes' as const,source:'Owner-confirmed ALPHA-01 default applied to synthetic test scenario'};
  for(const [id,name] of [['alpha-a','Germany A — TEST SCENARIO'],['alpha-b','Germany B — TEST SCENARIO']]){
   const profile=validateProfile({id,name,country:'GER',tree:'definition:'+tree.uid,startDate:'1936-01-01',historical:true,goals:'Synthetic acceptance only',completed:[],queue:[],bookmarks:[],notes:{private:'UNSHARED_ALPHA_PRIVATE_NOTE'},dlcs:meta.dlcs.map(d=>d.id),dlcConfirmed:true,dlcStates:Object.fromEntries(meta.dlcs.map(d=>[d.id,{owned:fact,enabled:fact}])),referenceIndexRevision:meta.indexRevision,exportSchemaVersion:3});assert.ok(seed.saveProfile(profile).saved);
  }
  seed.setSetting('selectedProfileId','alpha-a');
  const identity=(entry:Entry)=>({uid:entry.uid,id:entry.id,source:entry.source,hash:entry.hash,version:entry.version,line:entry.line});
  return {sourceFile,sourceSha256,entriesCopied,meta,tree:identity(tree),focus:identity(focus),unit:identity(unit)};
 }finally{seed.db.close();source.close();}
}
